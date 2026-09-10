/**
 * The AI interviewer's own verdict on an answer, wired through the route.
 * The model is stubbed — this checks what the session does with a verdict,
 * not what the model decides.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const ai = require('../../src/interview/aiInterviewer');

const REDIRECT = 'That tells me about a different job, Asha. What I asked was how your design background shapes the way you build web applications.';
let app, me, api, real;

before(async () => {
    await connect(); app = startApp(); me = await makeUser('Asha'); api = app.call(me.token);
    real = ai.nextQuestion;
    // Stand in for the model: anything about housekeeping addressed nothing.
    ai.nextQuestion = async (opts) => (opts.judge && /housekeep/i.test(opts.lastTurn?.answer || '')
        ? { addressed: false, redirect: REDIRECT, interviewer: 'stub' }
        : { addressed: true, ...(await real({ ...opts, judge: false })) });
});
after(async () => { ai.nextQuestion = real; await cleanup([me.user], app.server); });

describe('the interviewer says the answer was about something else', () => {
    let s;
    test('the answer is not kept and the question is put again', async () => {
        s = (await api('POST', '/sessions', { type: 'hr', role: 'Web Developer' })).body;
        const asked = s.turns[0].question;
        const r = await api('POST', `/sessions/${s.id}/answer`, { answer: 'I am a housekeeper', inputMode: 'voice', voice: { durationMs: 3000 } });
        assert.equal(r.status, 200);
        assert.equal(r.body.clarificationKind, 'off-topic');
        assert.equal(r.body.clarification, REDIRECT);
        assert.equal(r.body.turns.length, 1, 'no new question');
        assert.equal(r.body.turns[0].question, asked, 'the same question is still open');
        assert.equal(r.body.turns[0].answer, '', 'the answer was not recorded');
        assert.equal(r.body.turns[0].voice, null, 'nor its voice metrics');
        assert.equal(r.body.progress, 0);
    });
    test('an answer that does address it is kept, and the interview moves on', async () => {
        const r = await api('POST', `/sessions/${s.id}/answer`, { answer: 'My design background means I sketch the interface before I write any code, so the layout is settled early.' });
        assert.equal(r.body.clarification, undefined);
        assert.equal(r.body.turns.length, 2);
        assert.match(r.body.turns[0].answer, /^My design background/);
    });
    test('two redirects is the limit, then the answer stands', async () => {
        for (let i = 0; i < 2; i++) {
            const r = await api('POST', `/sessions/${s.id}/answer`, { answer: 'I am a housekeeper' });
            assert.equal(r.body.clarificationKind, 'off-topic', `redirect ${i + 1}`);
        }
        const third = await api('POST', `/sessions/${s.id}/answer`, { answer: 'I am a housekeeper' });
        assert.equal(third.body.clarification, undefined, 'taken as given the third time');
        assert.equal(third.body.turns[1].answer, 'I am a housekeeper');
        assert.ok(third.body.turns.length > 2, 'the interview moved on');
    });
    test('the model is not asked to judge once the limit is reached', async () => {
        const seen = [];
        const spy = ai.nextQuestion;
        ai.nextQuestion = async (opts) => { seen.push(opts.judge); return spy(opts); };
        await api('POST', `/sessions/${s.id}/answer`, { answer: 'I would test the layout on a phone first, then widen it out to the desktop.' });
        ai.nextQuestion = spy;
        assert.deepEqual(seen, [true], 'a fresh question is judged again');
    });
});
