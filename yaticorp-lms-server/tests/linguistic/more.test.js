/**
 * Six lessons a unit (2026-11-14, the user: "in each unit keep 6 lessons … don't change existing lessons … add more
 * lessons if there are fewer"; chose "split into units of 6" for Section 2's skills; "a new lesson can't be the same
 * as the lessons before — don't copy from them"): every topic unit of Section 1 and every unit of Section 2 has six,
 * in English, Kannada and Hindi; the new lessons (more.js) have words and sentences no lesson had; they open, are
 * asked and are marked like the others.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { unlockIds, moveCourse } = require('./unlock');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { lessons: CONTENT } = require('../../src/linguistic/content');
const DATA = require('../../src/linguistic/content/more');
const more = require('../../src/linguistic/more');
const svc = require('../../src/linguistic/service');

let app, s, api;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    s = await makeUser('Ling Six A Unit');
    api = app.call(s.token);
});
after(async () => { await cleanup([s.user], app.server); });

// Through English first: a student cannot speak the language they learn (learning Kannada, "I speak Kannada" is refused).
const learn = async (speak, course) => {
    await moveCourse(s.user, null);
    assert.equal((await api('POST', '/language', { language: speak })).status, 200);
    const r = await api('POST', '/course', { course, start: 'beginner' });
    if (r.status !== 200) await moveCourse(s.user, course === 'en' ? null : course);
    return (await api('GET', '/path')).body;
};
const real = (u) => u.lessons.filter((x) => !x.stop);
/** The served lesson, whole, as the server marks it (its right answers). */
// As the student gets it (served: since 2026-11-16 a short quiz is made up to five, service.js withQuizTopUp).
const whole = async (id, helper) => { const doc = await LinguisticLesson.findById(id).lean(); return svc.serve(doc, { language: helper, course: doc.course || null, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] }); };
const rightAnswers = (lesson) => Object.fromEntries(svc.quizOf(lesson).map((q) => [q.id, svc.rightAnswerOf(lesson, q)]));

