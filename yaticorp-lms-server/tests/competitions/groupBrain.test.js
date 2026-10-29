/**
 * Group Brain rooms, through the API: make a room, share its code, join,
 * ready, start, play, and the history, leaderboard and profile after. Chess
 * takes exactly two; the group games up to four. A room is for the players
 * in it; codes and permissions are checked on the server.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');

let app, p;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    p = [];
    for (const name of ['Host Hana', 'Player Pia', 'Player Raj', 'Player Sam', 'Player Five']) {
        const u = await makeUser(name);
        u.call = app.call(u.token);
        p.push(u);
    }
});
after(async () => {
    await PlayGame.deleteMany({ 'seats.userId': { $in: p.map((x) => x.user._id) } });
    await PlayGame.deleteMany({ kind: 'room', hostId: { $in: p.map((x) => x.user._id) } });
    await cleanup(p.map((x) => x.user), app.server);
});

const make = async (who, game, difficulty = 'medium') => {
    const r = await who.call('POST', '/rooms', { game, options: { difficulty } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.game;
};
const leaveAll = async (id) => { for (const x of p) await x.call('POST', `/play/${id}/leave`); };

describe('Group Brain rooms', () => {
    test('the ten games are offered', async () => {
        const r = await p[0].call('GET', '/rooms/games');
        // The eleven, then the solo quiz games added 2026-10-29.
        assert.deepEqual(r.body.games.map((g) => g.id), ['chess', 'memorymatrix', 'patternmaster', 'numberlogic', 'wordlogic', 'sudoku', 'deduction', 'spatialiq', 'sequence', 'finalvault', 'lostkingdom', ...require('../../src/competitions/games/soloquiz').SOLO_QUIZ, ...require('../../src/competitions/games/race').RACE, ...require('../../src/competitions/games/turns').TURNS]);
        const chess = r.body.games.find((g) => g.id === 'chess');
        assert.deepEqual([chess.minSeats, chess.maxSeats], [2, 2]);
        // Every game for 2 to 6, but the ones for two (Chess, Tic-Tac-Toe, Last Stone).
        assert.ok(r.body.games.filter((g) => !['chess', 'tictactoe', 'laststone'].includes(g.id)).every((g) => g.maxSeats === 20));
        assert.ok(r.body.games.filter((g) => ['tictactoe', 'laststone'].includes(g.id)).every((g) => g.maxSeats === 2));
    });

    test('make, join with the code, ready, start: a 4-player Memory Matrix', async () => {
        const room = await make(p[0], 'memorymatrix', 'easy');
        assert.match(room.code, /^[A-Z0-9]{6}$/);
        assert.equal(room.status, 'waiting');
        assert.equal(room.host, true);
        assert.equal(room.options.difficulty, 'easy');

        // Not in it: no look inside without the code.
        assert.equal((await p[1].call('GET', `/play/${room.id}`)).status, 403);
        assert.equal((await p[1].call('POST', '/rooms/join', { code: 'ZZZZZZ' })).status, 404);
        assert.equal((await p[1].call('POST', '/rooms/join', { code: 'abc' })).status, 400);

        for (const x of p.slice(1, 4)) {
            const j = await x.call('POST', '/rooms/join', { code: room.code.toLowerCase() });
            assert.equal(j.status, 200, JSON.stringify(j.body));
        }
        const full = await p[4].call('POST', '/rooms/join', { code: room.code });
        assert.equal(full.status, 409, 'a fifth player is turned away');
        assert.match(full.body.message, /full/);

        // Only the host starts, and only once everyone is ready.
        assert.equal((await p[1].call('POST', `/play/${room.id}/start`)).status, 403);
        const early = await p[0].call('POST', `/play/${room.id}/start`);
        assert.equal(early.status, 400);
        assert.match(early.body.message, /Waiting for/);
        for (const x of p.slice(1, 4)) assert.equal((await x.call('POST', `/play/${room.id}/ready`, { ready: true })).status, 200);
        const lobby = (await p[2].call('GET', `/play/${room.id}`)).body.game;
        assert.equal(lobby.seats.length, 4);
        assert.ok(lobby.seats.every((s) => s.ready));
        assert.equal(lobby.code, room.code, 'everyone in the room sees its code');
        assert.equal(lobby.host, false);

        const started = await p[0].call('POST', `/play/${room.id}/start`);
        assert.equal(started.status, 200, JSON.stringify(started.body));
        assert.equal(started.body.game.status, 'active');
        assert.equal(started.body.game.view.seats.length, 4);
        assert.equal(started.body.game.view.phase, 'ready');
        // A started room takes nobody new, and nobody leaves it but by resigning.
        assert.equal((await p[4].call('POST', '/rooms/join', { code: room.code })).status, 409);
        assert.equal((await p[1].call('POST', `/play/${room.id}/leave`)).status, 409);

        // Skip the countdown and the memorising: every answer is checked on the server.
        const g = await PlayGame.findById(room.id);
        const past = Date.now() - 1;
        await PlayGame.updateOne({ _id: room.id }, { $set: { nextDeadline: new Date(past), 'state.phaseEndsAt': past } });
        let v = (await p[0].call('GET', `/play/${room.id}`)).body.game.view;
        assert.equal(v.phase, 'show');
        assert.ok(Array.isArray(v.round.cells));
        const cells = v.round.cells;
        await PlayGame.updateOne({ _id: room.id }, { $set: { nextDeadline: new Date(Date.now() - 1), 'state.phaseEndsAt': Date.now() - 1 } });
        v = (await p[1].call('GET', `/play/${room.id}`)).body.game.view;
        assert.equal(v.phase, 'answer');
        assert.equal(v.round.cells, null, 'the cells are hidden while answering');
        const bad = await p[1].call('POST', `/play/${room.id}/action`, { action: { type: 'answer', cells: [0] } });
        assert.equal(bad.status, 400);
        assert.match(bad.body.message, /exactly/);
        assert.equal((await p[0].call('POST', `/play/${room.id}/action`, { action: { type: 'answer', cells } })).status, 200);
        const seenByPia = (await p[1].call('GET', `/play/${room.id}`)).body.game.view;
        assert.deepEqual(seenByPia.answers[0], { answered: true }, 'another player\'s answer stays hidden');
        for (const x of p.slice(1, 4)) await x.call('POST', `/play/${room.id}/action`, { action: { type: 'resign' } });
        const over = (await p[0].call('GET', `/play/${room.id}`)).body.game;
        assert.equal(over.status, 'finished');
        assert.deepEqual(over.outcome.places[0], [0]);
        assert.ok(g);
    });

    test('history, leaderboard and profile count the finished room', async () => {
        const h = await p[0].call('GET', '/rooms/history');
        assert.equal(h.body.games[0].game, 'memorymatrix');
        assert.equal(h.body.games[0].won, true);
        const lb = await p[0].call('GET', '/rooms/leaderboard?game=memorymatrix');
        const me = lb.body.players.find((x) => x.userId === String(p[0].user._id));
        assert.ok(me && me.wins >= 1 && me.points >= 3);
        const prof = await p[0].call('GET', '/rooms/profile');
        assert.ok(prof.body.played >= 1 && prof.body.wins >= 1);
        assert.equal(prof.body.games.length, require('../../src/competitions/games').ROOM_GAMES.length);
        assert.equal((await p[0].call('GET', '/rooms/leaderboard?game=nope')).status, 400);
    });

    test('a room is for 2 to 20 players, as its maker picks; only that many join', async () => {
        assert.equal((await p[0].call('POST', '/rooms', { game: 'wordlogic', options: { players: 3 } })).status, 400, '3 is not a size');
        const two = (await p[0].call('POST', '/rooms', { game: 'wordlogic', options: { players: 2 } })).body.game;
        assert.equal(two.maxSeats, 2);
        assert.equal((await p[1].call('POST', '/rooms/join', { code: two.code })).status, 200);
        const third = await p[2].call('POST', '/rooms/join', { code: two.code });
        assert.equal(third.status, 409);
        assert.match(third.body.message, /full: it is for 2 players/);
        for (const x of [p[0], p[1]]) await x.call('POST', `/play/${two.id}/leave`);
        const six = (await p[0].call('POST', '/rooms', { game: 'numberlogic', options: { players: 6 } })).body.game;
        assert.equal(six.maxSeats, 6);
        for (const x of p.slice(1)) assert.equal((await x.call('POST', '/rooms/join', { code: six.code })).status, 200, 'a 5th player fits in a room for 6');
        for (const x of p) await x.call('POST', `/play/${six.id}/leave`);
        const ten = (await p[0].call('POST', '/rooms', { game: 'synonymmatch', options: { players: 10 } })).body.game;
        assert.equal(ten.maxSeats, 10, 'a room for 10');
        await p[0].call('POST', `/play/${ten.id}/leave`);
        assert.equal((await p[0].call('POST', '/rooms', { game: 'synonymmatch', options: { players: 24 } })).status, 400, '24 is too many');
    });

    test('leaving a game on: the rest play on, and the last one still in wins', async () => {
        const made = (await p[0].call('POST', '/rooms', { game: 'patternmaster', options: { players: 4 } })).body.game;
        for (const x of p.slice(1, 4)) { await x.call('POST', '/rooms/join', { code: made.code }); await x.call('POST', `/play/${made.id}/ready`, {}); }
        assert.equal((await p[0].call('POST', `/play/${made.id}/start`)).status, 200);
        await p[1].call('POST', `/play/${made.id}/action`, { action: { type: 'resign' } });
        assert.equal((await PlayGame.findById(made.id)).status, 'active', 'one leaves: the others play on');
        await p[0].call('POST', `/play/${made.id}/action`, { action: { type: 'resign' } });
        assert.equal((await PlayGame.findById(made.id)).status, 'active', 'two left: still on');
        await p[3].call('POST', `/play/${made.id}/action`, { action: { type: 'resign' } });
        const over = (await p[2].call('GET', `/play/${made.id}`)).body.game;
        assert.equal(over.status, 'finished');
        assert.equal(over.standings[0].name, 'Player Raj Student', 'the last one in wins');
        assert.equal(over.standings[0].xp, 100, 'won because the others left: 100 XP');
        assert.equal(over.standings.find((x) => x.name === 'Player Pia Student').xp, 0, 'leaving pays nothing');
    });

    test('chess: exactly two players', async () => {
        const room = await make(p[0], 'chess', 'hard');
        assert.equal((await p[0].call('POST', `/play/${room.id}/start`)).status, 400, 'not alone');
        assert.equal((await p[1].call('POST', '/rooms/join', { code: room.code })).status, 200);
        const third = await p[2].call('POST', '/rooms/join', { code: room.code });
        assert.equal(third.status, 409);
        assert.match(third.body.message, /full: it is for 2 players/);
        await p[1].call('POST', `/play/${room.id}/ready`, { ready: true });
        const s = await p[0].call('POST', `/play/${room.id}/start`);
        assert.equal(s.status, 200, JSON.stringify(s.body));
        assert.equal(s.body.game.view.seats.length, 2);
        assert.equal(s.body.game.view.legalMoves.length, 20);
        await p[1].call('POST', `/play/${room.id}/action`, { action: { type: 'resign' } });
    });

    test('one open room at a time; the host leaving hands the room on; the last out closes it', async () => {
        const room = await make(p[0], 'sudoku');
        const again = await p[0].call('POST', '/rooms', { game: 'wordlogic' });
        assert.equal(again.status, 409);
        assert.equal(again.body.roomId, room.id);
        assert.equal((await p[0].call('GET', '/rooms/mine')).body.room.id, room.id);
        assert.equal((await p[1].call('POST', '/rooms/join', { code: room.code })).status, 200);
        assert.equal((await p[0].call('POST', `/play/${room.id}/leave`)).status, 200);
        const now = (await p[1].call('GET', `/play/${room.id}`)).body.game;
        assert.equal(now.host, true, 'the next player in is the host');
        assert.equal(now.seats.length, 1);
        assert.equal((await p[0].call('GET', '/rooms/mine')).body.room, null);
        assert.equal((await p[1].call('POST', `/play/${room.id}/leave`)).status, 200);
        assert.equal((await PlayGame.findById(room.id)).status, 'abandoned');
        assert.equal((await p[2].call('POST', '/rooms/join', { code: room.code })).status, 410);
    });

    test('a room nobody starts closes by itself', async () => {
        const room = await make(p[3], 'sequence');
        await PlayGame.updateOne({ _id: room.id }, { $set: { joinDeadline: new Date(Date.now() - 1000) } });
        assert.equal((await p[3].call('GET', '/rooms/mine')).body.room, null);
        assert.equal((await PlayGame.findById(room.id)).status, 'abandoned');
        await leaveAll(room.id);
    });

    test('every game starts with its players and shows each of them the same round', async () => {
        const ids = (await p[0].call('GET', '/rooms/games')).body.games.map((g) => g.id).filter((id) => id !== 'chess' && !require('../../src/competitions/games/turns').TURNS.includes(id));
        for (const id of ids) {
            const room = await make(p[0], id, 'easy');
            for (const x of [p[1], p[2]]) { await x.call('POST', '/rooms/join', { code: room.code }); await x.call('POST', `/play/${room.id}/ready`, {}); }
            const s = await p[0].call('POST', `/play/${room.id}/start`);
            assert.equal(s.status, 200, `${id}: ${JSON.stringify(s.body)}`);
            assert.equal(s.body.game.view.seats.length, 3, id);
            for (const x of [p[1], p[2]]) await x.call('POST', `/play/${room.id}/action`, { action: { type: 'resign' } });
            assert.equal((await PlayGame.findById(room.id)).status, 'finished', id);
        }
    });
});
