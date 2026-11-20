/**
 * Which games of the 84-game catalogue (./catalog.js, 2026-11-14) have a real
 * multiplayer room game: catalogue game id → room game id (server competitions/games/index.js ROOM_GAMES). Each room
 * game is played in its catalogue game's section only (./zones.js GROUP_ZONES). A copy of the server's
 * (yaticorp-lms-server src/competitions/games/multiplayer.js); the server's tests/competitions/multiplayer.test.js
 * checks the two agree.
 */
export const MULTIPLAYER = {
    // Young Thinkers
    'memory-match': 'memorymatch',
    'tic-tac-toe': 'tictactoe',
    'typing-sprint': 'typingsprint',
    'math-sprint': 'mathsprint',
    // Rising Brains
    'sequence-recall': 'sequence',
    'number-recall': 'numberrecall',
    'next-in-sequence': 'patternmaster',
    'word-scramble': 'wordlogic',
    'running-total': 'runningtotal',
    // Master Minds
    'grid-recall': 'memorymatrix',
    'number-forge': 'numberlogic'
};
