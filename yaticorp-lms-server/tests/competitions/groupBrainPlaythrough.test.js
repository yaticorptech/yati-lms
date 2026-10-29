/**
 * Every Group Brain game, played to the end through the API by bots, with the
 * clock skipped forward instead of waited for. Each game has three players
 * (Chess two):
 *
 *   A  always answers right (reading the true answer from the stored game,
 *      as only a test can)
 *   B  answers right on the first question or round, then wrong
 *   C  never answers: every question times out on them
 *
 * Checked for every game: the answer is never sent while a question is open,
 * a second answer is refused, the game ends, A wins alone with 1st place's
 * XP, B beats C, each player's result is written once, and every player sees
 * the same final standings.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const { GroupBrainResult, GroupBrainSettings } = require('../../src/competitions/groupbrain/models');

let app, A, B, C;

before(async () => {
    await connect();
    await GroupBrainSettings.deleteMany({});
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    [A, B, C] = await Promise.all(['Bot Ace', 'Bot Bea', 'Bot Cal'].map(async (n) => { const u = await makeUser(n); u.call = app.call(u.token); return u; }));
});
after(async () => {
    const ids = [A, B, C].map((x) => x.user._id);
    await GroupBrainResult.deleteMany({ userId: { $in: ids } });
    await PlayGame.deleteMany({ 'seats.userId': { $in: ids } });
    await require('../../src/rewards/models').XpTransaction.deleteMany({ userId: { $in: ids } });
    await cleanup([A, B, C].map((x) => x.user), app.server);
});

const load = (id) => PlayGame.findById(id).lean();
/** Skip to the end of the current phase. */
const skip = (id) => PlayGame.updateOne({ _id: id }, { $set: { nextDeadline: new Date(Date.now() - 1), 'state.phaseEndsAt': Date.now() - 1 } });
const act = (who, id, action) => who.call('POST', `/play/${id}/action`, { action });
const poll = async (who, id) => (await who.call('GET', `/play/${id}`)).body.game;

const startRoom = async (game, players) => {
    const made = await players[0].call('POST', '/rooms', { game, options: { difficulty: 'easy' } });
    assert.equal(made.status, 201, `${game}: ${JSON.stringify(made.body)}`);
    const id = made.body.game.id;
    for (const x of players.slice(1)) {
        assert.equal((await x.call('POST', '/rooms/join', { code: made.body.game.code })).status, 200);
        assert.equal((await x.call('POST', `/play/${id}/ready`, { ready: true })).status, 200);
    }
    const s = await players[0].call('POST', `/play/${id}/start`);
    assert.equal(s.status, 200, `${game}: ${JSON.stringify(s.body)}`);
    return id;
};

/** A's right answer, B's (right the first time, then wrong), for the open question or round. */
const answers = (g) => {
    const s = g.state;
    if (Array.isArray(s.questions)) {
        const right = s.questions[s.index].answer;
        // B right on every other question: ahead of C (no answers) under +100 / −20 (2026-10-29), behind A.
        return { a: { type: 'answer', choice: right }, b: { type: 'answer', choice: s.index % 2 === 0 ? right : (right + 1) % s.questions[s.index].options.length } };
    }
    const r = s.current; const first = s.index === 0;
    if (g.game === 'memorymatrix') {
        const wrong = Array.from({ length: r.size * r.size }, (_, i) => i).filter((i) => !r.cells.includes(i)).slice(0, r.count);
        const bCells = first ? r.cells : wrong.length === r.count ? wrong : r.cells.slice(0, r.count - 1).concat(wrong).slice(0, r.count);
        return { a: { type: 'answer', cells: r.cells }, b: { type: 'answer', cells: bCells } };
    }
    if (g.game === 'sequence') {
        if (r.kind === 'reaction') return { a: { type: 'answer' }, b: { type: 'answer' } };
        return { a: { type: 'answer', sequence: r.sequence }, b: { type: 'answer', sequence: first ? r.sequence : r.sequence.map((x) => (x + 1) % r.items.length) } };
    }
    throw new Error(`no bot for ${g.game}`);
};

