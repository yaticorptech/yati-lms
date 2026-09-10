/**
 * The mascot bus decides what the character does. It is plain JavaScript with
 * no DOM, so its rules can be checked directly — above all the rule this
 * system exists to enforce: no timer ever changes the mascot's pose.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { addEventListener() {}, removeEventListener() {} };

const { default: mascot, getSnapshot, PRIORITY } = await import('../../src/career/components/mascot/mascotBus.js');
const { REACTIONS, STATES } = await import('../../src/career/components/mascot/mascotStates.js');

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

test('every reaction names a state that exists', () => {
  for (const [key, r] of Object.entries(REACTIONS)) {
    assert.ok(STATES[r.state], `${key} points at an unknown state: ${r.state}`);
  }
});

test('every state names a pose and a body motion', () => {
  for (const [name, s] of Object.entries(STATES)) {
    assert.ok(s.pose, `${name} has no pose`);
    assert.ok(s.body, `${name} has no body motion`);
  }
});

test('no state carries a duration: a pose is never on a clock', () => {
  for (const [name, s] of Object.entries(STATES)) {
    assert.equal(s.ms, undefined, `${name} still has a lifetime`);
  }
});

test('each application event maps to the pose it should', () => {
  const expected = {
    greeting: 'welcome',
    taskCompleted: 'taskdone',
    quizPassed: 'clear',
    quizFailed: 'nexttry',
    levelUp: 'levelup',
    streakKept: 'streak',
    streakBroken: 'nexttry',
    examTomorrow: 'focus',
    noRoadmap: 'confused',
    noTasks: 'ponder'
  };
  for (const [event, pose] of Object.entries(expected)) {
    const r = REACTIONS[event];
    assert.ok(r, `${event} is missing`);
    assert.equal(STATES[r.state].pose, pose, `${event} should show ${pose}`);
  }
});

test('a reaction shows the character and carries its own words', () => {
  mascot.rest();
  mascot.react('taskCompleted');
  const s = getSnapshot();
  assert.equal(s.visible, true);
  assert.equal(s.state, 'taskDone');
  assert.equal(s.pose, 'taskdone');
  assert.match(s.message, /Task done/);
});

test('when the words expire the pose stays exactly where it was', async () => {
  mascot.rest();
  mascot.react('levelUp', { ms: 50 });
  const held = getSnapshot();
  assert.equal(held.pose, 'levelup');

  await settle(120);
  const after = getSnapshot();
  assert.equal(after.message, null, 'the words should have gone');
  assert.equal(after.state, 'levelUp', 'the state changed on a timer');
  assert.equal(after.pose, 'levelup', 'the pose changed on a timer');
});

test('only an explicit rest returns it to idle', () => {
  mascot.react('quizPassed');
  assert.equal(getSnapshot().state, 'quizPassed');
  mascot.rest();
  assert.equal(getSnapshot().state, 'idle');
});

test('an ambient nudge cannot shove a celebration off the stage', () => {
  mascot.rest();
  mascot.react('levelUp');
  mascot.setState('idle', { priority: PRIORITY.ambient });
  assert.equal(getSnapshot().pose, 'levelup', 'the celebration was interrupted');
});

test('an urgent word does get through', () => {
  mascot.rest();
  mascot.react('levelUp');
  mascot.say('Careful', { priority: PRIORITY.urgent });
  assert.equal(getSnapshot().message, 'Careful');
});

test('the retired line is held while its bubble leaves, then dropped', async () => {
  mascot.rest();
  mascot.say('Almost there', { ms: 40 });
  assert.equal(getSnapshot().message, 'Almost there');
  await settle(90);
  const s = getSnapshot();
  assert.equal(s.message, null, 'still speaking');
  assert.equal(s.lastMessage, 'Almost there', 'the words vanished mid-sentence');
  await settle(400);
  assert.equal(getSnapshot().lastMessage, null, 'the fade never ended');
});

test('goTo sends it to an anchor without inventing a state', () => {
  mascot.rest();
  mascot.goTo('build-roadmap', { message: 'Start here' });
  const s = getSnapshot();
  assert.equal(s.anchor, 'build-roadmap');
  assert.equal(s.state, 'pointing');
  mascot.rest();
});

test('leaving hides it and clears what it was saying', () => {
  mascot.react('newBadge');
  mascot.leave();
  const s = getSnapshot();
  assert.equal(s.visible, false);
  assert.equal(s.message, null);
});

/* ---- The rule that decides whether the mascot is on screen at all ------ */

const { autoMode } = await import('../../src/career/components/mascot/mascotBus.js');

test('a page that declares a slot brings the mascot on stage', () => {
  assert.equal(autoMode({ mode: 'hidden', busy: false, hasSlot: true, overlay: false }), 'dock');
});

test('a page with no slot sends it away again', () => {
  assert.equal(autoMode({ mode: 'docked', busy: false, hasSlot: false, overlay: false }), 'hide');
});

test('neither happens while it is busy guiding someone', () => {
  assert.equal(autoMode({ mode: 'hidden', busy: true, hasSlot: true, overlay: false }), null);
  assert.equal(autoMode({ mode: 'docked', busy: true, hasSlot: false, overlay: false }), null);
});

test('a modal freezes the decision rather than yanking it about', () => {
  assert.equal(autoMode({ mode: 'hidden', busy: false, hasSlot: true, overlay: true }), null);
  assert.equal(autoMode({ mode: 'docked', busy: false, hasSlot: false, overlay: true }), null);
});

test('it settles: once docked with a slot, nothing more happens', () => {
  assert.equal(autoMode({ mode: 'docked', busy: false, hasSlot: true, overlay: false }), null);
  assert.equal(autoMode({ mode: 'hidden', busy: false, hasSlot: false, overlay: false }), null);
});

test('an active mascot is never auto-docked out of what it is doing', () => {
  assert.equal(autoMode({ mode: 'active', busy: false, hasSlot: true, overlay: false }), null);
});
