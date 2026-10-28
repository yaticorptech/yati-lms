/**
 * The teacher side: registering a card, signing in, and each feature of the
 * dashboard — Research Methodologies, Research Path, Publications Map, Thesis
 * Writing, Independent Writing and the plagiarism check — plus the admin's
 * Teachers list. The teacher side uses no outside service (no AI, no DOI
 * look-up): the guides and the advisor run in the app.
 */
// No real email: the reset link is read from what would have been sent.
const sent = [];
require('../../src/utils/emailService').sendEmail = async (msg) => { sent.push(msg); };
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crypto = require('crypto');
const { connect, makeUser, makeAdmin, cleanup } = require('../helpers');
const Card = require('../../src/models/Card');
const generateToken = require('../../src/utils/generateToken');
const { Teacher, ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport } = require('../../src/teacher/models');

const STAMP = `${Date.now()}`.slice(-7);
const PASSWORD = 'Teach-Pass1!';
let server, base, student, admin;
const cards = [];
const teachers = [];

const call = (token) => (method, path, body) => fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, headers: r.headers, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) }));
const anon = call(null);

const newCard = async () => {
    const n = String(cards.length + 1).padStart(3, '0');
    const card = await Card.create({ verified: true, CardNumber: `98${STAMP}${n}`, CVV: String(100 + cards.length), qrCodeNumber: `TQR${STAMP}${n}`, status: 'unactivated' });
    cards.push(card);
    return card;
};
const registerTeacher = async (over = {}) => {
    const card = await newCard();
    const r = await anon('POST', '/api/teacher/auth/register', {
        name: 'Dr. Asha Rao', email: `teacher-${STAMP}-${cards.length}@example.edu`, phone: '+91 98450 12345',
        CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber, password: PASSWORD,
        institution: 'Test University', department: 'Education', ...over
    });
    if (r.status === 201) teachers.push(r.body._id);
    return { r, card };
};

before(async () => {
    await connect();
    const app = express();
    app.use('/api/teacher', express.json({ limit: '3mb' }));
    app.use(express.json());
    app.use('/api/auth', require('../../src/routes/authRoutes'));
    app.use('/api/user', require('../../src/routes/userRoutes'));
    app.use('/api/admin/teachers', require('../../src/teacher/admin'));
    app.use('/api/teacher', require('../../src/teacher'));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    student = await makeUser('TeacherSide');
    admin = await makeAdmin('TeacherSide');
});

after(async () => {
    const ids = (await Teacher.find({ $or: [{ _id: { $in: teachers } }, { email: new RegExp(`^teacher-${STAMP}-`) }] }).select('_id').lean()).map((t) => t._id);
    await Promise.all([ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport].map((M) => M.deleteMany({ teacherId: { $in: ids } })));
    await Teacher.deleteMany({ _id: { $in: ids } });
    await Card.deleteMany({ _id: { $in: cards.map((c) => c._id) } });
    await cleanup([student.user], server, [admin.admin]);
});

/* ── Registering and signing in ────────────────────────────────────────── */

