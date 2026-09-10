/**
 * The generated resume PDF: the template it lays out, and the promise that
 * makes it worth generating — that an applicant tracking system can read
 * every word back out of it.
 *
 * Nothing here touches the database. `renderAtsPdf` takes the data
 * `buildResumeData` returns and writes a PDF; these tests hand it data
 * directly and read the finished file back with the same PDF text reader
 * the LMS uses on resumes students upload.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const { renderAtsPdf, monogram } = require('../../src/services/atsResumeService');
const { extractPdfText } = require('../../src/jobboard/services/localResumeParse');

/** Render to memory, then hand back the bytes, the text and the page count. */
const render = (data) => new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
    sink.setHeader = (name, value) => { sink.headers = { ...sink.headers, [name]: value }; };
    sink.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
            buffer,
            headers: sink.headers || {},
            text: extractPdfText(buffer),
            pages: (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
        });
    });
    sink.on('error', reject);
    renderAtsPdf(data, sink);
});

const EMPTY = {
    name: '', email: '', phone: '', headline: '', summary: '',
    skills: [], education: [], experience: [], courses: [], certifications: [],
    generatedAt: new Date('2026-09-10')
};

const FULL = {
    ...EMPTY,
    name: 'Ananya Ramesh Iyer',
    email: 'ananya.iyer@example.com',
    phone: '+91 80 4444 1212',
    headline: 'Aspiring Frontend Developer',
    summary: 'Aspiring Frontend Developer. 4 courses on YATI LMS (2 completed).',
    skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'].map((name) => ({ name, sources: ['course'] })),
    education: [{ title: 'BSc in Computer Science', detail: 'Undergraduate, Bangalore University' }],
    experience: [{ title: 'Junior Web Developer Intern', detail: '1 years' }],
    courses: [
        {
            id: '1', title: 'Modern React from the Ground Up', percentage: 100, completed: true,
            certificate: { certificateNumber: 'YATI-2026-0091', issuedAt: new Date('2026-04-11') },
            topics: ['Components and props', 'State and effects'], lessonsDone: 24, skills: ['React']
        },
        {
            id: '2', title: 'JavaScript Fundamentals', percentage: 62, completed: false, certificate: null,
            topics: ['Variables and scope'], lessonsDone: 13, skills: ['JavaScript']
        }
    ],
    certifications: [{ title: 'Modern React from the Ground Up', issuer: 'YATI LMS', date: new Date('2026-04-11'), number: 'YATI-2026-0091' }]
};

/** Where a phrase starts in the extracted text, for checking reading order. */
const at = (text, phrase) => {
    const i = text.indexOf(phrase);
    assert.notEqual(i, -1, `expected the resume to contain "${phrase}"`);
    return i;
};

describe('the monogram in the circle', () => {
    test('is the first letter of the first and last names', () => {
        assert.equal(monogram('Ananya Ramesh Iyer'), 'AI');
        assert.equal(monogram('diya agarwal'), 'DA');
    });

    test('a single name gives its first two letters', () => {
        assert.equal(monogram('Ravi'), 'RA');
    });

    test('a one-letter name and a missing name still give something to draw', () => {
        assert.equal(monogram('R'), 'R');
        assert.equal(monogram(''), 'YL');
        assert.equal(monogram(undefined), 'YL');
    });
});

