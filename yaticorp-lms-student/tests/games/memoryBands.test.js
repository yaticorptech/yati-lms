import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/career/data/bands/memory.js');
const { BANDS } = await import('../../src/career/components/games/zones.js');

/** A seeded generator, so every run tries the same boards. */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Every (band, difficulty, levelNo, tier) the games can be asked for — levelNo capped as levels.js caps it. */
function* everyCase() {
  for (const ageBand of [...M.BAND_KEYS, null]) {
    const maxStep = BANDS[ageBand]?.maxStep || 30;
    for (const difficulty of [1, 2, 3]) {
      for (let levelNo = 1; levelNo <= maxStep; levelNo += 1) {
        for (const tier of ['easy', 'medium', 'hard']) yield { ageBand, difficulty, levelNo, tier };
      }
    }
  }
}

test('null band plays as analytical; groups are right', () => {
  assert.equal(M.bandKey(null), 'analytical');
  assert.equal(M.bandKey('nope'), 'analytical');
  assert.equal(M.groupOf('foundation'), 'young');
  assert.equal(M.groupOf('developing'), 'young');
  assert.equal(M.groupOf('intermediate'), 'smart');
  assert.equal(M.groupOf(null), 'smart');
  assert.equal(M.groupOf('advanced'), 'master');
  assert.equal(M.bandRamp('foundation', 12), 1);
  assert.equal(M.bandRamp('analytical', 1), 0);
});

test('memory match: distinct faces, right count, board fills the grid, band rules hold', () => {
  const rng = seeded(1);
  for (const c of everyCase()) {
    const cfg = M.memoryMatchConfig(c);
    if (cfg.band === 'foundation') assert.ok(cfg.pairs >= 3 && cfg.pairs <= 6, `foundation pairs ${cfg.pairs}`);
    if (cfg.band === 'developing') assert.ok(cfg.pairs >= 4 && cfg.pairs <= 8);
    assert.equal((cfg.pairs * 2) % cfg.cols, 0, 'every row full');
    assert.ok(cfg.moveBudget >= cfg.pairs);
    assert.equal(cfg.ordered, cfg.band === 'advanced');
    for (let k = 0; k < 3; k++) {
      const { deck, order } = M.buildMemoryDeck(cfg, rng);
      assert.equal(deck.length, cfg.pairs * 2);
      const faces = [...new Set(deck.map((d) => d.face))];
      assert.equal(faces.length, cfg.pairs, 'each face exactly one pair');
      for (const f of faces) assert.equal(deck.filter((d) => d.face === f).length, 2);
      if (order) assert.deepEqual([...order].sort(), [...faces].sort());
    }
  }
});

test('memory match: young look-alikes appear only when asked for, and both twins are on the board', () => {
  const rng = seeded(2);
  const twinsOf = (faces) => Object.values(M.LOOKALIKES).flat().filter(([a, b]) => faces.includes(a) && faces.includes(b)).length;
  const easy = M.memoryMatchConfig({ ageBand: 'foundation', levelNo: 1 });
  assert.equal(easy.lookalikes, 0);
  for (let k = 0; k < 50; k++) assert.equal(twinsOf(M.memoryFaces(easy, rng)), 0);
  const hard = M.memoryMatchConfig({ ageBand: 'foundation', levelNo: 12 });
  assert.equal(hard.lookalikes, 2);
  for (let k = 0; k < 50; k++) assert.ok(twinsOf(M.memoryFaces(hard, rng)) >= 2);
});

test('sequence recall: young lengths, rules only for master, expected input is right', () => {
  const f = M.sequenceConfig({ ageBand: 'foundation', levelNo: 1 });
  const f12 = M.sequenceConfig({ ageBand: 'foundation', levelNo: 12 });
  assert.equal(f.target, 2);
  assert.equal(f12.target, 4);
  assert.ok(f12.maxRun <= 5);
  const d24 = M.sequenceConfig({ ageBand: 'developing', levelNo: 24 });
  assert.equal(d24.target, 6);
  assert.equal(d24.pads.length, 6);
  for (const c of everyCase()) {
    const cfg = M.sequenceConfig(c);
    assert.ok(cfg.maxRun >= cfg.target && cfg.start <= cfg.target);
    if (cfg.band !== 'advanced') assert.equal(M.sequenceRule(cfg, 8), 'forward');
  }
  const adv = M.sequenceConfig({ ageBand: 'advanced', difficulty: 3, levelNo: 10 });
  const rng = seeded(3);
  const seen = new Set();
  for (let k = 0; k < 200; k++) seen.add(M.sequenceRule(adv, 6, rng));
  assert.deepEqual([...seen].sort(), ['even', 'forward', 'reverse']);
  assert.equal(M.sequenceRule(adv, 2, rng), 'forward');
  assert.deepEqual(M.expectedInput([0, 1, 2, 3, 4], 'reverse'), [4, 3, 2, 1, 0]);
  assert.deepEqual(M.expectedInput([5, 6, 7, 1, 2], 'even'), [6, 1]);
  assert.deepEqual(M.expectedInput([1, 2], 'forward'), [1, 2]);
});

