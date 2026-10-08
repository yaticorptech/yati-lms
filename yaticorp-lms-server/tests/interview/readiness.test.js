/**
 * Interview Readiness starts at 0% and rises only from mock interviews (the
 * account owner's rule, 2026-10-08): no guessed starting figures, nothing
 * from courses or projects, and practice questions count once there is an
 * interview to go with them.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');
const { InterviewSession, InterviewPrep } = require('../../src/interview/models');
const { readiness } = require('../../src/interview/readinessService');

// What the student has done elsewhere in the LMS — none of it counts here now.
const context = { learningSkills: ['React'], skills: [{ name: 'React', status: 'Advanced' }], assessments: { averageScore: 90, passed: 5 }, projects: [{ name: 'Shop' }], completedCourses: [{}], strongSkills: ['React', 'Node'] };
const value = (r, key) => r.breakdown.find((b) => b.key === key).value;
let student;

before(async () => {
    await connect();
    student = await makeUser('Readiness');
});
after(async () => { await cleanup([student.user]); });

const interview = (daysAgo, scores, overall) => InterviewSession.collection.insertOne({
    userId: student.user._id, type: 'full', status: 'completed', completedAt: new Date(Date.now() - daysAgo * 86400e3),
    report: { overall, scores, improvements: ['Give a concrete example.'] }
});

test('before any mock interview, everything is 0% — whatever else the student has done', async () => {
    await InterviewPrep.collection.insertOne({ userId: student.user._id, practiced: ['q1', 'q2', 'q3'], questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] });
    const r = await readiness(student.user._id, context);
    assert.equal(r.overall, 0);
    assert.deepEqual(r.breakdown.map((b) => b.value), [0, 0, 0, 0, 0], 'courses, skills, projects and practice questions alone do not count');
    assert.equal(r.prep.mocks, 0);
    assert.match(r.areas[0], /first mock interview/);
});

test('after an interview, each part is that interview\'s score', async () => {
    await interview(2, { communication: 70, technical: 60, problemSolving: 50, confidence: 80, answerQuality: 60, relevance: 60 }, 64);
    const r = await readiness(student.user._id, context);
    assert.equal(value(r, 'communication'), 70);
    assert.equal(value(r, 'technical'), 60);
    assert.equal(value(r, 'problemSolving'), 50);
    assert.equal(value(r, 'confidence'), 80);
    assert.equal(value(r, 'practice'), 37, '3 questions practised and 1 interview');
    assert.ok(r.overall > 0);
});

test('a better interview raises it, the latest counting most', async () => {
    const first = (await readiness(student.user._id, context)).overall;
    await interview(0, { communication: 90, technical: 85, problemSolving: 80, confidence: 90 }, 86);
    const r = await readiness(student.user._id, context);
    assert.equal(value(r, 'communication'), 82, '(90×3 + 70×2) / 5');
    assert.ok(r.overall > first, `up from ${first} to ${r.overall}`);
});

test('a report missing one score stands in with its overall score', async () => {
    const other = await makeUser('Readiness2');
    try {
        await InterviewSession.collection.insertOne({ userId: other.user._id, type: 'hr', status: 'completed', completedAt: new Date(), report: { overall: 58, scores: { communication: 66, confidence: 60 } } });
        const r = await readiness(other.user._id, context);
        assert.equal(value(r, 'technical'), 58);
        assert.equal(value(r, 'communication'), 66);
    } finally {
        await InterviewSession.deleteMany({ userId: other.user._id });
        await require('../../src/models/User').deleteOne({ _id: other.user._id });
    }
});
