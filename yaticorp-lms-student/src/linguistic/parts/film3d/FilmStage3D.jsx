/**
 * The story film's scene in 3D (2026-11-07): one Three.js scene for the whole film — the three people built once
 * (rig.js) and moved by their Animators (anim.js), the place rebuilt only when the story moves to another one
 * (sets.js), a camera that frames whoever speaks and eases between shots, the auto-rickshaw that comes and goes.
 *
 * Each line of the story (`line.at`) says who stands where, how, facing whom; from it every person is directed:
 * where to walk or run to, whether to sit, what to hold, their gesture, their face, who they look at. `ACTS` adds
 * the moments the words call for — buttoning the shirt, checking the watch, the handshake. `spoken` (the letter being
 * said) shapes the speaker's mouth. Tap a person: they hop, and the player says their line (`onTap`).
 *
 * Props: scene, line, lineIndex, talking (who), spoken, text, paused, onTap.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCharacter } from './rig';
import { Animator } from './anim';
import { buildSet, buildAuto } from './sets';

const STAGE_W = 9;
const X = (pct) => (pct / 100 - 0.5) * STAGE_W;
const CAST = ['arjun', 'ravi', 'interviewer'];
// What the pose words of the story mean for the hands and the face.
const UPPER = { talk: 'explain', give: 'give', sad: 'sad', surprise: 'surprise', cheer: 'cheer', stand: 'rest' };
const FACE = { talk: 'neutral', give: 'smile', sad: 'worried', surprise: 'surprised', cheer: 'happy', stand: 'neutral' };
/** The moments the words ask for, by scene-line and person: a gesture, a face, or a wait before setting off. */
const ACTS = {
    '1-0': { arjun: () => ({ upper: 'adjust', expr: 'neutral' }) },
    '1-1': { arjun: (s) => (s < 3.2 ? { upper: 'adjust' } : { upper: 'watch', expr: 'worried' }) },
    '1-2': { arjun: () => ({ upper: 'holdFolder', expr: 'smile' }) },
    '1-3': { arjun: (s) => (s < 1.6 ? { upper: 'watch', wait: true } : { upper: 'rest' }) },
    '2-0': { ravi: () => ({ expr: 'worried', upper: 'rest' }) },
    '2-1': { ravi: () => ({ expr: 'sad' }) },
    '2-2': { ravi: () => ({ expr: 'worried' }) },
    '2-3': { ravi: () => ({ upper: 'ask', expr: 'worried' }), arjun: () => ({ expr: 'neutral' }) },
    '2-4': { arjun: () => ({ expr: 'surprised', upper: 'rest' }), ravi: () => ({ upper: 'ask', expr: 'worried' }) },
    '3-0': { ravi: () => ({ upper: 'explain', expr: 'sad' }), arjun: () => ({ expr: 'worried', upper: 'holdFolder' }) },
    '3-1': { arjun: () => ({ upper: 'explain', expr: 'worried' }), ravi: () => ({ expr: 'sad' }) },
    '3-2': { arjun: (s) => (s < 3.5 ? { upper: 'watch', expr: 'worried' } : { upper: 'sad', expr: 'sad' }), ravi: () => ({ expr: 'sad' }) },
    '3-3': { ravi: () => ({ upper: 'give', expr: 'smile' }), arjun: () => ({ expr: 'sad', upper: 'sad' }) },
    '3-4': { arjun: () => ({ expr: 'neutral', upper: 'rest' }), ravi: () => ({ expr: 'listening' }) },
    '4-0': { arjun: () => ({ upper: 'give', expr: 'smile' }), ravi: () => ({ expr: 'surprised' }) },
    '4-1': { arjun: () => ({ upper: 'give', expr: 'smile' }), ravi: () => ({ expr: 'grateful', upper: 'receive' }) },
    '4-2': { ravi: () => ({ upper: 'phone', expr: 'smile' }), arjun: () => ({ expr: 'smile' }) },
    '4-3': { ravi: () => ({ upper: 'grateful', expr: 'grateful' }), arjun: () => ({ expr: 'smile' }) },
    '4-4': { arjun: () => ({ upper: 'explain', expr: 'happy' }), ravi: () => ({ upper: 'grateful', expr: 'happy' }) },
    '4-5': { arjun: (s) => (s < 1.8 ? { upper: 'watch', expr: 'worried', wait: true } : { upper: 'rest', expr: 'worried' }) },
    '5-0': { arjun: () => ({ expr: 'worried' }), interviewer: () => ({ upper: 'desk', expr: 'neutral' }) },
    '5-1': { arjun: () => ({ upper: 'explain', expr: 'worried' }), interviewer: () => ({ upper: 'desk', expr: 'listening' }) },
    '5-2': { interviewer: () => ({ upper: 'explain', expr: 'neutral' }), arjun: () => ({ expr: 'confused' }) },
    '5-3': { arjun: () => ({ upper: 'surprise', expr: 'surprised' }), interviewer: () => ({ upper: 'desk', expr: 'smile' }) },
    '5-4': { interviewer: () => ({ upper: 'explain', expr: 'smile' }), arjun: () => ({ upper: 'surprise', expr: 'surprised' }) },
    '6-0': { interviewer: () => ({ upper: 'explain', expr: 'smile' }), arjun: () => ({ expr: 'listening' }) },
    '6-1': { interviewer: () => ({ upper: 'give', expr: 'happy' }), arjun: () => ({ upper: 'give', expr: 'happy' }) },
    '6-2': { arjun: () => ({ upper: 'grateful', expr: 'grateful' }), interviewer: () => ({ upper: 'rest', expr: 'smile' }) },
    '6-3': { arjun: () => ({ expr: 'smile' }) }
};

