/**
 * The brain games' age rules and data integrity, without a database (2026-11-14):
 *   - the server's catalogue (src/career/data/gameCatalog.js) is an exact copy of the student app's catalog.js;
 *   - zoneAccess.accessFor: own section recommended, every other section (lower and higher) available (2026-11-14);
 *   - gameZone.decide: the games zone held on the account against a retyped class;
 *   - gameController.cleanStats: every number bounded;
 *   - gamePerformance.buildPerformance: shape and achievements from stored data only.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

describe('server catalogue', () => {
    test('is identical to the student app catalog.js (ids, titles, sections, categories, EXTRA)', async () => {
        const file = path.join(__dirname, '..', '..', '..', 'yaticorp-lms-student', 'src', 'career', 'components', 'games', 'catalog.js');
        const client = await import(pathToFileURL(file).href);
        const server = require('../../src/career/data/gameCatalog');
        const pick = (g) => ({ id: g.id, title: g.title, section: g.section, category: g.category });
        assert.equal(server.CATALOG.length, 84);
        assert.deepEqual(server.CATALOG.map(pick), client.CATALOG.map(pick));
        assert.deepEqual([...server.EXTRA], [...client.EXTRA]);
        assert.deepEqual([...server.SECTIONS], client.SECTIONS.map((s) => s.key));
        assert.deepEqual([...server.CATEGORIES], client.CATEGORIES.map((c) => c.key));
    });

    test('every catalogue game is accepted by the server, and every accepted game has a category', () => {
        const { CATALOG, EXTRA, categoryOf } = require('../../src/career/data/gameCatalog');
        const { GAME_IDS, isGameId } = require('../../src/career/data/gameIds');
        assert.deepEqual([...CATALOG.map((g) => g.id), ...EXTRA].filter((id) => !isGameId(id)), []);
        assert.deepEqual(GAME_IDS.filter((id) => !categoryOf(id)), []);
    });
});

describe('access by age section (registered class decides)', () => {
    const { accessFor, canPlay } = require('../../src/competitions/services/zoneAccess');
    const expert = { stage: 'expert', sessions: Array.from({ length: 8 }, () => ({ perf: 1 })) };

    test('own → recommended, lower and higher → available (every section open, 2026-11-14)', () => {
        assert.equal(accessFor('smart', 'smart'), 'recommended');
        assert.equal(accessFor('smart', 'young'), 'available');
        assert.equal(accessFor('master', 'young'), 'available');
        assert.equal(accessFor('smart', 'master'), 'available');
        assert.equal(accessFor('young', 'master'), 'available');
        assert.equal(accessFor('young', 'smart'), 'available');
        for (const own of ['young', 'smart', 'master']) {
            for (const z of ['young', 'smart', 'master']) assert.equal(canPlay(accessFor(own, z)), true, `${own} → ${z}`);
        }
    });

    test('results do not change access: own is still recommended, a zone above still available', () => {
        assert.equal(accessFor('young', 'smart', expert), 'available');
        assert.equal(accessFor('young', 'master', expert), 'available');
        assert.equal(accessFor('smart', 'master', expert), 'available');
        assert.equal(accessFor('smart', 'smart', expert), 'recommended');
    });

    test('class unknown: every section available (documented); not a zone: locked', () => {
        for (const z of ['young', 'smart', 'master']) assert.equal(accessFor(null, z), 'available');
        assert.equal(accessFor('smart', 'giant'), 'locked');
    });
});

describe('the games zone held against a retyped class', () => {
    const { decide, zoneFor, academicYear } = require('../../src/career/services/gameZone');
    const cls = (n) => zoneFor({ educationLevel: 'Middle School (Class 6–8)', currentClass: `Class ${n}` });
    const lock = (n, extra = {}) => ({ ...cls(n), raisedInYear: null, pending: null, ...extra });

    test('academic year runs April–March', () => {
        assert.equal(academicYear(new Date(2026, 2, 31)), '2025');
        assert.equal(academicYear(new Date(2026, 3, 1)), '2026');
    });
    test('first class: held as it is', () => {
        const r = decide(cls(4), null, '2026');
        assert.equal(r.result.zone, 'young');
        assert.equal(r.change.kind, 'create');
    });
    test('down or within the zone: follows at once', () => {
        assert.equal(decide(cls(4), lock(8), '2026').result.zone, 'young');
        assert.equal(decide(cls(4), lock(8), '2026').change.kind, 'down');
        const same = decide(cls(9), lock(7), '2026');
        assert.equal(same.result.band, 'analytical');
        assert.equal(same.change.kind, 'same');
        assert.equal(decide(cls(7), lock(7), '2026').change, null);
    });
    test('up one zone: once per academic year', () => {
        const up = decide(cls(8), lock(4), '2026');
        assert.equal(up.result.zone, 'smart');
        assert.equal(up.change.kind, 'up');
        const again = decide(cls(8), lock(4, { raisedInYear: '2026' }), '2026');
        assert.equal(again.result.zone, 'young');
        assert.equal(again.result.held, true);
        assert.equal(again.result.pending.zone, 'smart');
        assert.equal(decide(cls(8), lock(4, { raisedInYear: '2026' }), '2027').result.zone, 'smart', 'next academic year');
    });
    test('up two zones at once: held, pending', () => {
        const r = decide(cls(12), lock(4), '2026');
        assert.equal(r.result.zone, 'young');
        assert.equal(r.result.pending.zone, 'master');
        assert.equal(r.change.kind, 'hold');
    });
    test('class removed: the held zone stays (never "unknown")', () => {
        const r = decide(zoneFor(null), lock(4), '2026');
        assert.equal(r.result.zone, 'young');
        assert.equal(r.result.held, true);
    });
});

describe('cleanStats bounds every number', () => {
    const { cleanStats } = require('../../src/career/controllers/gameController');
    test('out-of-range values are clamped, junk dropped, sessions capped', () => {
        const now = Date.now();
        const sessions = Array.from({ length: 40 }, (_, i) => ({
            at: now - (40 - i) * 1000, stage: 'godlike', stars: 9, perf: 5, accuracy: 500, ms: -50, limitMs: 1e12,
            correct: 2.7, wrong: -3, hints: 1e6, difficulty: 99, score: -1, passed: 'yes'
        }));
        sessions.push({ at: now + 1e10, perf: 1 }, { perf: 1 }, null, 'x', [1]);
        const out = cleanStats({ stage: 'expert', sessions, best: { score: 1e12, accuracy: -5, at: 1 } });
        assert.equal(out.sessions.length, 12);
        for (const s of out.sessions) {
            assert.equal(s.stars, 3); assert.equal(s.perf, 1); assert.equal(s.ms, 0); assert.equal(s.limitMs, 3600000);
            assert.equal(s.stage, 'medium'); assert.equal(s.passed, false); assert.equal(s.correct, 2); assert.equal(s.wrong, 0);
            assert.equal(s.hints, 99); assert.equal(s.difficulty, 4); assert.equal(s.score, 0);
            assert.ok(s.accuracy <= 100 && s.accuracy >= 0);
            assert.ok(s.at <= now + 60000);
        }
        assert.ok(out.sessions.every((s, i, a) => !i || a[i - 1].at <= s.at), 'time order');
        assert.equal(out.best.score, 1e7);
        assert.equal(out.best.accuracy, 0);
        assert.equal(out.best.at, null, 'a best dated before 2024 has no date');
        assert.equal(cleanStats({ sessions: 'no' }), null);
    });
    test('accuracy can never beat the answers it came from', () => {
        const out = cleanStats({ sessions: [{ at: Date.now(), correct: 1, wrong: 3, accuracy: 100 }] });
        assert.equal(out.sessions[0].accuracy, 25);
    });
});

describe('performance from stored data', () => {
    const { buildPerformance } = require('../../src/career/services/gamePerformance');
    test('an empty record: zeros, nothing earned, exact shape', () => {
        const p = buildPerformance({ zone: 'smart', band: 'intermediate' });
        assert.deepEqual(Object.keys(p), ['zone', 'band', 'individual', 'group', 'achievements']);
        assert.deepEqual(Object.keys(p.individual), ['played', 'completed', 'stars', 'categories', 'games', 'history', 'strengths', 'practice']);
        assert.deepEqual(Object.keys(p.individual.categories), ['memory', 'logic', 'vocab', 'math']);
        assert.deepEqual(p.individual.categories.memory, { played: 0, completed: 0, stars: 0, accuracy: null, trend: [], best: null });
        assert.deepEqual(p.group, { played: 0, wins: 0, podiums: 0, winRate: 0, recent: [] });
        assert.equal(p.achievements.length, 10);
        assert.ok(p.achievements.every((a) => a.earned === false && a.at === null && a.progress.have === 0 && a.progress.need > 0));
        assert.ok(!JSON.stringify(p).match(/\bIQ\b/));
    });
});
