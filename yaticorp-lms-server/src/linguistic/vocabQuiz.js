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
const KINDS = ['meaning', 'blank', 'spell', 'synonym', 'antonym', 'word', 'listen'];

/**
 * One question about words[i] of the given kind, with its answer, or null
 * when that kind does not fit the word (no example containing it, no
 * synonym…). `pool` is the words to draw wrong options from.
 */
const questionFor = (words, i, kind, seed, pool = words) => {
    const w = words[i];
    if (!w) return null;
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
const lessonQuiz = (words, seed) => {
    const turn = words?.[0]?.course ? ['meaning', 'word'] : ['meaning', 'blank', 'spell', 'synonym', 'antonym'];
    return (words || []).map((_, i) => questionFor(words, i, turn[i % turn.length], seed) || questionFor(words, i, 'blank', seed) || questionFor(words, i, 'meaning', seed)).filter(Boolean);
};

/**
 * A review's quiz: `size` of the words, spread through the list, each asked
 * the next way in `turn` (by default as a lesson's quiz asks them).
 */
const reviewQuiz = (words, seed, size = 10, turn = null) => {
    const list = words || [];
    const n = Math.min(size, list.length);
    const picks = [...new Set(Array.from({ length: n }, (_, k) => Math.floor((k * list.length) / n)))];
    const ways = turn || (list[0]?.course ? ['meaning', 'word'] : ['meaning', 'blank', 'spell', 'synonym', 'antonym']);
    return picks.map((i, k) => questionFor(list, i, ways[k % ways.length], seed) || questionFor(list, i, 'blank', seed) || questionFor(list, i, 'meaning', seed)).filter(Boolean);
};

module.exports = { lessonQuiz, reviewQuiz, questionFor, questionById, seeded, shuffle, KINDS };
