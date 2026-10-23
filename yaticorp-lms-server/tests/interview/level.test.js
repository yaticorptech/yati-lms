/**
 * Questions pitched to the student's class or level (asked 2026-10-22: "if the
 * student is 10th standard they may ask the question what suits that
 * student"): where a student is placed, and the built-in interviewer's school
 * questions. No database, no AI.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { levelFor, classNumber, brief, judging } = require('../../src/interview/level');
const tpl = require('../../src/interview/templateInterviewer');
const { fakeContext } = require('../helpers');

const HIGH = { educationLevel: 'High School (Class 9–10)', currentClass: 'Class 10', board: 'CBSE' };
// Workplace words a school student should never be asked about.
const WORK = /\b(manager|salary|salaries|client|clients|office|employer|colleague|company|hire|hiring|job|jobs|notice period|your lead|appraisal)\b/i;
const school = (over = {}, level = HIGH) => fakeContext({
    audience: 'school', education: [], goal: 'Doctor', skills: [], strongSkills: [], learningSkills: [], completedCourses: [], ongoingCourses: [], projects: [],
    level: levelFor(level), ...over
});

describe('where a student is placed', () => {
    test('from Career Path: level, class and board', () => {
        assert.deepEqual(levelFor(HIGH), { key: 'high', school: true, classNo: 10, board: 'CBSE', label: 'a Class 10 student (High School, CBSE board), about 15 years old' });
        assert.equal(levelFor({ educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 4' }).label, 'a Class 4 student (Primary School), about 9 years old');
        assert.equal(levelFor({ educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12' }).key, 'senior');
        assert.equal(levelFor({ educationLevel: 'Undergraduate' }).key, 'undergraduate');
        assert.equal(levelFor({ educationLevel: 'Working Professional', board: 'CBSE' }).board, '', 'a board only for school students');
    });
    test('without Career Path: the class an administrator gave the account, then the account type', () => {
        assert.equal(levelFor({ className: '10th' }).key, 'high');
        assert.equal(levelFor({ className: 'Class 7 B' }).classNo, 7);
        assert.equal(levelFor({ className: 'Std 12' }).key, 'senior');
        assert.equal(levelFor({ className: 'BSc 2nd year', accountType: 'college_student' }).key, 'undergraduate', 'a year of college is not a class');
        assert.equal(levelFor({ accountType: 'professional' }).key, 'professional');
        assert.equal(levelFor({ accountType: 'school_student' }).key, 'general', 'the default account type says nothing');
        assert.equal(levelFor().key, 'general');
    });
    test('reads a class number only where it is one', () => {
        for (const [text, n] of [['Class 10', 10], ['10th', 10], ['10th standard', 10], ['10 B', 10], ['Grade 3', 3], ['12', 12]]) assert.equal(classNumber(text), n, text);
        for (const text of ['2nd year', 'BSc', 'Class 13', 'Section A', '']) assert.equal(classNumber(text), null, text);
    });
    test('tells the AI who it is interviewing, and what to keep away from', () => {
        const b = brief(levelFor(HIGH));
        assert.match(b, /a Class 10 student \(High School, CBSE board\)/);
        assert.match(b, /stream \(Science, Commerce or Arts\)/);
        assert.match(b, /Never ask about jobs they have held, a manager, a salary/);
        assert.match(b, /Never ask for personal details/);
        assert.match(brief(levelFor({ educationLevel: 'Undergraduate' })), /Do not assume full-time work experience/);
        assert.equal(brief(levelFor()), '', 'no level: the interviewer as before');
        assert.equal(brief(undefined), '', 'a session saved before levels');
        assert.match(judging(levelFor(HIGH)), /admission or scholarship panel would, not as an employer/);
        assert.equal(judging(levelFor()), '');
    });
});

describe('the built-in interviewer, for a Class 10 student', () => {
    const c = school();
    const bank = tpl.generateQuestions(c);
    test('a practice bank about school life, with every kind of question and its tips', () => {
        assert.ok(bank.length >= 20, `${bank.length} questions`);
        assert.deepEqual([...new Set(bank.map((q) => q.category))].sort(), ['behavioral', 'hr', 'project', 'situational', 'technical']);
        for (const q of bank) {
            assert.ok(q.sample && q.say.length && q.avoid.length && q.hint, q.question);
            assert.doesNotMatch(`${q.question} ${q.hint} ${q.sample}`, WORK, q.question);
        }
        assert.equal(new Set(bank.map((q) => q.id)).size, bank.length, 'ids are unique');
        assert.equal(new Set(bank.map((q) => q.question)).size, bank.length, 'no question twice');
    });
    test('asks what a Class 10 student is really asked: subjects, the stream after Class 10, school situations', () => {
        const all = bank.map((q) => q.question).join('\n');
        assert.match(all, /Which subject do you enjoy most/);
        assert.match(all, /Which stream do you want to take after Class 10/);
        assert.match(all, /Pick one topic you learnt in Class 10/);
        assert.match(all, /copy your homework/);
        assert.match(bank[0].sample, /I study in Class 10/);
        assert.doesNotMatch(all, /Why should we choose you over other candidates|five years/);
    });
    test('the mock interview asks the same kind of thing at every stage', () => {
        for (const stage of Object.keys(tpl.SCHOOL_QUESTION_BANK)) {
            for (const q of tpl.SCHOOL_QUESTION_BANK[stage](c)) assert.doesNotMatch(q, WORK, `${stage}: ${q}`);
        }
        const first = tpl.nextQuestion({ session: { type: 'hr', turns: [] }, context: c, nextStage: 'intro', canFollowUp: false, lastTurn: null });
        assert.match(first.question, /practice interview/);
        const bg = tpl.nextQuestion({ session: { type: 'hr', turns: [] }, context: c, nextStage: 'background', canFollowUp: false, lastTurn: null });
        assert.match(bg.question, /Which subject do you enjoy most in Class 10/);
    });
    test('the question about what comes next follows the class', () => {
        const future = (level) => tpl.generateQuestions(school({}, level)).find((q) => q.topic === 'Your future').question;
        assert.match(future({ educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12' }), /course do you want to study after Class 12/);
        assert.match(future({ educationLevel: 'Middle School (Class 6–8)', currentClass: 'Class 7' }), /You want to become a Doctor/);
        assert.match(tpl.generateQuestions(school({ goal: '' }, { educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 3' })).find((q) => q.topic === 'Your future').question, /when you grow up/);
    });
    test('their own Career Path skills and projects, asked simply', () => {
        const withWork = tpl.generateQuestions(school({ skills: [{ name: 'Algebra', status: 'Developing', sources: ['career'] }], strongSkills: [], projects: [{ name: 'Solar Model', description: '', skills: [] }] }));
        assert.ok(withWork.some((q) => q.question === 'Explain Algebra in your own words, as you would to a younger classmate.'));
        assert.ok(withWork.some((q) => q.question === 'Tell me about "Solar Model". What did you do yourself?'));
    });
    test('topics to prepare are a school student\'s', () => {
        assert.deepEqual(tpl.recommendTopics(c).map((t) => t.topic), ['Tell me about yourself', 'Your favourite subject', 'Your stream after Class 10', 'A school project or activity', 'Telling a story']);
    });
});

describe('everyone else is asked as before', () => {
    test('a college student keeps the job-interview bank', () => {
        const bank = tpl.generateQuestions(fakeContext({ level: levelFor({ educationLevel: 'Undergraduate' }) }));
        assert.ok(bank.some((q) => q.question === 'Why should we choose you over other candidates?'));
        assert.equal(tpl.generateQuestions(fakeContext()).length, bank.length, 'and so does a student with no level');
    });
});
