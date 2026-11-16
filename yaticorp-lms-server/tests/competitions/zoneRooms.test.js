/**
 * Group rooms and online tables by age zone (2026-11-13, services/zoneGate.js): a room is made in a zone (the host's
 * own by default) and its difficulty follows the zone. Since 2026-11-14 every zone is open: the student's own zone is
 * recommended and any other (lower or higher) is available, so rooms in a higher zone can be made and joined, and a
 * higher online table taken. The registered class still decides the default zone of a room and of an online seat.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, unlockGroupGames, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const GameProgress = require('../../src/career/models/GameProgress');
const Goal = require('../../src/career/models/Goal');
const { closestTable } = require('../../src/competitions/services/onlineService');

let app, career, young, smart, master, smart2;

const student = async (label, currentClass, educationLevel) => {
    const u = await makeUser(label);
    await unlockGroupGames(u.user._id);
    // Straight into the collection: only the class matters here, not the rest of a Career Path goal.
    await Goal.collection.insertOne({ userId: u.user._id, educationLevel, currentClass });
    u.call = app.call(u.token);
    u.career = career.call(u.token);
    return u;
};
const expertStats = (n = 5, perf = 0.9) => ({ stage: 'expert', best: perf, sessions: Array.from({ length: n }, () => ({ perf })) });
const setStats = (u, gameId, stats) => GameProgress.updateOne({ userId: u.user._id, gameId }, { $set: { stats } }, { upsert: true });
const leave = (u, id) => u.call('POST', `/play/${id}/leave`);

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    career = startApp({ mount: '/api/career/games', router: require('../../src/career/routes/gameRoutes') });
    young = await student('Asha', 'Class 4', 'Primary School (Class 1–5)');
    smart = await student('Ravi', 'Class 8', 'Middle School (Class 6–8)');
    smart2 = await student('Meena', 'Class 9', 'High School (Class 9–10)');
    master = await student('Kiran', 'Class 12', 'Higher Secondary (Class 11–12)');
});
after(async () => {
    const all = [young, smart, smart2, master].filter(Boolean);
    const ids = all.map((x) => x.user._id);
    await PlayGame.deleteMany({ $or: [{ 'seats.userId': { $in: ids } }, { kind: 'room', hostId: { $in: ids } }] });
    await new Promise((r) => career.server.close(r));
    await cleanup(all.map((x) => x.user), app.server);
});

describe('Rooms by age zone', () => {
    test('GET /games/access: zone, readiness by solo game, and the group games of each zone', async () => {
        await setStats(young, 'memory-match', expertStats(3, 0.8));
        const r = await young.career('GET', '/access');
        assert.equal(r.status, 200);
        assert.equal(r.body.zone, 'young');
        assert.equal(r.body.source, 'class');
        assert.equal(r.body.readiness['memory-match'], 1);
        assert.deepEqual(r.body.groupZones.sudoku, ['smart']);
    });

    test('a Class 4 host makes a Young Thinkers room: easy, zone in the view', async () => {
        const r = await young.call('POST', '/rooms', { game: 'memorymatch', options: { players: 4 } });
        assert.equal(r.status, 201, r.body.message);
        assert.equal(r.body.game.zone, 'young');
        assert.equal(r.body.game.zoneName, 'Young Thinkers');
        assert.equal(r.body.game.options.zone, 'young');
        assert.equal(r.body.game.options.difficulty, 'easy');
        const mine = (await young.call('GET', '/rooms/mine')).body.room;
        assert.equal(mine.zone, 'young');

        // A smart student may join a young room: a zone below is practice.
        const j = await smart.call('POST', '/rooms/join', { code: r.body.game.code });
        assert.equal(j.status, 200, j.body.message);
        await leave(smart, r.body.game.id);
        await leave(young, r.body.game.id);
    });

    test('the zone wins over a difficulty that does not match it; a game not in the zone is refused', async () => {
        const r = await smart.call('POST', '/rooms', { game: 'finalvault', zone: 'young', options: { difficulty: 'hard' } });
        assert.equal(r.status, 201, r.body.message);
        assert.equal(r.body.game.options.difficulty, 'easy');
        await leave(smart, r.body.game.id);
        const no = await smart.call('POST', '/rooms', { game: 'sudoku', zone: 'young' });
        assert.equal(no.status, 403);
        assert.match(no.body.message, /Sudoku Challenge isn't played in Young Thinkers/);
        assert.equal((await smart.call('POST', '/rooms', { game: 'sequence', zone: 'giant' })).status, 400);
    });

    test('a young student can join a Master Minds room by code (every zone open); the room stays hard', async () => {
        const made = await master.call('POST', '/rooms', { game: 'finalvault', options: { players: 4 } });
        assert.equal(made.status, 201, made.body.message);
        assert.equal(made.body.game.zone, 'master');
        assert.equal(made.body.game.options.difficulty, 'hard');
        const code = made.body.game.code;

        const yes = await young.call('POST', '/rooms/join', { code });
        assert.equal(yes.status, 200, yes.body.message);
        assert.equal(yes.body.zoneLocked, undefined);

        // Smart, a zone below Master Minds, may join too.
        const k = await smart.call('POST', '/rooms/join', { code });
        assert.equal(k.status, 200, k.body.message);
        const room = (await master.call('GET', `/play/${made.body.game.id}`)).body.game;
        assert.equal(room.options.zone, 'master');
        assert.equal(room.options.difficulty, 'hard', 'the zone, not the joiners, sets the difficulty');
        await PlayGame.updateOne({ _id: made.body.game.id }, { $set: { status: 'abandoned' } });
    });

    test('a smart host can make a Master Minds room: hard, in the master zone', async () => {
        const r = await smart.call('POST', '/rooms', { game: 'deduction', zone: 'master' });
        assert.equal(r.status, 201, r.body.message);
        assert.equal(r.body.game.zone, 'master');
        assert.equal(r.body.game.options.difficulty, 'hard');
        await PlayGame.updateOne({ _id: r.body.game.id }, { $set: { status: 'abandoned' } });
    });

    test('an invalid room code is refused cleanly', async () => {
        const r = await smart.call('POST', '/rooms/join', { code: 'ZZ##1' });
        assert.ok([400, 404].includes(r.status), `status ${r.status}`);
        assert.ok(r.body.message);
        const none = await smart.call('POST', '/rooms/join', {});
        assert.ok([400, 404].includes(none.status));
    });
});

describe('Online tables by age zone', () => {
    test('seats are only matched within one zone; classes may differ inside it', async () => {
        const a = await smart.call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 });
        assert.equal(a.status, 200, a.body.message);
        const b = await master.call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 });
        assert.equal(b.status, 200, b.body.message);
        assert.notEqual(b.body.game.id, a.body.game.id, 'a Master Minds table, not the Smart one');
        const c = await smart2.call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 });
        assert.equal(c.body.game.id, a.body.game.id, 'Class 8 and Class 9 share a Rising Brains table');
        const t = (await smart.call('GET', `/play/${a.body.game.id}`)).body.game;
        assert.equal(t.options.zone, 'smart');
        assert.equal(t.options.difficulty, 'medium');

        // The master student may practise in Rising Brains: a separate seat at the smart table.
        const d = await master.call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0, zone: 'smart' });
        assert.equal(d.body.game.id, a.body.game.id);
        for (const [u, id] of [[smart, a], [smart2, a], [master, d]]) await leave(u, id.body.game.id);
    });

    test('a zone above is open online: a young student takes a seat at a Rising Brains table', async () => {
        const r = await young.call('POST', '/rooms/online', { game: 'spotthechange', players: 4, fee: 0, zone: 'smart' });
        assert.equal(r.status, 200, r.body.message);
        const t = (await young.call('GET', `/play/${r.body.game.id}`)).body.game;
        assert.equal(t.options.zone, 'smart');
        assert.equal(t.options.difficulty, 'medium');
        await leave(young, r.body.game.id);
    });

    test('of several open tables, the one closest in recent form is picked (oldest on a tie)', () => {
        const table = (id, perfs) => ({ id, seats: perfs.map((_, i) => ({ userId: `u${id}${i}` })), options: { perf: Object.fromEntries(perfs.map((p, i) => [`u${id}${i}`, p])) } });
        const tables = [table(1, [0.2, 0.3]), table(2, [0.8]), table(3, [0.85])];
        assert.equal(closestTable(tables, 0.9).id, 3);
        assert.equal(closestTable(tables, 0.1).id, 1);
        assert.equal(closestTable([table(1, [0.5]), table(2, [0.5])], 0.5).id, 1);
        assert.equal(closestTable([], 0.5), null);
    });
});
