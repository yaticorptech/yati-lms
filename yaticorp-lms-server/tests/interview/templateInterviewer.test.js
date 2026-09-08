const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const tpl = require('../../src/interview/templateInterviewer');
const { fakeContext } = require('./helpers');

const ctx = fakeContext();
const session = (turns = []) => ({ type: 'full', turns });

describe('nextQuestion', () => {
    test('opens a stage with a question built from the student profile', () => {
        const q = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'project', canFollowUp: false, lastTurn: null });
        assert.equal(q.stage, 'project'); assert.equal(q.isFollowUp, false);
        assert.match(q.question, /Sales Dashboard/);
    });
    test('asks a different question the second time the same stage is opened', () => {
        const first = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'technical', canFollowUp: false, lastTurn: null });
        const second = tpl.nextQuestion({ session: session([{ stage: 'technical', isFollowUp: false }]), context: ctx, nextStage: 'technical', canFollowUp: false, lastTurn: null });
        assert.notEqual(first.question, second.question);
        assert.match(first.question, /Python/);
    });
    test('follows up when the answer is short', () => {
        const q = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'skills', canFollowUp: true, lastTurn: { stage: 'about', answer: 'Python.' } });
        assert.equal(q.isFollowUp, true); assert.equal(q.stage, 'about'); assert.match(q.question, /expand|specific example/i);
    });
    test('follows up on a project the student mentioned', () => {
        const q = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'skills', canFollowUp: true, lastTurn: { stage: 'about', answer: 'I am a final year student and I recently built the Sales Dashboard for a retail client using Python and SQL.' } });
        assert.equal(q.isFollowUp, true); assert.match(q.question, /Sales Dashboard/);
    });
    test('follows up on a skill in a technical answer', () => {
        const q = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'project', canFollowUp: true, lastTurn: { stage: 'technical', answer: 'My strongest skill is definitely SQL because I use it every single day at work for reporting.' } });
        assert.equal(q.isFollowUp, true); assert.match(q.question, /SQL/);
    });
    test('asks for the outcome after a behavioural story without one', () => {
        const q = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'situational', canFollowUp: true, lastTurn: { stage: 'behavioral', answer: 'There was a time my team missed a deadline and I organised daily stand-ups to split the remaining work.' } });
        assert.equal(q.isFollowUp, true); assert.match(q.question, /outcome/i);
    });
    test('does not follow up when told not to, or when there is nothing to follow', () => {
        const noPerm = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'skills', canFollowUp: false, lastTurn: { stage: 'about', answer: 'Python.' } });
        assert.equal(noPerm.isFollowUp, false);
        const nothing = tpl.nextQuestion({ session: session(), context: ctx, nextStage: 'skills', canFollowUp: true, lastTurn: { stage: 'about', answer: 'I am a student who enjoys learning new things and working with people every day because it is fun.' } });
        assert.equal(nothing.isFollowUp, false); assert.equal(nothing.stage, 'skills');
    });
});

describe('evaluate', () => {
    const turns = [
        { index: 0, stage: 'about', question: 'Tell me about yourself.', answer: 'Python.' },
        { index: 1, stage: 'technical', question: 'Explain a concept.', answer: 'First, Python lists are dynamic arrays. For example, appending is amortised constant time because the list over-allocates, so that most appends need no copy. As a result, building a list in a loop is cheap.' },
        { index: 2, stage: 'behavioral', question: 'A time you learned fast?', answer: 'I basically, like, um, learned SQL, like, basically over a weekend because, like, the report was due and basically nobody else could.' }
    ];
    const r = tpl.evaluate({ session: { type: 'technical', turns }, context: ctx });
    test('returns the report shape with one entry per answered question', () => {
        assert.ok(r.overall >= 0 && r.overall <= 100);
        for (const k of ['communication', 'technical', 'answerQuality', 'problemSolving', 'confidence', 'relevance']) assert.ok(r.scores[k] >= 0 && r.scores[k] <= 100, k);
        assert.equal(r.perQuestion.length, 3); assert.deepEqual(r.perQuestion.map((p) => p.index), [0, 1, 2]);
        assert.ok(r.strengths.length && r.improvements.length && r.feedback.includes('Asha'));
        assert.ok(r.plan.some((p) => /another mock interview/i.test(p.title)));
        assert.equal(r.model, 'template');
    });
    test('scores a short answer low, a structured technical answer high, and penalises fillers', () => {
        const [short, structured, fillers] = r.perQuestion;
        assert.ok(short.score <= 5, `short=${short.score}`); assert.match(short.feedback, /fuller answer/);
        assert.ok(structured.score >= 8, `structured=${structured.score}`);
        assert.match(fillers.feedback, /filler words/);
        assert.ok(fillers.score < structured.score);
    });
    test('every question gets a better-answer example that uses the student project', () => {
        for (const p of r.perQuestion) assert.match(p.betterAnswer, /Sales Dashboard/);
    });
});
