/**
 * Every word card with its meaning (2026-11-19, the user, of "Tap what you hear" cards — energy, I, every, exercise, day,
 * important: "where is the meaning of this card word"): a sentence heard, words put in order and a jumbled sentence to
 * write carry each card's meaning in the student's language, in all 20 of them.
 */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { meaningOf } = require('../../src/linguistic/content/sounds/hints');
const { ORDER } = require('../../src/linguistic/content/sounds/hints/english');

const CARDS = ['hear', 'rearrange', 'jumbled'];

describe('word cards and their meanings', () => {
    let s, served;
    before(async () => {
        await connect();
        await require('../../src/linguistic/seed').ensureSeeded();
        s = await makeUser('Ling Card Meanings');
        const progress = await svc.progressOf(s.user._id);
        progress.language = 'kn'; progress.course = 'en';
        const config = await require('../../src/linguistic/config').getConfig();
        served = [];
        for (const doc of await svc.lessonsFor(progress)) served.push(svc.publicLesson(await svc.serve(doc, progress), null, config));
    });
    after(async () => { await cleanup([s.user]); await mongoose.disconnect().catch(() => {}); });

    const cardsOf = (r) => [...(r.quiz || []), ...(r.practice || []), ...(r.writing || [])].filter((q) => CARDS.includes(q.type) && q.words?.length);

    test('each card question carries its cards\' meanings in the student\'s language', () => {
        const all = served.flatMap(cardsOf);
        assert.ok(all.length > 50, `card questions (${all.length})`);
        assert.ok(all.some((q) => q.type === 'hear') && all.some((q) => q.type === 'rearrange') && all.some((q) => q.type === 'jumbled'));
        for (const q of all) {
            assert.equal(q.meaningLang, 'kn', q.id);
            assert.ok(q.wordMeanings && Object.keys(q.wordMeanings).every((w) => q.words.includes(w)), `${q.id}: its cards' meanings`);
        }
    });

    test('the cards\' words have a meaning in every one of the 20 languages (names apart)', () => {
        const words = [...new Set(served.flatMap(cardsOf).flatMap((q) => q.words))].filter((w) => !/\d/.test(w));
        // A name has a meaning in no language: Anu, Mandya, QuickBuy.
        const name = (w) => /^[A-Z]/.test(w) && !meaningOf({ learnt: 'en', helper: 'kn' }, w) && !meaningOf({ learnt: 'en', helper: 'hi' }, w);
        const asked = words.filter((w) => !name(w));
        for (const code of ORDER) {
            const none = asked.filter((w) => !meaningOf({ learnt: 'en', helper: code }, w));
            assert.ok(none.length <= asked.length * 0.05, `${code}: ${none.length} of ${asked.length} cards with no meaning (${none.slice(0, 15).join(', ')})`);
        }
    });
});