describe('a teacher registers a card and signs in', () => {
    let reg;
    test('registering a fresh card makes a teacher account and uses up the card', async () => {
        reg = await registerTeacher();
        assert.equal(reg.r.status, 201, JSON.stringify(reg.r.body));
        assert.equal(reg.r.body.role, 'teacher');
        assert.ok(reg.r.body.token);
        assert.equal(reg.r.body.institution, 'Test University');
        assert.ok(!('password' in reg.r.body));
        assert.equal((await Card.findById(reg.card._id).lean()).status, 'used');
    });

    test('the same card cannot register again, as a teacher or a student', async () => {
        const again = await anon('POST', '/api/teacher/auth/register', { name: 'Someone Else', email: `other-${STAMP}@example.edu`, phone: '9876543210', CardNumber: reg.card.CardNumber, CVV: reg.card.CVV, qrCodeNumber: reg.card.qrCodeNumber, password: PASSWORD });
        assert.equal(again.status, 400);
        assert.equal(again.body.code, 'CARD_USED');
        const asStudent = await anon('POST', '/api/auth/validate-qr', { cardNumber: reg.card.CardNumber });
        assert.equal(asStudent.body.code, 'CARD_USED');
    });

    test('an email another teacher has, in any capitals, is refused under the email field', async () => {
        const dup = await registerTeacher({ email: reg.r.body.email.toUpperCase() });
        assert.equal(dup.r.status, 400);
        assert.equal(dup.r.body.field, 'email');
        assert.equal(dup.r.body.code, 'EMAIL_TAKEN');
        assert.equal((await Card.findById(dup.card._id).lean()).status, 'unactivated', 'the card is not used up by a refused registration');
    });

    test('the form rules: name, email, phone, password, card', async () => {
        const card = await newCard();
        const good = { name: 'Dr. K', email: `rules-${STAMP}@example.edu`, phone: '9876543210', CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber, password: PASSWORD };
        for (const [over, field] of [[{ name: 'A' }, 'name'], [{ email: 'nope' }, 'email'], [{ phone: '12' }, 'phone'], [{ password: 'short' }, 'password'], [{ CVV: '000' }, 'card']]) {
            const r = await anon('POST', '/api/teacher/auth/register', { ...good, ...over });
            assert.equal(r.status, 400, JSON.stringify(over));
            assert.equal(r.body.field, field, JSON.stringify(r.body));
        }
    });

    test('signing in with card number and password', async () => {
        const ok = await anon('POST', '/api/teacher/auth/login', { cardNumber: reg.card.CardNumber, password: PASSWORD });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal(ok.body.role, 'teacher');
        assert.equal((await anon('POST', '/api/teacher/auth/login', { cardNumber: reg.card.CardNumber, password: 'Wrong-Pass1!' })).status, 401);
    });

    test('each sign-in says where a card of the other kind belongs', async () => {
        const User = require('../../src/models/User');
        const studentCard = `97${STAMP}999`;
        await User.updateOne({ _id: student.user._id }, { $set: { cardNumber: studentCard } });
        const atTeacher = await anon('POST', '/api/teacher/auth/login', { cardNumber: studentCard, password: 'whatever1A!' });
        assert.equal(atTeacher.status, 401);
        assert.equal(atTeacher.body.code, 'STUDENT_CARD');
        assert.match(atTeacher.body.message, /Choose Student/);
        const atStudent = await anon('POST', '/api/auth/student/login', { cardNumber: reg.card.CardNumber, password: PASSWORD });
        assert.equal(atStudent.status, 401);
        assert.equal(atStudent.body.code, 'TEACHER_CARD');
        assert.match(atStudent.body.message, /Choose Teacher/);
    });

    test('scanning a teacher card at the teacher sign-in gives its number; at the student one, a pointer', async () => {
        const t = await anon('POST', '/api/teacher/auth/card-scan', { code: reg.card.qrCodeNumber });
        assert.equal(t.status, 200, JSON.stringify(t.body));
        assert.equal(t.body.cardNumber, reg.card.CardNumber);
        const s = await anon('POST', '/api/auth/card-scan', { code: reg.card.qrCodeNumber });
        assert.equal(s.body.code, 'TEACHER_CARD');
        const fresh = await newCard();
        const none = await anon('POST', '/api/teacher/auth/card-scan', { code: fresh.qrCodeNumber });
        assert.equal(none.body.code, 'NOT_REGISTERED');
    });

    test('a student token cannot open teacher pages, nor a teacher token student ones', async () => {
        assert.equal((await call(student.token)('GET', '/api/teacher/me')).status, 401);
        assert.equal((await call(generateToken(student.user._id, 'teacher'))('GET', '/api/teacher/me')).status, 401, 'a student id with a teacher role is still refused');
        assert.equal((await call(reg.r.body.token)('GET', '/api/user/profile')).status, 401);
        assert.equal((await call(reg.r.body.token)('GET', '/api/teacher/me')).status, 200);
    });

    test('a forgotten password: the link works once and ends older sessions', async () => {
        const forgot = await anon('POST', '/api/teacher/auth/forgot-password', { cardNumber: reg.card.CardNumber });
        assert.equal(forgot.status, 200);
        const mail = sent.find((m) => m.to === reg.r.body.email);
        assert.ok(mail, 'a reset email went to the teacher');
        const raw = /token=([a-f0-9]+)/.exec(mail.htmlContent)[1];
        assert.match(mail.htmlContent, /reset-password\?as=teacher&token=/, 'the link opens the teacher reset');
        const stored = await Teacher.findById(reg.r.body._id).select('+resetPasswordToken').lean();
        assert.equal(stored.resetPasswordToken, crypto.createHash('sha256').update(raw).digest('hex'), 'only a hash is stored');
        const older = require('jsonwebtoken').sign({ id: reg.r.body._id, role: 'teacher', iat: Math.floor(Date.now() / 1000) - 30 }, process.env.JWT_SECRET);
        const reset = await anon('POST', '/api/teacher/auth/reset-password', { token: raw, newPassword: 'New-Teach1!' });
        assert.equal(reset.status, 200, JSON.stringify(reset.body));
        assert.equal((await anon('POST', '/api/teacher/auth/reset-password', { token: raw, newPassword: 'New-Teach2!' })).status, 400, 'used once');
        assert.equal((await call(older)('GET', '/api/teacher/me')).body.code, 'PASSWORD_CHANGED');
        assert.equal((await anon('POST', '/api/teacher/auth/login', { cardNumber: reg.card.CardNumber, password: 'New-Teach1!' })).status, 200);
    });

    test('a reset email that fails gets the same answer as a card with no account', async () => {
        const mailer = require('../../src/utils/emailService');
        const working = mailer.sendEmail;
        mailer.sendEmail = async () => { throw new Error('mail service down'); };
        try {
            const real = await anon('POST', '/api/teacher/auth/forgot-password', { cardNumber: reg.card.CardNumber });
            const unknown = await anon('POST', '/api/teacher/auth/forgot-password', { cardNumber: '999999999999' });
            assert.equal(real.status, 200);
            assert.deepEqual(real.body, unknown.body, 'nothing tells whether the card has an account');
        } finally { mailer.sendEmail = working; }
    });

    test('changing the password needs the current one; a mistake is a 400', async () => {
        const login = await anon('POST', '/api/teacher/auth/login', { cardNumber: reg.card.CardNumber, password: 'New-Teach1!' });
        const me = call(login.body.token);
        const wrong = await me('PUT', '/api/teacher/me/password', { currentPassword: 'nope', newPassword: PASSWORD });
        assert.equal(wrong.status, 400);
        assert.equal(wrong.body.code, 'WRONG_CURRENT_PASSWORD');
        const ok = await me('PUT', '/api/teacher/me/password', { currentPassword: 'New-Teach1!', newPassword: PASSWORD });
        assert.equal(ok.status, 200);
        assert.equal((await call(ok.body.token)('GET', '/api/teacher/me')).status, 200, 'the new token works');
    });

    test('profile edits are checked', async () => {
        const login = await anon('POST', '/api/teacher/auth/login', { cardNumber: reg.card.CardNumber, password: PASSWORD });
        const me = call(login.body.token);
        assert.equal((await me('PUT', '/api/teacher/me', { phone: 'abc' })).body.field, 'phone');
        const ok = await me('PUT', '/api/teacher/me', { designation: 'Associate Professor', researchArea: 'Educational technology', dailyWordGoal: 750 });
        assert.equal(ok.status, 200);
        assert.equal(ok.body.dailyWordGoal, 750);
    });
});

