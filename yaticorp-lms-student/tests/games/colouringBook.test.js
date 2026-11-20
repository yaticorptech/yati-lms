/** Colouring Book (2026-11-16): every part has a known colour and a number spot; every level has pictures that fit. */
import test from 'node:test';
import assert from 'node:assert/strict';

const cb = await import('../../src/career/data/bands/colouringBook.js');

test('every picture part has a known colour and a number spot inside the page', () => {
  for (const p of [...cb.PICTURES, ...cb.SCENES]) {
    assert.ok(p.parts.length >= 2, p.name);
    for (const part of p.parts) {
      assert.ok(cb.COLOURS[part.c], `${p.name}: unknown colour ${part.c}`);
      assert.ok(part.at.every((v) => v >= 0 && v <= 100), `${p.name}: number spot off the page`);
      assert.match(part.d, /^M/, `${p.name}: bad path`);
    }
  }
});

test('every level of both bands has enough pictures, and the crayons include every colour needed', () => {
  for (const band of ['foundation', 'developing']) {
    for (let level = 1; level <= 30; level += 1) {
      const cfg = cb.bookConfig(band, level);
      assert.ok(cb.poolFor(cfg).length >= cfg.puzzles, `${band} level ${level}`);
      const pic = cb.pickPicture(cfg);
      const crayons = cb.paletteFor(pic, cfg.extraColours);
      for (const k of cb.coloursOf(pic)) assert.ok(crayons.includes(k), `${pic.name} is missing ${k}`);
      assert.ok(crayons.length <= 8, `${pic.name}: ${crayons.length} crayons, more than 2 rows of 4`);
    }
  }
  assert.equal(cb.bookConfig('foundation', 1).mode, 'remember');
  assert.equal(cb.bookConfig('foundation', 1).showMs, 7000);
  assert.ok(cb.pickPicture(cb.bookConfig('foundation', 12)).parts.length >= 10, 'later levels: bigger scenes');
});
