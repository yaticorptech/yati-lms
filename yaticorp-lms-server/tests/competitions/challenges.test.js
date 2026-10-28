/**
 * Quiz and hackathon competitions (asked 2026-10-23), through the API:
 *
 *   a quiz entered by students on their own — sign up, withdraw and back, the
 *   quiz opening at its start, one timed go each with the answers saved as
 *   picked, the organizer closing it, places by score then time, the answers
 *   and standings shown after, certificates and the leaderboard;
 *
 *   a hackathon entered by college teams — the problem shown at the start, one
 *   project per team that its players may change until the deadline, the
 *   organizer's marks, the results published only once every project is marked.
 *
 * Time passing is the competition's dates moved back in the database.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup, forgetAudit } = require('../helpers');
const Competition = require('../../src/competitions/models/Competition');
const Team = require('../../src/competitions/models/Team');
const QuizAttempt = require('../../src/competitions/models/QuizAttempt');
const Submission = require('../../src/competitions/models/Submission');
const Organization = require('../../src/organizations/models/Organization');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');

const STAMP = `${Date.now()}ch`;
const made = { orgs: [], admins: [], users: [] };
let app, boss, colleges, loner, lonerUser;

const makeCollege = async (label, n) => {
    const org = await Organization.create({ orgCode: `Q${label}-${STAMP}`, name: `${label} College ${STAMP}`, organizationType: 'college', email: `quiz-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active' });
    made.orgs.push(org._id);
    const admin = await Admin.create({ name: `${label} Coordinator`, email: `quiz-orgadmin-${label}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    made.admins.push(admin._id);
    const students = [];
    for (let i = 0; i < n; i += 1) {
        const s = await makeUser(`Quiz${label}${i}`);
        await User.updateOne({ _id: s.user._id }, { $set: { organizationId: org._id } });
        made.users.push(s.user);
        students.push({ ...s, call: app.call(s.token) });
    }
    return { org, call: app.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' })), students };
};

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    const b = await makeAdmin('Quiz Super');
    await Admin.updateOne({ _id: b.admin._id }, { $set: { role: 'superadmin' } });
    made.admins.push(b.admin._id);
    boss = app.call(b.token);
    colleges = [await makeCollege('Alpha', 2), await makeCollege('Beta', 2)];
    const o = await makeUser('Quiz Loner');
    made.users.push(o.user);
    lonerUser = o.user;
    loner = app.call(o.token);
});

after(async () => {
    const ids = (await Competition.find({ name: { $regex: STAMP } }).select('_id').lean()).map((c) => c._id);
    await Promise.all([
        QuizAttempt.deleteMany({ competitionId: { $in: ids } }), Submission.deleteMany({ competitionId: { $in: ids } }),
        Team.deleteMany({ competitionId: { $in: ids } }), Competition.deleteMany({ _id: { $in: ids } }),
        Organization.deleteMany({ _id: { $in: made.orgs } }), Admin.deleteMany({ _id: { $in: made.admins } }), forgetAudit({ orgs: made.orgs, admins: made.admins })
    ]);
    await cleanup(made.users, app.server);
});

const inDays = (d) => new Date(Date.now() + d * 86400e3).toISOString();
const ago = (min) => new Date(Date.now() - min * 60000);
const QUESTIONS = [
    { prompt: 'What is 2 + 2?', options: ['3', '4', '5'], answer: 1 },
    { prompt: 'The capital of Karnataka?', options: ['Mysuru', 'Bengaluru', 'Hubballi', 'Mangaluru'], answer: 1 },
    { prompt: 'Which is a prime number?', options: ['9', '15', '7'], answer: 2, points: 2 }
];

describe('a quiz, entered by students on their own', () => {
    let id, questions;
    const [a, b] = [() => colleges[0].students[0], () => colleges[1].students[0]];

    test('the organizer makes it: questions with their answers, when it opens and closes, who enters', async () => {
        const base = { name: `GK Quiz ${STAMP}`, game: 'quiz', entry: 'individual', startsAt: inDays(2), registrationDeadline: inDays(1), endsAt: inDays(3), quiz: { minutes: 10, questions: QUESTIONS } };
        assert.equal((await boss('POST', '/admin', { ...base, quiz: { questions: [] } })).status, 400, 'no questions');
        assert.match((await boss('POST', '/admin', { ...base, quiz: { questions: [{ prompt: 'Q', options: ['a', 'b'], answer: 3 }] } })).body.message, /mark which choice is right/);
        assert.match((await boss('POST', '/admin', { ...base, endsAt: inDays(1.5) })).body.message, /close after it opens/);
        const r = await boss('POST', '/admin', { ...base, open: true, prizes: [{ place: 1, title: 'Quiz Champion', xp: 50 }] });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        id = r.body.competition.id;
        assert.deepEqual([r.body.competition.kind, r.body.competition.entry, r.body.competition.questionsCount, r.body.competition.minutes, r.body.competition.gameLabel], ['quiz', 'individual', 3, 10, 'Quiz']);
        assert.equal(r.body.challenge.questions[2].answer, 2, 'the organizer sees the answers');
        assert.equal((await boss('POST', `/admin/${id}/draw`)).status, 409, 'nothing to draw');
    });

    test('students sign up themselves (a college coordinator cannot enter a team); one may withdraw and come back', async () => {
        for (const s of [a(), b()]) assert.equal((await s.call('POST', `/${id}/signup`)).status, 201);
        const mine = (await loner('POST', `/${id}/signup`)).body;
        assert.equal(mine.competition.myTeam.collegeName, 'Independent', 'a student with no college enters as Independent');
        assert.equal((await a().call('POST', `/${id}/signup`)).status, 409, 'once only');
        assert.equal((await colleges[0].call('PUT', `/org/${id}/team`, { teamName: 'X', players: [String(a().user._id)] })).status, 409);
        assert.equal((await b().call('DELETE', `/${id}/signup`)).status, 200);
        assert.equal((await b().call('POST', `/${id}/signup`)).status, 201, 'back in');
        const detail = (await a().call('GET', `/${id}`)).body;
        assert.equal(detail.competition.teamsCount, 3);
        assert.equal(detail.competition.myTeam.teamName, a().user.name);
    });

    test('before it opens: no questions; it cannot be started', async () => {
        const q = (await a().call('GET', `/${id}/quiz`)).body;
        assert.deepEqual([q.window, q.questions.length, q.inTeam, q.count], ['before', 0, true, 3]);
        assert.equal((await a().call('POST', `/${id}/quiz/start`)).status, 409);
    });

    test('it opens at its start: one timed go each, no answers sent, saved as picked, handed in once', async () => {
        await Competition.updateOne({ _id: id }, { $set: { startsAt: ago(1), registrationDeadline: ago(2) } });
        assert.equal((await colleges[0].students[1].call('POST', `/${id}/signup`)).status, 409, 'registration has closed');
        assert.equal((await colleges[0].students[1].call('POST', `/${id}/quiz/start`)).status, 403, 'not signed up');

        const started = (await a().call('POST', `/${id}/quiz/start`)).body;
        assert.equal(started.status, 'live');
        questions = started.questions;
        assert.equal(questions.length, 3);
        assert.ok(questions.every((x) => !('answer' in x)), 'no answers sent');
        assert.ok(new Date(started.attempt.endsAt) - new Date(started.attempt.startedAt) <= 10 * 60000 + 1000, 'ten minutes');
        const again = (await a().call('POST', `/${id}/quiz/start`)).body;
        assert.equal(again.attempt.startedAt, started.attempt.startedAt, 'starting again carries on, the clock still running');

        await a().call('PUT', `/${id}/quiz`, { answers: { [questions[0].id]: 1 } });
        const saved = (await a().call('PUT', `/${id}/quiz`, { answers: { [questions[1].id]: 0, [questions[2].id]: 2 } })).body;
        assert.deepEqual(saved.attempt.answers, { [questions[0].id]: 1, [questions[1].id]: 0, [questions[2].id]: 2 });
        const done = (await a().call('PUT', `/${id}/quiz`, { submit: true })).body;
        assert.deepEqual([done.attempt.submitted, done.attempt.score, done.attempt.correct], [true, 3, 2], '2 + 2 is right (1), and 7 is prime (2 points)');
        assert.equal(done.answers, null, 'the right answers only once it is decided');
        assert.equal((await a().call('PUT', `/${id}/quiz`, { answers: { [questions[1].id]: 1 } })).status, 409, 'handed in once');

        await b().call('POST', `/${id}/quiz/start`);
        const full = (await b().call('PUT', `/${id}/quiz`, { answers: { [questions[0].id]: 1, [questions[1].id]: 1, [questions[2].id]: 2 }, submit: true })).body;
        assert.equal(full.attempt.score, 4);

        await loner('POST', `/${id}/quiz/start`);
        await loner('PUT', `/${id}/quiz`, { answers: { [questions[0].id]: 1 } });   // never handed in
    });

    test('the organizer sees the standings so far, and closes it: places by score, the answers and standings shown', async () => {
        const live = (await boss('GET', `/admin/${id}`)).body.challenge;
        assert.equal(live.attempts, 3);
        assert.deepEqual(live.standings.map((r) => r.score), [4, 3, 0], 'the unfinished go counts once it is handed in');
        const r = await boss('POST', `/admin/${id}/finish`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.competition.status, 'completed');
        assert.deepEqual(r.body.competition.winners.map((w) => [w.place, w.teamName]), [[1, b().user.name], [2, a().user.name], [3, lonerUser.name]]);

        const after = (await a().call('GET', `/${id}/quiz`)).body;
        assert.equal(after.answers[questions[1].id], 1, 'the right answer of the one missed');
        assert.equal(after.standings[1].teamName, a().user.name);
        const certs = (await a().call('GET', '/certificates')).body.certificates;
        assert.ok(certs.some((c) => c.competitionId === id && c.place === 2 && c.gameLabel === 'Quiz'));
        const board = (await a().call('GET', '/leaderboard')).body;
        assert.ok(board.players.some((p) => p.name === b().user.name && p.titles >= 1));
        assert.ok(!board.colleges.some((c) => c.id === 'null'), 'a student with no college counts for none');
        assert.equal((await boss('POST', `/admin/${id}/finish`)).status, 409, 'decided once');
    });

    test('a quiz closes by itself once its time is over', async () => {
        const r = await boss('POST', '/admin', { name: `Auto Quiz ${STAMP}`, game: 'quiz', entry: 'individual', startsAt: inDays(2), registrationDeadline: inDays(1), endsAt: inDays(3), open: true, quiz: { questions: QUESTIONS } });
        const auto = r.body.competition.id;
        await a().call('POST', `/${auto}/signup`);
        await Competition.updateOne({ _id: auto }, { $set: { startsAt: ago(30), registrationDeadline: ago(40), endsAt: ago(20) } });
        const d = (await a().call('GET', `/${auto}`)).body;
        assert.equal(d.competition.status, 'completed');
        assert.deepEqual(d.competition.winners, [], 'nobody took it: no places');
    });
});

describe('a hackathon, entered by college teams', () => {
    let id;
    const player = (college, i = 0) => colleges[college].students[i];

    test('the organizer writes the problem; colleges enter teams; the organizer approves them', async () => {
        const base = { name: `Hack Day ${STAMP}`, game: 'hackathon', startsAt: inDays(2), registrationDeadline: inDays(1), endsAt: inDays(4), playersPerTeam: 2 };
        assert.match((await boss('POST', '/admin', base)).body.message, /problem statement/);
        const r = await boss('POST', '/admin', { ...base, open: true, hackathon: { problem: 'Build an app that helps students find study partners.', criteria: 'Idea, working demo, code quality.' } });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        id = r.body.competition.id;
        assert.deepEqual([r.body.competition.kind, r.body.competition.entry], ['hackathon', 'team']);
        assert.equal((await player(0).call('POST', `/${id}/signup`)).status, 400, 'colleges enter the teams');
        for (const [i, c] of colleges.entries()) {
            assert.equal((await c.call('PUT', `/org/${id}/team`, { teamName: `Hackers ${i}`, players: c.students.map((s) => String(s.user._id)) })).status, 201);
        }
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
    });

    test('before it starts: the problem is hidden and nothing can be handed in', async () => {
        const p = (await player(0).call('GET', `/${id}/project`)).body;
        assert.deepEqual([p.window, p.problem, p.inTeam], ['before', '', true]);
        assert.equal((await player(0).call('PUT', `/${id}/project`, { title: 'Early', repoUrl: 'https://github.com/x/y' })).status, 409);
    });

    test('once it starts: the problem shows; a player hands in the team\'s project, a teammate changes it', async () => {
        await Competition.updateOne({ _id: id }, { $set: { startsAt: ago(60), registrationDeadline: ago(70) } });
        const p = (await player(0).call('GET', `/${id}/project`)).body;
        assert.match(p.problem, /study partners/);
        assert.equal((await player(0).call('PUT', `/${id}/project`, { title: 'StudyBuddy', repoUrl: 'github.com/x' })).status, 400, 'a link must be a web address');
        assert.equal((await player(0).call('PUT', `/${id}/project`, { title: 'StudyBuddy' })).status, 400, 'a link to see it');
        const saved = (await player(0).call('PUT', `/${id}/project`, { title: 'StudyBuddy', summary: 'Match by subject.', repoUrl: 'https://github.com/alpha/studybuddy' })).body;
        assert.equal(saved.project.title, 'StudyBuddy');
        assert.equal(saved.project.score, undefined, 'no marks shown before the results');
        const changed = (await player(0, 1).call('PUT', `/${id}/project`, { title: 'StudyBuddy 2', repoUrl: 'https://github.com/alpha/studybuddy', demoUrl: 'https://studybuddy.example.com' })).body;
        assert.equal(changed.project.title, 'StudyBuddy 2', 'one project per team');
        await player(1).call('PUT', `/${id}/project`, { title: 'PeerUp', demoUrl: 'https://peerup.example.com' });
        assert.equal(await Submission.countDocuments({ competitionId: id }), 2);
    });

    test('the organizer marks the projects and publishes the results after the deadline', async () => {
        assert.match((await boss('POST', `/admin/${id}/finish`)).body.message, /until the deadline/);
        await Competition.updateOne({ _id: id }, { $set: { endsAt: ago(5) } });
        assert.equal((await player(0).call('PUT', `/${id}/project`, { title: 'Late', repoUrl: 'https://github.com/a/b' })).status, 409, 'the deadline has passed');
        assert.match((await boss('POST', `/admin/${id}/finish`)).body.message, /Mark every project/);
        const subs = (await boss('GET', `/admin/${id}`)).body.challenge.submissions;
        const alpha = subs.find((s) => s.title === 'StudyBuddy 2'), beta = subs.find((s) => s.title === 'PeerUp');
        assert.equal((await boss('PUT', `/admin/${id}/submissions/${alpha.id}`, { score: 120 })).status, 400);
        await boss('PUT', `/admin/${id}/submissions/${alpha.id}`, { score: 80, feedback: 'Good idea; finish the demo.' });
        await boss('PUT', `/admin/${id}/submissions/${beta.id}`, { score: 92 });
        const r = await boss('POST', `/admin/${id}/finish`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.competition.winners.map((w) => [w.place, w.teamName]), [[1, 'Hackers 1'], [2, 'Hackers 0']]);
        const p = (await player(0).call('GET', `/${id}/project`)).body;
        assert.deepEqual([p.project.score, p.project.feedback], [80, 'Good idea; finish the demo.']);
        assert.deepEqual(p.standings.map((s) => s.teamName), ['Hackers 1', 'Hackers 0']);
        assert.equal((await boss('PUT', `/admin/${id}/submissions/${alpha.id}`, { score: 95 })).status, 409, 'marks stay once published');
    });
});
