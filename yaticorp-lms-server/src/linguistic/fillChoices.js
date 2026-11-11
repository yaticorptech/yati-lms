/**
 * Choices for a fill-in-the-blank question (2026-11-06, the user: "give the options here — typing is hard; in all
 * languages"): the word that goes in the blank, among two or three others to tap, so it can be answered without a
 * keyboard. Where the question names them ("___ is your name? (What / Where)") those; else the small words it is one of
 * (a / an / the, at / in / on, he / him / his…); else, for a verb asked in a form ("She ___ (go) …"), its forms (goes,
 * go, going, is going); else other answers of the lesson. The same each time (seeded by the question).
 */
const { shuffle, seeded } = require('./vocabQuiz');

const GROUPS = [
    ['a', 'an', 'the'], ['at', 'in', 'on'], ['for', 'since', 'ago'], ['he', 'him', 'his'], ['she', 'her', 'hers'], ['they', 'them', 'their'],
    ['we', 'us', 'our'], ['i', 'me', 'my'], ['its', "it's"], ['some', 'any'], ['much', 'many'], ['this', 'these', 'those'],
    ['and', 'but', 'so', 'because'], ['when', 'although', 'unless', 'in case'], ['who', 'which', 'where'], ['what', 'where', 'when', 'who']
];
const low = (x) => String(x || '').trim().toLowerCase();
/** Written as the answer is: a capital first letter when the answer has one ("What" / "Where"). */
const likeAnswer = (word, answer) => (/^[A-Z]/.test(String(answer)) ? word.charAt(0).toUpperCase() + word.slice(1) : word);
const third = (v) => (/(s|x|z|ch|sh|o)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`);
const ing = (v) => (/ie$/.test(v) ? `${v.slice(0, -2)}ying` : /[^e]e$/.test(v) ? `${v.slice(0, -1)}ing` : `${v}ing`);

const fillChoices = (q, others = []) => {
    if (!q || q.type !== 'fill' || !q.answer) return null;
    const answer = String(q.answer).trim();
    let options = null;
    // Named in the question, at its end: "(What / Where)".
    const named = String(q.prompt || '').match(/\(([^()]*\/[^()]*)\)\s*$/);
    if (named) options = named[1].split('/').map((x) => x.trim()).filter(Boolean);
    // A group of small words it belongs to.
    if (!options) { const g = GROUPS.find((x) => x.includes(low(answer))); if (g) options = g.map((w) => likeAnswer(w, answer)); }
    // A verb asked in a form: "(go)" → goes, go, going, is going.
    if (!options) {
        const verb = String(q.prompt || '').match(/\(([a-z]+)\)/i);
        if (verb) { const v = low(verb[1]); options = [answer, v, third(v), ing(v), `is ${ing(v)}`]; }
    }
    // Else: other answers of the lesson.
    if (!options) options = [answer, ...others.filter((x) => low(x) !== low(answer))];
    const unique = [...new Map(options.map((o) => [low(o), o])).values()].filter((o) => low(o) !== low(answer));
    const picked = shuffle(unique, seeded(`${q.id}:${answer}:choices`)).slice(0, 3);
    if (!picked.length) return null;
    return shuffle([answer, ...picked], seeded(`${q.id}:${answer}:order`));
};

module.exports = { fillChoices };
