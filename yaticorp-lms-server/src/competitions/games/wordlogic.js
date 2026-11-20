/**
 * Word Logic, a Group Brain game: anagrams and odd-one-out sets made fresh, with analogies, synonyms, opposites and spelling written by hand.
 * Two to twenty players answer the same question at once; a right answer
 * scores 100 plus up to 50 for speed, and after each question everyone sees
 * the answer and why. The rules are quizCore.js's.
 */
const { makeEngine, sample, shuffle } = require('./quizCore');
const { WORDS_GAME, WORD } = require('./banks/iq');
const { make } = require('./banks/generate');
const { fromBank } = require('./banks/solo');

module.exports = makeEngine({
    id: 'wordlogic',
    label: 'Word Logic',
    emoji: '📚',
    summary: 'Anagrams, analogies, odd one out, opposites and spelling: the sharpest word brain wins.',
    mode: 'simultaneous',
    maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 10, max: 60, fallback: 20 },
    revealMs: 5000,
    quickReveal: true, // group play: the options coloured for a moment, no answer box, then on (2026-11-17)
    // Rising Brains (and rooms made before zones): the school-level set written here. Master Minds (./zones.js,
    // 2026-11-13): the harder synonyms, opposites and word roots of the word games' banks instead.
    pick: (count, rng, level, met, zone) => {
        const words = Math.ceil(count / 2);
        const hand = zone === 'master'
            ? ['synonym', 'antonym', 'wordroots'].flatMap((bank, i) => fromBank(bank)(Math.ceil(words / 3) + (i === 0 ? 1 : 0), rng, 'hard', met)).slice(0, words)
            : sample(WORD, words, rng);
        return shuffle([...hand, ...make(WORDS_GAME, Math.floor(count / 2), rng, zone === 'master' ? 'hard' : level)], rng);
    }
});
