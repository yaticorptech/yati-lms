/**
 * POST /api/career/games/progress — the account's copy of a brain game.
 *
 * Games are scored in the browser and the server pays XP for the stars, so
 * this route was a way to mint XP: any slug was a "game", any of ninety
 * levels could be starred in one request, and the daily play-time gate only
 * counted heartbeats a script simply never sent. A read-merge-save also let
 * two saves racing on one level both log the same stars, and two first saves
 * of a new game collide on the unique index and answer 500.
 *
 * These pin the rules that replaced it: real game ids only, one level further
 * per request, nothing banked or paid before play time is counted today, and
 * concurrent saves that count every star exactly once.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, users = [];
before(async () => {
    await connect();
    app = startApp({ mount: '/api/career', router: require('../../src/career') });
});
after(async () => { await cleanup(users, app.server); });

/** A fresh student and their bound API, so no test leans on another's state. */
const student = async (label) => {
    const s = await makeUser(label);
    users.push(s.user);
    return { ...s, api: app.call(s.token) };
};

/** One heartbeat, so today's play time is above zero. */
const playFor = (api, seconds = 20) => api('POST', '/games/time', { seconds });

const GameProgress = () => require('../../src/career/models/GameProgress');
const GameStarEvent = () => require('../../src/career/models/GameStarEvent');
const XpTransaction = () => require('../../src/rewards/models/XpTransaction');
const xpFor3 = async () => (await require('../../src/rewards/services/configService').getConfig()).games.xpThreeStars;

describe('which games the server accepts', () => {
    test('the whitelist is exactly the games the student hub renders', () => {
        const hub = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'yaticorp-lms-student', 'src', 'career', 'pages', 'dashboard', 'Games.jsx'), 'utf8');
        const client = [...hub.matchAll(/\{ id: '([a-z0-9-]+)'/g)].map((m) => m[1]).sort();
        const { GAME_IDS } = require('../../src/career/data/gameIds');
        assert.ok(client.length >= 40, `found only ${client.length} games in Games.jsx`);
        assert.deepEqual([...GAME_IDS].sort(), client, 'data/gameIds.js has drifted from the games hub');
    });

    test('an invented game id is refused, however plausible it looks', async () => {
        const { api } = await student('GamesId');
        await playFor(api);
        const r = await api('POST', '/games/progress', { gameId: 'xp-farm', level: 2, stars: { 1: 3 } });
        assert.equal(r.status, 400);
        assert.equal(await GameProgress().countDocuments({ gameId: 'xp-farm' }), 0);
    });
});

describe('play time before anything is banked', () => {
    test('with no play time counted today, nothing is saved and nothing is paid', async () => {
        const { api, user } = await student('GamesNoTime');
        const r = await api('POST', '/games/progress', { gameId: 'memory-match', level: 2, stars: { 1: 3 } });
        assert.equal(r.status, 200);
        assert.equal(r.body.xpAwarded, 0);
        assert.equal(r.body.deferred, 'no-play-time');
        assert.equal(r.body.level, 1);
        assert.deepEqual(r.body.stars, {});
        assert.equal(await GameProgress().countDocuments({ userId: user._id }), 0);
        assert.equal(await XpTransaction().countDocuments({ userId: user._id, source: 'game' }), 0);
    });

    test('once the page has sent a heartbeat, the same record is banked and paid', async () => {
        const { api, user } = await student('GamesTime');
        await api('POST', '/games/progress', { gameId: 'memory-match', level: 2, stars: { 1: 3 } });
        await playFor(api);
        const r = await api('POST', '/games/progress', { gameId: 'memory-match', level: 2, stars: { 1: 3 } });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.stars, { 1: 3 });
        assert.equal(r.body.level, 2);
        assert.equal(r.body.xpAwarded, await xpFor3());
        // And a replay at the same stars pays nothing.
        const again = await api('POST', '/games/progress', { gameId: 'memory-match', level: 2, stars: { 1: 3 } });
        assert.equal(again.body.xpAwarded, 0);
        assert.equal(await GameStarEvent().countDocuments({ userId: user._id }), 1);
    });
});

