/**
 * Fill in the blanks (2026-11-05, from Duolingo's "ಬಿಟ್ಟ ಸ್ಥಳ ತುಂಬಿ" — "a [rabbit], two [rabbits]"; the user chose: in the
 * translation lessons and the Words lessons, each blank filled by tapping a word tile): a sentence in the language
 * being learnt with one or two of its words missing — the unit's own words first — its meaning in the student's
 * language above it, and tiles: the missing words among a few others of the unit. In every language and course: the
 * sentences are the unit's own translations, as the student has them. Words are found with the runtime's word
 * splitter (Intl.Segmenter), so Japanese and Chinese, written without spaces, are split too.
 *
 * A question: { id: 'blank~<item>', type: 'blanks', parts: [text | null (a blank)], answers: [the missing words, in
 * order], words: the tiles, hint: the sentence in the student's language, model: the whole sentence }.
 */
const { shuffle, seeded } = require('./vocabQuiz');

/** Words too small to be the point of a blank (English). */
const STOP = new Set(['a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'at', 'by', 'and', 'or', 'but', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'us', 'them', 'this', 'that', 'for', 'with', 'do', 'does', 'did', 'not', 'will', 'can', 'has', 'have', 'had',
    // Japanese and Chinese: the endings and pointers, not the words of the sentence.
    'です', 'ます', 'でした', 'ました', 'これ', 'それ', 'あれ', 'この', 'その', '这是', '那是']);
const low = (x) => String(x || '').toLowerCase();
const first = (x) => String(x || '').replace(/\([^)]*\)/g, ' ').split(/\s*[,;/、，]\s*/)[0].trim();
const tokensOf = (text, locale) => [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(String(text || '').trim())].map((s) => ({ text: s.segment, word: !!s.isWordLike }));
/** Whether a word of the sentence is one of these (as it is, or with an ending: ಕುಟುಂಬ in ಕುಟುಂಬದ). */
const isOneOf = (w, words) => words.some((u) => { const a = low(w), b = low(u); return !!b && (a === b || (b.length >= 3 && a.startsWith(b))); });
const fits = (t) => t.word && [...t.text].length >= 2 && !STOP.has(low(t.text)) && !/^\d+$/.test(t.text);

/** One sentence with blanks — `most` of them, the `prefer` words first — or null when it has too few words. */
const blankOne = ({ id, learnt, helper, locale, prefer, pool, seed, most = 2 }) => {
    const toks = tokensOf(learnt, locale);
    const words = toks.map((t, i) => (t.word ? i : -1)).filter((i) => i >= 0);
    if (words.length < 2) return null;
    const theirs = words.filter((i) => fits(toks[i]) && isOneOf(toks[i].text, prefer));
    const rest = words.filter((i) => fits(toks[i]) && !theirs.includes(i)).sort((a, b) => [...toks[b].text].length - [...toks[a].text].length);
    const picked = [...theirs, ...rest].slice(0, words.length >= 5 ? most : 1).sort((a, b) => a - b);
    if (!picked.length) return null;
    // The sentence as it is written, its spaces kept, a blank (null) for each missing word.
    const parts = [];
    let text = '';
    toks.forEach((t, i) => { if (picked.includes(i)) { if (text) parts.push(text); text = ''; parts.push(null); } else text += t.text; });
    if (text) parts.push(text);
    const answers = picked.map((i) => toks[i].text);
    const taken = new Set(answers.map(low));
    const others = shuffle([...new Set(pool.filter((w) => w && !taken.has(low(w)) && !/\s/.test(w)))], seeded(`${seed}:others`)).slice(0, answers.length === 1 ? 3 : 4);
    return {
        id, type: 'blanks', parts, answers, words: shuffle([...answers, ...others], seeded(`${seed}:tiles`)), hint: helper || '', model: learnt,
        prompt: parts.map((p) => (p === null ? '___' : p)).join(''), answer: learnt, explanation: helper || ''
    };
};

/** A served sentence's two sides: the one in the language learnt (served 'en-kn': its source; 'kn-en': its model) and the student's. */
const sidesOf = (it, direction) => ((it.direction || direction) === 'en-kn' ? { learnt: it.source, helper: it.model } : { learnt: it.model, helper: it.source });
const sentencesOf = (items, direction) => (items || []).filter((it) => it.kind === 'sentence' && !it.open && it.source && it.model).map((it) => ({ id: it.id, ...sidesOf(it, direction) }));
/** Tiles to mix in: the unit's words, and the words of its other sentences. */
const poolOf = (unitWords, sentences, locale) => [...unitWords, ...sentences.flatMap((s) => tokensOf(s.learnt, locale).filter(fits).map((t) => t.text))];

/**
 * A lesson's blanks (at most `count`): `sentences` its sentences ({ id, learnt, helper }), `prefer` the words it is
 * about, `need` true to keep only sentences with one of them (a Words lesson), `most` blanks to a sentence.
 */
const blanksFor = ({ key, sentences, prefer, pool, locale, need = false, most = 2, count = 2 }) => {
    const ranked = shuffle(sentences, seeded(`${key}:blanks`))
        .map((s) => ({ s, has: tokensOf(s.learnt, locale).some((t) => t.word && isOneOf(t.text, prefer)) }))
        .filter((x) => !need || x.has)
        .sort((a, b) => Number(b.has) - Number(a.has));
    const out = [];
    for (const { s } of ranked) {
        if (out.length >= count) break;
        const q = blankOne({ id: `blank~${s.id}`, learnt: s.learnt, helper: s.helper, locale, prefer, pool: pool.filter((w) => w !== s.learnt), seed: `${key}:${s.id}`, most });
        if (q) out.push(q);
    }
    return out;
};

module.exports = { blanksFor, blankOne, sentencesOf, poolOf, tokensOf, first };
