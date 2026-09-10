/**
 * The interview section end to end through its real routes: dashboard and
 * practice bank, a session from first question to report, follow-ups, voice
 * metrics, the guards, ownership, history and improvement. Needs the
 * database from .env; runs the built-in interviewer so no AI key is used.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, me, other, api, otherApi;
const SHORT = ['Python.', 'I like it.', 'Not much.'];
const FULL = [
    'I am a final-year computer science student. First, I built a sales dashboard in Python and SQL for a retail client, then I automated its weekly report, and as a result the team saved a day each week. For example, the pipeline now runs unattended.',
    'My strongest skill is Python. For example, in the dashboard project I used pandas for the transforms and wrote tests first, so that regressions were caught early. As a result the client trusted the numbers.',
    'There was a time our team missed a deadline. First I organised daily stand-ups, then I split the remaining work into small pieces, and finally we delivered a week later with a better outcome. I learned to raise risks early.'
];

before(async () => { await connect(); app = startApp(); me = await makeUser('Asha'); other = await makeUser('Other'); api = app.call(me.token); otherApi = app.call(other.token); });
after(async () => { await cleanup([me.user, other.user], app.server); });

describe('guards', () => {
    test('rejects requests without a token', async () => { const r = await app.call(null)('GET', '/dashboard'); assert.equal(r.status, 401); });
    test('rejects an unknown interview type', async () => { const r = await api('POST', '/sessions', { type: 'panel' }); assert.equal(r.status, 400); assert.match(r.body.message, /valid interview type/); });
});

describe('dashboard and practice bank', () => {
    test('dashboard reports readiness, the student, and the built-in interviewer', async () => {
        const r = await api('GET', '/dashboard'); assert.equal(r.status, 200);
        assert.equal(r.body.student.firstName, 'Asha');
        assert.ok(r.body.readiness.overall >= 0 && r.body.readiness.overall <= 100); assert.equal(r.body.readiness.breakdown.length, 5);
        assert.deepEqual(r.body.types, ['hr', 'technical', 'project', 'behavioral', 'full']);
        assert.equal(r.body.ai.model, 'template'); assert.equal(r.body.activeSession, null);
        assert.ok(r.body.practice.total > 0);
    });
    test('practising a question is recorded once and unknown ids are refused', async () => {
        const q = await api('GET', '/questions'); assert.equal(q.status, 200); assert.ok(q.body.questions.length > 0);
        const id = q.body.questions[0].id;
        const first = await api('POST', `/questions/${id}/practice`); assert.equal(first.status, 200); assert.ok(first.body.practiced.includes(id));
        const again = await api('POST', `/questions/${id}/practice`); assert.equal(again.status, 200); assert.equal(again.body.practiced.filter((x) => x === id).length, 1);
        const missing = await api('POST', '/questions/nope/practice'); assert.equal(missing.status, 404);
    });
});

describe('a session, start to report', () => {
    let s;
    test('starts with a spoken greeting and a first question from the plan', async () => {
        const r = await api('POST', '/sessions', { type: 'hr', role: 'Data Analyst' }); assert.equal(r.status, 201); s = r.body;
        assert.equal(s.status, 'active'); assert.equal(s.turns.length, 1); assert.ok(s.turns[0].question.length > 10);
        assert.equal(s.turns[0].stage, s.plan[0]); assert.equal(s.plannedMinutes, 10); assert.equal(s.maxQuestions, 8);
        // The opening question greets and welcomes by itself; nothing else may, or the welcome is heard twice.
        assert.match(s.turns[0].question, /Asha/); assert.match(s.turns[0].question, /welcome/i);
        assert.equal(s.greeting, undefined, 'no separate greeting field to prepend');
        assert.equal(s.interviewer, 'template');
        const d = await api('GET', '/dashboard'); assert.equal(d.body.activeSession.id, s.id);
    });
    test('refuses an empty answer and finishing too early', async () => {
        assert.equal((await api('POST', `/sessions/${s.id}/answer`, { answer: '   ' })).status, 400);
        const f = await api('POST', `/sessions/${s.id}/finish`); assert.equal(f.status, 400); assert.match(f.body.message, /at least two/);
    });
    test('a short spoken answer gets a follow-up and keeps its voice metrics', async () => {
        const r = await api('POST', `/sessions/${s.id}/answer`, { answer: 'Um, Python.', inputMode: 'voice', voice: { durationMs: 4000, longPauses: 1, pauseMs: 2600 } });
        assert.equal(r.status, 200); assert.equal(r.body.done, false);
        const [answered, next] = r.body.turns;
        assert.equal(answered.inputMode, 'voice'); assert.equal(answered.voice.wordCount, 2); assert.equal(answered.voice.fillerCount, 1); assert.equal(answered.voice.longPauses, 1);
        assert.equal(next.isFollowUp, true); assert.equal(next.stage, answered.stage); assert.match(next.question, /expand|specific example/i);
    });
    test('a full answer moves to the next stage; a typed one has no pace', async () => {
        const r = await api('POST', `/sessions/${s.id}/answer`, { answer: FULL[0], inputMode: 'text' }); assert.equal(r.status, 200);
        const turns = r.body.turns; const last = turns[turns.length - 1];
        assert.equal(turns[1].voice.wpm, null); assert.equal(turns[1].inputMode, 'text');
        assert.equal(last.answer, ''); assert.ok(turns.filter((t) => t.answer).length === 2);
        assert.equal(r.body.progress, 25);
    });
    test('another student cannot see or answer it', async () => {
        assert.equal((await otherApi('GET', `/sessions/${s.id}`)).status, 404);
        assert.equal((await otherApi('POST', `/sessions/${s.id}/answer`, { answer: FULL[1] })).status, 404);
    });
    test('runs to the closing message when the plan is exhausted', async () => {
        let r; let guard = 0;
        do { r = await api('POST', `/sessions/${s.id}/answer`, { answer: SHORT[guard % 3] + ' ' + FULL[guard % 3], inputMode: 'voice', voice: { durationMs: 20000 } }); assert.equal(r.status, 200); guard += 1; } while (!r.body.done && guard < 20);
        assert.equal(r.body.done, true); assert.match(r.body.closingMessage, /concludes our interview/);
        assert.ok(r.body.turns.length <= 8); assert.equal(r.body.progress, 100);
        assert.equal((await api('POST', `/sessions/${s.id}/answer`, { answer: 'late' })).status, 409);
    });
    test('finishing produces the report, delivery notes, a recommendation and XP', async () => {
        const r = await api('POST', `/sessions/${s.id}/finish`); assert.equal(r.status, 200);
        const rep = r.body.report; assert.ok(rep, 'report present'); assert.equal(r.body.status, 'completed');
        assert.ok(rep.overall >= 0 && rep.overall <= 100); assert.equal(Object.keys(rep.scores).length, 6);
        assert.equal(rep.perQuestion.length, r.body.turns.filter((t) => t.answer).length);
        assert.ok(rep.communication.notes.length >= 2);
        assert.equal(rep.communication.answers, rep.perQuestion.length); assert.equal(rep.communication.voiceAnswers, rep.perQuestion.length - 1, 'every answer but the typed one was spoken');
        assert.match(rep.recommendation, /next mock interview\.$/);
        assert.ok(rep.plan.some((p) => /another mock interview/i.test(p.title)));
        assert.equal(rep.improvedBy, 0);
        assert.ok(Array.isArray(r.body.events)); assert.ok(r.body.xp.completed >= 0);
        const again = await api('POST', `/sessions/${s.id}/finish`); assert.equal(again.status, 200); assert.equal(again.body.report.overall, rep.overall);
        const d = await api('GET', '/dashboard'); assert.equal(d.body.activeSession, null); assert.equal(d.body.readiness.prep.mocks, 1);
    });
});

describe('history and improvement', () => {
    test('a stronger second interview shows the improvement and is numbered', async () => {
        const first = (await api('GET', '/sessions')).body.sessions[0]; assert.equal(first.number, 1); assert.equal(typeof first.score, 'number');
        const s2 = (await api('POST', '/sessions', { type: 'behavioral' })).body; assert.equal(s2.status, 'active');
        let r; let i = 0; do { r = await api('POST', `/sessions/${s2.id}/answer`, { answer: FULL[i % 3], inputMode: 'text' }); i += 1; } while (!r.body.done && i < 20);
        const fin = await api('POST', `/sessions/${s2.id}/finish`); assert.equal(fin.status, 200);
        const rows = (await api('GET', '/sessions')).body.sessions; assert.equal(rows.length, 2); assert.equal(rows[0].number, 2); assert.equal(rows[0].id, s2.id);
        assert.ok(rows[0].score >= rows[1].score, `second ${rows[0].score} should not be below first ${rows[1].score}`);
        if (rows[0].score > rows[1].score) { assert.equal(fin.body.report.improvedBy, rows[0].score - rows[1].score); assert.ok(fin.body.xp.improved >= 0); }
        assert.equal(fin.body.report.communication.voiceAnswers, 0); assert.ok(fin.body.report.communication.notes.some((n) => n.kind === 'voice'));
    });
    test('starting a new interview abandons a still-open one', async () => {
        const a = (await api('POST', '/sessions', { type: 'technical' })).body; const b = (await api('POST', '/sessions', { type: 'project' })).body;
        assert.equal((await api('GET', `/sessions/${a.id}`)).body.status, 'abandoned'); assert.equal((await api('GET', `/sessions/${b.id}`)).body.status, 'active');
        assert.equal((await api('GET', '/sessions')).body.sessions.length, 2, 'only completed interviews are listed');
    });
});

/* Own sessions: the last submission in each is recorded, which would move the shared one along. */
describe('an answer about something else', () => {
    test('the education question answered with a job history is sent back', async () => {
        // hr walks intro → about → background, so two answers reach the education question.
        const own = (await api('POST', '/sessions', { type: 'hr' })).body;
        let last = own;
        for (const a of [FULL[0], FULL[1]]) last = (await api('POST', `/sessions/${own.id}/answer`, { answer: a })).body;
        const open = last.turns[last.turns.length - 1];
        assert.equal(open.stage, 'background', `reached ${open.stage}`);
        const before = last.turns.length;
        const off = await api('POST', `/sessions/${own.id}/answer`, { answer: 'I am working as a data analyst at Infosys and I handle client reports every week.' });
        assert.equal(off.status, 200);
        assert.equal(off.body.clarificationKind, 'off-topic');
        assert.match(off.body.clarification, /work rather than your education/);
        assert.equal(off.body.turns.length, before, 'the interview did not move on');
        assert.equal(off.body.turns[before - 1].answer, '', 'nothing was recorded');
        // An answer on the subject is taken.
        const good = await api('POST', `/sessions/${own.id}/answer`, { answer: 'I did my B.E. in Computer Science at NMAM Institute and enjoyed the databases subject most.' });
        assert.equal(good.body.clarification, undefined);
        assert.ok(good.body.turns.length > before, 'the interview moved on');
    });
});

