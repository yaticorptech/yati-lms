import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const J = await import('../../src/career/data/bands/jigsaw.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Jigsaw: neighbouring pieces fit (a tab meets a hole), edges are flat, every picture exists', () => {
  for (const n of [3, 4, 5, 6]) {
    const cut = J.makeCut(seeded(n * 7), n);
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
      const k = J.sidesOf(cut, n, r, c);
      if (r === 0) assert.equal(k.top, 0); if (c === 0) assert.equal(k.left, 0);
      if (r === n - 1) assert.equal(k.bottom, 0); if (c === n - 1) assert.equal(k.right, 0);
      if (c < n - 1) assert.equal(k.right, -J.sidesOf(cut, n, r, c + 1).left, 'side by side');
      if (r < n - 1) assert.equal(k.bottom, -J.sidesOf(cut, n, r + 1, c).top, 'one above the other');
      assert.match(J.piecePath(cut, n, r, c, 100), /^M[\d.]+ [\d.]+ .* Z$/);
    }
  }
  for (const p of J.PICTURES) assert.ok(existsSync(new URL(`../../public/${p}`, import.meta.url)), p);
  for (const d of [1, 2, 3]) for (const lv of [1, 10, 30]) {
    const cfg = J.jigsawConfig(d, lv);
    const level = J.makeJigsaw(seeded(lv), cfg);
    assert.equal(level.order.length, cfg.n * cfg.n);
  }
});
