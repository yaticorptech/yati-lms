/**
 * The games, by id. Each engine follows ./contract.js. Loaded on first use, so
 * one game's file failing to load cannot take the others down with it.
 */
const IDS = ['chess', 'rapidfire', 'codeclash', 'brainsprint'];
// No longer offered (UNO, removed 2026-10-23; Ludo and Carrom, replaced by the
// brain games 2026-10-24): never listed or chosen for a new competition, but a
// competition or game made before then can still be read, played to its end
// and timed out. (Quiz and Hackathon are challenges, not games: no matches.)
// Code Breaker retired from group games (2026-11-14, the user): old results still read, no new rooms.
const RETIRED = ['uno', 'ludo', 'carrom', 'codebreaker'];
// Group Brain (asked 2026-10-27): the games students play in rooms of their
// own — Chess, and the ones played only in rooms. Their order is the
// order the Games page shows them in.
// And the solo games that are questions and answers (2026-10-29), on the quiz engine: ./soloquiz.js.
const { SOLO_QUIZ, soloEngine } = require('./soloquiz');
// The solo games played by hand, as races (./race.js), and in turns for two (./turns.js).
const { RACE, raceEngine } = require('./race');
const { TURNS, turnEngine } = require('./turns');
// The 84-game catalogue's games that had no room game (2026-11-14): quizzes, ./catalogquiz.js.
const { CATALOG_QUIZ, catalogEngine } = require('./catalogquiz');
const ROOM_ONLY = ['memorymatrix', 'patternmaster', 'numberlogic', 'wordlogic', 'sudoku', 'deduction', 'spatialiq', 'sequence', 'finalvault', ...SOLO_QUIZ, ...RACE, ...TURNS, ...CATALOG_QUIZ].filter((id) => !RETIRED.includes(id));
const ROOM_GAMES = ['chess', ...ROOM_ONLY];

const cache = {};
const engine = (id) => {
    if (!IDS.includes(id) && !RETIRED.includes(id) && !ROOM_ONLY.includes(id)) return null;
    if (!cache[id]) cache[id] = soloEngine(id) || raceEngine(id) || turnEngine(id) || catalogEngine(id) || require(`./${id}`);
    return cache[id];
};

/** What the lobby and the forms need to know about each game (`ids`: which ones). */
const catalogue = (ids = IDS) => ids.map((id) => {
    const e = engine(id);
    return { id, label: e.label, emoji: e.emoji, summary: e.summary || '', minSeats: e.minSeats, maxSeats: e.maxSeats, seatsPerSide: e.seatsPerSide };
});

/**
 * Tests only: stand a simple engine in for a game, so the competition flow
 * can be exercised without playing real chess. Pass null to restore.
 */
const override = (id, fake) => { if (fake) cache[id] = fake; else delete cache[id]; };

module.exports = { IDS, RETIRED, ROOM_ONLY, ROOM_GAMES, engine, catalogue, override };
