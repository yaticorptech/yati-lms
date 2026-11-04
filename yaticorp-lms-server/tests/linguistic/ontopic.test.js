/**
 * Each Section 1 unit's translation on its own topic (2026-11-04, the user: "the unit says Family, but the content
 * inside is different — if it is like this in any language, correct it"): every sentence in a unit's translation
 * lesson uses that unit's words, in English and in every other language's course.
 */
const { test, before, after, describe } = require('node:test');
const mongoose = require('mongoose');
const assert = require('node:assert/strict');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { unitsOf } = require('../../src/linguistic/units');
const { packOf } = require('../../src/linguistic/languages');
const { LANGS } = require('../../src/linguistic/content/onTopic');

// A unit's topic: its words, and the few more its sentences may use.
const TOPIC = {
    Family: /\b(family|mother|father|house|home|sister)\b/i,
    'Food, size and feelings': /\b(food|happy|big|small)\b/i,
    'School and friends': /\b(friend|school|student|book|teacher)\b/i,
    'Read and write': /\b(read|reads|write|easy|early)\b/i
};
const progressFor = (language, course) => ({ language, course, lessons: [], placement: { level: 'beginner' }, courseStart: course ? { [course]: 'beginner' } : {}, levelsCompleted: [], plans: [] });

before(connect);
after(() => mongoose.disconnect());

describe('Section 1 translation on its units\' topics', () => {
    for (const [language, course] of [['kn', null], ['hi', null], ['kn', 'hi'], ['hi', 'ja'], ['en', 'es']]) {
        test(`${course || 'English'} for a ${language} speaker: each unit's sentences use its own words`, async () => {
            const progress = progressFor(language, course);
            const units = unitsOf((await svc.lessonsFor(progress)).filter((l) => l.level === 'beginner')).filter((u) => TOPIC[u.title]);
            assert.equal(units.length, 4, units.map((u) => u.title).join(', '));
            for (const u of units) {
                const lesson = u.lessons.find((l) => l.module === 'translation' && !l.review);
                assert.ok(lesson, `${u.title}: its translation lesson`);
                const l = svc.serve(lesson, progress);
                const all = [...(l.items || []), ...(l.quiz || [])];
                assert.ok(all.length >= 5, `${u.title}: ${all.length} sentences`);
                for (const it of all) {
                    // The English of each: the bridge in a course, else whichever side is English.
                    const en = it.en || (/[a-z]/i.test(it.model) ? it.model : it.source);
                    assert.match(en, TOPIC[u.title], `${u.title} ${it.id}: "${en}" is not on its topic`);
                }
            }
        });
    }

    test('every language has each of them, in its place', () => {
        for (const code of Object.keys(LANGS)) {
            const items = packOf(code).items;
            for (const [key, side] of [['translation-beginner-kn-en', 'source'], ['translation-beginner-en-kn', 'model']]) {
                const ids = Object.keys(items[key] || {}).sort();
                assert.deepEqual(ids, ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'q1', 'q2', 'q3', 'q4'], `${code} ${key}`);
                assert.ok(Object.values(items[key]).every((x) => x[side] && x.explanation), `${code} ${key}: each with its sentence and why`);
            }
        }
    });
});
