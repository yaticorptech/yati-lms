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
            ['focus-filter', 'Focus Filter', 'new'],
            ['dual-image-recall', 'Dual-Image Recall', 'extend:spot-the-change']
        ],
        logic: [
            ['next-in-sequence', 'Next in Sequence', 'ready'],
            ['sudoku-challenge', 'Sudoku Challenge', 'split:mini-sudoku'],
            ['tower-strategy', 'Tower Strategy', 'extend:last-stone'],
            ['constraint-grid', 'Pipe Flow', 'new'],
            ['clue-chain', 'Crown Garden', 'new'],
            ['chess-challenge', 'Chess', 'new']
        ],
        vocab: [
            // Word Scramble removed from Rising Brains (2026-11-19, the user); Letter Builder (Young Thinkers) is still built on it.
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
            ['number-pattern-lab', 'Number Maze', 'new'], // 2026-11-19: the user's pick (id kept from Number Pattern Lab)
            ['ratio-relay', 'Ratio Relay', 'new'],
            ['data-dash', 'Data Dash', 'new'],
            ['mental-math-circuit', 'Mental Math Circuit', 'new']
        ]
    },
    master: {
        memory: [
            ['grid-recall', 'Grid Recall', 'ready'],
            ['reverse-recall', 'Reverse Recall', 'ready'],
            ['departure-board', 'Departure Board', 'new'],
            ['rule-switch', 'Rule Switch', 'split:colour-match'],
            ['interference-recall', 'Interference Recall', 'extend:seen-before']
        ],
        logic: [ // 2026-11-19 (the user): only these two
            ['chess-master', 'Chess Master', 'new'],
            ['network-logic', 'Network Logic', 'new'],
            ['final-vault', 'The Final Vault', 'new'], // 2026-11-19: the group game, played solo
            ['jigsaw', 'Jigsaw', 'new'], // 2026-11-19: replaces Water Sort
            ['arrow-escape', 'Arrow Escape', 'new'] // 2026-11-19: clear the arrows in the right order
        ],
        vocab: [
            ['synonym-match', 'Synonyms & Antonyms', 'ready'],
            ['idiom-sense', 'Idiom Sense', 'ready'],
            ['word-search', 'Word Search', 'new'],
            ['word-relation-matrix', 'Word Relation Matrix', 'new'],
            ['speak-up', 'Speak Up', 'new'], // 2026-11-19: read aloud, tongue twister, interview, story retell
            ['wordcraft', 'WORDCRAFT', 'new'] // 2026-11-20: six speaking & vocabulary challenges, three a level
        ],
        math: [
            // 2026-11-18 (the user): Number Forge, Sum Pop, Change Maker, Best Buy, Number Trail and Estimate It
            // removed; Binary Blitz and Rounding Rush removed completely too.
            ['percent-snap', 'Percent Snap', 'ready'],
            // 2026-11-19, the user's picks: Rising Brains' Running Total and Data Dash for adults, and a new journey game
            ['running-total-pro', 'Running Total Pro', 'new'],
            ['data-chart-quiz', 'Data Chart Quiz', 'new'],
            ['speed-distance', 'Speed, Time & Distance', 'new']
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
export const EXTRA = Object.freeze(['code-breaker', 'lights-out', 'shape-matrix', 'word-roots', 'antonym-match', 'number-bonds', 'clock-read']);

/** The section a class belongs to: 1–5 young, 6–10 smart, 11–12 master; null when unknown. */
export const sectionForClass = (n) => (!Number.isInteger(n) || n < 1 ? null : n <= 5 ? 'young' : n <= 10 ? 'smart' : 'master');

export const gamesIn = (section, category) => CATALOG.filter((g) => g.section === section && (!category || g.category === category));
export const playable = (g) => g.status === 'ready';
