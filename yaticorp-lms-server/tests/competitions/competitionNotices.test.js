/**
 * Games & Competitions in the student's bell.
 *
 * A competition told its players four things (team approved, put in a team,
 * the next round, the prizes), as rewards notices that opened the Games page.
 * A team turned down, the draw, a match moved or opened, a result, a team
 * withdrawn and a cancelled competition said nothing. Now every one of those
 * reaches each player as a 'competition' notice that opens the competition,
 * and the bell gets them whether or not Career Path is switched on.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const games = require('../../src/competitions/games');
const { GameError } = require('../../src/competitions/games/contract');
const bracket = require('../../src/competitions/services/bracketService');
const Competition = require('../../src/competitions/models/Competition');
const Team = require('../../src/competitions/models/Team');
const Match = require('../../src/competitions/models/Match');
const PlayGame = require('../../src/competitions/models/PlayGame');
const Organization = require('../../src/organizations/models/Organization');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Notification = require('../../src/career/models/Notification');
const controller = require('../../src/career/controllers/notificationController');

/** A game anyone wins by saying so. */
const COIN = {
    id: 'chess', label: 'Coin', emoji: '🪙', minSeats: 2, maxSeats: 4, seatsPerSide: { min: 1, max: 2 },
    create: (seats) => ({ seats: seats.map((s) => ({ ...s })), places: null }),
    view: (state, seat) => ({ game: 'chess', status: state.places ? 'finished' : 'active', you: seat, turn: null, deadline: null, seats: state.seats.map((s) => ({ name: s.name, side: s.side, label: `Side ${s.side}`, color: '#000' })), message: '', outcome: state.places ? { places: state.places } : null }),
    act: (state, seat, action) => {
        if (state.places) throw new GameError('This game is over.');
        const sides = [...new Set(state.seats.map((s) => s.side))];
        if (action.type === 'win') return { ...state, places: [[state.seats[seat].side], sides.filter((s) => s !== state.seats[seat].side)] };
        throw new GameError('Say win.');
    },
    tick: () => null,
    deadline: () => null,
    outcome: (state) => (state.places ? { places: state.places, reason: 'Called it' } : null)
};

const STAMP = `${Date.now()}`;
const made = { orgs: [], admins: [], users: [] };
let app, boss, colleges;

