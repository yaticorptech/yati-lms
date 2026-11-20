import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { CATALOG, EXTRA, SECTIONS, CATEGORIES, gamesIn, sectionForClass } = await import('../../src/career/components/games/catalog.js');

// The server's whitelist is the list of games that really exist.
const serverIds = fs.readFileSync(new URL('../../../yaticorp-lms-server/src/career/data/gameIds.js', import.meta.url), 'utf8');
const EXISTING = [...serverIds.slice(serverIds.indexOf('GAME_IDS = '), serverIds.indexOf(serverIds.includes('// The 84 games') ? '// The 84 games' : ']);')).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);

// 2026-11-18 (the user): Master Minds' maths trimmed to one game; every other category keeps seven.
// Games per section and category, as the user has trimmed them (latest 2026-11-20: WORDCRAFT added to Master Minds vocabulary).
const SIZE = (s, c) => ({ master: { math: 4, logic: 5, memory: 5, vocab: 6 }, smart: {} }[s]?.[c] ?? (s === 'smart' ? 6 : 7));
const TOTAL = SECTIONS.reduce((n, s) => n + CATEGORIES.reduce((m, c) => m + SIZE(s.key, c.key), 0), 0);
test('3 sections × 4 categories, seven games each (Master Minds maths: one)', () => {
  assert.equal(CATALOG.length, TOTAL);
  for (const s of SECTIONS) for (const c of CATEGORIES) assert.equal(gamesIn(s.key, c.key).length, SIZE(s.key, c.key), `${s.key}/${c.key}`);
});

test('no id or title twice: each game belongs to one section', () => {
  assert.equal(new Set(CATALOG.map((g) => g.id)).size, TOTAL);
  assert.equal(new Set(CATALOG.map((g) => g.title)).size, TOTAL);
});

test('ready games exist; split/extend come from an existing game; new ids are not taken', () => {
  for (const g of CATALOG) {
    if (g.status === 'ready') assert.ok(EXISTING.includes(g.id), g.id);
    else if (g.status === 'new') assert.ok(!EXISTING.includes(g.id), g.id);
    else assert.ok(EXISTING.includes(g.from) && !EXISTING.includes(g.id), g.id);
  }
});

// Retired with the game built on it (2026-11-16: Clue Chain, built on Scale Balance, was replaced by Penguin Slide).
// The server still accepts the id, so old records stay valid.
const RETIRED = new Set(['water-sort', 'pixel-logic', 'brain-heist', 'semantic-precision', 'word-lock', 'emoji-phrase', 'star-trail', 'tile-slide', 'light-beam', 'path-painter', 'ice-glide', 'tower-shift', 'matrix-recall', 'fraction-match', 'emoji-equations', 'pattern-recall', 'number-forge', 'binary-blitz', 'rounding-rush', 'scale-balance', 'logic-detective', 'match-back', 'deduction', 'probability-lab', 'algorithm-builder', 'spin-match', 'quick-compare', 'cipher-challenge']); // 2026-11-17: Master Minds' hard games removed (Spatial Rotation Vault was built on Spin Match) // Match Back: its Dual-Stream Memory removed 2026-11-16 // Logic Detective: removed by the user, 2026-11-16
test('every existing game is either placed or kept as an extra', () => {
  const placed = new Set(CATALOG.filter((g) => g.status === 'ready').map((g) => g.id));
  for (const id of EXISTING) assert.ok(placed.has(id) || EXTRA.includes(id) || CATALOG.some((g) => g.from === id) || RETIRED.has(id), id);
});

test('class → section', () => {
  assert.equal(sectionForClass(1), 'young');
  assert.equal(sectionForClass(5), 'young');
  assert.equal(sectionForClass(6), 'smart');
  assert.equal(sectionForClass(10), 'smart');
  assert.equal(sectionForClass(11), 'master');
  assert.equal(sectionForClass(12), 'master');
  assert.equal(sectionForClass(null), null);
});

test('all 84 are on the games page, with a component, how-to-play steps and a server id', async () => {
  const hub = fs.readFileSync(new URL('../../src/career/pages/dashboard/Games.jsx', import.meta.url), 'utf8');
  const { GAME_COACH } = await import('../../src/career/components/games/gameCoach.js');
  const allIds = [...serverIds.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
  for (const g of CATALOG) {
    const m = new RegExp(`\\{ id: '${g.id}',[^}]*Component: (\\w+) \\}`).exec(hub);
    assert.ok(m, `${g.id} not on the games page`);
    assert.ok(fs.existsSync(new URL(`../../src/career/components/games/${m[1]}.jsx`, import.meta.url)), `${g.id}: ${m[1]}.jsx missing`);
    assert.ok(GAME_COACH[g.id]?.steps?.length, `${g.id} has no how-to-play steps`);
    assert.ok(allIds.includes(g.id), `${g.id} not accepted by the server`);
  }
});
