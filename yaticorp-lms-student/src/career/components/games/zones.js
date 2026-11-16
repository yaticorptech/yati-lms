/**
 * Age-based brain training (2026-11-13): the three zones, their internal difficulty bands, the ten thinking skills,
 * and where each of the 24 solo games belongs — decided from an audit of every game's code, content and difficulty
 * (not its name). One game id across all zones, so a student's levels, stars and XP stay one record per game.
 *
 * The student's zone comes from the class they gave in Career Path (server: career/services/gameZone.js, GET
 * /games/zone). Nothing is asked here. Classes 1–5 Young Thinkers, 6–10 Rising Brains, 11–12 and beyond Master Minds.
 *
 * Roles in a zone: 'core' (made for this age), 'challenge' (a stretch, for the confident), 'practice' (lighter, for
 * extra practice). `from`: the band a game opens at inside the zone (before it, the card shows when it unlocks).
 * A game with no entry for a zone does not appear there: its content does not suit that age yet.
 */
import { CATALOG } from './catalog.js';

export const ZONES = [
    {
        key: 'young', name: 'Young Thinkers', classes: 'Classes 1–5', ages: 'Ages 6–10',
        tagline: 'Play, spot, remember — big ideas in small steps.',
        band: 'from-amber-400 via-orange-400 to-rose-400', glow: 'shadow-orange-400/30', ring: 'ring-orange-200', soft: 'bg-orange-50', ink: 'text-orange-700', emoji: '🌱'
    },
    {
        key: 'smart', name: 'Rising Brains', classes: 'Classes 6–10', ages: 'Ages 11–15',
        tagline: 'Patterns, puzzles and speed — sharpen how you think.',
        band: 'from-sky-500 via-indigo-500 to-violet-500', glow: 'shadow-indigo-500/30', ring: 'ring-indigo-200', soft: 'bg-indigo-50', ink: 'text-indigo-700', emoji: '💡'
    },
    {
        key: 'master', name: 'Master Minds', classes: 'Classes 11–12', ages: 'Ages 16–18',
        tagline: 'Strategy, precision and pressure — think at full depth.',
        band: 'from-slate-800 via-violet-900 to-fuchsia-800', glow: 'shadow-fuchsia-700/30', ring: 'ring-fuchsia-200', soft: 'bg-fuchsia-50', ink: 'text-fuchsia-800', emoji: '🧠'
    }
];
export const zoneByKey = (key) => ZONES.find((z) => z.key === key) || null;

/**
 * The internal bands (not separate sections). Each bounds the shared difficulty ladder (levels.js useGameProgress):
 * `maxDifficulty` the hardest of the three difficulty bands a game may use, `minDifficulty` the easiest, `maxStep`
 * the highest step inside a band. Part 2 adds age-specific content and rules per game on top.
 */
export const BANDS = {
    foundation: { zone: 'young', label: 'Foundation', classes: 'Classes 1–2', minDifficulty: 1, maxDifficulty: 1, maxStep: 12 },
    developing: { zone: 'young', label: 'Developing', classes: 'Classes 3–5', minDifficulty: 1, maxDifficulty: 1, maxStep: 24 },
    intermediate: { zone: 'smart', label: 'Intermediate', classes: 'Classes 6–8', minDifficulty: 1, maxDifficulty: 2, maxStep: 30 },
    analytical: { zone: 'smart', label: 'Higher analytical', classes: 'Classes 9–10', minDifficulty: 1, maxDifficulty: 3, maxStep: 30 },
    advanced: { zone: 'master', label: 'Advanced', classes: 'Classes 11–12', minDifficulty: 2, maxDifficulty: 3, maxStep: 30 }
};
const BAND_ORDER = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];
/** The band a zone is played at by someone outside it (or whose class is not known). */
export const DEFAULT_BAND = { young: 'developing', smart: 'intermediate', master: 'advanced' };
export const bandAtLeast = (band, from) => BAND_ORDER.indexOf(band) >= BAND_ORDER.indexOf(from);

