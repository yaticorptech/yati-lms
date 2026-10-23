/**
 * Linguistic Ability — courses in the other languages (asked 2026-10-23):
 * besides English, a student can learn any language the section has words
 * and sentences for (Kannada, Hindi, Tamil, French, Japanese…), from their
 * own language. Such a course is Vocabulary and Translation, Beginner to
 * Advanced, built from what is already written: the English course's
 * vocabulary and translation lessons, with each word and sentence in the
 * language taught (the Kannada lessons themselves, or a pack in
 * content/langs) and in the student's own language. The English word or
 * sentence is the bridge between the two.
 *
 * A course lesson is kept in the database as a stub (seedKey "hi:vocab-
 * beginner-1", course, base) so progress, mistakes and XP work as for any
 * lesson; its words and items are made here when it is served.
 *
 * Directions, as everywhere in the section: 'kn-en' is "the student's
 * language → the language learnt" (write the language learnt); 'en-kn' the
 * other way.
 */
const { lessons: CONTENT } = require('./content');
const { CODES, packOf, infoOf } = require('./languages');
const { NO_SPACES } = require('./check');

const ENGLISH = { code: 'en', name: 'English', native: 'English', locale: 'en-IN' };
const byKey = new Map(CONTENT.map((l) => [l.seedKey, l]));

/** The languages there is a course for: English, Kannada, and every pack with sentences. */
const courseCodes = () => ['en', ...CODES.filter((c) => c === 'kn' || Object.keys(packOf(c)?.items || {}).length)];
const courseInfo = (code) => (code === 'en' ? ENGLISH : (() => { const i = infoOf(code); return { code: i.code, name: i.name, native: i.native, locale: i.locale }; })());
const courses = () => courseCodes().map((c) => ({ ...courseInfo(c), full: c === 'en' }));
/** The course a student is on (English when they have not chosen). */
const courseOf = (progress) => (progress?.course && courseCodes().includes(progress.course) ? progress.course : 'en');

/* ── Words and sentences in each language ────────────────────────────── */

/** A word of an English vocabulary lesson, in `code`: English itself, the Kannada meaning, or a pack's. */
const wordIn = (code, baseKey, w) => (code === 'en' ? w.word : code === 'kn' ? w.kannada : packOf(code)?.words?.[baseKey]?.[w.word] || null);

/**
 * One translation item of an English course lesson, in `code`: { text,
 * accepted, tiles, explanation }. An 'en-kn' item (English → Kannada) is
 * written in English and answered in each language; a 'kn-en' one is written
 * in each language and answered in English.
 */
const itemIn = (code, base, it) => {
    const p = code === 'en' || code === 'kn' ? null : packOf(code)?.items?.[base.seedKey]?.[it.id];
    if (base.direction === 'en-kn') {
        if (code === 'en') return { text: it.source, accepted: [], explanation: it.explanation };
        if (code === 'kn') return { text: it.model, accepted: it.accepted || [], explanation: it.explanation };
        return p ? { text: p.model, accepted: p.accepted || [], tiles: p.tiles, explanation: p.explanation } : null;
    }
    if (code === 'en') return { text: it.model, accepted: it.accepted || [], explanation: it.explanation };
    if (code === 'kn') return { text: it.source, accepted: [], explanation: it.explanation };
    return p ? { text: p.source, accepted: [], explanation: p.explanation } : null;
};

/* ── The stubs, seeded once ──────────────────────────────────────────── */

/** The stub of one English vocabulary or translation lesson in the `code` course. */
const stubOf = (code, l) => {
    const topic = String(l.title).split(':')[0];
    // An English → Kannada lesson becomes "write it in the language"; Kannada → English, "read it".
    const write = l.direction === 'en-kn';
    return {
        seedKey: `${code}:${l.seedKey}`, course: code, base: l.seedKey, module: l.module, level: l.level, order: l.order,
        title: l.module === 'vocabulary' ? l.title : `${topic}: ${write ? 'write in' : 'read'} ${courseInfo(code).name}`,
        summary: l.summary, status: 'published', updatedBy: 'Course content',
        direction: l.module === 'translation' ? (write ? 'kn-en' : 'en-kn') : null, learn: {}
    };
};
/** Every course lesson's stub: one per English vocabulary and translation lesson, per language. */
const stubs = () => courseCodes().filter((c) => c !== 'en').flatMap((code) => CONTENT.filter((l) => l.module === 'vocabulary' || l.module === 'translation').map((l) => stubOf(code, l)));

/* ── A course lesson, as it is served ────────────────────────────────── */

/**
 * The stub made whole, for a student whose own language is `helper`: words
 * with their meanings, or sentences to translate, and a few tips.
 */
const build = (stub, helper) => {
    const base = byKey.get(stub.base);
    const X = courseInfo(stub.course);
    const Y = helper === 'en' ? ENGLISH : infoOf(helper);
    const out = { ...stub, language: Y.code, languageName: Y.name, target: X.code, targetName: X.name, targetLocale: X.locale };
    if (!base) return { ...out, words: [], items: [], quiz: [] };
    if (stub.module === 'vocabulary') {
        out.words = (base.words || []).map((w) => {
            const word = wordIn(X.code, base.seedKey, w), meaning = wordIn(Y.code, base.seedKey, w);
            return word && meaning ? { word, kannada: meaning, pos: w.pos, example: '', synonyms: [], antonyms: [], audio: null, lang: Y.name, target: X.name, locale: X.locale, course: true, en: w.word } : null;
        }).filter(Boolean);
        out.learn = { intro: `New ${X.name} words, with their meanings in ${Y.name}. Tap a card to see the meaning, and the speaker to hear the word.` };
        return out;
    }
    // Translation: write the language learnt (from the student's own), or read it.
    const write = stub.direction === 'kn-en';
    const make = (it) => {
        const from = itemIn(write ? Y.code : X.code, base, it), to = itemIn(write ? X.code : Y.code, base, it);
        if (!from || !to) return null;
        return {
            id: it.id, kind: it.kind, topic: it.topic, open: !!it.open, source: from.text, model: to.text, accepted: to.accepted || [],
            ...(to.tiles ? { tiles: to.tiles } : {}),
            // Japanese or Chinese with no tiles cut for it: one tile would be the whole answer, so it is typed.
            ...(!to.tiles && NO_SPACES.includes(write ? X.code : Y.code) ? { typed: true } : {}),
            explanation: (write ? to : from).explanation || ''
        };
    };
    out.items = (base.items || []).map(make).filter(Boolean);
    out.quiz = (base.quiz || []).map(make).filter(Boolean);
    out.learn = write
        ? { intro: `Read each sentence in ${Y.name} and write it in ${X.name}.`, points: [`Tap the word tiles in order, or switch to the keyboard and type in ${X.name}.`, `No ${X.name} keyboard? Use the ${X.name} letters under the answer box.`, 'A close answer counts: you will see the model and the small differences.'] }
        : { intro: `Read each sentence in ${X.name} and write what it means in ${Y.name}.`, points: ['Read the whole sentence first, then the words you know.', `Tap the word tiles in order, or type in ${Y.name}.`, 'A close answer counts: you will see the model and the small differences.'] };
    return out;
};

module.exports = { ENGLISH, courseCodes, courseInfo, courses, courseOf, stubs, stubOf, build, wordIn, itemIn };
