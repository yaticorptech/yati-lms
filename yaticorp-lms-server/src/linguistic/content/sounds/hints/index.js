/**
 * Word hints, as Duolingo's (2026-11-06; the user's pictures: "ಚಿಂತೆ" tapped → worry · concern · anxiety; "make it like
 * this, the same as Duolingo, in all languages"): each word of a sentence to read — the student's own language in the
 * English course, the language learnt in another course — is marked, and tapped shows two or three English meanings.
 *
 * The meanings: the sentence's word-by-word English (../glosses for the 18 languages with sounds, ./kn.js and ./hi.js
 * for Kannada and Hindi, which have none), "a/b" in one word's part, and more from ./more.js. On the sentence's own
 * words when they line up with it (spaced writing; Chinese by its syllables); otherwise (Japanese, written without
 * spaces) on the words of its sound in English letters under it.
 */
const { wordHints } = require('..');
const OWN = { kn: require('./kn'), hi: require('./hi') };
const MORE = require('./more');

const MARK = /^[\p{P}\p{S}]+$/u;
const HAN = /\p{Script=Han}/u;

/** Small words a phrase's other meanings are never made by changing ("my family" stays "my family", not "mine family"). */
const SMALL = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
    'and', 'or', 'but', 'not', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'should', 'can', 'could', 'must', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'there']);
/** The English words' synonyms in the Words lessons (family → household), other meanings too. */
let synonyms = null;
const synonymsOf = (word) => {
    if (!synonyms) {
        synonyms = new Map();
        const lessons = [...require('../../vocabulary'), ...require('../../topics').lessons.filter((l) => l.module === 'vocabulary')];
        for (const w of lessons.flatMap((l) => l.words || [])) if (w.word && w.synonyms?.length) synonyms.set(String(w.word).toLowerCase(), w.synonyms);
    }
    return synonyms.get(word) || [];
};
/** What a meaning is looked up by: its words without their notes, in small letters ("big (is)" → "big"). */
const keyOf = (m) => String(m || '').replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const othersOf = (m) => { const k = keyOf(m); return [...(MORE[k] || []), ...synonymsOf(k)]; };
/** A phrase's other meanings: its main word's ("are quiet" → "are calm", "are peaceful"), or without "the". */
const phraseOthers = (m) => {
    const words = String(m).split(' ');
    if (words.length < 2) return [];
    const out = [];
    for (let i = words.length - 1; i >= 0 && !out.length; i--) {
        const w = keyOf(words[i]);
        if (!w || SMALL.has(w)) continue;
        // Not the word's own other form inside a phrase ("every day" → "every days").
        const form = (alt) => { const x = alt.toLowerCase(); return x.startsWith(w) || w.startsWith(x); };
        for (const alt of othersOf(w)) if (alt.split(' ').length <= 2 && !form(alt)) out.push([...words.slice(0, i), alt, ...words.slice(i + 1)].join(' '));
    }
    // "the report" → "report" (only at its start: "in the morning" stays).
    if (/^the\s/i.test(m)) out.push(m.replace(/^the\s+/i, ''));
    return out;
};

/** A word's meanings: the one meant here first, then others — three at most. */
const meaningsOf = (gloss) => {
    const own = String(gloss || '').split('/').map((m) => m.trim()).filter(Boolean);
    const out = [];
    for (const m of [...own, ...othersOf(own[0]), ...phraseOthers(own[0] || '')]) if (m && !out.some((x) => keyOf(x) === keyOf(m))) out.push(m);
    return out.slice(0, 3);
};

/** The sentence's own words (split at its spaces) with their meanings, when as many as the meanings: a mark on its own gets none. */
const onWords = (text, glosses, read = meaningsOf) => {
    const toks = String(text).trim().split(/\s+/);
    if (toks.filter((t) => !MARK.test(t)).length !== glosses.length) return null;
    let k = 0;
    return toks.map((t) => (MARK.test(t) ? [t, null] : [t, read(glosses[k++])]));
};

