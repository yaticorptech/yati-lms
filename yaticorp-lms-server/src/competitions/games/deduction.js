/**
 * Deduction Detective, a Group Brain game: logic grids, orderings, calendars, directions and letter codes, made fresh every game. Every logic grid is checked to have exactly one answer.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { DEDUCTION, DEDUCTION_SMART, DEDUCTION_MASTER } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'deduction',
    label: 'Deduction Detective',
    emoji: '🕵️',
    summary: 'Read the clues, rule things out, and name the answer: logic grids, orderings and codes.',
    mode: 'simultaneous',
    maxSeats: 20,
    questions: { min: 5, max: 15, fallback: 8 },
    seconds: { min: 20, max: 120, fallback: 60 },
    revealMs: 5000,
    // By the room's age zone (./zones.js): Rising Brains grids of three or four; Master Minds two-condition clues.
    pick: (count, rng, level, met, zone) => (zone === 'smart' ? make(DEDUCTION_SMART, count, rng, 'medium')
        : zone === 'master' ? make(DEDUCTION_MASTER, count, rng, 'hard')
            : make(DEDUCTION, count, rng, zone === 'young' ? 'easy' : level))
});
