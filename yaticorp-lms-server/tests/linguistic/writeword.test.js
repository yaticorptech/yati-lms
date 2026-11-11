/**
 * Write the word (2026-11-06, the user's Duolingo picture: "Write “ಬೆಕ್ಕು” in English", a cat beside the box — "make this
 * question in every language"): the Words lessons' typing questions, in the English course as before and now in every
 * other course, in its own letters or as the word sounds in English letters; each with its picture, where it has one.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { languages } = require('../../src/linguistic/languages');
const { pictureOf } = require('../../src/linguistic/content/pictures');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect());

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
/** The words the student app asks to write (session/logic.js spellPicks). */
const picks = (n) => [...new Set(Array.from({ length: Math.min(3, n) }, (_, k) => Math.floor((k * n) / Math.min(3, n))))];
const CONFIG = { passingScore: { beginner: 60, intermediate: 60, advanced: 60 } };

describe('write the word', () => {
    test('every course\'s Words lessons, in all 20 languages: the word to write, in its letters or its sound; its picture; a wrong word is wrong', async () => {
        for (const code of languages().map((l) => l.code).filter((c) => c !== 'en')) {
            const helper = code === 'kn' ? 'hi' : 'kn';
            const docs = await LinguisticLesson.find({ course: code, module: 'vocabulary', review: null, status: 'published', deletedAt: null }).lean();
            let asked = 0, pictured = 0;
            for (const doc of docs) {
                const lesson = svc.serve(doc, progressIn(helper, code));
                const shown = svc.publicLesson(lesson, null, CONFIG);
                for (const i of picks((lesson.words || []).length)) {
                    const at = `${doc.seedKey} spell:${i}`;
                    const q = svc.findQuestion(lesson, 'spell', `spell:${i}`);
                    assert.ok(q, `${at}: a question`);
                    assert.equal(q.type, 'spelling');
                    assert.deepEqual([q.meaning, q.writeIn], [lesson.words[i].kannada, code], `${at}: the word in the student's language, written in ${code}`);
                    asked += 1;
                    if (shown.words[i].pic) { pictured += 1; assert.equal(q.pic, shown.words[i].pic, `${at}: the word's picture`); }
                    assert.equal(svc.judge(lesson, q, q.answer, 'spell').correct, true, `${at}: "${q.answer}" right`);
                    const sound = String(lesson.words[i].say || '').split(/\s*,\s*/)[0];
                    if (sound) assert.equal(svc.judge(lesson, q, sound, 'spell').correct, true, `${at}: its sound "${sound}" right too`);
                    const other = lesson.words.find((w, k) => k !== i && w.word !== lesson.words[i].word);
                    assert.equal(svc.judge(lesson, q, String(other.word).split(/\s*[,、，]\s*/)[0], 'spell').correct, false, `${at}: another word wrong`);
                    const pub = svc.publicQuestion(q, 'x');
                    assert.equal(pub.answer, undefined, `${at}: its answer not sent`);
                    assert.deepEqual([pub.kannada, pub.writeIn], [q.meaning, code], `${at}: sent with what to write and in which language`);
                }
            }
            assert.ok(asked >= 30, `${code}: words to write (${asked})`);
            assert.ok(pictured >= 15, `${code}: with pictures (${pictured} of ${asked})`);
        }
    });

    test('Chinese by its pinyin, tone marks or not; Japanese in kanji, kana or rōmaji', async () => {
        const zh = await LinguisticLesson.findOne({ course: 'zh', module: 'vocabulary', review: null, status: 'published' }).sort({ order: 1 }).lean();
        const lz = svc.serve(zh, progressIn('en', 'zh'));
        const i = lz.words.findIndex((w) => /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(w.say || ''));
        const q = svc.findQuestion(lz, 'spell', `spell:${i}`) || require('../../src/linguistic/vocabQuiz').questionById(lz.words, `spell:${i}`, 'x');
        const plain = lz.words[i].say.split(/\s*,\s*/)[0].normalize('NFD').replace(/\p{M}/gu, '');
        assert.equal(svc.judge(lz, q, plain, 'spell').correct, true, `"${lz.words[i].say}" without its tone marks: "${plain}"`);
        const ja = await LinguisticLesson.findOne({ course: 'ja', module: 'vocabulary', review: null, status: 'published', order: 1 }).lean();
        const lj = svc.serve(ja, progressIn('en', 'ja'));
        const k = lj.words.findIndex((w) => /お母さん/.test(w.word));
        const m = require('../../src/linguistic/vocabQuiz').questionById(lj.words, `spell:${k}`, 'x');
        for (const given of ['母', 'お母さん', 'haha', 'okaasan']) assert.equal(svc.judge(lj, m, given, 'spell').correct, true, given);
        assert.equal(m.pic, pictureOf('mother'));
    });

    test('the English course as before, with its picture: "Type the English word for ಬೆಕ್ಕು"', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'vocab-beginner-1', course: null }).lean();
        const lesson = svc.serve(doc, progressIn('kn'));
        const q = svc.findQuestion(lesson, 'spell', 'spell:0');
        assert.deepEqual([q.writeIn, q.meaning, q.answer, q.pic], ['en', lesson.words[0].kannada, lesson.words[0].word, pictureOf(lesson.words[0].word)]);
        assert.equal(svc.judge(lesson, q, lesson.words[0].word, 'spell').correct, true);
    });
});

// 2026-11-06, the user's pictures: "early" with a rooster, "easy" with 👌 — "the word does not match the picture".
test('a picture only where it says the word: none for "early", "easy" and the like', () => {
    const { PICTURES } = require('../../src/linguistic/content/pictures');
    for (const w of ['early', 'easy', 'big', 'small', 'pollution', 'drought', 'busy', 'favourite', 'achieve', 'budget']) assert.equal(pictureOf(w), null, `${w}: no picture`);
    assert.equal(pictureOf('bus'), '🚌');
    assert.equal(pictureOf('Mother'), '👩‍👧');
    assert.ok(Object.keys(PICTURES).length >= 25, 'the clear ones kept');
});
