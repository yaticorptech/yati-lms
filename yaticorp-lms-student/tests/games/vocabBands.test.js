import test from 'node:test';
import assert from 'node:assert/strict';

const { VOCAB_BANDS, SYNONYM_BANDS, GAP_BANDS, IDIOM_BANDS, SOUND_BANDS, SOUND_MEANING, bandOrDefault } = await import(
  '../../src/career/data/bands/vocab.js'
);

const GAMES = {
  'synonym-match': { bank: SYNONYM_BANDS, prompt: (q) => (q.kind === 'fit' ? `fit:${q.text}` : `${q.kind}:${q.word}`) },
  'sentence-gap': { bank: GAP_BANDS, prompt: (q) => q.text },
  'idiom-sense': { bank: IDIOM_BANDS, prompt: (q) => q.phrase },
  'sound-alike': { bank: SOUND_BANDS, prompt: (q) => q.text }
};

/* The fewest items a band must hold at each level. Classes 1–5 play difficulty 1 (2 at the expert stage), so their
   level 3 is a short stretch; the older bands use all three. */
const MIN = {
  foundation: { 1: 12, 2: 10, 3: 4, total: 30 },
  developing: { 1: 12, 2: 10, 3: 4, total: 30 },
  intermediate: { 1: 10, 2: 10, 3: 10, total: 30 },
  analytical: { 1: 10, 2: 10, 3: 10, total: 30 },
  advanced: { 1: 10, 2: 10, 3: 10, total: 30 }
};

const norm = (s) => String(s).trim().toLowerCase();

for (const [game, { bank, prompt }] of Object.entries(GAMES)) {
  for (const band of VOCAB_BANDS) {
    test(`${game} / ${band}: enough items at each level`, () => {
      const items = bank[band];
      assert.ok(Array.isArray(items), 'bank exists');
      assert.ok(items.length >= MIN[band].total, `${items.length} items`);
      for (const level of [1, 2, 3]) {
        const n = items.filter((q) => q.level === level).length;
        assert.ok(n >= MIN[band][level], `level ${level}: ${n} items`);
      }
      for (const q of items) assert.ok([1, 2, 3].includes(q.level), `${prompt(q)} level ${q.level}`);
    });

    test(`${game} / ${band}: one correct answer, no duplicate options`, () => {
      for (const q of bank[band]) {
        const options = [q.answer, ...q.wrong].map(norm);
        assert.ok(q.answer && q.wrong.length >= (band === 'foundation' ? 1 : 1), `${prompt(q)} has options`);
        assert.equal(options.filter((o) => o === norm(q.answer)).length, 1, `${prompt(q)}: answer listed once`);
        assert.equal(new Set(options).size, options.length, `${prompt(q)}: duplicate option`);
        if (band === 'foundation') assert.ok(q.wrong.length >= 1 && q.wrong.length <= 2, `${prompt(q)}: three choices at most`);
        if ('text' in q) assert.equal(q.text.split('___').length, 2, `${prompt(q)}: exactly one gap`);
      }
    });

    test(`${game} / ${band}: no duplicate prompts`, () => {
      const seen = new Set();
      for (const q of bank[band]) {
        const key = norm(prompt(q));
        assert.ok(!seen.has(key), `duplicate prompt: ${prompt(q)}`);
        seen.add(key);
      }
    });
  }
}

test('young bands come with pictures', () => {
  for (const { bank } of Object.values(GAMES)) {
    for (const q of bank.foundation) assert.ok(q.picture, `foundation item without a picture: ${q.word || q.text || q.phrase}`);
  }
});

test('every young-band sound-alike word has a meaning for the "why"', () => {
  for (const band of ['foundation', 'developing', 'intermediate', 'analytical']) {
    for (const q of SOUND_BANDS[band]) {
      for (const w of [q.answer, ...q.wrong]) assert.ok(SOUND_MEANING[w] || SOUND_MEANING[w.toLowerCase()], `${band}: no meaning for "${w}"`);
    }
  }
});

test('no band plays as analytical', () => {
  assert.equal(bandOrDefault(null), 'analytical');
  assert.equal(bandOrDefault('foundation'), 'foundation');
});