test('number recall: foundation stays small and slow; dual rounds ask for one of two different numbers', () => {
  for (const levelNo of [1, 6, 12]) {
    const cfg = M.numberRecallConfig({ ageBand: 'foundation', levelNo });
    assert.equal(cfg.start, 2);
    assert.ok(cfg.target <= 4 && cfg.maxLen === 5);
    assert.ok(M.showMsFor(cfg, 2) >= 2500);
  }
  assert.equal(M.numberRecallConfig({ ageBand: 'developing', levelNo: 24 }).maxLen, 6);
  assert.equal(M.numberRecallConfig({ ageBand: 'advanced', difficulty: 2 }).mode, 'dual');
  const rng = seeded(4);
  for (let k = 0; k < 200; k++) {
    const r = M.dualRound(4, rng);
    assert.match(r.first, /^\d{4}$/);
    assert.notEqual(r.first, r.second);
    assert.equal(r.answer, r.ask === 'first' ? r.first : r.second);
  }
});

test('colour match: foundation never shows words; switch cards always disagree and answer by the rule', () => {
  const rng = seeded(5);
  const f = M.colourConfig({ ageBand: 'foundation', levelNo: 12 });
  for (let k = 0; k < 200; k++) {
    const card = M.makeColourCard(f, 'ink', rng);
    assert.equal(card.kind, 'blob');
    assert.equal(card.answer, card.ink.name);
    assert.ok(M.INKS.slice(0, f.colours).includes(card.ink));
  }
  assert.equal(M.colourConfig({ ageBand: 'developing', levelNo: 1 }).stroopShare, 0);
  assert.ok(M.colourConfig({ ageBand: 'developing', levelNo: 24 }).stroopShare > 0);
  const adv = M.colourConfig({ ageBand: 'advanced', difficulty: 3, levelNo: 15 });
  let prev = 'ink';
  const rules = new Set();
  for (let k = 0; k < 300; k++) {
    const card = M.makeColourCard(adv, prev, rng);
    assert.equal(card.kind, 'word');
    assert.notEqual(card.word, card.ink.name);
    assert.equal(card.answer, card.rule === 'ink' ? card.ink.name : card.word);
    rules.add(card.rule);
    prev = card.rule;
  }
  assert.equal(rules.size, 2);
  const stroop = M.colourConfig({ ageBand: 'intermediate', levelNo: 20 });
  for (let k = 0; k < 200; k++) {
    const card = M.makeColourCard(stroop, 'ink', rng);
    assert.equal(card.answer, card.ink.name);
  }
});

test('grid recall: patterns fit, are distinct, two-stage patterns never overlap', () => {
  const rng = seeded(6);
  for (const c of everyCase()) {
    const cfg = M.gridConfig(c);
    if (cfg.band === 'foundation') assert.ok(cfg.size === 3 && cfg.lit >= 2 && cfg.lit <= 3);
    assert.equal(cfg.twoStage, cfg.band === 'advanced');
    for (const r of M.gridRounds(cfg, rng)) {
      const cells = cfg.size * cfg.size;
      assert.equal(new Set(r.first).size, r.first.length);
      assert.ok(r.first.every((i) => i >= 0 && i < cells));
      if (cfg.twoStage) {
        assert.equal(r.second.length, r.first.length);
        assert.ok(r.second.every((i) => !r.first.includes(i)));
      }
      if (cfg.pictures) assert.deepEqual(Object.keys(r.pictures).map(Number).sort(), [...r.first].sort());
    }
  }
});

test('reverse recall: answers are exact; picture pads hold every shown picture', () => {
  assert.equal(M.reverseAnswer('379', 'plus1'), '084');
  assert.equal(M.reverseAnswer('1209', 'digits'), '9021');
  assert.equal(M.reverseAnswer('90', 'plus1'), '10');
  assert.equal(M.reverseConfig({ ageBand: 'foundation' }).mode, 'pictures');
  assert.equal(M.reverseConfig({ ageBand: 'foundation' }).start, 2);
  assert.equal(M.reverseConfig({ ageBand: 'developing', levelNo: 24 }).mode, 'digits');
  assert.equal(M.reverseConfig({ ageBand: 'advanced', difficulty: 2 }).mode, 'plus1');
  const rng = seeded(7);
  for (const [len, pad] of [[2, 4], [4, 4], [5, 6]]) {
    for (let k = 0; k < 50; k++) {
      const r = M.pictureRound(len, pad, rng);
      assert.equal(new Set(r.shown).size, len);
      assert.equal(r.pad.length, pad);
      assert.equal(new Set(r.pad).size, pad);
      assert.ok(r.shown.every((f) => r.pad.includes(f)));
      assert.deepEqual(r.answer, [...r.shown].reverse());
    }
  }
  for (const c of everyCase()) {
    const cfg = M.reverseConfig(c);
    if (cfg.mode === 'pictures') assert.ok(cfg.maxLen <= cfg.padSize);
    assert.ok(cfg.start <= cfg.target && cfg.target <= cfg.maxLen);
  }
});
