/**
 * For the demo cards only (services/fullAccess.js), the Jobs section's skills
 * come from the student: their Career Path skills (opened out from syllabus
 * phrases into real skills) and their uploaded resume — a Word .docx
 * included. Every other student's search runs exactly as before.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const SkillProgress = require('../../src/career/models/SkillProgress');
const ResumeProfile = require('../../src/jobboard/models/ResumeProfile');
const ApiUsage = require('../../src/jobboard/models/ApiUsage');
const { searchSkills, openOut } = require('../../src/jobboard/services/searchSkills');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const { localParse, DOCX_MIME } = require('../../src/jobboard/services/localResumeParse');

/** A minimal Word file: word/document.xml, deflated, in a zip. */
const docx = (paragraphs) => {
    const xml = Buffer.from(`<?xml version="1.0"?><w:document><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
    const data = zlib.deflateRawSync(xml);
    const name = Buffer.from('word/document.xml');
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(xml.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(xml.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(0, 42);
    const cd = Buffer.concat([ch, name]);
    const eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10);
    eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(lh.length + name.length + data.length, 16);
    return Buffer.concat([lh, name, data, cd, eo]);
};

let app, student, empty, plain, demoCards;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    student = await makeUser('Skills');
    empty = await makeUser('NoSkills');
    plain = await makeUser('Ordinary');
    // `student` and `empty` stand in for two of the demo cards; `plain` is
    // everyone else.
    demoCards = [student, empty].map((u) => normaliseCardNumber(u.user.cardNumber));
    demoCards.forEach((c) => DEMO_CARDS.add(c));
});

after(async () => {
    demoCards.forEach((c) => DEMO_CARDS.delete(c));
    await ApiUsage.deleteMany({ key: { $regex: `^resume:(${student.user._id}|${empty.user._id}|${plain.user._id}):` } });
    await cleanup([student.user, empty.user, plain.user], app.server);
});

test('Career Path\'s syllabus phrases become the skills a listing asks for', () => {
    assert.deepEqual(openOut(['HTML5 / CSS3 / Tailwind CSS']).sort(), ['CSS', 'HTML', 'Tailwind CSS']);
    assert.deepEqual(openOut(['React.js / Next.js']), ['React', 'Next.js']);
    assert.deepEqual(openOut('Python, Docker'), ['Python', 'Docker'], 'plain skills, and a comma list, stay themselves');
});

test('a demo card\'s search with no skills runs on their own: Career Path and the uploaded resume', async () => {
    await SkillProgress.insertMany([
        { userId: student.user._id, skillName: 'HTML5 / CSS3 / Tailwind CSS', progress: 40 },
        { userId: student.user._id, skillName: 'React.js / Next.js', progress: 30 },
        { userId: student.user._id, skillName: 'Kubernetes', progress: 0, level: 'Beginner' }   // not started yet: still the role's skill
    ]);
    await ResumeProfile.create({ userId: student.user._id, filename: 'cv.pdf', skills: ['Python', 'Figma'], parseStatus: 'parsed', parsedAt: new Date() });

    const typed = await searchSkills(['Java'], student.user);
    assert.deepEqual(typed, { skills: ['Java'], fromProfile: false }, 'what the student typed comes first');

    const own = await searchSkills([], student.user);
    assert.equal(own.fromProfile, true);
    for (const s of ['HTML', 'CSS', 'Tailwind CSS', 'React', 'Next.js', 'Python', 'Figma']) assert.ok(own.skills.includes(s), `${s} is used`);
    assert.ok(own.skills.includes('Kubernetes'), 'for a demo card, every skill on the roadmap counts, started or not');

    assert.deepEqual(await searchSkills([], empty.user), { skills: [], fromProfile: false }, 'nothing to go on: nothing invented');
});

test('every other student\'s search runs on what was sent, as before', async () => {
    await SkillProgress.insertMany([{ userId: plain.user._id, skillName: 'React.js / Next.js', progress: 50 }]);
    await ResumeProfile.create({ userId: plain.user._id, filename: 'cv.pdf', skills: ['Python'], parseStatus: 'parsed', parsedAt: new Date() });
    assert.deepEqual(await searchSkills([], plain.user), { skills: [], fromProfile: false }, 'no stand-in skills');
    const sent = await searchSkills(['HTML5 / CSS3 / Tailwind CSS', 'Java'], plain.user);
    assert.equal(sent.skills.length, 2, 'nothing opened out');
    assert.ok(sent.skills.includes('Java'));
});

test('a Word resume is read for its skills', () => {
    const read = localParse(docx(['Skills: React, Node.js, MongoDB &amp; Python', '3 years of experience with JavaScript and Docker']), DOCX_MIME);
    assert.deepEqual(read.skills.sort(), ['Docker', 'JavaScript', 'MongoDB', 'Node.js', 'Python', 'React']);
    assert.equal(read.experienceYears, 3);
    assert.equal(localParse(Buffer.from('not a zip'), DOCX_MIME), null);
});

test('the Jobs section takes a Word resume from a demo card, and keeps its skills; not from anyone else', async () => {
    const upload = async (who, bytes) => {
        const fd = new FormData();
        fd.append('resume', new Blob([bytes], { type: DOCX_MIME }), 'resume.docx');
        const r = await fetch(`http://127.0.0.1:${app.server.address().port}/api/jobs/resume`, { method: 'POST', headers: { Authorization: `Bearer ${who.token}` }, body: fd });
        return { status: r.status, body: await r.json().catch(() => ({})) };
    };
    const ok = await upload(empty, docx(['Technical skills: SQL, Excel, Power BI']));
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.profile.parseStatus, 'parsed');
    for (const s of ['SQL', 'Excel', 'Power BI']) assert.ok(ok.body.profile.skills.includes(s), `${s} read`);
    const kept = await ResumeProfile.findOne({ userId: empty.user._id }).lean();
    assert.ok(kept.skills.includes('SQL'), 'and stored, for every later search');

    const blank = await upload(empty, docx(['Hello, my name is Asha. I like painting and music.']));
    assert.equal(blank.status, 422);
    assert.match(blank.body.error, /No skills could be found in that Word file/);

    const ordinary = await upload(plain, docx(['Technical skills: SQL, Excel']));
    assert.equal(ordinary.status, 400, 'as before: PDF or image only');
    assert.match(ordinary.body.error, /must be a PDF or an image/);
});
