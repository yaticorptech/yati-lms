/**
 * Slot choice decides where the one mascot docks. It has to be deterministic,
 * or the character oscillates between two equally good places, and it has to
 * ignore anything that has scrolled away or been removed by a re-render.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { innerWidth: 1200, innerHeight: 800 };

const { registerSlot, unregisterSlot, chooseSlot, resetSlots, slotCount, slotsVersion } =
  await import('../../src/career/components/mascot/mascotSlots.js');

/** A stand-in for the empty box a MascotSlot renders. */
const box = ({ top, height = 100, left = 100, width = 100, connected = true }) => ({
  isConnected: connected,
  getBoundingClientRect: () => ({ top, bottom: top + height, left, right: left + width, width, height })
});

test('no slots means the corner', () => {
  resetSlots();
  assert.equal(chooseSlot(), null);
});

test('a slot whose element left the document is never chosen', () => {
  resetSlots();
  registerSlot('a', { name: 'gone', el: box({ top: 300, connected: false }) });
  assert.equal(chooseSlot(), null, 'docked into a detached node');
});

test('a slot scrolled off screen is never chosen', () => {
  resetSlots();
  registerSlot('a', { name: 'above', el: box({ top: -400 }) });
  registerSlot('b', { name: 'below', el: box({ top: 2000 }) });
  assert.equal(chooseSlot(), null);
});

test('a named preference wins over everything else', () => {
  resetSlots();
  registerSlot('a', { name: 'hero', el: box({ top: 380 }), priority: 90 });
  registerSlot('b', { name: 'sidebar', el: box({ top: 100 }), priority: 5 });
  assert.equal(chooseSlot('sidebar').slot.name, 'sidebar');
});

test('otherwise the highest priority wins', () => {
  resetSlots();
  registerSlot('a', { name: 'sidebar', el: box({ top: 380 }), priority: 5 });
  registerSlot('b', { name: 'celebration', el: box({ top: 700 }), priority: 90 });
  assert.equal(chooseSlot().slot.name, 'celebration');
});

test('equal priority breaks on nearness to the middle of the screen', () => {
  resetSlots();
  registerSlot('a', { name: 'far', el: box({ top: 20 }), priority: 20 });
  registerSlot('b', { name: 'near', el: box({ top: 350 }), priority: 20 });
  assert.equal(chooseSlot().slot.name, 'near');
});

test('a dead heat breaks on declaration order, so it cannot oscillate', () => {
  resetSlots();
  registerSlot('a', { name: 'first', el: box({ top: 350 }), priority: 20 });
  registerSlot('b', { name: 'second', el: box({ top: 350 }), priority: 20 });
  assert.equal(chooseSlot().slot.name, 'first');
  assert.equal(chooseSlot().slot.name, 'first', 'the choice changed between calls');
});

test('unregistering removes it and bumps the version the view watches', () => {
  resetSlots();
  const drop = registerSlot('a', { name: 'hero', el: box({ top: 350 }) });
  const before = slotsVersion();
  assert.equal(slotCount(), 1);
  drop();
  assert.equal(slotCount(), 0);
  assert.ok(slotsVersion() > before, 'the view was never told');
  assert.equal(chooseSlot(), null);
});

test('a preferred name that is not on screen falls back rather than failing', () => {
  resetSlots();
  registerSlot('a', { name: 'hero', el: box({ top: 350 }), priority: 20 });
  unregisterSlot('missing');
  assert.equal(chooseSlot('not-here').slot.name, 'hero');
});
