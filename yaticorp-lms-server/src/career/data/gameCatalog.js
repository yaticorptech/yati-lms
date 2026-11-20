/**
 * The brain games on the server (2026-11-14; trimmed since by the user): each game's id, title, age section and category — a CommonJS copy of
 * the student app's catalogue (yaticorp-lms-student/src/career/components/games/catalog.js), so the server can decide
 * who may play what without trusting the browser. tests/career/gameCatalog.test.js imports the student file and fails
 * when the two drift apart: a game added or moved there must be changed here too.
 *
 *   section  young (Classes 1–5) · smart (6–10) · master (11–12)
 *   category memory · logic · vocab · math
 *
 * EXTRA: the classic games outside the 84 (kept playable, records untouched). They belong to no age section, so they
 * are not age-restricted. Any other accepted game id (data/gameIds.js: an engine a split/extended game was built
 * from) is treated the same way.
 */
const SECTIONS = Object.freeze(['young', 'smart', 'master']);
const CATEGORIES = Object.freeze(['memory', 'logic', 'vocab', 'math']);

const RAW = {
    young: {
        memory: [
            ['memory-match', 'Memory Match'],
            ['colour-match', 'Colour Match'],
            ['animal-pair-safari', 'Animal Pair Safari'],
            ['whats-missing', "What's Missing?"],
            ['light-up-garden', 'Light-Up Garden'],
            ['shadow-detective', 'Shadow Match'],
            ['flash-sequence', 'Flash Sequence']
        ],
        logic: [
            ['tic-tac-toe', 'Tic-Tac-Toe'],
            ['picture-logic', 'Colouring Book'],
            ['treasure-path', 'Treasure Path'],
            ['odd-one-out', 'Odd One Out'],
            ['shape-builder', 'Shape Builder'],
            ['pattern-path', 'Pattern Path'],
            ['mini-maze-mission', 'Mini Maze Mission']
        ],
        vocab: [
            ['spelling-fix', 'Spelling Fix'],
            ['sound-alike', 'Sound Alike'],
            ['typing-sprint', 'Typing Sprint'],
            ['picture-word-hunt', 'Picture Word Hunt'],
            ['rhyme-detective', 'Rhyme Detective'],
            ['letter-builder', 'Letter Builder'],
            ['word-balloon-pop', 'Word Balloon Pop']
        ],
        math: [
            ['math-sprint', 'Math Sprint'],
            ['speed-sort', 'Speed Sort'],
            ['number-hop', 'Number Hop'],
            ['fruit-shop', 'Fruit Shop Challenge'],
            ['count-and-catch', 'Count & Catch'],
            ['missing-number-race', 'Missing Number Race'],
            ['shape-count-dash', 'Train Builder']
        ]
    },
    smart: {
        memory: [
            ['sequence-recall', 'Sequence Recall'],
            ['number-recall', 'Number Recall'],
            ['sequence-vault', 'Sequence Vault'],
            ['grid-navigator', 'Audio Echo'],
            ['focus-filter', 'Focus Filter'],
            ['dual-image-recall', 'Dual-Image Recall']
        ],
        logic: [
            ['next-in-sequence', 'Next in Sequence'],
            ['sudoku-challenge', 'Sudoku Challenge'],
            ['tower-strategy', 'Tower Strategy'],
            ['constraint-grid', 'Pipe Flow'],
            ['clue-chain', 'Crown Garden'],
            ['chess-challenge', 'Chess']
        ],
        vocab: [
            ['sentence-gap', 'Sentence Gap'],
            ['tense-pick', 'Tense Pick'],
            ['analogy-master', 'Analogy Master'],
            ['context-detective', 'Context Detective'],
            ['word-association-grid', 'Word Association Grid'],
            ['word-ladder', 'Word Ladder']
        ],
        math: [
            ['running-total', 'Running Total'],
            ['equation-rush', 'Equation Rush'],
            ['number-pattern-lab', 'Number Maze'],
            ['ratio-relay', 'Ratio Relay'],
            ['data-dash', 'Data Dash'],
            ['mental-math-circuit', 'Mental Math Circuit']
        ]
    },
    master: {
        memory: [
            ['grid-recall', 'Grid Recall'],
            ['reverse-recall', 'Reverse Recall'],
            ['departure-board', 'Departure Board'],
            ['rule-switch', 'Rule Switch'],
            ['interference-recall', 'Interference Recall']
        ],
        logic: [
            ['chess-master', 'Chess Master'],
            ['network-logic', 'Network Logic'],
            ['final-vault', 'The Final Vault'],
            ['jigsaw', 'Jigsaw'],
            ['arrow-escape', 'Arrow Escape']
        ],
        vocab: [
            ['synonym-match', 'Synonyms & Antonyms'],
            ['idiom-sense', 'Idiom Sense'],
            ['word-search', 'Word Search'],
            ['word-relation-matrix', 'Word Relation Matrix'],
            ['speak-up', 'Speak Up'],
            ['wordcraft', 'WORDCRAFT']
        ],
        math: [
            ['percent-snap', 'Percent Snap'],
            ['running-total-pro', 'Running Total Pro'],
            ['data-chart-quiz', 'Data Chart Quiz'],
            ['speed-distance', 'Speed, Time & Distance']
        ]
    }
};

