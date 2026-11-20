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
        const practised = l.items.map((it) => (it.direction === 'en-kn' ? it.source : it.model));
        assert.deepEqual(heard.slice(0, 2).map((q) => q.answer).sort(), practised.sort(), 'first the sentences practised');
        assert.equal(heard.length, 7, 'then the unit\'s other sentences, heard');
        const translated = new Set(qs.slice(0, 3).flatMap((q) => [q.source, q.model]).map(squash));
        assert.ok(heard.every((q) => !translated.has(squash(q.answer))), 'no sentence asked twice');
        assert.equal(new Set(heard.map((q) => squash(q.answer))).size, heard.length, 'each heard once');
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

    test('a Letters lesson of six letters: each asked again, the other way, then its words\' sentences heard — ten', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'letters-beginner-18', course: null }).lean();
        const l = svc.serve(doc, progressIn('kn'));
        const qs = svc.quizOf(l);
        assert.ok(qs.length >= 10, `${qs.length}`);
        assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
    });
});