describe('a dummy answer', () => {
    test('the interviewer says so and asks again, twice, then takes what it is given', async () => {
        const own = (await api('POST', '/sessions', { type: 'technical' })).body;
        const before = own.turns.length;
        const first = await api('POST', `/sessions/${own.id}/answer`, { answer: 'asdfgh asdfgh' });
        assert.equal(first.status, 200);
        assert.match(first.body.clarification, /couldn't make sense/); assert.equal(first.body.clarificationKind, 'gibberish');
        assert.equal(first.body.turns.length, before, 'no new question was asked');
        assert.equal(first.body.turns[before - 1].answer, '', 'nothing was recorded as the answer');
        // A second dud is nudged again, in different words.
        const second = await api('POST', `/sessions/${own.id}/answer`, { answer: 'idk' });
        assert.equal(second.body.clarificationKind, 'non-answer');
        assert.match(second.body.clarification, /Give it a try in your own words/);
        assert.notEqual(second.body.clarification, first.body.clarification);
        assert.equal(second.body.turns.length, before);
        // Two nudges is the limit: a third submission is taken as given, so
        // nobody is stuck on one question forever.
        const third = await api('POST', `/sessions/${own.id}/answer`, { answer: 'blah blah blah' });
        assert.equal(third.body.clarification, undefined);
        assert.equal(third.body.turns[before - 1].answer, 'blah blah blah');
        assert.ok(third.body.turns.length > before, 'the interview moved on');
    });
});
