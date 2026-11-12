/**
 * Beginner from scratch (asked 2026-10-31: "give the basics like the varnamala of every language, like ABCD in
 * English"): every course's Beginner starts with a Letters unit — a lesson for each group of the language's letters,
 * each letter with its sound in English letters; matched to its sound; then a quiz in the student's own language.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const alphabet = require('../../src/linguistic/alphabet');
const { groupsOf } = require('../../src/linguistic/content/letters');
const courses = require('../../src/linguistic/courses');
const svc = require('../../src/linguistic/service');
const { gradeQuestion } = require('../../src/linguistic/check');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { before, after } = require('node:test');

const lessonOf = (key, helper) => ({ ...alphabet.build(alphabet.stubs().find((s) => s.seedKey === key), helper), _id: `x-${key}` });

describe('the Letters unit', () => {
    test('every course has its letters, each with a sound, no two the same in a lesson', () => {
        for (const code of courses.courseCodes()) {
            const groups = groupsOf(code);
            assert.ok(groups.length >= 3, `${code}: groups`);
            for (const g of groups) {
                assert.ok(g.letters.length >= 4, `${code} ${g.id}`);
                const says = g.letters.map((l) => l.say);
                assert.equal(new Set(says).size, says.length, `${code} ${g.id}: sounds told apart`);
                assert.ok(g.letters.every((l) => l.char && l.say), `${code} ${g.id}: each letter and its sound`);
            }
        }
        assert.deepEqual(groupsOf('kn')[0].letters.slice(0, 4).map((l) => `${l.char} ${l.say}`), ['ಅ a', 'ಆ aa', 'ಇ i', 'ಈ ii'], 'Kannada vowels');
        assert.deepEqual(groupsOf('hi')[3].letters.slice(0, 3).map((l) => `${l.char} ${l.say}`), ['का kaa', 'कि ki', 'की kii'], 'the barakhadi');
        assert.equal(groupsOf('en')[0].letters[0].example, 'A is for apple.');
        assert.deepEqual(groupsOf('ja')[0].letters.slice(0, 6).map((l) => l.say), ['a', 'i', 'u', 'e', 'o', 'ka']);
        // What the voice is given (2026-10-31, "the correct pronunciation"): an English letter's name; a Korean letter with its vowel.
        assert.deepEqual(groupsOf('en')[0].letters.slice(0, 3).map((l) => l.speak), ['a', 'b', 'c'], 'the small letter: said once, by its name (2026-11-07; "ee" was read "E, E", a capital alone "capital E", "S." as "Saint")');
        assert.deepEqual(groupsOf('ko')[0].letters.slice(0, 3).map((l) => l.speak), ['가', '나', '다']);
        assert.deepEqual(groupsOf('ko')[1].letters.slice(0, 3).map((l) => l.speak), ['아', '야', '어']);
        assert.equal(groupsOf('kn')[0].letters[0].speak, undefined, 'a Kannada letter is said as it is');
        assert.deepEqual(groupsOf('zh')[0].letters.filter((l) => 'AWXZ'.includes(l.say)).map((l) => `${l.say} ${l.char} ${l.pinyin}`), ['A 诶 ēi', 'W 豆贝尔维 dòu bèi ěr wéi', 'X 艾克斯 ài kè sī', 'Z 贼德 zéi dé'], 'Chinese A–Z, each with its pinyin (2026-10-31)');
        assert.ok(groupsOf('zh')[0].letters.every((l) => l.pinyin), 'every one of the 26');
    });

    test('a lesson: its letters as cards, a ten-question quiz in the student\'s language, every answer among its choices', () => {
        // Letters with no words (Chinese tones, 2026-11-02 — every language's letters have words now): learnt by their sounds.
        const l = lessonOf('zh:letters-beginner-2', 'kn');
        assert.deepEqual([l.title, l.review, l.module, l.order, l.target], ['Letters: The four tones', 'letters', 'vocabulary', 0, 'zh']);
        assert.deepEqual(l.words[0], { word: '妈', kannada: 'mā (1st tone, high)', pos: '', example: '', locale: 'zh-CN' });
        const quiz = svc.quizOf(l);
        assert.equal(quiz.length, 5, 'one for each of its five tones');
        assert.deepEqual([...new Set(quiz.map((q) => q.kind))].sort(), ['letterSound', 'listen', 'soundLetter']);
        assert.ok(quiz.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length));
        assert.match(quiz.find((q) => q.kind === 'letterSound').prompt, /ಹೇಗೆ ಉಚ್ಚರಿಸಲಾಗುತ್ತದೆ/, 'asked in Kannada');
        const hear = quiz.find((q) => q.kind === 'listen');
        assert.deepEqual([hear.say, hear.sayLang], [hear.answer, 'zh-CN'], 'heard in Chinese');
        assert.equal(gradeQuestion(hear, hear.answer).correct, true);
    });

    test('English (2026-10-31, "not the matching question — one word, like A for apple, for every letter"): each letter with its word and picture; the quiz asks "A is for …" and "… is for 🍎 apple"', () => {
        const all = groupsOf('en').flatMap((g) => g.letters);
        assert.equal(all.length, 26);
        assert.ok(all.every((l) => l.word && l.pic && l.word[0].toUpperCase() === l.char), 'every letter, its word starting with it');
        assert.ok(all.every((l) => l.sentence && l.sentence.toLowerCase().includes(l.word.toLowerCase())), 'and a sentence using its word');
        const l = lessonOf('letters-beginner-1', 'kn');
        assert.deepEqual([l.words[0].word, l.words[0].pic, l.words[0].for, l.words[0].forSay], ['A', '🍎', 'apple', 'a for apple'], 'said "a for apple": the letter once, by its name (2026-11-07)');
        assert.match(l.learn.intro, /A for apple/);
        const quiz = svc.quizOf(l);
        assert.equal(quiz.length, 9, 'one for each of its nine letters');
        assert.deepEqual([...new Set(quiz.map((q) => q.kind))].sort(), ['letterWord', 'wordLetter'], 'no matching of sounds');
        assert.ok(quiz.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length));
        const word = quiz.find((q) => q.kind === 'letterWord');
        // Asked in the student's language (2026-11-02, "change the way of the question" — not "H is for …").
        assert.match(word.prompt, /^“[A-I]” ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುವ ಪದ ಯಾವ ವಾಕ್ಯದಲ್ಲಿದೆ\?$/);
        assert.ok(word.options.every((o) => /^\S+ [A-Z].+\.$/.test(o)), `a sentence to choose, not one word (${word.options})`);
        assert.match(quiz.find((q) => q.kind === 'wordLetter').prompt, /^“[\w ]+” ಯಾವ ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುತ್ತದೆ\? \S+ [A-Z].+\.$/);
        const inEnglish = svc.quizOf(lessonOf('letters-beginner-1', 'en'));
        assert.match(inEnglish.find((q) => q.kind === 'letterWord').prompt, /^Which sentence has a word that starts with “[A-I]”\?$/);
        assert.match(inEnglish.find((q) => q.kind === 'wordLetter').prompt, /^Which letter does “[\w ]+” start with\? \S+ [A-Z].+\.$/);
        assert.equal(gradeQuestion(word, word.answer).correct, true);
    });
});

describe('A for apple in Kannada and Hindi (2026-11-02, "apply for all languages" — these two first)', () => {
    test('every letter has a word, with its picture and a sentence using it: one that starts with it, else (2026-11-04) one with it inside', () => {
        for (const code of ['kn', 'hi']) {
            const all = groupsOf(code).flatMap((g) => g.letters);
            assert.equal(all.filter((l) => !l.word).map((l) => l.char).join(' '), '', `${code}: every letter, vowel signs on ka too (2026-11-04, "give the word for that letter")`);
            for (const l of all.filter((x) => x.word)) {
                if (l.inside) assert.ok(l.word.includes(l.inside) && l.char.includes(l.inside) && !l.word.startsWith(l.char), `${code} ${l.char}: ${l.word} has it inside (${l.inside})`);
                else assert.ok(l.word.startsWith(l.char), `${code} ${l.char}: ${l.word} starts with it`);
                assert.ok(l.pic && l.wordSay && l.sentenceSay && l.sentenceEn, `${code} ${l.char}: its picture, sounds and meaning`);
                assert.ok(l.sentence.includes(l.word.slice(0, Math.max(2, l.word.length - 1))), `${code} ${l.char}: its sentence uses ${l.word}`);
            }
        }
    });

    test('a Kannada lesson: its cards, then "Which sentence has a word that starts with “ಕ”?" with sentences to choose; a letter with no word asked by its sound', () => {
        const l = lessonOf('kn:letters-beginner-2', 'en');
        const ka = l.words.find((w) => w.word === 'ಕ');
        assert.deepEqual([ka.for, ka.pic, ka.forSound, ka.forSay], ['ಕಪ್ಪೆ', '🐸', 'kappe', 'ಕ, ಕಪ್ಪೆ']);
        const quiz = svc.quizOf(l);
        assert.ok(quiz.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length));
        const byWord = quiz.filter((q) => q.kind === 'letterWord');
        assert.ok(byWord.length > 0 && byWord.every((q) => /^Which sentence has a word that starts with “\S+”\?$/.test(q.prompt) && q.options.every((o) => /^\S+ .+\.$/.test(o))), 'a sentence to choose');
        assert.equal(quiz.filter((q) => ['letterSound', 'soundLetter', 'listen'].includes(q.kind)).length, 0, 'none by its sound: every letter has its word now (2026-11-04)');
        assert.match(l.learn.intro, /A for apple/);
    });

    test('a letter no word starts with (2026-11-04, "give the word for that letter"): a word with it inside, coloured on its card; asked "Which sentence has a word with “ಙ” in it?"', () => {
        const l = lessonOf('kn:letters-beginner-2', 'en');
        const nga = l.words.find((w) => w.word === 'ಙ');
        assert.deepEqual([nga.for, nga.pic, nga.inside, nga.forSound], ['ವಾಙ್ಮಯ', '📚', 'ಙ', 'vāṅmaya']);
        assert.ok(l.words.filter((w) => w.inside).length >= 3, 'ಙ ಞ ಣ ಥ…');
        // Whatever ten the quiz picks: each one inside a word is asked the new way, with only one sentence holding it.
        for (let seed = 0; seed < 12; seed++) {
            for (const q of svc.quizOf({ ...l, _id: `seed-${seed}` }).filter((x) => x.kind === 'letterIn')) {
                const w = l.words.find((x) => q.prompt.includes(`“${x.word}”`) && x.inside);
                assert.ok(w, q.prompt);
                assert.match(q.prompt, /^Which sentence has a word with “\S+” in it\?$/);
                assert.deepEqual(q.options.filter((o) => o.includes(w.inside)), [q.answer], `${q.prompt}: one sentence has it`);
            }
        }
        const kn = svc.quizOf(lessonOf('kn:letters-beginner-2', 'kn')).find((q) => q.kind === 'letterIn');
        assert.ok(!kn || /ಅಕ್ಷರ ಇರುವ ಪದ ಯಾವ ವಾಕ್ಯದಲ್ಲಿದೆ\?$/.test(kn.prompt), 'in the student\'s language');
    });
});

describe('A for apple in every language (2026-11-02, "make the last changes to all languages")', () => {
    const INI = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'], MED = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
    // A word starts with its letter: as written, in small letters, or (Korean) its first syllable made with it.
    const startsWith = (word, ch) => {
        if (word.toLocaleLowerCase().startsWith(ch.toLocaleLowerCase())) return true;
        const c = word.codePointAt(0) - 0xac00;
        return c >= 0 && c < 11172 && (INI[Math.floor(c / 588)] === ch || MED[Math.floor((c % 588) / 28)] === ch);
    };
    const LATIN = ['es', 'fr', 'de', 'pt'];
    for (const code of require('../../src/linguistic/courses').courseCodes().filter((c) => c !== 'en')) {
        test(`${code}: its letters with a word, a picture and a sentence using it`, () => {
            // Chinese: its numbers and first characters (its tones and A–Z names are learnt by their sound).
            const all = groupsOf(code).filter((g) => !['signs', 'tones', 'alphabet'].includes(g.id)).flatMap((g) => g.letters);
            const worded = all.filter((l) => l.word);
            // Every letter (2026-11-04), but those no everyday word has: Punjabi ਅਃ ਙ ਞ, Odia ଵ, Japanese ヲ (and among the
            // vowel signs, not counted here, Tamil கஂ and Punjabi ਕਂ).
            const left = { pa: 'ਅਃ ਙ ਞ', or: 'ଵ', ja: 'ヲ' };
            assert.equal(all.filter((l) => !l.word).map((l) => l.char).join(' '), left[code] || '', `${code}: every letter has a word`);
            for (const l of worded) {
                if (l.inside) assert.ok(l.word.toLocaleLowerCase().includes(l.inside.toLocaleLowerCase()) && (l.char.toLocaleLowerCase().includes(l.inside.toLocaleLowerCase()) || l.inside.toLocaleLowerCase().includes(l.char.toLocaleLowerCase())), `${code} ${l.char}: ${l.word} has it inside (${l.inside})`);
                else assert.ok(startsWith(l.word, l.char), `${code} ${l.char}: ${l.word} starts with it`);
                assert.ok(l.pic && l.sentence && l.sentenceEn, `${code} ${l.char}: its picture, sentence and meaning`);
                assert.ok(l.sentence.toLocaleLowerCase().includes(l.word.slice(0, Math.max(2, l.word.length - 1)).toLocaleLowerCase()), `${code} ${l.char}: its sentence uses ${l.word}`);
                assert.ok(l.wordSay && (LATIN.includes(code) || l.sentenceSay), `${code} ${l.char}: how it sounds in English letters`);
            }
            const quiz = svc.quizOf(lessonOf(`${code}:letters-beginner-1`, 'en'));
            assert.ok(quiz.every((q) => q.options.includes(q.answer) && new Set(q.options).size === q.options.length), `${code}: every answer among different choices`);
        });
    }
});

describe('every letter on one page (2026-10-31)', () => {
    let app, s, api;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        await require('../../src/linguistic/seed').ensureSeeded();
        s = await makeUser('Ling Letters Chart');
        api = app.call(s.token);
    });
    after(async () => { await cleanup([s.user], app.server); });

    test('the course\'s letters, each with its sound; for Kannada the kagunita, each consonant with each vowel sign', async () => {
        assert.equal((await api('POST', '/language', { language: 'hi' })).status, 200);
        assert.equal((await api('POST', '/course', { course: 'kn', start: 'beginner' })).status, 200);
        const c = (await api('GET', '/letters')).body;
        assert.deepEqual([c.course.code, c.locale], ['kn', 'kn-IN']);
        assert.deepEqual(c.groups.map((g) => g.title), ['Vowels', 'Consonants 1', 'Consonants 2', 'Vowel signs']);
        assert.deepEqual(c.table.columns.slice(0, 4).map((x) => x.say), ['a', 'aa', 'i', 'ii']);
        const ka = c.table.rows[0];
        assert.deepEqual(ka.cells.slice(0, 4).map((x) => `${x.char} ${x.say}`), ['ಕ ka', 'ಕಾ kaa', 'ಕಿ ki', 'ಕೀ kii']);
        assert.deepEqual(c.table.rows.slice(-2).map((r) => r.say), ['ksha', 'jña'], 'ksha and jña too');
        assert.ok(c.table.rows.every((r) => r.cells.length === c.table.columns.length));
        const path = (await api('GET', '/path')).body;
        assert.deepEqual(path.levels[0].units[0].lessons[0], { id: 'letters-chart', stop: 'chart', type: 'chart', title: 'All letters', summary: 'Every letter on one page, with its sound. Tap one to hear it.', open: true, status: 'new' }, 'the first stop of the Letters unit');
    });
});
