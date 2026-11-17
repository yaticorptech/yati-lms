/**
 * Which games of the 84-game catalogue (student app career/components/games/catalog.js, 2026-11-14) have a real
 * multiplayer room game: catalogue game id → room game id (./index.js ROOM_GAMES). Each room game is played in its
 * catalogue game's section only (./zones.js GROUP_ZONES). The student app keeps an identical copy
 * (career/components/games/multiplayer.js); tests/competitions/multiplayer.test.js checks the two agree.
 */
const MULTIPLAYER = {
    // Young Thinkers
    'memory-match': 'memorymatch',
    'colour-match': 'colourmatch',
    'animal-pair-safari': 'animalpairs',
    'tic-tac-toe': 'tictactoe',
    'odd-one-out': 'oddoneout',
    'spelling-fix': 'spellingfix',
    'sound-alike': 'soundalike',
    'typing-sprint': 'typingsprint',
    'rhyme-detective': 'rhymes',
    'math-sprint': 'mathsprint',
    'speed-sort': 'speedsort',
    'number-hop': 'numberhop',
    'missing-number-race': 'missingnumber',
    // Rising Brains
    'sequence-recall': 'sequence',
    'number-recall': 'numberrecall',
    'next-in-sequence': 'patternmaster',
    'mini-sudoku': 'sudoku',
    'sudoku-challenge': 'sudoku',
    'logic-detective': 'deduction',
    'word-scramble': 'wordlogic',
    'sentence-gap': 'sentencegap',
    'tense-pick': 'tensepick',
    'analogy-master': 'analogies',
    'running-total': 'runningtotal',
    'equation-rush': 'equationrush',
    'ratio-relay': 'ratiorelay',
    // Master Minds
    'grid-recall': 'memorymatrix',
    'reverse-recall': 'reverserecall',
    'cipher-lab': 'cipherlab',
    'deduction': 'deduction',
    'synonym-match': 'synonymmatch',
    'idiom-sense': 'idiomsense',
    'percent-snap': 'percentsnap',
    'number-forge': 'numberlogic',
    'probability-lab': 'probability',
    'quantitative-arena': 'quantarena',
    'decision-theory-arena': 'decisions'
};

module.exports = { MULTIPLAYER };