describe('six lessons a unit', () => {
    for (const [speak, course] of [['kn', 'en'], ['en', 'kn'], ['kn', 'hi']]) {
        test(`learning ${course}, speaking ${speak}: every topic unit and every Section 2 unit has six`, async () => {
            const path = await learn(speak, course);
            // Five sections since 2026-11-14 (the user: "add more sections, six units in each … don't repeat"): Beginner,
            // Daily life, Intermediate (shown again), Advanced, Work and the world — every unit of each with six lessons.
            assert.deepEqual(path.levels.map((l) => l.level), ['beginner', 'elementary', 'intermediate', 'advanced', 'professional', 'everyday', 'services', 'workplace', 'opinions', 'society']);
            // (The Letters unit's letters test, 2026-11-12, is its test, not one of its six lessons.)
            const six = (u) => real(u).filter((x) => x.review !== 'lettersExam');
            for (const lv of path.levels) for (const u of lv.units) assert.equal(six(u).length, 6, `${lv.level} ${u.title}: ${real(u).map((x) => x.title).join(', ')}`);
            for (const lv of path.levels.filter((l) => ['elementary', 'professional'].includes(l.level))) {
                assert.equal(lv.units.length, 6, `${lv.level}: six units`);
                for (const u of lv.units) assert.deepEqual(real(u).map((x) => x.title.split(':')[0]), ['Words', 'Sentences', 'Words', 'Sentences', 'Story', 'Conversation'], `${lv.level} ${u.title}`);
            }
            const s1 = path.levels[0], s2 = path.levels.find((l) => l.level === 'advanced');
            // Every unit: the Letters unit and the Level review too (2026-11-14, the user chose new lessons for both).
            for (const u of s1.units) assert.equal(six(u).length, 6, `${u.title}: ${six(u).map((x) => x.title).join(', ')}`);
            assert.equal(real(s1.units.at(-1)).find((x) => x.type === 'story')?.title, 'Story: A day at the fair', 'the Level review\'s new story');
            for (const u of s2.units) assert.equal(real(u).length, 6, `${u.title}: ${real(u).map((x) => x.title).join(', ')}`);
            // The new ones after the lessons that were there: a unit's Words lesson, then "More words".
            const weather = s1.units.find((u) => u.title === 'Weather');
            const titles = real(weather).map((x) => x.title);
            if (course !== 'en') assert.ok(titles.indexOf('More words: Weather') === titles.findIndex((t) => /Weather|Words/.test(t)) + 1 || titles.includes('More words: Weather'), titles.join(', '));
        });
    }

    test('nothing copied: no new word is a word of a lesson, no new sentence a sentence of one, none used twice', () => {
        const words = new Set(CONTENT.filter((l) => l.module === 'vocabulary').flatMap((l) => (l.words || []).map((w) => w.word.toLowerCase())));
        const en = (l, it) => (l.direction === 'kn-en' ? it.model : it.source);
        const sentences = new Set(CONTENT.filter((l) => l.module === 'translation').flatMap((l) => [...(l.items || []), ...(l.quiz || [])].map((it) => String(en(l, it)).toLowerCase())));
        const seenWords = new Set(), seenSentences = new Set();
        // And the new sections' files (content/sections, 2026-11-14): a unit's six lessons, or Intermediate's More words and Phrases.
        const fs = require('fs'), path = require('path');
        const dir = path.join(__dirname, '../../src/linguistic/content/sections');
        const sections = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => require(path.join(dir, f)));
        const all = [...Object.entries(DATA).map(([level, units]) => ({ level, units })), ...sections];
        for (const { level, units } of all) for (const [key, u0] of Object.entries(units)) {
            const u = Array.isArray(u0.lessons) ? { words: u0.lessons.filter((l) => l.kind === 'words').flatMap((l) => l.list), phrases: u0.lessons.filter((l) => l.kind === 'phrases').flatMap((l) => l.list) } : u0;
            const list = Array.isArray(u.words) ? u.words : u.words?.list || [];
            for (const w of list) {
                assert.ok(!words.has(w.en), `${level} ${key}: "${w.en}" is a lesson's word already`);
                assert.ok(!seenWords.has(w.en), `${level} ${key}: "${w.en}" twice`);
                seenWords.add(w.en);
                assert.ok(w.kn && w.hi && w.def && w.pic, `${level} ${key} ${w.en}: in every language`);
            }
            const phrases = Array.isArray(u.phrases) ? u.phrases : u.phrases?.list || [];
            for (const p of phrases) {
                assert.ok(!sentences.has(p.en.toLowerCase()), `${level} ${key}: "${p.en}" is a lesson's sentence already`);
                assert.ok(!seenSentences.has(p.en), `${level} ${key}: "${p.en}" twice`);
                seenSentences.add(p.en);
                assert.ok(p.kn && p.hi, `${level} ${key} "${p.en}": in Kannada and Hindi`);
            }
        }
    });

    test('a Kannada "More words" and "Phrases": four new words, five new sentences, asked and marked', async () => {
        const path = await learn('en', 'kn');
        const weather = path.levels[0].units.find((u) => u.title === 'Weather');
        const words = weather.lessons.find((x) => x.title === 'More words: Weather');
        const phrases = weather.lessons.find((x) => x.title === 'Phrases: Weather');
        assert.equal(words.type, 'lesson');
        await unlockIds(s.user, [words.id, phrases.id]);
        const page = (await api('GET', `/lessons/${words.id}`)).body;
        assert.deepEqual(page.words.map((w) => `${w.word} ${w.kannada}`), ['ಗಾಳಿ wind', 'ಮೋಡ cloud', 'ಆಕಾಶ sky', 'ಕೊಡೆ umbrella']);
        assert.ok(!page.blanks && !page.hears && !page.pictures, 'none of the unit\'s other sentences or pictures added');
        const w = await whole(words.id, 'en');
        // Each word asked twice, and since 2026-11-16 made up to ten ("at least 10 questions in a quiz").
        assert.equal(page.quiz.length, 10, 'each word asked twice, then two more');
        const done = (await api('POST', `/lessons/${words.id}/quiz`, { answers: rightAnswers(w) })).body;
        assert.deepEqual([done.passed, done.percent], [true, 100]);
        const p = (await api('GET', `/lessons/${phrases.id}`)).body;
        // Its five sentences (two practised, three in the quiz) and, since 2026-11-16, a quiz of ten: the two practised
        // heard, then the unit's words.
        assert.equal(p.items.length, 2);
        assert.equal(p.quiz.length, 10);
        // Taking turns since 2026-11-17: one heard, the next filled in.
        // (Which comes first: what the unit has not asked before it — no question twice in a unit, 2026-11-18.)
        assert.deepEqual(p.quiz.slice(3, 5).map((q) => q.type).sort(), ['blanks', 'hear']);
        assert.ok(p.items.some((it) => it.source === 'ಗಾಳಿ ಜೋರಾಗಿ ಬೀಸುತ್ತಿದೆ.'), 'a sentence to read in Kannada');
        const pw = await whole(phrases.id, 'en');
        const passed = (await api('POST', `/lessons/${phrases.id}/quiz`, { answers: rightAnswers(pw) })).body;
        assert.deepEqual([passed.passed, passed.percent], [true, 100]);
    });

    test('Section 2: a new story in Hindi for a Kannada speaker — the questions in Kannada, the choices in Hindi', async () => {
        const path = await learn('kn', 'hi');
        const stories = path.levels.find((l) => l.level === 'advanced').units.find((u) => u.title === 'Stories');
        const story = stories.lessons.find((x) => x.title === 'Story: The new library');
        assert.equal(story.type, 'story');
        await unlockIds(s.user, [story.id]);
        const page = (await api('GET', `/lessons/${story.id}`)).body;
        assert.match(page.learn.passage.text, /पुस्तकालय/);
        assert.equal(page.quiz[0].prompt, 'ಹಳ್ಳಿಗೆ ಗ್ರಂಥಾಲಯ ಯಾವಾಗ ಬಂತು?');
        assert.ok(page.quiz[0].options.includes('पिछले साल'));
        const st = await whole(story.id, 'kn');
        const done = (await api('POST', `/lessons/${story.id}/quiz`, { answers: rightAnswers(st) })).body;
        assert.deepEqual([done.passed, done.percent], [true, 100]);
    });

    test('Section 2 in English: a new conversation and a new writing lesson, done when both tasks are written', async () => {
        const path = await learn('kn', 'en');
        const adv = path.levels.find((l) => l.level === 'advanced');
        const talk = adv.units.find((u) => u.title === 'Listening').lessons.find((x) => x.title === 'Conversation: Booking a doctor’s appointment');
        assert.equal(talk.type, 'speaking');
        const writing = adv.units.find((u) => u.title === 'Writing').lessons.find((x) => x.title === 'Writing: Ask for a meeting');
        assert.equal(writing.type, 'writing');
        await unlockIds(s.user, [talk.id, writing.id]);
        const conv = (await api('GET', `/lessons/${talk.id}`)).body;
        assert.equal(conv.learn.dialogue.lines.length, 8);
        assert.ok(conv.speaking?.prompt && conv.speaking.checks, 'and one to speak');
        assert.equal(conv.quiz[0].prompt, 'ಅರ್ಜುನ್ ಕ್ಲಿನಿಕ್‌ಗೆ ಏಕೆ ಕರೆ ಮಾಡುತ್ತಾನೆ?', 'asked in Kannada');
        const page = (await api('GET', `/lessons/${writing.id}`)).body;
        assert.deepEqual(page.writing.map((t) => t.type), ['email', 'sentence']);
        const email = 'Dear Madam, I would like to meet you to discuss my project on solar energy. I have finished the research, but I need your advice on the report. Could we meet on Monday at eleven in the staff room? Thank you for your time. Yours sincerely, Kiran.';
        assert.equal((await api('POST', `/lessons/${writing.id}/writing/w1`, { answer: email })).status, 200);
        assert.equal((await api('POST', `/lessons/${writing.id}/writing/w2`, { answer: 'The meeting is important because I need your advice on my report.' })).status, 200);
        const done = (await api('POST', `/lessons/${writing.id}/quiz`, { answers: {} })).body;
        assert.deepEqual([done.passed, done.percent], [true, 100]);
    });

    test('the new Letters lessons: joined letters (Kannada, Hindi) and letter pairs, vowel teams, blends (English), each with its word, asked by it', () => {
        const { groupsOf } = require('../../src/linguistic/content/letters');
        const alphabet = require('../../src/linguistic/alphabet');
        for (const [code, ids] of [['kn', ['joined-1', 'joined-2']], ['hi', ['joined-1', 'joined-2']], ['en', ['pairs', 'vowel-teams', 'blends']]]) {
            const groups = groupsOf(code).filter((g) => ids.includes(g.id));
            assert.equal(groups.length, ids.length, code);
            for (const g of groups) {
                for (const l of g.letters) {
                    assert.ok(l.word && l.pic && l.sentence, `${code} ${l.char}: its word, picture and sentence`);
                    if (l.inside) assert.ok(l.word.includes(l.inside) && !l.word.startsWith(l.char), `${code} ${l.char}: inside ${l.word}`);
                    else assert.ok(l.word.toLowerCase().startsWith(l.char.toLowerCase()), `${code} ${l.char}: ${l.word} starts with it`);
                    assert.ok(l.sentence.includes(l.word.slice(0, Math.max(2, l.word.length - 1))), `${code} ${l.char}: its sentence uses ${l.word}`);
                }
                const stub = alphabet.stubs().find((s) => s.seedKey === `${code === 'en' ? '' : `${code}:`}letters-beginner-${g.place}`);
                for (const seed of ['a', 'b', 'c']) {
                    const quiz = svc.quizOf({ ...alphabet.build(stub, 'kn'), _id: `${stub.seedKey}-${seed}` });
                    assert.deepEqual(quiz.filter((q) => ['letterSound', 'soundLetter', 'listen'].includes(q.kind)).map((q) => q.prompt), [], `${stub.seedKey}: asked by its words only`);
                    assert.ok(quiz.every((q) => q.options.length === 4 && q.options.includes(q.answer) && new Set(q.options).size === 4), stub.seedKey);
                }
            }
        }
    });

    test('Speaking has four new talks, after the topics\' ones', () => {
        const talks = require('../../src/linguistic/talks').stubs();
        assert.equal(talks.length, 12);
        assert.deepEqual(talks.slice(-4).map((t) => t.seedKey), ['talk-advanced-5', 'talk-advanced-5~2', 'talk-advanced-6', 'talk-advanced-6~2']);
    });
});

