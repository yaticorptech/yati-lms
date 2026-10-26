/**
 * The real games, through the real service: a competition match's game for
 * Chess and each brain game — opened, joined by both players — and a first
 * move made from what the view offers. Ludo and Carrom were retired on
 * 2026-10-24: a game opened before then still plays. (Friendly rooms, and UNO,
 * were removed on 2026-10-23; the last test checks they are gone.)
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const { openMatchGame } = require('../../src/competitions/services/gameService');

let app, a, b, outsider;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    a = await makeUser('Player A'); a.call = app.call(a.token);
    b = await makeUser('Player B'); b.call = app.call(b.token);
    outsider = await makeUser('Not In It'); outsider.call = app.call(outsider.token);
});
after(async () => {
    await PlayGame.deleteMany({ 'seats.userId': { $in: [a.user._id, b.user._id] } });
    await cleanup([a.user, b.user, outsider.user], app.server);
});

/** A started two-player match game of `game`, as the bracket opens one, both players joined. */
const start = async (game) => {
    const id = () => new mongoose.Types.ObjectId();
    const teams = [a, b].map((p) => ({ _id: id(), players: [{ userId: p.user._id, name: p.user.name }] }));
    const row = await openMatchGame({ competition: { _id: id(), game, playersPerSide: 1, gameOptions: {} }, match: { _id: id(), sides: teams.map((t) => ({ teamId: t._id, lineup: [] })) }, teams });
    const gameId = String(row._id);
    const seatCode = (p) => row.seats.find((s) => String(s.userId) === String(p.user._id)).code;
    assert.equal((await a.call('POST', `/play/${gameId}/join`, { code: seatCode(a) })).status, 200);
    const joined = await b.call('POST', `/play/${gameId}/join`, { code: seatCode(b) });
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    assert.equal(joined.body.game.status, 'active', 'it starts once both are there');
    return gameId;
};
const as = async (who, id) => (await who.call('GET', `/play/${id}`)).body.game;
const common = (g) => {
    for (const k of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message']) assert.ok(k in g.view, `the view has ${k}`);
    assert.equal(g.view.seats.length, 2);
};
const mover = (g) => (g.view.turn === g.you ? 'me' : 'other');

describe('the real games, in competition matches', () => {
    test('chess: White moves from the legal moves the view offers', async () => {
        const id = await start('chess');
        const white = await as(a, id);
        common(white);
        assert.equal(white.view.turn, 0);
        assert.ok(white.view.legalMoves.length === 20, 'twenty opening moves');
        const black = await as(b, id);
        assert.deepEqual(black.view.legalMoves, [], 'none for the side not to move');
        const [m] = white.view.legalMoves;
        const r = await a.call('POST', `/play/${id}/action`, { action: { type: 'move', from: m.from, to: m.to } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await as(b, id)).view.turn, 1, 'Black to move');
        const wrong = await a.call('POST', `/play/${id}/action`, { action: { type: 'move', from: 'e2', to: 'e4' } });
        assert.equal(wrong.status, 400, 'not White\'s turn now');
    });

    for (const game of ['rapidfire', 'codeclash', 'brainsprint']) {
        test(`${game}: both players answer the same question; the answer only shows once it closes`, async () => {
            const id = await start(game);
            const first = await as(a, id);
            common(first);
            assert.equal(first.view.phase, 'ready', 'a countdown first');
            // Skip the countdown, as if its time had come.
            const past = Date.now() - 1;
            await PlayGame.updateOne({ _id: id }, { $set: { nextDeadline: new Date(past), 'state.phaseEndsAt': past } });
            const g = await as(a, id);
            assert.equal(g.view.phase, 'question');
            assert.equal(g.view.canAnswer, true);
            assert.equal(g.view.answer, null, 'the answer is not sent while the question is open');
            assert.equal(g.view.question.options.length, 4);
            const ra = await a.call('POST', `/play/${id}/action`, { action: { type: 'answer', choice: 0 } });
            assert.equal(ra.status, 200, JSON.stringify(ra.body));
            const again = await a.call('POST', `/play/${id}/action`, { action: { type: 'answer', choice: 1 } });
            assert.equal(again.status, 400, 'one answer a question');
            const seenByB = await as(b, id);
            const rb = await b.call('POST', `/play/${id}/action`, { action: { type: 'answer', choice: 1 } });
            assert.equal(seenByB.view.answers[0]?.choice, undefined, 'B cannot see A\'s choice');
            assert.equal(rb.status, 200, JSON.stringify(rb.body));
            const shown = await as(b, id);
            if (game === 'rapidfire') {
                // Nothing about right or wrong until the end: straight on to question 2.
                assert.equal(shown.view.phase, 'question');
                assert.equal(shown.view.number, 2);
                assert.equal(shown.view.answer, null);
                assert.equal(shown.view.scores, null);
            } else {
                assert.equal(shown.view.phase, 'reveal');
                assert.ok(Number.isInteger(shown.view.answer.index));
            }
            const resign = await b.call('POST', `/play/${id}/action`, { action: { type: 'resign' } });
            assert.equal(resign.status, 200);
            assert.equal(resign.body.game.status, 'finished');
            assert.deepEqual(resign.body.game.outcome.places.length, 2);
        });
    }

    test('ludo, opened before it was retired: the player to move rolls', async () => {
        const id = await start('ludo');
        const g = await as(a, id);
        common(g);
        const who = mover(g) === 'me' ? a : b;
        const r = await who.call('POST', `/play/${id}/action`, { action: { type: 'roll' } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(r.body.game.view.dice >= 1 && r.body.game.view.dice <= 6);
    });

    test('carrom, opened before it was retired: the player to shoot takes a shot and everyone sees it replayed', async () => {
        const id = await start('carrom');
        const g = await as(a, id);
        common(g);
        const who = mover(g) === 'me' ? a : b;
        const r = await who.call('POST', `/play/${id}/action`, { action: { type: 'shoot', position: 0.5, angle: 0, power: 0.6 } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const other = await as(who === a ? b : a, id);
        assert.ok(other.view.lastShot?.frames?.length > 0, 'the shot\'s frames are there to animate');
    });

    test('a turn that times out is played by the server when anyone looks', async () => {
        const id = await start('ludo');
        const before = await as(a, id);
        // Ludo keeps the turn's end in state.deadline; the service mirrors it in nextDeadline.
        const past = Date.now() - 1000;
        await PlayGame.updateOne({ _id: id }, { $set: { nextDeadline: new Date(past), 'state.deadline': past } });
        const after = await as(b, id);
        assert.ok(after.version > before.version, 'the timeout moved the game on');
    });
});

describe('joining codes, one per player (asked 2026-10-24)', () => {
    test('each player has their own code: it joins them; another player\'s is refused; the match code no longer joins', async () => {
        const id = () => new mongoose.Types.ObjectId();
        const teams = [a, b].map((p) => ({ _id: id(), players: [{ userId: p.user._id, name: p.user.name }] }));
        const row = await openMatchGame({ competition: { _id: id(), game: 'chess', playersPerSide: 1, gameOptions: {} }, match: { _id: id(), sides: teams.map((t) => ({ teamId: t._id, lineup: [] })) }, teams });
        const [codeA, codeB] = row.seats.map((s) => s.code);
        assert.match(codeA, /^[A-Z2-9]{6}$/);
        assert.notEqual(codeA, codeB);
        const alerts = (await a.call('GET', '/alerts')).body.alerts;
        assert.ok(alerts.some((x) => x.gameId === String(row._id) && x.code === codeA), 'the pop-up has my code');
        assert.ok(!JSON.stringify(alerts).includes(codeB), 'and never the other player\'s');
        assert.equal((await a.call('POST', '/matches/join', { code: codeB })).status, 403, 'someone else\'s code');
        assert.equal((await outsider.call('POST', '/matches/join', { code: codeA })).status, 403);
        assert.equal((await a.call('POST', '/matches/join', { code: row.code })).status, 403, 'the match code alone does not join');
        const mine = await a.call('POST', '/matches/join', { code: codeA.toLowerCase() });
        assert.equal(mine.status, 200); assert.equal(mine.body.game.id, String(row._id));
        const g = (await a.call('GET', `/play/${row._id}`)).body.game;
        assert.equal(g.code, codeA, 'the game shows me my own code');
        assert.equal(g.joined, true, 'joined by typing it');
        assert.ok(!(await a.call('GET', '/alerts')).body.alerts.some((x) => x.gameId === String(row._id)), 'joined: no more pop-up');
        assert.equal((await outsider.call('GET', `/play/${row._id}`)).body.game.code, null, 'a spectator sees no code');
        assert.equal((await a.call('POST', '/matches/join', { code: 'ZZZZZ9' })).status, 404);
        assert.equal((await a.call('POST', '/matches/join', { code: 'abc' })).status, 400);
        await PlayGame.updateOne({ _id: row._id }, { $set: { status: 'finished' } });
        assert.equal((await b.call('POST', '/matches/join', { code: codeB })).status, 409, 'a match that is over');
    });

    test('a match game opened before codes existed is given one when it is listed', async () => {
        const { withCodes } = require('../../src/competitions/services/gameService');
        const old = await PlayGame.create({ kind: 'match', game: 'ludo', seats: [{ userId: a.user._id, name: 'A', side: 0 }] });
        const [row] = await withCodes([await PlayGame.findById(old._id).select('status code kind').lean()]);
        assert.match(row.code, /^[A-Z2-9]{6}$/);
        assert.equal((await PlayGame.findById(old._id).lean()).code, row.code, 'saved');
    });
});

describe('playing with friends, and UNO, are gone', () => {
    test('no rooms to make, join or list; UNO is not offered; a friendly game saved before answers 410', async () => {
        assert.equal((await a.call('POST', '/rooms', { game: 'chess' })).status, 404);
        assert.equal((await a.call('POST', '/rooms/join', { code: 'ABCDEF' })).status, 404);
        assert.equal((await a.call('GET', '/rooms/mine')).status, 404);
        const games = (await a.call('GET', '/games')).body.games.map((g) => g.id);
        assert.deepEqual(games, ['chess', 'rapidfire', 'codeclash', 'brainsprint'], 'Ludo and Carrom gave way to the brain games (a match of theirs made before still plays, above); a quiz and a hackathon are challenges, not games');
        const old = await PlayGame.create({ kind: 'friendly', game: 'uno', code: 'OLD123', hostId: a.user._id, seats: [{ userId: a.user._id, name: 'A', side: 0, joinedAt: new Date() }] });
        const r = await a.call('GET', `/play/${old._id}`);
        assert.equal(r.status, 410); assert.match(r.body.message, /no longer available/);
        assert.equal((await a.call('POST', `/play/${old._id}/action`, { action: { type: 'draw' } })).status, 410);
    });
});
