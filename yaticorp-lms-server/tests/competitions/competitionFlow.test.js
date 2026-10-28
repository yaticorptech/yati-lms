/**
 * An inter-college competition from start to finish, through the API, with a
 * stand-in game so the competition's own logic is what is being tested:
 *
 *   the platform admin creates it and opens registration → college admins
 *   register teams and pick their own students → the admin approves → draws
 *   the semi-finals → matches open, players join and play → a draw is replayed
 *   → the final and the third-place play-off follow → a walkover and an admin
 *   decision → the competition completes → prizes, certificates, leaderboard,
 *   history and each student's participation all reflect it.
 *
 * Plus a four-team-a-match game (a Brain Sprint in groups), and that UNO, Ludo,
 * Carrom and friendly rooms are gone.
 * The real games' rules are tested on their own in tests/competitions/*.engine.test.js.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup, forgetAudit } = require('../helpers');

const games = require('../../src/competitions/games');
/**
 * Ludo and Carrom are no longer offered (2026-10-23), but a competition made
 * for one before then still runs: these tests make one as it was made then.
 */
const offeredAgain = (id) => {
    before(() => { games.IDS.push(id); });
    after(() => { games.IDS.splice(games.IDS.indexOf(id), 1); });
};
const { GameError } = require('../../src/competitions/games/contract');
const Competition = require('../../src/competitions/models/Competition');
const Team = require('../../src/competitions/models/Team');
const Match = require('../../src/competitions/models/Match');
const PlayGame = require('../../src/competitions/models/PlayGame');
const Organization = require('../../src/organizations/models/Organization');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');

/** A game anyone wins by saying so: { type: 'win' }, or draws with { type: 'draw' }. */
const COIN = {
    id: 'chess', label: 'Coin', emoji: '🪙', minSeats: 2, maxSeats: 4, seatsPerSide: { min: 1, max: 2 },
    create: (seats) => ({ seats: seats.map((s) => ({ ...s })), places: null }),
    view: (state, seat) => ({ game: 'chess', status: state.places ? 'finished' : 'active', you: seat, turn: null, deadline: null, seats: state.seats.map((s) => ({ name: s.name, side: s.side, label: `Side ${s.side}`, color: '#000' })), message: '', outcome: state.places ? { places: state.places } : null }),
    act: (state, seat, action) => {
        if (state.places) throw new GameError('This game is over.');
        const sides = [...new Set(state.seats.map((s) => s.side))];
        const mine = state.seats[seat].side;
        if (action.type === 'win') return { ...state, places: [[mine], sides.filter((s) => s !== mine)] };
        if (action.type === 'draw') return { ...state, places: [sides] };
        throw new GameError('Say win or draw.');
    },
    tick: () => null,
    deadline: () => null,
    outcome: (state) => (state.places ? { places: state.places, reason: 'Called it' } : null)
};

const STAMP = `${Date.now()}`;
const made = { orgs: [], admins: [], users: [], comps: [] };
let app, boss, bossToken, colleges, outsider;

