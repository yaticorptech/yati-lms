/**
 * The AI interviewer is told who it is interviewing (level.js). The model is
 * stubbed and its prompts recorded: this checks what the interviewer asks the
 * model for, not what the model writes. No database, no AI key.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const userAiKey = require('../../src/utils/userAiKey');
const aiQuota = require('../../src/career/services/aiQuota');
const { levelFor } = require('../../src/interview/level');
const { fakeContext } = require('../helpers');

const prompts = [];
// A reply of the right shape for each kind of call.
const reply = (prompt) => {
    if (/practice bank/.test(prompt)) return { topics: [{ topic: 'Subjects', reason: 'r' }], questions: Array.from({ length: 8 }, (_, i) => ({ category: 'hr', topic: 't', question: `Question ${i}?`, hint: 'h', difficulty: 'easy' })) };
    if (/evaluation/.test(prompt)) return { overall: 70, scores: {}, strengths: ['s'], improvements: ['i'], feedback: 'f', perQuestion: [], plan: [] };
    if (/interview coach/.test(prompt)) return { coach: [] };
    return { question: 'Which subject do you enjoy most?', stage: 'background', isFollowUp: false, difficulty: 'easy' };
};
const saved = {};
let ai;
before(() => {
    Object.assign(saved, { geminiClient: userAiKey.geminiClient, aiConfiguredFor: userAiKey.aiConfiguredFor, assert: aiQuota.assertWithinBudget, record: aiQuota.record, mode: process.env.INTERVIEW_AI });
    userAiKey.geminiClient = async () => ({ models: { generateContent: async ({ contents }) => { prompts.push(contents); return { text: JSON.stringify(reply(contents)) }; } } });
    userAiKey.aiConfiguredFor = async () => true;
    aiQuota.assertWithinBudget = async () => {};
    aiQuota.record = () => {};
    process.env.INTERVIEW_AI = '';
    // Loaded after the stubs: it takes the key helpers at load time.
    delete require.cache[require.resolve('../../src/interview/aiInterviewer')];
    ai = require('../../src/interview/aiInterviewer');
});
after(() => {
    Object.assign(userAiKey, { geminiClient: saved.geminiClient, aiConfiguredFor: saved.aiConfiguredFor });
    Object.assign(aiQuota, { assertWithinBudget: saved.assert, record: saved.record });
    process.env.INTERVIEW_AI = saved.mode;
});

const tenth = fakeContext({ audience: 'school', goal: 'Doctor', level: levelFor({ educationLevel: 'High School (Class 9–10)', currentClass: 'Class 10', board: 'CBSE' }) });
const session = (context, role = 'Doctor') => ({ type: 'hr', role, context, turns: [{ index: 0, stage: 'intro', question: 'Tell me about yourself.', answer: 'I am Asha and I study in Class 10. I enjoy biology and I want to become a doctor.' }] });
const lastPrompt = () => prompts[prompts.length - 1];

describe('for a Class 10 student', () => {
    test('the next question: a practice interview with a Class 10 student, kept to school life', async () => {
        const out = await ai.nextQuestion({ session: session(tenth), context: tenth, nextStage: 'background', canFollowUp: false, lastTurn: null, userId: 'u1' });
        assert.equal(out.question, 'Which subject do you enjoy most?');
        const p = lastPrompt();
        assert.match(p, /conducting a hr practice interview with a Class 10 student \(High School, CBSE board\), about 15 years old who hopes to become a Doctor/);
        assert.doesNotMatch(p, /for the role of/);
        assert.match(p, /WHO YOU ARE INTERVIEWING/);
        assert.match(p, /Never ask about jobs they have held, a manager, a salary/);
        assert.match(p, /"level":"a Class 10 student/);
    });
    test('the practice bank: questions a student of this age could really be asked', async () => {
        await ai.generateQuestions({ context: tenth, userId: 'u1' });
        const p = lastPrompt();
        assert.match(p, /for this candidate, a Class 10 student/);
        assert.match(p, /could answer from their own school life and studies/);
        assert.match(p, /the subjects of their class/);
        assert.match(p, /"situational" means situations at school/);
    });
    test('the sample answers are told the level too', async () => {
        await ai.coachQuestions({ questions: [{ id: 'hr-1', category: 'hr', question: 'Tell me about yourself.' }], context: tenth, userId: 'u1' });
        assert.match(lastPrompt(), /WHO YOU ARE INTERVIEWING: a Class 10 student/);
    });
    test('the report judges them as a student, not as someone applying for a job', async () => {
        await ai.evaluate({ session: session(tenth), context: tenth, userId: 'u1' });
        const p = lastPrompt();
        assert.match(p, /as an admission or scholarship panel would judge a student of this age/);
        assert.doesNotMatch(p, /deciding whether to hire/);
        assert.match(p, /Never mark them down for having no work experience/);
    });
});

describe('for a student with no level, or a session saved before levels', () => {
    test('the prompts are as before', async () => {
        const c = fakeContext();
        await ai.nextQuestion({ session: session(c, 'Data Analyst'), context: c, nextStage: 'background', canFollowUp: false, lastTurn: null, userId: 'u1' });
        assert.match(lastPrompt(), /conducting a hr interview for the role of Data Analyst/);
        assert.doesNotMatch(lastPrompt(), /WHO YOU ARE INTERVIEWING/);
        await ai.evaluate({ session: session(c, 'Data Analyst'), context: c, userId: 'u1' });
        assert.match(lastPrompt(), /evaluation of a mock hr interview for the role of Data Analyst/);
        assert.match(lastPrompt(), /deciding whether to hire/);
    });
    test('a college student is interviewed for a fresher\'s role, without assumed work experience', async () => {
        const c = fakeContext({ level: levelFor({ educationLevel: 'Undergraduate' }) });
        await ai.nextQuestion({ session: session(c, 'Data Analyst'), context: c, nextStage: 'background', canFollowUp: false, lastTurn: null, userId: 'u1' });
        assert.match(lastPrompt(), /for the role of Data Analyst/);
        assert.match(lastPrompt(), /an undergraduate student\. This is an internship or campus placement interview/);
        assert.match(lastPrompt(), /Do not assume full-time work experience/);
    });
});