describe('how far one request can move a game', () => {
    test('a forged run of ninety three-star levels banks one level, not ninety', async () => {
        const { api, user } = await student('GamesForge');
        await playFor(api);
        const stars = Object.fromEntries(Array.from({ length: 89 }, (_, i) => [String(i + 1), 3]));
        const r = await api('POST', '/games/progress', { gameId: 'lights-out', level: 90, stars });
        assert.equal(r.status, 200);
        // A new game sits at level 1: stars on levels 1 and 2 at most, level 2.
        assert.deepEqual(Object.keys(r.body.stars).map(Number).sort((a, b) => a - b), [1, 2]);
        assert.equal(r.body.level, 2);
        assert.equal(r.body.xpAwarded, 2 * (await xpFor3()));
        const doc = await GameProgress().findOne({ userId: user._id, gameId: 'lights-out' }).lean();
        assert.equal(doc.starTotal, 6);
        assert.equal(doc.cleared, 1);
    });

    test('a browser that is honestly ahead catches up one level per push', async () => {
        const { api } = await student('GamesCatchUp');
        await playFor(api);
        // Played levels 1–5 offline: on level 6 with stars on 1–5.
        const local = { gameId: 'odd-one-out', level: 6, stars: { 1: 2, 2: 3, 3: 1, 4: 3, 5: 2 } };
        const levels = [];
        for (let i = 0; i < 6; i += 1) levels.push((await api('POST', '/games/progress', local)).body.level);
        assert.deepEqual(levels, [2, 3, 4, 5, 6, 6]);
        const r = await api('GET', '/games/progress');
        const game = r.body.games.find((g) => g.gameId === 'odd-one-out');
        assert.deepEqual(game.stars, local.stars);
    });

    test('stars on a level past the one the browser claims are ignored', async () => {
        const { api } = await student('GamesClaim');
        await playFor(api);
        const r = await api('POST', '/games/progress', { gameId: 'deduction', level: 1, stars: { 1: 2, 2: 3 } });
        assert.deepEqual(r.body.stars, { 1: 2 });
        assert.equal(r.body.level, 1);
    });

    test('the level never climbs past one beyond the highest starred level', async () => {
        const { api } = await student('GamesNoStars');
        await playFor(api);
        const r = await api('POST', '/games/progress', { gameId: 'clock-read', level: 40, stars: {} });
        assert.equal(r.body.level, 1);
    });
});

describe('saves that race', () => {
    test('concurrent first saves of one level all succeed and count its stars once', async () => {
        const { api, user } = await student('GamesRace');
        await playFor(api);
        const body = { gameId: 'tic-tac-toe', level: 2, stars: { 1: 3 } };
        const results = await Promise.all(Array.from({ length: 6 }, () => api('POST', '/games/progress', body)));
        for (const r of results) assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await GameProgress().countDocuments({ userId: user._id, gameId: 'tic-tac-toe' }), 1);
        const events = await GameStarEvent().find({ userId: user._id, gameId: 'tic-tac-toe' }).lean();
        assert.equal(events.reduce((n, e) => n + e.stars, 0), 3, 'three stars logged, once');
        const paid = results.reduce((n, r) => n + r.body.xpAwarded, 0);
        assert.equal(paid, await xpFor3(), 'XP paid once');
        const doc = await GameProgress().findOne({ userId: user._id, gameId: 'tic-tac-toe' }).lean();
        assert.equal(doc.starTotal, 3);
        assert.equal(doc.level, 2);
    });

    test('an improvement racing a lower save keeps the best and logs each star once', async () => {
        const { api, user } = await student('GamesRace2');
        await playFor(api);
        await Promise.all([
            api('POST', '/games/progress', { gameId: 'spin-match', level: 1, stars: { 1: 1 } }),
            api('POST', '/games/progress', { gameId: 'spin-match', level: 1, stars: { 1: 3 } }),
            api('POST', '/games/progress', { gameId: 'spin-match', level: 1, stars: { 1: 2 } })
        ]);
        const doc = await GameProgress().findOne({ userId: user._id, gameId: 'spin-match' }).lean();
        assert.equal(doc.stars['1'], 3);
        const events = await GameStarEvent().find({ userId: user._id, gameId: 'spin-match' }).lean();
        assert.equal(events.reduce((n, e) => n + e.stars, 0), 3);
    });
});
