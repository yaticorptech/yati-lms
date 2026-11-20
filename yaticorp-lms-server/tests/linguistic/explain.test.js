/**
 * The English course's explanations in the student's own language (2026-11-18, the user: "the user is learning
 * English — if they do not know English, how will they find what this is?"): content/explain/<code>.js.
 */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect } = require('../helpers');
const mongoose = require('mongoose');
const svc = require('../../src/linguistic/service');
const explain = require('../../src/linguistic/explain');
const { LinguisticLesson } = require('../../src/linguistic/models');

const SCRIPT = { kn: /[ಀ-೿]/, hi: /[ऀ-ॿ]/, ta: /[஀-௿]/, te: /[ఀ-౿]/, ml: /[ഀ-ൿ]/, mr: /[ऀ-ॿ]/, bn: /[ঀ-৿]/, gu: /[઀-૿]/, pa: /[਀-੿]/, or: /[଀-୿]/,
    ur: /[؀-ۿ]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/ };
const progressIn = (language) => ({ language, course: null, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });

describe('explanations in the student\'s language', () => {
    let tenses;
    before(async () => { await connect(); tenses = await LinguisticLesson.findOne({ seedKey: 'grammar-intermediate-1', course: null }).lean(); });
    after(async () => { await mongoose.disconnect().catch(() => {}); });

    test('the user\'s picture: "Tenses: present, past and future" for a Kannada speaker — the title, the intro and the points in Kannada, the English examples kept', { skip: !explain.codes().includes('kn') }, () => {
        const l = svc.serve(tenses, progressIn('kn'));
        assert.match(l.title, SCRIPT.kn); assert.match(l.learn.intro, SCRIPT.kn);
        assert.ok(l.learn.points.every((p) => SCRIPT.kn.test(p)), 'every point');
        assert.ok(l.learn.points.some((p) => p.includes('"She walks to college every day."')), 'the English example as it was');
        assert.deepEqual(l.learn.examples, ['The sun rises in the east.', 'Look! It is raining.', 'I met my teacher yesterday.', 'We will leave at six.'], 'the examples: English, to learn');
        assert.ok([...l.practice, ...l.quiz].filter((q) => q.explanation).every((q) => SCRIPT.kn.test(q.explanation)), 'the explanation after each answer');
        assert.equal(svc.serve(tenses, progressIn('en')).learn.intro.startsWith('A tense shows'), true, 'in English for an English speaker');
    });

    test('every language with its file: the grammar lessons explained in it', () => {
        for (const code of explain.codes()) {
            const l = svc.serve(tenses, progressIn(code));
            if (SCRIPT[code]) assert.match(l.learn.intro, SCRIPT[code], `${code}: the intro`);
            else assert.notEqual(l.learn.intro, tenses.learn.intro, `${code}: the intro`);
        }
    });
});
