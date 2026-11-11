/**
 * How the story film's people move (2026-11-07): one Animator per character, driving the rig's joints every frame.
 *
 *   Locomotion   IDLE · WALK · RUN · SIT — the legs cycle with the distance covered, so the feet plant and never
 *                slide; arms swing opposite the legs; the body bobs, the torso leans into a run; an old man takes
 *                shorter, slower steps with bent knees and a stooped back. Sitting lowers the hips onto the seat with
 *                the thighs forward and the feet on the floor.
 *   Turning      the body turns smoothly toward where it walks, or toward whoever it speaks with or listens to.
 *   Upper body   REST · EXPLAIN · ASK · GIVE · RECEIVE · GRATEFUL · SURPRISE · CHEER · SAD · CHECK WATCH ·
 *                ADJUST SHIRT · HOLD FOLDER · PHONE · WAVE · HANDS ON KNEES · HANDS ON DESK — hand and arm gestures.
 *   Face         NEUTRAL · SMILE · HAPPY · SAD · WORRIED · SURPRISED · CONFUSED · GRATEFUL · LISTENING · SPEAKING —
 *                brows, lids, lip curve; blinking; eyes that look at the other person; the mouth shaped by the letter
 *                being spoken (visemes), not a flap.
 *   Talking      a nodding, breathing head; listeners nod back now and then.
 *
 * Every target is blended into the current pose with exponential smoothing, so each change of state eases in and
 * out and nothing jumps.
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (k, dt) => 1 - Math.exp(-k * dt);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* ── Expressions: brow lift, inner-brow raise, eyelid, lip curve (−1 frown … 1 smile), jaw, eye width, head bow ── */
const EXPR = {
    neutral: { by: 0, bi: 0, lid: 0.12, curve: 0.18, open: 0, wide: 1, bow: 0 },
    smile: { by: 0.002, bi: 0, lid: 0.16, curve: 0.6, open: 0, wide: 1, bow: 0 },
    happy: { by: 0.004, bi: 0, lid: 0.32, curve: 0.9, open: 0.12, wide: 1, bow: 0 },
    sad: { by: -0.001, bi: 0.3, lid: 0.3, curve: -0.55, open: 0, wide: 1, bow: 0.1 },
    worried: { by: 0.004, bi: 0.4, lid: 0.14, curve: -0.3, open: 0.05, wide: 1.02, bow: 0 },
    surprised: { by: 0.014, bi: 0.1, lid: 0.02, curve: 0.05, open: 0.5, wide: 1.14, bow: -0.05 },
    confused: { by: 0.006, bi: 0.35, biR: -0.2, lid: 0.14, curve: -0.1, open: 0.05, wide: 1, bow: 0 },
    grateful: { by: 0.002, bi: 0.2, lid: 0.22, curve: 0.55, open: 0, wide: 1, bow: 0.14 },
    listening: { by: 0.003, bi: 0.08, lid: 0.12, curve: 0.22, open: 0, wide: 1, bow: 0 }
};
export const EXPRESSIONS = Object.keys(EXPR);

