/**
 * Teachers added by the admin and by organizations, teachers joining an
 * organization from their dashboard, and the dashboard's newer tools: the
 * Word thesis, the reference list and spreadsheet, version history, guide
 * research types, and plagiarism checks
 * against the teacher's own uploaded papers.
 */
const sent = [];
require('../../src/utils/emailService').sendEmail = async (msg) => { sent.push(msg); };
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { connect, makeAdmin, cleanup } = require('../helpers');
const Card = require('../../src/models/Card');
const Admin = require('../../src/models/Admin');
const Setting = require('../../src/models/Setting');
const Organization = require('../../src/organizations/models/Organization');
const OrgAuditLog = require('../../src/organizations/models/OrgAuditLog');
const generateToken = require('../../src/utils/generateToken');
const { unzip } = require('../../src/teacher/zip');
const { buildDocx, paragraph } = require('../../src/teacher/docx');
const { wordCount } = require('../../src/teacher/similarity');
const M = require('../../src/teacher/models');

const STAMP = `${Date.now()}`.slice(-7);
const PASSWORD = 'Teach-Pass1!';
let server, base, admin, boss, approvalBefore;
const cards = [];
const orgs = [];

const request = (token, headers = {}) => (method, path, body) => fetch(`${base}${path}`, {
    method, headers: { ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, headers: r.headers, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) }));
const anon = request(null);

const newCard = async () => {
    const n = String(cards.length + 1).padStart(3, '0');
    const card = await Card.create({ verified: true, CardNumber: `97${STAMP}${n}`, CVV: `C${String(cards.length).padStart(4, '0')}`, qrCodeNumber: `OQR${STAMP}${n}`, status: 'unactivated' });
    cards.push(card);
    return card;
};
const email = (label) => `teacher-${STAMP}-${label}@example.edu`;
const cardFields = (card) => ({ CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber });
const teacherToken = (t) => generateToken(t._id, 'teacher');
const sheet = (rows) => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Teachers');
    const form = new FormData();
    form.append('file', new Blob([XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })]), 'teachers.xlsx');
    return form;
};

