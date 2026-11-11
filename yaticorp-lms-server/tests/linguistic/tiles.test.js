/**
 * An answer built from word tiles is right only when it is the answer (or one accepted) — 2026-11-04, the user's
 * screenshot: "The problem will be solved as soon as position" was marked "Correct — mind the small differences".
 * A wrong tile is a wrong word; the allowance for a near answer is for a slip of the keys, in a typed answer.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect());

const progress = { language: 'kn', course: null, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] };
const find = async (seedKey, re) => {
    for (const key of [seedKey, `${seedKey}~2`]) {
        const doc = await LinguisticLesson.findOne({ seedKey: key }).lean();
        if (!doc) continue;
        const l = svc.serve(doc, progress);
        const q = [...(l.items || []), ...(l.quiz || [])].find((x) => re.test(x.model || ''));
        if (q) return { l, q };
    }
    return {};
};

describe('an answer built from tiles', () => {
    test('one wrong tile is wrong, however close the rest; a typed slip still counts; the right tiles are right', async () => {
        const { l, q } = await find('translation-advanced-kn-en', /as soon as possible/);
        assert.ok(q, 'the sentence of the screenshot');
        const bank = svc.bankFor(q, l);
        assert.ok(bank?.length, 'its tiles');
        const words = q.model.replace(/[.?!]/g, '').split(' ');
        const wrong = bank.find((w) => !words.map((x) => x.toLowerCase()).includes(w.toLowerCase()));
        assert.ok(wrong, `an extra tile (${bank.join(' / ')})`);
        const built = [...words.slice(0, -1), wrong].join(' ');
        const r = svc.judge(l, q, built, 'quiz');
        assert.deepEqual([r.correct, r.verdict], [false, 'almost'], `"${built}" is wrong`);
        assert.ok(r.diff.length > 0, 'with what differs');
        const right = svc.judge(l, q, words.join(' '), 'quiz');
        assert.deepEqual([right.correct, right.verdict], [true, 'exact'], 'the right tiles');
        const typed = svc.judge(l, q, `${words.slice(0, -1).join(' ')} posible`, 'quiz');
        assert.equal(typed.correct, true, 'typed, a slip of the keys still counts');
    });

    test('the quiz scores it the same way', async () => {
        const { l, q } = await find('translation-advanced-kn-en', /as soon as possible/);
        const words = q.model.replace(/[.?!]/g, '').split(' ');
        const wrong = svc.bankFor(q, l).find((w) => !words.map((x) => x.toLowerCase()).includes(w.toLowerCase()));
        const results = svc.quizOf(l).filter((x) => x.id === q.id).map((x) => svc.judge(l, x, [...words.slice(0, -1), wrong].join(' '), 'quiz'));
        assert.ok(results.length === 0 || results.every((x) => x.correct === false));
    });
});
