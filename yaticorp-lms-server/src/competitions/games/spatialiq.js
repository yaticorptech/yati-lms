/**
 * Spatial IQ, a Group Brain game: rotations, mirror images, paper folding and cube nets, drawn and worked out fresh every game.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { SPATIAL } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'spatialiq',
    label: 'Spatial IQ',
    emoji: '🧊',
    summary: 'Turn it, mirror it, fold it, build the cube: picture puzzles for the mind’s eye.',
    mode: 'simultaneous',
    maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 10, max: 60, fallback: 30 },
    revealMs: 5000,
    pick: (count, rng, level) => make(SPATIAL, count, rng, level)
});
