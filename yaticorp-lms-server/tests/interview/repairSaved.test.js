/**
 * Interviews saved before 2026-10-13 are put right as they are read
 * (src/interview/repairSaved.js):
 *
 *   - an answer typed after speech recognition failed was saved as spoken,
 *     with no recording behind it; it reads as typed. One really spoken keeps
 *     its label.
 *   - the built-in interviewer's report said "in this hr interview", and put a
 *     repeated question down to the reply being "about something else"; it
 *     reads in today's words, on the report and on the dashboard.
 *
 * Plants one such interview for a throwaway student, and removes it after.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { InterviewSession } = require('../../src/interview/models');

let app, me, api, session;
const OLD_REPEAT = 'Answer the question that was asked — the interviewer had to repeat a question because your reply was about something else.';
const NEW_REPEAT = 'Answer the question that was asked, in full sentences — the interviewer had to ask a question again because the reply did not answer it.';
const AI_FEEDBACK = 'Asha, a thoughtful interview. Your answers about the sales dashboard were specific.';

const turn = (index, inputMode, durationMs) => ({
    index, stage: 'about', question: `Question ${index + 1}?`, answer: `A full answer to question ${index + 1}, given in a sentence.`,
    askedAt: new Date(), answeredAt: new Date(), inputMode,
    voice: { durationMs, wordCount: 10, wpm: durationMs > 3000 ? 120 : null, longPauses: 0, pauseMs: 0 }
});

before(async () => {
    await connect(); app = startApp(); me = await makeUser('Asha'); api = app.call(me.token);
    session = await InterviewSession.create({
        userId: me.user._id, type: 'hr', status: 'completed', plan: ['intro', 'about', 'background'], maxQuestions: 8, context: { firstName: 'Asha' },
        startedAt: new Date(Date.now() - 600_000), completedAt: new Date(),
        turns: [turn(0, 'voice', 0), turn(1, 'voice', 9000), turn(2, 'text', 0)],
        report: {
            overall: 39, scores: { communication: 40, technical: 40, problemSolving: 40, confidence: 40, relevance: 30, professionalism: 44 },
            strengths: ['There is little to point to in this round.'],
            improvements: [OLD_REPEAT, 'Give more structured, fuller answers with specific examples.'],
            feedback: `Asha, you scored 39/100 in this hr interview. There is little to point to in this round. ${OLD_REPEAT}`,
            plan: [], perQuestion: []
        }
    });
});
after(async () => { await InterviewSession.deleteMany({ userId: me.user._id }); await cleanup([me.user], app.server); });

describe('an interview saved before the fixes', () => {
    test('opened, its typed answer reads as typed, and a spoken one stays spoken', async () => {
        const r = await api('GET', `/sessions/${session._id}`);
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.turns.map((t) => t.inputMode), ['text', 'voice', 'text']);
    });

    test('its report reads in today\'s words', async () => {
        const r = await api('GET', `/sessions/${session._id}`);
        assert.equal(r.body.report.feedback, `Asha, you scored 39/100 in this HR interview. There is little to point to in this round. ${NEW_REPEAT}`);
        assert.deepEqual(r.body.report.improvements, [NEW_REPEAT, 'Give more structured, fuller answers with specific examples.']);
    });

    test('and is saved that way, so it is mended once', async () => {
        const saved = await InterviewSession.findById(session._id).lean();
        assert.deepEqual(saved.turns.map((t) => t.inputMode), ['text', 'voice', 'text']);
        assert.match(saved.report.feedback, /in this HR interview/);
        assert.doesNotMatch(JSON.stringify(saved.report), /about something else/);
    });

    test('the dashboard\'s areas to improve read in today\'s words too', async () => {
        await InterviewSession.updateOne({ _id: session._id }, { $set: { 'report.improvements': [OLD_REPEAT] } });
        const r = await api('GET', '/dashboard');
        assert.equal(r.status, 200);
        assert.equal(r.body.readiness.areas[0], NEW_REPEAT);
        assert.equal((await InterviewSession.findById(session._id).lean()).report.improvements[0], NEW_REPEAT);
    });

    test('an AI-written report is left as it is', async () => {
        await InterviewSession.updateOne({ _id: session._id }, { $set: { 'report.feedback': AI_FEEDBACK, 'report.improvements': ['Name the tools you used.'] } });
        const r = await api('GET', `/sessions/${session._id}`);
        assert.equal(r.body.report.feedback, AI_FEEDBACK);
        assert.deepEqual(r.body.report.improvements, ['Name the tools you used.']);
    });
});
