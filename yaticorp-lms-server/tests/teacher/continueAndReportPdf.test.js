/**
 * Two teacher dashboard additions (asked 2026-10-27):
 *   - the overview lists the last few things the teacher worked on, newest
 *     first, for "Continue where you left off": the chapter last written,
 *     writing pieces, research projects and questionnaires
 *   - a plagiarism check's report downloads as a PDF, for its own teacher only
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const { Teacher, Thesis, WritingPiece, WritingLog, ResearchProject, PlagiarismReport, TextVersion } = require('../../src/teacher/models');
const { segmentsOf } = require('../../src/teacher/plagiarismPdf');

const STAMP = `${Date.now()}`.slice(-7);
let server, base, mine, other;

const call = (token) => (method, path, body) => fetch(`${base}/api/teacher${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, type: r.headers.get('content-type') || '', disposition: r.headers.get('content-disposition') || '', body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) }));

const makeTeacher = async (n) => {
    const t = await Teacher.create({ name: `Dr. Recent ${n}`, email: `recent-teacher-${STAMP}-${n}@example.edu`, phone: '+91 98450 00000', cardNumber: `RT${STAMP}${n}`, password: 'Teach-Pass1!' });
    return { teacher: t, as: call(jwt.sign({ id: String(t._id), role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '10m' })) };
};
const pause = () => new Promise((r) => setTimeout(r, 30));

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
    await Promise.all([Thesis, WritingPiece, WritingLog, ResearchProject, PlagiarismReport, TextVersion].map((M) => M.deleteMany({ teacherId: { $in: ids } })));
    await Teacher.deleteMany({ _id: { $in: ids } });
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
});

test('a new teacher has nothing to continue', async () => {
    const r = await mine.as('GET', '/overview');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.recent, []);
});

test('the overview lists recent work newest first: the chapter last written, a piece, a questionnaire', async () => {
    const thesis = (await mine.as('POST', '/theses', { title: 'Peer tutoring and anxiety' })).body;
    await pause();
    const piece = (await mine.as('POST', '/writing', { title: 'An essay on mentoring', kind: 'essay' })).body;
    await pause();
    const q = (await mine.as('POST', '/questionnaires', { title: 'Study habits survey' })).body;
    await pause();
    // Writing in the Literature Review makes it the newest of all.
    const lit = thesis.chapters.find((c) => c.title === 'Literature Review');
    assert.equal((await mine.as('PUT', `/theses/${thesis._id}/chapters/${lit._id}`, { content: 'Earlier studies of peer tutoring found lower anxiety.' })).status, 200);

    const recent = (await mine.as('GET', '/overview')).body.recent;
    assert.deepEqual(recent.map((x) => x.kind), ['chapter', 'questionnaire', 'writing']);
    assert.deepEqual({ ...recent[0], at: undefined }, { kind: 'chapter', id: lit._id, parentId: thesis._id, title: 'Literature Review', context: 'Peer tutoring and anxiety', at: undefined });
    assert.equal(recent[1].id, q._id);
    assert.deepEqual([recent[2].id, recent[2].context], [piece._id, 'essay']);
    assert.deepEqual((await other.as('GET', '/overview')).body.recent, [], 'nobody else sees it');
});

test('an untouched thesis points to its first chapter, not its empty Appendices; three items at most', async () => {
    await pause();
    const fresh = (await mine.as('POST', '/theses', { title: 'A second thesis, not started' })).body;
    await pause();
    await mine.as('POST', '/writing', { title: 'Another piece', kind: 'notes' });
    const recent = (await mine.as('GET', '/overview')).body.recent;
    assert.equal(recent.length, 3);
    const chapter = recent.find((x) => x.parentId === fresh._id);
    assert.ok(chapter, JSON.stringify(recent));
    assert.equal(chapter.title, 'Abstract');

    // Blank lines are not writing: the Appendices holding only line breaks is not "the last chapter written".
    const appendices = fresh.chapters.find((c) => c.title === 'Appendices');
    await mine.as('PUT', `/theses/${fresh._id}/chapters/${appendices._id}`, { content: '\n\n\n' });
    const after = (await mine.as('GET', '/overview')).body.recent.find((x) => x.parentId === fresh._id);
    assert.equal(after.title, 'Abstract');
});

test('the marked text is cut where the matches and flags are, the first mark winning an overlap', () => {
    const text = 'One two three four five six seven eight';
    const parts = segmentsOf(text, [{ start: 4, end: 13, own: false }, { start: 10, end: 18, own: true }], [{ start: 24, end: 33 }]);
    assert.deepEqual(parts.map((p) => [p.kind, p.text]), [['plain', 'One '], ['other', 'two three'], ['plain', ' four five '], ['flag', 'six seven'], ['plain', ' eight']]);
    assert.equal(parts.map((p) => p.text).join(''), text, 'no text lost');
});

test('a report downloads as a PDF, Kannada included, and only for its own teacher', async () => {
    const words = 'Peer tutoring lowers mathematics anxiety among first year students because explaining a concept to a classmate builds confidence and understanding over time. ';
    const check = await mine.as('POST', '/plagiarism/check', { title: 'Draft chapter ಕನ್ನಡ', text: `${words.repeat(3)}As Rao said, "tutoring helps" in every class. ಶಿಕ್ಷಣವು ಎಲ್ಲರಿಗೂ ಮುಖ್ಯ.` });
    assert.equal(check.status, 201);
    const pdf = await mine.as('GET', `/plagiarism/reports/${check.body._id}/pdf`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.type, 'application/pdf');
    assert.match(pdf.disposition, /Similarity_report_Draft_chapter\.pdf/);
    assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.body.subarray(-8).toString().includes('%%EOF'));
    assert.ok(pdf.body.length > 5000, `a real document (${pdf.body.length} bytes)`);

    assert.equal((await other.as('GET', `/plagiarism/reports/${check.body._id}/pdf`)).status, 404);
    assert.equal((await mine.as('GET', '/plagiarism/reports/not-an-id/pdf')).status, 404);
});
