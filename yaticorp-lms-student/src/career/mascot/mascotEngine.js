/**
 * The runtime that makes the Career Path mascot act: it measures the page,
 * walks the container there on a spring, shows and hides stills, and plays
 * the brain's scripts one step at a time — all from ONE requestAnimationFrame
 * loop that also drives the rig (rigDriver). React only paints the bubble,
 * the ring and the layer's chrome; every transform and opacity is written
 * here, straight to the DOM, so a frame never re-renders anything.
 *
 * The layer is fixed and clipped to the Career Path's scroll box (the
 * layout's <main>), so it exists only over the section, and it can still
 * rise above a dialog when the thing to point at is inside one. Clicks pass
 * through it: it is decoration, and it never stands on a control anyway.
 */
import config from '../../mascot/mascotConfig.js';
import { clamp, createRigDriver, easeOutBack, gestureMs, springStep } from '../../mascot/rigDriver.js';
import { loadImage, loadStill, preloadStills, stillUrl } from '../../mascot/stills.js';
import parts from '../../mascot/raster-manifest.js';
import { centreSpot, facingFor, gazeToward, homeSpot, onScreen, standBeside, walkMs, wanderSpot } from './mascotGeometry.js';
import { createBrain } from './mascotBrain.js';

const RIG_BASE = '/mascot/raster-parts/';
const SEEN_KEY = 'yati.careerMascot.entered';
const DIALOG = '[role="dialog"][aria-modal="true"], [role="alertdialog"]';
const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"]';
// CareerShell slides every page in; targets are measured once it has landed.
const SETTLE_MS = 450;
const RING_MS = 2000;
const BUBBLE_MS = 4000;
// How long it lingers beside what it showed before stepping back to its corner.
const LINGER_MS = 4000;
// A scroll that lands within this of the last one is the same scroll.
// What counts as the student getting somewhere: achievements are recounted after these.
const RECOUNT = new Set(['stepCompleted', 'streak', 'phaseCompleted', 'pathCompleted', 'quizPassed']);

const session = {
    get(key) {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch {
            // Storage switched off: it simply walks in on every visit.
        }
    }
};

// ---------- measuring the page ----------

const boxOf = (el) => {
    const r = el?.getBoundingClientRect();
    return r && r.width && r.height ? r : null;
};
const scrolls = (el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY);

/** The Career Path scrolls inside the layout's <main>, not the window — when <main> scrolls at all. */
const pageScroller = () => {
    const main = document.querySelector('main');
    return main && scrolls(main) ? main : document.scrollingElement;
};

/**
 * Where the mascot may stand: the section's scroll area, clear of the phone's
 * fixed top bar (the scroller's top padding) and its floating bottom nav. For
 * a target inside a dialog, anywhere on screen — the dialog covers it all.
 */
function safeArea(target) {
    const margin = config.layout.margin;
    if (target?.closest?.(DIALOG)) {
        return { left: margin, top: margin, right: window.innerWidth - margin, bottom: window.innerHeight - margin };
    }
    const main = pageScroller();
    const inPage = main && main !== document.scrollingElement;
    const box = inPage ? main.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const padTop = inPage ? parseFloat(getComputedStyle(main).paddingTop) || 0 : 0;
    let bottom = Math.min(box.bottom, window.innerHeight);
    const nav = boxOf(document.querySelector('nav[aria-label="Main sections"]'));
    if (nav && nav.top > window.innerHeight / 2) bottom = Math.min(bottom, nav.top);
    const right = inPage ? box.left + main.clientWidth : box.right;
    return {
        left: Math.max(0, box.left) + margin,
        top: Math.max(0, box.top) + padTop + margin,
        right: Math.min(window.innerWidth, right) - margin,
        bottom: bottom - margin
    };
}

/** The other controls on screen, which the mascot would rather not stand on. */
function obstacles(safe, target) {
    return [...document.querySelectorAll(INTERACTIVE)]
        .filter((el) => el !== target && !target?.contains(el) && !el.contains(target) && !el.closest('.career-mascot'))
        .map(boxOf)
        .filter((r) => r && onScreen(r, safe));
}

/** An element, or the first visible `[data-mascot-target]` among the names given. */
export function findTarget(to) {
    if (!to) return null;
    if (to instanceof Element) return to.isConnected && boxOf(to) ? to : null;
    for (const name of [].concat(to)) {
        if (typeof name !== 'string') continue;
        const el = [...document.querySelectorAll(`[data-mascot-target="${name}"]`)].find(boxOf);
        if (el) return el;
    }
    return null;
}

const topDialog = () => {
    const all = document.querySelectorAll(DIALOG);
    return all[all.length - 1] || null;
};

// ---------- timing, with a way to stop ----------

function makeToken() {
    const stops = new Set();
    return {
        cancelled: false,
        cancel() {
            this.cancelled = true;
            stops.forEach((stop) => stop());
            stops.clear();
        },
        onCancel(stop) {
            stops.add(stop);
            return () => stops.delete(stop);
        }
    };
}

const sleep = (ms, token) =>
    new Promise((resolve) => {
        if (token?.cancelled || ms <= 0) return resolve();
        let off;
        const done = () => {
            clearTimeout(timer);
            off?.();
            resolve();
        };
        const timer = setTimeout(done, ms);
        off = token?.onCancel(done);
    });

// ---------- the engine ----------

/**
 * `get` reads what the layer knows (its size, reduced motion, the dock, the
 * route); `set` paints through React what needs painting. `attach` hands
 * over the DOM once the layer is mounted.
 */
