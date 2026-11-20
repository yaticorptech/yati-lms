/**
 * Age-band content for Word Scramble, Typing Sprint, Spelling Fix and Tense Pick (src/career/data/bands/words.js,
 * tenses.js): enough items per band and level, one right answer per question, no duplicates, scrambles that
 * never hand back the word, and wrong spellings that really are wrong.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const words = await import('../../src/career/data/bands/words.js');
const { tenseBands } = await import('../../src/career/data/bands/tenses.js');
const { BANDS } = await import('../../src/career/components/games/zones.js');
const { SCRAMBLE, TYPING, BAND_KEYS, spellingBands, scramble, NOT_MISSPELT, CONFUSABLES, scrambleConfig, typingConfig, speedScore } = words;

/* The difficulty levels a band can actually be played at (zones.js), widened by one for the adaptive stages. */
const reachable = (band) => {
  const b = BANDS[band];
  const out = [];
  for (let d = Math.max(1, b.minDifficulty - 1); d <= Math.min(3, b.maxDifficulty + 1); d += 1) out.push(d);
  return out;
};
const countAt = (list, level) => list.filter((x) => x.level === level).length;
const sorted = (w) => w.split('').sort().join('');

test('every band has at least 40 items in every game', () => {
  const spell = spellingBands();
  const tense = tenseBands();
  for (const band of BAND_KEYS) {
    assert.ok(SCRAMBLE[band].length >= 40, `scramble ${band}: ${SCRAMBLE[band].length}`);
    assert.ok(TYPING[band].length >= 40, `typing ${band}: ${TYPING[band].length}`);
    assert.ok(spell[band].length >= 40, `spelling ${band}: ${spell[band].length}`);
    assert.ok(tense[band].length >= 40, `tense ${band}: ${tense[band].length}`);
  }
});

test('the levels a band plays at are stocked', () => {
  const spell = spellingBands();
  const tense = tenseBands();
  for (const band of BAND_KEYS) {
    const main = BANDS[band].minDifficulty;
    for (const [name, list] of [['scramble', SCRAMBLE[band]], ['typing', TYPING[band]], ['spelling', spell[band]], ['tense', tense[band]]]) {
      for (const x of list) assert.ok([1, 2, 3].includes(x.level), `${name} ${band}: bad level ${x.level}`);
      // The band's own starting level holds a real round's worth.
      assert.ok(countAt(list, main) >= 10, `${name} ${band} level ${main}: ${countAt(list, main)}`);
      // Every reachable level yields a non-empty pool.
      for (const d of reachable(band)) {
        assert.ok(words.itemsFor(list, d, 0).length > 0, `${name} ${band} difficulty ${d} is empty`);
      }
    }
    // Young bands are mostly levels 1–2.
    if (band === 'foundation') {
      for (const list of [SCRAMBLE[band], TYPING[band], spell[band]]) assert.equal(countAt(list, 3), 0);
    }
  }
});

test('word scramble: words are A–Z, unique, foundation is 3-letter picture words, no anagram twins in a band', () => {
  for (const band of BAND_KEYS) {
    const list = SCRAMBLE[band];
    const seen = new Set();
    const shapes = new Map();
    for (const w of list) {
      assert.match(w.word, /^[A-Z]+$/, `${band}: ${w.word}`);
      assert.ok(w.clue && w.clue.length > 3, `${band}: ${w.word} has no clue`);
      assert.ok(!w.clue.toUpperCase().split(/[^A-Z]+/).includes(w.word), `${band}: the clue gives away ${w.word}`);
      assert.ok(!seen.has(w.word), `${band}: duplicate ${w.word}`);
      seen.add(w.word);
      const shape = sorted(w.word);
      assert.ok(!shapes.has(shape), `${band}: ${w.word} and ${shapes.get(shape)} are anagrams`);
      shapes.set(shape, w.word);
    }
  }
  for (const w of SCRAMBLE.foundation) {
    assert.equal(w.word.length, 3, w.word);
    assert.ok(w.picture, `${w.word} needs a picture`);
  }
  for (const w of SCRAMBLE.developing) assert.ok(w.word.length >= 4 && w.word.length <= 6, w.word);
});

test('scramble never returns the word, and keeps its letters', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const band of BAND_KEYS) {
    for (const { word } of SCRAMBLE[band]) {
      for (let k = 0; k < 20; k += 1) {
        const s = scramble(word, rng);
        assert.notEqual(s, word, `${word} came back unscrambled`);
        assert.equal(sorted(s), sorted(word));
      }
    }
  }
  // Even with a generator that never moves anything.
  assert.notEqual(scramble('CAT', () => 0.999), 'CAT');
});