/** The ten thinking skills. Game scores track practice and improvement in them — they are not IQ measurements. */
export const SKILLS = {
    memory: 'Memory & working memory',
    logic: 'Logical reasoning',
    number: 'Numerical intelligence',
    pattern: 'Pattern recognition',
    spatial: 'Spatial intelligence',
    verbal: 'Vocabulary & verbal reasoning',
    attention: 'Concentration & attention',
    speed: 'Processing speed',
    strategy: 'Strategic thinking',
    critical: 'Critical & creative thinking'
};

/*
 * The classification of the 24 games (audit, 2026-11-13). `skill`: the primary skill; `also`: secondary skills.
 * Notes in brackets are the reasons from the audit.
 */
export const GAME_ZONES = {
    // Memory & Focus
    'memory-match': { skill: 'memory', also: ['attention', 'spatial'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // pictures (young) · look-alike symbols · rotated symbols in a set order
    'sequence-recall': { skill: 'memory', also: ['attention', 'pattern'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture pads (young) · symbols+numbers · ordering rules (master)
    'number-recall': { skill: 'memory', also: ['number', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // 2–5 digits on a big pad (young) · two numbers, recall one (master)
    'colour-match': { skill: 'attention', also: ['speed'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // colours of shapes (Classes 1–2) · Stroop · INK/WORD switching (master)
    'grid-recall': { skill: 'spatial', also: ['memory', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // pictures on 3×3–4×4 (young) · two patterns, second first (master)
    'reverse-recall': { skill: 'memory', also: ['number', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // pictures backwards (young) · reverse and add 1 (master)
    // Logic & Deduction
    'next-in-sequence': { skill: 'pattern', also: ['number', 'logic'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // colour/shape patterns (young) · arithmetic/geometric · multi-rule (master)
    'tic-tac-toe': { skill: 'strategy', also: ['logic'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // gentle bot (young) · fork puzzles · 4×4 forced wins (master)
    'mini-sudoku': { skill: 'logic', also: ['pattern', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // 4×4 fruit/numbers (young) · 6×6 · 9×9 (master)
    'picture-logic': { skill: 'logic', also: ['spatial', 'critical'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture nonograms (young) · 6–8 · 8–10 grids
    'tower-shift': { skill: 'strategy', also: ['spatial', 'logic'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // 2–4 rings (young) · 4–6 rings · next-door-pegs rule (master)
    // Vocabulary & Linguistics (banks written for older readers: none suits Classes 1–2 yet — Part 2)
    'word-scramble': { skill: 'verbal', also: ['pattern'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture words on tiles (young) · school words in context · prefix/suffix clues (master)
    'synonym-match': { skill: 'verbal', also: ['critical'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture words (young) · school/advanced words in context · nuance (master)
    'sentence-gap': { skill: 'verbal', also: ['critical'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture sentences (young) · grammar in context · complex sentences
    'spelling-fix': { skill: 'verbal', also: ['attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture words, 3 options (young) · commonly misspelt · confused pairs (master)
    'typing-sprint': { skill: 'speed', also: ['verbal', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // letters with a key guide (young) · sentences · passages, WPM + accuracy (master)
    'idiom-sense': { skill: 'verbal', also: ['critical'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // everyday expressions (Classes 1–2) · common idioms in context · figurative (master)
    'tense-pick': { skill: 'verbal', also: ['logic'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // past/present with pictures (young) · perfect tenses · conditionals, reported speech (master)
    'sound-alike': { skill: 'verbal', also: ['attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // picture pairs sea/see (young) · their/there · discreet/discrete
    // Math & Speed Processing
    'math-sprint': { skill: 'number', also: ['speed'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // counting pictures, +/− (Classes 1–2), tables · mixed, negatives · powers, roots, %
    'running-total': { skill: 'number', also: ['memory', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // dot groups (young) · negatives, ×2/÷2 · two totals at once (master)
    'percent-snap': { skill: 'number', also: ['speed'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // equal parts and fractions in pictures (young) · % · successive %, interest (master)
    'speed-sort': { skill: 'speed', also: ['number', 'attention'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // numbers and sizes (young) · decimals, negatives, fractions · powers and roots (master)
    'number-forge': { skill: 'number', also: ['logic', 'critical'], zones: { young: { role: 'core' }, smart: { role: 'core' }, master: { role: 'core' } } }, // + only to 10 (Classes 1–2) · all ops · use-every-tile rules (master),
    'shadow-detective': { skill: 'attention', also: ['spatial', 'pattern'], zones: { young: { role: 'core' }, smart: { role: 'practice' } } }, // new 2026-11-13,
    'treasure-path': { skill: 'spatial', also: ['logic', 'strategy'], zones: { young: { role: 'core' }, smart: { role: 'core' } } }, // new 2026-11-13,
    'probability-lab': { skill: 'number', also: ['critical', 'logic'], zones: { smart: { role: 'challenge', from: 'analytical' }, master: { role: 'core' } } }, // new 2026-11-13,
    'algorithm-builder': { skill: 'strategy', also: ['logic', 'critical'], zones: { smart: { role: 'challenge', from: 'analytical' }, master: { role: 'core' } } }, // new 2026-11-13,
    'logic-detective': { skill: 'logic', also: ['critical', 'attention'], zones: { smart: { role: 'core' }, master: { role: 'core' } } }, // new 2026-11-13,
    'cipher-challenge': { skill: 'pattern', also: ['verbal', 'logic'], zones: { smart: { role: 'core' }, master: { role: 'core' } } }, // new 2026-11-13
};

/*
 * The 84 games (2026-11-14, catalog.js): every game of the structure not listed above belongs to its one section;
 * its skill comes from its category. The games above keep their entries (their records and tests use them).
 */
const CATEGORY_SKILL = { memory: 'memory', logic: 'logic', vocab: 'verbal', math: 'number' };
for (const g of CATALOG) {
    if (!GAME_ZONES[g.id]) GAME_ZONES[g.id] = { skill: CATEGORY_SKILL[g.category], also: [], zones: { [g.section]: { role: 'core' } } };
}

/** A game's place in a zone for a band: null (not in this zone), or { role, locked, from }. */
export const placeOf = (gameId, zone, band) => {
    const z = GAME_ZONES[gameId]?.zones?.[zone];
    if (!z) return null;
    const locked = Boolean(z.from && band && !bandAtLeast(band, z.from));
    return { role: z.role, from: z.from || null, locked };
};

/*
 * Access across zones (2026-11-13, part 3) — the same rules the server applies to rooms and online matches
 * (yaticorp-lms-server competitions/services/zoneAccess.js; keep the two in step):
 *   own zone → recommended · a zone below → available (practice) · one above → preview, or unlocked once the game's
 *   adaptive stage is hard/expert over 3+ sessions averaging ≥ 0.75 · two above → preview, or unlocked at expert over
 *   5+ sessions averaging ≥ 0.85 · class not known → available everywhere. Per game, never a whole zone.
 */
const ZONE_ORDER = ['young', 'smart', 'master'];
export const readiness = (stats) => {
    const sessions = Array.isArray(stats?.sessions) ? stats.sessions : [];
    const avg = (xs) => (xs.length ? xs.reduce((n, s) => n + (Number(s.perf) || 0), 0) / xs.length : 0);
    const last5 = sessions.slice(-5), last3 = sessions.slice(-3);
    if (stats?.stage === 'expert' && last5.length >= 5 && avg(last5) >= 0.85) return 2;
    if (['hard', 'expert'].includes(stats?.stage) && last3.length >= 3 && avg(last3) >= 0.75) return 1;
    return 0;
};
export const accessFor = (own, target, _stats = null) => {
    if (!ZONE_ORDER.includes(target)) return 'locked';
    if (!ZONE_ORDER.includes(own)) return 'available';
    const gap = ZONE_ORDER.indexOf(target) - ZONE_ORDER.indexOf(own);
    if (gap === 0) return 'recommended';
    if (gap < 0) return 'available';
    // 2026-11-14 (the 84 games): a section above the student's own is shown, never played — the registered class
    // decides, as on the server (zoneAccess.js). `stats` and readiness are kept for the progress view.
    // 2026-11-14 (the user): every section is open — a higher one is played too, as practice ('available').
    return 'available';
};
export const ACCESS_MESSAGE = {
    recommended: 'Made for your class.',
    available: 'Open for practice.',
    unlocked: 'You’re ready to try a more advanced challenge!',
    preview: 'Keep practising this game in your own zone to unlock it here.',
    locked: 'Keep practising to unlock your next challenge.'
};

/*
 * Group games by zone (2026-11-13, part 3) — mirrors the server (competitions/games/zones.js GROUP_ZONES, which is
 * what rooms are checked against). Only games with a real multiplayer engine. `GROUP_TWIN`: the solo game whose
 * progress shows readiness for a zone above (as the server's unlocks.js SOLO); null: no twin (never unlocked early).
 */
export const GROUP_ZONES = {
    // 2026-11-14: each room game in its catalogue game's section only (./multiplayer.js); no twin among the 84 → as before.
    chess: ['smart', 'master'], spatialiq: ['master'], finalvault: ['young', 'smart', 'master'], spotthechange: ['young', 'smart'], dotcount: ['young'],
    deduction: ['smart', 'master'],
    // Young Thinkers
    memorymatch: ['young'], colourmatch: ['young'], tictactoe: ['young'], oddoneout: ['young'], spellingfix: ['young'], soundalike: ['young'],
    typingsprint: ['young'], mathsprint: ['young'], speedsort: ['young'],
    animalpairs: ['young'], rhymes: ['young'], numberhop: ['young'], missingnumber: ['young'],
    // Rising Brains
    sequence: ['smart'], numberrecall: ['smart'], patternmaster: ['smart'], sudoku: ['smart'], wordlogic: ['smart'], sentencegap: ['smart'],
    tensepick: ['smart'], runningtotal: ['smart'],
    analogies: ['smart'], equationrush: ['smart'], ratiorelay: ['smart'],
    // Master Minds
    memorymatrix: ['master'], reverserecall: ['master'], synonymmatch: ['master'], idiomsense: ['master'], percentsnap: ['master'], numberlogic: ['master'],
    cipherlab: ['master'], probability: ['master'], quantarena: ['master'], decisions: ['master']
};
export const GROUP_TWIN = {
    memorymatch: 'memory-match', memorymatrix: 'grid-recall', sequence: 'sequence-recall', numberrecall: 'number-recall',
    colourmatch: 'colour-match', spotthechange: null, tictactoe: 'tic-tac-toe', patternmaster: 'next-in-sequence',
    sudoku: 'mini-sudoku', deduction: 'logic-detective', chess: null, spatialiq: null,
    finalvault: null, wordlogic: 'word-scramble', idiomsense: 'idiom-sense', typingsprint: 'typing-sprint',
    mathsprint: 'math-sprint', runningtotal: 'running-total', numberlogic: 'number-forge', dotcount: null,
    oddoneout: 'odd-one-out', spellingfix: 'spelling-fix', soundalike: 'sound-alike', speedsort: 'speed-sort', sentencegap: 'sentence-gap',
    tensepick: 'tense-pick', reverserecall: 'reverse-recall', synonymmatch: 'synonym-match', percentsnap: 'percent-snap',
    animalpairs: 'animal-pair-safari', rhymes: 'rhyme-detective', numberhop: 'number-hop', missingnumber: 'missing-number-race',
    analogies: 'analogy-master', equationrush: 'equation-rush', ratiorelay: 'ratio-relay', cipherlab: 'cipher-lab',
    probability: 'probability-lab', quantarena: 'quantitative-arena', decisions: 'decision-theory-arena'
};
export const ZONE_DIFFICULTY = { young: 'easy', smart: 'medium', master: 'hard' };
