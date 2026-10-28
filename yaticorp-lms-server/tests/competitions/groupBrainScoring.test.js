/**
 * Group Brain, part 3: what a finished room game leaves behind, and what the
 * dashboards, leaderboards, admin and certificates do with it. Everything
 * through the API, as a student and as the super admin.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const M = require('../../src/competitions/groupbrain/models');
const results = require('../../src/competitions/groupbrain/results');
const { engine } = require('../../src/competitions/games');

let app, p, boss, bossCall, plainAdmin;
const ids = () => p.map((x) => x.user._id);

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    p = [];
    for (const name of ['Gb Asha', 'Gb Ravi', 'Gb Meera']) {
        const u = await makeUser(name);
        u.call = app.call(u.token);
        p.push(u);
    }
    boss = await makeAdmin('Gb Super');
    await require('../../src/models/Admin').updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    bossCall = app.call(boss.token);
    plainAdmin = await makeAdmin('Gb Plain');
    await M.GroupBrainSettings.deleteMany({});
});
after(async () => {
    const users = ids();
    await PlayGame.deleteMany({ 'seats.userId': { $in: users } });
    await Promise.all(Object.values(M).map((m) => m.deleteMany({ $or: [{ userId: { $in: users } }, { adminId: boss.admin._id }, { createdBy: boss.admin._id }, { key: 'main' }] })));
    await require('../../src/rewards/models').XpTransaction.deleteMany({ userId: { $in: users } });
    await require('../../src/models/Admin').deleteMany({ _id: { $in: [boss.admin._id, plainAdmin.admin._id] } });
    await cleanup(p.map((x) => x.user), app.server);
});

/** A room of `game` with players `who` (host first), started. */
const startRoom = async (game, who, difficulty = 'easy') => {
    const made = await who[0].call('POST', '/rooms', { game, options: { difficulty } });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const id = made.body.game.id;
    for (const x of who.slice(1)) {
        assert.equal((await x.call('POST', '/rooms/join', { code: made.body.game.code })).status, 200);
        await x.call('POST', `/play/${id}/ready`, { ready: true });
    }
    const s = await who[0].call('POST', `/play/${id}/start`);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    return id;
};

describe('scores and results', () => {
    test('a finished game is recorded once per player, with XP paid once, and the result page shows it', async () => {
        const id = await startRoom('wordlogic', [p[0], p[1]]);
        const over = await p[1].call('POST', `/play/${id}/action`, { action: { type: 'resign' } });
        assert.equal(over.body.game.status, 'finished');
        assert.ok(over.body.game.result, 'the player who ended it sees their result at once');
        const rows = await M.GroupBrainResult.find({ gameId: id }).lean();
        assert.equal(rows.length, 2);
        const win = rows.find((r) => String(r.userId) === String(p[0].user._id));
        assert.equal(win.won, true);
        assert.equal(win.skill, 'reasoning');
        assert.equal(win.xpStatus, 'paid');
        assert.equal(win.xp, 100, 'won because the other left: 100 XP');
        assert.match(win.reason, /left the game, so .* won/);
        const resigned = rows.find((r) => String(r.userId) === String(p[1].user._id));
        assert.equal(resigned.resigned, true);
        assert.equal(resigned.xp, 0, 'resigning pays no XP');

        // Recording again — a second server, a retry — changes nothing and pays nothing.
        await PlayGame.updateOne({ _id: id }, { $set: { recordedAt: null } });
        await results.record(await PlayGame.findById(id));
        assert.equal(await M.GroupBrainResult.countDocuments({ gameId: id }), 2);
        const { XpTransaction } = require('../../src/rewards/models');
        assert.equal(await XpTransaction.countDocuments({ userId: p[0].user._id, source: 'group_brain', refId: String(id) }), 1);

        const page = (await p[0].call('GET', `/play/${id}`)).body.game;
        assert.equal(page.result.xp, win.xp);
        assert.match(page.outcome.reason, /left the game, so/, 'the page says who left');
    });

    test('chess: both ratings move by Elo, and the chess board ranks them', async () => {
        const id = await startRoom('chess', [p[0], p[1]], 'medium');
        await p[1].call('POST', `/play/${id}/action`, { action: { type: 'resign' } });
        const [a, b] = await Promise.all([p[0], p[1]].map((x) => M.GroupBrainProfile.findOne({ userId: x.user._id }).lean()));
        assert.equal(a.chessRating, 1216);
        assert.equal(b.chessRating, 1184);
        const r = await M.GroupBrainResult.findOne({ gameId: id, userId: p[0].user._id }).lean();
        assert.deepEqual([r.ratingBefore, r.ratingAfter], [1200, 1216]);
        const board = (await p[0].call('GET', '/rooms/leaderboard?type=chess')).body;
        assert.equal(board.me.rating, 1216);
    });

    test('answers faster than a person can are flagged; the XP waits for an admin, who approves or voids', async () => {
        // A Number Logic game played to the end with every answer right in 50 ms.
        const e = engine('numberlogic');
        let s = e.create([{ name: 'A', side: 0 }, { name: 'B', side: 1 }], { questionCount: 5 }, { now: 0, rng: Math.random });
        for (let t = s.phaseEndsAt; s.status === 'active';) {
            s = e.tick(s, { now: t, rng: Math.random });
            if (s.phase === 'question') {
                s = e.act(s, 0, { type: 'answer', choice: s.questions[s.index].answer }, { now: s.phaseStartedAt + 50, rng: Math.random });
                s = e.act(s, 1, { type: 'answer', choice: (s.questions[s.index].answer + 1) % 4 }, { now: s.phaseStartedAt + 3000, rng: Math.random });
            }
            t = s.phaseEndsAt || t;
        }
        const g = await PlayGame.create({ kind: 'room', game: 'numberlogic', status: 'finished', state: s, outcome: e.outcome(s), finishedAt: new Date(), seats: [{ userId: p[0].user._id, name: 'Gb Asha', side: 0 }, { userId: p[2].user._id, name: 'Gb Meera', side: 1 }] });
        await results.record(g);
        const row = await M.GroupBrainResult.findOne({ gameId: g._id, userId: p[0].user._id }).lean();
        assert.deepEqual(row.flags, ['answers-too-fast']);
        assert.equal(row.xpStatus, 'held');
        assert.equal(row.correct, 5);

        const flagged = (await bossCall('GET', '/group-brain/admin/results?flagged=1')).body.results;
        assert.ok(flagged.some((x) => x.id === String(row._id)));
        assert.equal((await bossCall('POST', `/group-brain/admin/results/${row._id}/approve`, {})).status, 400, 'a reason is required');
        const ok = await bossCall('POST', `/group-brain/admin/results/${row._id}/approve`, { reason: 'Checked: a quick student' });
        assert.equal(ok.body.result.xpStatus, 'paid');
        const voided = await bossCall('POST', `/group-brain/admin/results/${row._id}/void`, { reason: 'Second look: shared answers' });
        assert.equal(voided.body.result.voided, true);
        assert.equal(voided.body.result.xpStatus, 'reversed');
        const audit = (await bossCall('GET', '/group-brain/admin/audit')).body.audit;
        assert.ok(audit.some((a) => a.action === 'result.void' && a.reason === 'Second look: shared answers'));
    });
});