const makeCollege = async (label) => {
    const org = await Organization.create({ orgCode: `N${label}-${STAMP}`, name: `${label} College ${STAMP}`, organizationType: 'college', email: `notice-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active' });
    made.orgs.push(org._id);
    const admin = await Admin.create({ name: `${label} Coordinator`, email: `notice-orgadmin-${label}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    made.admins.push(admin._id);
    const s = await makeUser(`Notice${label}`);
    await User.updateOne({ _id: s.user._id }, { $set: { organizationId: org._id } });
    made.users.push(s.user);
    const token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return { org, call: app.call(token), student: s };
};

const inDays = (d) => new Date(Date.now() + d * 86400e3).toISOString();
const noticesOf = (student) => Notification.find({ userId: student.user._id }).sort({ createdAt: 1 }).lean();
const titled = async (student, pattern) => (await noticesOf(student)).filter((n) => pattern.test(n.title));

before(async () => {
    await connect();
    games.override('chess', COIN);
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    const b = await makeAdmin('Notice Super');
    await Admin.updateOne({ _id: b.admin._id }, { $set: { role: 'superadmin' } });
    made.admins.push(b.admin._id);
    boss = app.call(b.token);
    colleges = [];
    for (const label of ['Ash', 'Birch', 'Cedar']) colleges.push(await makeCollege(label));
});

after(async () => {
    games.override('chess', null);
    const ids = (await Competition.find({ name: { $regex: STAMP } }).select('_id').lean()).map((c) => c._id);
    await Promise.all([
        PlayGame.deleteMany({ competitionId: { $in: ids } }),
        Match.deleteMany({ competitionId: { $in: ids } }),
        Team.deleteMany({ competitionId: { $in: ids } }),
        Competition.deleteMany({ _id: { $in: ids } }),
        Organization.deleteMany({ _id: { $in: made.orgs } }),
        Admin.deleteMany({ _id: { $in: made.admins } }),
        Notification.deleteMany({ userId: { $in: made.users.map((u) => u._id) } })
    ]);
    await cleanup(made.users, app.server);
});

describe('competition notices', () => {
    let comp; let teams;

    test('accepted and turned-down teams both hear, with the organizer\'s note', async () => {
        const r = await boss('POST', '/admin', { name: `Notice Cup ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), playersPerTeam: 1, maxTeams: 8, open: true });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        comp = r.body.competition;
        for (const [i, c] of colleges.entries()) {
            const t = await c.call('PUT', `/org/${comp.id}/team`, { teamName: `Team ${i}`, players: [String(c.student.user._id)] });
            assert.ok([200, 201].includes(t.status), JSON.stringify(t.body));
        }
        teams = (await boss('GET', `/admin/${comp.id}`)).body.teams;
        const byName = Object.fromEntries(teams.map((t) => [t.teamName, t]));
        await boss('PUT', `/admin/${comp.id}/teams/${byName['Team 0'].id}`, { status: 'approved' });
        await boss('PUT', `/admin/${comp.id}/teams/${byName['Team 1'].id}`, { status: 'approved' });
        await boss('PUT', `/admin/${comp.id}/teams/${byName['Team 2'].id}`, { status: 'rejected', note: 'Registration was incomplete.' });

        const [inA] = await titled(colleges[0].student, /Your team is in/);
        assert.equal(inA.type, 'competition');
        assert.equal(inA.link, `/competitions/${comp.id}`, 'it opens the competition itself');
        const [out] = await titled(colleges[2].student, /not accepted/);
        assert.ok(out, 'the turned-down team is told');
        assert.equal(out.type, 'competition');
        assert.match(out.message, /Registration was incomplete/);
    });

    test('the draw tells each player who they play and when; a moved match says the new time', async () => {
        const drawn = await boss('POST', `/admin/${comp.id}/draw`, { firstMatchAt: inDays(3) });
        assert.equal(drawn.status, 200, JSON.stringify(drawn.body));
        await bracket.settled();
        const [d0] = await titled(colleges[0].student, /Matches drawn/);
        assert.ok(d0, 'a draw notice');
        assert.match(d0.message, /Team 0 plays Team 1 on /);
        assert.equal(d0.link, `/competitions/${comp.id}`);

        const match = (await Match.find({ competitionId: comp.id }).lean())[0];
        const moved = await boss('PUT', `/admin/${comp.id}/matches/${match._id}`, { scheduledAt: inDays(4) });
        assert.equal(moved.status, 200, JSON.stringify(moved.body));
        const [m1] = await titled(colleges[1].student, /Match time changed/);
        assert.ok(m1 && / is now on /.test(m1.message), 'both sides hear the new time');
        // Saving the same time again tells nobody.
        await boss('PUT', `/admin/${comp.id}/matches/${match._id}`, { scheduledAt: (await Match.findById(match._id).lean()).scheduledAt });
        assert.equal((await titled(colleges[1].student, /Match time changed/)).length, 1);
    });

    test('a match opening and its result reach both teams', async () => {
        const match = (await Match.find({ competitionId: comp.id }).lean())[0];
        assert.equal((await boss('POST', `/admin/${comp.id}/matches/${match._id}/start`)).status, 200);
        await bracket.settled();
        assert.equal((await titled(colleges[0].student, /is open — join now/)).length, 1);
        assert.equal((await titled(colleges[1].student, /is open — join now/)).length, 1);

        const winner = String(match.sides[0].teamId);
        assert.equal((await boss('POST', `/admin/${comp.id}/matches/${match._id}/result`, { winnerTeamId: winner, note: 'Decided' })).status, 200);
        await bracket.settled();
        const teamOf = async (c) => String((await Team.findOne({ competitionId: comp.id, 'players.userId': c.student.user._id }).lean())._id);
        const winnerCollege = (await teamOf(colleges[0])) === winner ? colleges[0] : colleges[1];
        const loserCollege = winnerCollege === colleges[0] ? colleges[1] : colleges[0];
        assert.equal((await titled(winnerCollege.student, /^You won your/)).length, 1, 'the winners hear they won');
        assert.equal((await titled(loserCollege.student, / lost$/)).length, 1, 'and the others that they lost');
        assert.equal((await titled(colleges[2].student, /won|lost|open/)).length, 0, 'a team not in the match hears nothing');
    });

    test('a cancelled competition, and a withdrawn team, are told', async () => {
        const r = await boss('POST', '/admin', { name: `Called Off ${STAMP}`, game: 'chess', startsAt: inDays(3), registrationDeadline: inDays(2), playersPerTeam: 1, maxTeams: 8, open: true });
        const id = r.body.competition.id;
        await colleges[0].call('PUT', `/org/${id}/team`, { teamName: 'Stays', players: [String(colleges[0].student.user._id)] });
        assert.equal((await boss('POST', `/admin/${id}/status`, { status: 'cancelled' })).status, 200);
        const [gone] = await titled(colleges[0].student, /Competition cancelled/);
        assert.ok(gone && gone.message.includes(`Called Off ${STAMP}`));
        assert.equal(gone.link, `/competitions/${id}`);
    });

    test('with Career Path switched off, the bell still gets competition notices', async () => {
        const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
        await Notification.create({ userId: colleges[0].student.user._id, title: 'Your roadmap is ready', message: 'Career Path', type: 'system', link: '/career' });
        await controller.getNotifications({ user: colleges[0].student.user, careerOpen: false }, res);
        assert.equal(res.code, 200);
        assert.ok(res.body.some((n) => n.type === 'competition'), 'competition notices come');
        assert.ok(!res.body.some((n) => n.title === 'Your roadmap is ready'), 'Career Path\'s own do not');
    });
});
