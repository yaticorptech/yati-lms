/**
 * An answer in the language learnt typed either way (asked 2026-10-29: "allow both typing in English and Japanese,
 * don't give the one"): in its own letters (kanji, or kana, or katakana for Japanese) or in English letters — its
 * sound as the lesson shows it — both right. Worked out on this server from the sound files, no outside service.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../../src/linguistic/service');
const courses = require('../../src/linguistic/courses');
const { soundToKana, toHiragana } = require('../../src/linguistic/content/sounds/kana');

const lessonOf = (key, helper) => ({ ...courses.build(courses.stubs().find((s) => s.seedKey === key), helper), _id: 'x' });

describe('typed in its own letters or in English letters', () => {
    test('kana from the sound: particles as written, small tsu, n', () => {
        assert.equal(soundToKana('watashi-wa gakusei-desu'), 'わたしはがくせいです');
        assert.equal(soundToKana('o-namae-wa nan-desu-ka'), 'おなまえはなんですか');
        assert.equal(soundToKana('gakkou'), 'がっこう');
        assert.equal(soundToKana('shinbun-o yomimasu'), 'しんぶんをよみます');
        assert.equal(soundToKana('onna'), 'おんな');
        assert.equal(toHiragana('ワタシ マンゴー'), 'わたし まんごお');
    });

    test('a Japanese sentence: kanji, kana, katakana and English letters right; something else wrong', () => {
        const l = lessonOf('ja:translation-beginner-en-kn', 'en');
        const it = l.items.find((x) => x.id === 'i4');
        assert.equal(it.model, '私は学生です。');
        for (const given of ['私は学生です。', 'わたしはがくせいです', 'ワタシハガクセイデス', 'watashi wa gakusei desu', 'Watashi wa gakusei desu.', 'watashiwa gakusei desu']) {
            assert.equal(svc.judge(l, it, given, 'items').correct, true, given);
        }
        assert.equal(svc.judge(l, it, 'anata wa sensei desu', 'items').correct, false);
        assert.equal(svc.judge(l, it, 'あなたはせんせいです', 'items').correct, false);
    });

    test('a word too, and in another language with its sound written (French): English letters as shown', () => {
        const l = lessonOf('ja:translation-beginner-en-kn', 'en');
        const word = l.items.find((x) => x.id === 'i2');
        assert.deepEqual(['学校', 'がっこう', 'gakkou'].map((g) => svc.judge(l, word, g, 'items').correct), [true, true, true]);
        const fr = lessonOf('fr:translation-beginner-en-kn', 'en');
        const s = fr.items.find((x) => !x.open && x.model);
        assert.equal(svc.judge(fr, s, s.model, 'items').correct, true);
    });
});
