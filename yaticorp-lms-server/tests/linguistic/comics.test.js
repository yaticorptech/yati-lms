/**
 * Picture stories for Advanced (asked 2026-10-31: "in advanced level give stories like this [a comic page] — don't
 * copy, refer to it — then ask questions on it; make the interface like it too"): four original folk tales in comic
 * panels, each in the Stories track after its topic's article, read and then asked about in five questions.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const comics = require('../../src/linguistic/comics');
const svc = require('../../src/linguistic/service');
const { placeAt } = require('./unlock');

let app, s, api;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    s = await makeUser('Ling Comics');
    api = app.call(s.token);
    assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
    await placeAt(s.user, 'advanced');
});
after(async () => { await cleanup([s.user], app.server); });

describe('picture stories', () => {
    test('every story is whole: each speaker in the panel, the first to speak on the left; five questions, the answer among four different choices', () => {
        assert.equal(comics.STORIES.length, 4);
        assert.equal(new Set(comics.STORIES.map((x) => x.theme)).size, 4, 'each story its own look');
        const ALL = ['kn', 'hi', 'ta', 'te', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'ur', 'ar', 'ru', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko'];
        assert.deepEqual([...new Set(comics.stubs().map((x) => x.course))].sort(), [null, ...ALL].sort(), 'in English and every other language (2026-11-02)');
        for (const st of comics.stubs()) {
            const l = comics.build(st, 'kn');
            assert.ok(l.comic.panels.length >= 7, st.title);
            if (st.course) {
                const en = comics.build({ ...st, course: null }, 'kn');
                assert.ok(l.comic.panels.every((p, i) => !!p.caption === !!en.comic.panels[i].caption && !!p.narration === !!en.comic.panels[i].narration && (p.say || []).length === (en.comic.panels[i].say || []).length), `${st.title}: every word in its place`);
                assert.ok(l.comic.panels.every((p) => (p.say || []).every((b) => b.text && b.text !== en.comic.panels[0].narration)), `${st.title}: its own words`);
                assert.ok(l.comic.locale && l.comic.locale !== 'en-IN', `${st.title}: read aloud in its language`);
                assert.notEqual(l.comic.moralLabel, undefined, st.title);
            }
            assert.ok(l.comic.panels[0].title, `${st.title}: its title on the first panel`);
            assert.ok(l.comic.moral, `${st.title}: a moral at its end`);
            assert.ok(l.comic.panels.some((p) => p.zoom), `${st.title}: a close-up`);
            l.comic.panels.forEach((p, i) => {
                for (const c of p.cast) assert.ok(l.comic.people[c.who], `${st.title} panel ${i + 1}: ${c.who}`);
                const xs = (p.say || []).map((b) => p.cast.find((c) => c.who === b.who)?.x);
                assert.ok(xs.every((x) => x != null), `${st.title} panel ${i + 1}: every speaker drawn`);
                assert.deepEqual(xs, [...xs].sort((a, b) => a - b), `${st.title} panel ${i + 1}: read left to right`);
                if (!st.course) assert.ok((p.say || []).every((b) => b.name), 'each bubble with its speaker’s name, to read aloud');
            });
            assert.equal(l.quiz.length, 5);
            for (const q of l.quiz) {
                assert.equal(new Set(q.options).size, 4, q.prompt);
                assert.ok(q.options.includes(q.answer), q.prompt);
                assert.ok(q.explanation, q.prompt);
            }
        }
    });

    test('in the Stories track, each after its topic\'s article, a "Picture story" stop', async () => {
        const stories = (await api('GET', '/path')).body.levels.find((l) => l.level === 'advanced').units.find((u) => u.id === 'advanced-stories');
        const titles = stories.lessons.map((x) => x.title);
        const pics = stories.lessons.filter((x) => x.review === 'comic');
        assert.deepEqual(pics.map((x) => x.title), comics.STORIES.map((x) => `Picture story: ${x.title}`));
        assert.ok(pics.every((x) => x.type === 'comic'));
        assert.equal(titles.indexOf('Picture story: The Shared Well'), 1, 'after the first article');
        assert.equal(stories.lessons[0].open, true);
    });

    test('opened: its panels and five questions without their answers; all right, it is passed', async () => {
        const doc = await LinguisticLesson.findOne({ seedKey: 'comic-advanced-1' }).lean();
        const progress = await svc.progressOf(s.user._id);
        progress.lessons.push(...(await svc.lessonsFor(progress)).filter((l) => l.level === 'advanced' && l.module === 'reading' && !l.review && Number(l.order) === 1)
            .map((l) => ({ lessonId: l._id, module: l.module, level: l.level, status: 'completed', step: 'done', bestScore: 100, completedAt: new Date() })));
        await progress.save();
        const r = await api('GET', `/lessons/${doc._id}`);
        assert.equal(r.status, 200);
        assert.equal(r.body.review, 'comic');
        assert.equal(r.body.comic.title, 'The Shared Well');
        assert.equal(r.body.comic.panels.length, 8);
        assert.match(r.body.learn.intro, /panel by panel/);
        assert.equal(r.body.quiz.length, 5);
        assert.ok(r.body.quiz.every((q) => q.answer === undefined && q.options.length === 4), 'no answers sent');
        const answers = Object.fromEntries(comics.build(doc, 'kn').quiz.map((q) => [q.id, q.answer]));
        const done = await api('POST', `/lessons/${doc._id}/quiz`, { answers });
        assert.deepEqual([done.body.percent, done.body.passed], [100, true]);
    });
});

describe('the people\'s names in a picture story', () => {
    test('each named person has their name to show under them, in every language — spelt as that language\'s story spells it (2026-11-05)', () => {
        const { LANGS } = require('../../src/linguistic/content/comicLangs');
        const textOf = (pack) => JSON.stringify(pack);
        for (const s of comics.STORIES) {
            for (const code of [null, ...Object.keys(LANGS[s.order] || {})]) {
                const stub = comics.stubs().find((x) => x.order === s.order && (x.course || null) === code);
                if (!stub) continue;
                const { people } = comics.build(stub, 'en').comic;
                for (const [key, p] of Object.entries(people)) {
                    const at = `${s.title} (${code || 'en'}) ${key}`;
                    if (!comics.NAMES[p.name]) { assert.equal(p.tag, undefined, `${at}: no name, none shown`); continue; }
                    assert.ok(p.tag, `${at}: its name`);
                    // Where the English story says the name, the language's story writes it as the tag does.
                    const said = JSON.stringify({ panels: s.panels.map((x) => [x.caption, x.narration, ...(x.say || []).map((b) => b.text)]), questions: s.questions }).includes(p.name);
                    if (code && said && !['es', 'fr', 'de', 'pt'].includes(code)) assert.ok(textOf(LANGS[s.order][code]).includes(p.tag), `${at}: "${p.tag}" as its story writes it`);
                }
            }
        }
    });
});

// 2026-11-06, the user's picture (an Arabic story's question): "how will the student understand this language?" — in a
// course, each question and each of its choices carries its English, sent with it for a tap; the story's title too.
describe('a course\'s picture story in English, for a tap', () => {
    test('every question and every choice, in all 20 courses; the English story\'s own words; the answers not given away', () => {
        const courses = new Set();
        for (const stub of comics.stubs().filter((s) => s.course)) {
            const b = comics.build(stub, 'en'), s = comics.storyOf(stub);
            courses.add(stub.course);
            assert.equal(b.comic.titleEn, s.title, `${stub.seedKey}: its title in English`);
            b.quiz.forEach((q, i) => {
                const at = `${stub.seedKey} ${q.id}`;
                assert.equal(q.promptMeaning, s.questions[i].prompt, `${at}: the question in English`);
                assert.deepEqual(q.options.map((o) => q.optionMeanings[o]), [s.questions[i].answer, ...s.questions[i].others], `${at}: each choice in English`);
                const shown = svc.publicQuestion(q, 'x');
                assert.equal(shown.answer, undefined, `${at}: no answer sent`);
                assert.deepEqual([shown.promptMeaning, shown.meaningLang, Object.keys(shown.optionMeanings).sort()], [q.promptMeaning, 'en', [...q.options].sort()], `${at}: sent with it`);
            });
        }
        assert.equal(courses.size, 20);
        const english = comics.build(comics.stubs().find((s) => !s.course), 'kn');
        assert.ok(english.quiz.every((q) => !q.optionMeanings), 'the English course\'s story: none (it is asked in English)');
    });
});