describe('the generated resume', () => {
    test('is a PDF, downloaded under a filename built from the student name', async () => {
        const { buffer, headers } = await render(FULL);
        assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
        assert.equal(headers['Content-Type'], 'application/pdf');
        assert.match(headers['Content-Disposition'], /attachment; filename="ATS_Resume_Ananya_Ramesh_Iyer\.pdf"/);
    });

    test('every word comes back out as text, which is what makes it ATS-friendly', async () => {
        const { text } = await render(FULL);
        for (const phrase of [
            'ANANYA RAMESH IYER', 'ananya.iyer@example.com', '+91 80 4444 1212',
            'Aspiring Frontend Developer',
            'Modern React from the Ground Up', 'JavaScript Fundamentals', 'YATI-2026-0091'
        ]) at(text, phrase);
    });

    test('the name is set in capitals under the monogram', async () => {
        const { text } = await render(FULL);
        assert.ok(at(text, 'AI') < at(text, 'ANANYA RAMESH IYER'));
    });

    test('the contact line runs email and phone together on one line', async () => {
        const { text } = await render(FULL);
        const line = text.split('\n').find((l) => l.includes('ananya.iyer@example.com'));
        assert.ok(line.includes('+91 80 4444 1212'), 'phone belongs on the contact line');
    });

    test('the sections carry the headings the template names, in order', async () => {
        const { text } = await render(FULL);
        const order = ['Summary', 'Skills', 'Experience', 'Education and Training', 'Courses and Training', 'Certifications'];
        const positions = order.map((h) => at(text, `\n${h}\n`));
        for (let i = 1; i < positions.length; i++) {
            assert.ok(positions[i] > positions[i - 1], `${order[i]} should come after ${order[i - 1]}`);
        }
    });

    test('an entry reads as its heading then its own bullets, not down one column and back up', async () => {
        const { text } = await render(FULL);
        // The React course, its detail, then the next course — an ATS reading
        // top to bottom must not pick up the second course's bullets first.
        const react = at(text, 'Modern React from the Ground Up');
        const reactSkills = at(text, 'Skills applied: React.');
        const js = at(text, 'JavaScript Fundamentals');
        const jsSkills = at(text, 'Skills applied: JavaScript.');
        assert.ok(react < reactSkills && reactSkills < js && js < jsSkills);
    });

    test('a finished course says so, an unfinished one says how far along it is', async () => {
        const { text } = await render(FULL);
        at(text, 'Completed');
        at(text, '62% complete');
        at(text, '13 lessons done');
    });

    test('one lesson done is not written as "1 lessons"', async () => {
        const { text } = await render({
            ...FULL,
            courses: [{ ...FULL.courses[1], lessonsDone: 1 }]
        });
        at(text, '1 lesson done');
        assert.equal(text.includes('1 lessons done'), false);
    });

    test('it says where it came from and when', async () => {
        const { text } = await render(FULL);
        at(text, 'Generated from YATI LMS on 10 Sept 2026.');
    });
});

describe('what the template leaves out', () => {
    test('a student with nothing yet still gets a readable one-page resume', async () => {
        const { buffer, text, pages } = await render({ ...EMPTY, name: 'Ravi Kumar' });
        assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
        assert.equal(pages, 1);
        at(text, 'RAVI KUMAR');
        // No heading is printed over an empty section.
        for (const heading of ['Summary', 'Skills', 'Experience', 'Education and Training', 'Courses and Training', 'Certifications']) {
            assert.equal(text.includes(`\n${heading}\n`), false, `${heading} should be left out when there is nothing to say`);
        }
    });

    test('a missing phone leaves no stray separator on the contact line', async () => {
        const { text } = await render({ ...EMPTY, name: 'Ravi Kumar', email: 'ravi@example.com' });
        const line = text.split('\n').find((l) => l.includes('ravi@example.com'));
        assert.equal(line.trim(), 'ravi@example.com');
    });
});

describe('a resume with a lot in it', () => {
    const many = {
        ...FULL,
        skills: Array.from({ length: 64 }, (_, i) => ({ name: `Skill number ${i + 1}`, sources: ['course'] })),
        courses: Array.from({ length: 12 }, (_, i) => ({
            id: String(i), title: `A fairly long course title number ${i + 1}`,
            percentage: i % 3 === 0 ? 100 : (i * 7) % 100, completed: i % 3 === 0, certificate: null,
            topics: Array.from({ length: 8 }, (_, t) => `Topic ${t + 1} of the course`),
            lessonsDone: 10 + i, skills: ['Python', 'SQL']
        }))
    };

    test('runs onto further pages rather than falling off the first', async () => {
        const { pages, text } = await render(many);
        assert.ok(pages > 1, 'a long resume should paginate');
        at(text, 'A fairly long course title number 12');
        at(text, 'Skill number 64');
    });

    test('the two skill columns are filled down the left one first', async () => {
        const { text } = await render(many);
        // 64 skills over two columns: 1..32 on the left, 33..64 on the right,
        // so a row reads "1" then "33" and the pairing never drifts.
        assert.ok(at(text, 'Skill number 1\n') < at(text, 'Skill number 33'));
        assert.ok(at(text, 'Skill number 33') < at(text, 'Skill number 2\n'));
    });
});
