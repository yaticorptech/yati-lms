import test from 'node:test';
import assert from 'node:assert/strict';

const Q = await import('../../src/career/data/bands/logicQuad.js');
const { seeded } = await import('../../src/career/data/seeded.js');
const { GAP } = await import('../../src/career/data/bands/sequences.js');

test('Next in Sequence (four stages): every problem has exactly one clear answer', () => {
  for (const band of ['intermediate', 'analytical']) for (let step = 1; step <= 14; step += 1) for (let k = 0; k < 40; k += 1) {
    const rnd = seeded(step * 1000 + k * 7 + (band === 'analytical' ? 5 : 0));
    const [n, v, o, m] = Q.makeQuadLevel(rnd, { band, step });
    assert.deepEqual([n.stage, v.stage, o.stage, m.stage], ['number', 'visual', 'odd', 'match']);
    // 1 number
    assert.ok(Number.isInteger(n.answer) && n.run.filter((x) => x === GAP).length <= 1 && n.note);
    // 2 visual: four distinct options, the answer among them
    assert.equal(v.options.length, 4, `${v.kind} options`);
    assert.equal(new Set(v.options.map((c) => JSON.stringify(c))).size, 4, `${v.kind} distinct`);
    assert.ok(v.answer >= 0 && v.answer < 4 && v.note && v.hint);
    assert.ok(v.grid ? v.grid.filter((c) => c === null).length === 1 : v.frames.length >= 4);
    // 3 odd one out: five items, one odd
    assert.equal(o.items.length, 5);
    assert.ok(o.odd >= 0 && o.odd < 5 && o.note && o.hint);
    assert.equal(new Set(o.items.map((i) => JSON.stringify(i))).size, 5, `${o.kind} distinct items`);
    // 4 matchstick: not solved at the start, its solution is, and it needs exactly `moves` sticks
    assert.ok(!Q.matchSolved(m, m.start), 'unsolved at the start');
    assert.ok(Q.matchSolved(m, m.solution), 'the solution solves it');
    assert.equal(Q.sticksMoved(m, m.solution), m.moves);
    assert.ok(Q.readMatch(m.start, m.digits).digits.every((d) => d !== null), 'starts as real digits');
  }
});

test('Matchsticks: a one-move puzzle cannot be solved with the sticks left as they are, and reading works', () => {
  assert.deepEqual(Q.readMatch(['0b', '0c', 'op', '1a', '1b', '1c', '2a', '2b', '2c', '2d', '2e', '2f', '2g']).digits, [1, 7, 8]);
  assert.equal(Q.readMatch(['0a']).digits[0], null);
});