/** Play a quiz or round game to the end. */
const playRounds = async (id) => {
    let checkedHidden = false; let checkedTwice = false;
    for (let step = 0; step < 400; step += 1) {
        const g = await load(id);
        if (g.status === 'finished') return { checkedHidden, checkedTwice };
        const phase = g.state.phase;
        const open = phase === 'question' || phase === 'answer';
        // Not answered yet: a quiz keeps answers per question, a round game per round.
        const answered = Array.isArray(g.state.questions) ? !!g.state.answers[g.state.index]?.[0]?.length : !!g.state.answers?.[0];
        if (open && !answered) {
            const v = (await poll(B, id)).view;
            if (Array.isArray(g.state.questions)) { assert.equal(v.answer, null, 'no answer sent while open'); checkedHidden = true; }
            if (g.game === 'memorymatrix') { assert.equal(v.round.cells, null, 'cells hidden while answering'); checkedHidden = true; }
            const { a, b } = answers(g);
            const ra = await act(A, id, a);
            assert.equal(ra.status, 200, `${g.game} A: ${JSON.stringify(ra.body)}`);
            if (!checkedTwice) {
                const again = await act(A, id, a);
                assert.ok([400, 409].includes(again.status), `${g.game}: a second answer is refused (${again.status})`);
                checkedTwice = true;
            }
            if (b) {
                const rb = await act(B, id, b);
                assert.ok(rb.status === 200 || /next|over|Time/.test(rb.body.message || ''), `${g.game} B: ${JSON.stringify(rb.body)}`);
            }
        }
        await skip(id);
        await poll(A, id);     // applies the timeout, as a player's screen would
    }
    throw new Error('the game did not end');
};