/** A Chinese word's syllables, from its pinyin: one vowel group each (jiātíng → 2). */
const syllables = (say) => (String(say).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[aeiouv]+/g) || []).length;
/** A Chinese sentence cut into its words by their pinyin's syllables (a character each), or null when they do not add up. */
const onCharacters = (text, pairs, read = meaningsOf) => {
    const chars = [...String(text).trim()];
    if (chars.some((c) => /[\p{L}\p{N}]/u.test(c) && !HAN.test(c))) return null;
    const counts = pairs.map(([say]) => syllables(say));
    if (counts.some((n) => !n) || counts.reduce((a, b) => a + b, 0) !== chars.filter((c) => HAN.test(c)).length) return null;
    const out = [];
    let i = 0;
    const marks = () => { let m = ''; while (i < chars.length && !HAN.test(chars[i])) m += chars[i++]; if (m) out.push([m, null]); };
    pairs.forEach(([, gloss], k) => {
        marks();
        let piece = '';
        for (let n = 0; n < counts[k]; i++) { piece += chars[i]; if (HAN.test(chars[i])) n += 1; }
        out.push([piece, read(gloss)]);
    });
    marks();
    return out;
};

/**
 * A sentence to read in `code`, word by word with its English: { on: 'text' (its own words) | 'say' (its sound's),
 * spaced (words apart, or written together as Chinese), words: [[piece, [meanings…] | null]…] }, or null with none.
 * `en`: a single word's English ("a/b"), its meanings when it has no word-by-word English of its own.
 */
const hintsFor = (code, text, en = null) => {
    if (!code || code === 'en' || !text) return null;
    const own = OWN[code]?.[text];
    if (own) { const words = onWords(text, own.split('|')); return words ? { on: 'text', spaced: true, words } : null; }
    const pairs = wordHints(code, text);
    if (!pairs) return en ? { on: 'text', spaced: true, words: [[String(text).trim(), meaningsOf(en)]] } : null;
    const words = onWords(text, pairs.map(([, g]) => g));
    if (words) return { on: 'text', spaced: true, words };
    const han = code === 'zh' ? onCharacters(text, pairs) : null;
    if (han) return { on: 'text', spaced: false, words: han };
    return { on: 'say', spaced: true, words: pairs.map(([say, g]) => [say, meaningsOf(g)]) };
};

/** A sentence's own words with their English as written ("a/b" split), for reading words back from their English; null when not on its words. */
const rawHints = (code, text) => {
    const read = (g) => String(g || '').split('/').map((m) => m.trim()).filter(Boolean);
    const own = OWN[code]?.[text];
    if (own) return onWords(text, own.split('|'), read);
    const pairs = wordHints(code, text);
    if (!pairs) return null;
    return onWords(text, pairs.map(([, g]) => g), read) || (code === 'zh' ? onCharacters(text, pairs, read) : null);
};

/**
 * English to the student's language (2026-11-06, the other half of the user's "yes, do both"): every English word the
 * app knows in `code` — the Words lessons' words, and each word of the sentences read in it, back from its English —
 * with how often each is met. Built once a language.
 */
