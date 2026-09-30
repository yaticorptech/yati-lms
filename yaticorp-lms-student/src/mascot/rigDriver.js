/**
 * Drives the kit's rig by hand, one frame at a time.
 *
 * The rig is rendered ONCE, static, in its idle pose; from then on every body
 * part — a <g> with a data-pivot — gets its `transform` attribute set from one
 * requestAnimationFrame loop. Nothing here writes a CSS animation, and the
 * artwork is never redrawn: the layers move, the pixels stay the kit's.
 *
 * Motion is layered, never swapped. Each frame blends:
 *   gesture     pointing, waving, celebrating or clapping — the rig's own
 *               head, shoulders, arms, wrists and fingers, staged in time
 *   breathing   torso and head, on a period that drifts a little
 *   sway        the whole body, the head's tilt, the arms — slow and small
 *   look        eyes toward the cursor or a target, the head lagging behind
 *   blink       now and then, sometimes twice
 *   context     reading a line, watching, thinking — small looks and nods
 *   clips       a bounce, a head shake, a nod, a stretch, the landing squash
 *   walk        legs, feet, arms and bob, in step with the container's speed
 * and clamps the arms after blending. The pointing finger is the artwork's
 * own pointing hand, grafted beside each fist at the same wrist and faded in
 * as the gesture extends it. The pure pieces (blend, walk cycle, springs,
 * curves, the gesture timelines) are exported for the Node tests;
 * createRigDriver is the browser part.
 */
import rig from './mascot-rig.js';
import parts from './raster-manifest.js';
import config from './mascotConfig.js';

const RIG_BASE = '/mascot/raster-parts/';
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

/** Which <g id> each layer key drives. */
export const ID = {
    root: 'mascot', shadow: 'shadow', head: 'head', eyes: 'eyes', brows: 'eyebrows', mouth: 'mouth',
    torso: 'torso-group', armL: 'arm-left', handL: 'hand-left', armR: 'arm-right', handR: 'hand-right',
    legL: 'leg-left-group', footL: 'foot-left-group', legR: 'leg-right-group', footR: 'foot-right-group',
    handLPoint: 'hand-left-point', handRPoint: 'hand-right-point'
};
// The raster shoulder caps are drawn behind the torso and must turn with their arm.
const ROOTS = { armL: 'arm-left-root', armR: 'arm-right-root' };

// ---------- pure math ----------

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
export const easeOutBack = (u) => 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
/** 0 before `from`, 1 after `to`, eased between. */
export const ramp = (t, from, to) => easeInOut(clamp((t - from) / Math.max(1, to - from), 0, 1));
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const lift = (x) => Math.max(0, x);

/** Sums the offsets of every layer, multiplies their scales. */
export function blend(layers) {
    const out = {};
    for (const layer of layers) {
        if (!layer) continue;
        for (const key in layer) {
            const t = layer[key];
            if (!t) continue;
            const o = out[key] || (out[key] = { x: 0, y: 0, r: 0, sx: 1, sy: 1 });
            o.x += t.x || 0;
            o.y += t.y || 0;
            o.r += t.r || 0;
            if (t.sx != null) o.sx *= t.sx;
            if (t.sy != null) o.sy *= t.sy;
        }
    }
    return out;
}

/** A layer at `k` of its strength: offsets scaled, scales pulled toward 1. */
export function scaleLayer(layer, k) {
    const out = {};
    for (const key in layer) {
        const t = layer[key];
        out[key] = {
            x: (t.x || 0) * k, y: (t.y || 0) * k, r: (t.r || 0) * k,
            sx: t.sx == null ? 1 : lerp(1, t.sx, k), sy: t.sy == null ? 1 : lerp(1, t.sy, k)
        };
    }
    return out;
}

/** No arm past `max` degrees, whatever the layers added up to. */
export function clampArms(t, max = config.arm.maxDeg) {
    for (const key of ['armL', 'armR']) if (t[key]) t[key].r = clamp(t[key].r, -max, max);
    return t;
}

