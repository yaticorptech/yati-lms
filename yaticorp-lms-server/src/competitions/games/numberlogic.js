/**
 * Number Logic, a Group Brain game: number series, missing numbers, missing signs and numerical reasoning, made fresh every game.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { NUMBERS, NUMBERS_MASTER, twoOperators } = require('./banks/iq');
const { shuffle } = require('./quizCore');
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
    quickReveal: true, // group play: the options coloured for a moment, no answer box, then on (2026-11-17)
    // Master Minds (./zones.js): two missing signs with the order of operations, and no simple series.
    pick: (count, rng, level, met, zone) => {
        if (zone !== 'master') return make(NUMBERS, count, rng, zone === 'smart' ? 'medium' : level);
        const signs = Math.ceil(count / 4);
        return shuffle([...make([twoOperators], signs, rng, 'hard'), ...make(NUMBERS_MASTER, count - signs, rng, 'hard')], rng);
    }
});
