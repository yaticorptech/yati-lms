/**
 * Deduction Detective, a Group Brain game: logic grids, orderings, calendars, directions and letter codes, made fresh every game. Every logic grid is checked to have exactly one answer.
 * Two to six players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { DEDUCTION } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'deduction',
    label: 'Deduction Detective',
    emoji: '🕵️',
    summary: 'Read the clues, rule things out, and name the answer: logic grids, orderings and codes.',
    mode: 'simultaneous',
    maxSeats: 6,
    questions: { min: 5, max: 15, fallback: 8 },
    seconds: { min: 20, max: 120, fallback: 60 },
    revealMs: 5000,
    pick: (count, rng, level) => make(DEDUCTION, count, rng, level)
});
