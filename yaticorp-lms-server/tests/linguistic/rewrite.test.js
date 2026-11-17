/**
 * A wrong sentence is never shown as right (2026-11-16, the user's screenshot: "vvbnhgfdsdfyuytresbvgc" with "Correct
 * form: vvbnhgfdsdfyuytresbvgc." — "that sentence is wrong, you give the same as the correct one"): a sentence with a word
 * that is not English is to be written again (no correct form); and "I goes", "they works" are put right.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkWritten } = require('../../src/linguistic/talkCheck');

test('a word that is not English: written again, no correct form', () => {
    const r = checkWritten('vvbnhgfdsdfyuytresbvgc');
    assert.equal(r.rewrite, true);
    assert.ok(r.mistakes.some((m) => /is not an English word/.test(m.why)));
    assert.equal(checkWritten('This is my book.').rewrite, undefined, 'a right sentence is not');
});

test('with I, you, we or they the verb has no -s; "you" as the one spoken to is left alone', () => {
    const fixed = (x) => checkWritten(x).corrected;
    assert.equal(fixed('I goes to school.'), 'I go to school.');
    assert.equal(fixed('They works in Mysuru.'), 'They work in Mysuru.');
    assert.equal(fixed('We always plays cricket.'), 'We always play cricket.');
    assert.equal(fixed('If you needs help, call me.'), 'If you need help, call me.');
    for (const ok of ['He goes to school.', 'Did they go home?', 'I will show you plans.', 'I gave you books.', 'Do you know him?']) assert.equal(fixed(ok), ok, ok);
});
