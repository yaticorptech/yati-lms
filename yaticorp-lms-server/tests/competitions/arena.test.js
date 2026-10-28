/**
 * Quiz Arena end to end, through the real routes: the question bank and its
 * review, publishing (the paper frozen against later bank edits),
 * registration as in Chess (each college's coordinator enters its students,
 * the platform admin approves them), personal joining codes, all three rounds
 * played live, a question left to time out, an answer too late, a second
 * answer refused, a student reconnecting mid-quiz, scoring and tie-breaks,
 * publishing results, both leaderboards and the certificates.
 *
 * Time is moved by setting the contest's startedAt back: the quiz is wherever
 * the clock says, so a test can stand at any question of any round.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const Organization = require('../../src/organizations/models/Organization');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Notification = require('../../src/career/models/Notification');
const { ArenaQuestion, ArenaCompetition, ArenaEntry } = require('../../src/competitions/arena/models');
const { phaseAt, totalMs, closedBy, stateOf, INTRO_MS, REVEAL_MS } = require('../../src/competitions/arena/timeline');
const scoring = require('../../src/competitions/arena/scoring');

const STAMP = `${Date.now()}`;
const SECONDS = 20;
const Q = SECONDS * 1000;

describe('the timeline (pure)', () => {
    const paper = [1, 1, 2, 3, 3].map((round) => ({ round }));
    const c = { startsAt: new Date(0), startedAt: new Date(0), secondsPerQuestion: SECONDS, paper, status: 'published', registrationDeadline: new Date(-1) };
    const at = (ms) => phaseAt(c, ms);

    test('intro, then each question open for its seconds, the next one straight after, round by round', () => {
        assert.equal(at(-1).stage, 'waiting');
        assert.deepEqual([at(0).stage, at(0).round], ['intro', 1]);
        const q1 = at(INTRO_MS);
        assert.deepEqual([q1.stage, q1.index, q1.inRound, q1.roundSize, q1.endsAt], ['question', 0, 1, 2, INTRO_MS + Q]);
        assert.deepEqual([at(INTRO_MS + Q).stage, at(INTRO_MS + Q).index], ['question', 1], 'no pause: the next question opens as one closes');
        const r2 = INTRO_MS + 2 * (Q + REVEAL_MS);
        assert.deepEqual([at(r2).stage, at(r2).round], ['intro', 2]);
        assert.deepEqual([at(r2 + INTRO_MS).stage, at(r2 + INTRO_MS).index, at(r2 + INTRO_MS).round], ['question', 2, 2]);
        assert.equal(totalMs(c), 3 * INTRO_MS + 5 * (Q + REVEAL_MS));
        assert.equal(at(totalMs(c)).stage, 'finished');
    });

    test('a question counts as closed only once its time is up', () => {
        assert.equal(closedBy(c, INTRO_MS + 1000), 0);
        assert.equal(closedBy(c, INTRO_MS + Q), 1);
        assert.equal(closedBy(c, INTRO_MS + 2 * (Q + REVEAL_MS)), 2, 'during round 2\'s intro');
        assert.equal(closedBy(c, totalMs(c)), 5);
    });

    test('the badge follows the clock', () => {
        assert.equal(stateOf({ ...c, startedAt: null, startsAt: new Date(1e6), registrationDeadline: new Date(5e5) }, 0), 'registration');
        assert.equal(stateOf({ ...c, startedAt: null, startsAt: new Date(1e6), registrationDeadline: new Date(5e5) }, 6e5), 'upcoming');
        assert.equal(stateOf({ ...c, startedAt: null, startsAt: new Date(1e6), registrationDeadline: new Date(5e5) }, 2e6), 'upcoming', 'past its time, not started: still waiting for the admin');
        assert.equal(stateOf(c, 10), 'live');
        assert.equal(stateOf(c, totalMs(c)), 'ended');
        assert.equal(stateOf({ ...c, resultsPublishedAt: new Date() }, 10), 'results');
    });
});

describe('ranking (pure)', () => {
    const e = (name, answers, registeredAt = 0, org = 'A') => ({ name, answers, registeredAt: new Date(registeredAt), joinedAt: new Date(), organizationId: org, collegeName: org });
    const right = (ms) => ({ correct: true, points: 100, ms });
    const wrong = { correct: false, points: 0, ms: 1000 };

    test('points first, then time on right answers, then who registered first', () => {
        const ranked = scoring.rank([
            e('slow', [right(9000), right(9000)]),
            e('fast', [right(1000), right(2000)]),
            e('one', [right(500), wrong]),
            e('twin-late', [right(1000), right(2000)], 10),
            { ...e('never came', []), joinedAt: null }
        ]);
        assert.deepEqual(ranked.map((r) => [r.entry.name, r.rank, r.score]), [['fast', 1, 200], ['twin-late', 2, 200], ['slow', 3, 200], ['one', 4, 100]]);
    });

    test('colleges by average score, then how many took part', () => {
        const ranked = scoring.rank([e('a1', [right(1)], 0, 'A'), e('a2', [wrong], 0, 'A'), e('b1', [right(1)], 0, 'B'), e('c1', [wrong], 0, 'C')]);
        assert.deepEqual(scoring.colleges(ranked).map((c) => [c.collegeName, c.averageScore, c.participants, c.rank]), [['B', 100, 1, 1], ['A', 50, 2, 2], ['C', 0, 1, 3]]);
    });
});

describe('Quiz Arena through the API', () => {
    let app, boss, bossAdmin, orgA, orgB, coordA, coordB, coordAdmins, students, compId, paper;
    const as = (i) => students[i].call;

    before(async () => {
        await connect();
        app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
        const b = await makeAdmin('Arena Boss');
        await Admin.updateOne({ _id: b.admin._id }, { $set: { role: 'superadmin' } });
        bossAdmin = b.admin;
        boss = app.call(b.token);
        orgA = await Organization.create({ orgCode: `QA-${STAMP}`, name: `Arena Alpha ${STAMP}`, organizationType: 'college', email: `arena-a-${STAMP}@example.com`, status: 'active' });
        orgB = await Organization.create({ orgCode: `QB-${STAMP}`, name: `Arena Beta ${STAMP}`, organizationType: 'college', email: `arena-b-${STAMP}@example.com`, status: 'active' });
        coordAdmins = [];
        const coord = async (org, label) => {
            const a = await Admin.create({ name: `${label} Coordinator`, email: `arena-org-${label}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
            coordAdmins.push(a);
            return app.call(jwt.sign({ id: String(a._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
        };
        coordA = await coord(orgA, 'a');
        coordB = await coord(orgB, 'b');
        students = [];
        for (const [i, org] of [orgA, orgA, orgB, null].entries()) {
            const s = await makeUser(`Arena ${i}`);
            if (org) await User.updateOne({ _id: s.user._id }, { $set: { organizationId: org._id } });
            students.push({ ...s, call: app.call(s.token) });
        }
    });

    after(async () => {
        const comps = await ArenaCompetition.find({ title: { $regex: STAMP } }).select('_id').lean();
        await ArenaEntry.deleteMany({ competitionId: { $in: comps.map((c) => c._id) } });
        await ArenaCompetition.deleteMany({ title: { $regex: STAMP } });
        await ArenaQuestion.deleteMany({ prompt: { $regex: STAMP } });
        await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
        await cleanup(students.map((s) => s.user), app.server, [bossAdmin, ...coordAdmins]);
    });

    const question = (round, n, extra = {}) => ({
        round, prompt: `R${round} question ${n} ${STAMP}`, options: ['A', 'B', 'C', 'D'], answer: n % 4,
        category: 'Test', difficulty: 'easy', ...(round === 2 ? { imageUrl: 'https://example.com/pic.jpg' } : {}), ...(round === 3 ? { source: 'Test source' } : {}), ...extra
    });

    test('the question bank: checked, drafts until reviewed, and edits send one back to review', async () => {
        assert.equal((await as(0)('GET', '/arena/admin/questions')).status, 401, 'students cannot see the bank');
        assert.equal((await boss('POST', '/arena/admin/questions', { ...question(1, 0), options: ['A', 'A', 'B', 'C'] })).status, 400, 'options must differ');
        assert.equal((await boss('POST', '/arena/admin/questions', { ...question(2, 0), imageUrl: '' })).status, 400, 'a picture question needs a picture');
        const made = [];
        for (const [round, n] of [[1, 2], [2, 1], [3, 2]]) {
            for (let k = 0; k < n; k += 1) {
                const r = await boss('POST', '/arena/admin/questions', question(round, k));
                assert.equal(r.status, 201, JSON.stringify(r.body));
                assert.equal(r.body.question.status, 'draft');
                made.push(r.body.question);
            }
        }
        for (const q of made) assert.equal((await boss('POST', `/arena/admin/questions/${q._id}/review`, { approve: true })).body.question.status, 'approved');
        const edited = await boss('PUT', `/arena/admin/questions/${made[0]._id}`, { ...question(1, 0), prompt: `R1 question 0 edited ${STAMP}` });
        assert.equal(edited.body.question.status, 'draft', 'edited: reviewed again');
        await boss('POST', `/arena/admin/questions/${made[0]._id}/review`, { approve: true });
    });

    test('a contest: created as a draft, published only with enough approved questions, then frozen', async () => {
        // Registration ends today; the quiz is planned for a later day (the admin may start it any time).
        const start = new Date(Date.now() + 2 * 86400e3);
        const base = { title: `Arena Cup ${STAMP}`, startsAt: start, registrationDeadline: new Date(Date.now() + 1800e3), counts: { 1: 2, 2: 1, 3: 2 }, eligibility: { organizationIds: [String(orgA._id), String(orgB._id)] } };
        const r = await boss('POST', '/arena/admin', base);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        compId = r.body.competition.id;
        assert.equal((await as(0)('GET', `/arena/${compId}`)).status, 404, 'a draft is not shown to students');
        // This test's own questions, chosen by hand: the rest of the bank stays out of it.
        const pick = async (rd) => (await ArenaQuestion.find({ round: rd, prompt: { $regex: STAMP } }).sort({ createdAt: 1 }).lean()).map((q) => String(q._id));
        const selection = { 1: await pick(1), 2: await pick(2), 3: await pick(3) };
        const tooMany = await boss('PUT', `/arena/admin/${compId}`, { counts: { 1: 1, 2: 1, 3: 2 }, selection });
        assert.equal(tooMany.status, 200);
        const over = await boss('POST', `/arena/admin/${compId}/publish`);
        assert.equal(over.status, 400, 'more chosen than the round takes');
        assert.match(over.body.message, /Round 1 has 2 questions chosen but takes 1/);
        await boss('PUT', `/arena/admin/${compId}`, { counts: { 1: 2, 2: 1, 3: 2 } });
        const pub = await boss('POST', `/arena/admin/${compId}/publish`);
        assert.equal(pub.status, 200, JSON.stringify(pub.body));
        assert.equal(pub.body.competition.state, 'registration');
        paper = (await ArenaCompetition.findById(compId).lean()).paper;
        assert.deepEqual(paper.map((q) => q.round), [1, 1, 2, 3, 3]);
        assert.ok(paper.every((q) => q.prompt.includes(STAMP)), 'the chosen questions');

        // Editing the bank now leaves the published paper as it was.
        const one = await ArenaQuestion.findOne({ prompt: paper[0].prompt });
        await boss('PUT', `/arena/admin/questions/${one._id}`, { ...question(1, 9), prompt: `Changed ${STAMP}` });
        assert.equal((await ArenaCompetition.findById(compId).lean()).paper[0].prompt, paper[0].prompt);
        const timing = await boss('PUT', `/arena/admin/${compId}`, { secondsPerQuestion: 5, title: `Arena Cup ${STAMP} (renamed)` });
        assert.equal(timing.status, 200);
        const saved = await ArenaCompetition.findById(compId).lean();
        assert.equal(saved.secondsPerQuestion, SECONDS, 'timing is fixed once published');
        assert.match(saved.title, /renamed/, 'the words may still change');
    });

    test('registration as in Chess: coordinators enter their own students, the admin approves', async () => {
        const id = (i) => String(students[i].user._id);
        const listed = (await as(0)('GET', '/arena')).body.competitions.find((c) => c.id === compId);
        assert.ok(listed, 'shown in the Competitions section');
        assert.equal(listed.entryStatus, null);
        assert.ok(!JSON.stringify(listed).includes('"answer"'), 'no answers in the listing');
        assert.equal((await as(0)('POST', `/arena/${compId}/register`)).status, 404, 'students do not enter themselves');

        assert.ok((await coordA('GET', '/org/arena')).body.competitions.some((c) => c.id === compId && c.registrationOpen));
        assert.equal((await coordA('PUT', `/org/arena/${compId}/entries`, { players: [id(0), id(2)] })).status, 400, 'only the college\'s own students');
        const a = await coordA('PUT', `/org/arena/${compId}/entries`, { players: [id(0), id(1)] });
        assert.equal(a.status, 200, JSON.stringify(a.body));
        assert.deepEqual(a.body.entries.map((e) => e.status), ['pending', 'pending']);
        assert.equal((await coordB('PUT', `/org/arena/${compId}/entries`, { players: [id(2)] })).status, 200);
        assert.equal((await ArenaCompetition.findById(compId).lean()).registeredCount, 3);
        assert.equal((await as(0)('GET', `/arena/${compId}/live`)).status, 403, 'not approved yet: cannot play');
        assert.equal((await as(0)('GET', `/arena/${compId}`)).body.competition.entryStatus, 'pending');

        const all = await boss('POST', `/arena/admin/${compId}/entries/review`, { organizationId: String(orgA._id), status: 'approved' });
        assert.equal(all.body.updated, 2, 'a whole college at once');
        const bEntry = (await boss('GET', `/arena/admin/${compId}`)).body.participants.find((p) => p.organizationId === String(orgB._id));
        assert.equal((await boss('POST', `/arena/admin/${compId}/entries/review`, { entryIds: [bEntry.id], status: 'approved' })).body.updated, 1);
        const mine = (await as(0)('GET', `/arena/${compId}`)).body.competition;
        assert.equal(mine.registered, true);
        assert.equal(mine.myCode, null, 'approved, not started: the code is not shown yet');
        assert.equal((await as(3)('GET', `/arena/${compId}/live`)).status, 403, 'not entered: cannot play');
    });

    /** Stand the quiz `ms` after its start. */
    const goTo = async (ms) => { await ArenaCompetition.updateOne({ _id: compId }, { $set: { startedAt: new Date(Date.now() - ms) } }); };
    const openOf = (k) => INTRO_MS + k * (Q + REVEAL_MS) + (k >= 2 ? INTRO_MS : 0) + (k >= 3 ? INTRO_MS : 0);
    const live = (i) => as(i)('GET', `/arena/${compId}/live`).then((r) => r.body);
    const answer = (i, index, choice) => as(i)('POST', `/arena/${compId}/answer`, { index, choice });

    test('before the admin presses Start: no code shown, no pop-up, and joining is refused', async () => {
        const entry = await ArenaEntry.findOne({ competitionId: compId, userId: students[0].user._id }).lean();
        assert.equal((await as(0)('GET', `/arena/${compId}`)).body.competition.myCode, null);
        assert.ok(!(await as(0)('GET', '/alerts')).body.alerts.some((x) => x.arenaId === compId), 'no pop-up before Start');
        if (entry.joinCode) assert.equal((await as(0)('POST', `/arena/${compId}/join`, { code: entry.joinCode })).status, 409, 'a code is no use before Start');
        const page = await live(0);
        assert.equal(page.started, false);
        assert.equal(page.stage, 'waiting', 'it never starts by itself');
    });

    test('Start now opens the quiz; each student joins with their own code only', async () => {
        const r = await boss('POST', `/arena/admin/${compId}/start-now`);
        assert.equal(r.status, 200);
        assert.equal(r.body.competition.state, 'live');
        assert.equal((await coordA('PUT', `/org/arena/${compId}/entries`, { players: [String(students[0].user._id)] })).status, 409, 'too late to change entries');

        assert.equal((await live(0)).needsCode, true, 'nothing until the code is entered');
        const codes = await Promise.all([0, 1, 2].map(async (i) => (await ArenaEntry.findOne({ competitionId: compId, userId: students[i].user._id }).lean()).joinCode));
        assert.ok(codes.every((x) => /^[A-Z2-9]{6}$/.test(x)) && new Set(codes).size === 3, 'everyone approved has their own code');
        const alerts = (await as(0)('GET', '/alerts')).body;
        assert.equal(alerts.alerts.find((x) => x.arenaId === compId)?.code, codes[0], 'the pop-up has my code');
        assert.ok(!JSON.stringify(alerts).includes(codes[1]), 'and never anyone else\'s');
        assert.equal((await as(0)('POST', `/arena/${compId}/join`, { code: codes[1] })).status, 403, 'not another student\'s');
        assert.equal((await as(0)('POST', '/matches/join', { code: codes[1] })).status, 403);
        assert.equal((await as(0)('POST', `/arena/${compId}/answer`, { index: 0, choice: 0 })).status, 403, 'no answering before joining');
        assert.equal((await as(0)('POST', `/arena/${compId}/join`, { code: codes[0].toLowerCase() })).status, 200);
        assert.deepEqual((await as(1)('POST', '/matches/join', { code: codes[1] })).body, { arena: { id: compId } }, 'the Join with a code box works too');
        assert.equal((await as(2)('POST', `/arena/${compId}/join`, { code: codes[2] })).status, 200);
        assert.equal((await live(0)).stage, 'intro');
        assert.ok(!(await as(0)('GET', '/alerts')).body.alerts.some((x) => x.arenaId === compId), 'joined: no more pop-up');
    });

    test('round 1: the same question for all, no answer sent while open, one answer each', async () => {
        await goTo(openOf(0) + 2000);
        const a = await live(0); const b = await live(2);
        assert.equal(a.stage, 'question');
        assert.equal(a.round, 1);
        assert.equal(a.roundName, 'Live Quiz Battle');
        assert.deepEqual(a.question, b.question, 'everyone gets the same question');
        assert.equal(a.answer, null, 'the answer is not sent while the question is open');
        assert.ok(Math.abs(a.endsAt - b.endsAt) < 5, 'and the same deadline');
        assert.equal((await answer(0, 0, paper[0].answer)).status, 200);
        assert.equal((await answer(0, 0, (paper[0].answer + 1) % 4)).status, 409, 'a second answer is refused');
        const twin = await Promise.all([answer(1, 0, paper[0].answer), answer(1, 0, paper[0].answer)]);
        assert.deepEqual(twin.map((x) => x.status).sort(), [200, 409], 'a double tap counts once');
        const mine = await live(0);
        assert.deepEqual(mine.mine, { choice: paper[0].answer }, 'my choice, but not yet whether it was right');
        assert.equal(mine.score, null, 'no score while the quiz runs');
        assert.equal((await answer(0, 1, 0)).status, 409, 'a question not open yet');
    });

    test('the next question follows at once; nothing says right or wrong; a late answer is refused', async () => {
        await goTo(openOf(0) + Q + 2000);
        const r = await live(0);
        assert.deepEqual([r.stage, r.index], ['question', 1]);
        assert.equal(r.answer, null, 'never the right answer');
        assert.equal(r.score, null, 'no score until the results are out');
        assert.equal((await answer(2, 0, paper[0].answer)).status, 409, 'too late for question 1');
    });

    test('question 2 times out unanswered by everyone: zero points, nobody removed, the quiz moves on', async () => {
        await goTo(openOf(1) + Q + 100);
        const r = await live(2);
        assert.equal(r.stage, 'intro', 'straight on to round 2\'s card');
        assert.equal(r.nextImagePath, `/competitions/arena/${compId}/image/2`, 'its first picture, to load ahead');
        await goTo(openOf(2) + 1000);
        const next = await live(2);
        assert.equal(next.stage, 'question');
        assert.equal(next.round, 2, 'on to round 2');
        assert.equal(next.roundName, 'Picture Challenge');
        assert.equal(next.question.imageUrl, undefined, 'the picture\'s address (which can name the answer) is not sent');
        assert.equal(next.question.imagePath, `/competitions/arena/${compId}/image/2`, 'it is served by the server instead');
        assert.equal((await as(0)('GET', `/arena/${compId}/image/4`)).status, 404, 'not before its question opens');
        assert.equal((await answer(2, 2, paper[2].answer)).status, 200, 'still playing');
        assert.equal((await answer(1, 2, (paper[2].answer + 1) % 4)).status, 200, 'a wrong one');
    });

    test('reconnecting mid-question: same question, same deadline, the answer kept', async () => {
        await goTo(openOf(3) + 3000);
        await answer(0, 3, paper[3].answer);
        const first = await live(0);
        const back = await live(0);         // a fresh page after a dropped connection
        assert.equal(back.index, 3);
        assert.equal(back.round, 3);
        assert.equal(back.roundName, 'Current Affairs Clash');
        assert.equal(back.endsAt, first.endsAt, 'the timer does not restart');
        assert.deepEqual(back.mine, { choice: paper[3].answer });
        await answer(2, 3, paper[3].answer);
        await goTo(openOf(4) + 1000);
        await answer(0, 4, (paper[4].answer + 1) % 4);
        await answer(2, 4, paper[4].answer);
    });

    test('results: reviewed by the admin only after the end, then published; leaderboards and certificates', async () => {
        assert.equal((await boss('POST', `/arena/admin/${compId}/publish-results`)).status, 409, 'not over yet');
        await goTo(totalMs(await ArenaCompetition.findById(compId).lean()) + 10);
        assert.equal((await as(0)('GET', `/arena/${compId}/results`)).status, 409, 'not published yet');
        const review = (await boss('GET', `/arena/admin/${compId}/results`)).body;
        assert.equal(review.final, true);
        // Student 0: Q1, Q4 right, Q5 wrong = 200. Student 1: Q1 right = 100. Student 2: Q3, Q4, Q5 right = 300.
        assert.deepEqual(review.ranked.map((r) => [r.score, r.rank]), [[300, 1], [200, 2], [100, 3]]);
        assert.equal(review.maxScore, 500);
        assert.equal((await boss('POST', `/arena/admin/${compId}/publish-results`)).status, 200);
        // At once: the winner is told, and sees it in their list with a certificate.
        let told = [];
        for (let i = 0; i < 30 && !told.length; i += 1) {
            told = (await Notification.find({ userId: students[2].user._id }).lean()).filter((n) => /1st place/.test(n.title));
            if (!told.length) await new Promise((r) => setTimeout(r, 100));
        }
        assert.ok(told.length, 'the winner is told');
        const listed = (await as(2)('GET', '/arena')).body.competitions.find((c) => c.id === compId);
        assert.equal(listed.state, 'results');
        assert.deepEqual([listed.myResult.rank, listed.myResult.certificate], [1, true], 'in Results and History, with the certificate');
        assert.equal(listed.winners[0].name, students[2].user.name, 'the top three listed');
        assert.equal((await live(2)).score, 300, 'the score shows once published');

        const res = (await as(0)('GET', `/arena/${compId}/results`)).body;
        assert.equal(res.top.length, 3);
        assert.equal(res.me.rank, 2);
        assert.equal(res.me.you, true);
        assert.deepEqual(res.colleges.map((c) => [c.collegeName, c.averageScore]), [[orgB.name, 300], [orgA.name, 150]]);
        assert.equal((await as(0)('GET', `/arena/${compId}`)).body.competition.myResult.rank, 2);

        const pdf = await fetch(`http://127.0.0.1:${app.server.address().port}/api/competitions/arena/${compId}/certificate`, { headers: { Authorization: `Bearer ${students[0].token}` } });
        assert.equal(pdf.status, 200);
        assert.equal(pdf.headers.get('content-type'), 'application/pdf');
        assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
        assert.equal((await as(3)('GET', `/arena/${compId}/certificate`)).status, 404, 'no certificate without taking part');
    });

    test('a published contest cannot be deleted, only cancelled', async () => {
        assert.equal((await boss('DELETE', `/arena/admin/${compId}`)).status, 409);
        assert.equal((await boss('POST', `/arena/admin/${compId}/cancel`)).status, 409, 'its results are published');
    });
});
