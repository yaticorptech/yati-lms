/** Audio Echo (2026-11-16, listening missions): every mission is fair and scored the right way. */
import test from 'node:test';
import assert from 'node:assert/strict';

const ae = await import('../../src/career/data/bands/audioEcho.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('missions are fair at every level', () => {
  for (const band of ['intermediate', 'analytical']) {
    for (let level = 1; level <= 30; level += 1) {
      const cfg = ae.echoConfig(band, 1, level);
      const ms = ae.makeEchoLevel(seeded(level * 3 + band.length), cfg);
      assert.equal(ms.length, cfg.rounds);
      assert.deepEqual(new Set(ms.map((m) => m.kind)), new Set(['count', 'spot', 'words']));
      for (const m of ms) {
        if (m.kind === 'words') {
          assert.equal(m.heard.length, cfg.words);
          assert.ok(m.heard.every((w) => m.tiles.includes(w)));
          assert.equal(new Set(m.tiles).size, m.tiles.length);
          assert.ok(m.tiles.length > m.heard.length);
          assert.equal(m.fallback.kind, 'count');
          continue;
        }
        assert.ok(m.seq.every((k) => cfg.sounds.includes(k)));
        assert.equal(m.seq[0] === m.target, false, 'never on the very first beat');
        assert.equal(m.seq.filter((k) => k === m.target).length, m.answer);
        if (m.kind === 'count') {
          assert.ok(m.options.includes(m.answer));
          assert.equal(new Set(m.options).size, m.options.length);
        }
      }
    }
  }
});

test('spot and words scoring', () => {
  const seq = ['drum', 'bell', 'piano', 'bell'];
  // Onsets of the bell at 100 and 300 (gap 100, lead 0).
  assert.deepEqual(ae.scoreSpot(seq, 'bell', 100, [130, 320]), { hits: 2, targets: 2, falseTaps: 0 });
  assert.deepEqual(ae.scoreSpot(seq, 'bell', 100, [20, 130]), { hits: 1, targets: 2, falseTaps: 1 });
  assert.ok(ae.scoreWords(['kite', 'clock'], ['clock', 'kite']));
  assert.ok(!ae.scoreWords(['kite', 'clock'], ['kite']));
  assert.ok(!ae.scoreWords(['kite'], ['kite', 'clock']));
});

test('sound categories: every level plays known sounds, and harder levels mix or confuse them', () => {
  const keys = new Set(ae.SOUNDS.map((s) => s.key));
  const engine = new Set((await_engine_keys()));
  for (let level = 1; level <= 40; level += 1) {
    const cfg = ae.echoConfig('intermediate', 1, level);
    assert.ok(ae.CATEGORIES[cfg.category], cfg.category);
    cfg.sounds.forEach((k) => { assert.ok(keys.has(k), k); assert.ok(engine.has(k), `${k} has no synthesised sound`); });
  }
  assert.equal(ae.echoConfig('intermediate', 1, 1).category, 'instruments');
  assert.equal(ae.echoConfig('intermediate', 1, 40).category, 'tricky');
});

// The engine's sound names, read from its source (it needs a browser to run).
import { readFileSync } from 'node:fs';
function await_engine_keys() {
  const src = readFileSync(new URL('../../src/career/components/games/audioEchoEngine.js', import.meta.url), 'utf8');
  return [...src.matchAll(/^ {4}([a-z]+): \(t\) => \{/gm)].map((m) => m[1]);
}
