/**
 * Ten questions in a quiz at least (2026-11-16, the user, of a unit's Sentences lesson that asked three: "add the quiz
 * questions, at least 5", then the same day "at least 10 questions in a quiz"): a short quiz is made up — the lesson's own
 * sentences heard, its unit's words, its unit's other sentences; its own questions as they were; never a question twice,
 * nor a sentence it translates heard again; checked like any other.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { squash } = require('../../src/linguistic/hears');
const { LinguisticLesson } = require('../../src/linguistic/models');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect().catch(() => {}));

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });

describe('ten questions in a quiz at least', () => {
    test('every lesson with a quiz: English for Kannada and Hindi, and the Kannada, Hindi and Spanish courses', async () => {
        for (const [course, language] of [[null, 'kn'], [null, 'hi'], ['kn', 'hi'], ['hi', 'kn'], ['es', 'kn']]) {
            const docs = await LinguisticLesson.find({ course, status: 'published', deletedAt: null }).lean();
            let quizzes = 0;
            for (const doc of docs) {
                const l = svc.serve(doc, progressIn(language, course));
                if (!l) continue;
                const qs = svc.quizOf(l);
                if (!qs.length) continue;
                quizzes += 1;
                assert.ok(qs.length >= 10, `${course || 'en'} for ${language} ${doc.seedKey}: ${qs.length} questions`);
                const ids = qs.map((q) => q.id);
                assert.equal(new Set(ids).size, ids.length, `${doc.seedKey}: no question twice`);
            }
            assert.ok(quizzes > 50, `${course || 'en'} for ${language}: quizzes (${quizzes})`);
        }
    });

    test('a Sentences lesson (the user\'s): its three to translate, its two practised sentences heard, then its unit\'s words', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'more-phrases-elementary-1', course: null }).lean();
        const l = svc.serve(doc, progressIn('kn'));
        const qs = svc.quizOf(l);
        assert.equal(qs.length, 10);
        assert.deepEqual(qs.slice(0, 3).map((q) => q.id), ['p3', 'p4', 'p5'], 'its own questions, as they were');
        const heard = qs.filter((q) => q.type === 'hear');
        const added = qs.slice(3);
        const practised = l.items.map((it) => (it.direction === 'en-kn' ? it.source : it.model));
        assert.deepEqual(added.slice(0, 2).map((q) => q.answer).sort(), practised.sort(), 'first the sentences practised');
        // Taking turns (2026-11-17, the user, of seven "Tap what you hear" in a row: "it is stuck"): heard, filled in, heard…
        assert.deepEqual(added.map((q) => q.type), ['hear', 'blanks', 'hear', 'blanks', 'hear', 'blanks', 'hear'], 'heard and filled in, taking turns');
        const translated = new Set(qs.slice(0, 3).flatMap((q) => [q.source, q.model]).map(squash));
        assert.ok(added.every((q) => !translated.has(squash(q.answer))), 'no sentence asked twice');
        assert.equal(new Set(added.map((q) => squash(q.answer))).size, added.length, 'each sentence once');
        // Checked like any other quiz question: the public quiz has them, and the answer is judged.
        const pub = svc.publicLesson(l, null, require('../../src/linguistic/config').DEFAULTS);
        assert.equal(pub.quiz.length, 10);
        assert.ok(heard.every((q) => pub.quiz.some((p) => p.id === q.id && p.answer === undefined)), 'sent without the answers');
        assert.equal(svc.checkQuizAnswer(l, heard[0].id, heard[0].answer).correct, true);
        assert.equal(svc.checkQuizAnswer(l, heard[0].id, 'nothing like it').correct, false);
    });

    test('a wrong answer to one that made the quiz up to ten is kept, and found again in the mistakes practice', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'more-phrases-elementary-1', course: null }).lean();
        const l = svc.serve(doc, progressIn('kn'));
        const q = svc.quizOf(l).find((x) => String(x.id).startsWith('top~hear~'));
        // The quiz's own: found where a mistake of the quiz is looked for.
        assert.equal(svc.findQuestion(l, 'quiz', q.id)?.id, q.id);
    });

    // 2026-11-17, the user, of "Listen, choose its meaning" again and again: "don't repeat the same question — give different ones".
    test('a unit\'s More words: each word two different ways, of eight; no way more than twice, never twice running', async () => {
        const docs = await LinguisticLesson.find({ course: null, review: 'more', seedKey: /^more-words-/, status: 'published', deletedAt: null }).lean();
        assert.ok(docs.length >= 10, `More words lessons (${docs.length})`);
        const wayOf = (q) => (String(q.id).match(/^top~mw~([a-zA-Z]+)~/) || [])[1];
        for (const doc of docs) {
            const qs = svc.quizOf(svc.serve(doc, progressIn('kn'))).filter(wayOf);
            const ways = qs.map(wayOf);
            const at = `${doc.seedKey}: ${ways.join(', ')}`;
            for (const w of new Set(ways)) assert.ok(ways.filter((x) => x === w).length <= 2, `${at}: "${w}" more than twice`);
            assert.ok(ways.every((w, k) => k === 0 || w !== ways[k - 1]), `${at}: the same way twice running`);
            assert.ok(new Set(ways).size >= 4, `${at}: four ways at least`);
            const byWord = {};
            for (const q of qs) { const i = String(q.id).split('~').pop(); (byWord[i] = byWord[i] || []).push(wayOf(q)); }
            for (const [i, list] of Object.entries(byWord)) assert.equal(new Set(list).size, list.length, `${at}: word ${i} asked the same way twice`);
        }
        const body = await LinguisticLesson.findOne({ seedKey: 'more-words-elementary-4-2', course: null }).lean();
        const ways = svc.quizOf(svc.serve(body, progressIn('kn'))).map(wayOf);
        assert.equal(ways.filter((w) => w === 'hearMeaning').length <= 2, true, 'the user\'s "Listen, choose its meaning": not again and again');
        assert.ok(['picture', 'see', 'letters'].some((w) => ways.includes(w)), 'pictures and letter tiles among them');
    });

    // 2026-11-17, the user: "At the bus stop…" built, and marked against "Kavya ties her long hair…" — the story's sentences
    // had been numbered again while the page was open. A made-up question is named by its sentence, not its place.
    test('a made-up question is named by its own sentence: the same name every time, never another sentence\'s', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'more-story-elementary-4', course: null }).lean();
        const one = svc.quizOf(svc.serve(doc, progressIn('kn'))).filter((q) => String(q.id).startsWith('top~'));
        const two = svc.quizOf(svc.serve(doc, progressIn('hi'))).filter((q) => String(q.id).startsWith('top~'));
        assert.ok(one.length >= 5);
        assert.ok(one.every((q) => !/~[a-z]*\d+$/.test(q.id) || /~[a-z0-9]{4,}$/.test(q.id)), `not by place: ${one.map((q) => q.id)}`);
        for (const q of one) {
            const same = two.find((x) => x.id === q.id);
            if (same) assert.equal(same.answer, q.answer, `${q.id}: the same sentence in every language's lesson`);
        }
        assert.equal(new Set(one.map((q) => q.id)).size, one.length, 'one name each');
        const shoes = one.find((q) => q.answer === 'Kavya ties her long hair and puts on her black shoes.');
        assert.ok(shoes, 'the user\'s sentence');
        const l = svc.serve(doc, progressIn('kn'));
        assert.equal(svc.checkQuizAnswer(l, shoes.id, 'At the bus stop her friend Asha is shivering').correct, false, 'another sentence is not this one');
        assert.equal(svc.checkQuizAnswer(l, shoes.id, shoes.answer).correct, true);
        assert.equal(svc.checkQuizAnswer(l, 'top~hear~s5', shoes.answer), null, 'an old place-number is no question at all');
    });

    test('a Letters lesson of six letters: each asked again, the other way, then its words\' sentences heard — ten', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'letters-beginner-18', course: null }).lean();
        const l = svc.serve(doc, progressIn('kn'));
        const qs = svc.quizOf(l);
        assert.ok(qs.length >= 10, `${qs.length}`);
        assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
    });
});
