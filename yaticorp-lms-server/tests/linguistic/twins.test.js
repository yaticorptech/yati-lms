/**
 * Two consonants a lesson with their vowel signs (2026-11-13, the user: "add the kha letter also, do the same as the
 * first image [ಕಾ — ಕಾಗೆ…], then ask mixed questions on ka and kha … two by two: ga and gha … till la; don't use nga
 * and nya"): ಕ ಖ (the old "Vowel signs" lesson's place), ಗ ಘ … ರ ಲ; every syllable's card; a quiz of twelve, the two
 * consonants in turn, each question with the syllable's twin among the choices. Then (2026-11-14, the user: "delete
 * from ga, gha to the last in that unit"): ಕ ಖ only; the others' lessons, seeded the day before, are off the path.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { groupsOf } = require('../../src/linguistic/content/letters');
const alphabet = require('../../src/linguistic/alphabet');
const svc = require('../../src/linguistic/service');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const lessonOf = (key, helper) => ({ ...alphabet.build(alphabet.stubs().find((s) => s.seedKey === key), helper), _id: `x-${key}` });
const PAIRS = { kn: 'ಕ ಖ', hi: 'क ख' };

describe('two consonants a lesson, with their vowel signs', () => {
    for (const code of ['kn', 'hi']) {
        test(`${code}: ka and kha only (ga, gha … la taken out); every syllable with its twin`, () => {
            const signs = groupsOf(code).filter((g) => String(g.id).startsWith('signs'));
            assert.equal(signs[0].id, 'signs', 'the first keeps the old lesson\'s place');
            assert.deepEqual(signs.map((g) => g.title.replace(' with vowel signs', '')).join('|'), PAIRS[code]);
            for (const g of signs) {
                const chars = g.letters.map((l) => l.char);
                assert.ok(g.twins && g.letters.every((l) => chars.includes(l.twin) && l.twin !== l.char), `${g.title}: each with its twin`);
                assert.ok(!chars.some((c) => /[ಙಞङञ]/.test(c)), `${g.title}: no nga, nya`);
            }
            const ka = signs[0].letters;
            assert.equal(ka.find((l) => l.char === (code === 'kn' ? 'ಕಾ' : 'का')).twin, code === 'kn' ? 'ಖಾ' : 'खा');
            assert.equal(ka.find((l) => l.char === (code === 'kn' ? 'ಖಾ' : 'खा')).word, code === 'kn' ? 'ಖಾರ' : 'खाना', 'kha with its word, as ka');
        });
    }

    test('the words: each starts with its syllable (or holds it, marked), with its picture, sentence, sound and meaning', () => {
        for (const code of ['kn', 'hi']) {
            const all = groupsOf(code).filter((g) => String(g.id).startsWith('signs')).flatMap((g) => g.letters).filter((l) => l.word);
            assert.ok(all.length > 15, `${code}: ${all.length} words`);
            for (const l of all) {
                if (l.inside) assert.ok(l.word.includes(l.inside) && l.inside.includes(l.char), `${code} ${l.char}: ${l.word} holds it`);
                else assert.ok(l.word.normalize('NFC').startsWith(l.char.normalize('NFC')), `${code} ${l.char}: ${l.word} starts with it`);
                assert.ok(l.pic && l.sentence && l.sentenceEn && l.wordSay && l.sentenceSay, `${code} ${l.char}: all of it`);
                assert.ok(l.sentence.includes(l.word.slice(0, Math.max(2, l.word.length - 1))), `${code} ${l.char}: its sentence uses ${l.word}`);
            }
        }
    });

    test('the quiz: twelve (or as many syllables as have words), mixed, the twin among the choices, one right answer', () => {
        for (const [key, helper] of [['kn:letters-beginner-4', 'en'], ['kn:letters-beginner-4', 'kn'], ['hi:letters-beginner-4', 'hi'], ['hi:letters-beginner-4', 'en']]) {
            const l = lessonOf(key, helper);
            assert.equal(l.twins, true, key);
            for (let seed = 0; seed < 8; seed++) {
                const quiz = svc.quizOf({ ...l, _id: `${key}-${seed}` });
                const half = new Set(l.words.slice(0, l.words.length / 2).map((w) => w.word));
                const worded = l.words.filter((w) => w.for);
                const [inOne, inTwo] = [worded.filter((w) => half.has(w.word)).length, worded.filter((w) => !half.has(w.word)).length];
                assert.equal(quiz.length, Math.min(12, worded.length), key);
                const asked = quiz.map((q) => l.words[Number(q.id.split('~')[1])]);
                // Six of each, or all a consonant has (ಘ has few words) and the rest from the other.
                const ones = asked.filter((w) => half.has(w.word)).length;
                assert.equal(ones, Math.min(inOne, Math.max(6, quiz.length - inTwo)), `${key}: the two consonants in turn`);
                // Only the syllables with a word, never by their sound in English letters (2026-11-13, the user: "Which
                // letter sounds “chho”? — don't give questions like this").
                assert.ok(asked.every((w) => w.for), `${key}: every one asked has its word`);
                assert.deepEqual(quiz.filter((q) => ['letterSound', 'soundLetter'].includes(q.kind)).map((q) => q.prompt), [], key);
                assert.ok(new Set(quiz.map((q) => q.kind)).size >= 2, `${key}: mixed kinds`);
                for (const [q, w] of quiz.map((x, i) => [x, asked[i]])) {
                    assert.ok(q.options.includes(q.answer) && new Set(q.options).size === q.options.length && q.options.length === 4, `${key} ${q.id}`);
                    const twin = l.words.find((x) => x.word === w.twin);
                    if (['wordLetter', 'soundLetter', 'listen'].includes(q.kind)) assert.ok(q.options.includes(twin.word), `${key} ${q.id}: ${twin.word} to choose too`);
                    if (q.kind === 'letterSound') assert.ok(q.options.includes(twin.kannada), `${key} ${q.id}: ${twin.kannada} to choose too`);
                    if (q.kind === 'letterWord') {
                        const starts = (o) => o.normalize('NFC').split(/[\s.,!?।]+/).some((t) => t.startsWith(w.word.normalize('NFC')));
                        assert.deepEqual(q.options.filter(starts), [q.answer], `${key} ${q.prompt}: one sentence has a word starting with it`);
                    }
                }
            }
        }
    });
});

describe('on the path', () => {
    let app, s, api, added = null;
    const { LinguisticLesson } = require('../../src/linguistic/models');
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        await require('../../src/linguistic/seed').ensureSeeded();
        s = await makeUser('Ling Letter Twins');
        api = app.call(s.token);
        // ಗ ಘ's lesson as the day before seeded it (2026-11-13); made here if this database never had it.
        const stub = { course: 'kn', level: 'beginner', status: 'published', updatedBy: 'Course content', direction: null, learn: {}, seedKey: 'kn:letters-beginner-5', review: 'letters', module: 'vocabulary', order: 0, title: 'Letters: ಗ ಘ with vowel signs', summary: alphabet.SUMMARY };
        const r = await LinguisticLesson.updateOne({ seedKey: stub.seedKey }, { $setOnInsert: stub }, { upsert: true });
        if (r.upsertedCount) added = r.upsertedId;
    });
    after(async () => {
        if (added) await LinguisticLesson.deleteOne({ _id: added });
        await cleanup([s.user], app.server);
    });

    test('the Letters unit holds ka and kha after the consonants, then the joined letters (2026-11-14); the lesson comes with its twins and every syllable', async () => {
        assert.equal((await api('POST', '/language', { language: 'en' })).status, 200);
        assert.equal((await api('POST', '/course', { course: 'kn', start: 'beginner' })).status, 200);
        const unit = (await api('GET', '/path')).body.levels[0].units[0];
        const kaKha = unit.lessons.find((x) => x.title === 'Letters: ಕ ಖ with vowel signs');
        assert.ok(kaKha, unit.lessons.map((x) => x.title).join(', '));
        assert.deepEqual(unit.lessons.slice(-3).map((x) => x.title), ['Letters: ಕ ಖ with vowel signs', 'Letters: Joined letters 1: ಕ್ಕ ತ್ತ ಪ್ಪ', 'Letters: Joined letters 2: ಕ್ರ ಪ್ರ ತ್ರ'], 'ga, gha … la taken out (2026-11-14), though their lessons are in the database');
        assert.ok(!unit.lessons.some((x) => /ಗ ಘ|ರ ಲ/.test(x.title)), unit.lessons.map((x) => x.title).join(', '));
        await require('./unlock').unlockIds(s.user, [kaKha.id]);
        const l = (await api('GET', `/lessons/${kaKha.id}`)).body;
        assert.equal(l.twins, true);
        assert.equal(l.words.length, 26);
        assert.deepEqual(l.words.slice(0, 2).map((w) => `${w.word} ${w.twin}`), ['ಕಾ ಖಾ', 'ಕಿ ಖಿ']);
        assert.deepEqual(l.words.slice(13, 15).map((w) => `${w.word} ${w.for}`), ['ಖಾ ಖಾರ', 'ಖಿ ಖಿನ್ನ'], 'kha\'s cards after ka\'s');
        assert.equal(l.quiz.length, 12);
    });
});
