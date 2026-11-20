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
  'picture-logic', 'tower-shift',
  // Vocabulary & Linguistics
  'word-scramble', 'synonym-match', 'sentence-gap', 'spelling-fix', 'word-roots',
  'typing-sprint', 'antonym-match', 'idiom-sense', 'tense-pick', 'sound-alike',
  // Math & Speed Processing
  'math-sprint', 'quick-compare', 'missing-operator', 'percent-snap', 'running-total',
  'binary-blitz', 'speed-sort', 'number-bonds', 'rounding-rush', 'fraction-match', 'clock-read',
  'number-forge',
  // New for the age zones (2026-11-13): visual perception, routes, deduction, codes, probability, algorithms.
  'shadow-detective', 'treasure-path', 'logic-detective', 'cipher-challenge', 'probability-lab', 'algorithm-builder',
  // The 84 games (2026-11-14, student catalog.js): each section's own new, split and extended games.
  'animal-pair-safari', 'whats-missing', 'light-up-garden', 'flash-sequence', 'shape-builder', 'pattern-path',
  'mini-maze-mission', 'picture-word-hunt', 'rhyme-detective', 'letter-builder', 'word-balloon-pop', 'number-hop',
  'fruit-shop', 'count-and-catch', 'missing-number-race', 'shape-count-dash', 'sequence-vault', 'grid-navigator',
  'pattern-recall', 'focus-filter', 'dual-image-recall', 'sudoku-challenge', 'tower-strategy', 'clue-chain',
  'constraint-grid', 'emoji-equations', 'chess-challenge', 'word-ladder', 'analogy-master', 'context-detective', 'word-association-grid', 'equation-rush',
  'final-vault', 'brain-heist', 'pixel-logic', 'water-sort', 'jigsaw', 'speak-up', 'wordcraft', 'arrow-escape', 'running-total-pro', 'data-chart-quiz', 'speed-distance', 'fraction-battle', 'number-pattern-lab', 'ratio-relay', 'data-dash', 'mental-math-circuit', 'matrix-recall',
  'dual-stream-memory', 'rule-switch', 'spatial-rotation-vault', 'interference-recall', 'cipher-lab',
  'boolean-breaker', 'network-logic', 'strategic-constraint-lab', 'semantic-precision', 'argument-analyzer',
  'verbal-architect', 'nuance-navigator', 'word-relation-matrix', 'quantitative-arena', 'numerical-optimization',
  'statistical-inference', 'decision-theory-arena', 'departure-board',
  // Master Minds' relaxed set (2026-11-17): replace the games above that were removed from it.
  'star-trail', 'tile-slide', 'colour-flood', 'light-beam', 'path-painter', 'ice-glide', 'word-search', 'word-lock',
  'emoji-phrase', 'sum-pop', 'change-maker', 'best-buy', 'number-trail', 'quick-estimate',
  // Master Minds · Logic's own Chess (2026-11-17), in place of Colour Flood.
  'chess-master'
]);

const GAME_ID_SET = new Set(GAME_IDS);

/** True for an id the student app really has a game for. */
const isGameId = (id) => typeof id === 'string' && GAME_ID_SET.has(id);

module.exports = { GAME_IDS, isGameId };
