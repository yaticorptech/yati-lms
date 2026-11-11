/**
 * How a course's words sound, in English letters (asked 2026-10-27): on the
 * flashcard, in place of "noun", for every language a student may not read —
 * all but English, Hindi and Kannada. Every word has one, with as many parts
 * as the word has (母、お母さん → "haha, okaasan").
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { packOf } = require('../../src/linguistic/languages');
const { CODES, tableOf, linesOf, glossesOf, tilesOf, soundOf } = require('../../src/linguistic/content/sounds');
const { build } = require('../../src/linguistic/courses');
const { unlockIds } = require('./unlock');

const parts = (s) => s.split(/\s*[、,，،]\s*/).length;

describe('how course words sound', () => {
    test('every word of the 18 languages has its sound, in English letters, part for part', () => {
        assert.equal(CODES.length, 18);
        for (const code of CODES) {
            const table = tableOf(code);
            for (const [lesson, words] of Object.entries(packOf(code).words)) {
                for (const [en, word] of Object.entries(words)) {
                    const say = table[en];
                    assert.ok(say, `${code} ${lesson}: "${en}" has no sound`);
                    assert.match(say, /^[a-zA-ZÀ-ɏ ,-]+$/, `${code} "${en}": English letters only`);
                    assert.equal(parts(say), parts(word), `${code} "${en}": ${word} → ${say}`);
                }
            }
        }
    });

    test('English, Hindi and Kannada have none: the card keeps "noun"', () => {
        for (const code of ['en', 'hi', 'kn']) assert.equal(soundOf(code, 'family'), null);
    });

    test('every translation sentence too (2026-10-27): one to read, whole; one to build from tiles, a sound per tile', () => {
        for (const code of CODES) {
            const lines = linesOf(code);
            for (const [seedKey, items] of Object.entries(packOf(code).items)) {
                // In a course, an "-en-kn" lesson's sentences are built (in the language learnt); the others are read.
                const key = seedKey.replace(/^translation-(\w)\w*-/, '$1-');
                for (const [id, it] of Object.entries(items)) {
                    // Its lesson's way, or its own (2026-11-04: a short one to read in a lesson to write).
                    const built = it.direction ? it.direction === 'en-kn' : key.endsWith('-en-kn');
                    const say = lines[key]?.[id], text = built ? it.model : it.source;
                    assert.ok(say, `${code} ${key} ${id}: ${text}`);
                    assert.match(say, /^[a-zA-Z\u00C0-\u024F ,.'-]+$/, `${code} ${key} ${id}: English letters only`);
                    // Japanese or Chinese with no tiles cut for it is typed.
                    const typed = ['ja', 'zh'].includes(code) && !it.tiles?.length;
                    if (built && !typed) assert.equal(say.split(' ').length, tilesOf(it).length, `${code} ${key} ${id}: ${tilesOf(it).join(' / ')} → ${say}`);
                }
            }
        }
    });

    test('every sentence to read has each word\'s English, word for word with its sound (2026-10-27, as Duolingo\'s hints)', () => {
        for (const code of CODES) {
            const lines = linesOf(code), glosses = glossesOf(code);
            for (const [key, list] of Object.entries(lines)) {
                const items = packOf(code).items[Object.keys(packOf(code).items).find((k) => k.replace(/^translation-(\w)\w*-/, '$1-') === key)] || {};
                for (const [id, say] of Object.entries(list)) {
                    const built = items[id]?.direction ? items[id].direction === 'en-kn' : key.endsWith('-en-kn');
                    if (built) continue;
                    const g = glosses[key]?.[id];
                    assert.ok(g, `${code} ${key} ${id}: no meanings`);
                    const gs = g.split('|');
                    assert.equal(gs.length, say.split(' ').length, `${code} ${key} ${id}: ${say} → ${g}`);
                    assert.ok(gs.every((x) => x.trim()), `${code} ${key} ${id}: an empty meaning`);
                }
            }
        }
    });

    test('a course lesson\'s words carry them', () => {
        const ja = build({ base: 'vocab-beginner-1', course: 'ja', module: 'vocabulary', level: 'beginner' }, 'hi').words;
        assert.deepEqual(ja.slice(0, 2).map((w) => [w.word, w.say]), [['家族', 'kazoku'], ['母、お母さん', 'haha, okaasan']]);
        const kn = build({ base: 'vocab-beginner-1', course: 'kn', module: 'vocabulary', level: 'beginner' }, 'hi').words;
        assert.ok(kn.length && kn.every((w) => w.say === null), 'Kannada: none');
    });

    describe('in the lessons', () => {
        let app, fr, ja, hi, kn;
        before(async () => {
            await connect();
            app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
            await require('../../src/linguistic/seed').ensureSeeded();
            fr = await makeUser('Ling Sounds French'); ja = await makeUser('Ling Sounds Japanese');
            hi = await makeUser('Ling Sounds Hindi'); kn = await makeUser('Ling Sounds Kannada');
            for (const [u, course] of [[fr, 'fr'], [ja, 'ja'], [hi, 'hi'], [kn, 'kn']]) {
                const api = app.call(u.token);
                assert.equal((await api('POST', '/language', { language: course === 'hi' ? 'kn' : 'hi' })).status, 200);
                assert.equal((await api('POST', '/course', { course, start: 'beginner' })).status, 200);
            }
        });
        after(async () => { await cleanup([fr.user, ja.user, hi.user, kn.user], app.server); });
        const lessonOf = async (u, seedKey) => {
            const doc = await LinguisticLesson.findOne({ seedKey }).select('_id').lean();
            await unlockIds(u.user, [doc._id]);
            const r = await app.call(u.token)('GET', `/lessons/${doc._id}`);
            assert.equal(r.status, 200, JSON.stringify(r.body));
            return r.body;
        };

        test('French, built from tiles: every tile has its sound; a wrong answer comes back with the right one\'s', async () => {
            const l = await lessonOf(fr, 'fr:translation-beginner-en-kn');
            // Those built in French (not the short one to read, its own way since 2026-11-04, answered in Hindi).
            const tiled = l.items.filter((it) => it.bank?.length && it.direction !== 'en-kn');
            assert.ok(tiled.length > 0);
            for (const it of tiled) for (const t of it.bank) assert.ok(it.bankSays?.[t], `${it.id}: "${t}" has no sound`);
            // The lesson has its unit's share of the sentences (parts.js): one of them, got wrong.
            const one = tiled[0], model = packOf('fr').items['translation-beginner-en-kn'][one.id].model;
            const r = await app.call(fr.token)('POST', `/lessons/${l.id}/check`, { section: 'items', id: one.id, given: 'zzz' });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.deepEqual([r.body.correct, r.body.answer, r.body.answerSay], [false, model, linesOf('fr')['b-en-kn'][one.id]]);
        });

        test('French, to read: the sentence\'s sound under it', async () => {
            const l = await lessonOf(fr, 'fr:translation-beginner-kn-en');
            assert.deepEqual(['sourceSay', 'sourceEn'].map((k) => l.items.find((it) => it.id === 'i3')[k]), ['ma fa-mee ay grahnd', 'My family is big.'], 'and its English, for a tap');
            assert.ok(l.items.every((it) => it.sourceSay), 'every sentence');
            // Each word of the sentence itself with its English, two or three ways where there are (2026-11-06, as Duolingo's hints).
            assert.deepEqual(l.items.find((it) => it.id === 'i3').sourceHints, { on: 'text', spaced: true, words: [['Ma', ['my', 'mine']], ['famille', ['family', 'household', 'relatives']], ['est', ['is', "'s"]], ['grande.', ['big', 'large']]] }, 'each word with its English');
            assert.ok(l.items.every((it) => it.sourceHints?.words.length === it.source.trim().split(/\s+/).length), 'every sentence, word by word');
        });

        test('Hindi and Kannada, to read (2026-11-02): no sound, but every sentence\'s English for a tap, and each word\'s (2026-11-06); none on a sentence to write', async () => {
            for (const [u, code] of [[hi, 'hi'], [kn, 'kn']]) {
                const l = await lessonOf(u, `${code}:translation-beginner-kn-en`);
                assert.ok(l.items.length && l.items.every((it) => it.sourceEn && !it.sourceSay && it.sourceHints?.on === 'text'), `${code}: ${JSON.stringify(l.items[0])}`);
                assert.equal(l.items.find((it) => it.id === 'i3').sourceEn, 'My family is big.');
                const back = await lessonOf(u, `${code}:translation-beginner-en-kn`);
                assert.ok(back.items.filter((it) => it.direction !== 'en-kn').every((it) => !it.sourceEn), `${code}: the English is the answer there`);
                assert.ok(back.items.filter((it) => it.direction === 'en-kn').every((it) => it.sourceEn), `${code}: the short one to read there (2026-11-04) has its English`);
            }
        });

        test('Japanese quiz choices in Japanese carry their sound; those in Hindi do not', async () => {
            const l = await lessonOf(ja, 'ja:vocab-beginner-1');
            const japanese = l.quiz.filter((q) => (q.options || []).some((o) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(o)));
            assert.ok(japanese.length > 0, 'some questions offer Japanese words');
            for (const q of japanese) for (const o of q.options) if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(o)) assert.ok(q.says?.[o], `${q.id}: "${o}"`);
            for (const q of l.quiz) for (const o of q.options || []) if (/[\u0900-\u097f]/.test(o)) assert.equal(q.says?.[o], undefined, `${q.id}: Hindi "${o}"`);
            // "What does 食べ物、食事 mean?": the word asked about, with its sound and its locale to hear it in (not its meaning).
            const asked = l.quiz.filter((q) => /["“”「」][^"“”「」]*[\u3040-\u30ff\u4e00-\u9fff]/.test(q.prompt || ''));
            assert.ok(asked.length > 0, 'some questions ask about a Japanese word');
            for (const q of asked) {
                assert.ok(q.promptSay?.say, `${q.id}: ${q.prompt}`);
                assert.equal(q.promptSay.locale, 'ja-JP');
                assert.ok(q.prompt.includes(q.promptSay.text));
            }
        });
    });
});