describe('every Group Brain game, played to the end', () => {
    for (const game of ['memorymatrix', 'patternmaster', 'numberlogic', 'wordlogic', 'deduction', 'spatialiq', 'sequence']) {
        test(`${game}: A wins, B second, C last; XP by place; the same standings for everyone`, async () => {
            const id = await startRoom(game, [A, B, C]);
            const { checkedTwice } = await playRounds(id);
            assert.equal(checkedTwice, true);
            const rows = await GroupBrainResult.find({ gameId: id }).lean();
            assert.equal(rows.length, 3, 'one result per player');
            const by = (who) => rows.find((r) => String(r.userId) === String(who.user._id));
            assert.equal(by(A).place, 1, `${game}: A first (${rows.map((r) => `${r.name} ${r.place}/${r.score}`)})`);
            assert.equal(by(A).won, true);
            assert.ok(by(B).place < by(C).place, `${game}: B (${by(B).score}) above C (${by(C).score})`);
            assert.ok(by(A).score > by(B).score && by(B).score > by(C).score, `${game}: scores ${by(A).score} > ${by(B).score} > ${by(C).score}`);
            assert.deepEqual([by(A).xp, by(B).xp, by(C).xp], [50, 30, 20]);
            const seen = await Promise.all([A, B, C].map((x) => poll(x, id)));
            assert.ok(seen.every((g) => g.status === 'finished'));
            const names = seen.map((g) => g.standings.map((p) => `${p.place}:${p.name}:${p.xp}`).join('|'));
            assert.ok(names.every((n) => n === names[0]), 'everyone sees the same standings');
            assert.equal(seen[0].standings.find((p) => p.you).place, 1);
            assert.equal(seen[0].result.xp, 50);
        });
    }

    test('sudoku: A completes the board, B makes a mistake and stops, C leaves; places by points and XP', async () => {
        const id = await startRoom('sudoku', [A, B, C]);
        const g = await load(id);
        const empty = g.state.puzzle.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        const wrong = (i) => (g.state.solution[i] % 9) + 1;
        assert.equal((await act(B, id, { type: 'place', cell: empty[0], digit: g.state.solution[empty[0]] })).status, 200);
        assert.equal((await act(B, id, { type: 'place', cell: empty[1], digit: wrong(empty[1]) })).status, 200, 'a wrong number is a mistake, not an error');
        assert.equal((await act(B, id, { type: 'place', cell: empty[0], digit: g.state.solution[empty[0]] })).status, 400, 'a filled cell cannot be filled again');
        for (const i of empty) assert.equal((await act(A, id, { type: 'place', cell: i, digit: g.state.solution[i] })).status, 200);
        const mid = await poll(C, id);
        assert.equal(mid.view.players[0].finished, true);
        assert.equal(mid.view.board.filter(Boolean).length, g.state.puzzle.filter(Boolean).length, 'C sees only their own board');
        await act(C, id, { type: 'resign' });
        await PlayGame.updateOne({ _id: id }, { $set: { nextDeadline: new Date(Date.now() - 1), 'state.endsAt': Date.now() - 1 } });
        const over = await poll(B, id);
        assert.equal(over.status, 'finished');
        const rows = await GroupBrainResult.find({ gameId: id }).lean();
        const by = (who) => rows.find((r) => String(r.userId) === String(who.user._id));
        assert.equal(by(A).place, 1);
        assert.equal(by(A).xp, 50);
        assert.equal(by(C).xp, 0, 'leaving pays nothing');
        assert.ok(by(B).place < by(C).place);
    });

    test('chess: a legal game to checkmate (Scholar\'s mate); illegal and out-of-turn moves refused; ratings move', async () => {
        const id = await startRoom('chess', [A, B]);
        const g0 = await poll(A, id);
        const white = g0.view.you === 0 ? A : B; const black = white === A ? B : A;
        assert.equal((await act(black, id, { type: 'move', from: 'e7', to: 'e5' })).status, 400, 'not your turn');
        assert.equal((await act(white, id, { type: 'move', from: 'e2', to: 'e5' })).status, 400, 'an illegal move');
        for (const [who, from, to] of [[white, 'e2', 'e4'], [black, 'e7', 'e5'], [white, 'f1', 'c4'], [black, 'b8', 'c6'], [white, 'd1', 'h5'], [black, 'g8', 'f6'], [white, 'h5', 'f7']]) {
            const r = await act(who, id, { type: 'move', from, to });
            assert.equal(r.status, 200, `${from}-${to}: ${JSON.stringify(r.body)}`);
        }
        const end = await poll(black, id);
        assert.equal(end.status, 'finished');
        assert.match(end.outcome.reason, /Checkmate/i);
        const rows = await GroupBrainResult.find({ gameId: id }).lean();
        const w = rows.find((r) => String(r.userId) === String(white.user._id));
        assert.equal(w.place, 1);
        assert.equal(w.xp, 50);
        assert.ok(w.ratingAfter > w.ratingBefore);
        assert.equal(end.standings[0].name, w.name);
    });
});


