/**
 * Every brain game the student app actually ships, by id.
 *
 * The server used to accept any id that looked like one (a short lowercase
 * slug), so a script could invent "games" no page has ever rendered and bank
 * stars and XP on them. Only these are accepted now.
 *
 * Copied from the games hub's registry (yaticorp-lms-student/src/career/
 * pages/dashboard/Games.jsx, the `id` of every card in CATEGORIES). A game
 * added there must be added here too, or its progress is refused —
 * tests/career/gamesProgress.test.js reads the client file and fails when the
 * two lists drift apart.
 */
const GAME_IDS = Object.freeze([
  // Memory & Focus
  'memory-match', 'sequence-recall', 'number-recall', 'colour-match', 'spot-the-change',
  'grid-recall', 'reverse-recall', 'seen-before', 'dot-count', 'match-back',
  // Logic & Deduction
  'code-breaker', 'next-in-sequence', 'odd-one-out', 'deduction', 'lights-out',
  'tic-tac-toe', 'mini-sudoku', 'scale-balance', 'shape-matrix', 'spin-match', 'last-stone',
  // Vocabulary & Linguistics
  'word-scramble', 'synonym-match', 'sentence-gap', 'spelling-fix', 'word-roots',
  'typing-sprint', 'antonym-match', 'idiom-sense', 'tense-pick', 'sound-alike',
  // Math & Speed Processing
  'math-sprint', 'quick-compare', 'missing-operator', 'percent-snap', 'running-total',
  'binary-blitz', 'speed-sort', 'number-bonds', 'rounding-rush', 'fraction-match', 'clock-read'
]);

const GAME_ID_SET = new Set(GAME_IDS);

/** True for an id the student app really has a game for. */
const isGameId = (id) => typeof id === 'string' && GAME_ID_SET.has(id);

module.exports = { GAME_IDS, isGameId };
