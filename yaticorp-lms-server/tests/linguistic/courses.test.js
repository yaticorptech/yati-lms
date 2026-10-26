/**
 * Courses in the other languages (asked 2026-10-23): a student can learn any
 * language there are words and sentences for, from their own language — a
 * Hindi speaker learning Kannada, a Kannada speaker learning Japanese. Such a
 * course is Vocabulary and Translation, Beginner to Advanced; its levels and
 * certificates are its own, apart from the English course.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');
const courses = require('../../src/linguistic/courses');
const { unlockIds } = require('./unlock');
/** A level's lessons along the path (topic units, 2026-10-24). */
const lessonsOf = (level) => level.units.flatMap((u) => u.lessons.filter((x) => !x.stop));

let app, hindi, kannada, admin, api, knApi, adminApi;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    hindi = await makeUser('Ling Course Hindi'); kannada = await makeUser('Ling Course Kannada'); admin = await makeAdmin('Ling Course');
    api = app.call(hindi.token); knApi = app.call(kannada.token); adminApi = app.call(admin.token);
    await require('../../src/linguistic/seed').ensureSeeded();
});
after(async () => {
    await require('../../src/models/Admin').deleteMany({ _id: admin.admin._id });
    await cleanup([hindi.user, kannada.user], app.server);
});

/** The answers to a lesson's quiz, worked out here as the server would (the student never sees them). */
const answersFor = async (id, language) => {
    const lesson = svc.serve(await LinguisticLesson.findById(id).lean(), { language });
    return Object.fromEntries(svc.quizOf(lesson).map((q) => [q.id, q.answer ?? q.model]));
};
const KANNADA = /[ಀ-೿]/, DEVANAGARI = /[ऀ-ॿ]/, JAPANESE = /[぀-ヿ一-鿿]/;

