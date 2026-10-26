/**
 * Linguistic Ability — vocabulary questions, built from a lesson's words.
 *
 * An administrator adds words (English, Kannada, an example, synonyms,
 * antonyms) and the questions follow: the Kannada meaning, the word that
 * fills the example sentence, the spelling from the meaning, and a word of
 * the same or opposite meaning. A question id names its word and kind
 * ("meaning:3"), and the options are shuffled from a seed, so the same
 * question can be rebuilt — with its answer — when it is checked. In another
 * of the student's languages (languages.js) a word's `kannada` holds that
 * language's meaning and `lang` its name.
 */

/** A small seeded generator (mulberry32) from a string. */
const seeded = (text) => {
    let h = 1779033703 ^ String(text).length;
    for (let i = 0; i < String(text).length; i++) { h = Math.imul(h ^ String(text).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const shuffle = (xs, rnd) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The example with the word blanked, or null when the word is not in it as written. */
const blanked = (word) => {
    const re = new RegExp(`\\b${escape(word.word)}\\b`, 'i');
    return word.example && re.test(word.example) ? word.example.replace(re, '_____') : null;
};

// 'word': a course in another language (courses.js) asks the word for a meaning, too.
// 'hearMeaning': hear the word, pick what it means (2026-10-24: a unit's listening asks it more than one way).
const KINDS = ['meaning', 'blank', 'spell', 'synonym', 'antonym', 'word', 'listen', 'hearMeaning'];

/*
 * The questions in the student's own language (asked 2026-10-24, Kannada
 * first, then every language: "what they want to learn is the answer; what
 * they already know, in that language ask the questions"): content/asks/
 * words.js, by the language a word's meaning is in (its `lang`: none — the
 * Kannada lessons as written — 'Kannada', 'Hindi'…). The English question is
 * kept as `promptEn`; the words being learnt stay as they are; an English
 * speaker's stay English.
 */
const ASKS = require('./content/asks/words');
const askedIn = (q, w, sentence) => {
    const a = q && ASKS[w.lang || 'Kannada'];
    if (!a?.[q.kind]) return q;
    const why = { meaning: `${a.means(w)} ${w.example || ''}`.trim(), word: a.means(w), listen: a.means(w), hearMeaning: a.means(w), sentence: a.means(w), spell: `${a.means(w)} ${w.example || ''}`.trim(), synonym: a.same(w.word, q.answer), antonym: a.opposite(w.word, q.answer) }[q.kind];
    return {
        ...q, prompt: a[q.kind](w, sentence), promptEn: q.prompt,
        ...(q.hint ? { hint: q.hint.replace(/\((\d+) letters\)$/, (m, n) => a.letters(Number(n))) } : {}),
        ...(why ? { explanation: why } : {})
    };
};

/**
 * One question about words[i] of the given kind, with its answer, or null
 * when that kind does not fit the word (no example containing it, no
 * synonym…). `pool` is the words to draw wrong options from.
 */
const questionFor = (words, i, kind, seed, pool = words) => {
    const w = words[i];
    if (!w) return null;
    const q = questionInEnglish(words, i, kind, seed, pool);
    return askedIn(q, w, kind === 'blank' && q ? blanked(w) : null);
};

const questionInEnglish = (words, i, kind, seed, pool = words) => {
    const w = words[i];
    const rnd = seeded(`${seed}:${kind}:${i}`);
    const others = shuffle(pool.filter((x) => x.word !== w.word), rnd);
    const options = (right, wrong) => shuffle([right, ...[...new Set(wrong)].filter((x) => x && x !== right).slice(0, 3)], rnd);
    const id = `${kind}:${i}`;
    if (kind === 'meaning') {
        return { id, type: 'mcq', kind, prompt: w.lang === 'English' ? `What does "${w.word}" mean?` : `What does "${w.word}" mean in ${w.lang || 'Kannada'}?`, options: options(w.kannada, others.map((x) => x.kannada)), answer: w.kannada,
            explanation: `"${w.word}" means ${w.kannada}. ${w.example}`, word: w.word };
    }
    if (kind === 'word') {
        return { id, type: 'mcq', kind, prompt: `Which ${w.target ? `${w.target} ` : ''}word means "${w.kannada}"?`, options: options(w.word, others.map((x) => x.word)), answer: w.word,
            explanation: `"${w.word}" means ${w.kannada}.`, word: w.word };
    }
    // A course word has no English sentence, synonym or spelling to ask about.
    // Hear the word and pick it (a level's listening review): the word is sent to be spoken, so this is for practice.
    if (kind === 'listen') {
        return { id, type: 'mcq', kind, prompt: 'Listen, and pick the word you hear', say: w.word, sayLang: w.locale || 'en-IN', audio: w.audio || null, meaning: w.kannada,
            options: options(w.word, others.map((x) => x.word)), answer: w.word, explanation: `"${w.word}" means ${w.kannada}.`, word: w.word };
    }
    if (kind === 'hearMeaning') {
        return { id, type: 'mcq', kind, prompt: 'Listen, and pick what it means', say: w.word, sayLang: w.locale || 'en-IN', audio: w.audio || null, written: w.word,
            options: options(w.kannada, others.map((x) => x.kannada)), answer: w.kannada, explanation: `"${w.word}" means ${w.kannada}.`, word: w.word };
    }
    if (w.course && kind !== 'meaning') return null;
    if (kind === 'blank') {
        const sentence = blanked(w);
        if (!sentence) return null;
        // Wrong options of another part of speech first, so only one choice
        // fits the sentence ("a _____ animal" must not offer both big and happy).
        // Without three of them the question has more than one right answer
        // ("He was _____ about his results": anxious, confident…), so it is
        // not asked; the meaning is asked instead.
        const unlike = others.filter((x) => x.pos !== w.pos);
        if (unlike.length < 3) return null;
        return { id, type: 'mcq', kind, prompt: `Choose the word that fits: ${sentence}`, options: options(w.word, unlike.map((x) => x.word)), answer: w.word,
            explanation: `${w.example} (${w.word} = ${w.kannada})`, word: w.word };
    }
    if (kind === 'spell') {
        return { id, type: 'spelling', kind, prompt: w.lang === 'English' ? `Type the word that means "${w.kannada}".` : `Type the English word for "${w.kannada}".`, hint: `${w.word[0]}${'_'.repeat(Math.max(0, w.word.length - 1))} (${w.word.length} letters)`,
            answer: w.word, explanation: `${w.kannada} is "${w.word}". ${w.example}`, word: w.word };
    }
    if (kind === 'synonym' && w.synonyms?.length) {
        return { id, type: 'mcq', kind, prompt: `Which word means the same as "${w.word}"?`, options: options(w.synonyms[0], [...others.map((x) => x.word), ...others.flatMap((x) => x.antonyms || [])]), answer: w.synonyms[0],
            explanation: `"${w.word}" and "${w.synonyms[0]}" mean the same.${w.synonyms.length > 1 ? ` So does "${w.synonyms[1]}".` : ''}`, word: w.word };
    }
    if (kind === 'antonym' && w.antonyms?.length) {
        return { id, type: 'mcq', kind, prompt: `Which word means the opposite of "${w.word}"?`, options: options(w.antonyms[0], [...(w.synonyms || []), ...others.map((x) => x.word)]), answer: w.antonyms[0],
            explanation: `"${w.word}" and "${w.antonyms[0]}" are opposites.`, word: w.word };
    }
    return null;
};

/** Rebuild one question from its id ("meaning:3"). */
const questionById = (words, id, seed, pool) => {
    const [kind, i] = String(id).split(':');
    return KINDS.includes(kind) ? questionFor(words, Number(i), kind, seed, pool) : null;
};

/**
 * The lesson quiz: one question per word, the kinds taken in turn (with a
 * fallback to the meaning when a kind does not fit that word).
 */
const lessonQuiz = (words, seed) => (words || []).map((_, i) => lessonAsk(words, i, seed)).filter(Boolean);

/*
 * The ways a unit's lessons ask its words (asked 2026-10-24: "each unit asks
 * the same questions — give different ones"). The Words lesson asks each
 * word one way; the unit's Listening another (hear it and pick it, or hear it
 * and pick its meaning); the unit review a third — never the way a lesson
 * before it asked that word. A course's words (another language) have no
 * English sentence, spelling or synonym to ask about.
 */
const LESSON_WAYS = { course: ['meaning', 'word', 'listen'], english: ['meaning', 'listen', 'blank', 'spell', 'synonym', 'antonym'] };
const WAYS = {
    hear: { course: ['listen', 'hearMeaning'], english: ['listen', 'hearMeaning'] },
    review: { course: ['word', 'meaning', 'hearMeaning', 'listen'], english: ['word', 'spell', 'synonym', 'antonym', 'blank', 'meaning', 'hearMeaning', 'listen'] }
};
const kindOfWords = (words) => (words?.[0]?.course ? 'course' : 'english');
const turned = (xs, i) => xs.map((_, k) => xs[(i + k) % xs.length]);
// The Words lesson's way for word i, as it has always been chosen (its questions' ids stay the same).
const lessonAsk = (words, i, seed) => {
    const turn = LESSON_WAYS[kindOfWords(words)];
    return questionFor(words, i, turn[i % turn.length], seed) || questionFor(words, i, 'blank', seed) || questionFor(words, i, 'meaning', seed);
};
/** Word i asked at `stage` ('hear', 'review'): the first way, from the `by`-th on, that fits the word and is not in `not`. */
const askAt = (words, i, stage, seed, not = [], by = i) => {
    for (const k of turned(WAYS[stage][kindOfWords(words)], by)) {
        if (not.includes(k)) continue;
        const q = questionFor(words, i, k, seed);
        if (q) return q;
    }
    return questionFor(words, i, 'meaning', seed);
};
/** A unit's Listening: each word heard, not the way its Words lesson asked it. */
const hearQuiz = (words, seed) => (words || []).map((_, i) => askAt(words, i, 'hear', seed, [lessonAsk(words, i, 'k')?.kind])).filter(Boolean);
/** A unit review: each word a third way — neither its Words lesson's nor its Listening's. */
const unitQuiz = (words, seed) => (words || []).map((_, i) => {
    const first = lessonAsk(words, i, 'k')?.kind;
    const heard = askAt(words, i, 'hear', 'k', [first])?.kind;
    return askAt(words, i, 'review', seed, [first, heard]);
}).filter(Boolean);

/**
 * A level review's quiz: `size` of the words, spread through the list, each
 * asked the next of the stage's ways ('review' or 'hear').
 */
const reviewQuiz = (words, seed, size = 10, stage = 'review') => {
    const list = words || [];
    const n = Math.min(size, list.length);
    const picks = [...new Set(Array.from({ length: n }, (_, k) => Math.floor((k * list.length) / n)))];
    return picks.map((i, k) => askAt(list, i, stage, seed, [], k)).filter(Boolean);
};

/**
 * A sentence of the unit to recognise (the unit review, 2026-10-24): "which
 * sentence means …?", in the student's language, the choices sentences in
 * the language learnt. `s`: { target, helper, lang }; `pool`: the topic's
 * other sentences in the language learnt.
 */
const sentenceQuestion = (s, k, pool, seed) => {
    const rnd = seeded(`${seed}:sentence:${k}`);
    const wrong = shuffle([...new Set(pool)].filter((x) => x && x !== s.target), rnd).slice(0, 3);
    if (wrong.length < 2) return null;
    const q = { id: `sentence:${k}`, type: 'mcq', kind: 'sentence', prompt: `Which sentence means "${s.helper}"?`, options: shuffle([s.target, ...wrong], rnd), answer: s.target, explanation: `"${s.target}" means "${s.helper}".` };
    return askedIn(q, { word: s.target, kannada: s.helper, lang: s.lang });
};

module.exports = { lessonQuiz, reviewQuiz, hearQuiz, unitQuiz, sentenceQuestion, questionFor, questionById, seeded, shuffle, KINDS };