export default function FilmStage3D({ scene, line, lineIndex = 0, talking, spoken = -1, text = '', paused = false, onTap }) {
    const host = useRef(null);
    const st = useRef(null);        // everything that lives for the whole film
    const live = useRef({ scene, line, lineIndex, talking, spoken, text, paused, onTap });
    useEffect(() => { live.current = { scene, line, lineIndex, talking, spoken, text, paused, onTap }; });

    // ── Once: the renderer, the camera, the people ──
    useEffect(() => {
        const el = host.current;
        if (!el) return undefined;
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(renderer.domElement);
        renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation';
        const world = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
        camera.position.set(0.4, 1.5, 11); camera.lookAt(0, 1, 0);
        // A soft light from the camera's side onto the faces (the key light of a rainy or evening scene is above and
        // behind them), so expressions read in every shot.
        const faceLight = new THREE.DirectionalLight('#fff1e2', 0.85); world.add(faceLight); world.add(faceLight.target);
        const cast = {};
        for (const key of CAST) { const c = buildCharacter(key); c.root.visible = false; world.add(c.root); cast[key] = { c, a: new Animator(c) }; }
        const S = { renderer, world, camera, cast, set: null, setKey: '', auto: null, autoLeaving: 0, camTarget: new THREE.Vector3(0, 1, 0), camPos: new THREE.Vector3(0.4, 1.5, 11), lookNow: new THREE.Vector3(0, 1, 0), lineKey: '', lineAt: 0, clock: new THREE.Clock(), raf: 0, size: [0, 0], shown: {} };
        st.current = S;
        const fit = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; if (w === S.size[0] && h === S.size[1]) return; S.size = [w, h]; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(el);
        // A tap on someone
        const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
        const onPointer = (e) => {
            const r = renderer.domElement.getBoundingClientRect();
            ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(ndc, camera);
            const hit = ray.intersectObjects(Object.values(cast).filter((x) => x.c.root.visible).map((x) => x.c.root), true)[0];
            const who = hit?.object?.userData?.who;
            if (who) { cast[who].a.hop(); live.current.onTap?.(who); }
        };
        renderer.domElement.addEventListener('pointerdown', onPointer);

        const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
        const frame = () => {
            S.raf = requestAnimationFrame(frame);
            const { paused: isPaused, talking: who, spoken: sp, text: tx, line: ln, scene: sc, lineIndex: li } = live.current;
            const dt = Math.min(0.05, S.clock.getDelta());
            const t = S.clock.elapsedTime;
            fit();
            if (!isPaused && ln) {
                const key = `${sc.id}-${li}`;
                if (key !== S.lineKey) { S.lineKey = key; S.lineAt = t; }
                const elapsed = t - S.lineAt;
                directAll(S, sc, ln, li, who, elapsed);
                for (const k of CAST) { const { a, c } = cast[k]; if (c.root.visible) { if (k === who) a.speak(tx, sp); a.update(dt, t); } }
                if (S.set) S.set.update(dt, t);
                if (S.auto && S.autoLeaving) { S.auto.position.x += dt * (2 + (t - S.autoLeaving) * 3); if (S.auto.position.x > 9) { world.remove(S.auto); S.auto = null; S.autoLeaving = 0; } }
                // The camera: where this shot wants it, eased
                frameShot(S, sc, ln, who, tmpA, tmpB);
            }
            camera.position.lerp(S.camPos, 1 - Math.exp(-1.6 * dt));
            S.lookNow.lerp(S.camTarget, 1 - Math.exp(-2 * dt));
            camera.lookAt(S.lookNow);
            faceLight.position.set(camera.position.x + 1.2, camera.position.y + 0.8, camera.position.z); faceLight.target.position.copy(S.lookNow);
            renderer.render(world, camera);
        };
        frame();
        return () => {
            cancelAnimationFrame(S.raf); ro.disconnect();
            renderer.domElement.removeEventListener('pointerdown', onPointer);
            if (S.set) { world.remove(S.set.group); S.set.dispose(); }
            for (const k of CAST) cast[k].c.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
            renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
            st.current = null;
        };
    }, []);

    return <div ref={host} className="absolute inset-0 overflow-hidden bg-black" data-film-stage-3d={line?.place || scene?.place} />;
}

