/**
 * Logic Detective and Cipher Challenge (2026-11-13): every generated mystery has exactly one solution, and every
 * cipher round decodes back to its message with the true key.
 *
 * The mystery check is a separate brute force from the generator's own bitsets: every assignment is enumerated
 * afresh here and every clue's test run on it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../../src/career/data/bands/detective.js');
const C = await import('../../src/career/data/bands/cipher.js');

const perms = (n) => (n === 1 ? [[0]] : perms(n - 1).flatMap((r) => [...Array(n).keys()].map((i) => [...r.slice(0, i), n - 1, ...r.slice(i)])));
const inv = (perm) => { const o = []; perm.forEach((v, p) => { o[v] = p; }); return o; };
const assignments = (n, k) => {
  let list = [[]];
  for (let c = 0; c < k; c++) list = list.flatMap((pre) => perms(n).map((p) => [...pre, p]));
  return list.map((v) => ({ v, inv: v.map(inv) }));
};
const cache = new Map();
const solutionsOf = (m) => {
  const key = `${m.n}x${m.k}`;
  if (!cache.has(key)) cache.set(key, assignments(m.n, m.k));
  return cache.get(key).filter((a) => m.clues.every((c) => c.test(a)));
};

const CASES = {
  intermediate: [[1, 1], [1, 20], [2, 5], [2, 25]],
  analytical: [[1, 10], [2, 20], [3, 5], [3, 28]],
  advanced: [[2, 5], [2, 25], [3, 5], [3, 20]]
};
const SEEDS = { intermediate: 3000, analytical: 3000, advanced: 2000 };

for (const [band, cases] of Object.entries(CASES)) {
  test(`detective (${band}): every mystery has exactly one solution, the one it was built from`, () => {
    for (let s = 0; s < SEEDS[band]; s++) {
      const [difficulty, levelNo] = cases[s % cases.length];
      const cfg = D.detectiveConfig(band, difficulty, levelNo);
      const m = D.makeMystery(cfg, s * 7919 + 13);
      const sols = solutionsOf(m);
      assert.equal(sols.length, 1, `${band} seed ${s}: ${sols.length} solutions`);
      assert.deepEqual(sols[0].v, m.solution, `${band} seed ${s}: solved to something else`);
      assert.equal(D.countSolutions(m), 1);
      if (cfg.require) assert.ok(m.clues.some((c) => cfg.require.includes(c.kind)), `${band} seed ${s}: no conditional clue`);
      if (band === 'intermediate') assert.ok(m.clues.every((c) => c.kind === 'direct' || c.kind === 'negative'));
      if (s % 50 === 0) {
        // Minimal: drop any clue and it is no longer unique.
        for (const c of m.clues) {
          assert.ok(D.countSolutions({ ...m, clues: m.clues.filter((x) => x !== c) }) > 1, `${band} seed ${s}: "${c.text}" is redundant`);
        }
      }
    }
  });
}

test('detective: the right grid solves the case, a wrong one names a broken clue', () => {
  for (let s = 0; s < 300; s++) {
    const m = D.makeMystery(D.detectiveConfig(['intermediate', 'analytical', 'advanced'][s % 3], 1 + (s % 3), 1 + (s % 30)), s);
    assert.equal(D.checkGuess(m, m.solution).solved, true);
    const wrong = m.solution.map((p) => [...p]);
    [wrong[0][0], wrong[0][1]] = [wrong[0][1], wrong[0][0]];
    const r = D.checkGuess(m, wrong);
    assert.equal(r.solved, false);
    assert.ok(r.violated.length >= 1, `seed ${s}: a wrong grid broke no clue`);
  }
});

test('detective: tapping cycles empty, cross, tick, and a tick crosses its row and column', () => {
  let marks = {};
  marks = D.tapCell(marks, 3, 0, 0, 0);
  assert.equal(D.cellState(marks, 3, 0, 0, 0), 'no');
  marks = D.tapCell(marks, 3, 0, 0, 0);
  assert.equal(D.cellState(marks, 3, 0, 0, 0), 'yes');
  assert.equal(D.cellState(marks, 3, 0, 0, 1), 'auto');
  assert.equal(D.cellState(marks, 3, 0, 1, 0), 'auto');
  marks = D.tapCell(marks, 3, 0, 0, 0);
  assert.equal(D.cellState(marks, 3, 0, 0, 0), '');
  assert.equal(D.cellState(marks, 3, 0, 0, 1), '');
});

test('detective stars: three for a clean fast solve, one star off per wrong accusation or slow finish', () => {
  assert.equal(D.detectiveStars({ solved: true }), 3);
  assert.equal(D.detectiveStars({ solved: true, wrong: 1 }), 2);
  assert.equal(D.detectiveStars({ solved: true, wrong: 2, usedFrac: 0.9 }), 1);
  assert.equal(D.detectiveStars({ solved: false }), 0);
});

for (const band of Object.keys(C.TYPES)) {
  test(`cipher (${band}): every round decodes to its message with the true key, and not before`, () => {
    const seen = new Set();
    for (let s = 0; s < 3000; s++) {
      const difficulty = 1 + (s % 3), levelNo = 1 + (s % 30);
      const r = C.makeCipherRound(band, difficulty, levelNo, s * 104729 + 7);
      seen.add(r.type);
      assert.ok(C.TYPES[band].includes(r.type));
      assert.equal(C.decodeWith(r, C.trueState(r)), r.plaintext, `${band} ${r.type} seed ${s}`);
      assert.notEqual(C.decodeWith(r, C.startState(r)), r.plaintext, `${band} ${r.type} seed ${s}: solved at the start`);
      assert.match(r.plaintext, /^[A-Z ]+$/);
      // The letters tokens stand for really are the message's letters, and given letters are true.
      for (const t of r.tokens) if (t.raw === undefined) assert.equal(C.decodeToken(r, t, C.trueState(r)), t.plain);
      for (const [tok, ch] of Object.entries(r.given || {})) assert.equal(r.key[tok], ch);
      if (r.kind === 'map') {
        // One token per letter and one letter per token: the key can be read back.
        assert.equal(new Set(Object.values(r.key)).size, Object.keys(r.key).length);
        assert.equal(C.isComplete(r, C.trueState(r)), true);
      }
    }
    assert.deepEqual([...seen].sort(), [...C.TYPES[band]].sort(), `${band}: not every cipher type came up`);
  });
}

test('cipher: a Caesar round decodes only at its own shift', () => {
  for (let s = 0; s < 500; s++) {
    const r = C.makeCipherRound('analytical', 2, 2, s);
    if (r.kind !== 'shift') continue;
    const hits = [...Array(26).keys()].filter((shift) => C.decodeWith(r, { shift }) === r.plaintext);
    assert.deepEqual(hits, [r.key.shift]);
  }
});

test('cipher: every message is clean, school-safe capitals and long enough for its band', () => {
  for (const [kind, list] of Object.entries(C.MESSAGES)) {
    for (const m of list) {
      assert.match(m, /^[A-Z]+( [A-Z]+)*$/, m);
      const letters = m.replace(/ /g, '').length;
      if (kind === 'long') assert.ok(letters >= 30, `${m} is short for frequency work`);
      if (kind === 'short') assert.ok(letters <= 20, `${m} is long for Classes 6–8`);
    }
  }
});
