/**
 * The quiz pools, pinned.
 *
 * A student reported meeting the same question on level one and level two,
 * and level three, and level four. The causes were a fifteen-question band
 * asked five to twelve at a time, four games that never passed a question's
 * band through (so all three bands were mixed from level one), and options
 * built from Math.random so the question memory never recognised a repeat.
 * These tests hold every pool to the rules that stop each of those.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildSequences } = await import('../../src/career/data/genSequences.js');
const { buildSyllogisms } = await import('../../src/career/data/genSyllogisms.js');
const { buildOddOneOut } = await import('../../src/career/data/genOddOneOut.js');
const { buildSpellings } = await import('../../src/career/data/genSpellings.js');
const { buildTenses } = await import('../../src/career/data/genTenses.js');
const puzzles = await import('../../src/career/data/brainPuzzles.js');
const grammar = await import('../../src/career/data/brainGrammar.js');
const { default: words } = await import('../../src/career/data/brainWords.js');
/* How far through a thirty-level band a level sits; the same rule as ramp in levels.js. */
const ramp = (levelNo) => Math.min(1, Math.max(0, (levelNo - 1) / 29));

/* A key that names a question by its content, as the memory does. */
const keyOf = (q) => JSON.stringify({ ...q, options: undefined, tier: undefined });

const GENERATED = {
  sequences: buildSequences,
  syllogisms: buildSyllogisms,
  oddOneOut: buildOddOneOut,
  spellings: buildSpellings,
  tenses: buildTenses
};

const WRITTEN = {
  synonyms: puzzles.SYNONYMS,
  antonyms: puzzles.ANTONYMS,
  sentenceGaps: puzzles.SENTENCE_GAPS,
  idioms: puzzles.IDIOMS,
  wordRoots: puzzles.WORD_ROOTS,
  homophones: grammar.HOMOPHONES,
  oddOneOutWritten: puzzles.ODD_ONE_OUT,
  syllogismsWritten: puzzles.SYLLOGISMS,
  sequencesWritten: puzzles.SEQUENCES
};

/* Enough that a band's first several levels are all fresh questions. A
   level asks five to twelve, so thirty-six is at least three fresh levels
   even at the top of the ramp and seven at the bottom. */
const MIN_PER_BAND = { generated: 45, written: 30, merged: 12 };

const perBand = (pool) => {
  const by = { 1: 0, 2: 0, 3: 0 };
  for (const q of pool) by[q.level] = (by[q.level] || 0) + 1;
  return by;
};

for (const [name, build] of Object.entries(GENERATED)) {
  test(`${name}: generated pool is big enough in every band and never repeats a question`, () => {
    const pool = build();
    const by = perBand(pool);
    for (const band of [1, 2, 3]) assert.ok(by[band] >= MIN_PER_BAND.generated, `${name} band ${band} has ${by[band]}`);
    const keys = new Set(pool.map(keyOf));
    assert.equal(keys.size, pool.length, `${name} repeats a question`);
  });

  test(`${name}: the pool is the same on every build, so the memory can track it`, () => {
    assert.deepEqual(build(), build());
  });

  test(`${name}: every question has a valid, distinct set of options that holds the answer`, () => {
    for (const q of build()) {
      if (!q.options) continue;
      assert.equal(new Set(q.options.map(String)).size, q.options.length, `${name} ${JSON.stringify(q)} repeats an option`);
      assert.ok(q.options.includes(q.answer), `${name} ${JSON.stringify(q)} lacks its answer`);
    }
  });

  test(`${name}: difficulty rises through the band (tier climbs with position)`, () => {
    const pool = build();
    for (const band of [1, 2, 3]) {
      const tiers = pool.filter((q) => q.level === band).map((q) => q.tier);
      assert.ok(tiers.every((t) => t >= 0 && t <= 1), `${name} band ${band} has a tier outside 0..1`);
      for (let i = 1; i < tiers.length; i += 1) assert.ok(tiers[i] >= tiers[i - 1], `${name} band ${band} tier falls at ${i}`);
    }
  });
}

test('syllogisms: each band is balanced, so answering the same way throughout earns nothing', () => {
  const pool = buildSyllogisms();
  for (const band of [1, 2, 3]) {
    const inBand = pool.filter((q) => q.level === band);
    const follows = inBand.filter((q) => q.answer === 'Follows').length;
    assert.ok(Math.abs(follows - inBand.length / 2) <= inBand.length * 0.1, `band ${band}: ${follows} of ${inBand.length} follow`);
  }
});

test('spellings: no wrong spelling is itself a word on the list', () => {
  const pool = buildSpellings();
  const real = new Set(pool.map((q) => q.answer));
  for (const q of pool) {
    for (const o of q.options) if (o !== q.answer) assert.ok(!real.has(o), `${q.answer}: "${o}" is a real word`);
  }
});