/** The place of this line (a scene may end somewhere else, e.g. the street), with a seat under each seated person. */
function ensureSet(S, sc, ln) {
    const place = ln.place || sc.place; const light = ln.light || sc.light;
    const seats = [];
    for (const l of sc.lines) for (const [who, a] of Object.entries(l.at || {})) if (a.sit && !seats.some((s) => s.who === who)) seats.push({ who, x: X(a.x), kind: place === 'office' ? 'chair' : 'bench' });
    const key = `${place}|${light}|${seats.map((s) => s.x.toFixed(1)).join(',')}`;
    if (key === S.setKey) return;
    if (S.set) { S.world.remove(S.set.group); S.set.dispose(); }
    S.set = buildSet(place, light, seats); S.setKey = key;
    S.world.add(S.set.group); S.world.fog = S.set.fog; S.renderer.toneMappingExposure = S.set.exposure;
    S.set.lights.key.target.position.set(0, 1, 0);
    S.seats = Object.fromEntries(seats.map((s) => [s.who, s.kind === 'chair' ? 0.46 : 0.44]));
}

/** Tell each person what this line asks of them. */
function directAll(S, sc, ln, li, talking, elapsed) {
    ensureSet(S, sc, ln);
    const at = ln.at || {};
    const present = Object.keys(at).filter((k) => S.cast[k]);
    const heads = {};
    for (const k of present) heads[k] = S.cast[k].a.headWorld(new THREE.Vector3());
    const acts = ACTS[`${sc.id}-${li}`] || {};
    for (const k of CAST) {
        const { a, c } = S.cast[k];
        const d = at[k];
        if (!d) { if (c.root.visible) { c.root.visible = false; S.shown[k] = null; } continue; }
        const x = X(d.x);
        const fresh = !c.root.visible || S.shown[k] !== sc.id;
        if (fresh) {
            c.root.visible = true; S.shown[k] = sc.id;
            a.direct({ x, sit: !!d.sit, seatY: S.seats?.[k] });
            a.place(d.from != null ? X(d.from) : x, d.from != null ? Math.sign(x - X(d.from)) * Math.PI / 2 : (d.face === 'left' ? -0.95 : 0.95));
        }
        const act = typeof acts[k] === 'function' ? acts[k](elapsed) || {} : {};
        const others = present.filter((o) => o !== k);
        const partner = talking && talking !== k && others.includes(talking) ? talking : others[0] || null;
        const look = partner ? heads[partner] : null;
        a.direct({
            x: act.wait ? a.pos.x : x,
            walk: !!d.walk && !act.wait, run: !!d.run, sit: !!d.sit, seatY: S.seats?.[k] ?? 0.44,
            holds: d.holds || null,
            upper: act.upper || (d.holds === 'phone' ? 'phone' : d.sit && d.pose === 'talk' ? 'ask' : d.sit && UPPER[d.pose] === 'rest' ? 'rest' : UPPER[d.pose] || 'rest'),
            expr: act.expr || FACE[d.pose] || 'neutral',
            talking: talking === k, listening: !!talking && talking !== k && talking !== 'narrator',
            lookTarget: look, faceX: partner ? S.cast[partner].a.pos.x : null, faceDir: d.face === 'left' ? -1 : d.face === 'right' ? 1 : 0
        });
    }
    // The auto-rickshaw: there while the line has it, driving off when it is gone
    const wantAuto = (ln.props || []).includes('auto');
    if (wantAuto && !S.auto) { S.auto = buildAuto(); S.auto.position.set(X(66), 0, 0.9); S.auto.rotation.y = 0.15; S.world.add(S.auto); S.autoLeaving = 0; }
    else if (!wantAuto && S.auto && !S.autoLeaving) S.autoLeaving = S.clock.elapsedTime;
}

