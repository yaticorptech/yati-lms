/**
 * The rig driver's arithmetic: layers blend by adding, arms never pass the
 * cap, the walk alternates its legs and follows the speed, breathing and
 * blinking stay within their bounds, and the container spring cruises rather
 * than slingshots.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { blend, scaleLayer, clampArms, transformAttr, walkCycle, breathe, blinkCurve, springStep, CLIPS, CLIP_MS, easeOutBack } =
    await import('../../src/mascot/rigDriver.js');
const { default: config, arm, walk, breathing, blink } = await import('../../src/mascot/mascotConfig.js');

test('layers blend by adding offsets and multiplying scales', () => {
    const t = blend([{ head: { r: 2, y: -3 } }, { head: { r: 3, sy: 1.1 } }, null, { torso: { sy: 0.9 } }]);
    assert.deepEqual(t.head, { x: 0, y: -3, r: 5, sx: 1, sy: 1.1 });
    assert.deepEqual(t.torso, { x: 0, y: 0, r: 0, sx: 1, sy: 0.9 });
});

test('a layer at half strength is half the offsets and half way to its scales', () => {
    const half = scaleLayer({ head: { r: 6, y: 12, sy: 0.5 } }, 0.5);
    assert.deepEqual(half.head, { x: 0, y: 6, r: 3, sx: 1, sy: 0.75 });
    assert.deepEqual(scaleLayer({ head: { r: 6 } }, 0).head, { x: 0, y: 0, r: 0, sx: 1, sy: 1 });
});

test('no arm passes the cap, whatever the layers add up to', () => {
    assert.equal(arm.idleDeg, 12);
    assert.equal(arm.maxDeg, 62, 'a gesture may lift an arm to the kit\'s own pointing angle');
    const t = clampArms(blend([{ armL: { r: 9 }, armR: { r: -9 } }, { armL: { r: 10 }, armR: { r: -10 } }]), arm.idleDeg);
    assert.equal(t.armL.r, 12);
    assert.equal(t.armR.r, -12);
    const big = clampArms(blend([{ armR: { r: -80 } }]));
    assert.equal(big.armR.r, -62);
});

test('a transform turns and moves a part about its own pivot', () => {
    assert.equal(transformAttr([606, 720], { x: 0, y: 0, r: 0, sx: 1, sy: 1 }), 'translate(606 720) rotate(0) scale(1 1) translate(-606 -720)');
    assert.equal(transformAttr([606, 720], { x: 3, y: -4, r: 2.5, sx: 1, sy: 1.015 }), 'translate(609 716) rotate(2.5) scale(1 1.015) translate(-606 -720)');
});

test('the walk alternates its legs, lifts them up to 34px, and keeps the arms inside the cap', () => {
    let maxLift = 0;
    for (let i = 0; i <= 40; i++) {
        const t = walkCycle(i / 40, 1);
        assert.ok(!(t.legL.y < -1 && t.legR.y < -1), `both legs up at ${i / 40}`);
        maxLift = Math.max(maxLift, -t.legL.y, -t.legR.y);
        assert.ok(Math.abs(t.armL.r) <= walk.armDeg && Math.abs(t.armR.r) <= walk.armDeg);
        assert.ok(Math.abs(t.footL.r) <= walk.footDeg + 1e-9);
        assert.ok(-t.root.y <= walk.bob + 1e-9);
    }
    assert.ok(Math.abs(maxLift - walk.legLift) < 0.5, `lift ${maxLift}`);
    // At no speed the cycle is flat: standing still never twitches.
    const still = walkCycle(0.25, 0);
    assert.equal(Math.abs(still.legL.y), 0);
    assert.equal(Math.abs(still.root.y), 0);
});

test('breathing stays within its bounds', () => {
    for (let i = 0; i <= 20; i++) {
        const t = breathe(i / 20);
        assert.ok(Math.abs(t.torso.sy - 1) <= breathing.torsoScale + 1e-9);
        assert.ok(Math.abs(t.head.y) <= breathing.headY + 1e-9);
        assert.ok(Math.abs(t.armL.r) <= breathing.armDeg + 1e-9);
    }
});

test('a blink closes the eyes to 6% in the middle and opens them again', () => {
    assert.equal(blinkCurve(0), 1);
    assert.ok(Math.abs(blinkCurve(0.5) - blink.closed) < 1e-9);
    assert.ok(Math.abs(blinkCurve(1) - 1) < 1e-9);
    assert.equal(blink.durationMs, 140);
});

test('the container spring settles on its target, and cruises under the speed cap on a long walk', () => {
    assert.deepEqual(walk.spring, { stiffness: 120, damping: 18 });
    const s = { x: 0, v: 0 };
    let peak = 0;
    for (let i = 0; i < 300; i++) {
        springStep(s, 1200, 1 / 60, { ...walk.spring, maxSpeed: walk.maxSpeed });
        peak = Math.max(peak, Math.abs(s.v));
    }
    assert.ok(Math.abs(s.x - 1200) < 0.5, `settled at ${s.x}`);
    assert.ok(peak <= walk.maxSpeed + 1e-6, `peaked at ${peak}`);
    assert.ok(peak > walk.maxSpeed * 0.95, 'it did reach cruising speed');
    // A short hop never needs the cap.
    const short = { x: 0, v: 0 };
    let shortPeak = 0;
    for (let i = 0; i < 120; i++) {
        springStep(short, 60, 1 / 60, { ...walk.spring, maxSpeed: walk.maxSpeed });
        shortPeak = Math.max(shortPeak, Math.abs(short.v));
    }
    assert.ok(shortPeak < walk.maxSpeed);
    assert.ok(Math.abs(short.x - 60) < 0.5);
});

test('the head shake is three swings inside six degrees; the landing squash goes .96 → 1.02 → 1', () => {
    let crossings = 0;
    let prev = 0;
    for (let i = 1; i <= 90; i++) {
        const r = CLIPS.shake(i / 90).head.r;
        assert.ok(Math.abs(r) <= config.shake.deg + 1e-9);
        if (Math.sign(r) !== Math.sign(prev) && prev !== 0) crossings += 1;
        prev = r;
    }
    assert.ok(crossings >= 5, `${crossings} crossings`);
    assert.equal(CLIP_MS.shake, config.shake.ms);
    const low = Math.min(...Array.from({ length: 41 }, (_, i) => CLIPS.squash(i / 40).torso.sy));
    const high = Math.max(...Array.from({ length: 41 }, (_, i) => CLIPS.squash(i / 40).torso.sy));
    assert.ok(Math.abs(low - walk.squash.down) < 0.005 && Math.abs(high - walk.squash.up) < 0.005, `${low}..${high}`);
    assert.ok(Math.abs(CLIPS.squash(1).torso.sy - 1) < 1e-9);
});

test('every clip has a length, and the pop easing overshoots on its way in', () => {
    for (const name of Object.keys(CLIPS)) assert.ok(CLIP_MS[name] > 0, name);
    assert.ok(easeOutBack(0.6) > 1 && Math.abs(easeOutBack(1) - 1) < 1e-9);
});

// ---------- gestures ----------

const { pointFrame, waveFrame, celebrateFrame, clapFrame, GESTURE_MS, swayLayer } = await import('../../src/mascot/rigDriver.js');
const { pointing: P, variants: V, sway: S } = await import('../../src/mascot/mascotConfig.js');

const rest = (frame) => Object.values(frame.layer).every((t) => Math.abs(t.r || 0) < 1e-6 && Math.abs(t.x || 0) < 1e-6 && Math.abs(t.y || 0) < 1e-6);

test('pointing is staged like a person: head, then shoulders, then arm, then wrist, then finger — and holds, then lowers in reverse', () => {
    const at = (ms) => pointFrame(ms, { elev: 0 });
    const first = (pick) => {
        for (let ms = 0; ms <= P.upMs; ms += 10) if (pick(at(ms)) > 0.02) return ms;
        return Infinity;
    };
    const head = first((f) => Math.abs(f.layer.head.r));
    const shoulders = first((f) => Math.abs(f.layer.torso.r));
    const arm = first((f) => Math.abs(f.layer.armR.r));
    const wrist = first((f) => Math.abs(f.layer.handRPoint.r));
    const finger = first((f) => f.finger.R);
    assert.ok(head < shoulders && shoulders < arm && arm < wrist && wrist < finger, `order ${[head, shoulders, arm, wrist, finger]}`);
    // Up: the arm at the kit's own pointing angle, the finger fully out and level.
    const up = at(P.upMs + 10);
    assert.ok(Math.abs(up.layer.armR.r + P.armDeg) < 0.5, `arm at ${up.layer.armR.r}`);
    assert.ok(Math.abs(up.layer.armR.r + up.layer.handRPoint.r - P.fingerDeg) < 0.5, 'the finger points straight out');
    assert.equal(up.finger.R, 1);
    assert.equal(up.done, false);
    // The hold keeps it there.
    const held = at(P.upMs + P.holdMs - 10);
    assert.ok(Math.abs(held.layer.armR.r - up.layer.armR.r) < 1e-6);
    // Lowering: the finger goes first, the head last, and it ends at rest.
    const lowering = at(P.upMs + P.holdMs + P.lowerMs * 0.35);
    assert.ok(lowering.finger.R < 0.05, 'finger back to a fist early');
    assert.ok(Math.abs(lowering.layer.head.r) > 0.5, 'the head still turned');
    const end = at(P.upMs + P.holdMs + P.lowerMs + 1);
    assert.ok(rest(end) && end.finger.R === 0 && end.done, 'back to rest, done');
    // A target above lifts the arm further and tips the finger up; below, the reverse.
    assert.ok(pointFrame(P.upMs, { elev: 1 }).layer.armR.r < pointFrame(P.upMs, { elev: -1 }).layer.armR.r);
    assert.equal(GESTURE_MS.point, P.upMs + P.holdMs + P.lowerMs);
});

test('waving raises the left arm and swings the open hand; celebrating lifts both arms and hops; clapping brings them in and beats', () => {
    const mid = waveFrame((V.wave.waveFrom + V.wave.waveTo) / 2);
    assert.ok(Math.abs(mid.layer.armL.r - V.wave.armDeg) < 0.5, 'arm up');
    assert.equal(mid.finger.L, 1, 'the open hand shows');
    assert.equal(mid.finger.R, 0);
    const swings = new Set();
    for (let ms = V.wave.waveFrom; ms <= V.wave.waveTo; ms += 40) swings.add(Math.sign(waveFrame(ms).layer.handLPoint.r + V.wave.armDeg));
    assert.ok(swings.has(1) && swings.has(-1), 'the hand swings both ways');
    assert.ok(rest(waveFrame(GESTURE_MS.wave + 1)) && waveFrame(GESTURE_MS.wave + 1).done);

    const cheer = celebrateFrame(V.celebrate.upMs + 10);
    assert.ok(cheer.layer.armR.r < -50 && cheer.layer.armL.r > 50, 'both arms up');
    let hops = 0;
    let wasUp = false;
    for (let ms = V.celebrate.bounceFrom; ms <= V.celebrate.bounceTo; ms += 20) {
        const up = celebrateFrame(ms).layer.root.y < -V.celebrate.bounce * 0.5;
        if (up && !wasUp) hops += 1;
        wasUp = up;
    }
    assert.equal(hops, V.celebrate.hops);
    assert.ok(rest(celebrateFrame(GESTURE_MS.celebrate + 1)));

    const clapIn = clapFrame(V.clap.inMs + 5);
    assert.ok(clapIn.layer.armR.r > 30 && clapIn.layer.armL.r < -30, 'arms in toward each other');
    let beats = 0;
    let closed = false;
    for (let ms = V.clap.clapFrom; ms <= V.clap.clapTo; ms += 10) {
        const together = clapFrame(ms).layer.handR.r > V.clap.handDeg * 0.9;
        if (together && !closed) beats += 1;
        closed = together;
    }
    assert.equal(beats, V.clap.beats);
    assert.ok(rest(clapFrame(GESTURE_MS.clap + 1)));
});

test('every gesture frame is finite when called the way the driver calls it, with the gesture\'s options', () => {
    const { GESTURES } = { GESTURES: { point: pointFrame, wave: waveFrame, celebrate: celebrateFrame, clap: clapFrame } };
    for (const [name, fn] of Object.entries(GESTURES)) {
        for (const ms of [0, 300, 700, 1200, 2500]) {
            const f = fn(ms, {});
            for (const [part, t] of Object.entries(f.layer)) for (const v of Object.values(t)) assert.ok(Number.isFinite(v), `${name} ${part} at ${ms}ms: ${v}`);
            assert.ok(Number.isFinite(f.finger.R) && Number.isFinite(f.finger.L), `${name} fingers at ${ms}ms`);
        }
        assert.ok(Math.abs(fn(name === 'point' ? 1200 : 700, {}).layer[name === 'clap' ? 'armR' : name === 'wave' ? 'armL' : 'armR'].r) > 20, `${name} lifts an arm`);
    }
});

test('no gesture turns an arm past the cap, and the idle sway stays gentle', () => {
    const { arm } = config;
    for (const [name, fn] of Object.entries({ point: (ms) => pointFrame(ms, { elev: 1 }), wave: waveFrame, celebrate: celebrateFrame, clap: clapFrame })) {
        for (let ms = 0; ms <= GESTURE_MS[name]; ms += 25) {
            const t = clampArms(blend([fn(ms).layer]));
            for (const key of ['armL', 'armR']) if (t[key]) assert.ok(Math.abs(t[key].r) <= arm.maxDeg + 1e-9, `${name} ${key} ${t[key].r}`);
        }
    }
    for (let t = 0; t < 20; t += 0.25) {
        const s = swayLayer(t);
        assert.ok(Math.abs(s.root.r) <= S.deg && Math.abs(s.head.r) <= S.headDeg && Math.abs(s.armR.r) <= S.armDeg);
    }
});
