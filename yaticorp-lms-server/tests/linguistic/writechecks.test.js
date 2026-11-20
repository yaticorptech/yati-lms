/**
 * The writing tasks' checklists tick themselves (2026-11-07, the user, of "I said what time I wake up" under a writing
 * box: "why did you put this?"; chose: each point ticks itself as they write, in the student's language).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { lessons } = require('../../src/linguistic/content');
const { passes } = require('../../src/linguistic/speakChecks');
const { CHECKS, checksForTask } = require('../../src/linguistic/writeChecks');
const { POINTS, ORDER, pointIn } = require('../../src/linguistic/content/writeChecklist');
const svc = require('../../src/linguistic/service');

const tasks = lessons.flatMap((l) => (l.writing || []).filter((t) => t.checklist?.length).map((t) => ({ key: `${l.seedKey} ${t.id}`, t })));

test('every point of every writing checklist has its check, and its words in all 20 languages', () => {
    assert.ok(tasks.length >= 12, `tasks (${tasks.length})`);
    for (const { key, t } of tasks) for (const p of t.checklist) {
        assert.ok(CHECKS[p], `${key}: a check for "${p}"`);
        assert.equal(POINTS[p]?.length, ORDER.length, `${key}: "${p}" in every language`);
        assert.ok(POINTS[p].every((x) => x && x !== p), `${key}: "${p}" written in each`);
    }
});

test('each task\'s model answer ticks every point; a word or two ticks none', () => {
    for (const { key, t } of tasks) {
        const checks = checksForTask(t);
        checks.forEach((c, i) => assert.equal(passes(c, t.model), true, `${key}: the model ticks "${t.checklist[i]}"`));
        checks.forEach((c, i) => assert.equal(passes(c, 'hello'), false, `${key}: "hello" does not tick "${t.checklist[i]}"`));
    }
});

test('the rules: a full stop, a capital, a subject line, the verb after should, -er or more', () => {
    const T = (p, x) => passes(CHECKS[p], x);
    assert.deepEqual([T('Each sentence ends with a full stop', 'I wake up. I eat'), T('Each sentence ends with a full stop', 'I wake up. I eat.')], [false, true]);
    assert.deepEqual([T('Each sentence starts with a capital letter', 'I wake up. then I eat.'), T('Each sentence starts with a capital letter', 'I wake up. Then I eat.')], [false, true]);
    assert.deepEqual([T('I wrote a clear subject line', 'Dear Sir,'), T('I wrote a clear subject line', 'Subject: Leave request\nDear Sir,')], [false, true]);
    assert.deepEqual(['You should drink water.', 'You should drinks water.', 'You should to drink water.'].map((x) => T('I used the plain verb after should', x)), [true, false, false]);
    assert.deepEqual([T('I used the right form: -er or more, -est or most', 'Cricket is more better than kabaddi.'), T('I used the right form: -er or more, -est or most', 'Cricket is better than kabaddi.')], [false, true]);
    assert.deepEqual([T('I said what time I wake up', 'I wake up early.'), T('I said what time I wake up', 'I wake up at 6.')], [false, true]);
});

test('sent with the task: its points in the student\'s language, in English, and their checks', () => {
    const l = { ...lessons.find((x) => x.seedKey === 'reading-beginner-4'), _id: 'x', language: 'kn' };
    const w = svc.publicLesson(l, null, { passingScore: { beginner: 60, intermediate: 60, advanced: 60 } }).writing.find((t) => t.checklistEn?.length);
    assert.equal(w.checklist[0], pointIn(w.checklistEn[0], 'kn'));
    assert.equal(w.checklist[0], 'ನಾನು ಎಷ್ಟು ಗಂಟೆಗೆ ಏಳುತ್ತೇನೆ ಎಂದು ಬರೆದೆ');
    assert.deepEqual(w.checks, checksForTask({ checklistEn: w.checklistEn }));
});

test('the student\'s page runs the same rules (parts/speakTicks.js, kept alike)', () => {
    const own = (file) => {
        const s = fs.readFileSync(file, 'utf8');
        return s.slice(s.indexOf("// Writing's own checks"), s.indexOf('/** Each point')).replace(/\s+/g, ' ');
    };
    const server = own(path.join(__dirname, '../../src/linguistic/speakChecks.js'));
    const page = own(path.join(__dirname, '../../../yaticorp-lms-student/src/linguistic/parts/speakTicks.js'));
    assert.ok(server.length > 500);
    assert.equal(page.replace(/export const writeTicksOf[^;]*;/, '').trim(), server.trim());
});

// A letter's layout is not a sentence (2026-11-18, the user's letter that could not go on: "To:", "The Principal,",
// "[College Name]," were each told to end with a full stop).
describe('a letter or an email: its sentences checked, not its layout', () => {
    const svc = require('../../src/linguistic/service');
    test('the address, date, subject, greeting, closing and name are left out; a real slip is still found', () => {
        const letter = 'To:\nThe Principal,\n[College Name],\n[Place].\n\nDate: 18 November 2026\n\nSubject: Leave for two days\n\nRespected Sir,\n\nI am a student of first year BCom. I was ill yesterday. Please give me leave for two days.\n\nThank you.\n\nYours faithfully,\nRavi Kumar';
        const g = svc.grammarOf(letter, 'letter');
        assert.deepEqual([g.clean, g.total], [3, 3], g.sentences.map((x) => x.text).join(' | '));
        const email = svc.grammarOf('To: hr@company.com\nSubject: The trainee post\n\nDear Madam,\n\ni have a BCom degree.\n\nRegards,\nAsha', 'email');
        assert.deepEqual([email.clean, email.total], [0, 1], 'its one sentence, put right');
        assert.equal(svc.grammarOf('My name is Ravi\nI like cricket.', 'paragraph').total, 2, 'a paragraph: every line a sentence, as before');
    });
});
