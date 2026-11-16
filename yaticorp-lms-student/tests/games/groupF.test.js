/**
 * Group F (Master Minds): Spatial Rotation Vault, Interference Recall, Cipher Lab, Boolean Breaker.
 * Every generated round is valid: one right answer, solvable, checkers accept the solution and reject wrong ones,
 * and content grows with difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const rot = await import('../../src/career/data/bands/fRotation.js');
const inter = await import('../../src/career/data/bands/fInterference.js');
const cl = await import('../../src/career/data/bands/fCipherLab.js');
const bb = await import('../../src/career/data/bands/fBoolean.js');
const coach = await import('../../src/career/components/games/coach/f.js');

const BANDS = ['advanced', 'analytical', null];
const LEVEL_NOS = [1, 10, 20, 30];
const SEEDS = 40;
const each = (fn) => {
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const L of LEVEL_NOS) for (let s = 1; s <= SEEDS; s++) fn(band, d, L, seeded(s * 7919 + d * 131 + L), `${band}/d${d}/L${L}/s${s}`);
};

test('Spatial Rotation Vault: one true turn, decoys are never turns, marks follow the rotation', () => {
  let n = 0;
  each((band, d, L, rng, where) => {
    const cfg = rot.rotationConfig(band, d, L);
    for (const r of rot.makeRotationLevel(rng, cfg)) {
      n++;
      assert.equal(r.base.length, cfg.cells, where);
      assert.ok(rot.isConnected(r.base), where);
      assert.ok(rot.isAsymmetric(r.base), where);
      assert.equal(r.base.filter((c) => c[2]).length, cfg.marks, where);
      assert.equal(r.options.length, cfg.options, where);
      const right = r.options.filter((o) => rot.isRotationOf(r.base, o.cells));
      assert.equal(right.length, 1, `exactly one rotation at ${where}`);
      assert.ok(right[0].right, where);
      assert.notEqual(rot.shapeKey(right[0].cells), rot.shapeKey(r.base), `answer is turned at ${where}`);
      // Marks computed independently: turn the marked base by `turns` quarter turns.
      const expect = rot.turn(r.base, r.turns).filter((c) => c[2]).map(([x, y]) => `${x},${y}`).sort();
      assert.deepEqual(r.answerMarks, expect, where);
      assert.equal(rot.shapeKey(rot.turn(r.base, r.turns)), rot.shapeKey(right[0].cells), where);
      assert.ok(rot.checkMarks(r, expect).exact, where);
      const cellsK = right[0].cells.map(([x, y]) => `${x},${y}`);
      const wrongMark = cellsK.find((k) => !expect.includes(k));
      assert.ok(!rot.checkMarks(r, [...expect.slice(1), wrongMark]).exact, where);
      for (const k of expect) assert.ok(cellsK.includes(k), where);
      // Marks are uniquely placed: since the figure has no symmetry, no other turn lands the shape on itself.
      assert.equal(new Set(r.options.map((o) => rot.shapeKey(o.cells))).size, r.options.length, where);
    }
  });
  assert.ok(n > 5000);
  const easy = rot.rotationConfig('advanced', 1, 1);
  const hard = rot.rotationConfig('advanced', 3, 30);
  assert.ok(hard.cells > easy.cells && hard.marks > easy.marks && hard.options > easy.options && hard.studyMs < easy.studyMs);
});

test('Interference Recall: bank has no repeats; tests hold every A word, lures from B, new words never shown', () => {
  const all = inter.GROUPS.flat();
  assert.equal(new Set(all).size, all.length, 'a word appears in two groups');
  for (const g of inter.GROUPS) assert.ok(g.length >= 3);
  each((band, d, L, rng, where) => {
    const cfg = inter.interferenceConfig(band, d, L);
    assert.ok(cfg.listSize <= inter.GROUPS.length);
    const tr = inter.makeInterferenceTrial(rng, cfg);
    assert.equal(tr.listA.length, cfg.listSize, where);
    assert.equal(tr.listB.length, cfg.listSize, where);
    assert.equal(new Set([...tr.listA, ...tr.listB]).size, cfg.listSize * 2, where);
    const words = tr.test.map((x) => x.word);
    assert.equal(new Set(words).size, words.length, where);
    for (const w of tr.listA) assert.ok(tr.test.some((x) => x.word === w && x.kind === 'A'), where);
    for (const x of tr.test) {
      if (x.kind === 'B') assert.ok(tr.listB.includes(x.word), where);
      if (x.kind === 'N') assert.ok(!tr.listA.includes(x.word) && !tr.listB.includes(x.word), where);
    }
    // Every B word shares a meaning group with an A word.
    for (const b of tr.listB) {
      const g = inter.GROUPS.find((gr) => gr.includes(b));
      assert.ok(tr.listA.some((a) => g.includes(a)), where);
    }
    assert.equal(tr.test.filter((x) => x.kind === 'B').length, cfg.lures, where);
    assert.equal(tr.test.filter((x) => x.kind === 'N').length, cfg.fresh, where);
    for (const s of tr.sums) {
      const [a, op, b] = s.text.split(' ');
      const val = op === '+' ? +a + +b : op === '-' ? a - b : a * b;
      assert.equal(val, s.answer, where);
      assert.equal(s.choices.filter((c) => c === s.answer).length, 1, where);
      assert.equal(new Set(s.choices).size, 3, where);
    }
    const perfect = inter.scoreRecall(tr, tr.listA);
    assert.equal(perfect.score, cfg.listSize, where);
    const lure = tr.test.find((x) => x.kind === 'B').word;
    const r2 = inter.scoreRecall(tr, [...tr.listA, lure]);
    assert.equal(r2.score, cfg.listSize - 1, where);
    assert.equal(r2.lureFA, 1, where);
    assert.equal(inter.scoreRecall(tr, tr.test.filter((x) => x.kind !== 'A').map((x) => x.word)).score, 0, where);
  });
  const easy = inter.interferenceConfig('advanced', 1, 1);
  const hard = inter.interferenceConfig('advanced', 3, 30);
  assert.ok(hard.listSize > easy.listSize && hard.lures > easy.lures && hard.studyMs < easy.studyMs);
});

test('Cipher Lab: bank is real text; every puzzle opens unsolved and is solved only by the true key', () => {
  assert.ok(cl.TEXTS.length >= 40);
  assert.equal(new Set(cl.TEXTS.map((x) => x.text)).size, cl.TEXTS.length);
  for (const { text, source } of cl.TEXTS) {
    assert.match(text, /^[A-Z]+( [A-Z]+)*$/, text);
    assert.ok(source);
  }
  for (const [len, words] of Object.entries(cl.KEYWORDS)) for (const w of words) assert.equal(w.length, Number(len));
  each((band, d, L, rng, where) => {
    const cfg = cl.cipherLabConfig(band, d, L);
    const level = cl.makeCipherLabLevel(rng, cfg);
    assert.equal(level.length, cfg.puzzles, where);
    assert.deepEqual([...new Set(level.map((p) => p.kind))].sort(), ['sub', 'trans', 'vig'], where);
    assert.equal(new Set(level.map((p) => p.text)).size, level.length, where);
    for (const p of level) {
      const w = `${where}/${p.kind}`;
      const start = cl.startState(p);
      assert.ok(!cl.isSolved(p, start), `opens solved at ${w}`);
      assert.ok(cl.isSolved(p, cl.solutionState(p)), `solution fails at ${w}`);
      if (p.kind === 'sub') {
        assert.notEqual(p.cipher, p.text, w);
        for (const [c, pl] of Object.entries(p.solution)) assert.notEqual(c, pl, w);
        assert.equal(cl.subDecrypt(p.cipher, p.solution), p.text, w);
        assert.ok(Object.keys(p.givens).length <= cfg.givens, w);
        // A wrong letter anywhere breaks it.
        const [c] = Object.keys(p.solution);
        const other = Object.keys(p.solution).find((x) => x !== c);
        const swapped = { ...p.solution, [c]: p.solution[other], [other]: p.solution[c] };
        assert.ok(!cl.isSolved(p, { map: swapped }), w);
        // assignLetter keeps the map one-to-one.
        const m = cl.assignLetter({ map: { X: 'E' } }, 'Y', 'E');
        assert.deepEqual(m.map, { Y: 'E' });
      } else if (p.kind === 'vig') {
        assert.equal(p.key.length, cfg.keyLen, w);
        assert.equal(cl.vigenere(p.cipher, p.key, -1), p.text, w);
        const bad = [...p.key];
        bad[0] = bad[0] === 'A' ? 'B' : 'A';
        assert.ok(!cl.isSolved(p, { key: bad }), w);
        assert.ok(cl.lettersOf(p.text).length >= cfg.keyLen * 3, w);
      } else {
        assert.equal(p.strips.length, cfg.cols, w);
        assert.equal(p.target, cl.lettersOf(p.text).padEnd(p.target.length, 'X'), w);
        assert.ok(p.target.startsWith(cl.lettersOf(p.text)), w);
      }
    }
  });
  const easy = cl.cipherLabConfig('advanced', 1, 1);
  const hard = cl.cipherLabConfig('advanced', 3, 30);
  assert.ok(hard.givens < easy.givens && hard.keyLen > easy.keyLen && hard.cols > easy.cols);
});

test('Boolean Breaker: circuits evaluate exactly, every task is solvable and has one answer', () => {
  // Gate truth tables.
  const tt = (op) => [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => bb.applyGate(op, a, b)).join('');
  assert.equal(tt('AND'), '0001');
  assert.equal(tt('OR'), '0111');
  assert.equal(tt('XOR'), '0110');
  assert.equal(tt('NAND'), '1110');
  assert.equal(bb.applyGate('NOT', 0), 1);
  assert.equal(bb.applyGate('NOT', 1), 0);
  // A hand-built circuit: (A AND B) XOR (NOT C).
  const c = { n: 3, gates: [{ op: 'AND', a: 0, b: 1 }, { op: 'NOT', a: 2 }, { op: 'XOR', a: 3, b: 4 }] };
  assert.deepEqual(bb.truthTable(c), [1, 0, 1, 0, 1, 0, 0, 1]);
  each((band, d, L, rng, where) => {
    const cfg = bb.booleanConfig(band, d, L);
    const level = bb.makeBooleanLevel(rng, cfg);
    assert.equal(level.length, cfg.rounds, where);
    for (const task of level) {
      const w = `${where}/${task.kind}`;
      const { circuit } = task;
      assert.ok(circuit.gates.every((g) => bb.GATES.includes(g.op)), w);
      circuit.gates.forEach((g, i) => {
        assert.ok(g.a < circuit.n + i, w);
        if (g.op !== 'NOT') assert.ok(g.b < circuit.n + i && g.b !== g.a, w);
      });
      const table = bb.truthTable(circuit);
      assert.deepEqual(task.table, table, w);
      assert.ok(table.includes(1) && table.includes(0), w);
      if (task.kind === 'light') {
        assert.equal(circuit.n, cfg.lightInputs, w);
        assert.equal(bb.evaluate(circuit, task.start).out, 0, `lamp already on at ${w}`);
        const r = table.indexOf(1);
        assert.ok(bb.checkTask(task, bb.rowBits(circuit.n, r)), w);
        assert.ok(!bb.checkTask(task, task.start), w);
      } else if (task.kind === 'table') {
        assert.ok(circuit.n <= 3, w);
        assert.ok(bb.checkTask(task, table), w);
        assert.ok(!bb.checkTask(task, table.map((v, i) => (i === 0 ? 1 - v : v))), w);
      } else {
        assert.notEqual(circuit.gates[task.hidden].op, 'NOT', w);
        const fits = bb.BINARY.filter((op) => bb.truthTable(circuit, circuit.gates.map((g, i) => (i === task.hidden ? op : g.op))).join() === table.join());
        assert.deepEqual(fits, [circuit.gates[task.hidden].op], w);
        assert.ok(bb.checkTask(task, fits[0]), w);
        assert.ok(!bb.checkTask(task, bb.BINARY.find((op) => op !== fits[0])), w);
      }
    }
  });
  const easy = bb.booleanConfig('advanced', 1, 1);
  const hard = bb.booleanConfig('advanced', 3, 30);
  assert.ok(hard.gates > easy.gates && hard.lightInputs > easy.lightInputs && hard.tests < easy.tests);
});

test('coach and blurbs cover all four games', () => {
  for (const id of ['spatial-rotation-vault', 'interference-recall', 'cipher-lab', 'boolean-breaker']) {
    assert.equal(coach.COACH[id].steps.length, 3, id);
    assert.ok(coach.COACH[id].tip, id);
    assert.ok(coach.BLURB[id], id);
  }
});
