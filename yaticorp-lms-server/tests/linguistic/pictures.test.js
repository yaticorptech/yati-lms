/**
 * Which of these is “ಹಾವು”? (2026-11-12, the user's Duolingo picture, "add questions like this for all languages"):
 * every translation and Words lesson whose unit has a word with a picture asks one — its meaning in the student's
 * language, three picture cards in the language learnt — in the English course for every student language and in
 * every course; checked here; a wrong card kept as a mistake and put right in the mistakes practice.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { languages } = require('../../src/linguistic/languages');
const { PICTURES } = require('../../src/linguistic/content/pictures');
const { ALIKE } = require('../../src/linguistic/pictureAsk');
const { unlockIds } = require('./unlock');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect().catch(() => {}));

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
const CODES = languages().map((l) => l.code).filter((c) => c !== 'en');
const PICS = new Set(Object.values(PICTURES));
const alike = (a, b) => ALIKE.some((g) => g.includes(a) && g.includes(b));
const englishOfPic = (pic) => Object.keys(PICTURES).find((k) => PICTURES[k] === pic);

describe('which of these is …? (picture cards)', () => {
    test('in the translation and Words lessons with a picture word: the English course for all 20 languages, and all 20 courses', async () => {
        for (const code of CODES) {
            for (const [course, language] of [[null, code], [code, code === 'hi' ? 'kn' : 'hi']]) {
                const docs = await LinguisticLesson.find({ course, module: { $in: ['translation', 'vocabulary'] }, review: null, status: 'published', deletedAt: null }).lean();
                let asked = 0;
                for (const doc of docs) {
                    const l = svc.serve(doc, progressIn(language, course));
                    if (!['translation', 'vocabulary'].includes(l.module) || !l.pictures?.length) continue;
                    asked += 1;
                    const at = `${course || 'en'} for ${language} ${doc.seedKey}`;
                    assert.equal(l.pictures.length, 1, `${at}: one`);
                    const q = l.pictures[0];
                    assert.equal(q.type, 'picture');
                    assert.equal(q.options.length, 3, `${at}: three cards`);
                    assert.equal(new Set(q.options).size, 3, `${at}: three words`);
                    assert.ok(q.options.includes(q.answer), `${at}: the right one among them`);
                    const pics = q.options.map((o) => q.pics[o]);
                    assert.ok(pics.every((p) => PICS.has(p)) && new Set(pics).size === 3, `${at}: each its own picture`);
                    const ens = pics.map(englishOfPic);
                    for (const a of ens) for (const b of ens) if (a !== b) assert.ok(!alike(a, b), `${at}: ${a} and ${b} not side by side`);
                    // The meaning asked is in the student's language; the cards in the language learnt.
                    assert.ok(q.ask && q.ask !== q.answer, `${at}: "${q.ask}" asked, "${q.answer}" chosen`);
                    assert.equal(q.sayLang, course ? l.targetLocale : 'en-IN', `${at}: the cards read in the language learnt`);
                    assert.equal(svc.judge(l, q, q.answer, 'picture').correct, true, `${at}: right`);
                    assert.equal(svc.judge(l, q, q.options.find((x) => x !== q.answer), 'picture').correct, false, `${at}: wrong`);
                    const pub = svc.publicQuestion(q, 'x');
                    assert.equal(pub.answer, undefined, `${at}: not which is right`);
                    assert.deepEqual([pub.type, pub.ask, pub.options.length, Object.keys(pub.pics).length], ['picture', q.ask, 3, 3]);
                }
                assert.ok(asked >= 10, `${course || 'en'} for ${language}: lessons with a picture question (${asked})`);
            }
        }
    });

    test('a unit with no word that has a picture asks none (an Advanced unit of ideas)', async () => {
        const docs = await LinguisticLesson.find({ course: null, level: 'advanced', module: 'vocabulary', review: null, status: 'published', deletedAt: null }).lean();
        const none = docs.map((doc) => svc.serve(doc, progressIn('kn'))).filter((l) => !l.pictures);
        assert.ok(none.length > 0, 'some Advanced Words lessons have no picture question');
    });
});

describe('spell the word (letter tiles)', () => {
    // 2026-11-13, the user's picture: a dress and its letters D R E S S as tiles ("do the same in multilingo").
    test('in every Words lesson with a picture word: the English course for all 20 languages, and all 20 courses — its letters mixed, its picture and meaning', async () => {
        const { letters } = require('../../src/linguistic/pictureAsk');
        for (const code of CODES) {
            for (const [course, language] of [[null, code], [code, code === 'hi' ? 'kn' : 'hi']]) {
                const docs = await LinguisticLesson.find({ course, module: 'vocabulary', review: null, status: 'published', deletedAt: null }).lean();
                let asked = 0;
                for (const doc of docs) {
                    const l = svc.serve(doc, progressIn(language, course));
                    if (l.module !== 'vocabulary' || !l.spells?.length) continue;
                    asked += 1;
                    const at = `${course || 'en'} for ${language} ${doc.seedKey}`;
                    const q = l.spells[0];
                    assert.equal(q.type, 'letters');
                    assert.deepEqual([...q.words].sort(), [...letters(q.answer)].sort(), `${at}: the tiles are its letters`);
                    assert.notEqual(q.words.join(''), q.answer, `${at}: mixed up`);
                    assert.ok(PICS.has(q.pic), `${at}: its picture`);
                    assert.ok(q.ask && q.ask !== q.answer, `${at}: its meaning asked`);
                    // Another word than the picture cards, where the unit has another that can be spelt.
                    const first = (x) => String(x || '').split(/\s*[,;/、，،]\s*/)[0];
                    const spellable = (l.words || []).filter((w) => PICTURES[String(course ? w.en : w.word).trim().toLowerCase()] && !/\s/.test(first(w.word)) && letters(first(w.word)).length >= 2 && first(w.word) !== first(w.kannada));
                    if (l.pictures?.[0] && spellable.length >= 2) assert.notEqual(l.pictures[0].id.replace('pic~', ''), q.id.replace('spell~', ''), `${at}: another word than the picture cards`);
                    assert.equal(svc.judge(l, q, letters(q.answer).join(' '), 'quiz').correct, true, `${at}: spelt right`);
                    assert.equal(svc.judge(l, q, q.words.join(' '), 'quiz').correct, false, `${at}: mixed up is wrong`);
                    const pub = svc.publicQuestion(q, 'x');
                    assert.deepEqual([pub.answer, pub.type, pub.words.length], [undefined, 'letters', q.words.length], `${at}: not the word`);
                    assert.ok(svc.quizOf(l).some((x) => x.id === q.id), `${at}: in the quiz`);
                }
                assert.ok(asked >= 6, `${course || 'en'} for ${language}: Words lessons with a word to spell (${asked})`);
            }
        }
    });
});

