/**
 * Young Thinkers group B: Picture Word Hunt, Rhyme Detective, Word Balloon Pop, Fruit Shop, Missing Number Race,
 * Shape Count Dash. Every generated round is valid: one answer, solvable, checked by the same rules the game uses.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const B = await import('../../src/career/data/bands/youngB.js');

const BANDS = ['foundation', 'developing', 'intermediate', null];
const LEVEL_NOS = [1, 10, 16, 20, 30];
const SEEDS = 60;

const each = (fn) => {
  let count = 0;
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const l of LEVEL_NOS) for (let s = 1; s <= SEEDS; s++) {
    fn(band, d, l, seeded(s * 7919 + d * 131 + l * 17), `${band}/d${d}/L${l}/seed ${s}`);
    count++;
  }
  return count;
};

test('picture word hunt: every word hidden once, in allowed directions, found by its two ends', () => {
  const n = each((band, d, l, rng, where) => {
    const cfg = B.huntConfig(band, d, l);
    const level = B.makeHuntLevel(rng, cfg);
    assert.equal(level.length, cfg.puzzles, where);
    for (const p of level) {
      assert.equal(p.grid.length, cfg.size, where);
      assert.equal(p.words.length, cfg.words, where);
      const allowed = cfg.dirs.map((k) => B.HUNT_DIRS[k].join(','));
      const cells = new Set();
      p.words.forEach((w, i) => {
        assert.ok(w.len <= cfg.maxLen && w.len >= 3, where);
        assert.ok(allowed.includes(`${w.dr},${w.dc}`), `${w.word} placed off-direction at ${where}`);
        const path = B.huntCells(w);
        assert.equal(path.map(([r, c]) => p.grid[r][c]).join(''), w.word, where);
        path.forEach(([r, c]) => { const k = `${r},${c}`; assert.ok(!cells.has(k), `shared cell at ${where}`); cells.add(k); });
        assert.equal(B.countInGrid(p.grid, w.word), 1, `${w.word} not unique at ${where}`);
        assert.equal(B.checkHuntPick(p, path[0], path[path.length - 1]), i, where);
        assert.equal(B.checkHuntPick(p, path[path.length - 1], path[0]), i, where);
        assert.equal(B.checkHuntPick(p, path[0], path[0]), -1, where);
        assert.ok(B.PICTURE_WORDS.some((x) => x.word === w.word && x.emoji === w.emoji), where);
      });
      for (const x of B.PICTURE_WORDS) if (!p.words.some((w) => w.word === x.word)) assert.equal(B.countInGrid(p.grid, x.word), 0, `${x.word} appears by accident at ${where}`);
    }
  });
  assert.ok(n >= 3000);
  // Foundation is 4×4 and starts horizontal only; developing is 5×5 or 6×6 with more words.
  assert.equal(B.huntConfig('foundation', 1, 1).size, 4);
  assert.deepEqual(B.huntConfig('foundation', 1, 1).dirs, ['right']);
  assert.ok(B.huntConfig('developing', 3, 30).size === 6 && B.huntConfig('developing', 3, 30).words > B.huntConfig('foundation', 3, 30).words);
});

test('rhyme detective: the answer is exactly the rhyming cards', () => {
  // The bank: no word twice, no emoji twice.
  const words = B.RHYME_WORDS.map((w) => w.word);
  assert.equal(new Set(words).size, words.length);
  assert.equal(new Set(B.RHYME_WORDS.map((w) => w.emoji)).size, words.length);
  each((band, d, l, rng, where) => {
    const cfg = B.rhymeConfig(band, d, l);
    const level = B.makeRhymeLevel(rng, cfg);
    assert.equal(level.length, cfg.rounds, where);
    for (const r of level) {
      assert.equal(new Set(r.cards.map((c) => c.word)).size, r.cards.length, where);
      if (r.mode === 'odd') {
        assert.ok(cfg.odd > 0, where);
        assert.equal(r.cards.length, 4, where);
        const odd = r.cards.filter((c) => r.cards.filter((o) => B.rhymes(c, o)).length === 0);
        assert.deepEqual(odd.map((c) => c.word), r.answer, where);
        assert.ok(B.checkRhyme(r, r.answer), where);
      } else {
        assert.equal(r.cards.length, cfg.cards, where);
        const truly = r.cards.filter((c) => B.rhymes(c, r.target)).map((c) => c.word);
        assert.ok(truly.length >= 1 && truly.length <= cfg.rhymers, where);
        assert.ok(B.checkRhyme(r, truly), where);
        assert.ok(!B.checkRhyme(r, truly.slice(1)), where);
        assert.ok(!r.cards.some((c) => c.word === r.target.word), where);
        if (cfg.spelled) for (const c of r.cards) if (truly.includes(c.word)) assert.equal(c.rime, r.target.rime, where);
        const wrong = r.cards.find((c) => !truly.includes(c.word));
        assert.ok(!B.checkRhyme(r, [...truly, wrong.word]), where);
      }
    }
  });
});

test('word balloon pop: exactly one balloon carries the word, others differ', () => {
  each((band, d, l, rng, where) => {
    const cfg = B.balloonConfig(band, d, l);
    const level = B.makeBalloonLevel(rng, cfg);
    assert.equal(level.length, cfg.rounds, where);
    assert.equal(new Set(level.map((r) => r.word)).size, level.length, where);
    for (const r of level) {
      assert.equal(r.balloons.length, cfg.balloons, where);
      assert.equal(r.balloons.filter((b) => b.correct).length, 1, where);
      assert.equal(r.balloons.filter((b) => b.text === r.word).length, 1, where);
      assert.equal(new Set(r.balloons.map((b) => b.text)).size, r.balloons.length, where);
      assert.deepEqual([...r.balloons.map((b) => b.lane)].sort(), r.balloons.map((_, i) => i), where);
      const right = r.balloons.find((b) => b.correct);
      const delays = r.balloons.map((b) => b.delay);
      assert.ok(right.delay > Math.min(...delays) && right.delay < Math.max(...delays), where);
      assert.ok(r.clue.length > 10 && r.emoji, where);
    }
  });
  assert.ok(B.misspellings('cat').every((w) => w !== 'cat'));
  assert.ok(!B.misspellings('sun').includes('son'));
  assert.ok(B.balloonConfig('developing', 3, 30).riseSec < B.balloonConfig('foundation', 1, 1).riseSec);
});

test('fruit shop: totals and change add up, and the basket checker is exact', () => {
  each((band, d, l, rng, where) => {
    const cfg = B.shopConfig(band, d, l);
    for (const t of B.makeShopLevel(rng, cfg)) {
      const basket = Object.fromEntries(t.list.map((it) => [it.name, it.qty]));
      assert.ok(B.basketMatches(t, basket), where);
      assert.equal(B.basketTotal(t, basket), t.total, where);
      assert.ok(t.total <= cfg.maxTotal, where);
      assert.ok(t.list.every((it) => it.qty >= 1 && it.qty <= cfg.qty), where);
      assert.ok(t.shelf.every((f) => f.price >= cfg.price[0] && f.price <= cfg.price[1]), where);
      const extra = { ...basket, [t.list[0].name]: basket[t.list[0].name] + 1 };
      assert.ok(!B.basketMatches(t, extra), where);
      const other = t.shelf.find((f) => !(f.name in basket));
      if (other) assert.ok(!B.basketMatches(t, { ...basket, [other.name]: 1 }), where);
      if (cfg.change) {
        assert.ok(t.paid > t.total && t.change === t.paid - t.total && t.change > 0, where);
        // The change can always be made from the offered coins.
        let left = t.change;
        for (const c of [...B.changeCoins(t)].sort((a, b) => b - a)) while (left >= c) left -= c;
        assert.equal(left, 0, where);
      } else assert.equal(t.paid, null, where);
    }
  });
});

test('missing number race: one way to fill the blanks, and it is the answer', () => {
  each((band, d, l, rng, where) => {
    const cfg = B.raceConfig(band, d, l);
    for (const r of B.makeRaceLevel(rng, cfg)) {
      assert.equal(r.seq.length, cfg.cars, where);
      assert.equal(r.blanks.length, cfg.blanks, where);
      assert.equal(r.tiles.length, cfg.tiles, where);
      assert.equal(new Set(r.tiles).size, r.tiles.length, where);
      assert.ok(r.seq.every((v) => v >= 0 && Number.isInteger(v)), where);
      assert.deepEqual(r.answers, r.blanks.map((b) => r.seq[b]), where);
      const ways = B.raceCompletions(r);
      assert.equal(ways.length, 1, where);
      assert.deepEqual(ways[0], r.answers, where);
      if (cfg.band === 'foundation') {
        const diffs = r.seq.slice(1).map((v, i) => v - r.seq[i]);
        assert.ok(diffs.every((x) => Math.abs(x) === 1 && x === diffs[0]), where);
      }
    }
  });
});

test('shape count dash: answers match a recount of the picture, shapes stay inside and visible', () => {
  each((band, d, l, rng, where) => {
    const cfg = B.shapeConfig(band, d, l);
    for (const r of B.makeShapeLevel(rng, cfg)) {
      const kinds = new Set(r.shapes.map((s) => s.shape));
      assert.equal(kinds.size, cfg.kinds, where);
      for (const s of r.shapes) {
        assert.ok(s.x - s.r >= 0 && s.x + s.r <= B.SCENE_W && s.y - s.r >= 0 && s.y + s.r <= B.SCENE_H, where);
      }
      for (let i = 0; i < r.shapes.length; i++) for (let j = i + 1; j < r.shapes.length; j++) {
        const a = r.shapes[i];
        const b = r.shapes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        assert.ok(dist >= (cfg.overlap ? 0.75 : 1) * (a.r + b.r) - 1e-9, `too close at ${where}`);
      }
      // Recount by hand.
      const q = r.q;
      let want;
      if (q.kind === 'total') want = r.shapes.length;
      else if (q.kind === 'more') want = r.shapes.filter((s) => s.shape === q.a).length - r.shapes.filter((s) => s.shape === q.b).length;
      else want = r.shapes.filter((s) => (!q.shape || s.shape === q.shape) && (!q.colour || s.colour === q.colour)).length;
      assert.equal(r.answer, want, where);
      assert.ok(r.answer >= 1, where);
      assert.ok(cfg.asks.includes(q.kind), where);
      if (cfg.band === 'foundation') assert.ok(['count', 'total'].includes(q.kind), where);
    }
  });
});