const dictionaries = {};
const bare = (t) => String(t || '').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim();
const dictionaryOf = (code) => {
    if (dictionaries[code]) return dictionaries[code];
    const dict = new Map();
    const add = (en, word, n = 1) => {
        const k = keyOf(en), w = bare(word);
        if (!k || !w || !/[a-z]/.test(k)) return;
        if (!dict.has(k)) dict.set(k, new Map());
        dict.get(k).set(w, (dict.get(k).get(w) || 0) + n);
    };
    const pack = code === 'kn' ? null : require('../../../languages').packOf(code);
    const taught = code === 'kn'
        ? [...require('../../vocabulary'), ...require('../../topics').lessons.filter((l) => l.module === 'vocabulary')].flatMap((l) => l.words || []).map((w) => [w.word, w.kannada])
        : Object.values(pack?.words || {}).flatMap((list) => Object.entries(list));
    // The English sentences' own words, written for them (./english.js), first; then the word taught first ("अम्मा, माँ": अम्मा), weighed above a word met in a sentence.
    for (const [en, ws] of Object.entries(require('./english').wordsIn(code))) ws.forEach((w, i) => add(en, w, 6 - i));
    for (const [en, text] of taught) String(text || '').split(/\s*[,，、،;]\s*/).filter(Boolean).forEach((t, i) => add(en, t, i ? 2 : 3));
    const texts = new Set([...Object.keys(OWN[code] || {}), ...Object.values(pack?.items || {}).flatMap((list) => Object.values(list).map((it) => it.source))]);
    for (const text of texts) for (const [piece, meanings] of rawHints(code, text) || []) if (meanings) for (const m of meanings) add(m, piece);
    // Japanese sentences' words are known by their sound: written in kana here (kyou → きょう, today).
    if (code === 'ja') for (const text of texts) for (const [say, gloss] of wordHints(code, text) || []) add(String(gloss).split('/')[0], require('../kana').wordToKana(say));
    return (dictionaries[code] = dict);
};
/** An English word's other forms to look for: runs → run, studies → study, played → play, making → make. */
const NO_FORMS = new Set(['does', 'did', 'has', 'was', 'is', 'this', 'his', 'its', 'us', 'as', 'bus', 'yes', 'news']);
const FORMS = [[/ies$/, 'y'], [/'s$/, ''], [/es$/, ''], [/s$/, ''], [/ed$/, ''], [/ed$/, 'e'], [/ing$/, ''], [/ing$/, 'e']];

/**
 * An English sentence to write in the student's language `code`, word by word with that language's words (two or three,
 * the ones in this sentence's answer first): { on: 'text', spaced: true, lang: code, words: [[piece, words | null]…] },
 * or null. Phrases the app knows as one ("every day", "thank you") go together; a word it does not know is not marked.
 * `word`: a single word's own answers, for a sentence that is one word.
 */
const englishHintsFor = (code, text, { answer = '', word = null } = {}) => {
    if (!code || code === 'en' || !text) return null;
    if (word?.length) return { on: 'text', spaced: true, lang: code, words: [[String(text).trim(), [...new Set(word.flatMap((w) => String(w).split(/\s*[,，、،]\s*/)))].filter(Boolean).slice(0, 3)]] };
    const dict = dictionaryOf(code);
    const find = (k) => {
        if (dict.has(k)) return dict.get(k);
        if (k.includes(' ')) return null;
        // Never 'does' → 'do' ("How much does this cost?": not "I do"), 'has' → 'ha'.
        if (NO_FORMS.has(k)) return null;
        for (const [re, to] of FORMS) { const b = k.replace(re, to); if (b !== k && b.length >= 2 && dict.has(b)) return dict.get(b); }
        return null;
    };
    const toks = String(text).trim().split(/\s+/);
    const words = [];
    for (let i = 0; i < toks.length;) {
        let hit = null, n = 0;
        for (let m = Math.min(3, toks.length - i); m >= 1 && !hit; m--) {
            const span = toks.slice(i, i + m);
            // Never across a full stop or a comma ("home. I").
            if (span.slice(0, -1).some((t) => /\p{P}$/u.test(t))) continue;
            const k = span.map((t) => bare(t).toLowerCase()).join(' ');
            if (k.replace(/ /g, '')) { const got = find(k); if (got) { hit = got; n = m; } }
        }
        if (!hit) { words.push([toks[i], null]); i += 1; continue; }
        const inAnswer = (w) => (String(answer).includes(w) ? 1 : 0);
        const ranked = [...hit].sort((a, b) => inAnswer(b[0]) - inAnswer(a[0]) || b[1] - a[1]);
        // A word met once, beside one met very often, is left out (a slip of a sentence's English), unless it is in the answer.
        const top = Math.max(...ranked.map(([, c]) => c));
        // One of each, whatever its capital ("Por" at a sentence's start is "por").
        const seen = new Set(), kept = ranked.filter(([w, c]) => (inAnswer(w) || c * 8 >= top) && !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase()));
        words.push([toks.slice(i, i + n).join(' '), kept.slice(0, 3).map(([w]) => w)]);
        i += n;
    }
    return words.some(([, m]) => m) ? { on: 'text', spaced: true, lang: code, words } : null;
};

/**
 * Words of the language learnt, back to their meaning (2026-11-06, the user's pictures: "La [ ] se ha [ ] al lunes", the
 * tiles この 課は 簡単です — "where they answer in the language they learn, a word tapped gives its meaning in English, in
 * every language"): every word the app knows in `code` — the English sentences' (./english.js), the Words lessons', each
 * read sentence's by its word-by-word English, and, for Japanese, each sound's — to English, with how often.
 */
/** Japanese small words, whose words are written with the sentence: particles and endings. */
const JA_SMALL = { 'は': '(topic marker)', 'を': '(object marker)', 'が': '(subject marker)', 'の': 'of', 'に': 'to, at', 'で': 'at, by', 'と': 'and, with', 'も': 'also', 'か': '(question)',
    'へ': 'to', 'から': 'from', 'まで': 'until', 'です': 'is', 'ます': '(polite)', 'ました': '(did, polite)', 'でした': 'was', 'ください': 'please', 'くだ': 'please', 'さい': 'please',
    'ません': 'not', 'たち': '(more than one)', '今日': 'today', '今年': 'this year', '明日': 'tomorrow', '昨日': 'yesterday', '彼': 'he', '彼女': 'she', '私': 'I', 'どこ': 'where',
    'これ': 'this', 'それ': 'that', 'ここ': 'here', '何': 'what', '毎日': 'every day', '乗り場': 'stop, stand', '時': "o'clock", '日間': 'days', 'あり': 'there is', 'こと': 'thing' };
const backs = {};
const low = (x) => String(x || '').toLowerCase();
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const backOf = (code) => {
    if (backs[code]) return backs[code];
    const words = new Map(), sounds = new Map();
    const add = (map, w, en, n) => {
        const k = low(bare(w)), e = String(en || '').trim();
        if (!k || !e) return;
        if (!map.has(k)) map.set(k, new Map());
        map.get(k).set(e, (map.get(k).get(e) || 0) + n);
    };
    const pack = code === 'kn' ? null : require('../../../languages').packOf(code);
    for (const [en, ws] of Object.entries(require('./english').wordsIn(code))) ws.forEach((w) => add(words, w, en, 3));
    const taught = code === 'kn'
        ? [...require('../../vocabulary'), ...require('../../topics').lessons.filter((l) => l.module === 'vocabulary')].flatMap((l) => l.words || []).map((w) => [w.word, w.kannada])
        : Object.values(pack?.words || {}).flatMap((list) => Object.entries(list));
    for (const [en, text] of taught) String(text || '').split(/\s*[,，、،;]\s*/).filter(Boolean).forEach((t) => add(words, t, en, 3));
    const texts = new Set([...Object.keys(OWN[code] || {}), ...Object.values(pack?.items || {}).flatMap((list) => Object.values(list).map((it) => it.source))]);
    for (const text of texts) {
        for (const [piece, meanings] of rawHints(code, text) || []) if (meanings) meanings.forEach((m) => add(words, piece, m, 1));
        for (const [say, gloss] of wordHints(code, text) || []) add(sounds, say, String(gloss).split('/')[0], 1);
    }
    if (code === 'ja') for (const [w, en] of Object.entries(JA_SMALL)) add(words, w, en, 3);
    // Each word by its stem too, to be found before an ending.
    const stems = new Map();
    for (const [w, m] of words) { const st = stemOf(w); if (st !== w && [...st].length >= least(st) && !words.has(st)) stems.set(st, m); }
    return (backs[code] = { words, sounds, stems });
};
/** English as it is written in a sentence: "I", "Kannada", the rest in small letters. */
const shownEn = (e) => { const x = low(e); return x === 'i' ? 'I' : x === 'kannada' ? 'Kannada' : x === 'monday' || x === 'friday' || x === 'sunday' ? x[0].toUpperCase() + x.slice(1) : e; };
/** The shortest a known word may be to be found at the start of another: a character in Chinese and Japanese, two in Korean, else three. */
const HANGUL = /\p{Script=Hangul}/u;
const least = (x) => (CJK.test(x) ? 1 : HANGUL.test(x) ? 2 : 3);
/** A word without its last sign, as it is before an ending (എളുപ്പം in എളുപ്പമാണ്, ಪುಸ್ತಕ in ಪುಸ್ತಕವನ್ನು). */
const stemOf = (x) => x.replace(/\p{M}+$/u, '');
/** Whether a word of the language is `known` or begins with it (課は begins with 課; 수업은 with 수업; എളുപ്പമാണ് with എളുപ്പം). */
const isOf = (w, known) => w === known || [known, stemOf(known)].some((k) => [...k].length >= least(k) && w.startsWith(k));
const best = (m) => [...m].sort((a, b) => b[1] - a[1]).map(([e]) => e);

/**
 * A word of `code` in English: two or three meanings — first the word of this sentence's English (`en`) it stands for,
 * then the meanings the app knows it by (its own, or a word it begins with), and for Japanese its sound's (`say`).
 */
const englishOf = (code, word, { en = null, say = null } = {}) => {
    const w = low(bare(word));
    if (!w || !code || code === 'en') return null;
    const out = [];
    // (The sentence's first word in small letters: "This lesson…" → "this"; a name inside it as written: "Monday".)
    if (en) (englishHintsFor(code, en)?.words || []).forEach(([piece, xs], k) => { if (xs?.some((x) => isOf(w, low(bare(x))))) out.push(k ? bare(piece) : low(bare(piece))); });
    const { words, sounds, stems } = backOf(code);
    let hit = words.get(w);
    for (let n = [...w].length - 1; !hit && n >= least(w); n -= 1) { const head = [...w].slice(0, n).join(''); hit = words.get(head) || stems.get(head); }
    if (hit) out.push(...best(hit));
    if (say) {
        const parts = low(say).split(/[-\s]+/).filter(Boolean).map((s) => sounds.get(s));
        if (parts.length && parts.every(Boolean)) out.push(parts.map((m) => best(m)[0]).filter((x) => !/^\(.*\)$/.test(x)).join(' '));
    }
    const seen = new Set();
    const list = out.map(shownEn).filter((e) => e && !seen.has(low(e)) && seen.add(low(e)));
    return list.length ? list.slice(0, 3) : null;
};
/** An English word in the student's language `code`, its words in `sentence` (theirs) first. */
const wordIn = (code, word, sentence = '') => {
    const w = low(bare(word));
    if (!w) return null;
    // First the words of the student's own sentence whose English is this word ("Mysuru": ಮೈಸೂರಿಗೆ, "to Mysuru").
    const h = sentence ? hintsFor(code, sentence) : null;
    const exact = [], within = [];
    if (h) {
        // (Japanese: its sound's words, in kana.)
        const shown = (piece) => (h.on === 'say' ? require('../kana').wordToKana(piece) : bare(piece));
        for (const [piece, ms] of h.words) {
            if (!ms) continue;
            if (ms.some((m) => keyOf(m) === w)) exact.push(shown(piece));
            else if (!SMALL.has(w) && ms.some((m) => keyOf(m).split(' ').includes(w))) within.push(shown(piece));
        }
    }
    const known = englishHintsFor(code, String(word || '').trim(), { answer: sentence })?.words.find(([, m]) => m)?.[1] || [];
    const list = [...new Set([...exact, ...within, ...known])];
    return list.length ? list.slice(0, 3) : null;
};

/**
 * The meaning of a word of the language learnt `learnt` — in English, or, when English is learnt, in the student's
 * `helper` language. `en`: the sentence in English (a course's); `sentence`: the sentence in the student's language.
 */
const meaningOf = ({ learnt, helper }, word, { en = null, sentence = '', say = null } = {}) => (learnt === 'en' ? wordIn(helper, word, sentence) : englishOf(learnt, word, { en, say }));
/** Word tiles in the language learnt with their meanings: { tile: [meanings] } for those with any, or null. */
const tileMeanings = (who, tiles, optsOf = () => ({})) => {
    const out = {};
    for (const t of tiles || []) { const m = meaningOf(who, t, optsOf(t)); if (m) out[t] = m; }
    return Object.keys(out).length ? out : null;
};
/** A piece of a sentence in the language learnt, word by word: [[piece, meanings | null]…], spaces and marks as they are. */
const pieceMeanings = (who, text, locale, opts = {}) => [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(String(text || ''))]
    .map((s) => [s.segment, s.isWordLike ? meaningOf(who, s.segment, opts) : null]);

module.exports = { hintsFor, englishHintsFor, meaningsOf, meaningOf, tileMeanings, pieceMeanings, OWN };