test('typing: plain typeable ASCII, unique, foundation is letters then short words', () => {
  for (const band of BAND_KEYS) {
    const seen = new Set();
    for (const { text } of TYPING[band]) {
      assert.match(text, /^[\x20-\x7E]+$/, `${band}: non-ASCII in "${text}"`);
      assert.ok(!/ {2}/.test(text) && text.trim() === text, `${band}: stray spaces in "${text}"`);
      assert.ok(!seen.has(text), `${band}: duplicate "${text}"`);
      seen.add(text);
    }
  }
  for (const x of TYPING.foundation) assert.ok(x.text.length <= 3 && /^[a-z]+$/i.test(x.text), x.text);
  assert.ok(TYPING.foundation.filter((x) => x.level === 1).every((x) => x.text.length === 1));
  // Sentences start with a capital and end with punctuation.
  for (const band of ['intermediate', 'analytical', 'advanced']) {
    for (const { text } of TYPING[band]) assert.match(text, /^[A-Z].*[.!?]$/, text);
  }
  assert.ok(TYPING.advanced.every((x) => x.text.split(/[.!?] /).length >= 2), 'advanced items are passages');
});

test('typing config: young rounds are slower; advanced scores accuracy above speed', () => {
  assert.ok(typingConfig('foundation', 1, 1).seconds >= typingConfig('analytical', 1, 1).seconds);
  assert.equal(typingConfig('foundation', 1, 1).mode, 'keys');
  assert.equal(typingConfig('advanced', 2, 1).mode, 'speed');
  assert.equal(typingConfig(null, 1, 1).band, 'analytical');
  // 100% accurate and slow beats fast and sloppy.
  assert.ok(speedScore(30, 100) > speedScore(60, 70));
  // A couple of keystrokes earns next to nothing.
  assert.ok(speedScore(0, 100, 2) < 5);
  assert.ok(scrambleConfig('foundation', 1, 1).tiles);
  assert.ok(!scrambleConfig('advanced', 2, 1).tiles);
});

test('spelling: one right answer, distinct options, every wrong option misspelt', () => {
  const spell = spellingBands();
  const correct = new Set();
  for (const band of BAND_KEYS) for (const q of spell[band]) correct.add(q.answer.toLowerCase());
  for (const band of BAND_KEYS) {
    const keys = new Set();
    for (const q of spell[band]) {
      const key = `${q.sentence || ''}|${q.answer}`;
      assert.ok(!keys.has(key), `${band}: duplicate ${key}`);
      keys.add(key);
      assert.equal(new Set(q.options).size, q.options.length, `${band}: repeated option in ${q.answer}`);
      assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${band}: ${q.answer} not exactly once`);
      assert.ok(q.options.length >= 3, `${band}: ${q.answer} has ${q.options.length} options`);
      if (q.kind === 'pair') {
        assert.ok(q.sentence.includes('___'));
        // One look-alike (a real word, wrong here) and one misspelling that is no word at all.
        const others = q.options.filter((o) => o !== q.answer).map((o) => o.toLowerCase());
        assert.equal(others.filter((o) => CONFUSABLES.has(o)).length, 1, `${band}: ${q.sentence}`);
        const misspelt = others.filter((o) => !CONFUSABLES.has(o));
        for (const o of misspelt) assert.ok(!correct.has(o) && !NOT_MISSPELT.has(o), `${band}: "${o}" is a real word`);
      } else {
        for (const o of q.options) {
          if (o === q.answer) continue;
          assert.ok(!correct.has(o.toLowerCase()), `${band}: "${o}" (for ${q.answer}) is a listed correct word`);
          assert.ok(!NOT_MISSPELT.has(o.toLowerCase()), `${band}: "${o}" (for ${q.answer}) is a real word`);
        }
      }
    }
  }
  for (const q of spell.foundation) {
    assert.equal(q.options.length, 3);
    assert.ok(q.picture, q.answer);
  }
});

test('tense pick: one right answer, distinct options, unique sentences, a verb hint', () => {
  const tense = tenseBands();
  for (const band of BAND_KEYS) {
    const seen = new Set();
    for (const q of tense[band]) {
      assert.equal((q.sentence.match(/___/g) || []).length, 1, `${band}: ${q.sentence}`);
      assert.ok(q.verb, q.sentence);
      assert.ok(q.explain, q.sentence);
      assert.ok(!seen.has(q.sentence), `${band}: duplicate "${q.sentence}"`);
      seen.add(q.sentence);
      assert.equal(new Set(q.options).size, q.options.length, `${band}: repeated option in "${q.sentence}"`);
      assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${band}: "${q.sentence}"`);
      assert.ok(q.options.length >= 3);
      assert.match(q.sentence, /^[A-Z'"]/, q.sentence);
    }
  }
  for (const q of tense.foundation) {
    assert.ok(q.picture, q.sentence);
    assert.equal(q.options.length, 3);
  }
});
