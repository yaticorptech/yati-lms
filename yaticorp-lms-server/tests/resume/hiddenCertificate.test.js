/**
 * A course certificate the student deleted from My Certificates (hiddenAt)
 * stays valid, but it is off their profile — so it is off the ATS resume and
 * the Learning Bio's certificate list too. The skills the finished course
 * proves still count. Downloading it again from the course brings it back.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const { connect, makeUser, cleanup } = require('../helpers');
const { buildResumeData, renderAtsPdf } = require('../../src/services/atsResumeService');
const { collect } = require('../../src/learningbio/learningDataService');
const { extractPdfText } = require('../../src/jobboard/services/localResumeParse');
const Certificate = require('../../src/models/Certificate');

let me, course, moduleId, cert;

const pdfText = (data) => new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
    sink.setHeader = () => {};
    sink.on('finish', () => resolve(extractPdfText(Buffer.concat(chunks))));
    sink.on('error', reject);
    renderAtsPdf(data, sink);
});

before(async () => {
    await connect();
    me = await makeUser('HiddenCert');
    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    const Progress = require('../../src/models/Progress');
    const { issueCertificate } = require('../../src/services/courseCompletion');
    course = await Course.create({ title: 'Python Programming Essentials' });
    const m = await Module.create({ courseId: course._id, title: 'Module', order: 1 });
    moduleId = m._id;
    const lesson = await Lesson.create({ moduleId: m._id, title: 'Lists and loops', order: 0 });
    await Progress.create({ userId: me.user._id, courseId: String(course._id), percentage: 100, completedLessons: [lesson._id] });
    ({ certificate: cert } = await issueCertificate({ userId: me.user._id, courseId: String(course._id), repair: true }));
});

after(async () => {
    await require('../../src/models/Lesson').deleteMany({ moduleId });
    await require('../../src/models/Module').deleteMany({ _id: moduleId });
    await require('../../src/models/Course').deleteMany({ _id: course._id });
    await cleanup([me.user]);
});

test('while it is on the profile, the resume and the Learning Bio list it', async () => {
    const data = await buildResumeData(me.user._id);
    assert.equal(data.certifications.length, 1);
    assert.equal(data.stats.certifications, 1);
    assert.match(await pdfText(data), new RegExp(cert.certificateNumber));
    const bio = await collect(me.user._id);
    assert.equal(bio.certificates.length, 1);
});

test('deleted from My Certificates: off the resume and the Learning Bio, the course and its skills stay', async () => {
    await Certificate.updateOne({ _id: cert._id }, { $set: { hiddenAt: new Date() } });

    const data = await buildResumeData(me.user._id);
    assert.equal(data.certifications.length, 0, 'not under Certifications');
    assert.equal(data.stats.certifications, 0, 'nor counted on the profile');
    assert.equal(data.courses.length, 1, 'the finished course is still on the resume');
    const text = await pdfText(data);
    assert.ok(text.includes('Python Programming Essentials'));
    assert.ok(!text.includes(cert.certificateNumber), 'its number is not printed under the course');

    const bio = await collect(me.user._id);
    assert.equal(bio.certificates.length, 0, 'not in the Learning Bio either');
    assert.equal(bio.courses.completed[0].certificate, null, 'the course card shows no certificate');
    assert.ok(!bio.timeline.some((t) => t.kind === 'certificate'), 'nor "Earned … certificate" in its timeline');
    const python = bio.skills.find((s) => /python/i.test(s.name));
    assert.ok(python, 'the course still teaches Python');
    assert.equal(python.evidence.certified, true, 'and the certificate, still valid, still counts as evidence');
});

test('brought back (downloaded again), it is listed again', async () => {
    await Certificate.updateOne({ _id: cert._id }, { $set: { hiddenAt: null } });
    assert.equal((await buildResumeData(me.user._id)).certifications.length, 1);
    assert.equal((await collect(me.user._id)).certificates.length, 1);
});