describe('courses', () => {
    test('every language with words and sentences is a course; English by default', async () => {
        const d = (await api('GET', '/')).body;
        assert.equal(d.course.code, 'en');
        assert.equal(d.courses.length, 21);
        assert.deepEqual(d.courses.slice(0, 3).map((c) => c.code), ['en', 'kn', 'hi']);
        assert.ok(d.courses.find((c) => c.code === 'ja' && !c.full));
    });

    test('choosing one: not an unknown language, not the one you speak, a real level', async () => {
        assert.equal((await api('POST', '/language', { language: 'hi' })).status, 200);
        assert.equal((await api('POST', '/course', { course: 'xx' })).status, 400);
        assert.equal((await api('POST', '/course', { course: 'hi' })).status, 400, 'Hindi is their own');
        assert.equal((await api('POST', '/course', { course: 'kn', start: 'expert' })).status, 400);
        const r = await api('POST', '/course', { course: 'kn', start: 'beginner' });
        assert.equal(r.status, 200);
        assert.deepEqual([r.body.course.code, r.body.course.name, r.body.started], ['kn', 'Kannada', true]);
        assert.equal((await api('POST', '/language', { language: 'kn' })).status, 400, 'nor can they say they speak the language they learn');
    });

    test('the course path: Vocabulary and Translation only, Beginner open', async () => {
        const path = (await api('GET', '/path')).body;
        assert.equal(path.course.code, 'kn');
        const modules = new Set(path.levels.flatMap((l) => lessonsOf(l).map((x) => x.module)));
        assert.deepEqual([...modules].sort(), ['translation', 'vocabulary']);
        assert.equal(path.levels.find((l) => l.level === 'beginner').open, true);
        assert.equal(path.levels.find((l) => l.level === 'advanced').open, false);
        assert.deepEqual(path.levels[0].units.map((u) => u.title), ['Family', 'Food, size and feelings', 'School and friends', 'Read and write', 'Getting around', 'Weather', 'Level review'], 'the same units as English');
        assert.deepEqual(path.levels[0].units[0].lessons.map((x) => x.stop || x.review || x.module), ['vocabulary', 'translation', 'chest', 'hear', 'practice', 'unit']);
        assert.ok(lessonsOf(path.levels[0]).some((x) => /write in Kannada/.test(x.title)));
    });

    test('a vocabulary lesson: Kannada words, their meanings in Hindi, questions both ways', async () => {
        const path = (await api('GET', '/path')).body;
        const first = path.levels[0].units[0].lessons[0];
        const l = (await api('GET', `/lessons/${first.id}`)).body;
        assert.deepEqual([l.target, l.targetName, l.language], ['kn', 'Kannada', 'hi']);
        assert.equal(l.words.length, 4, 'the first unit\'s half of the topic\'s words');
        for (const w of l.words) { assert.match(w.word, KANNADA); assert.match(w.kannada, DEVANAGARI); }
        // Asked in the language they know (Hindi), answered in the one they learn (Kannada) — 2026-10-24.
        const prompts = l.quiz.map((q) => q.prompt).join('\n');
        assert.match(prompts, /"[ಀ-೿, ]+" का अर्थ क्या है\?/, 'what a Kannada word means, asked in Hindi');
        assert.match(prompts, /किस शब्द का अर्थ "[ऀ-ॿ, ]+" है\?/, 'which word means a Hindi meaning, asked in Hindi');
        const which = l.quiz.find((q) => /किस शब्द/.test(q.prompt));
        assert.ok(which.options.every((o) => KANNADA.test(o)), 'its choices are Kannada words');
        assert.ok(!/[A-Za-z]{3}/.test(prompts), 'no English in the questions');
        assert.ok(!l.quiz.some((q) => 'answer' in q), 'no answers sent ahead');
    });

    test('each level has four reviews, locked until the unit’s lessons are done; Listen and pick asks by sound', async () => {
        const path = (await api('GET', '/path')).body;
        const unitEnd = path.levels[0].units[0].lessons.at(-1);
        assert.deepEqual([unitEnd.title, unitEnd.open], ['Unit review', false], 'each unit ends with its review');
        const levelReview = path.levels[0].units.at(-1);
        assert.deepEqual(levelReview.lessons.map((l) => [l.title, l.open]), [['Word review', false], ['Listen and pick', false], ['Sentence review', false], ['Level checkpoint', false]]);
        const listen = svc.serve(await LinguisticLesson.findById(levelReview.lessons[1].id).lean(), { language: 'hi' });
        const q = svc.quizOf(listen)[0];
        assert.match(q.say, KANNADA); assert.equal(q.sayLang, 'kn-IN'); assert.ok(q.options.includes(q.answer));
        assert.deepEqual(Object.keys(svc.publicQuestion(q, 's')).sort(), ['audio', 'id', 'meaning', 'options', 'prompt', 'promptEn', 'say', 'sayLang', 'type']);
        assert.equal(q.prompt, 'सुनिए, और जो शब्द सुनाई दे उसे चुनिए', 'asked in Hindi');
        const check = svc.serve(await LinguisticLesson.findById(levelReview.lessons[3].id).lean(), { language: 'hi' });
        assert.deepEqual([...new Set(check.quiz.map((x) => x.direction))].sort(), ['en-kn', 'kn-en'], 'both directions');
    });

    test('finishing Beginner: a Kannada certificate, and the English course untouched', async () => {
        for (let guard = 0; guard < 40; guard++) {
            const path = (await api('GET', '/path')).body;
            const next = lessonsOf(path.levels[0]).find((x) => x.open && x.status !== 'completed');
            if (!next) break;
            const r = await api('POST', `/lessons/${next.id}/quiz`, { answers: await answersFor(next.id, 'hi') });
            assert.equal(r.body.passed, true, `${next.title} passed`);
        }
        const path = (await api('GET', '/path')).body;
        const beginner = path.levels.find((l) => l.level === 'beginner');
        assert.equal(beginner.complete, true);
        assert.ok(beginner.certificate?.number.startsWith('YATI-KN-'), 'the certificate names the course');
        assert.equal(path.levels.find((l) => l.level === 'intermediate').open, true);

        const certs = (await api('GET', '/certificates')).body.certificates;
        assert.deepEqual(certs.map((c) => [c.level, c.course, c.courseName]), [['beginner', 'kn', 'Kannada']]);
        const pdf = await api('GET', '/certificates/beginner/pdf?course=kn');
        assert.equal(pdf.status, 200);
        assert.equal((await api('GET', '/certificates/beginner/pdf?course=en')).status, 404);

        // Back to English: its own path, nothing completed there, not started (no level yet).
        const back = await api('POST', '/course', { course: 'en' });
        assert.deepEqual([back.body.course.code, back.body.started], ['en', false]);
        const en = (await api('GET', '/path')).body;
        assert.ok(lessonsOf(en.levels[0]).some((x) => x.module === 'grammar'));
        assert.equal(en.levels.find((l) => l.level === 'beginner').complete, false);
        // And to Kannada again: still where they were.
        await api('POST', '/course', { course: 'kn' });
        assert.equal((await api('GET', '/path')).body.levels.find((l) => l.level === 'beginner').complete, true);
    });

    test('a unit\'s treasure chest: opened once for bonus XP, once the lesson before it is done', async () => {
        const before = (await api('GET', '/path')).body.levels[0].units[0].lessons.find((n) => n.stop === 'chest');
        assert.deepEqual([before.open, before.status], [true, 'new']);
        const r = await api('POST', '/chest/beginner-1');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.opened, true); assert.ok(r.body.xp > 0, 'bonus XP');
        assert.equal((await api('POST', '/chest/beginner-1')).status, 409, 'once');
        assert.equal((await api('POST', '/chest/intermediate-1')).status, 409, 'not before the lesson before it');
        assert.equal((await api('POST', '/chest/nowhere-9')).status, 404);
        const after = (await api('GET', '/path')).body.levels[0].units[0].lessons.find((n) => n.stop === 'chest');
        assert.equal(after.status, 'completed');
    });

    test('the daily challenge is about the course’s words', async () => {
        const d = (await api('GET', '/daily')).body;
        assert.ok(d.questions.length > 0);
        for (const q of d.questions) {
            assert.ok(/[ऀ-ॿ]/.test(q.prompt) && !/[A-Za-z]{3}/.test(q.prompt), `asked in Hindi: ${q.prompt}`);
            assert.ok(KANNADA.test(q.prompt) || q.options.every((o) => KANNADA.test(o)), `about Kannada words: ${q.prompt}`);
        }
    });

    test('a Kannada speaker learning Japanese: write Japanese from Kannada, read it back', async () => {
        assert.equal((await knApi('POST', '/language', { language: 'kn' })).status, 200);
        assert.equal((await knApi('POST', '/course', { course: 'ja' })).body.started, true, 'from scratch: Beginner');
        const path = (await knApi('GET', '/path')).body;
        const lessons = lessonsOf(path.levels[0]).filter((x) => x.module === 'translation');
        assert.ok(lessons.every((x) => !x.open), 'along the path: the unit\'s Words come first');
        await unlockIds(kannada.user, lessons.map((x) => x.id));
        const write = lessons.find((x) => x.direction === 'kn-en'), read = lessons.find((x) => x.direction === 'en-kn');
        assert.ok(write && read, 'both directions');

        const w = (await knApi('GET', `/lessons/${write.id}`)).body;
        assert.deepEqual([w.target, w.language], ['ja', 'kn']);
        const item = w.items.find((i) => !i.open);
        assert.match(item.source, KANNADA);
        const doc = svc.serve(await LinguisticLesson.findById(write.id).lean(), { language: 'kn' });
        const model = doc.items.find((i) => i.id === item.id).model;
        assert.match(model, JAPANESE);
        const ok = (await knApi('POST', `/lessons/${write.id}/check`, { section: 'items', id: item.id, given: model })).body;
        assert.equal(ok.verdict, 'exact');
        const wrong = (await knApi('POST', `/lessons/${write.id}/check`, { section: 'items', id: item.id, given: 'こんにちは' })).body;
        assert.equal(wrong.correct, false);

        const r = (await knApi('GET', `/lessons/${read.id}`)).body;
        const ri = r.items.find((i) => !i.open);
        assert.match(ri.source, JAPANESE);
        const rdoc = svc.serve(await LinguisticLesson.findById(read.id).lean(), { language: 'kn' });
        assert.match(rdoc.items.find((i) => i.id === ri.id).model, KANNADA);
        // Japanese with no tiles cut for it is typed, never one tile holding the whole answer.
        for (const x of [...w.items, ...r.items]) if (x.bank) assert.ok(x.bank.length > 1, `${x.id}: a real word bank`);
    });

    test('every course lesson builds, in every language a student can speak', () => {
        for (const stub of courses.stubs()) {
            for (const helper of courses.courseCodes().filter((c) => c !== stub.course)) {
                const l = courses.build(stub, helper);
                const n = stub.module === 'vocabulary' ? l.words.length : l.items.length + l.quiz.length;
                assert.ok(n > 0, `${stub.seedKey} from ${helper}`);
            }
        }
    });

    test('administrators manage the English lessons; the course stubs are not in their list', async () => {
        const r = await adminApi('GET', '/admin/lessons');
        assert.equal(r.status, 200);
        assert.ok(r.body.lessons.length > 0);
        assert.ok(!r.body.lessons.some((l) => String(l.seedKey || '').includes(':') || l.course), 'no course stubs');
    });
});
