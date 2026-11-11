/**
 * Complete the conversation (2026-11-07, the user's Duolingo picture "ಈ ಸಂಭಾಷಣೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ" — one person asks, the
 * reply is among the choices, with its voice): every translation lesson and Words lesson, in the English course for every
 * student language and in every course, asks one exchange of its topic in the language learnt; checked here; a wrong
 * reply kept as a mistake and put right in the mistakes practice.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { languages } = require('../../src/linguistic/languages');
const { CHATS } = require('../../src/linguistic/content/chats');
const { unlockIds } = require('./unlock');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect().catch(() => {}));

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
const CODES = languages().map((l) => l.code).filter((c) => c !== 'en');

describe('complete the conversation', () => {
    test('every exchange written in English and all 20 languages; two to each topic, each of a kind', () => {
        for (const c of CHATS) for (const k of ['en', ...CODES]) assert.ok(c[k]?.length === 2 && c[k].every(Boolean), `${c.id} ${k}`);
        for (const level of ['beginner', 'intermediate', 'advanced']) for (const n of [1, 2, 3, 4]) assert.equal(CHATS.filter((c) => c.topic === `${level}:${n}`).length, 2, `${level} ${n}`);
        assert.equal(CHATS[0].en[0], 'Do you have a pet?', 'the user\'s picture');
    });

    test('in every translation and Words lesson: the English course for all 20 languages, and all 20 courses', async () => {
        for (const code of CODES) {
            for (const [course, language] of [[null, code], [code, code === 'hi' ? 'kn' : 'hi']]) {
                const docs = await LinguisticLesson.find({ course, module: { $in: ['translation', 'vocabulary'] }, review: null, status: 'published', deletedAt: null }).lean();
                let lessons = 0;
                const seen = new Set();
                for (const doc of docs) {
                    const l = svc.serve(doc, progressIn(language, course));
                    if (!['translation', 'vocabulary'].includes(l.module)) continue;
                    lessons += 1;
                    const at = `${course || 'en'} for ${language} ${doc.seedKey}`;
                    assert.equal(l.chats?.length, 1, `${at}: a conversation`);
                    const q = l.chats[0];
                    seen.add(q.id);
                    const learnt = course || 'en';
                    const c = CHATS.find((x) => `chat~${x.id}` === q.id);
                    assert.deepEqual([q.ask, q.answer], c[learnt], `${at}: in the language learnt`);
                    assert.equal(q.sayLang, course ? l.targetLocale : 'en-IN', `${at}: heard in it`);
                    assert.equal(q.options.length, 3, `${at}: three replies`);
                    assert.ok(q.options.includes(q.answer), `${at}: the right one among them`);
                    // Its meaning: the student's language, English learnt; English, a course.
                    const meaning = course ? 'en' : language;
                    assert.deepEqual([q.meaningLang, q.askMeaning, q.optionMeanings[q.answer]], [meaning, c[meaning][0], c[meaning][1]], `${at}: meanings`);
                    // The wrong ones answer another kind of question.
                    for (const o of q.options.filter((x) => x !== q.answer)) assert.notEqual(CHATS.find((x) => x[learnt][1] === o).kind, c.kind, `${at}: "${o}" another kind`);
                    assert.equal(svc.judge(l, q, q.answer, 'chat').correct, true, `${at}: right`);
                    assert.equal(svc.judge(l, q, q.options.find((x) => x !== q.answer), 'chat').correct, false, `${at}: wrong`);
                    const pub = svc.publicQuestion(q, 'x');
                    assert.equal(pub.answer, undefined, `${at}: not which is right`);
                    assert.deepEqual([pub.type, pub.say, pub.options.length], ['chat', q.ask, 3]);
                }
                assert.ok(lessons >= 20, `${course || 'en'} for ${language}: lessons (${lessons})`);
                assert.ok(seen.size >= 20, `${course || 'en'} for ${language}: the exchanges asked (${seen.size})`);
            }
        }
    });
});

describe('complete the conversation through the routes', () => {
    let app, u;
    before(async () => {
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        u = await makeUser('Ling Chat Spanish');
        assert.equal((await app.call(u.token)('POST', '/language', { language: 'kn' })).status, 200);
        assert.equal((await app.call(u.token)('POST', '/course', { course: 'es', start: 'beginner' })).status, 200);
    });
    after(async () => { await cleanup([u.user], app.server); });

    test('a Spanish course: wrong → a mistake, not an error; asked again; right → fixed', async () => {
        const api = app.call(u.token);
        const doc = await LinguisticLesson.findOne({ seedKey: 'es:vocab-beginner-1' }).lean();
        await unlockIds(u.user, [doc._id]);
        const q = (await api('GET', `/lessons/${doc._id}`)).body.chats?.[0];
        assert.ok(q, 'a conversation');
        assert.deepEqual([q.ask, q.askMeaning, q.answer], ['¿Tienes una mascota?', 'Do you have a pet?', undefined], 'the question in Spanish, its English on tap; the answer not sent');
        const wrong = q.options.find((o) => o !== 'Sí, tengo un gato.');
        const r = await api('POST', `/lessons/${doc._id}/check`, { section: 'chat', id: q.id, given: wrong });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual([r.body.correct, r.body.answer, r.body.explanation], [false, 'Sí, tengo un gato.', 'Yes, I have a cat.']);
        const m = (await api('GET', '/review')).body.mistakes.find((x) => x.question.id === q.id);
        assert.ok(m && m.question.type === 'chat' && m.question.ask === q.ask, 'kept as a mistake, to answer again');
        const again = await api('POST', `/review/${m.id}`, { given: 'Sí, tengo un gato.' });
        assert.deepEqual([again.body.correct, again.body.resolved], [true, true]);
    });
});