describe('choose the picture (the word in the language learnt)', () => {
    // 2026-11-13, the user's picture: "Select the correct picture for “사슴”" — four animals, each with its name.
    test('in every Words lesson with a picture word, the English course for all 20 languages and all 20 courses: the word, four pictures in the student\'s language, in the practice', async () => {
        for (const code of CODES) {
            for (const [course, language] of [[null, code], [code, code === 'hi' ? 'kn' : 'hi']]) {
                const docs = await LinguisticLesson.find({ course, module: 'vocabulary', review: null, status: 'published', deletedAt: null }).lean();
                let asked = 0;
                for (const doc of docs) {
                    const l = svc.serve(doc, progressIn(language, course));
                    if (l.module !== 'vocabulary' || !l.sees?.length) continue;
                    asked += 1;
                    const at = `${course || 'en'} for ${language} ${doc.seedKey}`;
                    const q = l.sees[0];
                    assert.equal(q.type, 'seeword');
                    assert.equal(q.options.length, 4, `${at}: four pictures`);
                    assert.equal(new Set(q.options).size, 4, `${at}: four meanings`);
                    const pics = q.options.map((o) => q.pics[o]);
                    assert.ok(pics.every((x) => PICS.has(x)) && new Set(pics).size === 4, `${at}: each its own picture`);
                    const ens = pics.map(englishOfPic);
                    for (const a of ens) for (const b of ens) if (a !== b) assert.ok(!alike(a, b), `${at}: ${a} and ${b} not side by side`);
                    assert.ok(q.options.includes(q.answer) && q.ask && q.ask !== q.answer, `${at}: "${q.ask}" — "${q.answer}"`);
                    assert.equal(q.sayLang, course ? l.targetLocale : 'en-IN', `${at}: heard in the language learnt`);
                    assert.equal(svc.judge(l, q, q.answer, 'see').correct, true, `${at}: right`);
                    assert.equal(svc.judge(l, q, q.options.find((x) => x !== q.answer), 'see').correct, false, `${at}: wrong`);
                    const pub = svc.publicQuestion(q, 'x');
                    assert.deepEqual([pub.answer, pub.type, pub.ask, pub.options.length], [undefined, 'seeword', q.ask, 4], `${at}: not which`);
                    assert.ok(!svc.quizOf(l).some((x) => x.id === q.id), `${at}: in the practice, not the quiz`);
                }
                assert.ok(asked >= 6, `${course || 'en'} for ${language}: Words lessons with it (${asked})`);
            }
        }
    });
});

