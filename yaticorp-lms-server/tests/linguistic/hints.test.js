/**
 * Word hints, as Duolingo's (2026-11-06, the user's pictures: "ಚಿಂತೆ" tapped → worry · concern · anxiety; "in all
 * languages"): every sentence to read — the student's own language in the English course, the language learnt in a
 * course — comes word by word, each word with one to three English meanings; on its own words, but for Japanese
 * (written without spaces), where they are on its sound's words.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { languages } = require('../../src/linguistic/languages');

before(async () => { await connect(); await require('../../src/linguistic/seed').ensureSeeded(); });
after(() => mongoose.disconnect());

const progressIn = (language, course = null) => ({ language, course, lessons: [], placement: { level: 'beginner' }, levelsCompleted: [], plans: [] });
const HELPERS = languages().map((l) => l.code).filter((c) => c !== 'en');
const CONFIG = { passingScore: { beginner: 60, intermediate: 60, advanced: 60 } };

const shownOf = async (course, language) => {
    const docs = await LinguisticLesson.find({ course, module: 'translation', status: 'published', deletedAt: null }).lean();
    const out = [];
    for (const doc of docs) {
        const shown = svc.publicLesson(svc.serve(doc, progressIn(language, course)), null, CONFIG);
        for (const it of [...(shown.items || []), ...(Array.isArray(shown.quiz) ? shown.quiz : [])]) if (it.source && (it.sourceHints || (it.direction || shown.direction) === (course ? 'en-kn' : 'kn-en'))) out.push({ at: `${doc.seedKey} ${it.id}`, it });
    }
    return out;
};

const check = (at, it, code) => {
    const h = it.sourceHints;
    assert.ok(h, `${at}: "${it.source}" has word hints`);
    const words = h.words.filter(([, m]) => m);
    assert.ok(words.length >= 1, `${at}: at least one word`);
    for (const [w, m] of words) assert.ok(m.length >= 1 && m.length <= 3 && m.every((x) => typeof x === 'string' && x.trim()), `${at} "${w}": one to three meanings (${m})`);
    if (h.on === 'text') assert.equal(h.words.map(([w]) => w).join(h.spaced ? ' ' : ''), it.source.trim().replace(/\s+/g, ' '), `${at}: the sentence whole again`);
};

describe('word hints, as Duolingo\'s', () => {
    test('the English course: every sentence to read in the student\'s own language, in all 20 languages', async () => {
        for (const code of HELPERS) {
            const read = await shownOf(null, code);
            assert.ok(read.length >= 40, `${code}: sentences to read (${read.length})`);
            for (const { at, it } of read) check(`${code} ${at}`, it, code);
            // On the sentence's own words; on its sound's for Japanese (no spaces), and for the odd sentence whose sound joins two words (French "six heures" → see-zur).
            const off = new Set(read.filter(({ it }) => it.sourceHints.on !== 'text').map(({ it }) => it.source)).size;
            assert.ok(code === 'ja' || off <= 3, `${code}: on the sentence's own words (${off} not)`);
            // Two or three meanings, as Duolingo's (2026-11-06, "do both"): most words; a name, a number, a grammar mark has one.
            const words = read.flatMap(({ it }) => it.sourceHints.words.filter(([, m]) => m));
            const more = words.filter(([, m]) => m.length >= 2).length / words.length;
            assert.ok(more >= 0.55, `${code}: words with two or more meanings (${Math.round(100 * more)}%)`);
        }
    });

    test('every other course: every sentence to read in the language learnt', async () => {
        for (const code of HELPERS) {
            const read = await shownOf(code, code === 'hi' ? 'kn' : 'hi');
            assert.ok(read.length >= 20, `${code} course: sentences to read (${read.length})`);
            for (const { at, it } of read) check(`${code} course ${at}`, it, code);
            const off = new Set(read.filter(({ it }) => it.sourceHints.on !== 'text').map(({ it }) => it.source)).size;
            assert.ok(code === 'ja' || off <= 3, `${code} course: on the sentence's own words (${off} not)`);
        }
    });

    test('the user\'s example: a Kannada speaker\'s "ನನ್ನ ಕುಟುಂಬ ದೊಡ್ಡದು." — each word with its meanings, the full stop kept on its word', async () => {
        const read = await shownOf(null, 'kn');
        const it = read.find(({ it: x }) => x.source === 'ನನ್ನ ಕುಟುಂಬ ದೊಡ್ಡದು.')?.it;
        assert.deepEqual(it?.sourceHints, { on: 'text', spaced: true, words: [['ನನ್ನ', ['my', 'mine']], ['ಕುಟುಂಬ', ['family', 'household', 'relatives']], ['ದೊಡ್ಡದು.', ['is big', 'big', 'large']]] });
        assert.equal(it.sourceEn, undefined, 'not the whole sentence\'s English: in the English course it is the answer');
    });

    test('an English sentence to write in the student\'s own language (2026-11-06, "do both"): its words with that language\'s words, in all 20 languages', async () => {
        for (const code of HELPERS) {
            const docs = await LinguisticLesson.find({ course: null, module: 'translation', status: 'published', deletedAt: null }).lean();
            let n = 0, hinted = 0, sentences = 0;
            for (const doc of docs) {
                const shown = svc.publicLesson(svc.serve(doc, progressIn(code)), null, CONFIG);
                for (const it of [...(shown.items || []), ...(Array.isArray(shown.quiz) ? shown.quiz : [])]) {
                    // (A short one to read in the student's language there, 2026-11-04, has English meanings: the test above.)
                    if ((it.direction || shown.direction) !== 'en-kn' || !/^[A-Za-z]/.test(it.source) || (it.sourceHints && !it.sourceHints.lang)) continue;
                    sentences += 1;
                    const at = `${code} ${doc.seedKey} ${it.id}`;
                    assert.equal(it.sourceHints?.lang, code, `${at}: "${it.source}" has its words in ${code}`);
                    check(at, it, code);
                    for (const [w, m] of it.sourceHints.words) { const k = w.split(' ').length; n += k; if (m) hinted += k; }
                }
            }
            assert.ok(sentences >= 40, `${code}: English sentences (${sentences})`);
            assert.ok(hinted / n >= 0.88, `${code}: words with their words in the language (${Math.round(100 * hinted / n)}%)`);
        }
    });

    test('the English words\' words: "This is my book." for a Kannada speaker; "does" is not "do"', async () => {
        const { englishHintsFor } = require('../../src/linguistic/content/sounds/hints');
        const book = Object.fromEntries(englishHintsFor('kn', 'This is my book.', { answer: 'ಇದು ನನ್ನ ಪುಸ್ತಕ.' }).words);
        assert.deepEqual([book.This[0], book.my[0], book['book.'][0]], ['ಇದು', 'ನನ್ನ', 'ಪುಸ್ತಕ']);
        const cost = Object.fromEntries(englishHintsFor('kn', 'How much does this cost?').words);
        assert.equal(cost.does, null);
        assert.deepEqual(cost['How much'], ['ಎಷ್ಟು']);
        assert.equal(englishHintsFor('kn', 'ಅವನು ನನ್ನ ಸ್ನೇಹಿತ.'), null, 'not for a sentence that is not English');
    });

    // 2026-11-06, the user's pictures ("La [ ] se ha [ ] al lunes"; the tiles この 課は 簡単です): where the student answers in the
    // language learnt, its words tapped give their meaning — in English, or, English learnt, in the student's language.
    test('word tiles in the language learnt, and fill in the blanks\' words and tiles, with their meanings — every course and the English course, in all 20 languages', async () => {
        for (const code of HELPERS) {
            for (const [course, language] of [[code, 'en'], [null, code]]) {
                const docs = await LinguisticLesson.find({ course, module: { $in: ['translation', 'vocabulary'] }, status: 'published', deletedAt: null }).lean();
                let tiles = 0, tm = 0, bt = 0, btm = 0, bw = 0, bwm = 0;
                for (const doc of docs) {
                    const shown = svc.publicLesson(svc.serve(doc, progressIn(language, course)), null, CONFIG);
                    for (const it of [...(shown.items || []), ...(Array.isArray(shown.quiz) ? shown.quiz : [])]) {
                        if ((it.direction || shown.direction) !== 'kn-en' || !it.bank?.length) continue;
                        if (it.bankMeanings) assert.equal(it.meaningLang, course ? 'en' : code, `${code} ${doc.seedKey} ${it.id}: the meanings' language`);
                        for (const t of it.bank) { tiles += 1; const m = it.bankMeanings?.[t]; if (m) { tm += 1; assert.ok(m.length >= 1 && m.length <= 3, `${t}: one to three`); } }
                    }
                    for (const q of shown.blanks || []) {
                        assert.equal(q.meaningLang, course ? 'en' : code);
                        q.words.forEach((w, i) => { bt += 1; if (q.tileMeanings[i]) btm += 1; });
                        q.parts.forEach((p, i) => {
                            if (p === null) { assert.equal(q.partWords[i], null); return; }
                            assert.equal(q.partWords[i].map(([x]) => x).join(''), p, `${q.id}: the piece whole again`);
                            for (const [x, m] of q.partWords[i]) if (/[\p{L}\p{N}]/u.test(x)) { bw += 1; if (m) bwm += 1; }
                        });
                    }
                }
                const at = course ? `the ${code} course` : `English for ${code}`;
                assert.ok(tiles >= 100 && tm / tiles >= 0.7, `${at}: tiles with a meaning (${tm} of ${tiles})`);
                assert.ok(bt >= 10 && btm / bt >= 0.65, `${at}: fill in the blanks' tiles with a meaning (${btm} of ${bt})`);
                assert.ok(bw >= 10 && bwm / bw >= 0.65, `${at}: fill in the blanks' words with a meaning (${bwm} of ${bw})`);
            }
        }
    });

    test('the user\'s two pictures: Japanese tiles for "This lesson is easy."; the Spanish "La [ ] se ha [ ] al lunes."', () => {
        const { tileMeanings, pieceMeanings } = require('../../src/linguistic/content/sounds/hints');
        const ja = tileMeanings({ learnt: 'ja', helper: 'en' }, ['この', '課は', '簡単です', '読む', '早く'], () => ({ en: 'This lesson is easy.' }));
        assert.deepEqual([ja['この'][0], ja['課は'][0], ja['簡単です'][0], ja['読む'][0], ja['早く'][0]], ['this', 'lesson', 'easy', 'read', 'early']);
        const es = tileMeanings({ learnt: 'es', helper: 'en' }, ['aplazado', 'reunión', 'informe', 'negociar'], () => ({ en: 'The meeting has been postponed to Monday.' }));
        assert.deepEqual([es.aplazado[0], es['reunión'][0], es.informe[0], es.negociar[0]], ['postponed', 'meeting', 'report', 'negotiate']);
        const words = Object.fromEntries(pieceMeanings({ learnt: 'es', helper: 'en' }, ' al lunes.', 'es', { en: 'The meeting has been postponed to Monday.' }).filter(([, m]) => m));
        assert.equal(words.lunes[0], 'Monday');
        const kn = tileMeanings({ learnt: 'en', helper: 'kn' }, ['Mysuru', 'tomorrow'], () => ({ sentence: 'ನಾವು ನಾಳೆ ಮೈಸೂರಿಗೆ ಹೋಗುತ್ತೇವೆ.' }));
        assert.deepEqual([kn.Mysuru[0], kn.tomorrow[0]], ['ಮೈಸೂರಿಗೆ', 'ನಾಳೆ'], 'English learnt: in the student\'s language, the word of their own sentence first');
    });

    test('Chinese by its syllables, a character each: 我的家庭很大。', async () => {
        const read = await shownOf('zh', 'en');
        const it = read.find(({ it: x }) => x.source === '我的家庭很大。')?.it;
        assert.equal(it?.sourceHints.spaced, false);
        assert.deepEqual(it.sourceHints.words.map(([w]) => w), ['我', '的', '家庭', '很', '大', '。']);
    });
});

