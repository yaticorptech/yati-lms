/**
 * The 84-game structure (2026-11-14, "84 games" part 1 of 3): three age sections × four categories × seven games.
 * Data only. Nothing renders from it yet, so no card shows a game that cannot be played.
 *
 * Each entry: [id, title, how it is made]
 *   'ready'           — an existing game, as it is (its own id, its saved progress kept)
 *   'split:<from>'    — one age mode of an existing multi-age game, given its own id and card so it belongs to one
 *                       section only; built from <from>'s engine (part 2)
 *   'extend:<from>'   — an existing game's engine, with a genuinely new mechanic added (part 2)
 *   'new'             — a game still to build (part 2)
 *
 * Existing games not placed below (code-breaker, lights-out, shape-matrix, word-roots, antonym-match, binary-blitz,
 * number-bonds, rounding-rush, clock-read) are kept, with their records: see EXTRA.
 */
export const SECTIONS = [
    { key: 'young', name: 'Young Thinkers', classes: [1, 5] },
    { key: 'smart', name: 'Rising Brains', classes: [6, 10] },
    { key: 'master', name: 'Master Minds', classes: [11, 12] }
];

/** The age bands (zones.js BANDS) inside each section: Classes 1–2 / 3–5, 6–8 / 9–10, 11–12. */
export const SECTION_BANDS = { young: ['foundation', 'developing'], smart: ['intermediate', 'analytical'], master: ['advanced'] };

export const CATEGORIES = [
    { key: 'memory', name: 'Memory & Focus' },
    { key: 'logic', name: 'Logic & Deduction' },
    { key: 'vocab', name: 'Vocabulary & Linguistics' },
    { key: 'math', name: 'Math & Speed Processing' }
];

