/**
 * "I told it I learn Hindi — why does it give me English?" (2026-10-24). What
 * the student learns is the answer; what they already know is the language
 * of the questions — in every language. And each course keeps its own
 * mistakes: practising in the Hindi course never brings back the English
 * course's.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { lessons } = require('../../src/linguistic/content');
const courses = require('../../src/linguistic/courses');
const reviews = require('../../src/linguistic/reviews');
const { unlock, moveCourse } = require('./unlock');

const DEVANAGARI = /[ऀ-ॿ]/, TAMIL = /[஀-௿]/;

describe('each course keeps its own mistakes', () => {
    let app, b, api;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        b = await makeUser('Ling Own Course'); api = app.call(b.token);
        await require('../../src/linguistic/seed').ensureSeeded();
        await api('POST', '/language', { language: 'en' });
    });
    after(async () => { await cleanup([b.user], app.server); });

    test('English mistakes, then the Hindi course: practice has none of them; back in English, they wait', async () => {
        await unlock(b.user, ['vocab-beginner-2']);
        const en = await LinguisticLesson.findOne({ seedKey: 'vocab-beginner-2' }).lean();
        await api('POST', `/lessons/${en._id}/quiz`, { answers: { 'meaning:0': 'zzz', 'antonym:6': 'soon' } });
        const englishOnes = (await api('GET', '/review')).body.mistakes.length;
        assert.ok(englishOnes > 0, 'mistakes in the English course');

        // Begun before 27 Oct (one language only since): the Hindi course as well.
        await moveCourse(b.user, 'hi', 'beginner');
        assert.deepEqual((await api('GET', '/review')).body.mistakes, [], 'none of them while learning Hindi');
        assert.equal((await api('GET', '/')).body.mistakes, 0, 'nor counted on the dashboard (the Practice stop goes to the daily words)');

        await unlock(b.user, ['hi:vocab-beginner-1']);
        const hi = await LinguisticLesson.findOne({ seedKey: 'hi:vocab-beginner-1' }).lean();
        await api('POST', `/lessons/${hi._id}/quiz`, { answers: { 'word:1': 'zzz' } });
        const now = (await api('GET', '/review')).body.mistakes;
        assert.equal(now.length, 1);
        assert.ok(now[0].question.options.every((o) => DEVANAGARI.test(o)), 'a Hindi course question: its answers in Hindi');

        await moveCourse(b.user, 'en');
        assert.equal((await api('GET', '/review')).body.mistakes.length, englishOnes, 'the English ones, back with English');
    });
});

describe('around the answers, the language the student knows', () => {
    const base = (key) => lessons.find((l) => l.seedKey === key);
    test('a Hindi speaker learning Kannada: the lesson\'s notes in Hindi, naming no language they may not read', () => {
        const words = courses.build(courses.stubOf('kn', base('vocab-beginner-1')), 'hi');
        assert.match(words.learn.intro, DEVANAGARI);
        const write = courses.build(courses.stubOf('kn', base('translation-beginner-en-kn')), 'hi');
        assert.ok([write.learn.intro, ...write.learn.points].every((t) => DEVANAGARI.test(t) && !/[A-Za-z]{3}|[ಀ-೿]/.test(t)), write.learn.intro);
    });
    test('a Tamil speaker\'s unit review, in Tamil; an English speaker\'s stays English', () => {
        const stub = reviews.stubs().find((s) => s.seedKey === 'hi:review-unit-beginner-1');
        assert.match(reviews.build(stub, 'ta').learn.intro, TAMIL);
        assert.match(reviews.build(stub, 'en').learn.intro, /^The 4 words of this unit again/);
    });
});