/** The SVG transform that turns/moves a part about its own pivot. */
export function transformAttr(pivot, t) {
    return `translate(${r2(pivot[0] + t.x)} ${r2(pivot[1] + t.y)}) rotate(${r2(t.r)}) scale(${r3(t.sx)} ${r3(t.sy)}) translate(${-pivot[0]} ${-pivot[1]})`;
}

/**
 * One frame of the walk at `phase` (in strides) and `amp` (0..1, from the
 * speed): legs lift and alternate, feet tip, arms swing, the body bobs.
 */
export function walkCycle(phase, amp, cfg = config.walk) {
    const s = Math.sin(TAU * phase);
    const a = Math.abs(s);
    return {
        legL: { y: -cfg.legLift * lift(s) * amp, r: -6 * s * amp },
        footL: { r: -cfg.footDeg * lift(s) * amp, sy: 1 - 0.06 * lift(s) * amp },
        legR: { y: -cfg.legLift * lift(-s) * amp, r: 6 * s * amp },
        footR: { r: cfg.footDeg * lift(-s) * amp, sy: 1 - 0.06 * lift(-s) * amp },
        root: { y: -cfg.bob * a * amp },
        torso: { r: 2.5 * s * amp },
        head: { r: -3 * s * amp, y: 4 * a * amp },
        armL: { r: cfg.armDeg * s * amp },
        armR: { r: cfg.armDeg * s * amp },
        handL: { r: 3 * s * amp },
        handR: { r: 3 * s * amp },
        eyes: { x: 3 * s * amp },
        shadow: { sx: 1 - 0.06 * a * amp }
    };
}

/** Breathing at `phase` (in breaths). */
export function breathe(phase, cfg = config.breathing) {
    const s = Math.sin(TAU * phase);
    return {
        torso: { sy: 1 + cfg.torsoScale * s },
        head: { y: -cfg.headY * s, r: 0.5 * s },
        armL: { r: -cfg.armDeg * s },
        armR: { r: cfg.armDeg * s },
        eyes: { y: -1.5 * s },
        brows: { y: -s }
    };
}

/** The slow layers under the breathing: the body sways, the head tilts, the arms drift. `t` in seconds. */
export function swayLayer(t, cfg = config.sway) {
    const body = Math.sin((TAU * t) / (cfg.periodMs / 1000));
    const head = Math.sin((TAU * t) / (cfg.headPeriodMs / 1000) + 1);
    const arms = Math.sin((TAU * t) / (cfg.armPeriodMs / 1000) + 2);
    return {
        root: { r: cfg.deg * body, x: cfg.x * Math.sin((TAU * t) / (cfg.periodMs / 1000) + 0.4) },
        head: { r: cfg.headDeg * head },
        armL: { r: -cfg.armDeg * arms },
        armR: { r: cfg.armDeg * arms },
        handL: { r: -3 * arms },
        handR: { r: 3 * arms }
    };
}

/** The eyes' vertical scale `u` of the way through a blink. */
export const blinkCurve = (u, closed = config.blink.closed) => 1 - (1 - closed) * Math.sin(Math.PI * clamp(u, 0, 1));

/** Eyes at (ex, ey) px, head turned `headR` degrees and shifted `headX`. */
export const lookLayer = (ex, ey, headR, headX) => ({ eyes: { x: ex, y: ey }, head: { r: headR, x: headX } });

/**
 * One step of a damped spring toward `target`. `state` is { x, v } and is
 * updated in place. A `maxSpeed` turns a long pull into a cruise: it still
 * eases out of the start and into the stop, but never slingshots.
 */
export function springStep(state, target, dt, { stiffness, damping, maxSpeed = Infinity }) {
    let left = dt;
    while (left > 0) {
        const h = Math.min(left, 1 / 90);
        const accel = stiffness * (target - state.x) - damping * state.v;
        state.v = clamp(state.v + accel * h, -maxSpeed, maxSpeed);
        state.x += state.v * h;
        left -= h;
    }
    return state;
}

