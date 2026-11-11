/**
 * Fill in the blanks (2026-11-05, Duolingo's "ಬಿಟ್ಟ ಸ್ಥಳ ತುಂಬಿ"; the user chose the translation and Words lessons, with
 * word tiles): every topic's translation lesson, and every Words lesson whose words are in its unit's sentences, has
 * sentences in the language learnt with words missing — in every course and for every student's language — the
 * missing words among its tiles, the sentence whole again with them, its meaning above; checked here, not sent.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { unlockIds } = require('./unlock');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect().catch(() => {}));

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });

describe('fill in the blanks', () => {
    test('in every topic\'s translation and Words lessons, English for a Kannada and a Hindi speaker, the Kannada, Hindi, Japanese and Arabic courses', async () => {
        for (const [course, language] of [[null, 'kn'], [null, 'hi'], ['kn', 'en'], ['hi', 'kn'], ['ja', 'en'], ['ar', 'en']]) {
            const docs = await LinguisticLesson.find({ course, module: { $in: ['translation', 'vocabulary'] }, review: null, status: 'published' }).lean();
            let translations = 0, words = 0;
            for (const doc of docs) {
                const l = svc.serve(doc, progressIn(language, course));
                const at = `${doc.seedKey} (${course || 'en'} for ${language})`;
                if (l.module === 'translation' && !doc.review && (doc.part || docs.some((x) => x.base === doc.seedKey))) assert.ok(l.blanks?.length >= 1, `${at}: its blanks`);
                for (const q of l.blanks || []) {
                    if (l.module === 'translation') translations += 1; else words += 1;
                    const blanks = q.parts.filter((p) => p === null).length;
                    assert.ok(blanks >= 1 && blanks <= 2 && blanks === q.answers.length, `${at} ${q.id}: one or two blanks`);
                    // The sentence whole again, its missing words put back.
                    let k = 0;
                    assert.equal(q.parts.map((p) => (p === null ? q.answers[k++] : p)).join(''), q.model.trim(), `${at} ${q.id}: the sentence whole`);
                    assert.ok(q.answers.every((a) => q.words.includes(a)) && q.words.length > q.answers.length, `${at} ${q.id}: its words among the tiles (${q.words})`);
                    assert.ok(q.hint, `${at} ${q.id}: its meaning above`);
                    // Checked here: right with its words, wrong with others; its answers not sent.
                    assert.equal(svc.judge(l, svc.findQuestion(l, 'blanks', q.id), q.answers.join(' '), 'blanks').correct, true, `${at} ${q.id}: right`);
                    const wrong = q.words.filter((w) => !q.answers.includes(w)).slice(0, q.answers.length);
                    assert.equal(svc.judge(l, q, wrong.join(' '), 'blanks').correct, false, `${at} ${q.id}: wrong`);
                    const shown = svc.publicQuestion(q, 'x');
                    assert.deepEqual(Object.keys(shown).sort(), ['hint', 'id', 'meaningLang', 'partWords', 'parts', 'prompt', 'tileMeanings', 'type', 'words'], `${at} ${q.id}: no answers sent`);
                    assert.equal(shown.tileMeanings.length, q.words.length, `${at} ${q.id}: a meaning (or none) for each tile`);
                }
            }
            assert.ok(translations >= 8, `${course || 'en'} for ${language}: blanks in its translation lessons (${translations})`);
            assert.ok(words >= 4, `${course || 'en'} for ${language}: blanks in its Words lessons (${words})`);
        }
    });

    test('the same blanks each time a lesson is opened', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'translation-beginner-kn-en' }).lean();
        const a = svc.serve(doc, progressIn('kn')).blanks, b = svc.serve(doc, progressIn('kn')).blanks;
        assert.deepEqual(a.map((q) => [q.id, q.parts, q.words]), b.map((q) => [q.id, q.parts, q.words]));
    });
});

// 2026-11-06, the user's screenshot: a Spanish course's blanks answered wrong → "Something went wrong on the server" (a
// mistake could not be saved: 'blanks' was not one of its kinds). Through the routes: wrong, kept as a mistake, asked again
// in the mistakes practice — its tiles read in the language learnt — and put right.
describe('fill in the blanks through the routes', () => {
    let app, es, kn;
    before(async () => {
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        es = await makeUser('Ling Blanks Spanish'); kn = await makeUser('Ling Blanks Words');
        assert.equal((await app.call(es.token)('POST', '/language', { language: 'en' })).status, 200);
        assert.equal((await app.call(es.token)('POST', '/course', { course: 'es', start: 'beginner' })).status, 200);
        assert.equal((await app.call(kn.token)('POST', '/language', { language: 'kn' })).status, 200);
    });
    after(async () => { await cleanup([es.user, kn.user], app.server); });

    for (const [who, seedKey, language, course] of [['a Spanish course', 'es:translation-advanced-kn-en', 'en', 'es'], ['a Words lesson, English for a Kannada speaker', 'vocab-beginner-1', 'kn', null]]) {
        test(`${who}: wrong → a mistake, not an error; asked again; right → fixed`, async () => {
            const u = course ? es : kn, api = app.call(u.token);
            const doc = await LinguisticLesson.findOne({ seedKey }).lean();
            await unlockIds(u.user, [doc._id]);
            const shown = (await api('GET', `/lessons/${doc._id}`)).body;
            const q = shown.blanks?.[0];
            assert.ok(q, `${seedKey}: a blanks question`);
            const answers = svc.serve(doc, progressIn(language, course)).blanks.find((x) => x.id === q.id).answers;
            const wrong = q.words.filter((w) => !answers.includes(w)).slice(0, answers.length).join(' ');
            const r = await api('POST', `/lessons/${doc._id}/check`, { section: 'blanks', id: q.id, given: wrong });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.correct, false);
            const review = (await api('GET', '/review')).body;
            const m = review.mistakes.find((x) => x.question.id === q.id);
            assert.ok(m, 'kept as a mistake');
            assert.equal(m.question.type, 'blanks');
            assert.deepEqual(m.question.parts, q.parts);
            assert.equal(m.question.target, course || undefined, 'its tiles read in the language learnt');
            const again = await api('POST', `/review/${m.id}`, { given: answers.join(' ') });
            assert.equal(again.status, 200, JSON.stringify(again.body));
            assert.deepEqual([again.body.correct, again.body.resolved], [true, true], 'right: fixed');
        });
    }
});
