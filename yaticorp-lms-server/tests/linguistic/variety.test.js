/**
 * "Each unit asks the same questions — give different ones" (2026-10-24). In
 * every unit of every section, in the English course and another language's,
 * the Words lesson, the Listening and the unit review never ask a word the
 * same way; the review also asks the unit's sentences and words from the unit
 * before. A question got wrong comes back in revision and can be put right.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson, LEVELS } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');
const { unlock } = require('./unlock');

const keyOf = (q) => `${q.kind}:${q.word || q.answer}`;

describe('a unit\'s lessons ask different questions', () => {
    let app, s, api;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        s = await makeUser('Ling Variety'); api = app.call(s.token);
        await require('../../src/linguistic/seed').ensureSeeded();
    });
    after(async () => { await cleanup([s.user], app.server); });

    for (const [course, language] of [['en', 'kn'], ['hi', 'en'], ['kn', 'ta']]) {
        test(`${course} course, for a ${language} speaker: every unit, every section`, async () => {
            const prefix = course === 'en' ? '' : `${course}:`;
            let units = 0;
            for (const level of LEVELS) {
                for (const order of [1, 2, 3]) {
                    for (const part of ['', '~2']) {
                        const get = async (key) => { const doc = await LinguisticLesson.findOne({ seedKey: `${prefix}${key}` }).lean(); return doc && svc.serve(doc, { language, course: course === 'en' ? null : course }); };
                        const [words, hear, review] = [await get(`vocab-${level}-${order}${part}`), await get(`review-hear-${level}-${order}${part}`), await get(`review-unit-${level}-${order}${part}`)];
                        if (!words || !hear || !review) continue;
                        units++;
                        const asked = [words, hear, review].map((l) => svc.quizOf(l).filter((q) => !String(q.id).startsWith('before~') && q.kind !== 'sentence').map(keyOf));
                        const all = asked.flat();
                        assert.equal(new Set(all).size, all.length, `${prefix}${level}-${order}${part}: a word asked the same way twice — ${all.join(', ')}`);
                        const r = svc.quizOf(review);
                        assert.ok(r.some((q) => String(q.id).startsWith('before~')) || (order === 1 && !part), `${level}-${order}${part}: words from the unit before`);
                        if (language !== 'en') assert.equal(r.filter((q) => q.kind === 'sentence').length, 2, `${level}-${order}${part}: the unit's sentences`);
                        assert.ok(svc.quizOf(hear).every((q) => q.say), 'Listening is all by ear');
                        for (const q of r.filter((x) => x.options)) assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length, q.id);
                    }
                }
            }
            assert.equal(units, 18, 'six units in each of the three sections');
        });
    }

    test('a review question got wrong (a sentence, a word from before) is kept, asked again, and put right', async () => {
        await unlock(s.user, ['review-unit-beginner-1~2']);
        const doc = await LinguisticLesson.findOne({ seedKey: 'review-unit-beginner-1~2' }).lean();
        const page = (await api('GET', `/lessons/${doc._id}`)).body;
        const ids = page.quiz.map((q) => q.id);
        assert.ok(ids.includes('sentence:0') && ids.some((id) => id.startsWith('before~')));
        const one = await api('POST', `/lessons/${doc._id}/quiz/check`, { id: 'sentence:0', given: 'zzz' });
        assert.equal(one.body.correct, false);
        await api('POST', `/lessons/${doc._id}/quiz`, { answers: { 'sentence:0': 'zzz', [ids.find((id) => id.startsWith('before~'))]: 'zzz' } });
        const list = (await api('GET', '/review')).body.mistakes;
        const sentence = list.find((m) => m.question.prompt?.includes('ಎಂಬ ಅರ್ಥದ ವಾಕ್ಯ'));
        assert.ok(sentence, 'the sentence question, asked in Kannada');
        assert.ok(list.some((m) => /ಇಂಗ್ಲಿಷ್ ಪದ|ಅರ್ಥ ಏನು|ಬರೆಯಿರಿ/.test(m.question.prompt)), 'the word from the unit before');
        const q = svc.quizOf(svc.serve(doc, { language: 'kn' })).find((x) => x.id === 'sentence:0');
        assert.equal((await api('POST', `/review/${sentence.id}`, { given: q.answer })).body.resolved, true);
    });
});
