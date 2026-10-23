/**
 * Linguistic Ability — the predefined content and the placement rules. No database.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { lessons, placement } = require('../../src/linguistic/content');
const { validateLesson } = require('../../src/linguistic/validate');
const { lessonQuiz, questionById } = require('../../src/linguistic/vocabQuiz');
const { placementLevel } = require('../../src/linguistic/service');
const { MODULES, LEVELS } = require('../../src/linguistic/models');

describe('the seeded lessons', () => {
    test('every module has lessons at every level, and every lesson passes the admin check', () => {
        for (const m of MODULES) for (const l of LEVELS) assert.ok(lessons.filter((x) => x.module === m && x.level === l).length >= 2, `${m}/${l}`);
        for (const l of lessons) assert.deepEqual(validateLesson({ ...l, status: 'published' }).errors, [], l.seedKey);
        assert.equal(new Set(lessons.map((l) => l.seedKey)).size, lessons.length, 'seed keys are unique');
    });
    test('vocabulary words have a Kannada meaning, an example and a recording', () => {
        for (const l of lessons.filter((x) => x.module === 'vocabulary')) {
            for (const w of l.words) {
                assert.match(w.kannada, /[ಀ-೿]/, `${w.word} has Kannada`);
                assert.ok(w.example.length > 8, w.word);
                assert.ok(fs.existsSync(path.join(__dirname, '../../public', w.audio)), `${w.audio} exists`);
            }
        }
    });
    test('every line of every conversation has its recording', () => {
        for (const l of lessons.filter((x) => x.module === 'speaking')) for (const line of l.learn.dialogue.lines) assert.ok(fs.existsSync(path.join(__dirname, '../../public', line.audio)), line.audio);
    });
    test('translation lessons go one way each, with Kannada on the right side', () => {
        for (const l of lessons.filter((x) => x.module === 'translation')) {
            const kn = /[ಀ-೿]/;
            for (const it of [...l.items, ...l.quiz]) {
                if (l.direction === 'kn-en') { assert.match(it.source, kn, it.source); assert.doesNotMatch(it.model, kn, it.model); } else { assert.doesNotMatch(it.source, kn, it.source); assert.match(it.model, kn, it.model); }
            }
            assert.ok(l.quiz.every((q) => !q.open), 'quiz items are auto-checked');
        }
    });
    test('a vocabulary quiz: one question per word, each with one right answer among its options, rebuildable from its id', () => {
        for (const l of lessons.filter((x) => x.module === 'vocabulary')) {
            const qs = lessonQuiz(l.words, 'seed');
            assert.equal(qs.length, l.words.length);
            for (const q of qs) {
                if (q.options) { assert.ok(q.options.includes(q.answer)); assert.equal(new Set(q.options).size, q.options.length); }
                assert.deepEqual(questionById(l.words, q.id, 'seed'), q, 'the same question, with the same options, from its id');
            }
        }
    });
});

describe('the placement test', () => {
    test('fifteen questions, five per band, each answer among its options', () => {
        assert.equal(placement.length, 15);
        for (const b of LEVELS) assert.equal(placement.filter((q) => q.band === b).length, 5);
        for (const q of placement) assert.ok(q.options.includes(q.answer), q.id);
    });
    test('the level: a band counts only when the bands below it hold up', () => {
        const at = (b, i, a) => placementLevel({ beginner: { score: b }, intermediate: { score: i }, advanced: { score: a } });
        assert.equal(at(5, 5, 5), 'advanced');
        assert.equal(at(4, 4, 4), 'advanced');
        assert.equal(at(5, 5, 3), 'intermediate');
        assert.equal(at(4, 3, 0), 'intermediate');
        assert.equal(at(3, 5, 5), 'beginner', 'weak basics start at the beginning, whatever the rest');
        assert.equal(at(5, 2, 5), 'beginner');
        assert.equal(at(0, 0, 0), 'beginner');
    });
});
