/**
 * Linguistic Ability — checking answers and writing, with no outside service
 * (check.js, writingCheck.js). No database.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, gradeQuestion, checkTranslation, diff, similarity } = require('../../src/linguistic/check');
const { checkWriting } = require('../../src/linguistic/writingCheck');

describe('normalising an answer', () => {
    test('case, spacing, punctuation and curly quotes are set aside', () => {
        assert.equal(normalize('  The  Meeting has been POSTPONED!  '), 'the meeting has been postponed');
        assert.equal(normalize('“Hello,” she said.'), 'hello she said');
        assert.equal(normalize('o’clock'), normalize("o'clock"));
    });
    test('English contractions are spelled out', () => {
        assert.equal(normalize("I'm fine."), 'i am fine');
        assert.equal(normalize("She doesn't like tea."), normalize('She does not like tea.'));
        assert.equal(normalize("can't"), 'cannot');
        assert.equal(normalize('can not'), 'cannot');
        assert.notEqual(normalize("it's"), normalize('its'), '"its" and "it is" stay different');
    });
    test('Kannada: invisible joiners and Kannada digits do not count', () => {
        assert.equal(normalize('ಸಾಫ್ಟ್‌ವೇರ್', 'kn'), normalize('ಸಾಫ್ಟ್ವೇರ್', 'kn'));
        assert.equal(normalize('ತರಗತಿ ೯ ಗಂಟೆಗೆ', 'kn'), 'ತರಗತಿ 9 ಗಂಟೆಗೆ');
        assert.equal(normalize('ನಿಮ್ಮ ಹೆಸರು ಏನು?', 'kn'), 'ನಿಮ್ಮ ಹೆಸರು ಏನು');
    });
});

describe('grammar and vocabulary questions', () => {
    const q = { type: 'fill', answer: 'have not seen', accepted: ["haven't seen"] };
    test('the answer or an accepted one, however it is typed', () => {
        assert.equal(gradeQuestion(q, 'Have not seen').correct, true);
        assert.equal(gradeQuestion(q, "haven't seen").correct, true);
        assert.equal(gradeQuestion(q, 'did not see').correct, false);
    });
    test('a typo is wrong, but told it is nearly right', () => {
        const r = gradeQuestion({ type: 'fill', answer: 'opportunity' }, 'oportunity');
        assert.deepEqual(r, { correct: false, near: true });
        assert.equal(gradeQuestion({ type: 'fill', answer: 'opportunity' }, 'chance').near, false);
    });
    test('multiple choice is exact', () => {
        assert.equal(gradeQuestion({ type: 'mcq', answer: 'an', options: ['an', 'a'] }, 'an').correct, true);
        assert.equal(gradeQuestion({ type: 'mcq', answer: 'an', options: ['an', 'a'] }, 'a').near, false);
    });
    test('a rearranged sentence: order matters, punctuation does not', () => {
        const r = { type: 'rearrange', answer: 'If you work hard, you will succeed.', accepted: ['You will succeed if you work hard.'] };
        assert.equal(gradeQuestion(r, 'if you work hard you will succeed').correct, true);
        assert.equal(gradeQuestion(r, 'You will succeed if you work hard').correct, true);
        assert.equal(gradeQuestion(r, 'you work hard if you will succeed').correct, false);
    });
    test('an empty answer is never right', () => assert.equal(gradeQuestion(q, '   ').correct, false));
});

describe('translations', () => {
    const kn = { model: 'I am fine.', accepted: ["I'm fine.", 'I am well.'] };
    test('the model or an accepted alternative, however it is punctuated', () => {
        assert.equal(checkTranslation(kn, 'i am fine', 'kn-en').verdict, 'exact');
        assert.equal(checkTranslation(kn, 'I am well!', 'kn-en').verdict, 'exact');
        assert.equal(checkTranslation(kn, "I'm fine", 'kn-en').correct, true);
    });
    test('a long sentence close to a reference counts; several translations can be right', () => {
        const item = { model: 'The meeting has been postponed to Monday.', accepted: ['The meeting has been moved to Monday.'] };
        const r = checkTranslation(item, 'The meeting has been postponed to monday', 'kn-en');
        assert.equal(r.verdict, 'exact');
        const close = checkTranslation(item, 'The meeting has been postponed till Monday.', 'kn-en');
        assert.equal(close.verdict, 'close'); assert.equal(close.correct, true);
        assert.ok(close.closeness >= 85 && close.closeness < 100, `${close.closeness}%`);
        assert.ok(close.diff.some((d) => d.t === 'missing' && d.w === 'to') && close.diff.some((d) => d.t === 'extra' && d.w === 'till'), 'the difference is shown word by word');
    });
    test('a "not" on one side only is not right, however alike', () => {
        const r = checkTranslation({ model: 'I like to speak English.' }, 'I do not like to speak English.', 'kn-en');
        assert.equal(r.correct, false);
        assert.notEqual(r.verdict, 'close');
    });
    test('half right is "almost"; unrelated is wrong', () => {
        assert.equal(checkTranslation({ model: 'Please send the report by Friday.' }, 'Please send report Friday', 'kn-en').verdict, 'almost');
        assert.equal(checkTranslation({ model: 'Please send the report by Friday.' }, 'I like mangoes', 'kn-en').verdict, 'wrong');
    });
    test('a single word is about spelling: only exact counts', () => {
        assert.equal(checkTranslation({ model: 'water' }, 'Water', 'kn-en').verdict, 'exact');
        assert.equal(checkTranslation({ model: 'water' }, 'watr', 'kn-en').correct, false);
    });
    test('Kannada answers: punctuation, joiners and accepted alternatives', () => {
        const item = { model: 'ನಿಮ್ಮ ಹೆಸರು ಏನು?', accepted: ['ನಿನ್ನ ಹೆಸರು ಏನು?', 'ನಿಮ್ಮ ಹೆಸರೇನು?'] };
        assert.equal(checkTranslation(item, 'ನಿಮ್ಮ ಹೆಸರು ಏನು', 'en-kn').verdict, 'exact');
        assert.equal(checkTranslation(item, 'ನಿಮ್ಮ ಹೆಸರೇನು', 'en-kn').verdict, 'exact');
        assert.equal(checkTranslation(item, 'ನಾನು ವಿದ್ಯಾರ್ಥಿ', 'en-kn').correct, false);
    });
    test('a passage is never marked wrong by the machine: it is compared and sent for review', () => {
        const r = checkTranslation({ model: 'I completed my degree last year. Now I am looking for a job.', open: true }, 'I finished my degree last year. Now I search a job.', 'kn-en');
        assert.equal(r.verdict, 'review'); assert.equal(r.correct, null);
        assert.ok(r.closeness > 40 && r.closeness < 100);
    });
});

describe('the word-by-word difference', () => {
    test('same, missing and extra words', () => {
        assert.deepEqual(diff('i go school', 'i go to school'), [{ w: 'i', t: 'same' }, { w: 'go', t: 'same' }, { w: 'to', t: 'missing' }, { w: 'school', t: 'same' }]);
        assert.equal(similarity('a b c', 'a b c'), 1);
    });
});

describe('rule-based writing feedback', () => {
    const tips = (r) => r.findings.filter((f) => f.kind === 'tip').map((f) => f.text).join(' | ');
    test('capitals, full stops, the lone "i", spacing and repeated words', () => {
        const r = checkWriting('i went to the the market , and bought apples', { type: 'paragraph' });
        const t = tips(r);
        assert.match(t, /Start every sentence with a capital letter/);
        assert.match(t, /End your sentence with a full stop/);
        assert.match(t, /Write "I" as a capital letter/);
        assert.match(t, /"the the": the word is written twice/);
        assert.match(t, /Do not put a space before a comma/);
        assert.equal(r.ok, false);
    });
    test('common misspellings are named with the right spelling', () => {
        assert.match(tips(checkWriting('I will recieve the parcel tommorow.', {})), /"recieve" should be "receive".*"tommorow" should be "tomorrow"/);
    });
    test('a sentence task: the required word, and enough words', () => {
        assert.equal(checkWriting('I feel happy when I play.', { type: 'sentence', mustInclude: ['happy'], minWords: 4 }).ok, true);
        const r = checkWriting('I am glad.', { type: 'sentence', mustInclude: ['happy'], minWords: 4 });
        assert.equal(r.ok, false);
        assert.match(tips(r), /Use the word "happy"/);
    });
    test('an email needs a subject, a greeting and a closing', () => {
        const bare = tips(checkWriting('I am not well today so I cannot come to college tomorrow.', { type: 'email' }));
        assert.match(bare, /Add a subject line/); assert.match(bare, /Begin with a greeting/); assert.match(bare, /End with a closing/);
        const full = checkWriting('Subject: Leave request\n\nDear Ma\'am,\n\nI am not well today, so I cannot come to college tomorrow. Kindly grant me leave.\n\nYours sincerely,\nAsha', { type: 'email', minWords: 20 });
        assert.equal(tips(full), '', `no tips: ${tips(full)}`);
    });
    test('a formal letter needs the date, a subject, a formal greeting and "Yours faithfully"', () => {
        const t = tips(checkWriting('Hello Principal. Please keep the library open. Thanks.', { type: 'letter' }));
        assert.match(t, /Add the date/); assert.match(t, /Add a subject line/); assert.match(t, /formal greeting/); assert.match(t, /Yours faithfully/);
    });
    test('too short for the task', () => {
        assert.match(tips(checkWriting('I wake up early.', { type: 'paragraph', minWords: 30 })), /you have 4 words, and this task needs at least 30/);
    });
});