/** The mouth shape for a letter being said: how open, how wide. Latin, Devanagari and Kannada. */
const viseme = (ch) => {
    if (!ch) return [0.08, 0.7];
    const c = ch.toLowerCase(); const code = c.charCodeAt(0);
    if ('aeiouyáéíóú'.includes(c) || (code >= 0x0904 && code <= 0x0914) || (code >= 0x093e && code <= 0x094c) || (code >= 0x0c85 && code <= 0x0c94) || (code >= 0x0cbe && code <= 0x0ccc)) {
        const round = 'ou'.includes(c) || [0x0913, 0x0914, 0x094b, 0x094c, 0x0c93, 0x0c94, 0x0ccb, 0x0ccc, 0x0909, 0x090a, 0x0941, 0x0942, 0x0c89, 0x0c8a, 0x0cc1, 0x0cc2].includes(code);
        if (round) return [0.55, 0.42];
        if ('i'.includes(c) || [0x0907, 0x0908, 0x093f, 0x0940, 0x0c87, 0x0c88, 0x0cbf, 0x0cc0].includes(code)) return [0.32, 1];
        return [0.72 + (code % 3) * 0.06, 0.82];
    }
    if ('mbp'.includes(c) || [0x092e, 0x092c, 0x092a, 0x0cae, 0x0cac, 0x0caa].includes(code)) return [0, 0.72];
    if ('fv'.includes(c) || [0x092b, 0x0935, 0x0cab, 0x0cb5].includes(code)) return [0.14, 0.9];
    if (/[\s.,;:!?…—\-"'“”]/.test(c)) return [0.06, 0.7];
    return [0.28 + (code % 4) * 0.04, 0.74];
};

/* ── Poses: each returns joint rotations [x, y, z] by name (sx: −1 left arm/leg, 1 right) and body values ── */
const restArms = (P, sx, old) => {
    P[`shoulder${sx < 0 ? 'L' : 'R'}`] = [0.06, 0, sx * (old ? 0.1 : 0.14)];
    P[`elbow${sx < 0 ? 'L' : 'R'}`] = [-0.2 - (old ? 0.15 : 0), 0, sx * 0.05];
    P[`wrist${sx < 0 ? 'L' : 'R'}`] = [0, 0, 0];
    P[`fingers${sx < 0 ? 'L' : 'R'}`] = [0.55, 0, 0];
};
const S = (sx) => (sx < 0 ? 'L' : 'R');

export class Animator {
    constructor(character) {
        this.c = character;
        this.J = character.joints;
        this.F = character.face;
        this.old = character.spec.age === 'old';
        this.scale = character.height / 1.76;
        this.legLen = 0.87;
        this.pos = new THREE.Vector3(0, 0, 0);
        this.yaw = 0; this.yawTarget = 0;
        this.targetX = 0; this.speed = 0; this.phase = 0;
        this.loco = 'idle'; this.sit = false; this.seatY = 0.44; this.gait = 'walk';
        this.upper = 'rest'; this.expr = 'neutral'; this.talking = false; this.listening = false;
        this.holds = null; this.lookTarget = null;
        this.t = 0; this.talkT = 0; this.hopT = 1; this.nodT = 2 + Math.random() * 2; this.nodU = 1;
        this.blinkT = 1.5 + Math.random() * 3; this.blinkU = 1;
        this.sacT = 1; this.sac = new THREE.Vector2();
        this.text = ''; this.spoken = -1; this.lastSpoken = -1; this.spokenAge = 0;
        this.mouth = { open: 0, width: 0.7 };
        this.cur = {}; this.curVals = { hipsY: character.hipY / this.scale, chestBreath: 0, bow: 0, look: new THREE.Vector2(), lid: 0.12, browY: 0, browIL: 0, browIR: 0, curve: 0.18 };
        this.tmp = { v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() };
        this.visible = false;
        this.refY = character.hipY / this.scale;     // hips height standing, in rig units
    }

    /** Put the person somewhere at once (a new scene, or their first appearance), facing `yaw`. */
    place(x, yaw = 0) { this.pos.x = x; this.targetX = x; this.yaw = yaw; this.yawTarget = yaw; this.speed = 0; this.loco = this.sit ? 'sit' : 'idle'; }

    /**
     * What the line asks of this person: where to be (`x`), walking or running there, sitting (on a seat `seatY`
     * high), what they hold, their gesture (`upper`) and face (`expr`), whether they speak or listen, and where to
     * look (`lookTarget`, a world point) and face (`faceX`, a world x to turn toward, or null to face the camera).
     */
    direct({ x, walk = false, run = false, sit = false, seatY = 0.44, holds = null, upper = 'rest', expr = 'neutral', talking = false, listening = false, lookTarget = null, faceX = null, faceDir = 0 }) {
        this.targetX = x;
        this.gait = run ? 'run' : 'walk';
        this.wantWalk = walk;
        this.sit = sit; this.seatY = seatY;
        this.holds = holds; this.upper = upper; this.expr = expr;
        if (talking && !this.talking) this.talkT = 0;
        this.talking = talking; this.listening = listening;
        this.lookTarget = lookTarget;
        this.faceX = faceX; this.faceDir = faceDir;
        if (this.c.parts.folder) this.c.parts.folder.visible = holds === 'papers';
        if (this.c.parts.phone) this.c.parts.phone.visible = holds === 'phone';
    }
    /** Which letter of the line is being said now (for the mouth); −1 when unknown. */
    speak(text, spoken) { this.text = text || ''; this.spoken = spoken; }
    hop() { this.hopT = 0; }

    /* ── Each frame ── */
    update(dt) {
        dt = Math.min(dt, 0.05);
        this.t += dt;
        const J = this.J, F = this.F, old = this.old, sc = this.scale;
        const P = {}; const V = {};

        // ── Where to be: walk or run there, the gait cycle tied to the ground covered ──
        const remaining = this.targetX - this.pos.x;
        const dist = Math.abs(remaining);
        const A = this.gait === 'run' ? 0.82 : old ? 0.34 : 0.48;              // leg swing
        const step = 2 * this.legLen * sc * Math.sin(A) * (this.gait === 'run' ? 1.25 : 0.95);
        const maxSpeed = this.gait === 'run' ? 3.4 : old ? 0.75 : 1.35;
        if (!this.sit && dist > 0.02 && (this.wantWalk || dist > 0.4)) {
            this.loco = this.gait;
            // Slowing over the last half-metre (less for a slow walker), never to a crawl.
            const want = maxSpeed * clamp(dist / (0.45 * Math.max(1, maxSpeed)), 0.3, 1);
            this.speed = lerp(this.speed, want, ease(this.speed < want ? 4 : 9, dt));
            const dx = Math.sign(remaining) * Math.min(dist, this.speed * dt);
            this.pos.x += dx;
            this.phase = (this.phase + Math.abs(dx) / (2 * step)) % 1;
            this.yawTarget = Math.sign(remaining) * Math.PI / 2;
            if (Math.abs(this.targetX - this.pos.x) < 0.02) { this.pos.x = this.targetX; this.speed = 0; this.loco = this.sit ? 'sit' : 'idle'; }
        } else {
            if (dist <= 0.4 && dist > 0.02 && !this.sit) this.pos.x = lerp(this.pos.x, this.targetX, ease(3, dt));   // a small shuffle, no gait
            this.speed = 0;
            this.loco = this.sit ? 'sit' : 'idle';
            // Facing: toward the person spoken with, else as the line says, else three-quarters to the camera.
            const dir = this.faceX != null ? Math.sign(this.faceX - this.pos.x) || 1 : this.faceDir;
            this.yawTarget = dir ? dir * 0.95 : 0.15;
        }
        this.yaw += wrapAngle(this.yawTarget - this.yaw) * ease(this.loco === 'idle' || this.loco === 'sit' ? 4 : 7, dt);

        // ── The body pose for this state ──
        const bob = { y: this.refY, chestX: old ? 0.2 : 0.03, neckX: old ? 0.14 : 0, hipsZ: 0, chestY: 0 };
        if (this.loco === 'walk' || this.loco === 'run') {
            const run = this.loco === 'run';
            const K = run ? 1.7 : old ? 0.7 : 0.95, A2 = run ? 0.85 : old ? 0.22 : 0.38;
            [-1, 1].forEach((sx) => {
                const q = (this.phase + (sx < 0 ? 0 : 0.5)) % 1;
                const swing = Math.max(0, Math.sin(TAU * (q - 0.5)));
                P[`hip${S(sx)}`] = [-A * Math.cos(TAU * q), 0, sx * 0.02];
                P[`knee${S(sx)}`] = [K * swing + 0.1 * Math.max(0, Math.cos(TAU * q)) + (old ? 0.12 : 0), 0, 0];
                P[`ankle${S(sx)}`] = [-0.35 * swing + 0.12 * Math.max(0, -Math.sin(TAU * q)), 0, 0];
                P[`shoulder${S(sx)}`] = [A2 * Math.cos(TAU * q) + (run ? 0.1 : 0.05), 0, sx * (run ? 0.2 : 0.12)];
                P[`elbow${S(sx)}`] = [run ? -1.6 : -(0.3 + 0.35 * Math.max(0, -Math.cos(TAU * q))), 0, 0];
                P[`wrist${S(sx)}`] = [0, 0, 0]; P[`fingers${S(sx)}`] = [run ? 1.1 : 0.6, 0, 0];
            });
            bob.y = this.refY - (run ? 0.03 : 0.022) + (run ? 0.05 : 0.022) * (1 - Math.cos(2 * TAU * this.phase)) / 2;
            bob.chestX = (run ? 0.32 : 0.06) + (old ? 0.14 : 0);
            bob.hipsZ = (run ? 0.05 : 0.035) * Math.sin(TAU * this.phase);
            bob.chestY = -(run ? 0.14 : 0.08) * Math.sin(TAU * this.phase);
            bob.neckX = (old ? 0.1 : -0.03) - (run ? 0.12 : 0);
        } else if (this.loco === 'sit') {
            [-1, 1].forEach((sx) => {
                P[`hip${S(sx)}`] = [-1.48, 0, sx * 0.08];
                P[`knee${S(sx)}`] = [1.42, 0, 0];
                P[`ankle${S(sx)}`] = [0.05, 0, 0];
                P[`shoulder${S(sx)}`] = [-0.55, 0, sx * 0.12];
                P[`elbow${S(sx)}`] = [-0.6, 0, sx * 0.1];
                P[`wrist${S(sx)}`] = [0.3, 0, 0];
                P[`fingers${S(sx)}`] = [0.7, 0, 0];
            });
            bob.y = this.seatY / sc + 0.03;
            bob.chestX = old ? 0.16 : 0.05;
        } else {
            [-1, 1].forEach((sx) => {
                P[`hip${S(sx)}`] = [old ? -0.08 : -0.02, 0, sx * 0.03];
                P[`knee${S(sx)}`] = [old ? 0.16 : 0.04, 0, 0];
                P[`ankle${S(sx)}`] = [0, 0, 0];
                restArms(P, sx, old);
            });
            bob.y = this.refY - (old ? 0.025 : 0.006);
            // Idle: weight shifts slowly from foot to foot; a breath; small drifts of the head.
            bob.hipsZ = 0.015 * Math.sin(this.t * 0.45) + 0.004 * Math.sin(this.t * 1.3);
            bob.chestY = 0.02 * Math.sin(this.t * 0.3);
        }
        // Hands on knees while seated; or on a desk.
        if (this.loco === 'sit' && this.upper === 'desk') [-1, 1].forEach((sx) => { P[`shoulder${S(sx)}`] = [-0.85, 0, sx * 0.1]; P[`elbow${S(sx)}`] = [-0.95, 0, sx * -0.2]; P[`wrist${S(sx)}`] = [0.2, 0, 0]; });

        // ── Gestures: the upper body over the locomotion pose ──
        const g = this.talking || this.loco === 'idle' || this.loco === 'sit' ? this.upper : 'rest';
        const tt = this.t;
        const r = 1, l = -1;
        const set = (sx, sh, el, wr, fi) => { if (sh) P[`shoulder${S(sx)}`] = sh; if (el) P[`elbow${S(sx)}`] = el; if (wr) P[`wrist${S(sx)}`] = wr; if (fi) P[`fingers${S(sx)}`] = fi; };
        const holdFolder = () => set(r, [-0.42, -0.2, 0.1], [-1.55, 0.4, 0.25], [0.1, 0.9, -0.2], [0.9, 0, 0]);
        if (this.loco !== 'walk' && this.loco !== 'run') {
            if (g === 'explain') { set(this.holds === 'papers' ? l : r, [-0.55 + 0.1 * Math.sin(tt * 2.1), 0, (this.holds === 'papers' ? l : r) * 0.35], [-1.5 + 0.22 * Math.sin(tt * 2.6 + 1), 0, 0], [0.2 * Math.sin(tt * 3.1), 0.45 * Math.sin(tt * 2.2), 0], [0.25, 0, 0]); if (this.holds === 'papers') holdFolder(); }
            else if (g === 'ask') { set(r, [-0.95 + 0.04 * Math.sin(tt * 1.7), 0.1, 0.22], [-1.25, 0, 0], [-0.5 + (old ? 0.03 * Math.sin(tt * 8) : 0), 0.3, 0], [0.2, 0, 0]); }
            else if (g === 'give') { set(r, [-1.05, 0.1, 0.12], [-0.45, 0, 0], [-0.35, 0.2, 0], [0.3, 0, 0]); }
            else if (g === 'receive') { [l, r].forEach((sx) => set(sx, [-0.9, 0, sx * 0.1], [-0.85, 0, 0], [-0.45, 0, 0], [0.25, 0, 0])); }
            else if (g === 'grateful') { [l, r].forEach((sx) => set(sx, [-0.95, 0, sx * -0.25], [-2.05, 0, sx * 0.45], [0.2, sx * 0.6, 0], [0.15, 0, 0])); }
            else if (g === 'surprise') { [l, r].forEach((sx) => set(sx, [-1.05, 0, sx * 0.5], [-1.95, 0, sx * -0.3], [-0.3, 0, 0], [0.1, 0, 0])); }
            else if (g === 'cheer') { [l, r].forEach((sx) => set(sx, [-2.5 + 0.1 * Math.sin(tt * 4 + sx), 0, sx * 0.35], [-0.45, 0, 0], [0, 0, 0], [0.2, 0, 0])); }
            else if (g === 'sad') { [l, r].forEach((sx) => set(sx, [0.08, 0, sx * 0.04], [-0.12, 0, 0], [0, 0, 0], [0.6, 0, 0])); bob.neckX += 0.22; bob.chestX += 0.06; }
            else if (g === 'watch') { set(l, [-0.95, 0.3, -0.15], [-2.0, 0, 0.25], [0.2, -1.1, 0], [0.5, 0, 0]); bob.neckX += 0.3; V.neckY = -0.45; if (this.holds === 'papers') holdFolder(); }
            else if (g === 'adjust') { [l, r].forEach((sx) => set(sx, [-1.15, 0, sx * -0.3], [-2.2 + 0.08 * Math.sin(tt * 5 + sx), 0, sx * 0.3], [0.1, 0, 0], [0.4, 0, 0])); }
            else if (g === 'phone') { set(r, [-0.55, 0.35, 0.3], [-2.45, 0.2, 0.15], [-0.6, 0.4, 0], [0.8, 0, 0]); V.headZ = -0.14; }
            else if (g === 'wave') { set(r, [-2.4, 0, 0.3], [-0.6, 0, 0], [0, 0, 0.5 * Math.sin(tt * 8)], [0.1, 0, 0]); }
            else if (g === 'holdFolder' || (this.holds === 'papers' && g === 'rest')) { holdFolder(); }
            if (this.holds === 'papers' && g !== 'explain' && g !== 'watch' && g !== 'holdFolder' && g !== 'rest') holdFolder();
        }

        // ── Head and eyes: toward the other person; a talker nods; a listener nods back now and then ──
        const look = this.tmp.v; let neckY = V.neckY || 0, neckX = 0;
        if (this.lookTarget) {
            look.copy(this.lookTarget).sub(this.pos);
            const ang = wrapAngle(Math.atan2(look.x, look.z) - this.yaw);                    // yaw to the target in the body's frame
            const pitch = -Math.atan2(look.y - this.c.height * 0.93, Math.hypot(look.x, look.z));
            neckY = clamp(ang, -1.1, 1.1) * 0.7; neckX = clamp(pitch, -0.35, 0.4) * 0.8;
            V.eyeX = clamp(ang * 0.25, -0.3, 0.3); V.eyeY = clamp(pitch * 0.3, -0.2, 0.2);
        }
        if (this.talking) { this.talkT += dt; neckX += 0.035 * Math.sin(this.t * 2.3) + 0.015 * Math.sin(this.t * 5.1); V.headZ = (V.headZ || 0) + 0.025 * Math.sin(this.t * 1.7); }
        if (this.listening) { this.nodT -= dt; if (this.nodT <= 0) { this.nodT = 2.4 + Math.random() * 2.6; this.nodU = 0; } }
        if (this.nodU < 1) { this.nodU = Math.min(1, this.nodU + dt / 0.7); neckX += 0.12 * Math.sin(Math.PI * this.nodU); }
        P.neck = [bob.neckX + neckX, neckY, 0];
        P.head = [0, neckY * 0.3, V.headZ || 0];
        P.chest = [bob.chestX, bob.chestY, 0];
        P.spine = [old ? 0.06 : 0.01, 0, 0];
        P.hips = [0, 0, bob.hipsZ];

        // ── Face ──
        const E = EXPR[this.talking ? (['sad', 'worried', 'surprised', 'happy', 'grateful'].includes(this.expr) ? this.expr : 'neutral') : this.listening && this.expr === 'neutral' ? 'listening' : this.expr] || EXPR.neutral;
        this.blinkT -= dt;
        if (this.blinkT <= 0) { this.blinkT = 2 + Math.random() * 4; this.blinkU = 0; }
        let lid = E.lid;
        if (this.blinkU < 1) { this.blinkU = Math.min(1, this.blinkU + dt / 0.16); lid = Math.max(lid, Math.sin(Math.PI * this.blinkU)); }
        this.sacT -= dt;
        if (this.sacT <= 0) { this.sacT = 0.8 + Math.random() * 2.2; this.sac.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.06); }
        // The mouth: the letter being said — or, with no word timing, letters at speaking pace; closed when quiet.
        let open = E.open, width = 0.7;
        if (this.talking) {
            let idx = this.spoken;
            if (idx < 0) idx = Math.floor(this.talkT * 13);
            if (idx !== this.lastSpoken) { this.lastSpoken = idx; this.spokenAge = 0; } else this.spokenAge += dt;
            const [o, w] = viseme(this.text[idx]);
            const fade = this.spokenAge > 0.22 ? Math.max(0.15, 1 - (this.spokenAge - 0.22) * 2.5) : 1;
            open = Math.max(E.open, o * fade * (0.85 + 0.15 * Math.sin(this.talkT * 9))); width = w;
        } else this.lastSpoken = -1;
        const C = this.curVals;
        C.lid = lerp(C.lid, lid, ease(this.blinkU < 1 ? 30 : 10, dt));
        C.browY = lerp(C.browY, E.by, ease(8, dt));
        C.browIL = lerp(C.browIL, E.bi, ease(8, dt)); C.browIR = lerp(C.browIR, E.biR ?? E.bi, ease(8, dt));
        C.curve = lerp(C.curve, E.curve, ease(6, dt));
        this.mouth.open = lerp(this.mouth.open, open, ease(22, dt)); this.mouth.width = lerp(this.mouth.width, width, ease(14, dt));
        C.look.x = lerp(C.look.x, (V.eyeX || 0) + this.sac.x, ease(10, dt)); C.look.y = lerp(C.look.y, (V.eyeY || 0) + this.sac.y, ease(10, dt));
        C.bow = lerp(C.bow, E.bow, ease(5, dt));
        ['L', 'R'].forEach((s) => {
            F[`lid${s}`].scale.y = C.lid; F[`lid${s}`].position.y = 0.0305 * (1 - C.lid);
            F[`eye${s}`].rotation.set(-C.look.y, C.look.x, 0);
            const b = F[`brow${s}`]; const inner = s === 'L' ? C.browIL : -C.browIR;
            b.position.y = b.userData.base.y + C.browY; b.rotation.z = b.userData.base.z + inner;
        });
        F.cavity.scale.set(this.mouth.width + 0.1, 0.05 + this.mouth.open * 1.05, 1);
        F.teeth.visible = this.mouth.open > 0.28;
        F.lips.rotation.z = C.curve >= 0 ? Math.PI : 0;
        F.lips.scale.set(this.mouth.width * 1.0 + 0.15, Math.max(0.15, Math.abs(C.curve) * 0.9 + 0.1), 1);
        F.lips.position.y = -this.mouth.open * 0.014 + (C.curve < 0 ? 0.004 : 0);
        if (F.lowerLip) { F.lowerLip.position.y = -0.006 - this.mouth.open * 0.03; F.lowerLip.scale.x = 2.1 * (0.8 + this.mouth.width * 0.3); }
        ['L', 'R'].forEach((s) => { F[`eye${s}`].parent.scale.setScalar(E.wide); });

        // ── Blend into the current pose and apply ──
        const kLoco = this.loco === 'idle' || this.loco === 'sit' ? 7 : 13;
        for (const [name, tgt] of Object.entries(P)) {
            const j = J[name]; if (!j) continue;
            const cur = this.cur[name] || (this.cur[name] = [...tgt]);
            const k = name.startsWith('hip') || name.startsWith('knee') || name.startsWith('ankle') ? kLoco : name === 'neck' || name === 'head' ? 9 : 8;
            const f = ease(k, dt);
            for (let i = 0; i < 3; i += 1) cur[i] = lerp(cur[i], tgt[i], f);
            j.rotation.set(cur[0], cur[1], cur[2]);
        }
        C.hipsY = lerp(C.hipsY, bob.y, ease(this.loco === 'walk' || this.loco === 'run' ? 14 : 6, dt));
        J.hips.position.y = C.hipsY;
        J.neck.rotation.x += C.bow;
        // Breathing
        C.chestBreath = 1 + 0.014 * Math.sin(this.t * (this.speed > 0 ? 3.4 : 1.5));
        J.chest.scale.set(1, C.chestBreath, 1);
        // A hop when tapped
        let hopY = 0;
        if (this.hopT < 1) { this.hopT = Math.min(1, this.hopT + dt / 0.5); hopY = 0.22 * Math.sin(Math.PI * this.hopT) * (this.hopT < 0.9 ? 1 : (1 - this.hopT) * 10); }
        this.c.root.position.set(this.pos.x, hopY, this.pos.z);
        this.c.root.rotation.y = this.yaw;
    }

    /** Where the head is, in the world (for the others to look at, and for the camera). */
    headWorld(out) { return this.J.head.getWorldPosition(out); }
}