describe('dashboard, leaderboards, achievements and certificates', () => {
    test('the dashboard comes from the records: totals, games, Brain Performance Score, rating, achievements', async () => {
        const d = (await p[0].call('GET', '/rooms/profile')).body;
        assert.ok(d.played >= 2 && d.wins >= 2);
        assert.equal(d.games.length, 11);
        assert.equal(d.chess.rating, 1216);
        assert.ok(d.brain.bps >= 0 && d.brain.bps <= 100);
        assert.match(d.brain.note, /not an IQ score/);
        assert.deepEqual(d.brain.skills.map((x) => x.skill), ['memory', 'reasoning', 'spatial', 'strategy']);
        assert.equal(d.achievements.length, 0, 'no achievements are handed out by themselves');
    });

    test('weekly, game and XP leaderboards', async () => {
        const week = (await p[0].call('GET', '/rooms/leaderboard?period=week')).body;
        assert.ok(week.me && week.me.wins >= 2);
        const one = (await p[0].call('GET', '/rooms/leaderboard?game=wordlogic')).body;
        assert.equal(one.me.wins, 1);
        const xp = (await p[0].call('GET', '/rooms/leaderboard?type=xp')).body;
        assert.ok(xp.me.xp > 0);
        assert.equal((await p[0].call('GET', '/rooms/leaderboard?type=nope')).status, 400);
    });

    test('a rule met issues a certificate once; it downloads, verifies by ID, and an admin can revoke and reissue it', async () => {
        await bossCall('PUT', '/group-brain/admin/settings', { certificateRules: [{ key: 'wins_2', title: 'Two Wins', line: 'for winning two Group Brain games', type: 'wins', threshold: 2 }], reason: 'test rule' });
        await bossCall('POST', `/group-brain/admin/eligibility/${p[0].user._id}`);
        await bossCall('POST', `/group-brain/admin/eligibility/${p[0].user._id}`);
        const certs = await M.GroupBrainCertificate.find({ userId: p[0].user._id, ruleKey: 'wins_2' }).lean();
        assert.equal(certs.length, 1, 'never twice');
        const { certId } = certs[0];
        assert.match(certId, /^GB-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

        const dl = await p[0].call('GET', `/rooms/certificates/${certId}`);
        assert.equal(dl.status, 200, 'the PDF downloads');
        assert.equal((await p[1].call('GET', `/rooms/certificates/${certId}`)).status, 404, 'only its holder');

        const v = (await app.call(null)('GET', `/group-brain/verify/${certId}`)).body;
        assert.equal(v.valid, true);
        assert.equal(v.name, 'Gb Asha Student');
        assert.equal((await app.call(null)('GET', '/group-brain/verify/GB-NOPE-NOPE')).body.found, false);

        const re = await bossCall('POST', `/group-brain/admin/certificates/${certId}/reissue`, { reason: 'name corrected' });
        assert.equal(re.status, 200, JSON.stringify(re.body));
        assert.equal((await app.call(null)('GET', `/group-brain/verify/${certId}`)).body.status, 'revoked');
        const next = re.body.certificate.certId;
        assert.equal((await bossCall('POST', `/group-brain/admin/certificates/${next}/revoke`, { reason: 'test' })).status, 200);
        assert.equal((await p[0].call('GET', `/rooms/certificates/${next}`)).status, 410, 'a revoked one is not handed out');
        await bossCall('POST', `/group-brain/admin/eligibility/${p[0].user._id}`);
        assert.equal(await M.GroupBrainCertificate.countDocuments({ userId: p[0].user._id, ruleKey: 'wins_2', status: 'valid' }), 0, 'a revoked award is not reissued by itself');
    });

    test('a tournament is finalised once: standings kept, XP and certificates to the top three', async () => {
        const t = (await bossCall('POST', '/group-brain/admin/tournaments', { name: 'Test Cup', startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000), rewards: [50, 20, 10] })).body.tournament;
        assert.equal(t.status, 'live');
        assert.equal((await bossCall('POST', `/group-brain/admin/tournaments/${t.id}/finalize`, {})).status, 409, 'not before it ends');
        const done = await bossCall('POST', `/group-brain/admin/tournaments/${t.id}/finalize`, { force: true });
        assert.equal(done.status, 200, JSON.stringify(done.body));
        assert.ok(done.body.tournament.standings.length >= 1);
        assert.equal((await bossCall('POST', `/group-brain/admin/tournaments/${t.id}/finalize`, { force: true })).status, 409, 'once');
        const winner = done.body.tournament.standings[0];
        assert.equal(await M.GroupBrainCertificate.countDocuments({ userId: winner.userId, ruleKey: `tournament:${t.id}` }), 1);
    });
});

