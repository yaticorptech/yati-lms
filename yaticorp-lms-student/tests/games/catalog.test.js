import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { CATALOG, EXTRA, SECTIONS, CATEGORIES, gamesIn, sectionForClass } = await import('../../src/career/components/games/catalog.js');

// The server's whitelist is the list of games that really exist.
const serverIds = fs.readFileSync(new URL('../../../yaticorp-lms-server/src/career/data/gameIds.js', import.meta.url), 'utf8');
const EXISTING = [...serverIds.slice(serverIds.indexOf('GAME_IDS = '), serverIds.indexOf(serverIds.includes('// The 84 games') ? '// The 84 games' : ']);')).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);

test('3 sections × 4 categories × 7 games = 84', () => {
  assert.equal(CATALOG.length, 84);
  for (const s of SECTIONS) for (const c of CATEGORIES) assert.equal(gamesIn(s.key, c.key).length, 7, `${s.key}/${c.key}`);
});

test('no id or title twice: each game belongs to one section', () => {
  assert.equal(new Set(CATALOG.map((g) => g.id)).size, 84);
  assert.equal(new Set(CATALOG.map((g) => g.title)).size, 84);
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
const RETIRED = new Set(['scale-balance', 'logic-detective', 'match-back']); // Match Back: its Dual-Stream Memory removed 2026-11-16 // Logic Detective: removed by the user, 2026-11-16
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
