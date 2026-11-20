/**
 * Taught before it is asked (2026-11-16, the user, of "Write a professional email to an HR manager…": "first you should
 * teach the user before asking this kind of question… then related questions so they can fill it"): before an email, a
 * letter or a paragraph, how it is written; then questions on the task, checked here; then the task.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const guide = require('../../src/linguistic/writeGuide');
const READING = require('../../src/linguistic/content/reading');
const { unlockIds } = require('./unlock');

const tasks = [];
const walk = (o) => { if (!o || typeof o !== 'object') return; if (guide.TYPES.includes(o.type) && o.prompt) { tasks.push(o); return; } Object.values(o).forEach(walk); };
walk(READING); walk(require('../../src/linguistic/content/more'));
for (const f of require('fs').readdirSync(require('path').join(__dirname, '../../src/linguistic/content/topics'))) walk(require(`../../src/linguistic/content/topics/${f}`));
const HR = tasks.find((t) => /HR manager/.test(t.prompt));

describe('how to write it, then questions on the task', () => {
    test('a guide for an email, a letter and a paragraph, in Kannada and Hindi; its example never a task\'s own answer', () => {
        for (const type of guide.TYPES) {
            for (const lang of ['kn', 'hi']) {
                const g = guide.guideOf(type, lang);
                assert.ok(g.parts.length >= 4 && g.parts.every((p) => p.name && p.say && p.example), `${type} ${lang}: its parts`);
                assert.notEqual(g.title, guide.guideOf(type, 'en').title, `${type} ${lang}: in that language`);
                assert.ok(g.parts.every((p) => p.say !== guide.guideOf(type, 'en').parts.find((x) => x.example === p.example).say), `${type} ${lang}: each part explained in it`);
            }
            for (const t of tasks) if (t.model) assert.notEqual(guide.guideOf(t.type, 'en', t).example, t.model);
        }
        assert.equal(guide.guideOf('sentence', 'kn'), null, 'not for a sentence');
    });

    test('the HR email (the user\'s screen): its subject line, greeting, polite ask and ending, from its own model', () => {
        const qs = guide.asksFor(HR, 'kn');
        assert.deepEqual(qs.map((q) => q.answer), ['Subject: Follow-up on internship application – Data Analyst Intern', 'Dear Ms Rao,', 'I am writing to ask whether there is any update on my application.', 'Kind regards,']);
        for (const q of qs) {
            assert.equal(q.options.length, 3, q.id);
            assert.equal(new Set(q.options).size, 3, `${q.id}: three different`);
            assert.ok(/[ಀ-೿]/.test(q.prompt) && /[ಀ-೿]/.test(q.explanation) && /[ಀ-೿]/.test(q.how), `${q.id}: asked, how to choose, and why, in Kannada`);
        }
        const pub = guide.publicAsks(HR, 'kn', 'seed');
        assert.ok(pub.every((q) => q.answer === undefined && q.explanation === undefined && q.optionsSay === 'en-IN'), 'not which is right; the choices heard in English');
    });

    test('every email, letter and paragraph: two to four questions, none twice, none with its answer among the wrong ones', () => {
        for (const t of tasks) {
            const qs = guide.asksFor(t, 'hi');
            assert.ok(qs.length >= 2 && qs.length <= 4, `${t.prompt}: ${qs.length}`);
            assert.equal(new Set(qs.map((q) => q.answer)).size, qs.length, `${t.prompt}: each a different answer`);
            for (const q of qs) assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${t.prompt} ${q.id}`);
        }
    });

    // 2026-11-16, the user's "Which is the best first sentence?" for the money paragraph: "the answer is the first one" — the
    // example's "My grandmother is the person I admire most." was a wrong choice, though a good first sentence.
    test('no wrong choice is a good line on another subject: none from the examples; each question shows its task', () => {
        const lines = Object.values(guide.VARIANTS).flat().flatMap((v) => [...v.lines.flatMap((l) => l.split('\n')), ...v.example.split(/\n|(?<=\.) /)]).map((l) => l.trim()).filter(Boolean);
        for (const t of tasks) {
            for (const q of guide.asksFor(t, 'kn')) for (const o of q.options.filter((x) => x !== q.answer)) assert.ok(!lines.includes(o), `${t.prompt} ${q.id}: "${o}" is the example's`);
            for (const q of guide.publicAsks(t, 'kn', 's')) assert.deepEqual(q.task, { label: 'ನಿಮ್ಮ ಬರವಣಿಗೆ', text: t.prompt }, `${q.id}: its task`);
        }
        const money = tasks.find((t) => /manage money/.test(t.prompt));
        assert.ok(money, 'the money paragraph');
        const first = guide.asksFor(money, 'kn').find((q) => q.id.endsWith('~first'));
        assert.equal(first.answer, 'Many young people get their first salary without knowing how to manage it.');
        assert.ok(!first.options.includes('My grandmother is the person I admire most.'));
        // Asked plainly, with how to choose (2026-11-16, the user: "I can't understand this question").
        assert.deepEqual([first.prompt, first.how], ['ಯಾವ ವಾಕ್ಯದಿಂದ ಶುರು ಮಾಡುವಿರಿ?', 'ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ಹೇಳುವ ವಾಕ್ಯವನ್ನು ಆರಿಸಿ.']);
        assert.deepEqual(first.options.slice(1), ['That is all for today.', 'Thank you for reading.'], 'the wrong ones: goodbyes, not a way to start');
    });
});

// 2026-11-19, the user, of "How to write a paragraph" with the grandmother in every unit: "don't give the same thing again
// and again — make it change".
describe('each unit its own example', () => {
    const one = [...new Map(tasks.map((t) => [t.prompt, t])).values()];
    test('every email, letter and paragraph task: an example of its own, never another unit\'s', () => {
        const examples = one.map((t) => guide.guideOf(t.type, 'kn', t).example);
        assert.ok(one.filter((t) => t.type === 'paragraph').length >= 9 && one.filter((t) => t.type === 'email').length >= 4);
        assert.equal(new Set(examples).size, one.length, 'all different');
        for (const t of one) {
            const g = guide.guideOf(t.type, 'kn', t);
            assert.ok(g.parts.every((p) => p.name && p.say && p.example), `${t.prompt}: its parts`);
            if (t.model) for (const p of g.parts.filter((x) => !/^(Respected|Dear) (Sir|Madam),$/.test(x.example))) assert.ok(!t.model.includes(p.example), `${t.prompt}: "${p.example}" is its answer`);
        }
        assert.match(guide.guideOf('paragraph', 'kn', one.find((t) => /morning routine/.test(t.prompt))).example, /^My evenings/);
        assert.doesNotMatch(guide.guideOf('paragraph', 'kn', one.find((t) => /manage money/.test(t.prompt))).example, /grandmother/);
    });

    test('a paragraph\'s joining words: the guide teaches them, the question after it asks them', () => {
        const paras = one.filter((t) => t.type === 'paragraph');
        for (const t of paras) {
            const g = guide.guideOf('paragraph', 'kn', t);
            const q = guide.asksFor(t, 'kn').find((x) => x.id.endsWith('~order'));
            assert.ok(g.parts[2].say.startsWith(q.answer), `${t.prompt}: ${q.answer} — ${g.parts[2].say}`);
            assert.ok(q.explanation.includes(q.answer) && /[ಀ-೿]/.test(q.explanation), `${t.prompt}: why`);
        }
        assert.ok(new Set(paras.map((t) => guide.asksFor(t, 'kn').find((x) => x.id.endsWith('~order')).answer)).size >= 6, 'not the same words each time');
    });

    test('a task an administrator writes gets one of them too', () => {
        const g = guide.guideOf('paragraph', 'en', { type: 'paragraph', prompt: 'Write about your favourite festival.' });
        assert.ok(guide.VARIANTS.paragraph.some((v) => v.example === g.example));
    });
});

describe('through the routes', () => {
    let app, u;
    before(async () => {
        await connect(); await require('../../src/linguistic/seed').ensureSeeded();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        u = await makeUser('Ling Write Guide');
        assert.equal((await app.call(u.token)('POST', '/language', { language: 'kn' })).status, 200);
    });
    after(async () => { await cleanup([u.user], app.server); await mongoose.disconnect().catch(() => {}); });

    test('the lesson sends the guide and the questions; one checked: right, wrong (not kept as a mistake)', async () => {
        const api = app.call(u.token);
        // Written in Advanced's Writing track (its article's tasks, reviews.js).
        const doc = await LinguisticLesson.findOne({ seedKey: 'review-write-advanced-2', status: 'published', deletedAt: null }).lean();
        assert.ok(doc, 'the HR email\'s lesson');
        await unlockIds(u.user, [doc._id]);
        const l = (await api('GET', `/lessons/${doc._id}`)).body;
        assert.equal(l.writeGuides?.email?.title, 'ಇಮೇಲ್ ಬರೆಯುವುದು ಹೇಗೆ', 'how to write an email, in Kannada');
        const task = l.writing.find((t) => t.type === 'email');
        assert.equal(task.asks.length, 4);
        const q = task.asks.find((x) => x.id.endsWith('~greeting'));
        const right = await api('POST', `/lessons/${doc._id}/check`, { section: 'writeguide', id: q.id, given: 'Dear Ms Rao,' });
        assert.equal(right.status, 200, JSON.stringify(right.body));
        assert.equal(right.body.correct, true);
        assert.match(right.body.explanation, /[ಀ-೿]/, 'why, in Kannada');
        const wrong = await api('POST', `/lessons/${doc._id}/check`, { section: 'writeguide', id: q.id, given: 'Hey!!' });
        assert.deepEqual([wrong.body.correct, wrong.body.answer], [false, 'Dear Ms Rao,']);
        const kept = (await api('GET', '/review')).body.mistakes?.find((x) => x.question?.id === q.id);
        assert.equal(kept, undefined, 'not in the mistakes');
        assert.equal((await api('POST', `/lessons/${doc._id}/check`, { section: 'writeguide', id: 'nope~greeting', given: 'x' })).status, 400);
    });
});
