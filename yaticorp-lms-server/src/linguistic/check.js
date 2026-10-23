/**
 * Linguistic Ability — checking answers, with no outside service.
 *
 * Everything is compared after normalising: case, spacing and punctuation are
 * set aside, curly quotes become straight ones, Kannada digits become 0–9, the
 * invisible joiners Kannada keyboards insert are dropped, and English
 * contractions are spelled out ("I'm" = "I am"), so a correct answer is not
 * failed for how it was typed. The student's other languages (languages.js)
 * each have their way too: Japanese and Chinese are written without spaces, so
 * they are compared letter by letter; Korean spacing varies, so spaces are set
 * aside; a French, Spanish, German or Portuguese answer right but for an accent
 * counts, with the accents shown; Arabic and Urdu vowel marks and letter
 * variants are set aside; ё is е; and the danda and ۔ are punctuation.
 *
 * Grammar, spelling and vocabulary answers must then match exactly — the
 * point of the question is the exact form — though a near miss is told it is
 * nearly right. Translations are marked more generously: several
 * translations can be correct, so a close match to the model or to any
 * accepted alternative counts, and a long passage is never marked wrong by
 * the machine at all — it is compared with the model and sent for review.
 */

const ZERO_WIDTH = /[​-‍⁠﻿]/g;
const KANNADA_DIGITS = /[೦-೯]/g;
const CONTRACTIONS = [
    [/\bcan't\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'], [/\blet's\b/g, 'let us'],
    [/\b(i|you|we|they)'re\b/g, '$1 are'], [/\b(he|she|it|that|what|there|here|who)'s\b/g, '$1 is'],
    [/\b(i|you|we|they|who)'ve\b/g, '$1 have'], [/\b(i|you|he|she|it|we|they)'ll\b/g, '$1 will'], [/\b(i|you|he|she|we|they)'d\b/g, '$1 would'],
    [/\bi'm\b/g, 'i am'], [/\b(do|does|did|is|are|was|were|have|has|had|could|would|should|must|need)n't\b/g, '$1 not'],
    [/\bcan not\b/g, 'cannot']
];

// Languages written without spaces between words, and those where a slip of accent still counts.
const NO_SPACES = ['ja', 'zh'];
const ACCENTED = ['fr', 'es', 'de', 'pt'];
// Arabic-script vowel marks and the stretching line, which change no word.
const ARABIC_MARKS = /[\u064B-\u065F\u0670\u0640]/g;

/** The answer as it is compared. `lang` 'en' also spells out contractions; Japanese and Chinese drop every space. */
const normalize = (text, lang = 'en') => {
    let t = String(text ?? '').normalize(NO_SPACES.includes(lang) ? 'NFKC' : 'NFC').replace(ZERO_WIDTH, '')
        .replace(KANNADA_DIGITS, (d) => String(d.charCodeAt(0) - 0x0ce6))
        .replace(/[‘’‛`´]/g, "'").replace(/[“”„‟]/g, '"')
        .replace(/ँ/g, 'ं')
        .toLowerCase();
    if (lang === 'ar' || lang === 'ur') {
        t = t.replace(ARABIC_MARKS, '');
        t = lang === 'ar' ? t.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه') : t.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    }
    if (lang === 'ru') t = t.replace(/ё/g, 'е');
    if (lang === 'en') for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
    t = t.replace(/[.,!?;:"()[\]{}–—…।॥|/\\₹*_~\-。、！？「」『』・〜«»《》،؛؟۔¿¡]/g, ' ').replace(/'/g, lang === 'fr' ? ' ' : '').replace(/\s+/g, ' ').trim();
    return NO_SPACES.includes(lang) ? t.replace(/ /g, '') : t;
};
const words = (t) => (t ? t.split(' ') : []);
/** What a translation is compared in: letters for Japanese and Chinese (no spaces between words), words otherwise. */
const unitsOf = (lang) => (NO_SPACES.includes(lang) ? (t) => [...t] : words);
/** Without spaces, for languages where spacing is not the point (Korean). */
const compact = (t) => t.replace(/ /g, '');
/** Without accents, for an answer right but for them. */
const plain = (t) => t.replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Edit distance, for "nearly right" and for the closeness of a translation. */
const levenshtein = (a, b) => {
    if (a === b) return 0;
    const A = [...a], B = [...b];
    if (!A.length) return B.length;
    if (!B.length) return A.length;
    let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
    for (let i = 1; i <= A.length; i++) {
        const cur = [i];
        for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
        prev = cur;
    }
    return prev[B.length];
};
const charRatio = (a, b) => (a || b ? 1 - levenshtein(a, b) / Math.max([...a].length, [...b].length) : 1);
/** Word overlap (F1) between two normalised answers. */
const wordOverlap = (a, b) => {
    const A = words(a), B = words(b);
    if (!A.length || !B.length) return 0;
    const counts = new Map();
    for (const w of B) counts.set(w, (counts.get(w) || 0) + 1);
    let common = 0;
    for (const w of A) if (counts.get(w)) { common++; counts.set(w, counts.get(w) - 1); }
    if (!common) return 0;
    const p = common / A.length, r = common / B.length;
    return (2 * p * r) / (p + r);
};
/** How alike two normalised answers are, 0 to 1: words and letters together. */
const similarity = (a, b) => Math.round((0.5 * wordOverlap(a, b) + 0.5 * charRatio(a, b)) * 100) / 100;

// A "not" on one side only turns a sentence around, however alike it looks.
// Where "not" is a word of its own it must stand alone (Urdu قیمت "price" holds مت "don't");
// where it is an ending (Kannada, Tamil, Telugu, Malayalam, Japanese, Chinese, Korean) it is found inside words.
const alone = (w) => `(?<![\\p{L}\\p{M}])(?:${w})(?![\\p{L}\\p{M}])`;
const NEGATION = new RegExp([
    alone('not|no|never|cannot|nothing|nobody|ne|pas|jamais|rien|personne|aucun|aucune|nunca|nada|nadie|nicht|kein|keine|keinen|nie|nichts|não|nenhum'),
    alone('नहीं|मत|नाही|नको|না|নয়|নেই|નથી|ના|ਨਹੀਂ|ਨਾ|ନାହିଁ|ନୁହେଁ|ନା|نہیں|مت|نہ|لا|لم|لن|ليس|не|нет|никогда|ничего|안'),
    'ಇಲ್ಲ|ಬೇಡ|ಬಾರದು|ಲಾರ|இல்லை|வேண்டாம்|లేదు|కాదు|వద్దు|ഇല്ല|ില്ല|അല്ല|വേണ്ട|ない|ません|なかった|不|没|않|못|없'
].join('|'), 'u');
const sameSense = (a, b) => NEGATION.test(a) === NEGATION.test(b);

/**
 * Word by word, how the answer differs from the reference: same, missing (in
 * the reference only) or extra (in the answer only), from the longest common
 * run of words. For showing the student where they differ.
 */
const diff = (answer, reference, split = words) => {
    const A = split(answer), B = split(reference);
    const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < A.length && j < B.length) {
        if (A[i] === B[j]) { out.push({ w: A[i], t: 'same' }); i++; j++; }
        else if (L[i + 1][j] >= L[i][j + 1]) out.push({ w: A[i++], t: 'extra' });
        else out.push({ w: B[j++], t: 'missing' });
    }
    while (i < A.length) out.push({ w: A[i++], t: 'extra' });
    while (j < B.length) out.push({ w: B[j++], t: 'missing' });
    return out;
};

/* ── Questions: multiple choice, blanks, corrections, rearranging, spelling ── */

/**
 * Grade one question. `q` has the answer (and `accepted`); `given` is what the
 * student sent. Returns { correct, near } — near: not right, but one small
 * slip away (a typo), so the feedback can say so.
 */
const gradeQuestion = (q, given) => {
    const g = normalize(given);
    if (!g) return { correct: false, near: false };
    const refs = [q.answer, ...(q.accepted || [])].map((r) => normalize(r));
    if (refs.includes(g)) return { correct: true, near: false };
    if (q.type === 'mcq') return { correct: false, near: false };
    const best = Math.max(...refs.map((r) => charRatio(g, r)));
    return { correct: false, near: best >= 0.8 && sameSense(g, refs[0]) };
};

/* ── Translations ───────────────────────────────────────────────────────── */

const TRANSLATION_PASS = 0.85;   // this close to a reference counts as right
const TRANSLATION_NEAR = 0.6;    // this close is "almost": worth another go

/**
 * Check a translation against the model and the accepted alternatives.
 *   verdict 'exact'   — matches one of them once normalised
 *           'close'   — very nearly matches one (counts as correct)
 *           'almost'  — on the way, but not right yet
 *           'wrong'
 *           'review'  — an open passage: compared, never marked wrong; a
 *                       teacher reviews it
 * Also returns the reference it was closest to, a word-by-word diff against
 * it, and the closeness as a percentage.
 */
const checkTranslation = (item, given, direction, language = 'kn', target = 'en') => {
    // 'kn-en' is written in the language learnt (English, or a course's), 'en-kn' in the student's own.
    const lang = direction === 'kn-en' ? target : language;
    // Japanese, Chinese and Korean: letters decide, and spacing does not count.
    const cjk = NO_SPACES.includes(lang) || lang === 'ko';
    const shortOf = (t) => (cjk ? compact(t).length <= 4 : words(t).length <= 2);
    const g = normalize(given, lang);
    const refs = [item.model, ...(item.accepted || [])].filter(Boolean);
    const scored = refs.map((r) => {
        const n = normalize(r, lang);
        // Short answers (a word or two) are about spelling, so letters decide.
        const s = cjk ? Math.round(charRatio(compact(g), compact(n)) * 100) / 100
            : shortOf(n) && shortOf(g) ? Math.round(charRatio(g, n) * 100) / 100 : similarity(g, n);
        return { ref: r, n, s };
    }).sort((a, b) => b.s - a.s);
    const best = scored[0] || { ref: item.model, n: normalize(item.model, lang), s: 0 };
    const closeness = Math.round(best.s * 100);
    const base = { closest: best.ref, closeness, diff: diff(g, best.n, unitsOf(lang)) };
    if (!g) return { ...base, verdict: 'wrong', correct: false };
    if (item.open) return { ...base, verdict: 'review', correct: null };
    if (scored.some((x) => (cjk ? compact(x.n) === compact(g) : x.n === g))) return { ...base, verdict: 'exact', correct: true };
    if (ACCENTED.includes(lang) && scored.some((x) => plain(x.n) === plain(g))) return { ...base, verdict: 'close', correct: true, accents: true };
    const short = shortOf(best.n);
    if (!short && best.s >= TRANSLATION_PASS && sameSense(g, best.n)) return { ...base, verdict: 'close', correct: true };
    if (best.s >= TRANSLATION_NEAR) return { ...base, verdict: 'almost', correct: false };
    return { ...base, verdict: 'wrong', correct: false };
};

module.exports = { normalize, similarity, charRatio, wordOverlap, levenshtein, diff, gradeQuestion, checkTranslation, TRANSLATION_PASS, TRANSLATION_NEAR, NO_SPACES };
