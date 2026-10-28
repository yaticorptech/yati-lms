/**
 * Linguistic Ability — the topics added after the first two of each level
 * (asked 2026-10-24: "make more units in each section for each language"):
 * one more per level, each two units (parts.js); a fourth per level on 2026-10-28. A topic's file holds its
 * lessons, and its words and sentences in every language; here they are laid
 * out as the language packs (content/langs) and the Kannada questions
 * (content/asks/kn.js) are, and merged into them when those are read
 * (languages.js).
 */
// Topic 4 of each level (2026-10-28, "more units, as Duolingo"): daily routine, free time, the environment.
const TOPICS = [require('./travel'), require('./health'), require('./money'), require('./daily'), require('./freetime'), require('./planet')];

const merge = (list) => Object.assign({}, ...list);

/** The topics' share of one language's pack: { words, items }, only what is written in it (English has no sentences: it is not translated). */
const packFor = (code) => {
    const words = {}, items = {};
    const some = (o) => (Object.keys(o).length ? o : null);
    for (const t of TOPICS) {
        for (const [key, byWord] of Object.entries(t.words)) {
            const w = some(Object.fromEntries(Object.entries(byWord).filter(([, m]) => m[code]).map(([word, m]) => [word, m[code]])));
            if (w) words[key] = w;
        }
        for (const [key, byId] of Object.entries(t.sentences)) {
            const it = some(Object.fromEntries(Object.entries(byId).filter(([, m]) => m[code]).map(([id, m]) => [id, { source: m[code] }])));
            if (it) items[key] = it;
        }
    }
    return { words, items };
};

/**
 * The topics' sounds in one language, for content/sounds (2026-10-28: a topic may carry `sounds`, by language
 * code: `words` by English word; `lines` and `glosses` by its translation lesson's item id).
 */
const LEVEL_KEY = { beginner: 'b', intermediate: 'i', advanced: 'a' };
const soundsFor = (code) => {
    const words = {}, lines = {}, glosses = {};
    for (const t of TOPICS) {
        const s = t.sounds?.[code];
        if (!s) continue;
        Object.assign(words, s.words || {});
        const tr = t.lessons.find((l) => l.module === 'translation');
        const key = `${LEVEL_KEY[tr.level]}-${tr.order}`;
        if (s.lines) lines[key] = { ...(lines[key] || {}), ...s.lines };
        if (s.glosses) glosses[key] = { ...(glosses[key] || {}), ...s.glosses };
    }
    return { words, lines, glosses };
};

module.exports = {
    soundsFor,
    lessons: TOPICS.flatMap((t) => t.lessons),
    // A topic's two units, by its Words lesson (parts.js).
    names: merge(TOPICS.map((t) => t.names)),
    // A new translation lesson's tips: the first lesson's that goes the same way, in each language.
    tipsFrom: merge(TOPICS.map((t) => t.tipsFrom)),
    packFor,
    asks: {
        questions: merge(TOPICS.map((t) => t.asks.questions || {})),
        writing: merge(TOPICS.map((t) => t.asks.writing || {})),
        speaking: merge(TOPICS.map((t) => t.asks.speaking || {}))
    }
};
