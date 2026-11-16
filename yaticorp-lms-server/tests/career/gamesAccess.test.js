/**
 * Brain games end to end (2026-11-14): who may play what by registered class, a class retyped to jump zones, data
 * integrity on save, and the game performance page.
 *
 *   Class 4 → Young Thinkers, Class 8 → Rising Brains, Class 12 → Master Minds, no class → every section open.
 *   Every section is open (2026-11-14): the student's own zone is 'recommended', any other zone (lower or higher) is
 *   'available' and playable — saved, and rooms in it made and joined. A class raised in Career Path moves the games
 *   zone (which section is recommended) one zone per academic year at most; the rest waits for an administrator.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, makeAdmin, unlockGroupGames, startApp, cleanup } = require('../helpers');

let career, comp, users = [], admins = [];
let young, smart, master, unknown;
const GameProgress = () => require('../../src/career/models/GameProgress');
const GameStarEvent = () => require('../../src/career/models/GameStarEvent');
const Goal = () => require('../../src/career/models/Goal');
const PlayGame = () => require('../../src/competitions/models/PlayGame');

const LEVEL = {
    4: 'Primary School (Class 1–5)', 8: 'Middle School (Class 6–8)', 12: 'Higher Secondary (Class 11–12)'
};
const student = async (label, cls, { rooms = false } = {}) => {
    const s = await makeUser(label);
    users.push(s.user);
    if (rooms) await unlockGroupGames(s.user._id);
    if (cls) await Goal().collection.insertOne({ userId: s.user._id, educationLevel: LEVEL[cls], currentClass: `Class ${cls}`, careerGoal: 'Engineer' });
    const api = career.call(s.token);
    await api('POST', '/games/time', { seconds: 20 });
    return { ...s, api, rooms: comp.call(s.token) };
};

before(async () => {
    await connect();
    career = startApp({ mount: '/api/career', router: require('../../src/career') });
    comp = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    young = await student('Young', 4, { rooms: true });
    smart = await student('Smart', 8, { rooms: true });
    master = await student('Master', 12, { rooms: true });
    unknown = await student('NoClass', null);
});
after(async () => {
    const ids = users.map((u) => u._id);
    await PlayGame().deleteMany({ $or: [{ 'seats.userId': { $in: ids } }, { kind: 'room', hostId: { $in: ids } }] });
    await new Promise((r) => comp.server.close(r));
    await cleanup(users, career.server, admins);
});

describe('zone and access by registered class', () => {
    test('GET /games/zone: Class 4 young, Class 8 smart, Class 12 master, no class null', async () => {
        const z = async (s) => (await s.api('GET', '/games/zone')).body;
        assert.deepEqual([(await z(young)).zone, (await z(smart)).zone, (await z(master)).zone, (await z(unknown)).zone], ['young', 'smart', 'master', null]);
        assert.equal((await z(smart)).band, 'intermediate');
        assert.equal((await z(smart)).held, false);
    });

    test('GET /games/access: own section recommended, every other section (lower and upper) available', async () => {
        const s = async (u) => (await u.api('GET', '/games/access')).body.sections;
        const st = (sec) => Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v.status]));
        assert.deepEqual(st(await s(young)), { young: 'recommended', smart: 'available', master: 'available' });
        assert.deepEqual(st(await s(smart)), { young: 'available', smart: 'recommended', master: 'available' });
        assert.deepEqual(st(await s(master)), { young: 'available', smart: 'available', master: 'recommended' });
        assert.deepEqual(st(await s(unknown)), { young: 'available', smart: 'available', master: 'available' });
        for (const u of [young, smart, master, unknown]) {
            const sec = await s(u);
            for (const z of ['young', 'smart', 'master']) assert.equal(sec[z].canPlay, true, `${z} playable`);
        }
    });
});

describe('saving progress by section', () => {
    const save = (s, gameId, extra = {}) => s.api('POST', '/games/progress', { gameId, level: 2, stars: { 1: 3 }, ...extra });

    test('own, lower and upper sections all save', async () => {
        assert.equal((await save(young, 'whats-missing')).status, 200, 'young own');
        assert.equal((await save(smart, 'sequence-vault')).status, 200, 'smart own');
        assert.equal((await save(smart, 'animal-pair-safari')).status, 200, 'smart lower');
        assert.equal((await save(master, 'animal-pair-safari')).status, 200, 'master lower');
        assert.equal((await save(master, 'matrix-recall')).status, 200, 'master own');

        for (const [s, gameId] of [[young, 'sequence-vault'], [young, 'matrix-recall'], [smart, 'matrix-recall']]) {
            const r = await save(s, gameId);
            assert.equal(r.status, 200, `${gameId}: ${r.body.message}`);
            assert.equal(await GameProgress().countDocuments({ userId: s.user._id, gameId, starTotal: { $gt: 0 } }), 1, `${gameId} saved`);
            assert.ok(await GameStarEvent().countDocuments({ userId: s.user._id, gameId }) > 0, `${gameId} star event`);
        }
    });

    test('an upper-section save does not change the student zone (own still recommended)', async () => {
        const r = (await young.api('GET', '/games/access')).body;
        assert.equal(r.zone, 'young');
        assert.equal(r.sections.young.status, 'recommended');
        assert.equal(r.sections.master.status, 'available');
    });

    test('classic games outside the 84 are not age-restricted; no class saves anywhere', async () => {
        assert.equal((await save(young, 'code-breaker')).status, 200);
        assert.equal((await save(unknown, 'decision-theory-arena')).status, 200);
    });

    test('unknown game 400; a level jump is cut to one level', async () => {
        assert.equal((await save(smart, 'iq-booster')).status, 400);
        const stars = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [String(i + 1), 3]));
        // (The room students hold every game at level 501 for the group-game unlocks: a fresh Class 8 student here.)
        const fresh = await student('Jump', 8);
        const r = await fresh.api('POST', '/games/progress', { gameId: 'grid-navigator', level: 61, stars });
        assert.equal(r.status, 200);
        assert.equal(r.body.level, 2);
        assert.deepEqual(Object.keys(r.body.stars).sort(), ['1', '2']);
    });

    test('the adaptive record is stored bounded', async () => {
        const now = Date.now();
        const sessions = Array.from({ length: 30 }, (_, i) => ({ at: now - i * 1000, perf: 9, accuracy: 900, stars: 7, ms: -1 }));
        const r = await save(smart, 'focus-filter', { stats: { stage: 'expert', sessions } });
        assert.equal(r.status, 200);
        const doc = await GameProgress().findOne({ userId: smart.user._id, gameId: 'focus-filter' }).lean();
        assert.equal(doc.stats.sessions.length, 12);
        assert.ok(doc.stats.sessions.every((s) => s.perf === 1 && s.accuracy === 100 && s.stars === 3 && s.ms === 0));
    });
});

describe('group rooms by section', () => {
    test('making a room in an upper zone is allowed', async () => {
        const r = await young.rooms('POST', '/rooms', { game: 'memorymatrix', zone: 'master' });
        assert.equal(r.status, 201, r.body.message);
        assert.equal(r.body.game.zone, 'master');
        await PlayGame().updateOne({ _id: r.body.game.id }, { $set: { status: 'abandoned' } });
    });

    test('joining an upper-zone room by code is allowed; a lower one too', async () => {
        const made = await master.rooms('POST', '/rooms', { game: 'memorymatrix', options: { players: 4 } });
        assert.equal(made.status, 201, made.body.message);
        const up = await smart.rooms('POST', '/rooms/join', { code: made.body.game.code });
        assert.equal(up.status, 200, up.body.message);
        assert.equal(up.body.zoneLocked, undefined);
        await PlayGame().updateOne({ _id: made.body.game.id }, { $set: { status: 'abandoned' } });

        const low = await young.rooms('POST', '/rooms', { game: 'memorymatch', options: { players: 4 } });
        assert.equal(low.status, 201, low.body.message);
        const yes = await master.rooms('POST', '/rooms/join', { code: low.body.game.code });
        assert.equal(yes.status, 200, yes.body.message);
        await PlayGame().updateOne({ _id: low.body.game.id }, { $set: { status: 'abandoned' } });
    });

    test('an invalid room code gets a proper error', async () => {
        const bad = await smart.rooms('POST', '/rooms/join', { code: 'ab' });
        assert.equal(bad.status, 400);
        assert.match(bad.body.message, /6-character room code/);
        const none = await smart.rooms('POST', '/rooms/join', { code: 'QQQQQ9' });
        assert.equal(none.status, 404);
    });
});

describe('a class retyped to jump zones', () => {
    test('roadmap takes the new class; the games zone moves one zone per academic year, the rest waits for an admin', async () => {
        const s = await student('Tamper', null);
        const goal = (body) => s.api('PUT', '/goals', body);
        const zone = async () => (await s.api('GET', '/games/zone')).body;

        const made = await s.api('POST', '/goals', { educationLevel: LEVEL[4], currentClass: 'Class 4', careerGoal: 'Doctor' });
        assert.equal(made.status, 201, made.body.message);
        assert.equal((await zone()).zone, 'young');

        // Class 4 → Class 12: accepted for the roadmap, games zone held.
        assert.equal((await goal({ educationLevel: LEVEL[12], currentClass: 'Class 12' })).status, 200);
        assert.equal((await s.api('GET', '/goals')).body.currentClass, 'Class 12');
        let z = await zone();
        assert.equal(z.zone, 'young');
        assert.equal(z.held, true);
        assert.equal(z.pending.zone, 'master');
        // The held zone still decides what is recommended; Master Minds is open for practice, not recommended.
        let sec = (await s.api('GET', '/games/access')).body.sections;
        assert.equal(sec.young.status, 'recommended');
        assert.equal(sec.master.status, 'available');
        assert.equal((await s.api('POST', '/games/progress', { gameId: 'matrix-recall', level: 2, stars: { 1: 3 } })).status, 200);
        assert.equal((await zone()).zone, 'young', 'playing upward does not move the zone');

        // One zone up (a promotion, or a typo fixed): allowed, once this academic year.
        await goal({ educationLevel: LEVEL[8], currentClass: 'Class 8' });
        assert.equal((await zone()).zone, 'smart');
        // Down: at once. Back up: the year's step is used.
        await goal({ educationLevel: LEVEL[4], currentClass: 'Class 4' });
        assert.equal((await zone()).zone, 'young');
        await goal({ educationLevel: LEVEL[8], currentClass: 'Class 8' });
        z = await zone();
        assert.equal(z.zone, 'young');
        assert.equal(z.pending.zone, 'smart');

        // Deleting the goal does not make the class "unknown" (every section open).
        assert.equal((await s.api('DELETE', '/goals')).status, 200);
        assert.equal((await zone()).zone, 'young');
        sec = (await s.api('GET', '/games/access')).body.sections;
        assert.equal(sec.young.status, 'recommended', 'held zone still recommended, not the all-available of no class');
        assert.equal(sec.smart.status, 'available');

        // An administrator confirms the held change.
        const a = await makeAdmin('Zone');
        admins.push(a.admin);
        const adminApi = career.call(a.token);
        assert.equal((await s.api('POST', `/admin/game-zone/${s.user._id}/confirm`)).status, 401, 'not a student');
        const ok = await adminApi('POST', `/admin/game-zone/${s.user._id}/confirm`);
        assert.equal(ok.status, 200, ok.body.message);
        assert.equal(ok.body.zone.zone, 'smart');
        assert.equal((await zone()).zone, 'smart');
        assert.equal((await adminApi('POST', `/admin/game-zone/${s.user._id}/confirm`)).status, 404);
        const hist = (await adminApi('GET', `/admin/game-zone/${s.user._id}`)).body.history;
        assert.deepEqual(hist.map((h) => h.to), ['young', 'smart', 'young', 'smart']);
        assert.match(hist.at(-1).by, /^admin/);
    });
});

describe('GET /games/performance', () => {
    test('individual and group apart; achievements from the seeded records', async () => {
        const s = await student('Perf', 8);
        const DAY = 86400000;
        const now = Date.now();
        const at = (daysAgo, h = 0) => now - daysAgo * DAY - h * 3600000;
        const mem = [[60, 100, 4], [70, 120, 3], [95, 150, 2], [92, 140, 1], [91, 160, 0]].map(([accuracy, score, d]) => ({ at: at(d), accuracy, score, perf: accuracy / 100, stars: 3, passed: true, stage: 'medium' }));
        const logic = [40, 50, 55].map((accuracy, i) => ({ at: at(10, i), accuracy, score: 10, perf: accuracy / 100, stars: 1, passed: true, stage: 'easy' }));
        await GameProgress().create([
            { userId: s.user._id, gameId: 'memory-match', level: 11, cleared: 10, starTotal: 30, stars: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), 3])), stats: { stage: 'medium', sessions: mem, best: null } },
            { userId: s.user._id, gameId: 'next-in-sequence', level: 3, cleared: 2, starTotal: 3, stars: { 1: 2, 2: 1 }, stats: { stage: 'easy', sessions: logic, best: null } }
        ]);
        await GameStarEvent().insertMany(Array.from({ length: 10 }, (_, i) => ({ userId: s.user._id, gameId: 'memory-match', level: i + 1, stars: 3, first: true, createdAt: new Date(at(4 - Math.floor(i / 2), -1)) })));
        const { GroupBrainResult } = require('../../src/competitions/groupbrain/models');
        await GroupBrainResult.create([[1, true], [2, false], [4, false]].map(([place, won], i) => ({
            gameId: new mongoose.Types.ObjectId(), userId: s.user._id, name: 'Perf', game: 'memorymatch', skill: 'memory',
            players: 4, place, won, score: 50 + i, correct: 5, total: 6, performance: 70, finishedAt: new Date(at(i))
        })));

        const r = await s.api('GET', '/games/performance');
        assert.equal(r.status, 200, r.body.message);
        const p = r.body;
        assert.deepEqual(Object.keys(p), ['zone', 'band', 'individual', 'group', 'achievements']);
        assert.equal(p.zone, 'smart');

        // Individual: solo records only.
        assert.equal(p.individual.played, 2);
        assert.equal(p.individual.completed, 12);
        assert.equal(p.individual.stars, 33);
        assert.deepEqual(p.individual.categories.memory, {
            played: 1, completed: 10, stars: 30, accuracy: 82, trend: [60, 70, 95, 92, 91],
            best: { gameId: 'memory-match', title: 'Memory Match', stars: 30 }
        });
        assert.equal(p.individual.categories.logic.accuracy, 48);
        assert.deepEqual(p.individual.strengths, ['memory']);
        assert.deepEqual(p.individual.practice, ['logic']);
        const mm = p.individual.games.find((g) => g.gameId === 'memory-match');
        assert.deepEqual({ ...mm, lastPlayed: typeof mm.lastPlayed }, {
            gameId: 'memory-match', title: 'Memory Match', section: 'young', category: 'memory', level: 11, stars: 30,
            attempts: 5, accuracy: 82, lastScore: 160, bestScore: 160, lastPlayed: 'string'
        });
        assert.equal(p.individual.history.length, 10);
        assert.equal(p.individual.history[0].level, 10, 'newest first');
        assert.equal(p.individual.history[0].stars, 3);

        // Group: Group Brain results only.
        assert.deepEqual({ ...p.group, recent: p.group.recent.length }, { played: 3, wins: 1, podiums: 2, winRate: 33, recent: 3 });

        const ach = Object.fromEntries(p.achievements.map((a) => [a.key, a]));
        for (const k of ['first-game', 'memory-champion', 'accuracy-streak', 'personal-best', 'consistency-champion', 'multiplayer-challenger', 'category-specialist']) {
            assert.equal(ach[k].earned, true, k);
            assert.ok(ach[k].at, `${k} has a date`);
        }
        for (const k of ['logic-explorer', 'word-master', 'number-ninja']) assert.equal(ach[k].earned, false, k);
        assert.deepEqual(ach['logic-explorer'].progress, { have: 3, need: 30 });
        assert.equal(ach['accuracy-streak'].title, 'Accuracy Streak');
        assert.ok(!JSON.stringify(p).match(/\bIQ\b/));
    });

    test('a student with nothing played: zeros and nothing earned', async () => {
        const r = await unknown.api('GET', '/games/performance');
        assert.equal(r.status, 200);
        assert.ok(r.body.achievements.every((a) => a.earned === (a.key === 'first-game')), 'only the one saved level counts');
        assert.equal(r.body.group.played, 0);
    });
});