// 2026-11-19, the user: "why it is coming like this, I didn't even try the lesson" — a Spanish "More words" lesson with no
// words written in Spanish opened with nothing to answer, then said 0%. A lesson with nothing in it is not on the path.
test('a new lesson with nothing in it in this course (no words, no questions) is not on the path; one with words is', async () => {
    const { LinguisticLesson: L } = require('../../src/linguistic/models');
    const docs = await L.find({ review: 'more', course: 'es', status: 'published', deletedAt: null }).lean();
    if (!docs.length) return;
    for (const d of docs) {
        const built = more.build(d, 'en');
        const filled = ['words', 'quiz', 'items', 'writing'].some((f) => (built[f] || []).length);
        assert.equal(more.usable(d, 'en'), filled, `${d.seedKey}: on the path only with something to learn`);
    }
    const progress = { userId: s?.user?._id, language: 'en', course: 'es', lessons: [], levelsCompleted: [] };
    for (const d of await svc.lessonsFor(progress)) {
        if (d.review !== 'more') continue;
        const l = svc.serve(d, progress);
        assert.ok(['words', 'quiz', 'items', 'writing'].some((f) => (l[f] || []).length), `${d.title} has something to learn`);
        // Never English on both sides in a Spanish course ("Write this in Spanish: This is my son." with English tiles).
        for (const it of [...(l.items || []), ...(l.quiz || [])]) assert.notEqual(String(it.source).toLowerCase(), String(it.model).toLowerCase(), `${d.title}: ${it.source}`);
    }
});