// ---------- clips: short, one-shot gestures, `u` from 0 to 1 ----------

export const CLIPS = {
    shake: (u, cfg = config.shake) => ({ head: { r: cfg.deg * Math.sin(TAU * cfg.times * u) * (1 - u * 0.4) }, eyes: { x: -6 * Math.sin(TAU * cfg.times * u) } }),
    nod: (u, cfg = config.nod) => ({ head: { r: 0, y: cfg.deg * Math.sin(Math.PI * u) * 1.6 }, eyes: { y: 3 * Math.sin(Math.PI * u) } }),
    bounce: (u, cfg = config.bounce) => {
        const h = Math.sin(Math.PI * u);
        return {
            root: { y: -cfg.height * h }, torso: { sy: 1 - 0.04 * Math.max(0, Math.cos(TAU * u)) }, head: { y: -3 * h },
            armL: { r: -4 * h }, armR: { r: 4 * h }, shadow: { sx: 1 - 0.06 * h }
        };
    },
    squash: (u, cfg = config.walk.squash) => {
        const sy = u < 0.4 ? lerp(1, cfg.down, Math.sin((Math.PI * u) / 0.8)) : u < 0.75 ? lerp(cfg.down, cfg.up, easeInOut((u - 0.4) / 0.35)) : lerp(cfg.up, 1, easeInOut((u - 0.75) / 0.25));
        return { torso: { sy }, head: { y: (1 - sy) * 40 } };
    },
    stretch: (u, cfg = config.microIdle) => {
        const h = Math.sin(Math.PI * u);
        return { armL: { r: -cfg.stretchArmDeg * h }, armR: { r: cfg.stretchArmDeg * h }, torso: { sy: 1 + 0.02 * h }, head: { y: -4 * h, r: 2 * h } };
    },
    tilt: (u) => ({ head: { r: 5 * Math.sin(Math.PI * u) }, eyes: { x: 4 * Math.sin(Math.PI * u) } }),
    pop: (u) => {
        const k = 1 + 0.06 * Math.sin(Math.PI * u);
        return { root: { sx: k, sy: k } };
    }
};
export const CLIP_MS = { shake: config.shake.ms, nod: config.nod.ms, bounce: config.bounce.ms, squash: config.walk.squash.ms, stretch: 1100, tilt: 1200, pop: 320 };

// ---------- gestures: staged timelines on the rig's own parts ----------
// Each takes the milliseconds since the gesture began and returns the layer
// for that frame, how far each pointing finger is extended (0 fist … 1
// finger), and whether the gesture is over. Always in the rig's own frame:
// the engine turns the whole character to face the target, so the right arm
// points, and the left arm — the artwork's raised one — waves.

/**
 * Pointing: the head turns, the shoulders follow, the upper arm lifts, the
 * wrist turns the finger onto the target, the finger extends; a hold; then
 * everything lowers, finger first, head last. `elev` is -1 (below) .. 1
 * (above) for the target's height against the eyes.
 */
export function pointFrame(ms, { elev = 0, holdMs = config.pointing.holdMs } = {}, P = config.pointing) {
    const e = clamp(elev, -1, 1);
    const l0 = P.upMs + holdMs;
    const total = l0 + P.lowerMs;
    const rise = (range) => ramp(ms, range[0], range[1]);
    const fall = (a, b) => 1 - ramp(ms, l0 + P.lowerMs * a, l0 + P.lowerMs * b);
    const w = {
        head: Math.min(rise(P.head), fall(0.5, 1)),
        shoulders: Math.min(rise(P.shoulders), fall(0.4, 0.9)),
        arm: Math.min(rise(P.arm), fall(0.2, 0.8)),
        wrist: Math.min(rise(P.wrist), fall(0.1, 0.5)),
        finger: Math.min(rise(P.finger), fall(0, 0.3))
    };
    // The right arm: a negative turn lifts it outward, as the kit's own pointing pose does.
    const armFull = -(P.armDeg + e * P.armLiftDeg);
    const armNow = armFull * w.arm;
    // The finger's angle is absolute; the wrist supplies whatever the arm has not.
    const fingerAbs = P.fingerDeg - e * P.fingerElevDeg;
    const wrist = (fingerAbs - armNow) * w.wrist;
    return {
        layer: {
            head: { r: P.headDeg * w.head, x: P.headX * w.head },
            torso: { r: P.shoulderDeg * w.shoulders },
            armR: { r: armNow },
            handRPoint: { r: wrist },
            handR: { r: wrist * 0.15 }
        },
        finger: { R: w.finger, L: 0 },
        done: ms >= total
    };
}