/** Where the camera goes for this line: wide to see the place, in on whoever speaks, a slow pan after a walker. */
function frameShot(S, sc, ln, talking, a, b) {
    const at = ln.at || {};
    const present = Object.keys(at).filter((k) => S.cast[k] && S.cast[k].c.root.visible);
    const cam = ln.cam || 'wide';
    const posOf = (k) => S.cast[k].a.pos.x;
    const headOf = (k, out) => S.cast[k].a.headWorld(out);
    let focus = new THREE.Vector3(0, 1.1, 0), dist = 10.5, height = 1.6, side = 0.4;
    const speaker = talking && present.includes(talking) ? talking : null;
    if (cam === 'close' || (speaker && cam !== 'wide' && cam !== 'pan')) {
        const who = speaker || present[0];
        headOf(who, a);
        const other = present.find((k) => k !== who);
        if (other && cam !== 'close') { headOf(other, b); focus.set(a.x * 0.62 + b.x * 0.38, a.y - 0.25, 0); dist = Math.max(3.6, Math.abs(a.x - b.x) * 1.3 + 2.4); height = a.y + 0.1; side = Math.sign(a.x - b.x || 1) * 0.5; }
        else { focus.set(a.x, a.y - 0.08, 0); dist = 2.7; height = a.y + 0.05; side = 0.35; }
    } else if (cam === 'left' || cam === 'right') {
        const xs = present.map(posOf); const x = cam === 'left' ? Math.min(...xs) : Math.max(...xs);
        focus.set(x + (cam === 'left' ? 0.6 : -0.6), 1.15, 0); dist = 6.2; height = 1.6; side = cam === 'left' ? -0.4 : 0.4;
    } else if (cam === 'pan') {
        const mover = present.find((k) => at[k].walk) || present[0];
        focus.set(mover ? posOf(mover) * 0.75 : 0, 1.05, 0); dist = 9; height = 1.7; side = 0.6;
    } else if (present.length) {
        const xs = present.map(posOf); const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        focus.set(mid, 1.05, 0); dist = Math.max(8.5, (Math.max(...xs) - Math.min(...xs)) * 2.2 + 5); height = 1.6; side = 0.4;
    }
    S.camTarget.copy(focus);
    S.camPos.set(focus.x + side, height, focus.z + dist);
}