export function createMascotEngine({ get, set, random = Math.random }) {
    const brain = createBrain();
    const rt = {
        dom: null,
        driver: null,
        ready: false,
        stopped: false,
        early: [],
        // the container: two springs, a target, and where it is anchored
        x: { x: 0, v: 0 },
        y: { x: 0, v: 0 },
        target: null,
        moving: false,
        glide: false,
        run: false,
        arrive: null,
        facing: 'right',
        anchor: null,
        offset: null,
        // the still on the picture layer
        still: null,
        // moments
        script: null,
        homeWalk: null,
        appearing: null,
        pending: null,
        timers: {},
        seq: 0,
        // sensing
        cursor: null,
        cursorAt: 0,
        lookEl: null,
        // sections it has pointed at on this page, the one a script is heading for, and the observer that watches them scroll in
        pointedAt: new Set(),
        heading: null,
        sections: null,
        lookUntil: 0,
        scrolling: false,
        scrollAt: 0,
        followDue: false,
        resting: false,
        // contexts
        regions: new Map(),
        visible: new Set(),
        videoPlaying: null,
        io: null,
        // the loop
        raf: 0,
        lastFrame: 0,
        paused: false,
        hidden: false,
        offscreen: false,
        shown: false,
        opacity: 0,
        opacityTarget: 0
    };

    const dims = () => get.dims();
    const walksNot = () => get.reduced() || get.dock();
    const node = (name) => rt.dom?.[name];
    const mark = (name, value) => {
        const body = node('body');
        if (!body) return;
        if (value == null || value === false) body.removeAttribute(`data-mascot-${name}`);
        else body.setAttribute(`data-mascot-${name}`, String(value));
    };
    const setState = (name) => {
        brain.setState(name);
        mark('state', brain.state);
    };
    const restState = () => {
        brain.rest();
        mark('state', brain.state);
    };

    // ---- position ----

    const place = (x, y) => {
        rt.x.x = x;
        rt.x.v = 0;
        rt.y.x = y;
        rt.y.v = 0;
        rt.target = null;
        paint();
    };
    const paint = () => {
        const body = node('body');
        if (body) body.style.transform = `translate3d(${rt.x.x.toFixed(2)}px, ${rt.y.x.toFixed(2)}px, 0)`;
    };
    const face = (facing) => {
        if (rt.facing === facing) return;
        rt.facing = facing;
        const el = node('facing');
        if (el) el.style.transform = facing === 'left' ? 'scaleX(-1)' : 'none';
        mark('facing', facing);
    };
    const mascotBox = () => ({ left: rt.x.x, top: rt.y.x, right: rt.x.x + dims().w, bottom: rt.y.x + dims().h });

    /**
     * Docked (a phone): its corner, `raised` to full height for a moment, or at
     * rest with only its head and shoulders above the bottom nav. `side` picks
     * the corner; otherwise it keeps the side it is on.
     */
    function dockSpot(raised, side) {
        const safe = safeArea();
        const d = dims();
        const floor = raised ? safe.bottom - d.h : safe.bottom - d.h * config.layout.dockPeek;
        const home = homeSpot(safe, d, obstacles(safe), 16, floor);
        const onLeft = side ? side === 'left' : rt.x.x + d.w / 2 < (safe.left + safe.right) / 2;
        const x = home.x === safe.left + 16 || home.x === safe.right - d.w - 16 ? (onLeft ? safe.left + 16 : safe.right - d.w - 16) : home.x;
        return { x: rt.shown ? x : safe.right - d.w - 16, y: home.y };
    }
    const dockRaise = (token) => (get.dock() ? walkTo(dockSpot(true), token) : Promise.resolve());

    /**
     * Walks to `spot`: the springs pull the container there, the rig steps
     * in time with the speed, and it faces the way it goes. Under reduced
     * motion, or docked on a phone, it fades out here and in there instead.
     */
    async function walkTo(spot, token, { run = false, glide = false } = {}) {
        const from = { x: rt.x.x, y: rt.y.x };
        const distance = Math.hypot(spot.x - from.x, spot.y - from.y);
        mark('spot', `${Math.round(spot.x)},${Math.round(spot.y)}`);
        set.bubble(null);
        if (distance < 2) return;
        if (glide && !walksNot()) {
            // Repositioning for a section: dimmed, a smooth glide, no leg cycle — never a run.
            face(facingFor(from, spot, rt.facing));
            rt.opacityTarget = config.walk.glideOpacity;
            rt.glide = true;
            rt.target = spot;
            rt.moving = true;
            const landed = new Promise((resolve) => {
                rt.arrive = resolve;
            });
            await Promise.race([landed, sleep(walkMs(from, spot) + 600, token)]);
            if (rt.moving) {
                rt.moving = false;
                rt.arrive = null;
                place(spot.x, spot.y);
            }
            rt.glide = false;
            rt.opacityTarget = 1;
            return;
        }
        const hop = Math.abs(spot.x - from.x) < 2 && !get.reduced();
        if (walksNot() && !hop) {
            await fadeTo(0, token);
            if (token.cancelled) return;
            face(facingFor(from, spot, rt.facing));
            place(spot.x, spot.y);
            await fadeTo(1, token);
            return;
        }
        face(facingFor(from, spot, rt.facing));
        rt.glide = hop || distance < config.walk.glideUnderPx;
        rt.run = run;
        rt.target = spot;
        rt.moving = true;
        if (!rt.glide) setState('walking');
        const landed = new Promise((resolve) => {
            rt.arrive = resolve;
        });
        const wait = walkMs(from, spot) * (run ? 0.7 : 1) + 600;
        await Promise.race([landed, sleep(wait, token)]);
        if (rt.moving) {
            // Never left hanging mid-walk: whatever stopped the frames, it stands where it meant to.
            rt.moving = false;
            rt.arrive = null;
            place(spot.x, spot.y);
        }
        rt.driver?.setWalk(0);
        if (!rt.glide && !token.cancelled) rt.driver?.play('squash');
        rt.glide = false;
        rt.run = false;
        if (brain.state === 'walking') restState();
    }

    /** Fades the whole mascot to `to` (0..1); resolves when it is there. */
    function fadeTo(to, token) {
        rt.opacityTarget = to;
        return sleep(get.reduced() ? 0 : config.walk.fadeMs, token);
    }

    // ---- stills ----

    /**
     * A still for `ms`: the rig shrinks a touch and fades, the picture pops
     * in with a little overshoot, holds, then the rig comes back on a small
     * bounce. Settled once the rig is back.
     */
    function showStill(name, ms, { pop = false } = {}) {
        return loadStill(name).then(
            () =>
                new Promise((resolve) => {
                    const id = ++rt.seq;
                    const img = node('still');
                    if (img) img.src = stillUrl(name);
                    const scale = config.stills.scale[name] ?? 1;
                    const hold = ms ?? config.stills.holdMs;
                    rt.still = { id, name, phase: 'rigOut', start: rt.lastFrame || performance.now(), hold, pop, scale, resolve };
                    mark('still', name);
                    // Frames drive the timeline; should they stall (a hidden tab), the
                    // still still ends on time rather than holding the script forever.
                    if (Number.isFinite(hold)) {
                        const S = config.stills;
                        setTimeout(() => {
                            if (rt.still?.id !== id) return;
                            rt.still = null;
                            applyStill(null);
                            mark('still', null);
                            resolve();
                        }, S.rigOutMs + S.popMs + hold + S.outMs + 250);
                    }
                }),
            () => undefined
        );
    }

    /** Ends the still on screen at once (a cancelled script), rig back. */
    function dropStill() {
        if (!rt.still) return;
        const { resolve } = rt.still;
        rt.still = null;
        applyStill(null);
        mark('still', null);
        resolve?.();
    }

    const applyStill = (frame) => {
        const rig = node('rig');
        const img = node('still');
        if (!rig || !img) return;
        const r = frame?.rig ?? { o: 1, s: 1 };
        const s = frame?.still ?? { o: 0, s: 1 };
        rig.style.opacity = r.o.toFixed(3);
        rig.style.transform = r.s === 1 ? 'none' : `scale(${r.s.toFixed(3)})`;
        img.style.opacity = s.o.toFixed(3);
        img.style.transform = `scale(${(s.s * (rt.still?.scale ?? 1)).toFixed(3)})`;
    };

    /** Advances the still's timeline; resolves it when the rig is back. */
    const stepStill = (now) => {
        const st = rt.still;
        if (!st) return;
        const S = config.stills;
        const reduced = get.reduced();
        const t = now - st.start;
        const rigOut = reduced ? 0 : S.rigOutMs;
        const popMs = reduced ? 0 : S.popMs;
        const outMs = reduced ? 0 : S.outMs;
        if (st.phase === 'rigOut') {
            const u = rigOut ? clamp(t / rigOut, 0, 1) : 1;
            applyStill({ rig: { o: 1 - u, s: 1 - (1 - S.rigOutScale) * u }, still: { o: 0, s: S.popFrom } });
            if (u >= 1) {
                st.phase = 'popIn';
                st.start = now;
            }
            return;
        }
        if (st.phase === 'popIn') {
            const u = popMs ? clamp(t / popMs, 0, 1) : 1;
            const k = easeOutBack(u);
            const s = S.popFrom + (1 - S.popFrom) * k + (st.pop ? 0.08 * Math.sin(Math.PI * u) : 0);
            applyStill({ rig: { o: 0, s: S.rigOutScale }, still: { o: clamp(u / 0.4, 0, 1), s } });
            if (u >= 1) {
                st.phase = 'hold';
                st.start = now;
            }
            return;
        }
        if (st.phase === 'hold') {
            applyStill({ rig: { o: 0, s: S.rigOutScale }, still: { o: 1, s: 1 } });
            if (Number.isFinite(st.hold) && t >= st.hold) {
                st.phase = 'out';
                st.start = now;
                if (!reduced) rt.driver?.play('bounce', 420);
            }
            return;
        }
        if (st.phase === 'out') {
            const u = outMs ? clamp(t / outMs, 0, 1) : 1;
            applyStill({ rig: { o: u, s: S.rigOutScale + (1 - S.rigOutScale) * u }, still: { o: 1 - u, s: 1 } });
            if (u >= 1) {
                const { resolve } = st;
                rt.still = null;
                applyStill(null);
                mark('still', null);
                resolve?.();
            }
        }
    };

    // ---- speech, ring, confetti ----

    function say(text, target) {
        if (!text) return;
        const id = ++rt.seq;
        const safe = safeArea(target || rt.anchor);
        const w = dims().w;
        // Kept over the page it is about: shifted sideways when the bubble
        // would otherwise leave the safe area.
        const centre = rt.x.x + w / 2;
        const shift = Math.min(Math.max(centre, safe.left + 124), safe.right - 124) - centre;
        const below = rt.y.x - 72 < safe.top;
        set.bubble({ text, id, shift, below });
        set.spoken({ text, id });
        clearTimeout(rt.timers.bubble);
        rt.timers.bubble = setTimeout(() => set.bubble((b) => (b?.id === id ? null : b)), BUBBLE_MS);
    }

    function ring(el) {
        const id = ++rt.seq;
        set.ring({ el, id });
        clearTimeout(rt.timers.ring);
        rt.timers.ring = setTimeout(() => set.ring((r) => (r?.id === id ? null : r)), RING_MS);
    }

    function confetti() {
        const host = node('confetti');
        if (!host || get.reduced()) return;
        const { w, h } = dims();
        const cx = rt.x.x + w / 2;
        const cy = rt.y.x + h * 0.3;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 26; i++) {
            const bit = document.createElement('span');
            const angle = random() * Math.PI * 2;
            const dist = 60 + random() * 110;
            bit.className = 'career-mascot-confetti-bit';
            bit.style.left = `${cx}px`;
            bit.style.top = `${cy}px`;
            bit.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            bit.style.setProperty('--dy', `${Math.sin(angle) * dist - 60}px`);
            bit.style.setProperty('--hue', `${Math.round(random() * 360)}`);
            bit.style.setProperty('--spin', `${Math.round(random() * 720 - 360)}deg`);
            frag.appendChild(bit);
        }
        host.appendChild(frag);
        setTimeout(() => {
            host.replaceChildren();
        }, 1000);
    }

    // ---- scrolling and standing ----

    /**
     * The mascot never scrolls the page: the student decides what is on
     * screen. A target that is not in view is simply not pointed at.
     */
    function inView(el) {
        const r = el.getBoundingClientRect();
        const safe = safeArea(el);
        return r.height > 0 && r.bottom > safe.top && r.top < safe.bottom;
    }

    /**
     * Docked: the mascot stands right under the target, in the corner AWAY
     * from it, so the pointing reads as pointing at that and nothing else.
     * The page is left where the student put it: a target that is not on
     * screen is not pointed at. When the target would sit behind the mascot,
     * it takes the other corner.
     */
    async function dockBeside(el, token) {
        const safe = safeArea(el);
        const d = dims();
        const gap = config.layout.dockGap;
        const floorY = safe.bottom - d.h;
        // The page is never scrolled for the mascot; off screen, it lets it be.
        if (token.cancelled || !el.isConnected || !inView(el)) return null;
        const after = el.getBoundingClientRect();
        const centre = (after.left + after.right) / 2;
        const side = centre > (safe.left + safe.right) / 2 ? 'left' : 'right';
        // Just under the target, or on the floor when the target is lower down.
        const top = Math.max(safe.top, Math.min(floorY, after.bottom + gap));
        let spot = { x: dockSpot(true, side).x, y: top };
        const at = { left: spot.x, top: spot.y, right: spot.x + d.w, bottom: spot.y + d.h };
        if (after.bottom > at.top && after.top < at.bottom && after.right > at.left && after.left < at.right) {
            spot = { x: dockSpot(true, side === 'left' ? 'right' : 'left').x, y: top };
        }
        await walkTo(spot, token);
        if (token.cancelled || !el.isConnected) return null;
        face(spot.x + d.w / 2 > centre ? 'left' : 'right');
        // Not anchored: docked, it stays in its corner whatever the page does.
        rt.anchor = null;
        return spot;
    }

    function standAt(el, spot) {
        const box = el.getBoundingClientRect();
        rt.anchor = el;
        rt.offset = { dx: spot.x - box.left, dy: spot.y - box.top };
    }

    async function goTo(el, token, opts = {}) {
        if (get.dock()) return dockBeside(el, token);
        // Nothing is scrolled into view for the mascot (opts.scroll is ignored).
        if (token.cancelled || !inView(el)) return null;
        const safe = safeArea(el);
        const spot = standBeside(el.getBoundingClientRect(), dims(), safe, obstacles(safe, el));
        await walkTo(spot, token, { run: opts.run, glide: opts.glide });
        if (token.cancelled || !el.isConnected) return null;
        face(spot.facing);
        standAt(el, spot);
        return spot;
    }

    // ---- looking ----

    /** Eyes on `el` for `ms`, or on the cursor, or at rest. */
    function lookAt(el, ms = 2000) {
        rt.lookEl = el;
        rt.lookUntil = performance.now() + ms;
    }

    const gazeNow = (now) => {
        if (rt.lookEl) {
            if (now > rt.lookUntil || !rt.lookEl.isConnected) rt.lookEl = null;
            else {
                const b = boxOf(rt.lookEl);
                if (b) return gazeToward(mascotBox(), { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }, config.look.cursorRange * 1.5);
            }
        }
        if (rt.cursor && now - rt.cursorAt < config.look.cursorMs) {
            const g = gazeToward(mascotBox(), rt.cursor, config.look.cursorRange);
            const box = mascotBox();
            const near = Math.hypot(rt.cursor.x - (box.left + box.right) / 2, rt.cursor.y - (box.top + box.bottom) / 2) < config.look.cursorRange * 1.6;
            if (near) return g;
        }
        return null;
    };

    // ---- the loop ----

    const frame = (now) => {
        rt.raf = 0;
        if (rt.stopped || rt.paused) return;
        const dt = rt.lastFrame ? (now - rt.lastFrame) / 1000 : 1 / 60;
        rt.lastFrame = now;
        const d = dims();

        // opacity of the whole mascot
        if (rt.opacity !== rt.opacityTarget) {
            const step = get.reduced() ? 1 : dt / (config.walk.fadeMs / 1000);
            rt.opacity = rt.opacity < rt.opacityTarget ? Math.min(rt.opacityTarget, rt.opacity + step) : Math.max(rt.opacityTarget, rt.opacity - step);
            const body = node('body');
            if (body) body.style.opacity = rt.opacity.toFixed(3);
        }

        // the container spring
        if (rt.moving && rt.target) {
            const W = config.walk;
            const spring = { ...W.spring, maxSpeed: W.maxSpeed * (rt.run ? W.run : 1) };
            springStep(rt.x, rt.target.x, dt, spring);
            springStep(rt.y, rt.target.y, dt, spring);
            paint();
            const speed = Math.hypot(rt.x.v, rt.y.v);
            rt.driver?.setWalk(rt.glide ? 0 : speed / d.w, rt.run);
            if (Math.abs(rt.x.v) > 24) face(rt.x.v < 0 ? 'left' : 'right');
            const left = Math.hypot(rt.target.x - rt.x.x, rt.target.y - rt.y.x);
            if (left < W.arriveDistance && speed < W.arriveSpeed) {
                place(rt.target.x, rt.target.y);
                rt.moving = false;
                const done = rt.arrive;
                rt.arrive = null;
                done?.();
            }
        } else if (rt.followDue) {
            rt.followDue = false;
            follow();
        }

        // where the eyes go
        const gaze = gazeNow(now);
        rt.driver?.setLook(gaze && rt.facing === 'left' ? { x: -gaze.x, y: gaze.y } : gaze);

        stepStill(now);
        rt.driver?.tick(dt);
        rt.raf = requestAnimationFrame(frame);
    };

    const start = () => {
        if (rt.raf || rt.stopped || rt.paused) return;
        rt.lastFrame = 0;
        rt.raf = requestAnimationFrame(frame);
    };
    const pauseIf = () => {
        const paused = rt.hidden || rt.offscreen;
        if (paused === rt.paused) return;
        rt.paused = paused;
        if (paused) {
            cancelAnimationFrame(rt.raf);
            rt.raf = 0;
        } else start();
    };

    // ---- gestures ----

    /** Plays a gesture on the rig, marked on the body while it runs; a cancelled script lowers it. */
    function gesture(name, token, opts = {}) {
        const driver = rt.driver;
        if (!driver) return Promise.resolve();
        mark('gesture', name);
        const off = token?.onCancel(() => driver.cancelGesture());
        // Frames drive the gesture; should they stall (a hidden tab), it still
        // ends on time rather than holding the script forever.
        const played = driver.playGesture(name, opts);
        const onTime = sleep(gestureMs(name, opts) + 300).then(() => driver.cancelGesture(true));
        return Promise.race([played, onTime]).then(() => {
            off?.();
            if (driver.gesture() === null) mark('gesture', null);
        });
    }

    // ---- sections scrolling into view ----

    /**
     * Watches the page's section targets (mascotConfig.pages[...].sections)
     * and, as one scrolls into view for the first time, glides beside it and
     * points. Targets appear as the page loads, so it looks again a few times.
     */
    function watchSections() {
        unwatchSections();
        const names = brain.page()?.sections;
        if (!names?.length || typeof IntersectionObserver === 'undefined') return;
        const seen = new Set();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const el = entry.target;
                    if (rt.pointedAt.has(el) || el === rt.anchor || el === rt.heading) continue;
                    emit({ type: 'sectionActive', key: `section:${el.getAttribute('data-mascot-target')}`, el });
                }
            },
            { threshold: 0.5 }
        );
        const look = () => {
            for (const name of names) {
                for (const el of document.querySelectorAll(`[data-mascot-target="${name}"]`)) {
                    if (seen.has(el)) continue;
                    seen.add(el);
                    observer.observe(el);
                }
            }
        };
        look();
        const timers = [1500, 4000].map((ms) => setTimeout(look, ms));
        rt.sections = { observer, timers };
    }

    function unwatchSections() {
        const w = rt.sections;
        if (!w) return;
        w.observer.disconnect();
        w.timers.forEach(clearTimeout);
        rt.sections = null;
    }

    // ---- scripts ----

    async function perform(step, ctx, token) {
        // A step for a context the student has already left is not worth playing.
        if (step.ifContext && brain.context !== step.ifContext) return;
        switch (step.do) {
            case 'enter': {
                // Once a session: in from the left edge of the section, at
                // the level it rests at — clipped to the section meanwhile,
                // so on a desktop it steps out from behind the sidebar.
                if (session.get(SEEN_KEY) === '1' && rt.shown) return;
                session.set(SEEN_KEY, '1');
                if (get.dock()) {
                    // A phone: no room for an entrance walk. Up from the dock, a wave, and on.
                    const at = dockSpot(false);
                    place(at.x, at.y);
                    rt.shown = true;
                    set.shown(true);
                    rt.opacityTarget = 1;
                    await sleep(config.walk.fadeMs, token);
                    await dockRaise(token);
                    if (step.wave && !token.cancelled) await gesture('wave', token);
                    return;
                }
                const safe = safeArea();
                const d = dims();
                const y = safe.bottom - d.h;
                set.clip(Math.max(0, safe.left - 8));
                face('right');
                place(safe.left - d.w - 16, y);
                rt.opacity = 1;
                rt.opacityTarget = 1;
                const body = node('body');
                if (body) body.style.opacity = '1';
                rt.shown = true;
                set.shown(true);
                await sleep(40, token);
                await walkTo({ x: safe.left + 16, y }, token);
                set.clip(null);
                if (step.wave && !token.cancelled) await gesture('wave', token);
                return;
            }
            case 'walk':
            case 'glide': {
                const el = findTarget(step.to);
                ctx.target = el;
                ctx.matched = el?.getAttribute?.('data-mascot-target') || null;
                if (!el) return;
                rt.heading = el;
                // Docked, it reads or watches from its corner; it never moves for a context.
                if (step.scroll === false && get.dock()) return;
                // Not scrolling means not walking to what has scrolled away either.
                if (step.scroll === false && !onScreen(el.getBoundingClientRect(), safeArea(el))) return;
                // Off screen it is not walked to, and so not pointed at either:
                // the page is never scrolled for the mascot.
                if (!inView(el)) { ctx.target = null; return; }
                lookAt(el, 4000);
                if (!(await goTo(el, token, { glide: step.do === 'glide' }))) ctx.target = null;
                return;
            }
            case 'point': {
                const el = ctx.target;
                // Nothing on screen to point at: no gesture, and no words about it.
                if (!el?.isConnected) return;
                const box = el.getBoundingClientRect();
                const mid = mascotBox();
                const onLeft = mid.left + dims().w / 2 > (box.left + box.right) / 2;
                // Mirrored, the still that points right points left.
                face(onLeft ? 'left' : 'right');
                const holdMs = step.hold ?? config.pointing.holdMs;
                const P = config.pointing;
                setState('pointing');
                rt.pointedAt.add(el);
                lookAt(el, P.upMs + holdMs + P.lowerMs);
                ring(el);
                const text = step.text === '@classLine' ? (ctx.matched === 'next-class' ? config.lines.classNext : config.lines.classNow) : step.text;
                if (text) say(text, el);
                // The head turns, the shoulders follow, the arm lifts, the wrist
                // turns, the finger extends onto the target; a hold; then it all
                // lowers. The whole character faces the target, so the rig's
                // right arm does the pointing either way.
                const eyesY = mid.top + (mid.bottom - mid.top) * 0.3;
                const elev = clamp((eyesY - (box.top + box.bottom) / 2) / 260, -1, 1);
                await gesture('point', token, { elev, holdMs });
                if (brain.state === 'pointing') restState();
                return;
            }
            case 'say':
                say(step.text, ctx.target);
                return;
            case 'gesture':
                await dockRaise(token);
                if (token.cancelled) return;
                setState('reacting');
                await gesture(step.name, token);
                if (brain.state === 'reacting') restState();
                return;
            case 'still': {
                await dockRaise(token);
                if (token.cancelled) return;
                setState('reacting');
                const pending = showStill(step.name, step.ms, { pop: step.pop });
                rt.pending = pending;
                await pending;
                if (brain.state === 'reacting') restState();
                return;
            }
            case 'expression':
                rt.driver?.setExpression(step.name, step.ms);
                return;
            case 'shake':
                setState('reacting');
                rt.driver?.play('shake');
                await sleep(config.shake.ms, token);
                if (brain.state === 'reacting') restState();
                return;
            case 'nod':
                rt.driver?.play('nod');
                await sleep(config.nod.ms, token);
                return;
            case 'bounce':
                if (!get.reduced()) rt.driver?.play('bounce');
                await sleep(config.bounce.ms, token);
                return;
            case 'confetti':
                confetti();
                return;
            case 'context':
                setContext(step.name, null);
                // What is on screen has the last word.
                evaluateContext();
                return;
            case 'home': {
                const safe = safeArea();
                const spot = get.dock() ? dockSpot(false) : homeSpot(safe, dims(), obstacles(safe));
                rt.anchor = null;
                await walkTo(spot, token);
                return;
            }
            case 'centre': {
                rt.anchor = null;
                if (get.dock()) {
                    await dockRaise(token);
                    return;
                }
                const spot = centreSpot(safeArea(), dims());
                await walkTo(spot, token, { run: true });
                return;
            }
            case 'wander': {
                if (walksNot()) return;
                const safe = safeArea();
                const from = { x: rt.x.x, y: rt.y.x };
                const spot = wanderSpot(from, dims(), safe, obstacles(safe), config.wander.maxPx, random);
                if (!spot) return;
                await walkTo(spot, token);
                await sleep(1800 + random() * 1600, token);
                if (!token.cancelled) await walkTo(from, token);
                return;
            }
            case 'lookAround': {
                const d = rt.driver;
                if (!d) return;
                d.setLook({ x: -0.9, y: -0.4 });
                await sleep(900, token);
                d.setLook({ x: 0.9, y: -0.3 });
                await sleep(900, token);
                d.setLook(null);
                return;
            }
            case 'wait':
                await sleep(step.ms || 0, token);
                return;
            case 'sleep':
                rt.resting = true;
                setState('sleeping');
                rt.driver?.setSleeping(true);
                rt.driver?.setMicroIdles(false);
                return;
            case 'wake':
                wake();
                return;
            case 'if': {
                const branch = brain.facts[step.fact] ? step.then : step.else;
                for (const inner of branch || []) {
                    if (token.cancelled) return;
                    await perform(inner, ctx, token);
                }
                return;
            }
            default:
        }
    }

    /**
     * Holds a script back while a page loader is up, or while a dialog is open
     * — unless the script is headed for something inside that dialog, in which
     * case it plays above it. Returns that dialog, if any.
     */
    async function clearStage(steps, token) {
        const heading = steps.find((s) => s.do === 'walk')?.to;
        // A beat first: the moment that started this script usually changes
        // the page too — a celebration card, a new row — and it should be on
        // screen before deciding whether anything is in the way.
        await sleep(150, token);
        for (;;) {
            if (token.cancelled) return null;
            const dialog = topDialog();
            if (!document.querySelector('[data-yati-loader]')) {
                if (!dialog) return null;
                const target = findTarget(heading);
                if (target && dialog.contains(target)) return dialog;
            }
            await sleep(300, token);
        }
    }

    async function run(event) {
        const token = makeToken();
        rt.script = token;
        rt.homeWalk?.cancel();
        clearTimeout(rt.timers.linger);
        // A section already pointed at while this waited its turn needs no second pointing.
        const steps = event.type === 'sectionActive' && rt.pointedAt.has(event.el) ? [] : brain.script(event);
        try {
            const dialog = await clearStage(steps, token);
            if (dialog) set.z((Number(getComputedStyle(dialog).zIndex) || 100) + 1);
            if (rt.resting && event.type !== 'sleep') wake();
            const ctx = { target: event.el instanceof Element ? event.el : null };
            for (const step of steps) {
                if (token.cancelled || rt.stopped) break;
                await perform(step, ctx, token);
            }
        } finally {
            if (rt.script === token) rt.script = null;
            rt.heading = null;
            // The page's sections are watched from here on: the entrance has
            // pointed at the first, so that one is not pointed at twice.
            if (event.type === 'pageEnter' && !rt.stopped && !token.cancelled) watchSections();
            set.z(null);
            set.clip(null);
            // Wherever it ended up — beside a target, or raised in its dock — it
            // lingers a moment, then heads home; unless the student is reading,
            // watching or thinking, which is where it stays.
            if (!rt.stopped && !brain.context) {
                rt.timers.linger = setTimeout(() => {
                    if (rt.script || rt.stopped) return;
                    rt.anchor = null;
                    goHomeSoon();
                }, LINGER_MS);
            }
            brain.finish();
            pump();
        }
    }

    function pump() {
        clearTimeout(rt.timers.pump);
        if (rt.stopped) return;
        const { event, waitMs } = brain.next();
        if (event) run(event);
        else if (waitMs) rt.timers.pump = setTimeout(pump, waitMs);
    }

    function emit(event) {
        if (rt.stopped || !event?.type) return;
        if (!rt.ready) {
            rt.early.push(event);
            return;
        }
        if (RECOUNT.has(event.type)) set.recount?.();
        if (event.type === 'sectionActive' && rt.pointedAt.has(event.el)) return 'drop';
        const decision = brain.admit(event);
        if (decision === 'start') run(event);
        else if (decision === 'queue') {
            // A page's entrance cuts whatever was still playing for the last page.
            if (event.type === 'pageEnter') {
                rt.script?.cancel();
                dropStill();
                brain.finish();
            }
            pump();
        }
        return decision;
    }

    function wake() {
        if (!rt.resting) return;
        rt.resting = false;
        rt.driver?.setSleeping(false);
        rt.driver?.setMicroIdles(true);
        if (!get.reduced()) rt.driver?.play('bounce', 380);
        restState();
    }

    function goHomeSoon() {
        clearTimeout(rt.timers.home);
        rt.timers.home = setTimeout(() => {
            if (rt.stopped || rt.script || rt.moving || rt.anchor || !rt.shown) return;
            const safe = safeArea();
            const spot = get.dock() ? dockSpot(false) : homeSpot(safe, dims(), obstacles(safe));
            const distance = Math.hypot(spot.x - rt.x.x, spot.y - rt.y.x);
            if (distance < 2) return;
            // Going home is not a moment of its own: any script cancels it.
            rt.homeWalk = makeToken();
            walkTo(spot, rt.homeWalk);
        }, 400);
    }

    /** Scroll or resize: stay beside what it is standing by, or head home once that is gone. */
    function follow() {
        if (!rt.shown || rt.moving) return;
        const anchor = rt.anchor;
        if (anchor) {
            const box = anchor.isConnected ? boxOf(anchor) : null;
            const safe = safeArea(anchor);
            if (box && onScreen(box, safe)) {
                const d = dims();
                const x = Math.min(Math.max(box.left + rt.offset.dx, safe.left), safe.right - d.w);
                const y = Math.min(Math.max(box.top + rt.offset.dy, safe.top), safe.bottom - d.h);
                place(x, y);
                return;
            }
            rt.anchor = null;
        }
        if (!rt.script) goHomeSoon();
    }

    // ---- contexts ----

    /** Which context the visible regions and the video add up to. */
    function evaluateContext() {
        let want = null;
        let el = null;
        if (rt.videoPlaying?.isConnected) {
            want = 'watching';
            el = rt.videoPlaying;
        } else {
            for (const kind of ['quiz', 'reading']) {
                const region = [...rt.visible].find((r) => rt.regions.get(r) === kind && r.isConnected);
                if (region) {
                    want = kind === 'quiz' ? 'thinking' : 'reading';
                    el = region;
                    break;
                }
            }
        }
        if (want === brain.context) return;
        if (!want) {
            // Nothing to read or watch: a plain wait holds until something is, or the page changes.
            if (brain.context && brain.context !== 'waiting') setContext(null, null);
            return;
        }
        {
            const type = { watching: 'videoStarted', thinking: 'quizStarted', reading: 'readingStarted' }[want];
            emit({ type, el });
            setContext(want, el);
        }
    }

    function setContext(name, el) {
        brain.setContext(name);
        rt.driver?.setMode(name === 'waiting' ? null : name);
        rt.driver?.setMicroIdles(!name);
        mark('context', name);
        mark('state', brain.state);
        if (el) lookAt(el, name ? 10 * 60 * 1000 : 0);
        else if (!name) rt.lookEl = null;
    }

    const ensureObserver = () => {
        if (rt.io || typeof IntersectionObserver === 'undefined') return;
        rt.io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) rt.visible.add(entry.target);
                    else rt.visible.delete(entry.target);
                }
                evaluateContext();
            },
            { threshold: 0.45 }
        );
    };

    // ---- what the layer exposes ----

    const engine = {
        brain,
        emit,
        /** The DOM, once mounted: the layer, its body, the facing box, the rig host, the still, the confetti host. */
        attach(dom) {
            rt.dom = dom;
            if (dom?.rig && !rt.driver) {
                rt.driver = createRigDriver(dom.rig, { prefix: `cm${++rt.seq}`, random });
                dom.rig.style.opacity = '1';
                dom.still.style.opacity = '0';
                dom.body.style.opacity = '0';
                start();
            }
        },
        /** Once the page has loaded: this session's entrance, or straight to its corner. */
        async appear() {
            const token = makeToken();
            rt.appearing = token;
            await Promise.allSettled(Object.values(parts).map((part) => loadImage(RIG_BASE + part.file)));
            await clearStage([], token);
            await sleep(SETTLE_MS, token);
            if (token.cancelled || rt.stopped) return;
            rt.ready = true;
            const early = rt.early;
            rt.early = [];
            const page = brain.page();
            const enters = page?.enter?.some((s) => s.do === 'enter') && session.get(SEEN_KEY) !== '1';
            if (!enters) {
                const safe = safeArea();
                const spot = get.dock() ? dockSpot(false) : homeSpot(safe, dims(), obstacles(safe));
                place(spot.x, spot.y);
                rt.shown = true;
                set.shown(true);
                rt.opacityTarget = 1;
            }
            emit({ type: 'pageEnter', pathname: get.pathname() });
            early.forEach(emit);
            requestAnimationFrame(() => setTimeout(preloadStills, 0));
        },
        routeChanged(pathname) {
            rt.script?.cancel();
            rt.homeWalk?.cancel();
            dropStill();
            rt.driver?.cancelGesture(true);
            mark('gesture', null);
            rt.pointedAt = new Set();
            unwatchSections();
            rt.anchor = null;
            rt.lookEl = null;
            rt.videoPlaying = null;
            clearTimeout(rt.timers.linger);
            clearTimeout(rt.timers.wander);
            set.bubble(null);
            set.ring(null);
            brain.routeChanged(pathname);
            brain.finish();
            setContext(null, null);
            mark('state', brain.state);
            // A section still on screen (the same page re-keyed) picks its context back up.
            evaluateContext();
            if (!rt.ready) return;
            clearTimeout(rt.timers.route);
            rt.timers.route = setTimeout(() => emit({ type: 'pageEnter', pathname }), SETTLE_MS);
        },
        /** Scroll or resize: measured on the next frame, never per event. */
        follow() {
            rt.scrollAt = performance.now();
            rt.followDue = true;
        },
        isScrolling: () => rt.scrolling,
        /** Ten quiet seconds with an unclicked call to action on the page: walk to it, once per element. */
        idleHint() {
            const page = brain.page();
            const el = findTarget(page?.cta);
            if (!el || brain.hinted(el)) return;
            // Dropped while a moment plays, it is tried again after the next quiet spell.
            if (emit({ type: 'idleCta', cta: el }) !== 'drop') brain.hintOnce(el);
        },
        /** Thirty quiet seconds: sleep, until any input. */
        rest() {
            if (!rt.resting) emit({ type: 'sleep' });
        },
        /** Any input: wake. Scrolling of its own does not count. */
        input() {
            if (rt.resting) wake();
        },
        cursor(x, y) {
            rt.cursor = x == null ? null : { x, y };
            rt.cursorAt = performance.now();
        },
        /** A marked button pressed: the start buttons earn a thumbs up, Play a celebration. */
        targetPressed(el, name) {
            if (config.clicks.start.includes(name)) emit({ type: 'startClicked', el });
            else if (config.clicks.play.includes(name)) emit({ type: 'playClicked', el });
        },
        lookAt,
        /** A section reporting what the student is doing in it. */
        region(el, kind) {
            if (!el || !kind) return () => {};
            ensureObserver();
            rt.regions.set(el, kind);
            rt.io?.observe(el);
            return () => {
                rt.regions.delete(el);
                rt.visible.delete(el);
                rt.io?.unobserve(el);
                evaluateContext();
            };
        },
        video(state, el) {
            if (state === 'playing') rt.videoPlaying = el;
            else if (rt.videoPlaying === el || !el) rt.videoPlaying = null;
            if (state === 'ended') emit({ type: 'videoCompleted' });
            // Paused: it waits, at once and without queueing — unless something
            // else on screen (the notes) has a claim on it.
            else if (state === 'paused' && brain.context === 'watching') setContext('waiting', null);
            evaluateContext();
        },
        setFact: (name, value) => brain.setFact(name, value),
        expression: (name, ms) => rt.driver?.setExpression(name, ms),
        /** The occasional short walk, on the pages that allow it. */
        scheduleWander() {
            clearTimeout(rt.timers.wander);
            const page = brain.page();
            if (!page?.wander && !page?.ponder) return;
            const W = page.ponder ? config.ponder : config.wander;
            rt.timers.wander = setTimeout(() => {
                if (!rt.stopped && !rt.script && !rt.resting && !brain.context) {
                    emit({ type: page.ponder ? 'ponder' : 'wander' });
                }
                engine.scheduleWander();
            }, W.minMs + random() * (W.maxMs - W.minMs));
        },
        visibility(hidden) {
            rt.hidden = hidden;
            pauseIf();
        },
        offscreen(off) {
            rt.offscreen = off;
            pauseIf();
        },
        stageDone() {
            dropStill();
        },
        snapshot: () => ({ state: brain.state, context: brain.context, x: rt.x.x, y: rt.y.x, facing: rt.facing, still: rt.still?.name ?? null, resting: rt.resting }),
        stop() {
            rt.stopped = true;
            rt.appearing?.cancel();
            rt.script?.cancel();
            rt.homeWalk?.cancel();
            Object.values(rt.timers).forEach(clearTimeout);
            cancelAnimationFrame(rt.raf);
            rt.raf = 0;
            rt.io?.disconnect();
            rt.io = null;
            unwatchSections();
            rt.driver?.destroy();
            rt.driver = null;
            rt.dom = null;
        }
    };
    return engine;
}
