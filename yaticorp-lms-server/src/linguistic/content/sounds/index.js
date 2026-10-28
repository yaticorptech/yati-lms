/**
 * How a course's words and sentences sound, in English letters (2026-10-27,
 * user: for every language a student may not be able to read — all but
 * English, Hindi and Kannada). Shown on the flashcard in place of "noun",
 * under the words in matching pairs and quiz choices, and (asked the same
 * day) under translation sentences, their word tiles and the right answer.
 *
 *   <code>.js         by the English word each word of content/langs stands for
 *   lines/<code>.js   by translation lesson ("b-kn-en" = translation-beginner-kn-en,
 *                     "a-3" = translation-advanced-3) and item id: the sentence in the
 *                     language learnt. In a course, an "-en-kn" lesson's sentences are
 *                     built from tiles (its tiles, or its words): one sound per tile, in
 *                     order, so each tile gets its own ("-" joins words in one tile);
 *                     the others' are read, and shown whole.
 *   glosses/<code>.js the English of each word of a sentence to read, "|" between
 *                     words, one per word of its sound: tapped, a word shows it, as
 *                     Duolingo's hints (asked 2026-10-27).
 *
 * Written by hand here, with no outside service: a native speaker should check them.
 */
const CODES = ['ja', 'zh', 'ko', 'ru', 'ar', 'ur', 'ta', 'te', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'es', 'fr', 'de', 'pt'];
const LEVEL = { b: 'beginner', i: 'intermediate', a: 'advanced' };
const loaded = {}, lines = {}, glosses = {}, reverse = {};
/** A later topic's own sounds (content/topics: a topic file may carry them, 2026-10-28). */
const topicSounds = (code) => require('../topics').soundsFor(code);

/** A language's words, read once; null for English, Hindi and Kannada. */
const tableOf = (code) => {
    if (!CODES.includes(code)) return null;
    if (!(code in loaded)) loaded[code] = { ...require(`./${code}`), ...topicSounds(code).words };
    return loaded[code];
};
/** A language's sentences, read once ({} while there are none). */
const linesOf = (code) => {
    if (!CODES.includes(code)) return null;
    if (!(code in lines)) { let own = {}; try { own = require(`./lines/${code}`); } catch { /* none yet */ } lines[code] = { ...own, ...topicSounds(code).lines }; }
    return lines[code];
};
/** A language's word meanings, read once ({} while there are none). */
const glossesOf = (code) => {
    if (!CODES.includes(code)) return null;
    if (!(code in glosses)) { let own = {}; try { own = require(`./glosses/${code}`); } catch { /* none yet */ } glosses[code] = { ...own, ...topicSounds(code).glosses }; }
    return glosses[code];
};
/** A sentence's sound and its English, word by word ([[sound, English]…]), or null when they do not line up. */
const pairWords = (say, gloss) => {
    const ws = String(say || '').split(' '), gs = String(gloss || '').split('|');
    return gloss && ws.length === gs.length ? ws.map((w, i) => [w, gs[i].trim()]) : null;
};
/** The lesson a lines key stands for: "b-kn-en" → "translation-beginner-kn-en". */
const seedKeyOf = (key) => { const [level, ...rest] = key.split('-'); return `translation-${LEVEL[level]}-${rest.join('-')}`; };
/** A sentence's words as its tiles are cut (service.js bankWords). */
const wordsOf = (text) => String(text || '').replace(/[.,!?;:"“”„«»()¿¡،؟۔।—–]/g, ' ').split(/\s+/).filter(Boolean);
const PARTS = /\s*[、,，،]\s*/;
/** The tiles a sentence to build is cut into (service.js tilesOf). */
const tilesOf = (it) => (it?.tiles?.length ? it.tiles : wordsOf(it?.model));

/** How the word for the English `en` sounds in the language `code`, or null. */
const soundOf = (code, en) => tableOf(code)?.[en] || null;

/** Every word and sentence of the language, and every tile, with its sound (built once). */
const reverseOf = (code) => {
    if (!CODES.includes(code)) return null;
    if (reverse[code]) return reverse[code];
    const pack = require('../../languages').packOf(code) || {};
    const words = tableOf(code), meanings = glossesOf(code), whole = new Map(), tiles = new Map(), hints = new Map();
    const tile = (t, say) => { if (t && say && !tiles.has(t)) tiles.set(t, say); };
    for (const list of Object.values(pack.words || {})) {
        for (const [en, text] of Object.entries(list)) {
            const say = words[en];
            if (!say) continue;
            whole.set(text, say);
            const a = text.split(PARTS), b = say.split(PARTS);
            if (a.length === b.length) a.forEach((t, i) => { if (!whole.has(t)) whole.set(t, b[i]); if (wordsOf(t).length === 1) tile(t, b[i]); });
        }
    }
    for (const [key, list] of Object.entries(linesOf(code))) {
        const items = pack.items?.[seedKeyOf(key)] || {}, built = key.endsWith('-en-kn');
        for (const [id, say] of Object.entries(list)) {
            const it = items[id], text = built ? it?.model : it?.source;
            if (!text) continue;
            whole.set(text, say);
            if (!built) { const pairs = pairWords(say, meanings[key]?.[id]); if (pairs) hints.set(text, pairs); continue; }
            const ts = tilesOf(it), ss = say.split(' ');
            if (ts.length === ss.length) ts.forEach((t, i) => tile(t, ss[i]));
        }
    }
    return (reverse[code] = { whole, tiles, hints });
};

/** How a word or sentence of the language sounds, or null. */
const sayOf = (code, text) => reverseOf(code)?.whole.get(text) || null;
/** A sentence to read, word by word: [[sound, English]…], or null. */
const wordHints = (code, text) => reverseOf(code)?.hints.get(text) || null;
/** How a word tile sounds, or null. */
const tileSay = (code, t) => { const r = reverseOf(code); return r ? r.tiles.get(t) || r.whole.get(t) || null : null; };
/** { text: sound } for those of `texts` that have one, or null when none does. */
const saysFor = (code, texts, one = sayOf) => {
    const out = {};
    for (const t of texts || []) { const s = one(code, t); if (s) out[t] = s; }
    return Object.keys(out).length ? out : null;
};

module.exports = { CODES, tableOf, linesOf, glossesOf, pairWords, seedKeyOf, wordsOf, tilesOf, soundOf, sayOf, tileSay, saysFor, wordHints };
