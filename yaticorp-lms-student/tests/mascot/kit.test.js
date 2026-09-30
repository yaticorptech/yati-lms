/**
 * The mascot kit as the app uses it: the rig is a plain ES module, its idle
 * motions keep the arms within 12° (past that the cut-out arms show their
 * seams — every bigger gesture is a still instead), every asset the code
 * names is on disk, and a graded quiz gets the reaction it earned.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = path.join(ROOT, 'public', 'mascot');

const { default: rig } = await import('../../src/mascot/mascot-rig.js');
const { default: parts } = await import('../../src/mascot/raster-manifest.js');
const { STILLS, stillUrl } = await import('../../src/mascot/stills.js');
const { REACTIONS, quizReaction, longestStreak } = await import('../../src/mascot/reactions.js');

test('the rig is an ES module and leaves no global behind', () => {
    assert.equal(typeof rig.render, 'function');
    assert.ok(rig.poses.includes('breathing'));
    assert.equal(globalThis.MascotRig, undefined);
});

test('no rig pose the app uses swings an arm more than 12°', () => {
    // The corner mascot breathes (the kit's own keyframes); the Career Path
    // mascot is driven by hand from the static idle pose instead, and
    // rigDriver.test.js holds its arms to the same cap.
    for (const motion of ['breathing', 'blink']) {
        const svg = rig.renderAnimated(motion, { prefix: 't' });
        for (const arm of ['armL', 'armR']) {
            const frames = svg.match(new RegExp(`@keyframes t_${arm}\\{(.*?)\\}\\}`))?.[1] ?? '';
            const angles = [...frames.matchAll(/rotate\((-?[\d.]+)deg\)/g)].map((m) => Math.abs(Number(m[1])));
            assert.ok(Math.max(0, ...angles) <= 12, `${motion} turns ${arm} ${Math.max(...angles)}°`);
        }
    }
    for (const pose of ['lookUp', 'lookDown']) {
        const svg = rig.renderStatic(pose);
        const angles = [...svg.matchAll(/id="arm-(?:left|right)"[^>]*rotate\((-?[\d.]+)\)/g)].map((m) => Math.abs(Number(m[1])));
        assert.ok(Math.max(0, ...angles) <= 12, `${pose} turns an arm ${Math.max(...angles)}°`);
    }
});

test('with the original face, the look poses draw nothing over the artwork', () => {
    // The kit's other expressions are drawn on top of the one face the artwork
    // has; the app always asks for that face (MascotStage), and gets pixels.
    rig.setMode('raster');
    rig.setRaster({ base: '/mascot/raster-parts/', parts });
    for (const pose of ['lookUp', 'lookDown']) {
        const own = rig.render(pose, { expression: 'happy', animate: false });
        for (const part of ['eye-left', 'eyebrow-left', 'mouth']) assert.match(own, new RegExp(`data-part="${part}"`), `${pose}: ${part}`);
        assert.doesNotMatch(own, /stroke="#(0E2340|B4303C)"/, `${pose} draws a brow or mouth of its own`);
        assert.match(rig.render(pose, { animate: false }), /stroke="#(0E2340|B4303C)"|fill="#B4303C"/, 'without it, the kit would draw one');
    }
    rig.setMode('auto');
});

test('every rig layer is on disk, and the bundled manifest is the kit\'s own', () => {
    const shipped = JSON.parse(readFileSync(path.join(PUBLIC, 'raster-parts', 'manifest.json'), 'utf8'));
    assert.deepEqual(parts, shipped.parts);
    for (const part of Object.values(parts)) {
        assert.ok(existsSync(path.join(PUBLIC, 'raster-parts', part.file)), `missing raster part ${part.file}`);
    }
});

test('the preload list is every still on disk, no more and no fewer', () => {
    const onDisk = readdirSync(path.join(PUBLIC, 'stills')).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''));
    assert.deepEqual([...STILLS].sort(), onDisk.sort());
    assert.equal(stillUrl('sad'), '/mascot/stills/sad.png');
});

test('every reaction the app uses is a still that exists', () => {
    for (const [moment, name] of Object.entries(REACTIONS)) {
        assert.ok(STILLS.includes(name), `${moment} names "${name}", which is not a still`);
    }
});

test('a graded quiz gets the reaction it earned', () => {
    const right = { isCorrect: true };
    const wrong = { isCorrect: false };
    assert.equal(longestStreak([right, right, wrong, right, right, right, wrong]), 3);
    assert.equal(quizReaction({ passed: false, results: [right, right, right, wrong, wrong] }), 'sad',
        'a failed attempt is not a celebration, whatever its best run');
    assert.equal(quizReaction({ passed: true, results: [right, right, right] }), 'star-celebrate');
    assert.equal(quizReaction({ passed: true, results: [right, wrong, right, right] }), 'cheer-jump');
    assert.equal(quizReaction(undefined), 'sad');
    // A Career Path quiz marks its answers `correct` rather than `isCorrect`.
    assert.equal(quizReaction({ passed: true, results: [{ correct: true }, { correct: true }, { correct: true }] }), 'star-celebrate');
    assert.equal(quizReaction({ passed: true, results: [{ correct: true }, { correct: false }, { correct: true }] }), 'cheer-jump');
});
