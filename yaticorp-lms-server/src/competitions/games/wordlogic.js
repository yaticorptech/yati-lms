/**
 * Word Logic, a Group Brain game: anagrams and odd-one-out sets made fresh, with analogies, synonyms, opposites and spelling written by hand.
 * Two to six players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine, sample, shuffle } = require('./quizCore');
const { WORDS_GAME, WORD } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'wordlogic',
    label: 'Word Logic',
    emoji: '📚',
    summary: 'Anagrams, analogies, odd one out, opposites and spelling: the sharpest word brain wins.',
    mode: 'simultaneous',
    maxSeats: 6,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 10, max: 60, fallback: 20 },
    revealMs: 5000,
    pick: (count, rng, level) => shuffle([...sample(WORD, Math.ceil(count / 2), rng), ...make(WORDS_GAME, Math.floor(count / 2), rng, level)], rng)
});
