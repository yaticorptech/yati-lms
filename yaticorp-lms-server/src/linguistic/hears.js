/**
 * Tap what you hear (2026-11-06, the user's Duolingo picture: "ನಿಮಗೆ ಕೇಳುತ್ತಿರುವುದನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ" — a sentence heard, at
 * speed or slowly, then built from word tiles, each tile heard as it is tapped; in every language): one of the unit's
 * sentences in the language learnt — English, or a course's — its words as tiles with two others of the unit among
 * them. Checked here: the words in the order heard.
 *
 * A question: { id: 'hear~<item>', type: 'hear', say: the sentence, sayLang: its voice's locale, words: the tiles,
 * answer / model: the sentence, hint: its meaning in the student's language }.
 */
const { shuffle, seeded } = require('./vocabQuiz');
const { tokensOf } = require('./blanks');

const low = (x) => String(x || '').toLowerCase();
/** A sentence as its words in order, nothing else: to compare one built from tiles with the one heard. */
const squash = (text) => low(text).normalize('NFC').replace(/[\p{P}\p{S}\s]+/gu, '');

/** One sentence to hear and build, or null when it is too short or too long to build from tiles. */
const hearOne = ({ id, learnt, helper, locale, sayLang, pool, seed }) => {
    const words = tokensOf(learnt, locale).filter((t) => t.word).map((t) => t.text);
    if (words.length < 2 || words.length > 14) return null;
    const taken = new Set(words.map(low));
    const others = shuffle([...new Set(pool.filter((w) => w && !taken.has(low(w)) && !/\s/.test(w)))], seeded(`${seed}:others`)).slice(0, 2);
    return {
        id, type: 'hear', prompt: 'Tap what you hear', say: learnt, sayLang, words: shuffle([...words, ...others], seeded(`${seed}:tiles`)),
        answer: learnt, model: learnt, hint: helper || '', explanation: helper || ''
    };
};

/** A lesson's sentences to hear (at most `count`): one its fill in the blanks does not ask (`not`) first; in a short unit, that one. */
const hearsFor = ({ key, sentences, pool, locale, sayLang, count = 1, not = [] }) => {
    const out = [];
    const mixed = shuffle(sentences || [], seeded(`${key}:hear`));
    for (const s of [...mixed.filter((x) => !not.includes(x.id)), ...mixed.filter((x) => not.includes(x.id))]) {
        if (out.length >= count) break;
        const q = hearOne({ id: `hear~${s.id}`, learnt: s.learnt, helper: s.helper, locale, sayLang, pool, seed: `${key}:${s.id}` });
        if (q) out.push(q);
    }
    return out;
};

/** Whether tiles given ("my family is big") are the sentence heard, in its order. */
const heardRight = (q, given) => squash(given) === squash(q.answer);

/**
 * Say this sentence (2026-11-06, the user's Duolingo pictures "ಈ ವಾಕ್ಯವನ್ನು ಹೇಳಿ" — a short sentence, "click to speak", a green tick
 * when said right): a short sentence of the unit in the language learnt (2 to 8 words), one not heard or filled in
 * the lesson first. Its saying is checked on the device, by the browser's speech-to-text.
 */
const saysFor = ({ key, sentences, locale, sayLang, count = 1, not = [] }) => {
    const mixed = shuffle(sentences || [], seeded(`${key}:say`));
    const out = [];
    for (const s of [...mixed.filter((x) => !not.includes(x.id)), ...mixed.filter((x) => not.includes(x.id))]) {
        if (out.length >= count) break;
        const n = tokensOf(s.learnt, locale).filter((t) => t.word).length;
        // Short to say: 2 to 8 words; Chinese and Japanese, cut into more pieces, up to 18 characters.
        const short = /^(ja|zh)/.test(locale) ? [...String(s.learnt).replace(/[\s\p{P}]/gu, '')].length <= 18 : n <= 8;
        if (n >= 2 && short) out.push({ id: `say~${s.id}`, type: 'sayit', say: s.learnt, sayLang });
    }
    return out;
};

module.exports = { hearsFor, hearOne, heardRight, squash, saysFor };
