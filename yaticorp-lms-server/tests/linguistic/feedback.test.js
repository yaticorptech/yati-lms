/**
 * The feedback on a student's English in their own language (asked
 * 2026-10-27: "fix this in all languages, in every place"): every message the
 * checkers can write is in the list, every language has every message, and
 * the student's own words come back in place.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { KEYS, CODES, PACKS, feedbackIn, localizeFeedback } = require('../../src/linguistic/content/feedback');

const SRC = path.join(__dirname, '../../src/linguistic');
const holes = (s) => [...s.matchAll(/\{(\d)\}/g)].map((m) => m[1]).sort();

/** Every message written in the checkers' code, its ${…} parts filled with a word. */
const written = () => {
    const out = new Set();
    for (const file of ['talkCheck.js', 'writingCheck.js']) {
        const src = fs.readFileSync(path.join(SRC, file), 'utf8');
        const calls = /(?:why: |text: |(?:tip|good)\(|(?:good|tips)\.push\()(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')/g;
        for (const [, lit] of src.matchAll(calls)) {
            let s = lit.slice(1, -1).replace(/\\'/g, '\'');
            if (lit[0] === '`') s = s.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, 'word');
            out.add(s);
        }
    }
    return [...out];
};

describe('the feedback on English, in the student\'s language', () => {
    test('every message the checkers can write is in the list', () => {
        const found = written();
        assert.ok(found.length > 80, `${found.length} messages found in the code`);
        const missing = found.filter((m) => feedbackIn('hi', m) === m);
        assert.deepEqual(missing, [], 'each of these would stay English');
    });

    test('every language has every message, with the same places for the student\'s words', () => {
        assert.equal(CODES.length, 20);
        for (const code of CODES) {
            const pack = PACKS[code];
            assert.deepEqual(Object.keys(pack).sort(), Object.keys(KEYS).sort(), `${code}: the same messages`);
            for (const [id, en] of Object.entries(KEYS)) {
                assert.ok(pack[id].trim(), `${code}.${id} is written`);
                assert.notEqual(pack[id], en, `${code}.${id} is translated`);
                // {2} of wMore is only the English plural "s".
                const need = holes(en).filter((n) => !(id === 'wMore' && n === '2'));
                assert.deepEqual(holes(pack[id]).filter((n) => need.includes(n)), need, `${code}.${id} keeps ${need.join(', ')}`);
                assert.ok(holes(pack[id]).every((n) => holes(en).includes(n)), `${code}.${id} has no place English has not`);
            }
        }
    });

    test('the student\'s own words come back in place; English, or a message not in the list, stays as it is', () => {
        assert.equal(feedbackIn('kn', 'Spelling: "breakfas" is "breakfast".'), 'ಕಾಗುಣಿತ: "breakfas" → "breakfast".');
        assert.equal(feedbackIn('hi', 'Write a little more: you have 3 words, and this task needs at least 30.'), 'थोड़ा और लिखें: आपने 3 शब्द लिखे हैं, इस काम के लिए कम से कम 30 चाहिए।');
        assert.equal(feedbackIn('ja', '"cvbn" is not an English word. Check the spelling, or use another word.'), '"cvbn" は英語の単語ではありません。スペルを確かめるか、別の語を使ってください。');
        assert.equal(feedbackIn('en', 'One full stop is enough.'), 'One full stop is enough.');
        assert.equal(feedbackIn('kn', 'Something new.'), 'Something new.');
        const out = localizeFeedback('ta', { findings: [{ kind: 'good', text: 'Good length: 31 words.' }], sentences: [{ text: 'a', corrected: 'A.', mistakes: [{ wrong: null, right: '.', why: 'One full stop is enough.' }] }] });
        assert.deepEqual([out.findings[0].text, out.sentences[0].mistakes[0].why, out.sentences[0].corrected], ['சரியான நீளம்: 31 சொற்கள்.', 'ஒரு முற்றுப்புள்ளி போதும்.', 'A.']);
    });
});
