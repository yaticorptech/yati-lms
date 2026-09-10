/**
 * The contract with the Rive file, checked in code.
 *
 * The rigger builds fourteen clips and four inputs; the application maps
 * thirty-six product states onto those clips. If either side drifts, the
 * mascot silently plays the wrong animation. These tests fail the build
 * instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { STATES } = await import('../../src/career/components/mascot/mascotStates.js');
const { CLIPS, CLIP_INDEX, INPUTS, CANONICAL, STATE_MACHINE } =
  await import('../../src/career/components/mascot/riveConfig.js');

test('every product state names a clip the rig will contain', () => {
  for (const [name, s] of Object.entries(STATES)) {
    assert.ok(s.clip, `${name} has no clip`);
    assert.ok(CLIPS.includes(s.clip), `${name} asks for "${s.clip}", which the rig does not have`);
  }
});

test('every clip has a stable numeric index', () => {
  CLIPS.forEach((clip, i) => {
    assert.equal(CLIP_INDEX[clip], i, `${clip} moved index, which would repoint every state`);
  });
});

test('the eight animations to prove first are all reachable', () => {
  const required = ['idle', 'walk', 'point', 'wave', 'celebrate', 'think', 'talk'];
  for (const clip of required) assert.ok(CLIPS.includes(clip), `${clip} missing from the rig contract`);
  // Blink is a trigger on its own layer, not a body clip.
  assert.ok(INPUTS.blink, 'no blink input declared');
});

test('the state machine exposes exactly the inputs the renderer sets', () => {
  assert.deepEqual(Object.keys(INPUTS).sort(), ['blink', 'faceLeft', 'look', 'speed', 'state', 'talking']);
  assert.equal(STATE_MACHINE, 'MascotSM');
});

test('the rig is told how fast the body is moving and where it is looking', () => {
  // Without these two the legs slide and the head never turns, which is the
  // difference between a character and a clip being played.
  assert.equal(INPUTS.speed, 'speed');
  assert.equal(INPUTS.look, 'look');
});

test('the canonical canvas is the identity guarantee and must not drift', () => {
  assert.equal(CANONICAL.width, 470);
  assert.equal(CANONICAL.height, 590);
  assert.equal(CANONICAL.ratio, 470 / 590);
});

test('every state keeps its PNG fallback, so the mascot cannot break', () => {
  for (const [name, s] of Object.entries(STATES)) {
    assert.ok(s.pose, `${name} lost its PNG pose`);
    assert.ok(s.body, `${name} lost its PNG motion`);
  }
});