const RAW = {
    young: {
        memory: [
            ['memory-match', 'Memory Match', 'ready'],
            ['colour-match', 'Colour Match', 'ready'],
            ['animal-pair-safari', 'Animal Pair Safari', 'new'],
            ['whats-missing', "What's Missing?", 'new'],
            ['light-up-garden', 'Light-Up Garden', 'split:grid-recall'],
            ['shadow-detective', 'Shadow Match', 'ready'],
            ['flash-sequence', 'Flash Sequence', 'split:sequence-recall']
        ],
        logic: [
            ['tic-tac-toe', 'Tic-Tac-Toe', 'ready'],
            ['picture-logic', 'Colouring Book', 'ready'],
            ['treasure-path', 'Treasure Path', 'ready'],
            ['odd-one-out', 'Odd One Out', 'ready'],
            ['shape-builder', 'Shape Builder', 'new'],
            ['pattern-path', 'Pattern Path', 'split:next-in-sequence'],
            ['mini-maze-mission', 'Mini Maze Mission', 'new']
        ],
        vocab: [
            ['spelling-fix', 'Spelling Fix', 'ready'],
            ['sound-alike', 'Sound Alike', 'ready'],
            ['typing-sprint', 'Typing Sprint', 'ready'],
            ['picture-word-hunt', 'Picture Word Hunt', 'new'],
            ['rhyme-detective', 'Rhyme Detective', 'new'],
            ['letter-builder', 'Letter Builder', 'split:word-scramble'],
            ['word-balloon-pop', 'Word Balloon Pop', 'new']
        ],
        math: [
            ['math-sprint', 'Math Sprint', 'ready'],
            ['speed-sort', 'Speed Sort', 'ready'],
            ['number-hop', 'Number Hop', 'new'],
            ['fruit-shop', 'Fruit Shop Challenge', 'new'],
            ['count-and-catch', 'Count & Catch', 'extend:dot-count'],
            ['missing-number-race', 'Missing Number Race', 'new'],
            ['shape-count-dash', 'Train Builder', 'new']
        ]
    },
    smart: {
        memory: [
            ['sequence-recall', 'Sequence Recall', 'ready'],
            ['number-recall', 'Number Recall', 'ready'],
            ['sequence-vault', 'Sequence Vault', 'new'],
            ['grid-navigator', 'Audio Echo', 'new'],
            ['pattern-recall', "Chef's Memory", 'new'],
            ['focus-filter', 'Focus Filter', 'new'],
            ['dual-image-recall', 'Dual-Image Recall', 'extend:spot-the-change']
        ],
        logic: [
            ['next-in-sequence', 'Next in Sequence', 'ready'],
            ['sudoku-challenge', 'Sudoku Challenge', 'split:mini-sudoku'],
            ['tower-strategy', 'Tower Strategy', 'extend:last-stone'],
            ['constraint-grid', 'Pipe Flow', 'new'],
            ['emoji-equations', 'Emoji Equations', 'new'],
            ['clue-chain', 'Crown Garden', 'new'],
            ['chess-challenge', 'Chess', 'new']
        ],
        vocab: [
            ['word-scramble', 'Word Scramble', 'ready'],
            ['sentence-gap', 'Sentence Gap', 'ready'],
            ['tense-pick', 'Tense Pick', 'ready'],
            ['analogy-master', 'Analogy Master', 'new'],
            ['context-detective', 'Context Detective', 'new'],
            ['word-association-grid', 'Word Association Grid', 'new'],
            ['word-ladder', 'Word Ladder', 'new']
        ],
        math: [
            ['running-total', 'Running Total', 'ready'],
            ['equation-rush', 'Equation Rush', 'extend:missing-operator'],
            ['fraction-battle', 'Fraction Battle', 'extend:fraction-match'],
            ['number-pattern-lab', 'Number Pattern Lab', 'new'],
            ['ratio-relay', 'Ratio Relay', 'new'],
            ['data-dash', 'Data Dash', 'new'],
            ['mental-math-circuit', 'Mental Math Circuit', 'new']
        ]
    },
    master: {
        memory: [
            ['grid-recall', 'Grid Recall', 'ready'],
            ['reverse-recall', 'Reverse Recall', 'ready'],
            ['matrix-recall', 'Matrix Recall', 'new'],
            ['departure-board', 'Departure Board', 'new'],
            ['rule-switch', 'Rule Switch', 'split:colour-match'],
            ['spatial-rotation-vault', 'Spatial Rotation Vault', 'extend:spin-match'],
            ['interference-recall', 'Interference Recall', 'extend:seen-before']
        ],
        logic: [
            ['tower-shift', 'Tower Shift', 'ready'],
            ['cipher-lab', 'Cipher Lab', 'extend:cipher-challenge'],
            ['algorithm-builder', 'Algorithm Architect', 'ready'],
            ['deduction', 'Deduction Chamber', 'ready'],
            ['boolean-breaker', 'Boolean Breaker', 'new'],
            ['network-logic', 'Network Logic', 'new'],
            ['strategic-constraint-lab', 'Strategic Constraint Lab', 'new']
        ],
        vocab: [
            ['synonym-match', 'Synonyms & Antonyms', 'ready'],
            ['idiom-sense', 'Idiom Sense', 'ready'],
            ['semantic-precision', 'Semantic Precision', 'new'],
            ['argument-analyzer', 'Argument Analyzer', 'new'],
            ['verbal-architect', 'Verbal Architect', 'new'],
            ['nuance-navigator', 'Nuance Navigator', 'new'],
            ['word-relation-matrix', 'Word Relation Matrix', 'new']
        ],
        math: [
            ['percent-snap', 'Percent Snap', 'ready'],
            ['number-forge', 'Number Forge', 'ready'],
            ['probability-lab', 'Probability Lab', 'ready'],
            ['quantitative-arena', 'Quantitative Arena', 'extend:quick-compare'],
            ['numerical-optimization', 'Numerical Optimization', 'new'],
            ['statistical-inference', 'Statistical Inference', 'new'],
            ['decision-theory-arena', 'Decision Theory Arena', 'new']
        ]
    }
};

/** Every slot: { id, title, section, category, status: 'ready'|'split'|'extend'|'new', from }. */
export const CATALOG = Object.freeze(Object.entries(RAW).flatMap(([section, cats]) =>
    Object.entries(cats).flatMap(([category, games]) => games.map(([id, title, how]) => {
        const [status, from = null] = how.split(':');
        return Object.freeze({ id, title, section, category, status, from });
    }))));

/** Existing games with no slot in the 84: kept playable, records untouched, until it is decided where they go. */
export const EXTRA = Object.freeze(['code-breaker', 'lights-out', 'shape-matrix', 'word-roots', 'antonym-match', 'binary-blitz', 'number-bonds', 'rounding-rush', 'clock-read']);

/** The section a class belongs to: 1–5 young, 6–10 smart, 11–12 master; null when unknown. */
export const sectionForClass = (n) => (!Number.isInteger(n) || n < 1 ? null : n <= 5 ? 'young' : n <= 10 ? 'smart' : 'master');

export const gamesIn = (section, category) => CATALOG.filter((g) => g.section === section && (!category || g.category === category));
export const playable = (g) => g.status === 'ready';
