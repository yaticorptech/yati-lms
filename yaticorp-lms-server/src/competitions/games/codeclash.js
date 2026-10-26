/**
 * Code Clash, for Games & Competitions: a hackathon-style coding round.
 * Predict the output of real JavaScript and Python, spot the bug, and the
 * complexity and concepts an interview asks about. Everyone answers the same
 * challenge at once; right answers score 100 plus up to 50 for speed.
 * The rules are quizCore.js's; the challenges are banks/code.js.
 */
const { makeEngine, sample } = require('./quizCore');
const BANK = require('./banks/code');

module.exports = makeEngine({
    id: 'codeclash',
    label: 'Code Clash',
    emoji: '💻',
    summary: 'Hackathon-style coding round: predict the output, spot the bug, beat the clock.',
    mode: 'simultaneous',
    questions: { min: 5, max: 15, fallback: 8 },
    seconds: { min: 20, max: 120, fallback: 45 },
    revealMs: 5000,
    pick: (count, rng) => sample(BANK, count, rng)
});
