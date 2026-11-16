/**
 * Group games by age zone (2026-11-13, age-based brain training part 3). Only games with a real multiplayer engine
 * (games/index.js ROOM_GAMES) are listed. A room is made in one zone (`options.zone`); the zone sets its difficulty
 * (ZONE_DIFFICULTY) and, through the games' own generators (`options.zone`), what is asked. Students play their own
 * zone and the zones below; a zone above only for the games they have unlocked (services/zoneAccess.js).
 *
 *   young  — Young Thinkers (Classes 1–5): picture memory battles, colour and shape races, simple patterns and numbers,
 *            a friendly strategy game, a collaborative treasure hunt.
 *   smart  — Rising Brains (Classes 6–10): team Sudoku, deduction, sequence races, memory duels, strategy, code-breaking,
 *            a collaborative mystery, number reasoning.
 *   master — Master Minds (Classes 11–12+): advanced logic and deduction, multi-stage memory, complex numbers, ciphers,
 *            advanced strategy, spatial reasoning, the escape-room vault.
 */
const ZONES = ['young', 'smart', 'master'];
const ZONE_DIFFICULTY = { young: 'easy', smart: 'medium', master: 'hard' };

// 2026-11-14 (the 84-game catalogue): a room game whose solo twin is one of the 84 games is played in that game's
// section only (./multiplayer.js maps them); one with no twin among the 84 keeps the zones it had.
const GROUP_ZONES = {
    // No twin among the 84 (or twins in two sections): as before.
    chess: ['smart', 'master'],
    spatialiq: ['master'],
    finalvault: ['young', 'smart', 'master'],
    spotthechange: ['young', 'smart'],
    dotcount: ['young'],
    deduction: ['smart', 'master'], // logic-detective (smart) and deduction (master)
    // Young Thinkers
    memorymatch: ['young'],
    colourmatch: ['young'],
    tictactoe: ['young'],
    oddoneout: ['young'],
    spellingfix: ['young'],
    soundalike: ['young'],
    typingsprint: ['young'],
    mathsprint: ['young'],
    speedsort: ['young'],
    animalpairs: ['young'],
    rhymes: ['young'],
    numberhop: ['young'],
    missingnumber: ['young'],
    // Rising Brains
    sequence: ['smart'],
    numberrecall: ['smart'],
    patternmaster: ['smart'],
    sudoku: ['smart'],
    wordlogic: ['smart'],
    sentencegap: ['smart'],
    tensepick: ['smart'],
    runningtotal: ['smart'],
    analogies: ['smart'],
    equationrush: ['smart'],
    ratiorelay: ['smart'],
    // Master Minds
    memorymatrix: ['master'],
    reverserecall: ['master'],
    synonymmatch: ['master'],
    idiomsense: ['master'],
    percentsnap: ['master'],
    numberlogic: ['master'],
    cipherlab: ['master'],
    probability: ['master'],
    quantarena: ['master'],
    decisions: ['master']
};

const zonesOfGroupGame = (game) => GROUP_ZONES[game] || [];
const groupGamesIn = (zone) => Object.keys(GROUP_ZONES).filter((g) => GROUP_ZONES[g].includes(zone));
/**
 * A room's zone, from its options: 'young' | 'smart' | 'master', or null for a room made before zones (2026-11-13),
 * whose games then go by its difficulty alone, as they always did. The engines read it to pick what they ask.
 */
const zoneOf = (options) => (ZONES.includes(options?.zone) ? options.zone : null);

module.exports = { ZONES, ZONE_DIFFICULTY, GROUP_ZONES, zonesOfGroupGame, groupGamesIn, zoneOf };
