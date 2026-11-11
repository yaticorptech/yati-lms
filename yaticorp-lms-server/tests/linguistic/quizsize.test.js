/**
 * A translation lesson's quiz has 4 or 5 questions (2026-11-05, the user: "the practice two, the quiz 4 or 5" — cut
 * in two units, a topic's four quiz sentences had left each unit two): its own quiz sentences, then words of its own
 * unit (on its topic, 2026-11-04) to put the lesson's way — none its practice asks — in every language and course.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const units = require('../../src/linguistic/units');
const { LinguisticLesson } = require('../../src/linguistic/models');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect());

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
const low = (x) => String(x || '').trim().toLowerCase();

describe('a translation lesson\'s quiz', () => {
    test('4 or 5 questions in every topic lesson, both units: the English course for a Kannada and a Hindi speaker, the Hindi and Japanese courses', async () => {
        const runs = [[null, 'kn'], [null, 'hi'], ['hi', 'kn'], ['ja', 'hi']];
        for (const [course, language] of runs) {
            const docs = await LinguisticLesson.find({ module: 'translation', course, review: null, status: 'published' }).lean();
            const topics = docs.filter((d) => d.part || docs.some((x) => x.base === d.seedKey));
            assert.ok(topics.length >= 8, `${course || 'en'}: its topic lessons and their second units (${topics.length})`);
            for (const doc of topics) {
                const l = svc.serve(doc, progressIn(language, course));
                const quiz = svc.quizOf(l);
                const at = `${doc.seedKey} (${course || 'en'} for ${language})`;
                assert.ok(quiz.length >= 4 && quiz.length <= 5, `${at}: ${quiz.length} questions`);
                assert.equal(new Set(quiz.map((q) => q.id)).size, quiz.length, `${at}: each its own id`);
                const practised = new Set((l.items || []).flatMap((x) => [x.source, x.model]).map(low));
                const theirs = new Set((units.unitWordsOf(doc, language)?.words || []).flatMap((w) => [w.word, ...String(w.kannada).split(/\s*[,;/]\s*/)]).map(low));
                for (const q of quiz.filter((x) => x.id.startsWith('word~'))) {
                    assert.ok(q.source && q.model, `${at}: ${q.id} has its word and answer`);
                    assert.ok(!practised.has(low(q.source)) && !practised.has(low(q.model)), `${at}: "${q.source}" is not one its practice asks`);
                    assert.ok(theirs.has(low(q.source)) || theirs.has(low(q.model)), `${at}: "${q.source}" is one of its own unit's words`);
                }
            }
        }
    });

    test('the same words every time; checked like any other question: its answer right, a wrong one wrong; its word tiles', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'translation-advanced-kn-en' }).lean();
        const serve = () => svc.serve(doc, progressIn('kn'));
        const l = serve();
        assert.deepEqual(svc.quizOf(serve()).map((q) => q.id), svc.quizOf(l).map((q) => q.id), 'the same quiz on each request');
        const q = svc.quizOf(l).find((x) => x.id.startsWith('word~'));
        assert.ok(q, 'a word in the quiz');
        // Found by its id, as the page sends it (/quiz/check).
        assert.equal(svc.checkQuizAnswer(l, q.id, q.model)?.correct, true);
        assert.equal(svc.checkQuizAnswer(l, q.id, 'zzz qqq')?.correct, false);
        assert.ok(svc.bankFor(q, l)?.length, 'its word tiles');
    });
});
