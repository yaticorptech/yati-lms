/**
 * Linguistic Ability — the student's own language (asked 2026-10-23). English
 * is what is learnt; the student's language is the helper: word meanings,
 * translation exercises and some tips are shown in it. Kannada is the
 * original, written into the lessons themselves, and stays the default; the
 * other languages come from packs in content/langs/<code>.js, matched to the
 * lessons by seedKey and item id, and laid over a lesson as it is served and
 * judged. Nothing is translated by a service: every word is written in the
 * packs.
 *
 * A lesson with nothing in the pack (one an administrator wrote) is served in
 * Kannada, marked `languageFallback`, so it can still be done.
 */
const KANNADA = { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', locale: 'kn-IN', group: 'india' };
// Kannada first, then the other languages of India, then the world's (asked 2026-10-23).
const INDIA = ['hi', 'ta', 'te', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'ur'];
const WORLD = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko'];
const CODES = ['kn', ...INDIA, ...WORLD];
const RTL = ['ur', 'ar'];

const loaded = {};
/** A language's pack, read once; null for Kannada or a pack not there. */
const packOf = (code) => {
    if (code === 'kn' || !CODES.includes(code)) return null;
    if (!(code in loaded)) {
        try { loaded[code] = require(`./content/langs/${code}`); } catch { return null; }
    }
    return loaded[code];
};

/** Every language a student can choose (those with a pack), Kannada first; `rtl` for one written right to left. */
const languages = () => CODES.map((c) => {
    if (c === 'kn') return KANNADA;
    const p = packOf(c);
    return p ? { code: p.code, name: p.name, native: p.native, locale: p.locale, group: INDIA.includes(c) ? 'india' : 'world', ...(RTL.includes(c) ? { rtl: true } : {}) } : null;
}).filter(Boolean);

/** The modules a language leaves out (English speakers do no translation). */
const skipsOf = (code) => packOf(code)?.skipModules || [];

const infoOf = (code) => languages().find((l) => l.code === code) || KANNADA;
/** The student's language: what they chose, else Kannada. */
const languageOf = (progress) => (progress?.language && infoOf(progress.language).code === progress.language ? progress.language : 'kn');

/**
 * A lesson in the student's language: a copy, with the word meanings,
 * translation items, tips and explanations from the pack. The English stays
 * as it is. Each word carries the language's name, for the questions built
 * from it ("What does … mean in Japanese?").
 */
const localize = (lesson, code) => {
    if (!lesson) return lesson;
    const lang = infoOf(code);
    const pack = packOf(lang.code);
    const tag = (l, info) => ({ ...l, language: info.code, languageName: info.name });
    if (!pack) return tag(lesson, KANNADA);
    if (skipsOf(lang.code).includes(lesson.module)) return { ...tag(lesson, lang), notForLanguage: true };
    const key = lesson.seedKey;
    const words = key && pack.words?.[key];
    const learn = key && pack.learn?.[key];
    const items = key && pack.items?.[key];
    const has = lesson.module === 'vocabulary' ? !!words : lesson.module === 'translation' ? !!items : true;
    if (!has) return { ...tag(lesson, KANNADA), languageFallback: lang.name };

    const out = tag(lesson, lang);
    if (lesson.words) {
        out.words = lesson.words.map((w) => (words?.[w.word] ? { ...w, kannada: words[w.word], lang: lang.name } : { ...w, lang: KANNADA.name }));
    }
    if (learn && lesson.learn) {
        const l = { ...lesson.learn };
        if (learn.intro) l.intro = learn.intro;
        if (Array.isArray(learn.points)) l.points = learn.points;
        else if (learn.points && Array.isArray(l.points)) l.points = l.points.map((p, i) => learn.points[i] ?? p);
        if ('kannadaNote' in learn) l.kannadaNote = learn.kannadaNote;
        out.learn = l;
    } else if (lesson.learn?.kannadaNote) {
        // A note about Kannada says nothing to a speaker of another language.
        out.learn = { ...lesson.learn, kannadaNote: '' };
    }
    if (items) {
        const over = (it) => {
            const p = items[it.id];
            if (!p) return null;
            // Into English: the English stays, plus any the language's sentence also means
            // (a pronoun for both he and she, like Bengali সে, accepts "She…" beside "He…").
            return lesson.direction === 'kn-en'
                ? { ...it, source: p.source, explanation: p.explanation ?? it.explanation, accepted: [...(it.accepted || []), ...(p.alsoAccept || [])] }
                : { ...it, model: p.model, accepted: p.accepted || [], explanation: p.explanation ?? it.explanation, ...(p.tiles ? { tiles: p.tiles } : {}) };
        };
        out.items = (lesson.items || []).map(over).filter(Boolean);
        out.quiz = (lesson.quiz || []).map(over).filter(Boolean);
    }
    return out;
};

/** Placement questions that quote Kannada, in the student's language. */
const localizePlacement = (q, code) => {
    const p = packOf(code)?.placement?.[q.id];
    return p ? { ...q, prompt: p.prompt, explanation: p.explanation ?? q.explanation } : q;
};

module.exports = { CODES, KANNADA, packOf, languages, infoOf, languageOf, localize, localizePlacement, skipsOf };
