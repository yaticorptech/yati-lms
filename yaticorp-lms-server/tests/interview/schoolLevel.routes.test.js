/**
 * A school student's Interview Prep, through the real routes (asked
 * 2026-10-22): a Class 10 student, placed by their Career Path profile, gets
 * school questions in the practice bank and the mock interview; a new class
 * means a new bank; a student with no level is asked as before. Runs the
 * built-in interviewer, so no AI key is used.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const Goal = require('../../src/career/models/Goal');

const WORK = /\b(manager|salary|client|office|employer|colleague|company|hire|hiring|job|jobs|notice period|your lead)\b/i;
let app, asha, ravi, ashaApi, raviApi;

before(async () => {
    await connect(); app = startApp();
    asha = await makeUser('Asha'); ravi = await makeUser('Ravi');
    ashaApi = app.call(asha.token); raviApi = app.call(ravi.token);
    await Goal.create({ userId: asha.user._id, educationLevel: 'High School (Class 9–10)', currentClass: 'Class 9', board: 'CBSE', careerGoal: 'Doctor' });
});
after(async () => { await cleanup([asha.user, ravi.user], app.server); });

describe('a school student', () => {
    test('the practice bank is a Class 9 student\'s', async () => {
        const r = await ashaApi('GET', '/questions'); assert.equal(r.status, 200);
        const qs = r.body.questions.map((q) => q.question);
        assert.ok(qs.includes('Which stream do you want to take after Class 10 — Science, Commerce or Arts — and why?'));
        assert.ok(qs.includes('Pick one topic you learnt in Class 9 and explain it simply.'));
        for (const q of r.body.questions) assert.doesNotMatch(`${q.question} ${q.sample}`, WORK, q.question);
        assert.ok(r.body.topics.some((t) => t.topic === 'Your stream after Class 10'));
    });
    test('moving up to Class 10 gives a new bank', async () => {
        await Goal.updateOne({ userId: asha.user._id }, { $set: { currentClass: 'Class 10' } });
        const qs = (await ashaApi('GET', '/questions')).body.questions.map((q) => q.question);
        assert.ok(qs.includes('Pick one topic you learnt in Class 10 and explain it simply.'));
        assert.ok(!qs.includes('Pick one topic you learnt in Class 9 and explain it simply.'));
    });
    test('the mock interview is a practice interview about school life', async () => {
        const s = (await ashaApi('POST', '/sessions', { type: 'full', role: 'Doctor' })).body;
        assert.match(s.turns[0].question, /^Hi Asha, welcome to your practice interview/);
        const asked = [s.turns[0].question];
        let cur = s;
        // Full answers, so each moves on to the next stage rather than a follow-up.
        for (let i = 0; i < 6 && !cur.closingMessage; i++) {
            cur = (await ashaApi('POST', `/sessions/${s.id}/answer`, { answer: 'I am in Class 10 at my school. I enjoy biology the most because I like learning how the body works, and I made a model of the heart for our science fair with two friends.' })).body;
            asked.push(cur.turns[cur.turns.length - 1].question);
        }
        for (const q of asked) assert.doesNotMatch(q, WORK, q);
        assert.ok(asked.some((q) => /You want to become a Doctor one day/.test(q)), asked.join('\n'));
        assert.ok(asked.some((q) => /Which subject do you enjoy most in Class 10/.test(q)), asked.join('\n'));
    });
});

describe('a student with no level', () => {
    test('keeps the job-interview bank', async () => {
        const qs = (await raviApi('GET', '/questions')).body.questions.map((q) => q.question);
        assert.ok(qs.includes('Why should we choose you over other candidates?'));
    });
});