/* ── The features ──────────────────────────────────────────────────────── */

describe('the dashboard features', () => {
    let me, other, otherId, meId, meToken;
    before(async () => {
        const a = await registerTeacher({ name: 'Dr. Meera Iyer' });
        const b = await registerTeacher({ name: 'Dr. Ravi Kumar' });
        me = call(a.r.body.token); meId = a.r.body._id; meToken = a.r.body.token;
        other = call(b.r.body.token); otherId = b.r.body._id;
    });

    test('a profile photo: an app avatar or an upload, never any link, and it can be removed', async () => {
        assert.equal((await me('GET', '/api/teacher/me')).body.profilePicture, '');
        const avatar = await me('PUT', '/api/teacher/me', { profilePicture: '/avatars/elders/2.jpg' });
        assert.equal(avatar.status, 200);
        assert.match(avatar.body.profilePicture, /\/avatars\/elders\/2\.jpg$/);
        const outside = await me('PUT', '/api/teacher/me', { profilePicture: 'https://example.com/me.jpg' });
        assert.equal(outside.status, 400);
        assert.equal(outside.body.field, 'profilePicture');

        const bunny = require('../../src/utils/bunnyStorage');
        const real = bunny.uploadToBunny;
        const stored = [];
        bunny.uploadToBunny = async (buffer, name, folder) => { stored.push(folder); return 'https://yati.b-cdn.net/teacher-pictures/x.jpg'; };
        try {
            const fd = new FormData();
            fd.append('profilePicture', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }), 'profile.jpg');
            const up = await fetch(`${base}/api/teacher/me/picture`, { method: 'POST', headers: { Authorization: `Bearer ${meToken}` }, body: fd }).then(async (r) => ({ status: r.status, body: await r.json() }));
            assert.equal(up.status, 200);
            assert.equal(up.body.profilePicture, 'https://yati.b-cdn.net/teacher-pictures/x.jpg');
            assert.deepEqual(stored, ['teacher-pictures']);
            const notImage = new FormData();
            notImage.append('profilePicture', new Blob(['hello'], { type: 'text/plain' }), 'a.txt');
            assert.equal((await fetch(`${base}/api/teacher/me/picture`, { method: 'POST', headers: { Authorization: `Bearer ${meToken}` }, body: notImage })).status, 400);
        } finally { bunny.uploadToBunny = real; }

        assert.equal((await me('PUT', '/api/teacher/me', { profilePicture: '' })).body.profilePicture, '');
        assert.equal((await anon('POST', '/api/teacher/me/picture')).status, 401);
    });

    test('Research Methodologies keeps nothing: there is no "studied" mark (the guides are in the app)', async () => {
        assert.equal((await me('GET', '/api/teacher/methods')).status, 404);
        assert.equal((await me('PUT', '/api/teacher/methods/survey/studied', { studied: true })).status, 404);
        assert.equal((await me('GET', '/api/teacher/overview')).body.methods, undefined);
    });

    test('nothing on the teacher side calls an outside service', async () => {
        assert.equal((await me('POST', '/api/teacher/methods/advise', { question: 'What is the effect of peer tutoring on scores?' })).status, 404, 'no AI advisor endpoint');
        assert.equal((await me('POST', '/api/teacher/publications/doi', { doi: '10.1234/x' })).status, 404, 'no DOI look-up');
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '../../src/teacher');
        for (const f of fs.readdirSync(dir).filter((name) => name.endsWith('.js'))) {
            const code = fs.readFileSync(path.join(dir, f), 'utf8');
            assert.doesNotMatch(code, /require\(['"](axios|@google\/genai|node-fetch)['"]\)|\bfetch\(|userAiKey|aiQuota/, `${f} calls out`);
        }
    });

    test('Research Path: ten stages, tasks ticked off, progress, and nobody else can see it', async () => {
        const created = await me('POST', '/api/teacher/projects', { title: 'Peer tutoring in rural colleges', field: 'Education', goal: 'phd' });
        assert.equal(created.status, 201);
        const p = created.body;
        assert.equal(p.stages.length, 10);
        assert.equal(p.progress.percent, 0);
        assert.equal(p.progress.current.key, 'topic');
        const first = p.stages[0].tasks[0];
        const ticked = await me('PUT', `/api/teacher/projects/${p._id}/stages/topic/tasks/${first._id}`, { done: true });
        assert.equal(ticked.body.progress.done, 1);
        const added = await me('POST', `/api/teacher/projects/${p._id}/stages/topic/tasks`, { text: 'Meet the principal' });
        assert.equal(added.status, 201);
        const custom = added.body.stages[0].tasks.find((t) => t.text === 'Meet the principal');
        assert.equal(custom.custom, true);
        const removed = await me('DELETE', `/api/teacher/projects/${p._id}/stages/topic/tasks/${custom._id}`);
        assert.ok(!removed.body.stages[0].tasks.some((t) => t._id === custom._id));
        const dated = await me('PUT', `/api/teacher/projects/${p._id}/stages/literature`, { targetDate: '2026-12-31', notes: 'Scopus first' });
        assert.equal(dated.body.stages[1].notes, 'Scopus first');
        assert.equal((await other('GET', `/api/teacher/projects/${p._id}`)).status, 404, 'another teacher gets nothing');
        assert.equal((await me('POST', '/api/teacher/projects', { title: 'x' })).status, 400);
    });

    test('Research Path is worded for the topic, follows a new title, and brings older projects up to date', async () => {
        const created = await me('POST', '/api/teacher/projects', { title: 'Peer tutoring and mathematics anxiety in rural colleges', field: 'Education', kind: 'experimental' });
        assert.equal(created.status, 201);
        const stage = (p, key) => p.stages.find((s) => s.key === key);
        const p = created.body;
        assert.match(stage(p, 'topic').description, /Peer tutoring and mathematics anxiety in rural colleges/);
        assert.equal(stage(p, 'literature').tasks[0].text, 'Search ERIC, Scopus, Google Scholar and Shodhganga for: "peer tutoring" AND "mathematics anxiety" AND "rural colleges"');
        assert.equal(stage(p, 'questions').tasks[0].text, 'Write the question as an effect: “What is the effect of peer tutoring on mathematics anxiety in rural colleges?”');
        assert.equal(stage(p, 'methodology').tasks[3].text, 'Choose a pre-test and post-test of mathematics anxiety; plan their validity');

        // A new title rewrites the template wording; ticks, added tasks and the teacher's own wording stay.
        const lit = stage(p, 'literature');
        await me('PUT', `/api/teacher/projects/${p._id}/stages/literature/tasks/${lit.tasks[0]._id}`, { done: true });
        await me('PUT', `/api/teacher/projects/${p._id}/stages/literature/tasks/${lit.tasks[2]._id}`, { text: 'My own matrix in Excel' });
        await me('POST', `/api/teacher/projects/${p._id}/stages/literature/tasks`, { text: 'Ask the librarian' });
        const renamed = (await me('PUT', `/api/teacher/projects/${p._id}`, { title: 'Effect of peer tutoring on test anxiety among first-year students' })).body;
        const tasks = stage(renamed, 'literature').tasks;
        assert.equal(tasks[0].text, 'Search ERIC, Scopus, Google Scholar and Shodhganga for: "peer tutoring" AND "test anxiety" AND "first-year students"');
        assert.equal(tasks[0].done, true);
        assert.equal(tasks[2].text, 'My own matrix in Excel');
        assert.ok(tasks.some((t) => t.text === 'Ask the librarian' && t.custom));
        assert.equal(stage(renamed, 'methodology').tasks[3].text, 'Choose a pre-test and post-test of test anxiety; plan their validity');

        // A project from before: general wording, no record of what it was worded for.
        const old = await ResearchProject.create({
            teacherId: meId, title: 'Stress and academic performance of nursing students', field: 'Nursing', kind: 'survey',
            stages: require('../../src/teacher/researchPath').newStages('survey').map((s) => ({ ...s, tasks: s.tasks.map(({ tpl, ...t }) => t) }))
        });
        await ResearchProject.updateOne({ _id: old._id, 'stages.key': 'topic' }, { $set: { 'stages.$.tasks.0.done': true, 'stages.$.tasks.1.text': 'Read two reviews' } });
        const before = (await ResearchProject.findById(old._id).lean()).updatedAt;
        const list = (await me('GET', '/api/teacher/projects')).body.projects;
        const fitted = list.find((x) => x._id === String(old._id));
        assert.equal(stage(fitted, 'topic').tasks[0].text, 'Write three narrower versions of “Stress and academic performance of nursing students”: who exactly, where, and what you will measure or explore');
        assert.equal(stage(fitted, 'topic').tasks[0].done, true);
        assert.equal(stage(fitted, 'topic').tasks[1].text, 'Read two reviews');
        assert.equal(stage(fitted, 'literature').tasks[0].text, 'Search PubMed, Scopus, Google Scholar and Shodhganga for: "stress" AND "academic performance" AND "nursing students"');
        assert.equal(stage(fitted, 'questions').tasks[0].text, 'Write the main question in terms of variables, e.g. “How is stress related to academic performance among nursing students?”');
        assert.equal((await ResearchProject.findById(old._id).lean()).updatedAt.getTime(), before.getTime(), 'bringing it up to date does not reorder the list');
        await ResearchProject.deleteMany({ _id: { $in: [p._id, old._id] } });
    });

    test('Publications Map: entries, checks, stats with h-index', async () => {
        const bad = await me('POST', '/api/teacher/publications', { title: 'A paper', year: 99 });
        assert.equal(bad.status, 400);
        assert.equal(bad.body.field, 'year');
        const rows = [
            { title: 'Peer tutoring and maths anxiety', type: 'journal', status: 'published', year: 2025, citations: 5, indexing: ['Scopus', 'Nope'], quartile: 'Q2' },
            { title: 'Mentoring circles', type: 'conference', status: 'published', year: 2024, citations: 3, indexing: ['UGC-CARE'] },
            { title: 'Hybrid teaching review', status: 'under_review', citations: 1, deadline: new Date(Date.now() + 5 * 86400000).toISOString() }
        ];
        const made = [];
        for (const row of rows) { const r = await me('POST', '/api/teacher/publications', row); assert.equal(r.status, 201, JSON.stringify(r.body)); made.push(r.body); }
        assert.deepEqual(made[0].indexing, ['Scopus'], 'unknown indexing dropped');
        const list = await me('GET', '/api/teacher/publications');
        assert.equal(list.body.stats.total, 3);
        assert.equal(list.body.stats.byStatus.published, 2);
        assert.equal(list.body.stats.hIndex, 2);
        assert.equal(list.body.stats.byYear['2025'], 1);
        assert.equal(list.body.stats.upcomingDeadlines.length, 1);
        const moved = await me('PUT', `/api/teacher/publications/${made[2]._id}`, { status: 'accepted', year: '' });
        assert.equal(moved.body.status, 'accepted');
        assert.equal((await other('PUT', `/api/teacher/publications/${made[2]._id}`, { status: 'rejected' })).status, 404);
        assert.equal((await me('DELETE', `/api/teacher/publications/${made[1]._id}`)).status, 200);

        const doi = await me('PUT', `/api/teacher/publications/${made[0]._id}`, { doi: 'https://doi.org/10.1234/known.5678' });
        assert.equal(doi.body.doi, '10.1234/known.5678', 'a DOI link is kept as the bare DOI');
    });

    let thesis;
    const CHAPTER_TEXT = 'Peer tutoring has long been recognised as a practical way to raise achievement in large classes where a single teacher cannot reach every learner. In rural colleges of Karnataka the shortage of faculty makes this approach especially relevant, because senior students can explain difficult concepts in the language their juniors understand best. This study examines how structured peer tutoring sessions influence mathematics anxiety and examination performance among first-year undergraduates.';

    test('Thesis Writing: chapters, saving, word log, moving, and the PDF', async () => {
        const created = await me('POST', '/api/teacher/theses', { title: 'Peer tutoring and mathematics anxiety', degree: 'PhD', university: 'Test University', targetWords: 60000 });
        assert.equal(created.status, 201);
        thesis = created.body;
        assert.equal(thesis.chapters.length, 9);
        const intro = thesis.chapters[1];
        const saved = await me('PUT', `/api/teacher/theses/${thesis._id}/chapters/${intro._id}`, { content: CHAPTER_TEXT });
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.ok(saved.body.chapter.words > 60);
        assert.equal(saved.body.chapter.status, 'drafting', 'writing starts the chapter');
        const log = await WritingLog.findOne({ teacherId: meId }).lean();
        assert.equal(log.words, saved.body.chapter.words, 'the words count toward today');
        const moved = await me('PUT', `/api/teacher/theses/${thesis._id}/chapters/${intro._id}/move`, { direction: 'up' });
        assert.equal(moved.body.chapters[0].title, 'Introduction');
        assert.equal((await me('POST', `/api/teacher/theses/${thesis._id}/chapters/${intro._id}/assist`, { action: 'outline' })).status, 404, 'no AI writing assistant');
        const pdf = await me('GET', `/api/teacher/theses/${thesis._id}/pdf`);
        assert.equal(pdf.status, 200);
        assert.equal(pdf.headers.get('content-type'), 'application/pdf');
        assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
        assert.equal((await other('GET', `/api/teacher/theses/${thesis._id}`)).status, 404);
        const added = await me('POST', `/api/teacher/theses/${thesis._id}/chapters`, { title: 'Glossary' });
        assert.equal(added.body.chapters.length, 10);
        const gone = await me('DELETE', `/api/teacher/theses/${thesis._id}/chapters/${added.body.chapters[9]._id}`);
        assert.equal(gone.body.chapters.length, 9);
    });

    test('Independent Writing: a piece, its words in today\'s count, and the last 14 days', async () => {
        const piece = await me('POST', '/api/teacher/writing', { title: 'Reflections on mentoring', kind: 'reflection' });
        assert.equal(piece.status, 201);
        await me('PUT', `/api/teacher/writing/${piece.body._id}`, { content: 'Mentoring changed how I plan my week and how I listen to new colleagues in the department.' });
        const stats = await me('GET', '/api/teacher/writing/stats');
        assert.ok(stats.body.today >= 80, JSON.stringify(stats.body));
        assert.equal(stats.body.streak, undefined, 'no streak on the teacher side (the user, 2026-10-23)');
        assert.equal(stats.body.goal, 500);
        assert.equal(stats.body.last14.length, 14);
        const list = await me('GET', '/api/teacher/writing');
        assert.equal(list.body.pieces[0].title, 'Reflections on mentoring');
        assert.ok(list.body.pieces[0].words > 10);
    });

    test('Plagiarism: copied text from another teacher is found without saying whose; your own is labelled', async () => {
        const copied = `As part of my own project I note that ${CHAPTER_TEXT.slice(0, 380)} My own conclusion is different and comes from interviews I ran myself last spring with twelve lecturers.`;
        const check = await other('POST', '/api/teacher/plagiarism/check', { text: copied, title: 'Draft intro' });
        assert.equal(check.status, 201, JSON.stringify(check.body));
        assert.ok(check.body.score > 40, `score ${check.body.score}`);
        assert.equal(check.body.ownScore, 0);
        assert.ok(check.body.matches.length >= 1);
        assert.ok(check.body.sources.every((s) => s.label === 'Another document on YATICORP'), 'no title or author of someone else\'s work');
        assert.ok(!JSON.stringify(check.body.sources).includes('Peer tutoring and mathematics anxiety'));

        const piece = await me('POST', '/api/teacher/writing', { title: 'Conference abstract' });
        await me('PUT', `/api/teacher/writing/${piece.body._id}`, { content: CHAPTER_TEXT });
        const own = await me('POST', '/api/teacher/plagiarism/check', { source: { kind: 'writing', id: piece.body._id } });
        assert.equal(own.status, 201);
        assert.ok(own.body.ownScore > 50);
        assert.match(own.body.sources[0].label, /^Your thesis/);

        const fresh = await me('POST', '/api/teacher/plagiarism/check', { text: 'Entirely new words written today about a different subject, with nothing copied at all, about seed banks and monsoon farming cooperatives in northern Karnataka villages near Bidar, where women run the record books and share seed every season.' });
        assert.equal(fresh.body.score, 0);

        const quoted = await me('POST', '/api/teacher/plagiarism/check', { text: 'Many authors agree. "Learning happens best when students explain ideas to one another in their own words" is a common claim. Another view holds that structure matters more (Rao, 2021). We take both seriously in what follows here.' });
        assert.equal(quoted.body.citations.found, 1);
        assert.equal(quoted.body.flags.length, 1);
        assert.equal(quoted.body.flags[0].kind, 'quote-no-citation');

        assert.equal((await me('POST', '/api/teacher/plagiarism/check', { text: 'too short to check' })).status, 400);
        const reports = await me('GET', '/api/teacher/plagiarism/reports');
        assert.ok(reports.body.reports.length >= 3);
        assert.ok(!('text' in reports.body.reports[0]), 'the list carries no text');
        assert.equal((await other('GET', `/api/teacher/plagiarism/reports/${own.body._id}`)).status, 404);
        assert.equal((await me('GET', `/api/teacher/plagiarism/reports/${own.body._id}`)).body.text, CHAPTER_TEXT);
    });

    test('the overview adds it all up', async () => {
        const o = await me('GET', '/api/teacher/overview');
        assert.equal(o.status, 200);
        assert.equal(o.body.research.title, 'Peer tutoring in rural colleges');
        assert.equal(o.body.publications.total, 2);
        assert.equal(o.body.thesis.chapters, 9);
        assert.ok(o.body.thesis.words > 60);
        assert.ok(o.body.writing.today > 100);
        assert.equal(o.body.methods, undefined, 'no studied count');
        assert.ok(o.body.plagiarism);
    });

    test('the admin sees teachers and can switch one off', async () => {
        const adminCall = call(admin.token);
        const list = await adminCall('GET', `/api/admin/teachers?q=${encodeURIComponent('Dr. Ravi')}`);
        assert.equal(list.status, 200, JSON.stringify(list.body));
        const row = list.body.teachers.find((t) => String(t._id) === String(otherId));
        assert.ok(row);
        assert.equal(row.activity.writing, 0);
        assert.ok(!('password' in row));
        assert.equal((await adminCall('PATCH', `/api/admin/teachers/${otherId}/status`, { status: 'paused' })).status, 400);
        assert.equal((await adminCall('PATCH', `/api/admin/teachers/${otherId}/status`, { status: 'inactive' })).status, 200);
        assert.equal((await other('GET', '/api/teacher/me')).status, 401, 'switched off: signed out');
        assert.equal((await call(student.token)('GET', '/api/admin/teachers')).status, 401, 'not for students');
    });
});