describe('The Final Vault, raced to the end', () => {
    test('the same five chambers for everyone; wrong answers cost time and jam the lock; A opens the vault first and wins', async () => {
        const id = await startRoom('finalvault', [A, B, C]);
        await skip(id);
        await poll(A, id);
        const g = await load(id);
        assert.equal(g.state.phase, 'play');
        const stages = g.state.shared.stages;
        assert.equal(stages.length, 5);
        assert.deepEqual(stages.map((x) => x.kind), ['sequence', 'rings', 'code', 'mirrors', 'final']);
        // Everyone sees the same first chamber, and never its answer.
        const [va, vb, vc] = [(await poll(A, id)).view, (await poll(B, id)).view, (await poll(C, id)).view];
        assert.deepEqual(va.current, vb.current); assert.deepEqual(vb.current, vc.current);
        assert.equal(va.current.answer, undefined);
        assert.ok(!JSON.stringify(va).includes('"solution"'), 'no solution while it is on');
        // B: a wrong symbol — a penalty, and the lock jams; then right; a second click for that chamber is refused.
        const wrong = ['star', 'moon', 'sun', 'triangle'].find((x) => x !== stages[0].answer);
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: wrong })).status, 200);
        const jammed = await act(B, id, { type: 'solve', stage: 0, value: stages[0].answer });
        assert.equal(jammed.status, 400); assert.match(jammed.body.message, /resetting/);
        await PlayGame.updateOne({ _id: id }, { $set: { 'state.progress.1.jamUntil': 0 } });
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: stages[0].answer })).status, 200);
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: stages[0].answer })).status, 400, 'a double click');
        const bv = (await poll(B, id)).view;
        assert.equal(bv.me.stage, 1); assert.equal(bv.me.mistakes, 1); assert.equal(bv.me.penaltyMs, g.state.shared.penalty * 1000);
        assert.equal(bv.clues.length, 1, 'the lock key, collected');
        // A: every chamber, with each kind's own answer (the light path: a working mirror arrangement).
        for (let k = 0; k < 5; k += 1) {
            const r = await act(A, id, { type: 'solve', stage: k, value: stages[k].answer });
            assert.equal(r.status, 200, `chamber ${k + 1}: ${JSON.stringify(r.body)}`);
        }
        const av = (await poll(A, id)).view;
        assert.equal(av.me.done, true);
        assert.ok(av.times[0] > 0 && av.times[1] === null);
        // The rest run out of time.
        await skip(id);
        const over = await poll(C, id);
        assert.equal(over.status, 'finished');
        assert.equal(over.view.review.length, 5);
        const rows = await GroupBrainResult.find({ gameId: id }).lean();
        const by = (who) => rows.find((r) => String(r.userId) === String(who.user._id));
        assert.equal(by(A).place, 1); assert.equal(by(A).xp, 50);
        assert.ok(by(B).place < by(C).place, 'one chamber beats none');
        assert.ok(by(A).score >= 2000);
    });
});

describe('The Lost Kingdom, raced to the treasure', () => {
    test('the same five trials for everyone; wrong answers cost time; clues collected; A reaches the treasure first and wins', async () => {
        const id = await startRoom('lostkingdom', [A, B, C]);
        await skip(id);
        await poll(A, id);
        const g = await load(id);
        const stages = g.state.shared.stages;
        assert.deepEqual(stages.map((x) => x.title), ['The Broken Path', 'The Temple of Knowledge', 'The Bridge of Logic', 'The Code Mechanism', 'The Final Combination']);
        const [va, vb] = [(await poll(A, id)).view, (await poll(B, id)).view];
        assert.deepEqual(va.current, vb.current, 'the same first trial for everyone');
        assert.ok(!JSON.stringify(va).includes('"answer"'), 'no answers sent');
        // B: a wrong answer (a time penalty, the lock jams), then right. No hints are offered.
        assert.equal((await act(B, id, { type: 'hint', stage: 0 })).status, 400, 'no hints');
        const wrong = (stages[0].answer + 1) % stages[0].options.length;
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: wrong })).status, 200);
        let bv = (await poll(B, id)).view;
        assert.equal(bv.current.hints, undefined, 'no hints sent');
        assert.equal(bv.me.penaltyMs, g.state.shared.penalty * 1000);
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: stages[0].answer })).status, 400, 'jammed');
        await PlayGame.updateOne({ _id: id }, { $set: { 'state.progress.1.jamUntil': 0 } });
        assert.equal((await act(B, id, { type: 'solve', stage: 0, value: stages[0].answer })).status, 200);
        bv = (await poll(B, id)).view;
        assert.equal(bv.journal.length, 1); assert.ok(bv.journal[0].clue && bv.journal[0].relic, 'a clue and a relic');
        // A: all five, the last an order of symbols.
        for (let k = 0; k < 5; k += 1) {
            const r = await act(A, id, { type: 'solve', stage: k, value: stages[k].answer });
            assert.equal(r.status, 200, `trial ${k + 1}: ${JSON.stringify(r.body)}`);
        }
        assert.equal((await poll(A, id)).view.me.done, true);
        await skip(id);
        const over = await poll(C, id);
        assert.equal(over.status, 'finished');
        assert.equal(over.view.review.length, 5);
        const rows = await GroupBrainResult.find({ gameId: id }).lean();
        const by = (who) => rows.find((r) => String(r.userId) === String(who.user._id));
        assert.equal(by(A).place, 1);
        assert.ok(by(B).place < by(C).place);
    });
});
