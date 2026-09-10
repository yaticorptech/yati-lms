const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const tpl = require('../../src/interview/templateInterviewer');
const { fakeContext } = require('../helpers');

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
        assert.ok(structured.score >= 7, `structured=${structured.score}`);
        assert.match(fillers.feedback, /filler words/);
        assert.ok(fillers.score < structured.score);
    });
    test('every question gets a better-answer example that uses the student project', () => {
        for (const p of r.perQuestion) assert.match(p.betterAnswer, /Sales Dashboard/);
    });
});

describe('a question the interviewer had to repeat', () => {
    const ctx = fakeContext();
    const run = (turns) => tpl.evaluate({ session: { type: 'project', turns }, context: ctx });
    const ONE_LINERS = [
        { index: 0, stage: 'intro', question: 'Tell me about yourself.', answer: 'I am doing MCA at St Agnes College.' },
        { index: 1, stage: 'project', question: 'Tell me about your project. What was the goal and your role?', answer: 'I made a user registration.' },
        { index: 2, stage: 'technical', question: 'Explain how you would secure a user password.', answer: 'I used bcrypt.' }
    ];

    test('that answer can score no better than a third, however it was worded', () => {
        const once = tpl.evaluate({ session: { type: 'project', turns: [{ ...ONE_LINERS[1], clarifications: 1 }] }, context: ctx });
        const twice = tpl.evaluate({ session: { type: 'project', turns: [{ ...ONE_LINERS[1], clarifications: 2 }] }, context: ctx });
        assert.ok(once.perQuestion[0].score <= 3, `once=${once.perQuestion[0].score}`);
        assert.ok(twice.perQuestion[0].score < once.perQuestion[0].score, 'twice is worse than once');
        assert.ok(twice.perQuestion[0].score >= 1, 'they did answer in the end');
        assert.match(once.perQuestion[0].feedback, /had to ask this a second time/);
    });

    test('the same interview scores lower when questions had to be repeated', () => {
        const plain = run(ONE_LINERS);
        const repeated = run([ONE_LINERS[0], { ...ONE_LINERS[1], clarifications: 2 }, { ...ONE_LINERS[2], clarifications: 1 }]);
        assert.ok(repeated.overall < plain.overall - 10, `${repeated.overall} vs ${plain.overall}`);
        assert.ok(repeated.scores.relevance < plain.scores.relevance, 'relevance takes the brunt');
        assert.match(repeated.improvements[0], /Answer the question that was asked/);
    });

    test('one-line answers land in the thirties, and full ones well above', () => {
        const thin = run(ONE_LINERS).overall;
        assert.ok(thin >= 25 && thin <= 45, `one-liners scored ${thin}`);
        const full = run([
            { index: 0, stage: 'intro', question: 'Tell me about yourself.', answer: 'I am an MCA student at St Agnes College. First I studied visual arts, then I moved into development, and now I build full stack applications because I enjoy seeing a design become something people use.' },
            { index: 1, stage: 'project', question: 'Tell me about your project. What was the goal and your role?', answer: 'For my Sales Dashboard project the goal was secure registration. I built the Express routes and the models, and because passwords cannot be stored in plain text I hashed them with bcrypt. As a result the login passed review.' }
        ]).overall;
        assert.ok(full >= 70, `full answers scored ${full}`);
    });

    test('no hollow praise when there was nothing to praise', () => {
        const r = run(ONE_LINERS);
        assert.doesNotMatch(r.strengths.join(' '), /completed the interview|attempted every question|turning up/i);
        assert.match(r.strengths[0], /little to point to/);
    });
});