describe('admin settings and permissions', () => {
    test('only the super admin manages Group Brain', async () => {
        assert.equal((await p[0].call('GET', '/group-brain/admin/overview')).status, 401);
        assert.equal((await app.call(plainAdmin.token)('GET', '/group-brain/admin/overview')).status, 403);
        const o = await bossCall('GET', '/group-brain/admin/overview');
        assert.equal(o.status, 200);
        assert.ok('waiting' in o.body && 'flagged' in o.body);
    });

    test('a game switched off cannot be played; a difficulty not allowed is refused', async () => {
        await bossCall('PUT', '/group-brain/admin/settings', { games: { sudoku: { enabled: false, difficulties: ['hard'] }, memorymatrix: { enabled: true, difficulties: ['easy'] } } });
        assert.equal((await p[2].call('POST', '/rooms', { game: 'sudoku' })).status, 403);
        assert.equal((await p[2].call('POST', '/rooms', { game: 'memorymatrix', options: { difficulty: 'hard' } })).status, 400);
        const games = (await p[2].call('GET', '/rooms/games')).body.games;
        assert.equal(games.find((g) => g.id === 'sudoku').enabled, false);
        await bossCall('PUT', '/group-brain/admin/settings', { games: { sudoku: { enabled: true, difficulties: ['easy', 'medium', 'hard'] }, memorymatrix: { enabled: true, difficulties: ['easy', 'medium', 'hard'] } } });
    });

    test('an admin\'s own question is checked, and joins the game', async () => {
        assert.equal((await bossCall('POST', '/group-brain/admin/questions', { game: 'wordlogic', prompt: 'Bad one', options: ['a', 'a', 'b', 'c'], answer: 0 })).status, 400);
        const q = await bossCall('POST', '/group-brain/admin/questions', { game: 'wordlogic', prompt: 'Which is a fruit? (admin test)', options: ['Mango', 'Carrot', 'Potato', 'Onion'], answer: 0 });
        assert.equal(q.status, 201);
        const id = await startRoom('wordlogic', [p[2], p[1]], 'easy');
        const g = await PlayGame.findById(id).lean();
        assert.ok(g.state.questions.some((x) => x.prompt === 'Which is a fruit? (admin test)'), 'mixed into the game');
        await p[1].call('POST', `/play/${id}/action`, { action: { type: 'resign' } });
        await bossCall('DELETE', `/group-brain/admin/questions/${q.body.question._id}`);
    });

    test('an admin closes a room, and it is audited', async () => {
        const made = await p[2].call('POST', '/rooms', { game: 'sequence' });
        const id = made.body.game.id;
        assert.ok((await bossCall('GET', '/group-brain/admin/rooms?status=waiting')).body.rooms.some((r) => r.id === id));
        assert.equal((await bossCall('POST', `/group-brain/admin/rooms/${id}/close`, { reason: 'test' })).status, 200);
        assert.equal((await p[2].call('GET', `/play/${id}`)).body.game.status, 'abandoned');
        assert.equal(await M.GroupBrainResult.countDocuments({ gameId: id }), 0, 'a closed room records nothing');
    });
});
