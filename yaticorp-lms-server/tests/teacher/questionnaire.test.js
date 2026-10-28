/**
 * Research Methodologies → Questionnaire builder (asked 2026-10-27): a
 * teacher builds a survey of Likert-scale, multiple-choice and open
 * questions, it is saved as they go, and it downloads as a Word file in
 * which Likert statements sharing a scale are one table. A teacher reaches
 * only their own questionnaires.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const { Teacher } = require('../../src/teacher/models');
const { unzip } = require('../../src/teacher/zip');

const STAMP = `${Date.now()}`.slice(-7);
let server, base, mine, other;

const call = (token) => (method, path, body) => fetch(`${base}/api/teacher${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) }));

const makeTeacher = async (n) => {
    const t = await Teacher.create({ name: `Dr. Survey ${n}`, email: `q-teacher-${STAMP}-${n}@example.edu`, phone: '+91 98450 00000', cardNumber: `QT${STAMP}${n}`, password: 'Teach-Pass1!' });
    return { teacher: t, as: call(jwt.sign({ id: String(t._id), role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '10m' })) };
};

const SURVEY = {
    title: 'Online learning survey',
    intro: 'This survey is about your online classes.\n\nYour answers are anonymous.',
    questions: [
        { type: 'section', text: 'Section A: About you' },
        { type: 'single', text: 'Your age group', options: ['Under 18', '18–24', '25 and above'] },
        { type: 'multiple', text: 'Devices you use', options: ['Phone', 'Laptop'] },
        { type: 'yesno', text: 'Do you have home internet?' },
        { type: 'section', text: 'Section B: Your experience' },
        { type: 'likert', text: 'Online classes are easy to follow.', scale: 'agreement', points: 5 },
        { type: 'likert', text: 'I can ask questions easily.', scale: 'agreement', points: 5 },
        { type: 'likert', text: 'I attend classes on time.', scale: 'frequency', points: 7 },
        { type: 'long', text: 'What would make online classes better?' }
    ]
};

before(async () => {
    await connect();
    const app = express();
    app.use('/api/teacher', express.json({ limit: '3mb' }), require('../../src/teacher'));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    mine = await makeTeacher(1);
    other = await makeTeacher(2);
});

after(async () => {
    const ids = [mine.teacher._id, other.teacher._id];
    await Teacher.deleteMany({ _id: { $in: ids } });
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
});

test('a questionnaire is made, saved as it changes, and listed with its scales', async () => {
    const made = await mine.as('POST', '/questionnaires', SURVEY);
    assert.equal(made.status, 201);
    assert.equal(made.body.questions.length, 9);

    const list = await mine.as('GET', '/questionnaires');
    assert.equal(list.status, 200);
    const row = list.body.questionnaires.find((q) => q._id === made.body._id);
    assert.equal(row.questions, 7, 'section headings are not counted as questions');
    assert.deepEqual(list.body.scales.agreement[5], ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']);
    assert.equal(list.body.scales.frequency[7].length, 7);

    const saved = await mine.as('PUT', `/questionnaires/${made.body._id}`, { title: 'Online learning survey 2026', questions: [...SURVEY.questions, { type: 'short', text: 'Your college' }] });
    assert.equal(saved.status, 200);
    const back = await mine.as('GET', `/questionnaires/${made.body._id}`);
    assert.equal(back.body.title, 'Online learning survey 2026');
    assert.equal(back.body.questions.at(-1).text, 'Your college');
    assert.equal(back.body.intro, SURVEY.intro, 'what was not sent is kept');
});

test('mistakes are refused with a reason', async () => {
    assert.equal((await mine.as('POST', '/questionnaires', { title: '' })).status, 400);
    const badType = await mine.as('POST', '/questionnaires', { title: 'Bad', questions: [{ type: 'ranking', text: 'x' }] });
    assert.equal(badType.status, 400);
    assert.match(badType.body.message, /Question 1/);
    const tooMany = await mine.as('POST', '/questionnaires', { title: 'Long', questions: Array.from({ length: 101 }, () => ({ type: 'short', text: 'q' })) });
    assert.equal(tooMany.status, 400);
});

test('a teacher keeps up to 20, and their account is read without them', async () => {
    const before = (await mine.as('GET', '/questionnaires')).body.questionnaires.length;
    for (let i = before; i < 20; i += 1) assert.equal((await mine.as('POST', '/questionnaires', { title: `Survey ${i}` })).status, 201);
    const full = await mine.as('POST', '/questionnaires', { title: 'One too many' });
    assert.equal(full.status, 400);
    assert.match(full.body.message, /up to 20/);
    const account = await Teacher.findById(mine.teacher._id).lean();
    assert.equal(account.questionnaires, undefined, 'the sign-in check does not load them');
    // Back to the one the next tests use.
    for (const q of (await mine.as('GET', '/questionnaires')).body.questionnaires.filter((x) => /^Survey \d+$/.test(x.title))) await mine.as('DELETE', `/questionnaires/${q._id}`);
    assert.equal((await mine.as('GET', '/questionnaires')).body.questionnaires.length, 1);
});

test('the Word file has the questions, numbered, and Likert statements on one scale share a table', async () => {
    const q = (await mine.as('GET', '/questionnaires')).body.questionnaires[0];
    const file = await mine.as('GET', `/questionnaires/${q._id}/docx`);
    assert.equal(file.status, 200);
    const doc = unzip(file.body)['word/document.xml'].toString('utf8');
    for (const words of ['Online learning survey 2026', 'Section A: About you', '1. ', 'Your age group', '○  18–24', '☐  Laptop', 'Do you have home internet?', 'Strongly agree', 'Online classes are easy to follow.', 'Very often', 'What would make online classes better?', 'Your college', 'Thank you for your time.']) {
        assert.ok(doc.includes(words), `the file has "${words}"`);
    }
    // Two agreement statements in one table, the frequency one in another.
    assert.equal(doc.split('<w:tbl>').length - 1, 2);
    const firstTable = doc.slice(doc.indexOf('<w:tbl>'), doc.indexOf('</w:tbl>'));
    assert.ok(firstTable.includes('I can ask questions easily.'));
    assert.ok(!firstTable.includes('I attend classes on time.'));
});

test('a teacher reaches only their own questionnaires', async () => {
    const q = (await mine.as('GET', '/questionnaires')).body.questionnaires[0];
    assert.equal((await other.as('GET', `/questionnaires/${q._id}`)).status, 404);
    assert.equal((await other.as('PUT', `/questionnaires/${q._id}`, { title: 'Mine now' })).status, 404);
    assert.equal((await other.as('GET', `/questionnaires/${q._id}/docx`)).status, 404);
    assert.equal((await other.as('DELETE', `/questionnaires/${q._id}`)).status, 404);
    assert.equal((await other.as('GET', '/questionnaires')).body.questionnaires.length, 0);
    assert.equal((await mine.as('DELETE', `/questionnaires/${q._id}`)).status, 200);
    assert.equal((await mine.as('GET', `/questionnaires/${q._id}`)).status, 404);
});