/** Every slot: { id, title, section, category }. */
const CATALOG = Object.freeze(Object.entries(RAW).flatMap(([section, cats]) =>
    Object.entries(cats).flatMap(([category, games]) => games.map(([id, title]) => Object.freeze({ id, title, section, category })))));

const EXTRA = Object.freeze(['code-breaker', 'lights-out', 'shape-matrix', 'word-roots', 'antonym-match', 'number-bonds', 'clock-read']);

/**
 * The category of every accepted game outside the 84 (server only, for the performance page): the EXTRA classics and
 * the engines split/extended games were built from (data/gameIds.js). They have no age section.
 */
const CLASSIC_CATEGORY = Object.freeze({
  'code-breaker': 'logic', 'lights-out': 'logic', 'shape-matrix': 'logic', 'scale-balance': 'logic', 'spin-match': 'logic',
  'last-stone': 'logic', 'word-roots': 'vocab', 'antonym-match': 'vocab', 'binary-blitz': 'math', 'number-bonds': 'math',
  'rounding-rush': 'math', 'clock-read': 'math', 'quick-compare': 'math', 'missing-operator': 'math', 'fraction-match': 'math',
  'spot-the-change': 'memory', 'dot-count': 'memory', 'match-back': 'memory', 'seen-before': 'memory',
  // Left Rising Brains · Logic on 2026-11-16; still Sudoku Challenge's engine, and its records stay on the performance page.
  'mini-sudoku': 'logic',
  // Removed from Rising Brains on 2026-11-16 (the user); their records stay on the performance page.
  'logic-detective': 'logic', 'cipher-challenge': 'vocab',
  // Removed from Master Minds on 2026-11-16 (the user); its records stay on the performance page.
  'dual-stream-memory': 'memory',
  // Removed from Master Minds on 2026-11-17 (the user: too hard, replaced by easier, relaxing games); records stay.
  'spatial-rotation-vault': 'memory', 'cipher-lab': 'logic', 'algorithm-builder': 'logic', 'deduction': 'logic',
  'boolean-breaker': 'logic', 'strategic-constraint-lab': 'logic', 'argument-analyzer': 'vocab', 'verbal-architect': 'vocab',
  'nuance-navigator': 'vocab', 'probability-lab': 'math', 'quantitative-arena': 'math', 'numerical-optimization': 'math',
  'statistical-inference': 'math', 'decision-theory-arena': 'math',
  // Removed from Master Minds · Logic on 2026-11-17 (the user), for Chess Master; records stay.
  'colour-flood': 'logic',
  // Removed by the user on 2026-11-18/19 (Rising Brains and Master Minds trimmed); records stay.
  'tower-shift': 'logic', 'word-scramble': 'vocab', 'number-forge': 'math', 'pattern-recall': 'memory', 'emoji-equations': 'logic',
  'fraction-battle': 'math', 'matrix-recall': 'memory', 'star-trail': 'memory', 'tile-slide': 'logic', 'light-beam': 'logic',
  'path-painter': 'logic', 'ice-glide': 'logic', 'word-lock': 'vocab', 'emoji-phrase': 'vocab', 'sum-pop': 'math',
  'change-maker': 'math', 'best-buy': 'math', 'number-trail': 'math', 'quick-estimate': 'math', 'semantic-precision': 'vocab', 'brain-heist': 'logic', 'pixel-logic': 'logic', 'water-sort': 'logic'
});

const BY_ID = new Map(CATALOG.map((g) => [g.id, g]));

/** A game's category (catalogue or classic), or null. */
const categoryOf = (id) => BY_ID.get(id)?.category || CLASSIC_CATEGORY[id] || null;

/** The catalogue entry of a game, or null (a classic/EXTRA game, or not a game). */
const catalogGame = (id) => BY_ID.get(id) || null;

/** A game's display title: the catalogue's, else its id in words. */
const gameTitle = (id) => BY_ID.get(id)?.title || String(id || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

module.exports = { SECTIONS, CATEGORIES, CATALOG, EXTRA, CLASSIC_CATEGORY, catalogGame, categoryOf, gameTitle };