const makeCollege = async (label, n) => {
    const org = await Organization.create({ orgCode: `G${label}-${STAMP}`, name: `${label} College ${STAMP}`, organizationType: 'college', email: `games-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active' });
    made.orgs.push(org._id);
    const admin = await Admin.create({ name: `${label} Coordinator`, email: `games-orgadmin-${label}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    made.admins.push(admin._id);
    const students = [];
    for (let i = 0; i < n; i += 1) {
        const s = await makeUser(`${label}${i}`);
        await User.updateOne({ _id: s.user._id }, { $set: { organizationId: org._id } });
        made.users.push(s.user);
        students.push({ ...s, call: app.call(s.token) });
    }
    const token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return { org, admin, token, call: app.call(token), students };
};

before(async () => {
    await connect();
    games.override('chess', COIN);
    games.override('brainsprint', { ...COIN, id: 'brainsprint' });
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    const b = await makeAdmin('Games Super');
    await Admin.updateOne({ _id: b.admin._id }, { $set: { role: 'superadmin' } });
    made.admins.push(b.admin._id);
    boss = app.call(b.token);
    bossToken = b.token;
    colleges = [];
    for (const label of ['Alpha', 'Beta', 'Gamma', 'Delta']) colleges.push(await makeCollege(label, 2));
    const o = await makeUser('Outsider');
    made.users.push(o.user);
    outsider = app.call(o.token);
});

after(async () => {
    games.override('chess', null);
    games.override('brainsprint', null);
    const comps = await Competition.find({ name: { $regex: STAMP } }).select('_id').lean();
    const ids = comps.map((c) => c._id);
    await Promise.all([
        PlayGame.deleteMany({ $or: [{ competitionId: { $in: ids } }, { 'seats.userId': { $in: made.users.map((u) => u._id) } }] }),
        Match.deleteMany({ competitionId: { $in: ids } }),
        Team.deleteMany({ competitionId: { $in: ids } }),
        Competition.deleteMany({ _id: { $in: ids } }),
        Organization.deleteMany({ _id: { $in: made.orgs } }),
        Admin.deleteMany({ _id: { $in: made.admins } }), forgetAudit({ orgs: made.orgs, admins: made.admins })
    ]);
    await cleanup(made.users, app.server);
});

const inDays = (d) => new Date(Date.now() + d * 86400e3).toISOString();

describe('an inter-college chess competition, start to finish', () => {
    let comp;
    const playerOf = (college, i = 0) => colleges[college].students[i];

    test('only the platform admin can create one', async () => {
        const body = { name: `Chess Cup ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), playersPerTeam: 2, maxTeams: 8 };
        assert.ok([401, 403].includes((await colleges[0].call('POST', '/admin', body)).status), 'a college admin is refused');
        assert.ok([401, 403].includes((await outsider('POST', '/admin', body)).status), 'a student is refused');
        const r = await boss('POST', '/admin', {
            ...body, open: true, rules: 'Be fair.', participationXp: 10, organizedBy: 'YATICORP',
            prizes: [{ place: 1, title: 'Champions', xp: 100, rewardPoints: 50 }, { place: 2, xp: 50 }, { place: 3, xp: 20 }]
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        comp = r.body.competition;
        assert.equal(comp.status, 'registration');
        assert.equal(comp.teamsPerMatch, 2, 'chess is always two teams a match');
        assert.equal(comp.registrationOpen, true);
    });

    test('a registration deadline after the start is refused', async () => {
        const r = await boss('POST', '/admin', { name: `Bad ${STAMP}`, game: 'chess', startsAt: inDays(1), registrationDeadline: inDays(2) });
        assert.equal(r.status, 400);
    });

    test('students see it; college admins see it open for registration', async () => {
        const list = await playerOf(0).call('GET', '/');
        assert.ok(list.body.competitions.some((c) => c.id === comp.id));
        const orgList = await colleges[0].call('GET', '/org');
        assert.equal(orgList.status, 200, JSON.stringify(orgList.body));
        assert.ok(orgList.body.competitions.some((c) => c.id === comp.id && c.registrationOpen));
    });

    test('the platform admin viewing a college\'s panel sees its Competitions tab, and works in it as the college', async () => {
        const base = `http://127.0.0.1:${app.server.address().port}/api/competitions`;
        const viewAs = (orgId) => (method, path, body) => fetch(`${base}${path}`, {
            method, body: body ? JSON.stringify(body) : undefined,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bossToken}`, ...(orgId ? { 'X-View-Organization': String(orgId) } : {}) }
        }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
        assert.equal((await viewAs(null)('GET', '/org')).status, 403, 'without saying which college, refused');
        const view = viewAs(colleges[0].org._id);
        const list = await view('GET', '/org');
        assert.equal(list.status, 200, JSON.stringify(list.body));
        assert.ok(list.body.competitions.some((c) => c.id === comp.id), 'the published competition is there');
        assert.deepEqual((await view('GET', '/org/hosting')).body, { canHost: false });
        assert.equal((await view('GET', '/org/students')).status, 200);
        // View mode is not read-only: a superadmin may change what the college
        // could change itself (organizations/middleware/authMiddleware.js), so
        // the request reaches the team rules, which refuse an empty team.
        const put = await view('PUT', `/org/${comp.id}/team`, { teamName: 'Not theirs', players: [] });
        assert.equal(put.status, 400, JSON.stringify(put.body));
        assert.notEqual(put.body.code, 'READ_ONLY_VIEW');
    });

    test('a coordinator registers a team of their own students — and only their own', async () => {
        const students = await colleges[0].call('GET', '/org/students');
        assert.equal(students.body.students.length, 2);
        const stranger = await colleges[0].call('PUT', `/org/${comp.id}/team`, { teamName: 'Alpha Knights', players: [String(playerOf(1).user._id)] });
        assert.equal(stranger.status, 400, 'another college\'s student cannot be picked');
        const tooMany = await colleges[0].call('PUT', `/org/${comp.id}/team`, { teamName: 'Alpha Knights', players: [...students.body.students.map((s) => s.id), String(playerOf(1).user._id)] });
        assert.equal(tooMany.status, 400);
        for (const [i, c] of colleges.entries()) {
            const r = await c.call('PUT', `/org/${comp.id}/team`, { teamName: `Team ${i}`, coordinatorName: `Coach ${i}`, players: c.students.map((s) => String(s.user._id)) });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.team.status, 'pending');
        }
    });

    test('the platform admin approves the teams; players are told', async () => {
        const detail = await boss('GET', `/admin/${comp.id}`);
        assert.equal(detail.body.teams.length, 4);
        for (const t of detail.body.teams) {
            const r = await boss('PUT', `/admin/${comp.id}/teams/${t.id}`, { status: 'approved' });
            assert.equal(r.status, 200, JSON.stringify(r.body));
        }
        const pub = await playerOf(0).call('GET', `/${comp.id}`);
        assert.equal(pub.body.competition.teamsCount, 4);
        assert.equal(pub.body.competition.myTeam?.teamName, 'Team 0', 'a student sees their own team');
    });

    let semis;
    test('drawing the matches makes two semi-finals and starts the competition', async () => {
        const r = await boss('POST', `/admin/${comp.id}/draw`, { firstMatchAt: inDays(3) });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.competition.status, 'live');
        assert.equal(r.body.rounds.length, 1);
        assert.equal(r.body.rounds[0].name, 'Semi Final');
        semis = r.body.rounds[0].matches;
        assert.equal(semis.length, 2);
        assert.ok(semis.every((m) => m.sides.length === 2 && m.status === 'scheduled'));
    });

    const collegeOfTeam = async (teamId) => {
        const t = await Team.findById(teamId).lean();
        return colleges.find((c) => String(c.org._id) === String(t.organizationId));
    };

    test('a coordinator chooses who plays a match; the game seats exactly them', async () => {
        const m = semis[0];
        const c = await collegeOfTeam(m.sides[0].teamId);
        const second = String(c.students[1].user._id);
        const r = await c.call('PUT', `/org/${comp.id}/matches/${m.id}/lineup`, { players: [second] });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const started = await boss('POST', `/admin/${comp.id}/matches/${m.id}/start`);
        assert.equal(started.status, 200, JSON.stringify(started.body));
        const game = await PlayGame.findById(started.body.rounds[0].matches.find((x) => x.id === m.id).gameId).lean();
        assert.equal(game.status, 'waiting', 'players have a few minutes to join');
        assert.ok(game.seats.some((s) => String(s.userId) === second), 'the chosen player is seated');
        assert.ok(!game.seats.some((s) => String(s.userId) === String(c.students[0].user._id)), 'and not the other');
    });

    test('the game starts once both players join; someone else cannot act in it', async () => {
        const m = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === semis[0].id);
        const game = await PlayGame.findById(m.gameId).lean();
        const seated = game.seats.map((s) => made.users.find((u) => String(u._id) === String(s.userId)));
        const calls = seated.map((u) => colleges.flatMap((c) => c.students).find((s) => String(s.user._id) === String(u._id)).call);
        assert.equal((await outsider('POST', `/play/${m.gameId}/action`, { action: { type: 'win' } })).status, 403);
        // Each player joins with their own code; nobody else's will do.
        assert.equal((await calls[0]('POST', `/play/${m.gameId}/join`)).status, 400, 'a code is needed');
        assert.equal((await calls[0]('POST', `/play/${m.gameId}/join`, { code: game.seats[1].code })).status, 403, 'not the other player\'s');
        await calls[0]('POST', `/play/${m.gameId}/join`, { code: game.seats[0].code });
        const both = await calls[1]('POST', `/play/${m.gameId}/join`, { code: game.seats[1].code.toLowerCase() });
        assert.equal(both.body.game.status, 'active');
        const polled = await calls[0]('GET', `/play/${m.gameId}`);
        assert.equal(polled.body.game.you, 0);
        assert.equal((await calls[0]('GET', `/play/${m.gameId}?since=${polled.body.game.version}`)).body.unchanged, true, 'a poll with the current version gets nothing new');
        const won = await calls[0]('POST', `/play/${m.gameId}/action`, { action: { type: 'win' } });
        assert.equal(won.status, 200, JSON.stringify(won.body));
        assert.equal(won.body.game.status, 'finished');
        const after = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === semis[0].id);
        assert.equal(after.status, 'completed');
        assert.equal(after.winnerTeamId, String(game.sideTeams[0]), 'the side that won the game wins the match');
    });

    test('a drawn game is replayed rather than decided', async () => {
        const m = semis[1];
        await boss('POST', `/admin/${comp.id}/matches/${m.id}/start`);
        const play = async (type) => {
            const cur = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === m.id);
            const game = await PlayGame.findById(cur.gameId).lean();
            const callsFor = game.seats.map((s) => colleges.flatMap((c) => c.students).find((st) => String(st.user._id) === String(s.userId)).call);
            for (const [i, call] of callsFor.entries()) await call('POST', `/play/${cur.gameId}/join`, { code: game.seats[i].code });
            const r = await callsFor[0]('POST', `/play/${cur.gameId}/action`, { action: { type } });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            return game;
        };
        const first = await play('draw');
        let mid = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === m.id);
        assert.equal(mid.status, 'live', 'still undecided after a draw');
        assert.equal(mid.games, 1, 'no new game yet: the rematch is in 5 minutes');
        assert.ok(new Date(mid.rematchAt).getTime() - Date.now() > 4 * 60e3, 'about 5 minutes on');
        const player = colleges.flatMap((c) => c.students).find((st) => String(st.user._id) === String(first.seats[0].userId));
        const waiting = (await player.call('GET', `/${comp.id}`)).body.myMatch;
        assert.ok(waiting.rematchAt && !waiting.started && !waiting.code, 'told when; no code yet');
        // Five minutes later: the rematch opens, with the same codes.
        await Match.updateOne({ _id: m.id }, { $set: { replayAt: new Date(Date.now() - 1000) } });
        const opened = (await player.call('GET', `/${comp.id}`)).body.myMatch;
        assert.equal(opened.started, true, 'open now');
        assert.equal(opened.code, first.seats[0].code, 'the same joining code');
        mid = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === m.id);
        assert.equal(mid.games, 2, 'a second game');
        await play('win');
        const done = (await boss('GET', `/admin/${comp.id}`)).body.rounds[0].matches.find((x) => x.id === m.id);
        assert.equal(done.status, 'completed');
    });

    let final, third;
    test('two decided semi-finals bring the final and the third-place play-off', async () => {
        const d = (await boss('GET', `/admin/${comp.id}`)).body;
        assert.equal(d.rounds.length, 2);
        final = d.rounds[1].matches.find((m) => m.kind === 'main');
        third = d.rounds[1].matches.find((m) => m.kind === 'third-place');
        assert.equal(final.roundName, 'Final');
        assert.ok(third, 'the beaten semi-finalists play for third');
        const semiWinners = d.rounds[0].matches.map((m) => m.winnerTeamId).sort();
        assert.deepEqual(final.sides.map((s) => s.teamId).sort(), semiWinners);
    });

    test('they are set 15 minutes on and their players told; only Start opens them', async () => {
        const bracket = require('../../src/competitions/services/bracketService');
        for (const m of [final, third]) {
            const wait = new Date(m.scheduledAt).getTime() - Date.now();
            assert.ok(wait > 13 * 60e3 && wait <= 15 * 60e3, `${m.roundName}: starts ${Math.round(wait / 60e3)} minutes on`);
        }
        await bracket.settled();
        const Notification = require('../../src/career/models/Notification');
        const finalist = (await Team.findById(final.sides[0].teamId).lean()).players[0].userId;
        const told = await Notification.find({ userId: finalist, title: 'Final starts in 15 minutes' }).lean();
        assert.equal(told.length, 1, 'a finalist is told once');
        assert.match(told[0].message, /plays .+\. Join from Games & Competitions → My Games within 10 minutes of the start/);
        const thirdPlayer = (await Team.findById(third.sides[0].teamId).lean()).players[0].userId;
        assert.equal(await Notification.countDocuments({ userId: thirdPlayer, title: 'Third-place match starts in 15 minutes' }), 1);

        // Its time come, the final still waits: only the admin's Start opens it.
        await Match.updateOne({ _id: final.id }, { $set: { scheduledAt: new Date(Date.now() - 1000) } });
        const waiting = (await boss('GET', `/admin/${comp.id}`)).body.rounds[1].matches.find((m) => m.id === final.id);
        assert.equal(waiting.status, 'scheduled', 'not opened by the clock');
        await boss('POST', `/admin/${comp.id}/matches/${final.id}/start`);
        const opened = (await boss('GET', `/admin/${comp.id}`)).body.rounds[1].matches.find((m) => m.id === final.id);
        assert.equal(opened.status, 'live');
        assert.ok(opened.gameId, 'with its game');
    });

    test('a side that never joins loses by walkover', async () => {
        await boss('POST', `/admin/${comp.id}/matches/${third.id}/start`);
        const cur = (await boss('GET', `/admin/${comp.id}`)).body.rounds[1].matches.find((x) => x.id === third.id);
        const game = await PlayGame.findById(cur.gameId).lean();
        const first = colleges.flatMap((c) => c.students).find((st) => String(st.user._id) === String(game.seats[0].userId));
        await first.call('POST', `/play/${cur.gameId}/join`, { code: game.seats[0].code });
        await PlayGame.updateOne({ _id: cur.gameId }, { $set: { joinDeadline: new Date(Date.now() - 1000) } });
        const polled = await first.call('GET', `/play/${cur.gameId}`);
        assert.equal(polled.body.game.status, 'finished');
        const decided = (await boss('GET', `/admin/${comp.id}`)).body.rounds[1].matches.find((x) => x.id === third.id);
        assert.equal(decided.status, 'completed');
        assert.equal(decided.decidedBy, 'walkover');
        assert.equal(decided.winnerTeamId, String(game.sideTeams[game.seats[0].side]));
    });

    test('the admin can decide the final; the competition completes with 1st, 2nd and 3rd', async () => {
        // The prizes are paid after the reply — about a second a player, so a
        // big final kept waiting for them would time out. Held back here, the
        // reply must still come.
        const awards = require('../../src/competitions/services/awardService');
        const real = awards.award;
        let release;
        const held = new Promise((r) => { release = r; });
        awards.award = async (c) => { await held; return real(c); };
        try {
            const winner = final.sides[1].teamId;
            const r = await Promise.race([
                boss('POST', `/admin/${comp.id}/matches/${final.id}/result`, { winnerTeamId: winner, note: 'Opponent withdrew' }),
                new Promise((_, no) => setTimeout(() => no(new Error('the reply waited for the prizes')), 5000))
            ]);
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.competition.status, 'completed');
            const places = Object.fromEntries(r.body.competition.winners.map((w) => [w.place, w.teamId]));
            assert.equal(places[1], winner);
            assert.equal(places[2], final.sides[0].teamId);
            const thirdMatch = r.body.rounds[1].matches.find((x) => x.kind === 'third-place');
            assert.equal(places[3], thirdMatch.winnerTeamId);
            assert.equal((await Competition.findById(comp.id).lean()).awardedAt ?? null, null, 'the prizes were still to come');
        } finally {
            release();
            await require('../../src/competitions/services/bracketService').settled();
            awards.award = real;
        }
        assert.ok((await Competition.findById(comp.id).lean()).awardedAt, 'and then they went out');
    });

    test('prizes and participation XP are paid once, to every player of the team', async () => {
        const XpTransaction = require('../../src/rewards/models/XpTransaction');
        const RewardTransaction = require('../../src/rewards/models/RewardTransaction');
        const c = await Competition.findById(comp.id).lean();
        const champs = await Team.findById(c.winners.find((w) => w.place === 1).teamId).lean();
        for (const p of champs.players) {
            const xp = await XpTransaction.find({ userId: p.userId, source: 'competition' }).lean();
            assert.equal(xp.reduce((a, x) => a + x.amount, 0), 110, '100 for first place and 10 for taking part');
            const rp = await RewardTransaction.find({ userId: p.userId, source: 'competition' }).lean();
            assert.equal(rp.reduce((a, x) => a + x.points, 0), 50);
        }
        assert.equal((await boss('POST', `/admin/${comp.id}/award`)).status, 200, 'awarding again is allowed…');
        const p0 = champs.players[0].userId;
        assert.equal((await XpTransaction.countDocuments({ userId: p0, source: 'competition' })), 2, '…and pays nothing twice');
    });

    test('players get a certificate; anyone else does not', async () => {
        const c = await Competition.findById(comp.id).lean();
        const champs = await Team.findById(c.winners.find((w) => w.place === 1).teamId).lean();
        const player = colleges.flatMap((x) => x.students).find((s) => String(s.user._id) === String(champs.players[0].userId));
        const res = await fetch(`${app.server.address ? '' : ''}http://127.0.0.1:${app.server.address().port}/api/competitions/${comp.id}/certificate`, { headers: { Authorization: `Bearer ${player.token}` } });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'application/pdf');
        assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
        assert.equal((await outsider('GET', `/${comp.id}/certificate`)).status, 403);

        // And in My Profile's certificate frame, listed with what the PDF says.
        const mine = (await player.call('GET', '/certificates')).body.certificates.find((x) => x.competitionId === comp.id);
        assert.ok(mine, 'the winner\'s certificate is in their list');
        assert.equal(mine.place, 1);
        assert.equal(mine.title, 'Winner');
        assert.equal(mine.teamName, champs.teamName);
        assert.equal(mine.gameLabel, 'Chess');
        assert.equal(mine.words.subtitle, 'of Achievement — Winner', 'the designed certificate\'s lines come with it');
        assert.equal(mine.words.lead, 'has won first place in the');
        assert.match(mine.words.paragraph, new RegExp(champs.teamName));
        assert.match(mine.words.date, /^\d{2}\/\d{2}\/\d{4}$/);
        assert.ok(mine.completedAt);
        const theirs = (await outsider('GET', '/certificates')).body.certificates;
        assert.ok(!theirs.some((x) => x.competitionId === comp.id), 'someone who did not play has none');

        // Deleted from My Profile, it leaves the frame — and only theirs.
        const listed = async () => (await player.call('GET', '/certificates')).body.certificates.some((x) => x.competitionId === comp.id);
        assert.equal((await outsider('DELETE', `/certificates/${comp.id}`)).status, 404, 'nobody else can delete it');
        assert.equal((await player.call('DELETE', `/certificates/${comp.id}`)).status, 200);
        assert.equal(await listed(), false, 'gone from the frame');
        const teammate = champs.players.find((p) => String(p.userId) !== String(player.user._id));
        if (teammate) {
            const mate = colleges.flatMap((x) => x.students).find((s) => String(s.user._id) === String(teammate.userId));
            assert.ok((await mate.call('GET', '/certificates')).body.certificates.some((x) => x.competitionId === comp.id), 'a teammate keeps theirs');
        }
        // Downloading it again from Games & Competitions puts it back.
        const again = await fetch(`http://127.0.0.1:${app.server.address().port}/api/competitions/${comp.id}/certificate`, { headers: { Authorization: `Bearer ${player.token}` } });
        assert.equal(again.status, 200);
        await again.arrayBuffer();
        assert.equal(await listed(), true, 'back in the frame');
    });

    test('my participation, the leaderboard and the history all show it', async () => {
        const c = await Competition.findById(comp.id).lean();
        const champs = await Team.findById(c.winners.find((w) => w.place === 1).teamId).lean();
        const player = colleges.flatMap((x) => x.students).find((s) => String(s.user._id) === String(champs.players[0].userId));
        const me = (await player.call('GET', '/me')).body;
        const result = me.results.find((r) => r.competition.id === comp.id);
        assert.equal(result.place, 1);
        assert.equal(result.certificate, true);
        assert.ok(me.completed.length >= 1, 'their decided matches are listed');

        const board = (await player.call('GET', '/leaderboard')).body;
        const mine = board.colleges.find((x) => x.collegeName === champs.collegeName);
        assert.equal(mine.titles, 1);
        // Among the colleges that played here. The board is the whole
        // database's, and other colleges' competitions (a sample, a demo) can
        // rank above this test's — which is right, and no business of this test.
        const ours = board.colleges.filter((x) => x.collegeName.includes(STAMP));
        assert.equal(ours[0]?.collegeName, champs.collegeName, 'the champions\' college leads the colleges that played');
        assert.ok(board.teams.some((t) => t.teamName === champs.teamName && t.place === 1));

        const history = (await player.call('GET', '/history')).body;
        const h = history.competitions.find((x) => x.competition.id === comp.id);
        assert.equal(h.competition.winners.length, 3);
    });
});

describe('a game for four teams a match (Ludo, from before it was removed)', () => {
    offeredAgain('ludo');
    test('five teams make two groups; the winners meet in the final', async () => {
        const r = await boss('POST', '/admin', { name: `Brain Sprint Day ${STAMP}`, game: 'brainsprint', teamsPerMatch: 4, startsAt: inDays(3), registrationDeadline: inDays(2), open: true });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const id = r.body.competition.id;
        for (const [i, c] of colleges.entries()) {
            await c.call('PUT', `/org/${id}/team`, { teamName: `L${i}`, players: [String(c.students[0].user._id)] });
        }
        // A fifth college, with one student.
        const fifth = await makeCollege('Epsilon', 1);
        colleges.push(fifth);
        await fifth.call('PUT', `/org/${id}/team`, { teamName: 'L4', players: [String(fifth.students[0].user._id)] });
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
        const drawn = (await boss('POST', `/admin/${id}/draw`)).body;
        assert.equal(drawn.rounds[0].matches.length, 2);
        assert.deepEqual(drawn.rounds[0].matches.map((m) => m.sides.length).sort(), [2, 3]);
        assert.equal(drawn.rounds[0].name, 'Semi Final');
        for (const m of drawn.rounds[0].matches) await boss('POST', `/admin/${id}/matches/${m.id}/result`, { winnerTeamId: m.sides[0].teamId });
        const after = (await boss('GET', `/admin/${id}`)).body;
        assert.equal(after.rounds[1].name, 'Final');
        assert.equal(after.rounds[1].matches.length, 1, 'no third-place play-off when matches hold more than two teams');
    });
});

describe('an organization hosting its own competition (Carrom doubles, from before it was removed)', () => {
    offeredAgain('carrom');
    let host, compId;
    test('an organization cannot host until the platform admin lets it', async () => {
        host = await makeCollege('Host', 6);
        colleges.push(host);
        assert.deepEqual((await host.call('GET', '/org/hosting')).body, { canHost: false }, 'off to begin with');
        const refused = await host.call('POST', '/org/host', { name: `Not Yet ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), open: true });
        assert.equal(refused.status, 403);
        assert.equal(refused.body.code, 'HOSTING_DISABLED');
        assert.equal((await host.call('GET', '/org/host')).status, 403, 'nor list its own');

        // The switch is the platform admin's, in Organizations.
        const orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
        try {
            const asHost = orgApp.call(host.token);
            const asBoss = orgApp.call(bossToken);
            assert.equal((await asHost('PUT', `/admin/${host.org._id}/competition-hosting`, { enabled: true })).status, 403, 'not the organization itself');
            assert.equal((await asBoss('PUT', `/admin/${host.org._id}/competition-hosting`, { enabled: 'yes' })).status, 400);
            const on = await asBoss('PUT', `/admin/${host.org._id}/competition-hosting`, { enabled: true });
            assert.equal(on.status, 200, JSON.stringify(on.body));
            assert.equal(on.body.canHostCompetitions, true);
            assert.equal((await asBoss('GET', `/admin/${host.org._id}`)).body.organization.canHostCompetitions, true);
            const row = (await asBoss('GET', `/admin?search=${encodeURIComponent(host.org.orgCode)}`)).body.organizations.find((o) => String(o._id) === String(host.org._id));
            assert.equal(row.canHostCompetitions, true, 'the list says so too');
        } finally {
            await new Promise((r) => orgApp.server.close(r));
        }
        assert.deepEqual((await host.call('GET', '/org/hosting')).body, { canHost: true });
    });

    test('an organization admin creates one; it is theirs and named after them', async () => {
        const r = await host.call('POST', '/org/host', {
            name: `Host Chess Open ${STAMP}`, game: 'chess', playersPerTeam: 3,
            startsAt: inDays(5), registrationDeadline: inDays(4), registrationOpensAt: inDays(1),
            prizeDetails: 'Trophy and medals', participationCertificates: false, open: true
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        compId = r.body.competition.id;
        assert.equal(r.body.competition.organizedBy, host.org.name, 'the organization is the organizer');
        assert.equal(r.body.competition.hostOrganizationId, String(host.org._id));
        assert.equal(r.body.competition.prizeDetails, 'Trophy and medals');
        assert.equal(r.body.competition.participationCertificates, false);
        assert.equal(r.body.competition.phase, 'registration-soon', 'published, but registration has not opened yet');
    });

    test('it is for the host\'s own students: other colleges do not see it or enter it', async () => {
        await Competition.updateOne({ _id: compId }, { $set: { registrationOpensAt: new Date(Date.now() - 1000) } });
        const other = colleges[1];
        assert.ok(!(await other.call('GET', '/org')).body.competitions.some((c) => c.id === compId), 'not in another college\'s Take part');
        assert.equal((await other.call('GET', `/org/${compId}`)).status, 404);
        const r = await other.call('PUT', `/org/${compId}/team`, { teamName: 'Beta Strikers', players: other.students.map((st) => String(st.user._id)) });
        assert.equal(r.status, 404, 'nor can it register');
        assert.ok(!(await host.call('GET', '/org')).body.competitions.some((c) => c.id === compId), 'the host runs it from Host, not Take part');
        assert.equal((await host.call('PUT', `/org/${compId}/team`, { teamName: 'Ours', players: [String(host.students[0].user._id), String(host.students[1].user._id)] })).status, 404);

        const ours = host.students[0].call, theirs = other.students[0].call;
        assert.ok((await ours('GET', '/')).body.competitions.some((c) => c.id === compId), 'the host\'s students see it');
        assert.equal((await ours('GET', `/${compId}`)).status, 200);
        assert.ok(!(await theirs('GET', '/')).body.competitions.some((c) => c.id === compId), 'other students do not');
        assert.equal((await theirs('GET', `/${compId}`)).status, 404);
        assert.equal((await outsider('GET', `/${compId}`)).status, 404, 'nor does a student of no college');
    });

    test('the host makes several teams from its own students, approved as they are made', async () => {
        const id = (i) => String(host.students[i].user._id);
        const make = (teamName, players) => host.call('POST', `/org/host/${compId}/teams`, { teamName, players });
        const pool = await host.call('GET', `/org/host/${compId}/students`);
        assert.equal(pool.status, 200);
        assert.equal(pool.body.students.length, 6, 'its own students to pick from');

        let r = await make('Host Reds', [id(0), id(1)]);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        r = await make('Host Blues', [id(2), id(3)]);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.deepEqual(r.body.teams.map((t) => [t.teamName, t.status]), [['Host Reds', 'approved'], ['Host Blues', 'approved']]);
        assert.deepEqual((await Team.find({ competitionId: compId }).sort({ entry: 1 }).lean()).map((t) => t.entry), [1, 2]);

        const twice = await make('Host Greens', [id(1), id(4)]);
        assert.equal(twice.status, 409);
        assert.match(twice.body.message, /already in Host Reds/);
        assert.equal((await make('Mixed', [id(4), String(colleges[1].students[0].user._id)])).status, 400, 'only its own students');
        assert.equal((await make('Nobody', [])).status, 400, 'a team needs a player');

        r = await make('Host Greens', [id(4), id(5)]);
        assert.equal(r.status, 201);
        const greens = r.body.teams.find((t) => t.teamName === 'Host Greens');
        const blues = r.body.teams.find((t) => t.teamName === 'Host Blues');
        r = await host.call('PATCH', `/org/host/${compId}/teams/${blues.id}`, { teamName: 'Host Blue Stars', players: [id(2), id(3), id(5)] });
        assert.equal(r.status, 409, 'a player still in Greens');
        assert.equal((await host.call('DELETE', `/org/host/${compId}/teams/${greens.id}`)).status, 200);
        r = await host.call('PATCH', `/org/host/${compId}/teams/${blues.id}`, { teamName: 'Host Blue Stars', players: [id(2), id(3), id(5)] });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.teams.map((t) => t.teamName), ['Host Reds', 'Host Blue Stars']);

        const mine = (await host.students[5].call('GET', `/${compId}`)).body.competition.myTeam;
        assert.equal(mine?.teamName, 'Host Blue Stars', 'a player sees their team');
        assert.equal((await boss('POST', `/admin/${(await Competition.findOne({ name: `Chess Cup ${STAMP}` }).lean())._id}/teams`, { teamName: 'X', players: [] })).status, 400,
            'an inter-college competition has no teams made for it');
    });

    test('another organization cannot run it, and the host cannot run anyone else\'s', async () => {
        assert.equal((await colleges[0].call('GET', `/org/host/${compId}`)).status, 403, 'not allowed to host at all');
        await Organization.updateOne({ _id: colleges[0].org._id }, { $set: { canHostCompetitions: true } });
        assert.equal((await colleges[0].call('GET', `/org/host/${compId}`)).status, 404, 'and allowed, still not someone else\'s');
        assert.equal((await colleges[0].call('PUT', `/org/host/${compId}`, { name: 'Taken over' })).status, 404);
        const platform = await Competition.findOne({ name: `Chess Cup ${STAMP}` }).lean();
        assert.equal((await host.call('GET', `/org/host/${platform._id}`)).status, 404);
        const mine = (await host.call('GET', '/org/host')).body.competitions;
        assert.deepEqual(mine.map((c) => c.id), [compId], 'the host lists only its own');
    });

    test('the platform admin sees and can manage it too', async () => {
        const all = (await boss('GET', '/admin')).body.competitions;
        assert.ok(all.some((c) => c.id === compId));
        const seen = await boss('GET', `/admin/${compId}`);
        assert.equal(seen.status, 200);
        assert.equal(seen.body.competition.hostName, host.org.name, 'the college by its own name');
    });

    test('switched off again, the organization stops hosting; its competition carries on under the platform admin', async () => {
        await Organization.updateOne({ _id: host.org._id }, { $set: { canHostCompetitions: false } });
        assert.equal((await host.call('GET', `/org/host/${compId}`)).status, 403);
        assert.equal((await host.call('POST', '/org/host', { name: `After ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2) })).status, 403);
        const kept = await boss('GET', `/admin/${compId}`);
        assert.equal(kept.status, 200);
        assert.equal(kept.body.competition.status, 'registration', 'still open');
        assert.equal((await boss('PUT', `/admin/${compId}`, { name: `Host Chess Open ${STAMP} (run by YATICORP)` })).status, 200);
    });

    test('drawn, its teams are fixed; it stays off the inter-college leaderboard', async () => {
        const drawn = await boss('POST', `/admin/${compId}/draw`);
        assert.equal(drawn.status, 200, JSON.stringify(drawn.body));
        assert.equal(drawn.body.rounds[0].matches.length, 1);
        assert.equal((await boss('POST', `/admin/${compId}/teams`, { teamName: 'Late', players: [String(host.students[4].user._id), String(host.students[0].user._id)] })).status, 409);
        const board = (await host.students[0].call('GET', '/leaderboard')).body;
        assert.ok(!board.teams.some((t) => /^Host /.test(t.teamName)), 'its teams are not ranked');
        assert.ok(!board.colleges.some((c) => c.id === String(host.org._id)), 'nor is the college, for it');
    });
});

describe('certificates when participation certificates are off', () => {
    test('the top three get theirs; the fourth team does not', async () => {
        const r = await boss('POST', '/admin', { name: `No Participation ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), participationCertificates: false, open: true });
        const id = r.body.competition.id;
        for (const [i, c] of colleges.slice(0, 4).entries()) await c.call('PUT', `/org/${id}/team`, { teamName: `NP${i}`, players: [String(c.students[0].user._id)] });
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
        let d = (await boss('POST', `/admin/${id}/draw`)).body;
        for (const m of d.rounds[0].matches) await boss('POST', `/admin/${id}/matches/${m.id}/result`, { winnerTeamId: m.sides[0].teamId });
        d = (await boss('GET', `/admin/${id}`)).body;
        for (const m of d.rounds[1].matches) await boss('POST', `/admin/${id}/matches/${m.id}/result`, { winnerTeamId: m.sides[0].teamId });
        d = (await boss('GET', `/admin/${id}`)).body;
        assert.equal(d.competition.status, 'completed');
        const teams = await Team.find({ competitionId: id }).lean();
        const fourth = teams.find((t) => !t.place);
        const second = teams.find((t) => t.place === 2);
        const studentOf = (t) => colleges.flatMap((c) => c.students).find((s) => String(s.user._id) === String(t.players[0].userId));
        const cert = (who) => fetch(`http://127.0.0.1:${app.server.address().port}/api/competitions/${id}/certificate`, { headers: { Authorization: `Bearer ${who.token}` } });
        assert.equal((await cert(studentOf(second))).status, 200, 'the runner-up gets a certificate');
        assert.equal((await cert(studentOf(fourth))).status, 404, 'participation certificates are off');
        const me = (await studentOf(fourth).call('GET', '/me')).body.results.find((x) => x.competition.id === id);
        assert.equal(me.certificate, false);
        assert.deepEqual(me.score, { won: 0, played: 2 }, 'lost the semi-final and the third-place match');
        const listed = async (t) => (await studentOf(t).call('GET', '/certificates')).body.certificates.some((x) => x.competitionId === id);
        assert.equal(await listed(second), true, 'the runner-up\'s is in their certificate frame');
        assert.equal(await listed(fourth), false, 'and the fourth team\'s is not, as there is none');
    });
});

describe('UNO, Ludo, Carrom and playing with friends are gone (2026-10-23)', () => {
    test('a competition of UNO, Ludo or Carrom cannot be made; friendly rooms cannot be made', async () => {
        for (const game of ['uno', 'ludo', 'carrom']) {
            const r = await boss('POST', '/admin', { name: `${game} ${STAMP}`, game, startsAt: inDays(3), registrationDeadline: inDays(2), open: true });
            assert.equal(r.status, 400, game); assert.match(r.body.message, /Choose the game: Chess, Rapid Fire, Code Clash, Brain Sprint, a Quiz or a Hackathon/);
        }
        assert.equal((await colleges[0].students[0].call('POST', '/rooms', { game: 'chess' })).status, 404);
    });
});

describe('deleting a competition', () => {
    test('the organizer deletes one in any state: its teams, matches and games go with it', async () => {
        const r = await boss('POST', '/admin', { name: `Delete Me ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), open: true });
        const id = r.body.competition.id;
        for (const c of colleges.slice(0, 2)) await c.call('PUT', `/org/${id}/team`, { teamName: `Del ${c.org.name}`, players: [String(c.students[0].user._id)] });
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
        const match = (await boss('POST', `/admin/${id}/draw`)).body.rounds[0].matches[0];
        await boss('POST', `/admin/${id}/matches/${match.id}/start`);
        const student = colleges[0].students[0];
        assert.ok((await student.call('GET', '/')).body.competitions.some((c) => c.id === id), 'live, and seen');

        const gone = await boss('DELETE', `/admin/${id}`);
        assert.equal(gone.status, 200, JSON.stringify(gone.body));
        assert.equal(await Competition.countDocuments({ _id: id }), 0);
        assert.equal(await Team.countDocuments({ competitionId: id }), 0);
        assert.equal(await Match.countDocuments({ competitionId: id }), 0);
        assert.equal(await PlayGame.countDocuments({ competitionId: id }), 0, 'the game in progress too');
        assert.ok(!(await student.call('GET', '/')).body.competitions.some((c) => c.id === id), 'students no longer see it');
        assert.equal((await student.call('GET', `/${id}`)).status, 404);
        assert.equal((await boss('DELETE', `/admin/${id}`)).status, 404, 'once only');
    });

    test('a college deletes only its own', async () => {
        const platform = await Competition.findOne({ name: `Chess Cup ${STAMP}` }).lean();
        await Organization.updateOne({ _id: colleges[0].org._id }, { $set: { canHostCompetitions: true } });
        assert.equal((await colleges[0].call('DELETE', `/org/host/${platform._id}`)).status, 404);
        assert.ok(await Competition.exists({ _id: platform._id }), 'still there');
    });
});