/** Waving: the left arm rises, the open hand waves from the wrist, the arm lowers. */
// Every gesture frame takes (ms, opts, tuning), so the driver can call them alike; only pointing reads its opts.
export function waveFrame(ms, _opts = {}, V = config.variants.wave) {
    const total = V.waveTo + V.lowerMs;
    const up = Math.min(ramp(ms, 0, V.upMs), 1 - ramp(ms, V.waveTo, total));
    const waving = ms >= V.waveFrom && ms <= V.waveTo ? Math.sin((TAU * V.hz * (ms - V.waveFrom)) / 1000) : 0;
    const open = Math.min(ramp(ms, V.upMs * 0.55, V.upMs + 50), 1 - ramp(ms, V.waveTo, V.waveTo + V.lowerMs * 0.6));
    return {
        layer: {
            armL: { r: V.armDeg * up },
            // The open hand stays upright while the arm rises, then swings from the wrist.
            handLPoint: { r: -V.armDeg * up + V.handDeg * waving * up },
            handL: { r: 6 * up },
            head: { r: -4 * up, x: -2 * up },
            torso: { r: -2 * up },
            root: { y: -3 * Math.abs(waving) * up }
        },
        finger: { R: 0, L: open },
        done: ms >= total
    };
}

/** Celebrating: both arms up, a couple of hops, and down again. */
export function celebrateFrame(ms, _opts = {}, V = config.variants.celebrate) {
    const total = V.bounceTo + V.lowerMs;
    const up = Math.min(ramp(ms, 0, V.upMs), 1 - ramp(ms, V.bounceTo, total));
    const u = clamp((ms - V.bounceFrom) / (V.bounceTo - V.bounceFrom), 0, 1);
    const hop = ms >= V.bounceFrom && ms <= V.bounceTo ? Math.abs(Math.sin(Math.PI * V.hops * u)) : 0;
    return {
        layer: {
            armR: { r: -V.armDeg * up },
            armL: { r: V.armDeg * up },
            handR: { r: -20 * up },
            handL: { r: 20 * up },
            root: { y: -V.bounce * hop },
            torso: { sy: 1 + 0.03 * hop },
            head: { y: -3 * hop },
            brows: { y: -6 * up },
            eyes: { y: -3 * up },
            shadow: { sx: 1 - 0.08 * hop }
        },
        finger: { R: 0, L: 0 },
        done: ms >= total
    };
}

/** Clapping: the arms come in, the fists beat together, the arms go back down. */
export function clapFrame(ms, _opts = {}, V = config.variants.clap) {
    const total = V.clapTo + V.lowerMs;
    const inn = Math.min(ramp(ms, 0, V.inMs), 1 - ramp(ms, V.clapTo, total));
    const u = clamp((ms - V.clapFrom) / (V.clapTo - V.clapFrom), 0, 1);
    const beat = ms >= V.clapFrom && ms <= V.clapTo ? 0.5 - 0.5 * Math.cos(TAU * V.beats * u) : 0;
    return {
        layer: {
            // A positive turn brings the right arm in toward the body, as the kit's clapping pose does.
            armR: { r: V.armDeg * inn - 10 * beat * inn },
            armL: { r: -V.armDeg * inn + 10 * beat * inn },
            handR: { r: V.handDeg * beat * inn },
            handL: { r: -V.handDeg * beat * inn },
            head: { y: -3 * Math.abs(Math.sin(Math.PI * V.beats * u)) * inn, r: 2 * inn },
            root: { y: -2 * beat * inn }
        },
        finger: { R: 0, L: 0 },
        done: ms >= total
    };
}

