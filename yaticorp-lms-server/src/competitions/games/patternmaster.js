/**
 * Pattern Master, a Group Brain game: shape cycles, turning arrows, growing groups and number and letter series, made fresh every game.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine } = require('./quizCore');
const { PATTERNS, PATTERNS_YOUNG, PATTERNS_MASTER } = require('./banks/iq');
const { make } = require('./banks/generate');

module.exports = makeEngine({
    id: 'patternmaster',
    label: 'Pattern Master',
    emoji: '🔷',
    summary: 'Find the missing shape, arrow or number: spot the rule in each sequence.',
    mode: 'simultaneous',
    maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 10, max: 60, fallback: 25 },
    revealMs: 5000,
    quickReveal: true, // group play: the options coloured for a moment, no answer box, then on (2026-11-17)
    // By the room's age zone (./zones.js): Young Thinkers shapes, colours and counting; Master Minds the harder series.
    pick: (count, rng, level, met, zone) => (zone === 'young' ? make(PATTERNS_YOUNG, count, rng, 'easy')
        : zone === 'master' ? make(PATTERNS_MASTER, count, rng, 'hard')
            : make(PATTERNS, count, rng, zone === 'smart' ? 'medium' : level))
});