describe('which of these is …? through the routes', () => {
    let app, u;
    before(async () => {
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        u = await makeUser('Ling Picture Kannada');
        assert.equal((await app.call(u.token)('POST', '/language', { language: 'kn' })).status, 200);
    });
    const extra = [];
    after(async () => { await cleanup([u.user, ...extra], app.server); });

    test('a Kannada speaker learning English: the meaning in Kannada, English words on the cards; wrong → a mistake; right → fixed', async () => {
        const api = app.call(u.token);
        const doc = await LinguisticLesson.findOne({ seedKey: 'vocab-beginner-1', course: null }).lean();
        await unlockIds(u.user, [doc._id]);
        const q = (await api('GET', `/lessons/${doc._id}`)).body.pictures?.[0];
        assert.ok(q, 'a picture question');
        assert.equal(q.answer, undefined, 'the answer not sent');
        assert.match(q.ask, /\p{Script=Kannada}/u, `the meaning in Kannada (${q.ask})`);
        assert.ok(q.options.every((o) => /^[a-z ]+$/i.test(o)), `English words on the cards (${q.options})`);
        const right = svc.findQuestion(svc.serve(doc, await svc.progressOf(u.user._id)), 'picture', q.id).answer;
        const r = await api('POST', `/lessons/${doc._id}/check`, { section: 'picture', id: q.id, given: q.options.find((o) => o !== right) });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual([r.body.correct, r.body.answer], [false, right]);
        const m = (await api('GET', '/review')).body.mistakes.find((x) => x.question.id === q.id);
        assert.ok(m && m.question.type === 'picture' && m.question.ask === q.ask, 'kept as a mistake, to answer again');
        const again = await api('POST', `/review/${m.id}`, { given: right });
        assert.deepEqual([again.body.correct, again.body.resolved], [true, true]);
    });

    test('choose the picture through the routes: a Korean word for an English speaker; wrong → a mistake; right → fixed', async () => {
        const v = await makeUser('Ling See Korean');
        try {
            const api = app.call(v.token);
            assert.equal((await api('POST', '/language', { language: 'en' })).status, 200);
            assert.equal((await api('POST', '/course', { course: 'ko', start: 'beginner' })).status, 200);
            const doc = await LinguisticLesson.findOne({ seedKey: 'ko:vocab-beginner-1' }).lean();
            await unlockIds(v.user, [doc._id]);
            const q = (await api('GET', `/lessons/${doc._id}`)).body.sees?.[0];
            assert.ok(q, 'the question');
            assert.match(q.ask, /\p{Script=Hangul}/u, `the word in Korean (${q.ask})`);
            assert.ok(q.options.every((o) => /^[a-z ]+$/i.test(o)), `the pictures named in English (${q.options})`);
            const right = svc.findQuestion(svc.serve(doc, await svc.progressOf(v.user._id)), 'see', q.id).answer;
            const r = await api('POST', `/lessons/${doc._id}/check`, { section: 'see', id: q.id, given: q.options.find((o) => o !== right) });
            assert.deepEqual([r.status, r.body.correct, r.body.answer], [200, false, right]);
            const m = (await api('GET', '/review')).body.mistakes.find((x) => x.question.id === q.id);
            assert.ok(m && m.question.type === 'seeword', 'kept as a mistake');
            assert.equal((await api('POST', `/review/${m.id}`, { given: right })).body.resolved, true);
        } finally { /* the user is removed with the others */ extra.push(v.user); }
    });

    // 2026-11-12, the user: "a few practice questions, more quiz questions than practice" (chose "move them into the
    // quiz"): fill in the blanks, tap what you hear, the conversation and the picture cards are in the quiz.
    test('the quiz holds the blanks, the listening, the conversation and the picture cards: checked one by one, scored, a wrong one kept as itself', async () => {
        const api = app.call(u.token);
        for (const seedKey of ['vocab-beginner-1', 'translation-beginner-en-kn']) {
            const doc = await LinguisticLesson.findOne({ seedKey, course: null }).lean();
            await unlockIds(u.user, [doc._id]);
            const quiz = (await api('GET', `/lessons/${doc._id}`)).body.quiz;
            const types = quiz.map((q) => q.type);
            for (const t of ['blanks', 'hear', 'chat', 'picture']) assert.ok(types.includes(t), `${seedKey}: a ${t} question in the quiz (${types})`);
            assert.ok(quiz.length >= 8, `${seedKey}: the quiz now ${quiz.length}`);
            const pic = quiz.find((q) => q.type === 'picture');
            const served = svc.serve(doc, await svc.progressOf(u.user._id));
            const right = svc.findQuestion(served, 'quiz', pic.id)?.answer;
            assert.ok(right, `${seedKey}: the picture question found in the quiz`);
            const c = await api('POST', `/lessons/${doc._id}/quiz/check`, { id: pic.id, given: right });
            assert.deepEqual([c.status, c.body.correct], [200, true], `${seedKey}: checked as a quiz question`);
            // Submitted with the picture card wrong and the rest unanswered: scored, and the card kept as a picture mistake.
            const r = await api('POST', `/lessons/${doc._id}/quiz`, { answers: { [pic.id]: pic.options.find((o) => o !== right) } });
            assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
            assert.equal(r.body.total, quiz.length, 'every quiz question counts');
            const back = r.body.results.find((x) => x.id === pic.id);
            assert.deepEqual([back.correct, back.prompt], [false, pic.ask], 'its result named by the meaning asked');
            const m = (await api('GET', '/review')).body.mistakes.find((x) => x.question.id === pic.id);
            assert.ok(m && m.question.type === 'picture', `${seedKey}: a picture mistake, to answer again`);
            assert.deepEqual((await api('POST', `/review/${m.id}`, { given: right })).body.resolved, true);
        }
    });
});
