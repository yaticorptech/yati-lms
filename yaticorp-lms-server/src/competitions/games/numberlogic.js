/**
 * Number Logic, a Group Brain game: number series, missing numbers, missing signs and numerical reasoning, made fresh every game.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { NUMBERS } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'numberlogic',
    label: 'Number Logic',
    emoji: '🔣',
    summary: 'Number series, missing numbers and signs, and number puzzles made fresh every game.',
    mode: 'simultaneous',
    maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 10, max: 90, fallback: 35 },
    revealMs: 5000,
    pick: (count, rng, level) => make(NUMBERS, count, rng, level)
});
