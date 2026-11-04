/**
 * Notes (asked 2026-11-02: "make notes of what he learnt, so if he wants a topic he can go and see it at once"; chose:
 * a Notes tab, filled by itself with words and meanings, letters, sentences and picture stories): only the lessons
 * finished, in path order, each under its section and unit.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

let app, en, hi;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    en = await makeUser('Ling Notes English'); hi = await makeUser('Ling Notes Hindi');
    assert.equal((await app.call(en.token)('POST', '/level', { level: 'beginner' })).status, 200);
    const h = app.call(hi.token);
    assert.equal((await h('POST', '/language', { language: 'kn' })).status, 200);
    assert.equal((await h('POST', '/course', { course: 'hi', start: 'beginner' })).status, 200);
});
after(async () => { await cleanup([en.user, hi.user], app.server); });

/** Mark lessons finished, as if the student had done them. */
const finish = async (u, seedKeys) => {
    const progress = await svc.progressOf(u.user._id);
    for (const seedKey of seedKeys) {
        const l = await LinguisticLesson.findOne({ seedKey }).lean();
        assert.ok(l, seedKey);
        progress.lessons.push({ lessonId: l._id, module: l.module, level: l.level, status: 'completed', step: 'done', bestScore: 100, completedAt: new Date() });
    }
    await progress.save();
};

describe('notes', () => {
    test('nothing finished, no notes', async () => {
        const r = await app.call(en.token)('GET', '/learnt');
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.levels, []);
    });

    test('English, for a Kannada speaker: the letters, words and sentences of the lessons finished, each in its unit; a lesson started is not there', async () => {
        await finish(en, ['letters-beginner-1', 'vocab-beginner-1', 'translation-beginner-kn-en', 'comic-advanced-1']);
        const progress = await svc.progressOf(en.user._id);
        const started = await LinguisticLesson.findOne({ seedKey: 'grammar-beginner-1' }).lean();
        progress.lessons.push({ lessonId: started._id, module: 'grammar', level: 'beginner', status: 'started', step: 'practice' });
        await progress.save();
        const { body } = await app.call(en.token)('GET', '/learnt');
        const [beginner, advanced] = body.levels;
        assert.deepEqual(body.levels.map((x) => x.level), ['beginner', 'advanced']);
        assert.equal(beginner.units[0].title, 'Letters');
        const a = beginner.units[0].lessons[0].letters[0];
        assert.deepEqual([a.letter, a.word, a.pic, a.sentence], ['A', 'apple', '🍎', 'I eat a red apple.'], 'A for apple');
        const family = beginner.units.find((u) => u.lessons.some((x) => x.words));
        assert.ok(family.lessons.find((x) => x.words).words.every((w) => w.word && w.meaning), 'every word with its meaning');
        const sentences = beginner.units.flatMap((u) => u.lessons).find((x) => x.sentences).sentences;
        assert.ok(sentences.length && sentences.every((x) => x.text && x.meaning), 'every sentence with its meaning');
        assert.ok(sentences.some((x) => x.text === 'mother' && x.meaning === 'ತಾಯಿ'), 'the English learnt, the Kannada its meaning');
        assert.ok(!beginner.units.flatMap((u) => u.lessons).some((x) => x.id === String(started._id)), 'started, not finished: not in the notes');
        assert.deepEqual(advanced.units.flatMap((u) => u.lessons).map((x) => x.story && [x.story.title, x.story.moral]), [['The Shared Well', 'What we share keeps flowing; what we keep to ourselves runs dry.']]);
    });

    test('a Hindi course, for a Kannada speaker: the Hindi learnt, Kannada its meaning', async () => {
        await finish(hi, ['hi:letters-beginner-1', 'hi:vocab-beginner-1', 'hi:translation-beginner-kn-en']);
        const { body } = await app.call(hi.token)('GET', '/learnt');
        const lessons = body.levels[0].units.flatMap((u) => u.lessons);
        const aa = lessons.find((x) => x.letters).letters.find((x) => x.letter === 'आ');
        assert.deepEqual([aa.word, aa.sentence, aa.sentenceEn], ['आम', 'आम पीला और मीठा है।', 'The mango is yellow and sweet.']);
        const words = lessons.find((x) => x.words).words;
        assert.deepEqual([words[0].word, words[0].meaning, words[0].en], ['परिवार', 'ಕುಟುಂಬ', 'family']);
        const mother = lessons.find((x) => x.sentences).sentences.find((x) => x.text === 'माँ');
        assert.deepEqual([mother.meaning, mother.en], ['ತಾಯಿ', 'mother']);
    });
});
