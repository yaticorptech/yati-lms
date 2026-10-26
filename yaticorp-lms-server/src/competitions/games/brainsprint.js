/**
 * Brain Sprint, for Games & Competitions: IQ puzzles made fresh for every
 * game — number and letter series, equations, clock angles, primes and word
 * problems — so no two matches share a question and none can be looked up.
 * Right answers score 100 plus up to 50 for speed.
 * The rules are quizCore.js's; the puzzles are banks/generate.js.
 */
const { makeEngine } = require('./quizCore');
const { PUZZLES, make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'brainsprint',
    label: 'Brain Sprint',
    emoji: '🧩',
    summary: 'IQ puzzles made fresh every match: series, logic, numbers. Fastest mind wins.',
    mode: 'simultaneous',
    questions: { min: 5, max: 20, fallback: 12 },
    seconds: { min: 10, max: 60, fallback: 25 },
    revealMs: 4000,
    pick: (count, rng) => make(PUZZLES, count, rng)
});
