/**
 * Fill in the blank with choices (2026-11-06, the user: "give the options here — typing is hard, in all languages"):
 * every grammar fill-in question is sent with two to four choices, its answer among them, the same each time; the ones
 * the question names, else the small words it is one of, else its verb's forms — real words, nothing made up.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../../src/linguistic/service');
const { fillChoices } = require('../../src/linguistic/fillChoices');

const lessons = [...require('../../src/linguistic/content/grammar'), ...require('../../src/linguistic/content/topics').lessons.filter((l) => l.module === 'grammar')];

test('every fill-in question has its choices, its answer among them', () => {
    let n = 0;
    for (const l of lessons) {
        const all = [...(l.practice || []), ...(l.quiz || [])];
        const answers = all.filter((q) => q.type === 'fill').map((q) => q.answer);
        for (const q of all.filter((x) => x.type === 'fill')) {
            n += 1;
            const shown = svc.publicQuestion(q, 'x', answers);
            assert.ok(shown.options?.length >= 2 && shown.options.length <= 4, `${l.seedKey} ${q.id}: 2 to 4 choices (${shown.options})`);
            assert.ok(shown.options.includes(q.answer), `${l.seedKey} ${q.id}: its answer among them`);
            assert.equal(new Set(shown.options.map((o) => o.toLowerCase())).size, shown.options.length, `${l.seedKey} ${q.id}: no choice twice`);
            // Real words only: no "has goed", "has sleeped" (a form tried and dropped the same day).
            assert.ok(shown.options.every((o) => !/^has \w+ed$/.test(o) || answers.includes(o)), `${l.seedKey} ${q.id}: no made-up form (${shown.options})`);
            assert.deepEqual(svc.publicQuestion(q, 'x', answers).options, shown.options, 'the same each time');
            assert.equal(shown.answer, undefined, 'the answer not sent apart from the choices');
        }
    }
    assert.ok(n >= 40, `fill-in questions (${n})`);
});

test('the user\'s question, and the kinds of choices', () => {
    assert.deepEqual([...fillChoices({ id: 'p1', type: 'fill', prompt: '___ is your name? (What / Where)', answer: 'What' })].sort(), ['What', 'Where']);
    assert.deepEqual([...fillChoices({ id: 'p1', type: 'fill', prompt: 'I saw ___ owl in the tree.', answer: 'an' })].sort(), ['a', 'an', 'the']);
    assert.deepEqual([...fillChoices({ id: 'p1', type: 'fill', prompt: 'She ___ (go) to the gym every morning.', answer: 'goes' })].sort(), ['go', 'goes', 'going', 'is going']);
});
