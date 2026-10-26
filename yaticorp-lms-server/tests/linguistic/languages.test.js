/**
 * Linguistic Ability in the student's own language (asked 2026-10-23, and
 * more languages the same day): Kannada, the other languages of India, and
 * the world's, as the helper language for learning English. The packs cover every lesson; a lesson is served and
 * judged in the language chosen; each language's answers are checked its own
 * way; and Kannada, the default, is unchanged.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const content = require('../../src/linguistic/content');
const { languages, localize, localizePlacement, packOf, CODES } = require('../../src/linguistic/languages');
const { checkTranslation, normalize } = require('../../src/linguistic/check');
const { LinguisticLesson } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');

const NEW = CODES.filter((c) => c !== 'kn');
const byKey = (key) => content.lessons.find((l) => l.seedKey === key);
const KANNADA = /[ಀ-೿]/;

describe('the language packs', () => {
    test('twenty-one languages: Kannada first, then the languages of India, then the world\'s (English among them); each named in its own script', () => {
        assert.equal(CODES.length, 21);
        assert.deepEqual(languages().map((l) => l.code), CODES, 'every language has its pack');
        assert.deepEqual(languages().slice(0, 11).map((l) => l.group), new Array(11).fill('india'));
        assert.deepEqual(languages().slice(11).map((l) => l.group), new Array(10).fill('world'));
        for (const l of languages()) assert.ok(l.name && l.native && l.locale, l.code);
        assert.deepEqual(languages().filter((l) => l.rtl).map((l) => l.code), ['ur', 'ar'], 'written right to left');
    });

    for (const code of NEW) {
        test(`${code}: every word, translation and tip the Kannada lessons have, and no Kannada left`, () => {
            for (const l of content.lessons) {
                const x = localize(l, code);
                assert.equal(x.language, code, l.seedKey);
                if (x.notForLanguage) { assert.ok(packOf(code).skipModules.includes(l.module), l.seedKey); continue; }
                assert.equal(x.languageFallback, undefined, l.seedKey);
                if (l.module === 'vocabulary') for (const w of x.words) assert.ok(w.kannada && !KANNADA.test(w.kannada) && w.lang === packOf(code).name, `${l.seedKey} ${w.word}`);
                if (l.module === 'translation') {
                    assert.equal(x.items.length, l.items.length, l.seedKey); assert.equal(x.quiz.length, l.quiz.length, l.seedKey);
                    for (const it of [...x.items, ...x.quiz]) assert.ok(!KANNADA.test(it.source + it.model + (it.accepted || []).join('') + it.explanation), `${l.seedKey} ${it.id}`);
                    assert.ok(!KANNADA.test(JSON.stringify(x.learn)), `${l.seedKey} tips`);
                }
                assert.ok(!KANNADA.test(x.learn?.kannadaNote || ''), `${l.seedKey} note`);
                assert.ok(!KANNADA.test((x.learn?.points || []).join('')), `${l.seedKey} points`);
            }
            for (const q of content.placement) assert.ok(!KANNADA.test(JSON.stringify(localizePlacement(q, code))), `placement ${q.id}`);
        });

        test(`${code}: each model and accepted answer, and the word tiles put together, check as right`, () => {
            for (const l of content.lessons.filter((x) => x.module === 'translation' && x.direction === 'en-kn')) {
                const x = localize(l, code);
                if (x.notForLanguage) continue;
                for (const it of [...x.items, ...x.quiz].filter((i) => !i.open)) {
                    for (const a of [it.model, ...it.accepted]) assert.equal(checkTranslation(it, a, 'en-kn', code).verdict, 'exact', `${l.seedKey} ${it.id}: ${a}`);
                    const tiles = svc.bankFor(it, x);
                    const used = it.tiles || svc.bankWords(it.model);
                    assert.ok(used.every((t) => tiles.includes(t)), `${l.seedKey} ${it.id}: the bank holds the answer`);
                    assert.equal(checkTranslation(it, used.join(' '), 'en-kn', code).verdict, 'exact', `${l.seedKey} ${it.id}: tiles in order`);
                }
            }
        });
    }

    test('Kannada is the lesson as written, marked with its language — its questions asked in Kannada, the English kept beside', () => {
        // Asked 2026-10-24: a Kannada speaker learning English reads the questions in Kannada (content/asks/kn.js).
        const back = (q) => (q?.promptEn ? (({ promptEn, checklistEn, ...r }) => ({ ...r, prompt: promptEn, ...(checklistEn ? { checklist: checklistEn } : {}) }))(q) : q);
        for (const l of content.lessons) {
            const x = localize(l, 'kn');
            const { language, languageName, ...rest } = x;
            for (const k of ['practice', 'quiz', 'writing']) if (rest[k]) rest[k] = rest[k].map(back);
            if (rest.speaking) rest.speaking = back(rest.speaking);
            assert.deepEqual(rest, l, l.seedKey);
            assert.deepEqual([language, languageName], ['kn', 'Kannada']);
        }
    });

    test('a lesson the packs do not know (an administrator\'s) stays in Kannada, and says so', () => {
        const mine = { ...byKey('vocab-beginner-1'), seedKey: null, _id: 'x' };
        const x = localize(mine, 'ja');
        assert.equal(x.language, 'kn'); assert.equal(x.languageFallback, 'Japanese');
        assert.equal(x.words[0].kannada, mine.words[0].kannada);
    });

    test('word questions are asked in the student\'s language and offer its meanings (2026-10-24)', () => {
        const x = localize(byKey('vocab-beginner-1'), 'ko');
        const q = svc.quizOf({ ...x, _id: 'seed' }).find((y) => y.kind === 'meaning');
        assert.equal(q.prompt, '"family"은(는) 무슨 뜻인가요?');
        assert.match(q.explanation, /^"family"은\(는\) .+라는 뜻이에요\./, 'and explained in it');
        assert.ok(q.options.every((o) => /[가-힣]/.test(o)));
    });
});

describe('a student who speaks English', () => {
    let app, eve, api;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        eve = await makeUser('Ling English');
        api = app.call(eve.token);
        await require('../../src/linguistic/seed').ensureSeeded();
    });
    after(async () => { await cleanup([eve.user], app.server); });

    test('English definitions for the words; no translation unit; the placement questions in English', async () => {
        assert.equal((await api('POST', '/language', { language: 'en' })).status, 200);
        const path = (await api('GET', '/path')).body;
        assert.ok(path.levels.every((lv) => lv.units.every((u) => u.lessons.every((x) => x.module !== 'translation'))), 'no translation for an English speaker');
        const v = await LinguisticLesson.findOne({ seedKey: 'vocab-beginner-1' }).lean();
        const page = (await api('GET', `/lessons/${v._id}`)).body;
        assert.equal(page.words.find((w) => w.word === 'mother').kannada, 'a female parent');
        assert.ok(page.quiz.some((q) => q.prompt === 'What does "family" mean?'));
        const t = await LinguisticLesson.findOne({ seedKey: 'translation-beginner-kn-en' }).lean();
        assert.equal((await api('GET', `/lessons/${t._id}`)).status, 404, 'a translation lesson is not part of the course');
        const pl = (await api('GET', '/placement')).body.questions;
        assert.ok(pl.every((q) => !KANNADA.test(q.prompt)));
    });
});

describe('checking each language its own way', () => {
    test('Japanese: no spaces between words, so spacing and tiles do not matter; the difference is shown letter by letter', () => {
        const it = { model: '私の名前はラニです。', accepted: [] };
        assert.equal(normalize('私の 名前は ラニです。', 'ja'), '私の名前はラニです');
        assert.equal(checkTranslation(it, '私の 名前は ラニです', 'en-kn', 'ja').verdict, 'exact');
        const near = checkTranslation(it, '私の名前はラニ', 'en-kn', 'ja');
        assert.equal(near.verdict, 'almost');
        assert.deepEqual(near.diff.slice(-2), [{ w: 'で', t: 'missing' }, { w: 'す', t: 'missing' }]);
    });
    test('Korean: spacing is set aside', () => {
        const it = { model: '제 이름은 라니예요.', accepted: ['제 이름은 라니입니다.'] };
        assert.equal(checkTranslation(it, '제이름은 라니예요', 'en-kn', 'ko').verdict, 'exact');
        assert.equal(checkTranslation(it, '제 이름은 라니 입니다', 'en-kn', 'ko').verdict, 'exact');
    });
    test('French: right but for the accents counts, and says so; apostrophes split words', () => {
        const r = checkTranslation({ model: "Je vais à l'école.", accepted: [] }, 'je vais a l ecole', 'en-kn', 'fr');
        assert.deepEqual([r.verdict, r.correct, r.accents], ['close', true, true]);
        assert.equal(checkTranslation({ model: "Je vais à l'école.", accepted: [] }, 'Je vais à l’école', 'en-kn', 'fr').verdict, 'exact');
    });
    test('Hindi: the danda is punctuation; a "not" on one side is never close', () => {
        const it = { model: 'मेरा नाम रानी है।', accepted: [] };
        assert.equal(checkTranslation(it, 'मेरा नाम रानी है', 'en-kn', 'hi').verdict, 'exact');
        assert.notEqual(checkTranslation(it, 'मेरा नाम रानी नहीं है', 'en-kn', 'hi').verdict, 'close');
    });
    test('Chinese: like Japanese, and pinyin is accepted where the pack gives it', () => {
        const it = { model: '我的名字是拉妮。', accepted: ['wo de mingzi shi lani'] };
        assert.equal(checkTranslation(it, '我的 名字 是 拉妮', 'en-kn', 'zh').verdict, 'exact');
        assert.equal(checkTranslation(it, 'wo de mingzi shi lani', 'en-kn', 'zh').verdict, 'exact');
    });
    test('Spanish and German: accents and ß slips count; Arabic and Urdu: vowel marks and letter forms set aside; Russian ё is е', () => {
        assert.equal(checkTranslation({ model: '¿Dónde está la estación?', accepted: [] }, 'donde esta la estacion', 'en-kn', 'es').verdict, 'close');
        assert.equal(checkTranslation({ model: 'Ich heiße Rani.', accepted: [] }, 'ich heisse rani', 'en-kn', 'de').verdict, 'close');
        assert.equal(checkTranslation({ model: 'أنا طالب.', accepted: [] }, 'انا طالبٌ', 'en-kn', 'ar').verdict, 'exact');
        assert.equal(checkTranslation({ model: 'میرا نام رانی ہے۔', accepted: [] }, 'ميرا نام راني ہے', 'en-kn', 'ur').verdict, 'exact');
        assert.equal(checkTranslation({ model: 'Ёлка.', accepted: [] }, 'елка', 'en-kn', 'ru').verdict, 'exact');
        assert.notEqual(checkTranslation({ model: 'Я учусь.', accepted: [] }, 'я не учусь', 'en-kn', 'ru').verdict, 'close');
    });
    test('into English it is still English that is checked', () => {
        assert.equal(checkTranslation({ model: 'I am fine.', accepted: [] }, "i'm fine", 'kn-en', 'ja').verdict, 'exact');
    });
});

describe('a student who speaks Japanese', () => {
    let app, kenji, api;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        kenji = await makeUser('Ling Kenji');
        api = app.call(kenji.token);
        await require('../../src/linguistic/seed').ensureSeeded();
    });
    after(async () => { await cleanup([kenji.user], app.server); });
    const lessonBy = (key) => LinguisticLesson.findOne({ seedKey: key }).lean();

    test('starts in Kannada, not yet chosen; chooses Japanese; an unknown language is refused', async () => {
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.language.code, d.languageChosen, d.languages.length], ['kn', false, 21]);
        assert.equal((await api('POST', '/language', { language: 'xx' })).status, 400);
        const r = await api('POST', '/language', { language: 'ja' });
        assert.equal(r.status, 200); assert.deepEqual([r.body.language.code, r.body.language.native, r.body.languageChosen], ['ja', '日本語', true]);
        assert.equal((await api('GET', '/path')).body.language.code, 'ja');
    });

    test('a vocabulary lesson in Japanese: the meanings, the questions, and the quiz passed with Japanese answers', async () => {
        const l = await lessonBy('vocab-beginner-1');
        const page = (await api('GET', `/lessons/${l._id}`)).body;
        assert.deepEqual([page.language, page.languageName], ['ja', 'Japanese']);
        assert.equal(page.words.find((w) => w.word === 'family').kannada, '家族');
        const meaning = page.quiz.find((q) => /はどういう意味ですか/.test(q.prompt));
        assert.ok(meaning && meaning.options.every((o) => /[぀-ヿ一-鿿]/.test(o)), 'options in Japanese');
        const right = Object.fromEntries(svc.quizOf(svc.serve(l, { language: 'ja' })).map((q) => [q.id, q.answer]));
        const r = await api('POST', `/lessons/${l._id}/quiz`, { answers: right });
        assert.equal(r.body.percent, 100);
    });

    test('translation both ways: the Japanese to read, the Japanese tiles to tap', async () => {
        await require('./unlock').unlock(kenji.user, ['translation-beginner-kn-en', 'translation-beginner-en-kn']);
        const into = await lessonBy('translation-beginner-kn-en');
        const page = (await api('GET', `/lessons/${into._id}`)).body;
        assert.ok(page.items.every((i) => !KANNADA.test(i.source)) && /[぀-ヿ一-鿿]/.test(page.items[0].source));
        assert.equal((await api('POST', `/lessons/${into._id}/check`, { section: 'items', id: 'i1', given: 'water' })).body.correct, true);

        // Wrong once: kept for revision, in Japanese.
        assert.equal((await api('POST', `/lessons/${into._id}/check`, { section: 'items', id: 'i2', given: 'zzz' })).body.correct, false);
        const mistakes = (await api('GET', '/review')).body.mistakes;
        const m = mistakes.find((x) => x.question.type === 'translation');
        assert.equal(m.question.language, 'ja'); assert.ok(/[぀-ヿ一-鿿]/.test(m.question.source));
        const model = localize(into, 'ja').items.find((i) => i.id === 'i2').model;
        assert.equal((await api('POST', `/review/${m.id}`, { given: model })).body.resolved, true);

        // English into Japanese: Japanese has no spaces, so its tiles come from the pack.
        const out = await lessonBy('translation-beginner-en-kn');
        const page2 = (await api('GET', `/lessons/${out._id}`)).body;
        const i3 = page2.items.find((i) => i.id === 'i3');
        const tiles = localize(out, 'ja').items.find((i) => i.id === 'i3').tiles;
        assert.ok(tiles.every((t) => i3.bank.includes(t)) && i3.bank.length > tiles.length, 'the pieces and a few others');
        assert.equal((await api('POST', `/lessons/${out._id}/check`, { section: 'items', id: 'i3', given: tiles.join(' ') })).body.verdict, 'exact');
    });

    test('the placement test and the daily challenge in Japanese', async () => {
        const p = (await api('GET', '/placement')).body;
        assert.match(p.questions.find((q) => q.id === 'b4').prompt, /本/);
        const d = (await api('GET', '/daily')).body;
        assert.ok(d.questions.every((q) => /[぀-ヿ一-鿿]/.test(q.prompt)), 'the word questions asked in Japanese');
    });

    test('back to Kannada: the same lesson in Kannada again', async () => {
        await api('POST', '/language', { language: 'kn' });
        const l = await lessonBy('vocab-beginner-1');
        const page = (await api('GET', `/lessons/${l._id}`)).body;
        assert.equal(page.language, 'kn');
        assert.ok(KANNADA.test(page.words[0].kannada));
    });
});

describe('questions asked in Kannada (asked 2026-10-24)', () => {
    const svcQ = require('../../src/linguistic/service');
    test('a reading question in Kannada, its choices in English; the English question kept', () => {
        const l = localize(content.lessons.find((x) => x.seedKey === 'reading-beginner-1'), 'kn');
        const q = l.quiz.find((x) => x.id === 'q1');
        assert.equal(q.prompt, 'ಕಾವ್ಯ ಎಲ್ಲಿ ವಾಸಿಸುತ್ತಾಳೆ?');
        assert.equal(q.promptEn, 'Where does Kavya live?');
        assert.ok(q.options.includes('Mysuru'), 'the choices stay English');
        assert.equal(svcQ.publicQuestion(q, 's').promptEn, 'Where does Kavya live?');
    });
    test('an English sentence with a blank: a Kannada instruction before it, the sentence itself English', () => {
        const l = localize(content.lessons.find((x) => x.seedKey === 'grammar-beginner-1'), 'kn');
        const q = l.practice.find((x) => x.id === 'p3');
        assert.equal(q.prompt, 'ಸರಿಯಾದ ಪದವನ್ನು ಆರಿಸಿ: ___ sun rises in the east.');
    });
    test('every reading and speaking question, writing task and speaking task is in Kannada', () => {
        const KN = /[ಀ-೿]/;
        for (const l of content.lessons.filter((x) => ['reading', 'speaking'].includes(x.module)).map((x) => localize(x, 'kn'))) {
            for (const q of [...(l.practice || []), ...(l.quiz || [])]) assert.match(q.prompt, KN, `${l.seedKey} ${q.id}`);
            for (const t of l.writing || []) assert.match(t.prompt, KN, `${l.seedKey} ${t.id}`);
            if (l.speaking?.prompt) {
                assert.match(l.speaking.prompt, KN, l.seedKey);
                assert.equal(l.speaking.checklist.length, l.speaking.checklistEn.length, `${l.seedKey}: the checklist, item for item`);
            }
        }
        for (const q of content.placement) assert.match(localizePlacement(q, 'kn').prompt, KN, `placement ${q.id}`);
    });
    test('another language keeps its own (English) questions', () => {
        const q = localize(content.lessons.find((x) => x.seedKey === 'reading-beginner-1'), 'hi').quiz.find((x) => x.id === 'q1');
        assert.equal(q.prompt, 'Where does Kavya live?');
    });
});
