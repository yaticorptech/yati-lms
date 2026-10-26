/**
 * Rapid Fire, for Games & Competitions: quick general-knowledge one-liners on
 * a short clock. Each player answers every question (right +10, wrong −5),
 * and nobody is told what was right until the game is over, when every
 * question is shown with its answer.
 * The rules are quizCore.js's; the questions are banks/rapidfire.js.
 */
const { makeEngine, sample } = require('./quizCore');
const BANK = require('./banks/rapidfire');

module.exports = makeEngine({
    id: 'rapidfire',
    label: 'Rapid Fire',
    emoji: '⚡',
    summary: 'Quick general-knowledge round: answer every question fast. Answers and scores are shown at the end.',
    mode: 'hidden',
    questions: { min: 10, max: 30, fallback: 15 },
    seconds: { min: 5, max: 20, fallback: 8 },
    revealMs: 2500,
    // General knowledge only, none twice.
    pick: (count, rng) => sample(BANK, count, rng)
});