export const GESTURES = { point: pointFrame, wave: waveFrame, celebrate: celebrateFrame, clap: clapFrame };
/** How long a gesture runs with these options, in milliseconds. */
export const gestureMs = (name, opts = {}) =>
    name === 'point' ? config.pointing.upMs + (opts.holdMs ?? config.pointing.holdMs) + config.pointing.lowerMs : GESTURE_MS[name] ?? 0;
/** How long each gesture runs, at its default hold. */
export const GESTURE_MS = {
    point: config.pointing.upMs + config.pointing.holdMs + config.pointing.lowerMs,
    wave: config.variants.wave.waveTo + config.variants.wave.lowerMs,
    celebrate: config.variants.celebrate.bounceTo + config.variants.celebrate.lowerMs,
    clap: config.variants.clap.clapTo + config.variants.clap.lowerMs
};

// ---------- the driver ----------

const between = (rnd, [lo, hi]) => lo + rnd() * (hi - lo);

/**
 * Renders the rig into `host` and returns the per-frame driver. Call `tick(dt)`
 * from one animation loop; everything else just sets what the next frames
 * blend in.
 */
export function createRigDriver(host, { prefix = 'cm', random = Math.random } = {}) {
    rig.setMode('raster');
    rig.setRaster({ base: RIG_BASE, parts });
    host.innerHTML = rig.renderStatic('idle', { expression: 'happy', prefix });

    const nodes = {};
    const pivots = {};
    const roots = {};
    const last = {};
    const lastOpacity = {};

    /**
     * The artwork's pointing hand, taken from the kit's own pointing pose and
     * set beside the fist at the same wrist, hidden until a gesture extends it.
     */
    const graftPointingHand = (pose, side) => {
        const scratch = document.createElement('div');
        scratch.innerHTML = rig.renderStatic(pose, { expression: 'happy', prefix: `${prefix}${side}` });
        const hand = scratch.querySelector(side === 'R' ? '#hand-right' : '#hand-left');
        const image = hand?.querySelector('image');
        const wrap = image?.parentElement;
        const arm = host.querySelector(side === 'R' ? '#arm-right' : '#arm-left');
        if (!hand || !wrap || !arm) return null;
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('id', side === 'R' ? ID.handRPoint : ID.handLPoint);
        g.setAttribute('data-pivot', hand.getAttribute('data-pivot'));
        g.setAttribute('opacity', '0');
        g.appendChild(wrap.cloneNode(true));
        arm.appendChild(g);
        return g;
    };
    graftPointingHand('pointRight', 'R');
    graftPointingHand('pointLeft', 'L');

    for (const key in ID) {
        const node = host.querySelector(`#${ID[key]}`);
        if (!node) continue;
        nodes[key] = node;
        pivots[key] = (node.getAttribute('data-pivot') || '0,0').split(',').map(Number);
    }
    for (const key in ROOTS) roots[key] = host.querySelector(`#${ROOTS[key]}`);

    const cfg = config;
    const st = {
        t: 0,
        paused: false,
        exprFrom: 'happy', exprTo: 'happy', exprT: 1,
        exprTimer: 0,
        sleeping: false,
        breathPhase: 0, breathPeriod: between(random, cfg.breathing.periodMs) / 1000,
        blinkAt: between(random, [cfg.blink.minMs, cfg.blink.maxMs]) / 1000, blink: null,
        look: null,
        eyes: { x: { x: 0, v: 0 }, y: { x: 0, v: 0 } },
        head: { x: 0, v: 0 },
        walkAmp: 0, walkTarget: 0, walkPhase: 0, cadence: 0,
        clips: [],
        gesture: null, // { name, opts, start, resolve, cancelAt }
        mode: null, modeState: null,
        microAt: between(random, [cfg.microIdle.minMs, cfg.microIdle.maxMs]) / 1000,
        microEnabled: true
    };

    const exprLayer = (name) => cfg.expressions[name] || {};

    const play = (name, ms) => {
        if (!CLIPS[name]) return;
        st.clips = st.clips.filter((c) => c.name !== name);
        st.clips.push({ name, start: st.t, ms: (ms ?? CLIP_MS[name]) / 1000 });
    };

    // ---- contexts: reading, watching, thinking, waiting ----
    const startMode = (name) => {
        st.mode = name;
        if (name === 'reading') {
            const c = cfg.contexts.reading;
            st.modeState = { line: 0, lines: Math.round(between(random, c.lines)), lineStart: st.t, lineMs: between(random, c.lineMs) / 1000, glance: 0 };
        } else if (name === 'watching') {
            st.modeState = { reactAt: st.t + between(random, cfg.contexts.watching.reactMs) / 1000 };
        } else if (name === 'thinking') {
            st.modeState = { lookAt: st.t + between(random, cfg.contexts.thinking.lookMs) / 1000, look: null, lookUntil: 0 };
        } else st.modeState = null;
    };

    const modeFrame = () => {
        const m = st.modeState;
        if (!st.mode || !m) return { look: null, layer: null };
        if (st.mode === 'reading') {
            const c = cfg.contexts.reading;
            const now = st.t;
            if (m.glance && now < m.glance) return { look: { x: 0, y: -0.7 }, layer: { head: { r: -c.headDeg * 0.5 } } };
            let u = (now - m.lineStart) / m.lineMs;
            if (u >= 1) {
                m.line += 1;
                m.lineStart = now;
                m.lineMs = between(random, c.lineMs) / 1000;
                u = 0;
                if (m.line >= m.lines) {
                    m.line = 0;
                    m.lines = Math.round(between(random, c.lines));
                    m.glance = now + c.glanceMs / 1000;
                    m.lineStart = m.glance;
                }
            }
            const sweep = u < 0.85 ? -1 + (2 * u) / 0.85 : 1 - (2 * (u - 0.85)) / 0.15;
            const drop = (m.line / Math.max(1, m.lines - 1)) * 2 - 1;
            return { look: { x: sweep * (c.sweepX / cfg.look.eyesX), y: 0.35 + drop * (c.lineY / cfg.look.eyesY) * 0.5 }, layer: { head: { r: c.headDeg * sweep * 0.4 } } };
        }
        if (st.mode === 'watching') {
            const c = cfg.contexts.watching;
            if (st.t >= m.reactAt) {
                play(c.clips[Math.floor(random() * c.clips.length)]);
                m.reactAt = st.t + between(random, c.reactMs) / 1000;
            }
            return { look: st.look ? { x: st.look.x, y: st.look.y + c.eyesY / cfg.look.eyesY } : null, layer: null };
        }
        if (st.mode === 'thinking') {
            const c = cfg.contexts.thinking;
            const sway = Math.sin((TAU * st.t) / (c.swayMs / 1000)) * c.swayDeg;
            if (st.t >= m.lookAt) {
                m.look = { x: random() * 2 - 1, y: -0.4 - random() * 0.6 };
                m.lookUntil = st.t + 1.1;
                m.lookAt = st.t + between(random, c.lookMs) / 1000;
            }
            const look = m.look && st.t < m.lookUntil ? m.look : { x: -0.6, y: -0.8 };
            return { look, layer: { head: { r: sway }, torso: { r: sway * 0.3 } } };
        }
        return { look: null, layer: null };
    };

    /** The active gesture's frame, faded out over gestureCancelMs when it was cancelled. */
    const gestureFrame = () => {
        const g = st.gesture;
        if (!g) return { layer: null, finger: { R: 0, L: 0 } };
        const ms = (st.t - g.start) * 1000;
        const frame = GESTURES[g.name](ms, g.opts);
        let k = 1;
        if (g.cancelAt != null) k = 1 - ramp((st.t - g.cancelAt) * 1000, 0, cfg.gestureCancelMs);
        if (frame.done || k <= 0) {
            st.gesture = null;
            g.resolve?.();
            return { layer: null, finger: { R: 0, L: 0 } };
        }
        return { layer: k < 1 ? scaleLayer(frame.layer, k) : frame.layer, finger: { R: frame.finger.R * k, L: frame.finger.L * k } };
    };

    const setOpacity = (key, value) => {
        const node = nodes[key];
        if (!node) return;
        const v = r3(value);
        if (lastOpacity[key] === v) return;
        lastOpacity[key] = v;
        node.setAttribute('opacity', String(v));
    };

    const tick = (dtIn) => {
        if (st.paused) return;
        const dt = Math.min(Math.max(dtIn, 0), 0.05);
        st.t += dt;

        // -- expression cross-fade --
        if (st.exprT < 1) st.exprT = Math.min(1, st.exprT + dt / (cfg.expressions.crossfadeMs / 1000));
        if (st.exprTimer && st.t >= st.exprTimer) {
            st.exprTimer = 0;
            setExpression(st.sleeping ? 'sleepy' : 'happy');
        }
        const expr = blend([scaleLayer(exprLayer(st.exprFrom), 1 - st.exprT), scaleLayer(exprLayer(st.exprTo), st.exprT)]);

        // -- breathing and the slow sway under it --
        const period = st.sleeping ? cfg.sleep.breathingPeriodMs / 1000 : st.breathPeriod;
        const before = st.breathPhase;
        st.breathPhase += dt / period;
        if (Math.floor(st.breathPhase) !== Math.floor(before)) st.breathPeriod = between(random, cfg.breathing.periodMs) / 1000;
        const breath = breathe(st.breathPhase);
        const sway = swayLayer(st.t);

        // -- context --
        const mode = modeFrame();

        // -- look: eyes spring quickly, head lags --
        const want = mode.look || st.look || cfg.restGaze;
        const ex = clamp(want.x, -1, 1) * cfg.look.eyesX;
        const ey = clamp(want.y, -1, 1) * cfg.look.eyesY;
        const eyeSpring = { stiffness: 220, damping: 24 };
        springStep(st.eyes.x, ex, dt, eyeSpring);
        springStep(st.eyes.y, ey, dt, eyeSpring);
        const headTarget = (st.eyes.x.x / cfg.look.eyesX) * cfg.look.headDeg;
        springStep(st.head, headTarget, dt, { stiffness: 90, damping: 16 });
        const lookL = lookLayer(st.eyes.x.x, st.eyes.y.x, st.head.x, (st.head.x / cfg.look.headDeg) * cfg.look.headX);

        // -- blink --
        let blinkL = null;
        if (st.blink) {
            const u = (st.t - st.blink.start) / (cfg.blink.durationMs / 1000);
            if (u >= 1) {
                if (st.blink.again) st.blink = { start: st.t + 0.09, again: false };
                else st.blink = null;
            } else if (u >= 0) blinkL = { eyes: { sy: blinkCurve(u) } };
        } else if (st.t >= st.blinkAt) {
            st.blink = { start: st.t, again: random() < cfg.blink.doubleChance };
            st.blinkAt = st.t + between(random, [cfg.blink.minMs, cfg.blink.maxMs]) / 1000;
        }

        // -- micro-idles, only while nothing else is going on --
        if (st.microEnabled && !st.mode && !st.sleeping && !st.gesture && st.walkAmp < 0.05 && !st.clips.length && st.t >= st.microAt) {
            const clip = cfg.microIdle.clips[Math.floor(random() * cfg.microIdle.clips.length)];
            if (clip === 'lookAround') {
                st.look = { x: random() < 0.5 ? -0.9 : 0.9, y: -0.3 };
                st.lookUntil = st.t + 1.2;
            } else play(clip);
            st.microAt = st.t + between(random, [cfg.microIdle.minMs, cfg.microIdle.maxMs]) / 1000;
        }
        if (st.lookUntil && st.t >= st.lookUntil) {
            st.lookUntil = 0;
            st.look = null;
        }

        // -- clips --
        const clipLayers = [];
        st.clips = st.clips.filter((c) => {
            const u = (st.t - c.start) / c.ms;
            if (u >= 1) return false;
            clipLayers.push(CLIPS[c.name](Math.max(0, u)));
            return true;
        });

        // -- walk --
        st.walkAmp = lerp(st.walkAmp, st.walkTarget, Math.min(1, dt * 12));
        st.walkPhase += dt * st.cadence * st.walkAmp;
        const walkL = st.walkAmp > 0.01 ? walkCycle(st.walkPhase, st.walkAmp) : null;

        // -- the gesture, and the fingers it extends --
        const gesture = gestureFrame();
        setOpacity('handRPoint', gesture.finger.R);
        setOpacity('handR', 1 - gesture.finger.R);
        setOpacity('handLPoint', gesture.finger.L);
        setOpacity('handL', 1 - gesture.finger.L);

        const t = clampArms(blend([expr, breath, sway, mode.layer, lookL, blinkL, gesture.layer, walkL, ...clipLayers]));
        for (const key in nodes) {
            const attr = transformAttr(pivots[key], t[key] || { x: 0, y: 0, r: 0, sx: 1, sy: 1 });
            if (last[key] === attr) continue;
            last[key] = attr;
            nodes[key].setAttribute('transform', attr);
            if (roots[key]) roots[key].setAttribute('transform', attr);
        }
    };

    function setExpression(name, ms) {
        const to = cfg.expressions[name] ? name : 'happy';
        if (to !== st.exprTo) {
            st.exprFrom = st.exprTo;
            st.exprTo = to;
            st.exprT = 0;
        }
        st.exprTimer = ms ? st.t + ms / 1000 : 0;
    }

    return {
        tick,
        play,
        setExpression,
        expression: () => st.exprTo,
        /** Eyes toward (x, y), each -1..1; null returns them to the resting gaze. */
        setLook(v) {
            st.look = v ? { x: clamp(v.x, -1, 1), y: clamp(v.y, -1, 1) } : null;
            st.lookUntil = 0;
        },
        /** How fast the body is moving, in mascot widths per second; the cycle follows. */
        setWalk(speedWidths, run = false) {
            const stride = cfg.walk.strideWidths / (run ? cfg.walk.run : 1);
            st.walkTarget = clamp(speedWidths / 1.2, 0, 1);
            st.cadence = speedWidths / stride;
        },
        /**
         * Plays a gesture — point ({ elev, holdMs }), wave, celebrate, clap —
         * and resolves when it has lowered. A gesture already playing gives
         * way at once.
         */
        playGesture(name, opts = {}) {
            if (!GESTURES[name]) return Promise.resolve();
            st.gesture?.resolve?.();
            return new Promise((resolve) => {
                st.gesture = { name, opts, start: st.t, resolve, cancelAt: null };
            });
        },
        /** Lowers whatever gesture is playing, over gestureCancelMs; `now` drops it at once. */
        cancelGesture(now = false) {
            const g = st.gesture;
            if (!g) return;
            if (now) {
                st.gesture = null;
                g.resolve?.();
            } else if (g.cancelAt == null) g.cancelAt = st.t;
        },
        gesture: () => st.gesture?.name ?? null,
        setMode(name) {
            if (name !== st.mode) startMode(name);
        },
        mode: () => st.mode,
        setSleeping(on) {
            st.sleeping = Boolean(on);
            setExpression(on ? 'sleepy' : 'happy');
        },
        setMicroIdles(on) {
            st.microEnabled = Boolean(on);
        },
        setPaused(on) {
            st.paused = Boolean(on);
        },
        destroy() {
            host.innerHTML = '';
        }
    };
}