const makeOrg = async (label) => {
    const r = await request(boss.token)('POST', '/api/organizations/admin', {
        name: `${label} College ${STAMP}`, organizationType: 'college', contactPerson: 'Asha Rao',
        email: `org-${label}-${STAMP}@school.edu`, password: 'Passw0rd!x', orgCode: `t_${label}_${STAMP}`
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const orgAdmin = await Admin.findOne({ organizationId: r.body.organization._id, role: 'orgadmin' });
    orgs.push(r.body.organization._id);
    return { org: r.body.organization, token: jwt.sign({ id: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};

before(async () => {
    await connect();
    const app = express();
    app.use('/api/teacher', express.json({ limit: '3mb' }));
    app.use(express.json());
    app.use('/api/admin/teachers', require('../../src/teacher/admin'));
    app.use('/api/organizations', require('../../src/organizations'));
    app.use('/api/teacher', require('../../src/teacher'));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    admin = await makeAdmin('TeacherAdmin');
    boss = await makeAdmin('TeacherBoss');
    await Admin.updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    approvalBefore = Boolean((await Setting.findOne().select('teacherApprovalRequired').lean())?.teacherApprovalRequired);
});

after(async () => {
    await Setting.updateOne({}, { $set: { teacherApprovalRequired: approvalBefore } });
    const ids = (await M.Teacher.find({ email: new RegExp(`^teacher-${STAMP}-`) }).select('_id').lean()).map((t) => t._id);
    await Promise.all([M.ResearchProject, M.Publication, M.Thesis, M.WritingPiece, M.WritingLog, M.PlagiarismReport, M.TextVersion, M.PlagiarismSource, M.TeacherOrgRequest]
        .map((Model) => Model.deleteMany({ teacherId: { $in: ids } })));
    await M.Teacher.deleteMany({ _id: { $in: ids } });
    await Card.deleteMany({ _id: { $in: cards.map((c) => c._id) } });
    await Admin.deleteMany({ organizationId: { $in: orgs } });
    await OrgAuditLog.deleteMany({ organizationId: { $in: orgs } }).catch(() => {});
    await Organization.deleteMany({ _id: { $in: orgs } });
    await cleanup([], server, [admin.admin, boss.admin]);
});

/* ── The admin adds teachers ───────────────────────────────────────────── */

describe('the admin adds and looks after teachers', () => {
    let added;

    test('adding a teacher with a card makes an active account, uses the card and emails the details', async () => {
        const card = await newCard();
        const r = await request(admin.token)('POST', '/api/admin/teachers', {
            name: 'Dr. Meera Iyer', email: email('admin1'), phone: '98450 12345', password: PASSWORD, ...cardFields(card), department: 'Physics'
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        added = await M.Teacher.findById(r.body._id);
        assert.equal(added.status, 'active');
        assert.equal(added.createdBy, 'admin');
        assert.equal((await Card.findById(card._id)).status, 'used');
        await new Promise((res) => setTimeout(res, 50));
        const mail = sent.find((m) => m.to === email('admin1'));
        assert.ok(mail, 'welcome email sent');
        assert.match(mail.htmlContent, new RegExp(card.CardNumber));
        // The same card again is refused, as a form mistake (400, not 401).
        const again = await request(admin.token)('POST', '/api/admin/teachers', { name: 'Someone Else', email: email('admin1b'), phone: '9845012346', password: PASSWORD, ...cardFields(card) });
        assert.equal(again.status, 400);
        assert.equal(again.body.code, 'CARD_USED');
    });

    test('a weak password or a bad email is refused with the field named', async () => {
        const card = await newCard();
        const weak = await request(admin.token)('POST', '/api/admin/teachers', { name: 'Ravi Kumar', email: email('weak'), phone: '9845012347', password: 'short', ...cardFields(card) });
        assert.equal(weak.status, 400);
        assert.equal(weak.body.field, 'password');
        const mail = await request(admin.token)('POST', '/api/admin/teachers', { name: 'Ravi Kumar', email: 'not-an-email', phone: '9845012347', password: PASSWORD, ...cardFields(card) });
        assert.equal(mail.body.field, 'email');
        assert.equal((await Card.findById(card._id)).status, 'unactivated', 'a refused form leaves the card free');
    });

    test('a spreadsheet adds the good rows and reports the bad ones by row', async () => {
        const [a, b] = [await newCard(), await newCard()];
        const r = await request(admin.token)('POST', '/api/admin/teachers/bulk', sheet([
            ['Name', 'Email', 'Phone', 'Card Number', 'CVV', 'QR Code Number', 'Password', 'Department'],
            ['Asha Rao', email('bulk1'), '9845000001', a.CardNumber, a.CVV.toLowerCase(), a.qrCodeNumber, PASSWORD, 'Education'],
            ['Kiran Shetty', email('bulk2'), '9845000002', b.CardNumber, b.CVV, b.qrCodeNumber, PASSWORD, ''],
            ['No Card', email('bulk3'), '9845000003', '999999999999', 'XXXXX', 'NOPE', PASSWORD, '']
        ]));
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.results.successCount, 2);
        assert.equal(r.body.results.failedCount, 1);
        assert.equal(r.body.results.errors[0].row, 4);
        assert.equal((await M.Teacher.findOne({ email: email('bulk1') })).department, 'Education');
    });

    test('a new password from the admin ends the teacher’s old sessions', async () => {
        const old = teacherToken(added);
        await new Promise((r) => setTimeout(r, 1100));
        const r = await request(admin.token)('PUT', `/api/admin/teachers/${added._id}`, { password: 'New-Pass2!x', designation: 'Professor' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const me = await request(old)('GET', '/api/teacher/me');
        assert.equal(me.status, 401);
        assert.equal(me.body.code, 'PASSWORD_CHANGED');
        const login = await anon('POST', '/api/teacher/auth/login', { cardNumber: added.cardNumber, password: 'New-Pass2!x' });
        assert.equal(login.status, 200);
        assert.equal(login.body.designation, 'Professor');
    });

    test('the admin can email a reset link', async () => {
        const r = await request(admin.token)('POST', `/api/admin/teachers/${added._id}/send-password-reset`);
        assert.equal(r.status, 200);
        const token = /reset-password\?as=teacher&token=([a-f0-9]+)/.exec(sent.filter((m) => m.to === email('admin1')).pop().htmlContent)[1];
        const reset = await anon('POST', '/api/teacher/auth/reset-password', { token, newPassword: 'Third-Pass3!' });
        assert.equal(reset.status, 200);
    });

    test('with approval on, a self-registered teacher waits until the admin approves', async () => {
        const on = await request(admin.token)('PUT', '/api/admin/teachers/settings', { approvalRequired: true });
        assert.equal(on.body.approvalRequired, true);
        const card = await newCard();
        const reg = await anon('POST', '/api/teacher/auth/register', { name: 'Waiting Teacher', email: email('wait'), phone: '9845000009', password: PASSWORD, ...cardFields(card) });
        assert.equal(reg.status, 202, JSON.stringify(reg.body));
        assert.equal(reg.body.pending, true);
        assert.equal(reg.body.token, undefined, 'no session while waiting');
        const login = await anon('POST', '/api/teacher/auth/login', { cardNumber: card.CardNumber, password: PASSWORD });
        assert.equal(login.status, 403);
        assert.equal(login.body.code, 'PENDING_APPROVAL');

        const list = await request(admin.token)('GET', '/api/admin/teachers?status=pending');
        const row = list.body.teachers.find((t) => t.email === email('wait'));
        assert.ok(row && list.body.pending >= 1 && list.body.approvalRequired);
        assert.equal((await request(admin.token)('PATCH', `/api/admin/teachers/${row._id}/status`, { status: 'active' })).status, 200);
        assert.equal((await anon('POST', '/api/teacher/auth/login', { cardNumber: card.CardNumber, password: PASSWORD })).status, 200);
        assert.ok(sent.some((m) => m.to === email('wait') && /approved/i.test(m.subject)));
        await request(admin.token)('PUT', '/api/admin/teachers/settings', { approvalRequired: false });
    });

    test('only a super admin puts a teacher into an organization', async () => {
        const { org } = await makeOrg('assign');
        const plain = await request(admin.token)('PUT', `/api/admin/teachers/${added._id}`, { organizationId: org._id });
        assert.equal(plain.status, 403);
        const sup = await request(boss.token)('PUT', `/api/admin/teachers/${added._id}`, { organizationId: org._id });
        assert.equal(sup.status, 200, JSON.stringify(sup.body));
        const detail = await request(boss.token)('GET', `/api/admin/teachers/${added._id}`);
        assert.equal(detail.body.teacher.organization.name, org.name);
        assert.equal(detail.body.teacher.password, undefined);
        const filtered = await request(admin.token)('GET', `/api/admin/teachers?organizationId=${org._id}`);
        assert.deepEqual(filtered.body.teachers.map((t) => t.email), [email('admin1')]);
    });

    test('deleting a teacher removes their records and frees the card', async () => {
        const card = await newCard();
        const r = await request(admin.token)('POST', '/api/admin/teachers', { name: 'Gone Soon', email: email('gone'), phone: '9845000010', password: PASSWORD, ...cardFields(card) });
        await request(teacherToken({ _id: r.body._id }))('POST', '/api/teacher/publications', { title: 'A paper to delete' });
        assert.equal((await request(admin.token)('DELETE', `/api/admin/teachers/${r.body._id}`)).status, 200);
        assert.equal(await M.Teacher.countDocuments({ _id: r.body._id }), 0);
        assert.equal(await M.Publication.countDocuments({ teacherId: r.body._id }), 0);
        assert.equal((await Card.findById(card._id)).status, 'unactivated');
    });
});

/* ── Organizations and their teachers ──────────────────────────────────── */

describe('organizations add teachers, and teachers ask to join', () => {
    let school, other, teacher, tok;

    before(async () => {
        school = await makeOrg('school');
        other = await makeOrg('other');
        const card = await newCard();
        const reg = await anon('POST', '/api/teacher/auth/register', { name: 'Joining Teacher', email: email('join'), phone: '9845000020', password: PASSWORD, ...cardFields(card) });
        assert.equal(reg.status, 201, JSON.stringify(reg.body));
        teacher = reg.body;
        tok = reg.body.token;
    });

    test('a teacher finds the organization by its ID, asks to join, and the organization approves', async () => {
        const me = request(tok);
        const look = await me('GET', `/api/teacher/organization/lookup/${school.org.orgCode}`);
        assert.equal(look.status, 200, JSON.stringify(look.body));
        assert.equal(look.body.organization.name, school.org.name);
        assert.equal(look.body.organization.email, undefined, 'no contact details before joining');
        assert.equal((await me('GET', '/api/teacher/organization/lookup/no_such_place_here')).status, 404);

        const ask = await me('POST', '/api/teacher/organization/requests', { orgCode: school.org.orgCode });
        assert.equal(ask.status, 201);
        assert.equal((await me('POST', '/api/teacher/organization/requests', { orgCode: other.org.orgCode })).status, 409, 'one request at a time');

        const org = request(school.token);
        assert.equal((await org('GET', '/api/organizations/me/teachers/requests/count')).body.pending, 1);
        const list = await org('GET', '/api/organizations/me/teachers/requests');
        assert.equal(list.body.requests[0].teacher.email, email('join'));
        // Another organization cannot decide it.
        assert.equal((await request(other.token)('PUT', `/api/organizations/me/teachers/requests/${list.body.requests[0]._id}`, { decision: 'approve' })).status, 404);
        const ok = await org('PUT', `/api/organizations/me/teachers/requests/${list.body.requests[0]._id}`, { decision: 'approve' });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));

        const mine = await me('GET', '/api/teacher/organization');
        assert.equal(mine.body.member, true);
        assert.equal(mine.body.organization.name, school.org.name);
        assert.equal((await me('POST', '/api/teacher/organization/leave')).status, 409, 'an active organization removes, the teacher cannot leave');
    });

    test('the organization sees its teachers’ progress, but never their writing, and no one else’s', async () => {
        const me = request(tok);
        const thesis = (await me('POST', '/api/teacher/theses', { title: 'A private thesis' })).body;
        await me('PUT', `/api/teacher/theses/${thesis._id}/chapters/${thesis.chapters[1]._id}`, { content: 'Secret words that only the teacher should ever read in full.' });
        const org = request(school.token);
        const list = await org('GET', '/api/organizations/me/teachers');
        const row = list.body.teachers.find((t) => t.email === email('join'));
        assert.ok(row.summary);
        assert.equal(row.summary.theses, 1);
        const detail = await org('GET', `/api/organizations/me/teachers/${teacher._id}`);
        assert.equal(detail.status, 200);
        assert.equal(detail.body.progress.theses[0].title, 'A private thesis');
        assert.doesNotMatch(JSON.stringify(detail.body), /Secret words|password/);
        assert.equal((await request(other.token)('GET', `/api/organizations/me/teachers/${teacher._id}`)).status, 404);
        const dash = await org('GET', '/api/organizations/me/dashboard');
        assert.equal(dash.body.stats.teachers, 1);
    });

    test('the organization removes a teacher; the account stays theirs and they may ask again', async () => {
        const org = request(school.token);
        assert.equal((await org('DELETE', `/api/organizations/me/teachers/${teacher._id}`)).status, 200);
        const mine = await request(tok)('GET', '/api/teacher/organization');
        assert.equal(mine.body.member, false);
        assert.equal(mine.body.removed.reason, 'Removed by the organization');
        assert.equal((await request(tok)('GET', '/api/teacher/me')).status, 200);
    });

    test('an organization adds teachers with cards, one by one or from a spreadsheet', async () => {
        const org = request(school.token);
        const card = await newCard();
        const one = await org('POST', '/api/organizations/me/teachers', { name: 'Org Teacher', email: email('org1'), phone: '9845000030', password: PASSWORD, ...cardFields(card) });
        assert.equal(one.status, 201, JSON.stringify(one.body));
        const t = await M.Teacher.findById(one.body._id);
        assert.equal(String(t.organizationId), String(school.org._id));
        assert.equal(t.createdBy, 'organization');
        assert.equal(t.institution, school.org.name, 'the institution defaults to the organization');

        const c2 = await newCard();
        const bulk = await org('POST', '/api/organizations/me/teachers/bulk', sheet([
            ['Name', 'Email', 'Phone', 'CardNumber', 'CVV', 'QRCodeNumber', 'Password'],
            ['Sheet Teacher', email('org2'), '9845000031', c2.CardNumber, c2.CVV, c2.qrCodeNumber, PASSWORD]
        ]));
        assert.equal(bulk.body.results.successCount, 1, JSON.stringify(bulk.body));
        assert.equal(String((await M.Teacher.findOne({ email: email('org2') })).organizationId), String(school.org._id));
        assert.equal((await org('GET', '/api/organizations/me/teachers')).body.teachers.length, 2);
    });
});

/* ── The teacher's tools ───────────────────────────────────────────────── */

describe('the teacher dashboard’s tools', () => {
    let me;
    before(async () => {
        const card = await newCard();
        const reg = await anon('POST', '/api/teacher/auth/register', { name: 'Tool Teacher', email: email('tools'), phone: '9845000040', password: PASSWORD, ...cardFields(card) });
        me = request(reg.body.token);
    });

    test('Kannada and Hindi words are counted as words', () => {
        assert.equal(wordCount('ಕನ್ನಡ ಭಾಷೆಯ ಶಿಕ್ಷಣ'), 3);
        assert.equal(wordCount('विद्यालय में शिक्षा'), 3);
    });

    test('the thesis downloads as Word with headings, bullets and a contents field, and as a PDF in Kannada', async () => {
        const t = (await me('POST', '/api/teacher/theses', { title: 'ಸಹಪಾಠಿ ಬೋಧನೆ — Peer tutoring', degree: 'PhD' })).body;
        await me('PUT', `/api/teacher/theses/${t._id}/chapters/${t.chapters[1]._id}`, { content: 'Background of the study\n- The wider context\n- Why it matters\n\nಈ ಅಧ್ಯಯನವು ಸಹಪಾಠಿ ಬೋಧನೆಯ ಪರಿಣಾಮವನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ (p ≤ .05).' });
        const docx = await me('GET', `/api/teacher/theses/${t._id}/docx`);
        assert.equal(docx.status, 200);
        assert.match(docx.headers.get('content-disposition'), /\.docx"/);
        const files = unzip(docx.body);
        const xml = files['word/document.xml'].toString('utf8');
        assert.ok(files['word/styles.xml'] && files['[Content_Types].xml']);
        assert.match(xml, /w:pStyle w:val="Heading1"\/><w:pageBreakBefore\/>.*2\. Introduction/s);
        assert.match(xml, /Heading2"\/>.*Background of the study/s);
        assert.match(xml, /ListBullet.*The wider context/s);
        assert.match(xml, /ಸಹಪಾಠಿ ಬೋಧನೆಯ/);
        assert.match(xml, / TOC /);
        const pdf = await me('GET', `/api/teacher/theses/${t._id}/pdf`);
        assert.equal(pdf.status, 200);
        assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
        assert.match(pdf.body.toString('latin1'), /NotoSerifKannada/, 'the Kannada font is embedded');
    });

    test('version history: older text is kept, a version can be saved and restored, and the restore can be undone', async () => {
        const piece = (await me('POST', '/api/teacher/writing', { title: 'Versions' })).body;
        await me('PUT', `/api/teacher/writing/${piece._id}`, { content: 'First draft of the opening paragraph.' });
        await me('PUT', `/api/teacher/writing/${piece._id}`, { content: 'Second draft of the opening paragraph, longer now.' });
        let list = await me('GET', `/api/teacher/writing/${piece._id}/versions`);
        assert.equal(list.body.versions.length, 1, 'the text before the session was kept');
        const firstDraft = list.body.versions[0]._id;
        assert.equal((await me('GET', `/api/teacher/writing/${piece._id}/versions/${firstDraft}`)).body.content, 'First draft of the opening paragraph.');
        // Saved again within ten minutes: no new version.
        await me('PUT', `/api/teacher/writing/${piece._id}`, { content: 'Third draft of the opening paragraph.' });
        assert.equal((await me('GET', `/api/teacher/writing/${piece._id}/versions`)).body.versions.length, 1);
        assert.equal((await me('POST', `/api/teacher/writing/${piece._id}/versions`, { label: 'Before supervisor meeting' })).status, 201);
        const restored = await me('POST', `/api/teacher/writing/${piece._id}/versions/${firstDraft}/restore`);
        assert.equal(restored.body.content, 'First draft of the opening paragraph.');
        list = await me('GET', `/api/teacher/writing/${piece._id}/versions`);
        assert.deepEqual(list.body.versions.map((v) => v.reason), ['restore', 'manual', 'auto']);
        assert.equal(list.body.versions[1].label, 'Before supervisor meeting');
        // Someone else's piece has no versions to show them.
        const card = await newCard();
        const stranger = await anon('POST', '/api/teacher/auth/register', { name: 'Stranger', email: email('stranger'), phone: '9845000041', password: PASSWORD, ...cardFields(card) });
        assert.equal((await request(stranger.body.token)('GET', `/api/teacher/writing/${piece._id}/versions/${firstDraft}`)).status, 404);
    });

    test('the reference list in APA, the Word list and the spreadsheet', async () => {
        await me('POST', '/api/teacher/publications', { title: 'Peer tutoring in rural colleges', status: 'published', type: 'journal', authors: 'Asha Rao, Meera Iyer', venue: 'Journal of Rural Education', year: 2023, volume: '12', issue: '3', pages: '45–60', doi: '10.1234/jre.2023.045' });
        await me('POST', '/api/teacher/publications', { title: 'Still drafting', status: 'drafting' });
        const refs = await me('GET', '/api/teacher/publications/references');
        assert.equal(refs.body.references.length, 1, 'only accepted and published work');
        assert.equal(refs.body.references[0].text, 'Rao, A., & Iyer, M. (2023). Peer tutoring in rural colleges. Journal of Rural Education, 12(3), 45–60. https://doi.org/10.1234/jre.2023.045');
        const word = await me('GET', '/api/teacher/publications/export?format=docx');
        const xml = unzip(word.body)['word/document.xml'].toString('utf8');
        assert.match(xml, /<w:i\/>.*Journal of Rural Education/s);
        const xlsx = await me('GET', '/api/teacher/publications/export?format=xlsx');
        const rows = XLSX.utils.sheet_to_json(XLSX.read(xlsx.body).Sheets.Publications);
        assert.equal(rows.length, 2);
        assert.ok(rows.find((r) => r.Status === 'Published' && r.Volume === '12' && /Rao, A\./.test(r['APA reference'])));
    });

    test('there is no "mark as read" for guides any more', async () => {
        assert.equal((await me('PUT', '/api/teacher/guides/publishing/journal', { read: true })).status, 404);
        assert.equal((await me('GET', '/api/teacher/overview')).body.guides, undefined);
    });

    test('there is no writing calendar any more', async () => {
        assert.equal((await me('GET', '/api/teacher/writing/calendar')).status, 404);
    });

    test('a research project starts from the template for its kind', async () => {
        const list = await me('GET', '/api/teacher/projects');
        assert.ok(list.body.kinds.some((k) => k.key === 'review'));
        const p = (await me('POST', '/api/teacher/projects', { title: 'A systematic review of peer tutoring', kind: 'review' })).body;
        assert.equal(p.kind, 'review');
        assert.match(p.stages.find((s) => s.key === 'methodology').tasks[0].text, /PRISMA/);
        assert.equal(p.stages.length, 10);
    });

    test('the plagiarism check compares with papers the teacher uploaded, including Word files', async () => {
        const paper = 'Peer tutoring benefits both the tutor and the tutee because explaining a concept forces the tutor to organise their own understanding of the subject in a new and lasting way that lectures rarely achieve in rural colleges.';
        const up = await me('POST', '/api/teacher/plagiarism/sources', { title: 'Rao 2021', fileName: 'rao2021.pdf', text: paper });
        assert.equal(up.status, 201, JSON.stringify(up.body));
        const docx = buildDocx({ body: [paragraph('Mathematics anxiety among first year students falls when they study in small groups with a trained peer who explains each problem slowly and patiently before the examination season begins in earnest every year.')] });
        const word = await me('POST', '/api/teacher/plagiarism/sources', { fileName: 'iyer.docx', docx: docx.toString('base64') });
        assert.equal(word.status, 201, JSON.stringify(word.body));
        assert.equal(word.body.title, 'iyer');
        assert.equal((await me('POST', '/api/teacher/plagiarism/sources', { title: 'Empty', text: 'too short' })).status, 400);

        const check = await me('POST', '/api/teacher/plagiarism/check', { text: `My study shows that ${paper} This is my own conclusion about the colleges I visited during the two years of fieldwork in north Karnataka.` });
        assert.equal(check.status, 201);
        assert.ok(check.body.score > 50);
        assert.ok(check.body.sources.some((s) => s.label === 'Your uploaded source “Rao 2021”' && !s.own));
        const list = await me('GET', '/api/teacher/plagiarism/sources');
        assert.equal(list.body.sources.length, 2);
        assert.equal(list.body.sources[0].text, undefined, 'the list does not send the text back');
        assert.equal((await me('DELETE', `/api/teacher/plagiarism/sources/${up.body._id}`)).status, 200);
    });
});
