/**
 * A unit review is not the one before it again (2026-11-14, the user on Section 2's "Unit review": "don't repeat the
 * question in every unit, ask different different questions"): every unit asked "which word means", "write it", a
 * synonym, an antonym, in that order, and the unit before's words the very way that unit had. Now no question is asked
 * word for word in two unit reviews, each unit's ways differ from the unit before's, a review uses a way twice only
 * when no other fits, and the order is mixed.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const reviews = require('../../src/linguistic/reviews');
const svc = require('../../src/linguistic/service');

const CASES = [[null, 'kn'], [null, 'hi'], ['kn', 'en'], ['hi', 'en'], ['es', 'kn']];

describe('unit reviews ask different questions', () => {
    for (const [course, helper] of CASES) {
        for (const level of ['beginner', 'advanced']) {
            test(`${course || 'English'} for a ${helper} speaker, ${level}`, () => {
                const stubs = reviews.stubs().filter((s) => s.review === 'unit' && s.level === level && (s.course || null) === course);
                assert.ok(stubs.length >= 8, `${stubs.length} unit reviews`);
                const seen = new Map();
                let before = null;
                for (const st of stubs) {
                    const l = { ...reviews.build(st, helper), _id: st.seedKey };
                    const quiz = svc.quizOf(l);
                    assert.ok(quiz.length >= 6, `${st.seedKey}: ${quiz.length} questions`);
                    for (const q of quiz) {
                        const key = `${q.prompt} => ${q.answer}`;
                        assert.ok(!seen.has(key), `${st.seedKey} asks again what ${seen.get(key)} asked: ${key}`);
                        seen.set(key, st.seedKey);
                    }
                    const kinds = quiz.map((q) => `${q.id.startsWith('before~') ? '^' : ''}${q.kind}`);
                    if (before) assert.notDeepEqual(kinds, before, `${st.seedKey}: not the same questions in the same order as the unit before`);
                    before = kinds;
                    // English has eight ways for a word: none used twice in one review's own words.
                    if (!course) {
                        const own = quiz.filter((q) => !q.id.startsWith('before~') && q.kind !== 'sentence').map((q) => q.kind);
                        assert.equal(new Set(own).size, own.length, `${st.seedKey}: ${own.join(' ')}`);
                    }
                }
            });
        }
    }
});
