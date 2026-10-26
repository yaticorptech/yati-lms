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
/**
 * A pack with the later topics' words and sentences in it (content/topics),
 * and their translation lessons' tips: those of the first lesson that goes
 * the same way.
 */
const withTopics = (pack, code) => {
    const topics = require('./content/topics');
    const add = topics.packFor(code);
    const learn = { ...(pack.learn || {}) };
    for (const [key, from] of Object.entries(topics.tipsFrom)) if (learn[from] && !learn[key]) learn[key] = learn[from];
    return { ...pack, words: { ...(pack.words || {}), ...add.words }, items: { ...(pack.items || {}), ...add.items }, learn };
};
/** A language's pack, read once; null for Kannada or a pack not there. */
const packOf = (code) => {
    if (code === 'kn' || !CODES.includes(code)) return null;
    if (!(code in loaded)) {
        try { loaded[code] = withTopics(require(`./content/langs/${code}`), code); } catch { return null; }
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
const localizeOwn = (lesson, code) => {
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

/*
 * The questions asked in the student's own language (asked 2026-10-24: a
 * Kannada speaker learning English cannot read questions written in English):
 * content/asks/<code>.js, Kannada so far. The question is theirs; the choices
 * and the English to work on stay English; the English question is kept as
 * `promptEn`.
 */
const ASKS = {};
const asksOf = (code) => {
    if (!(code in ASKS)) {
        try { ASKS[code] = require(`./content/asks/${code}`); } catch { ASKS[code] = null; }
        // The later topics' questions in Kannada (content/topics).
        if (ASKS[code] && code === 'kn') {
            const more = require('./content/topics').asks;
            ASKS[code] = { ...ASKS[code], questions: { ...ASKS[code].questions, ...more.questions }, writing: { ...ASKS[code].writing, ...more.writing }, speaking: { ...ASKS[code].speaking, ...more.speaking } };
        }
    }
    return ASKS[code];
};
const BLANK = /_{3,}/;
const HEAD = /^[^:]{4,70}:\s/;
/** One question in the student's language: its own words, a phrase asked in many lessons, or "choose the word" before an English sentence with a blank. */
const ask = (asks, byId, q) => {
    if (!q?.prompt) return q;
    const own = byId?.[q.id] || asks.phrases?.[q.prompt]
        || (asks.blankHead && q.type === 'mcq' && BLANK.test(q.prompt) && !HEAD.test(q.prompt) ? `${asks.blankHead}: ${q.prompt}` : null);
    return own ? { ...q, prompt: own, promptEn: q.prompt } : q;
};
const withAsks = (lesson, code) => {
    const asks = lesson && lesson.language === code ? asksOf(code) : null;
    if (!asks || !lesson.seedKey) return lesson;
    const key = lesson.seedKey;
    const byId = asks.questions?.[key];
    const out = { ...lesson };
    if (lesson.practice) out.practice = lesson.practice.map((q) => ask(asks, byId, q));
    if (lesson.quiz && lesson.module !== 'translation') out.quiz = lesson.quiz.map((q) => ask(asks, byId, q));
    if (lesson.writing) {
        out.writing = lesson.writing.map((t) => {
            const own = asks.writing?.[key]?.[t.id] || asks.phrases?.[t.prompt];
            return own ? { ...t, prompt: own, promptEn: t.prompt } : t;
        });
    }
    const sp = asks.speaking?.[key];
    if (sp && lesson.speaking) {
        out.speaking = { ...lesson.speaking, prompt: sp.prompt || lesson.speaking.prompt, promptEn: lesson.speaking.prompt, ...(sp.checklist ? { checklist: sp.checklist, checklistEn: lesson.speaking.checklist } : {}) };
    }
    return out;
};

/** A lesson in the student's language, its questions asked in it where they are written (content/asks). */
const localize = (lesson, code) => withAsks(localizeOwn(lesson, code), infoOf(code).code);

/** Placement questions in the student's language: those that quote Kannada (the packs), and every one asked in Kannada (content/asks). */
const localizePlacement = (q, code) => {
    const p = packOf(code)?.placement?.[q.id];
    const out = p ? { ...q, prompt: p.prompt, explanation: p.explanation ?? q.explanation } : q;
    const own = asksOf(code)?.placement?.[q.id];
    return own ? { ...out, prompt: own, promptEn: q.prompt } : out;
};

module.exports = { CODES, KANNADA, packOf, languages, infoOf, languageOf, localize, localizePlacement, skipsOf };
