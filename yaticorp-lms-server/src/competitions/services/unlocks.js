/**
 * Group games are earned in the solo games (asked 2026-10-31): to play a group game a student must first have
 * cleared enough levels of the same game played solo — and the bigger the room, the more levels. Memory Matrix
 * in a room of 2 needs 20 levels of Grid Recall cleared, a room of 4 needs 30, and so on up to 100 for 20 players.
 * Chess, The Lost Kingdom and The Final Vault have no solo twin: the student's best solo game counts for them.
 *
 * "Cleared" is the account's copy of the solo ladder (career/models/GameProgress: the level the student is on,
 * so cleared = level − 1). Checked when a room is made, joined, or a seat online is taken.
 */
const GameProgress = require('../../career/models/GameProgress');

// Levels to have cleared for a room of this many players.
const NEED = { 2: 20, 4: 30, 6: 40, 8: 50, 10: 60, 12: 70, 16: 85, 20: 100 };
const needFor = (players) => {
    const sizes = Object.keys(NEED).map(Number).sort((a, b) => a - b);
    const size = sizes.find((s) => s >= (Number(players) || 2)) || sizes[sizes.length - 1];
    return NEED[size];
};

// Each group game's solo twin (null: the best of all of them).
const SOLO = {
    chess: null, lostkingdom: null, finalvault: null,
    memorymatrix: 'grid-recall', sequence: 'sequence-recall', patternmaster: 'next-in-sequence', numberlogic: 'missing-operator',
    sudoku: 'mini-sudoku', deduction: 'deduction', wordlogic: 'word-scramble', spatialiq: 'spin-match',
    synonymmatch: 'synonym-match', antonymmatch: 'antonym-match', idiomsense: 'idiom-sense', sentencegap: 'sentence-gap',
    soundalike: 'sound-alike', wordroots: 'word-roots', spellingfix: 'spelling-fix', tensepick: 'tense-pick',
    oddoneout: 'odd-one-out', percentsnap: 'percent-snap', binaryblitz: 'binary-blitz', roundingrush: 'rounding-rush',
    fractionmatch: 'fraction-match', quickcompare: 'quick-compare', scalebalance: 'scale-balance', colourmatch: 'colour-match',
    dotcount: 'dot-count', clockread: 'clock-read', shapematrix: 'shape-matrix', numberrecall: 'number-recall',
    reverserecall: 'reverse-recall', seenbefore: 'seen-before', spotthechange: 'spot-the-change', matchback: 'match-back',
    runningtotal: 'running-total', memorymatch: 'memory-match', lightsout: 'lights-out', codebreaker: 'code-breaker',
    typingsprint: 'typing-sprint', speedsort: 'speed-sort', numberbonds: 'number-bonds', mathsprint: 'math-sprint',
    tictactoe: 'tic-tac-toe', laststone: 'last-stone'
};

/**
 * Accounts with every group game open at every size, whatever their solo levels (2026-10-31: Hari Kiran's card,
 * 240100018860). More can be added with GROUP_GAMES_UNLOCKED (card numbers, comma-separated).
 */
// Bhagyashree's card (240100045056) added 2026-11-07.
const ALWAYS_OPEN = new Set(['240100018860', '240100045056', ...String(process.env.GROUP_GAMES_UNLOCKED || '').split(',').map((x) => x.trim()).filter(Boolean)]);
const alwaysOpen = async (userId) => {
    const u = await require('../../models/User').findById(userId).select('cardNumber').lean();
    return Boolean(u?.cardNumber && ALWAYS_OPEN.has(String(u.cardNumber)));
};

/** Levels cleared in each solo game: { 'grid-recall': 24, … }. */
const clearedBy = async (userId) => {
    const docs = await GameProgress.find({ userId }).select('gameId level').lean();
    return Object.fromEntries(docs.map((d) => [d.gameId, Math.max(0, (d.level || 1) - 1)]));
};

const clearedFor = (cleared, groupGame) => {
    const solo = SOLO[groupGame];
    return solo ? cleared[solo] || 0 : Math.max(0, ...Object.values(cleared));
};

/** What a student has unlocked: each group game's solo twin, levels cleared, and the room sizes open to them. */
const summary = async (userId, groupGames) => {
    const cleared = await clearedBy(userId);
    if (await alwaysOpen(userId)) {
        return { need: NEED, games: Object.fromEntries(groupGames.map((g) => [g, { solo: SOLO[g] ?? null, cleared: clearedFor(cleared, g), sizes: Object.keys(NEED).map(Number) }])) };
    }
    const games = {};
    for (const g of groupGames) {
        const have = clearedFor(cleared, g);
        games[g] = { solo: SOLO[g] ?? null, cleared: have, sizes: Object.keys(NEED).map(Number).filter((n) => have >= NEED[n]) };
    }
    return { need: NEED, games };
};

/** Throws (403) unless the student has cleared enough solo levels for this game in a room of `players`. */
const check = async (userId, groupGame, players, PlayError) => {
    if (!(groupGame in SOLO)) return;
    if (await alwaysOpen(userId)) return;
    const need = needFor(players);
    const have = clearedFor(await clearedBy(userId), groupGame);
    if (have >= need) return;
    const what = SOLO[groupGame] ? 'this game in Solo games' : 'any Solo game';
    throw Object.assign(new PlayError(`Locked: clear ${need} levels of ${what} to play it with ${players} players. You have cleared ${have}.`, 403), { locked: { need, have, solo: SOLO[groupGame] ?? null } });
};

module.exports = { NEED, SOLO, needFor, summary, check };
