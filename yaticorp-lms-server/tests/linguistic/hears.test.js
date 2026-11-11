/**
 * Tap what you hear (2026-11-06, the user's Duolingo picture "ನಿಮಗೆ ಕೇಳುತ್ತಿರುವುದನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ" — "in all languages, don't
 * remove any existing function"): every translation lesson and Words lesson, in the English course for every student
 * language and in every course, has a sentence of its unit to hear and build from tiles; checked here; a wrong one kept
 * as a mistake and put right in the mistakes practice.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { languages } = require('../../src/linguistic/languages');
const { unlockIds } = require('./unlock');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect().catch(() => {}));

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
const CODES = languages().map((l) => l.code).filter((c) => c !== 'en');

describe('tap what you hear, and say this sentence', () => {
    test('in every translation and Words lesson: the English course for all 20 languages, and all 20 courses', async () => {
        for (const code of CODES) {
            for (const [course, language] of [[null, code], [code, code === 'hi' ? 'kn' : 'hi']]) {
                const docs = await LinguisticLesson.find({ course, module: { $in: ['translation', 'vocabulary'] }, review: null, part: null, status: 'published', deletedAt: null }).lean();
                let lessons = 0, asked = 0, says = 0;
                for (const doc of docs) {
                    const l = svc.serve(doc, progressIn(language, course));
                    if (!['translation', 'vocabulary'].includes(l.module)) continue;
                    lessons += 1;
                    // Say this sentence (2026-11-06): a short one, heard in the language learnt, sent to say.
                    for (const q of l.sayits || []) {
                        says += 1;
                        const n = require('../../src/linguistic/blanks').tokensOf(q.say, course ? l.target : 'en').filter((t) => t.word).length;
                        const cjk = course && /^(ja|zh)/.test(l.target);
                        assert.ok(n >= 2 && (cjk ? [...q.say.replace(/[\s\p{P}]/gu, '')].length <= 18 : n <= 8), `${doc.seedKey} ${q.id}: short to say (${n})`);
                        assert.equal(q.sayLang, course ? l.targetLocale : 'en-IN');
                    }
                    for (const q of l.hears || []) {
                        asked += 1;
                        const at = `${course || 'en'} for ${language} ${doc.seedKey} ${q.id}`;
                        assert.equal(q.sayLang, course ? l.targetLocale : 'en-IN', `${at}: heard in the language learnt`);
                        assert.ok(q.words.length >= 4, `${at}: tiles (${q.words.length})`);
                        // Right: its words in order; wrong: two of them swapped.
                        const words = require('../../src/linguistic/blanks').tokensOf(q.say, course ? l.target : 'en').filter((t) => t.word).map((t) => t.text);
                        assert.equal(svc.judge(l, q, words.join(' '), 'hear').correct, true, `${at}: right`);
                        const swapped = [words[1], words[0], ...words.slice(2)];
                        if (swapped.join('') !== words.join('')) assert.equal(svc.judge(l, q, swapped.join(' '), 'hear').correct, false, `${at}: wrong order`);
                        assert.deepEqual(Object.keys(svc.publicQuestion(q, 'x')).sort(), ['id', 'prompt', 'say', 'sayLang', 'type', 'words'], `${at}: sent`);
                    }
                }
                assert.ok(says >= lessons - 2, `${course || 'en'} for ${language}: sentences to say (${says} in ${lessons} lessons)`);
                assert.ok(asked >= lessons, `${course || 'en'} for ${language}: sentences to hear (${asked} in ${lessons} lessons)`);
            }
        }
    });
});

describe('tap what you hear through the routes', () => {
    let app, u;
    before(async () => {
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        u = await makeUser('Ling Hear Japanese');
        assert.equal((await app.call(u.token)('POST', '/language', { language: 'en' })).status, 200);
        assert.equal((await app.call(u.token)('POST', '/course', { course: 'ja', start: 'beginner' })).status, 200);
    });
    after(async () => { await cleanup([u.user], app.server); });

    test('a Japanese course: wrong → a mistake, not an error; asked again; right → fixed', async () => {
        const api = app.call(u.token);
        const doc = await LinguisticLesson.findOne({ seedKey: 'ja:translation-beginner-kn-en' }).lean();
        await unlockIds(u.user, [doc._id]);
        const q = (await api('GET', `/lessons/${doc._id}`)).body.hears?.[0];
        assert.ok(q, 'a sentence to hear');
        const words = require('../../src/linguistic/blanks').tokensOf(q.say, 'ja').filter((t) => t.word).map((t) => t.text);
        const r = await api('POST', `/lessons/${doc._id}/check`, { section: 'hear', id: q.id, given: [...words].reverse().join(' ') });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual([r.body.correct, r.body.answer], [false, q.say]);
        const m = (await api('GET', '/review')).body.mistakes.find((x) => x.question.id === q.id);
        assert.ok(m && m.question.type === 'hear' && m.question.say === q.say, 'kept as a mistake, to hear again');
        const again = await api('POST', `/review/${m.id}`, { given: words.join(' ') });
        assert.deepEqual([again.body.correct, again.body.resolved], [true, true]);
    });
});
