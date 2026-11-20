/**
 * Group games for the 84-game catalogue (2026-11-14): games of the student app's catalogue
 * (career/components/games/catalog.js) that had no room game, played as Group Brain quizzes on quizCore — two to
 * twenty players, the same question at once, right +100, wrong −20. Every question is made on the server from the
 * room's rng (./banks/catalogMakers.js) and every answer checked there; nothing a player sends is trusted but the
 * option picked. Each is played in its catalogue section only (./zones.js GROUP_ZONES); ./multiplayer.js maps the
 * catalogue games to these ids. Loaded through ./index.js like any other game.
 */
const { makeEngine } = require('./quizCore');
const { MAKERS } = require('./banks/catalogMakers');

const ZONE_LEVEL = { young: 1, smart: 2, master: 3 };
const LEVEL = { easy: 1, medium: 2, hard: 3 };

/** `count` made questions, none twice (by prompt, picture, table and options). */
const made = (maker) => (count, rng, level, met, zone) => {
    const out = []; const seen = new Set();
    const d = ZONE_LEVEL[zone] || LEVEL[level] || 2;
    for (let n = 0; out.length < count && n < count * 40; n += 1) {
        const q = maker(rng, d, zone || null);
        const key = `${q.prompt}|${q.code || ''}|${JSON.stringify(q.visual || '')}|${[...q.options].sort().join('|')}`;
        if (seen.has(key)) continue;
        seen.add(key); out.push(q);
    }
    return out;
};

const quiz = (id, label, emoji, summary, pick, seconds) => makeEngine({
    id, label, emoji, summary, mode: 'simultaneous', maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 8, max: 90, fallback: seconds },
    revealMs: 4000,
    quickReveal: true, // group play: the options coloured for a moment, no answer box, then on (2026-11-17)
    pick
});

// id: [label, emoji, summary, maker, seconds a question]
const GAMES = {
    // Young Thinkers
    animalpairs: ['Animal Pair Safari', '🦁', 'Which sound, home or baby goes with this animal?', MAKERS.animalPairs, 15],
    rhymes: ['Rhyme Detective', '🎩', 'Find the word that rhymes — or the one that does not.', MAKERS.rhymes, 15],
    numberhop: ['Number Hop', '🐸', 'Where does the frog land? Hop, add and count on.', MAKERS.numberHop, 15],
    missingnumber: ['Missing Number Race', '🚂', 'Find the missing car of the number train.', MAKERS.missingNumber, 15],
    // Rising Brains
    analogies: ['Analogy Master', '🔗', 'A is to B as C is to …? Spot the link.', MAKERS.analogies, 20],
    equationrush: ['Equation Rush', '🟰', 'Solve for x before the others do.', MAKERS.equationRush, 30],
    ratiorelay: ['Ratio Relay', '⚖️', 'Mixes, shares, maps and rates — scale the ratio.', MAKERS.ratioRelay, 35],
    // Master Minds
    cipherlab: ['Cipher Lab', '🔏', 'Caesar, Atbash and substitution: decode the word with the key.', MAKERS.cipherLab, 35],
    probability: ['Probability Lab', '🎲', 'Dice, coins, bags and teams: find the exact chance.', MAKERS.probability, 40],
    quantarena: ['Quantitative Arena', '📐', 'Quantity A or B — or equal, or cannot tell?', MAKERS.quantArena, 40],
    decisions: ['Decision Theory Arena', '📈', 'Weigh the odds: pick the plan with the best expected return.', MAKERS.decisions, 45]
};

const IDS = Object.keys(GAMES);
const engines = {};
/** The engine for one of these games, made once. */
const catalogEngine = (id) => {
    if (!GAMES[id]) return null;
    if (!engines[id]) { const [label, emoji, summary, maker, seconds] = GAMES[id]; engines[id] = quiz(id, label, emoji, summary, made(maker), seconds); }
    return engines[id];
};

module.exports = { CATALOG_QUIZ: IDS, catalogEngine };