for (const [name, pool] of Object.entries(WRITTEN)) {
  const merged = name.endsWith('Written');
  test(`${name}: written pool carries a band on every question and repeats none`, () => {
    for (const q of pool) assert.ok([1, 2, 3].includes(q.level), `${name} ${JSON.stringify(q)} has no band`);
    const by = perBand(pool);
    const floor = merged ? MIN_PER_BAND.merged : MIN_PER_BAND.written;
    for (const band of [1, 2, 3]) assert.ok(by[band] >= floor, `${name} band ${band} has ${by[band]}`);
    const ident = (q) => (q.word || q.phrase || q.part || q.text || (q.items && [...q.items].sort().join('|')) || (q.run && q.run.join(',')) || (q.premises && q.premises.join('|') + q.conclusion) || JSON.stringify(q)).toLowerCase();
    const seen = new Map();
    for (const q of pool) {
      const k = ident(q);
      assert.ok(!seen.has(k), `${name} asks "${k}" twice (bands ${seen.get(k)} and ${q.level})`);
      seen.set(k, q.level);
    }
  });

  test(`${name}: every wrong option differs from the answer and from each other`, () => {
    for (const q of pool) {
      const options = q.wrong ? [q.answer, ...q.wrong] : q.items || [];
      if (!options.length) continue;
      assert.equal(new Set(options.map((o) => String(o).toLowerCase())).size, options.length, `${name} ${JSON.stringify(q)} repeats an option`);
    }
  });
}

test('scramble words: each is unique and no clue gives its word away', () => {
  const seen = new Set();
  for (const w of words) {
    assert.ok(!seen.has(w.word), `${w.word} listed twice`);
    seen.add(w.word);
    assert.ok(!w.clue.toUpperCase().includes(w.word), `${w.word}: clue contains the word`);
  }
  assert.ok(words.length >= 100, `only ${words.length} words`);
});

/* ---- The window and the memory together ------------------------------- */

/* The memory keeps its record in localStorage; give it one. */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
const { pickQuestions, remember, forget, keyOf: memoryKey } = await import('../../src/career/components/games/questionMemory.js');
const keyOf2 = memoryKey;

test('memory: among unseen questions, the level takes the ones nearest its own difficulty', () => {
  const gameId = 'tier-game';
  forget(gameId, 1);
  const pool = Array.from({ length: 60 }, (_, i) => ({ id: i, tier: i / 59 }));
  const first = pickQuestions(pool, 8, gameId, 1, ramp(1));
  const last = pickQuestions(pool, 8, gameId, 1, ramp(30));
  assert.ok(first.every((q) => q.tier <= 0.15), 'level 1 takes the easiest');
  assert.ok(last.every((q) => q.tier >= 0.85), 'level 30 takes the hardest');
  // A hand-written pool has no tiers; its order stands in for them.
  const written = Array.from({ length: 40 }, (_, i) => ({ id: i }));
  assert.ok(pickQuestions(written, 5, gameId, 1, ramp(1)).every((q) => q.id < 5), 'untiered level 1 takes the first');
  // But an unseen question anywhere beats a seen one at the right difficulty.
  for (const q of first) remember(gameId, 1, q, true);
  const again = pickQuestions(pool, 8, gameId, 1, ramp(1));
  assert.ok(again.every((q) => !first.includes(q)), 'nothing just asked comes back while unseen questions remain');
  forget(gameId, 1);
});

test('memory: a borrowed band sits beyond this one, easiest first, and its grading is not part of its identity', () => {
  const gameId = 'borrow-game';
  forget(gameId, 1);
  const own = Array.from({ length: 6 }, (_, i) => ({ id: `own${i}`, tier: i / 5 }));
  const next = Array.from({ length: 6 }, (_, i) => ({ id: `next${i}`, tier: i / 5, tierShift: 1 }));
  for (const q of own) remember(gameId, 1, q, true);
  const deck = pickQuestions([...own, ...next], 3, gameId, 1, ramp(30));
  assert.deepEqual(deck.map((q) => q.id), ['next0', 'next1', 'next2']);
  assert.equal(keyOf2({ id: 'x', tier: 0.2 }), keyOf2({ id: 'x', tier: 0.9, tierShift: 1 }));
  forget(gameId, 1);
});

test('memory: a band asks every question once before any comes round again, and a wrong answer returns before a right one', () => {
  const gameId = 'test-game';
  forget(gameId, 1);
  const pool = buildSpellings().filter((q) => q.level === 1);
  const asked = [];
  // Play through the band as the quiz does: pick a level's questions, answer, remember.
  let level = 1;
  while (asked.length < pool.length) {
    const size = Math.round(5 + 7 * ramp(level));
    const deck = pickQuestions(pool, size, gameId, 1, ramp(level));
    // Once fewer unseen questions remain than a level asks, the tail of the
    // deck is rightly a repeat; only the fresh head is held to the rule.
    for (const q of deck.slice(0, Math.min(size, pool.length - asked.length))) {
      assert.ok(!asked.includes(q.answer), `"${q.answer}" asked again at level ${level} before the band was exhausted`);
      asked.push(q.answer);
      remember(gameId, 1, q, q.answer !== 'their');
    }
    level += 1;
  }
  // Everything has been asked once. What comes back first is the one got wrong.
  const next = pickQuestions(pool, 1, gameId, 1);
  assert.equal(next[0].answer, 'their');
  forget(gameId, 1);
});
