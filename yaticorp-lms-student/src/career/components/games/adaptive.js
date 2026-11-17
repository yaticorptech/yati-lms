/**
 * The adaptive difficulty engine (2026-11-13, age-based brain training, part 2). One engine for every solo game.
 *
 * Each finished level is a session: { stars, passed, correct, wrong, hints, ms, limitMs, difficulty }. A session's
 * performance blends accuracy (the most), stars, completion, a little of time used (never speed alone) and a small
 * cost per hint, into 0..1. A game's stage — easy, medium, hard, expert — moves only on a run of sessions at that
 * stage, never on one: up after three strong ones in a row (all passed, average ≥ 0.82), down after three that
 * struggled (average < 0.4, at least two not passed). The registered class never changes; the stage only shifts the
 * difficulty a little inside the student's zone (levels.js), and expert opens one step above it.
 *
 * Kept per student in this browser (yati:gameStats:<id>) and sent with the level's progress to the account
 * (levels.js pushGame → POST /games/progress `session`), so it follows the student between devices.
 *
 * Words for the student are kind: a stage going down is "more practice at this level", never a fall.
 */
import { GAME_ZONES, SKILLS } from './zones';
import { gameKey } from './gameStorage';
import { recommendNext } from './achievements';

export const STAGES = ['easy', 'medium', 'hard', 'expert'];
export const STAGE_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };
/** How a stage moves the difficulty inside the zone: `shift` on the difficulty band, `above` lets it pass the zone's top. */
export const STAGE_SHIFT = { easy: { shift: -1, above: 0 }, medium: { shift: 0, above: 0 }, hard: { shift: 0, above: 0, step: 4 }, expert: { shift: 1, above: 1 } };

const RUN = 3;           // sessions needed before a stage moves
const KEEP = 12;         // sessions kept per game
const UP = 0.82, DOWN = 0.4;

const KEY = () => gameKey('yati:gameStats');
const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY()) || '{}') || {}; } catch { return {}; } };
const writeAll = (v) => { try { localStorage.setItem(KEY(), JSON.stringify(v)); } catch { /* private window */ } };

export const statsOf = (gameId) => readAll()[gameId] || { stage: 'medium', sessions: [], best: null };
export const stageOf = (gameId) => statsOf(gameId).stage || 'medium';

const num = (v, lo, hi) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : null);

/** A session's performance, 0..1. */
export const performance = (s) => {
    const answered = (s.correct || 0) + (s.wrong || 0);
    const acc = answered ? s.correct / answered : (s.stars || 0) / 3;
    const time = s.ms && s.limitMs ? 1 - Math.min(1, s.ms / s.limitMs) : 0.5;   // finishing early helps a little
    const p = 0.55 * acc + 0.25 * ((s.stars || 0) / 3) + 0.12 * (s.passed ? 1 : 0) + 0.08 * time - 0.05 * Math.min(3, s.hints || 0);
    return Math.max(0, Math.min(1, p));
};

/** Records a finished level; returns { session, stage, moved: 'up' | 'down' | null, best: boolean }. */
export const recordSession = (gameId, raw) => {
    const all = readAll();
    const g = all[gameId] || { stage: 'medium', sessions: [], best: null };
    const s = {
        at: Date.now(), stage: g.stage,
        stars: num(raw.stars, 0, 3) ?? 0, passed: Boolean(raw.passed),
        correct: num(raw.correct, 0, 999), wrong: num(raw.wrong, 0, 999), hints: num(raw.hints, 0, 99) ?? 0,
        ms: num(raw.ms, 0, 3600000), limitMs: num(raw.limitMs, 0, 3600000), score: num(raw.score, 0, 1e7), difficulty: num(raw.difficulty, 1, 4)
    };
    s.perf = Math.round(performance(s) * 100) / 100;
    const answered = (s.correct || 0) + (s.wrong || 0);
    s.accuracy = answered ? Math.round((s.correct / answered) * 100) : null;
    g.sessions = [...g.sessions, s].slice(-KEEP);
    // A personal best: the highest score, or (no score) the best performance.
    const mark = s.score ?? s.perf;
    const best = !g.best || mark > g.best.mark;
    if (best) g.best = { mark, score: s.score, accuracy: s.accuracy, at: s.at };
    // The stage moves only on a run of sessions played at this stage.
    const run = g.sessions.filter((x) => x.stage === g.stage).slice(-RUN);
    let moved = null;
    if (run.length === RUN) {
        const avg = run.reduce((n, x) => n + x.perf, 0) / RUN;
        const i = STAGES.indexOf(g.stage);
        if (avg >= UP && run.every((x) => x.passed) && i < STAGES.length - 1) { g.stage = STAGES[i + 1]; moved = 'up'; }
        else if (avg < DOWN && run.filter((x) => !x.passed).length >= 2 && i > 0) { g.stage = STAGES[i - 1]; moved = 'down'; }
    }
    all[gameId] = g;
    writeAll(all);
    const out = { session: s, stage: g.stage, moved, best: best && g.sessions.length > 1 };
    try { window.dispatchEvent(new CustomEvent('yati:game-session', { detail: { gameId, ...out } })); } catch { /* no window */ }
    return out;
};

/** The account's copy (GET /games/progress `stats`), kept where it is ahead of this browser's. */
export const mergeStats = (remote) => {
    if (!remote || typeof remote !== 'object') return;
    const all = readAll();
    for (const [id, r] of Object.entries(remote)) {
        if (!r || !Array.isArray(r.sessions)) continue;
        const mine = all[id];
        const last = (x) => x?.sessions?.at(-1)?.at || 0;
        if (!mine || last(r) > last(mine)) all[id] = { stage: STAGES.includes(r.stage) ? r.stage : 'medium', sessions: r.sessions.slice(-KEEP), best: r.best || null };
    }
    writeAll(all);
};

/** Performance per thinking skill (primary skill 1, each secondary 0.5), from the last sessions of every game. */
export const skillSummary = () => {
    const all = readAll();
    const sum = {};
    for (const [id, g] of Object.entries(all)) {
        const z = GAME_ZONES[id];
        if (!z || !g.sessions?.length) continue;
        const recent = g.sessions.slice(-5);
        const avg = recent.reduce((n, x) => n + (x.perf || 0), 0) / recent.length;
        const first = g.sessions.slice(0, Math.min(3, g.sessions.length));
        const trend = avg - first.reduce((n, x) => n + (x.perf || 0), 0) / first.length;
        for (const [skill, w] of [[z.skill, 1], ...(z.also || []).map((x) => [x, 0.5])]) {
            const t = (sum[skill] ||= { skill, name: SKILLS[skill], weight: 0, total: 0, trend: 0, games: 0 });
            t.weight += w; t.total += avg * w; t.trend += trend * w; t.games += 1;
        }
    }
    return Object.values(sum).map((t) => ({ ...t, level: Math.round((t.total / t.weight) * 100), trend: Math.round((t.trend / t.weight) * 100) }))
        .sort((a, b) => b.level - a.level);
};

/* ---- Progress views (2026-11-13): the pure maths lives in achievements.js; these read this browser's records. ---- */

/** Every game's adaptive record: { [gameId]: { stage, sessions, best } }. */
export const allStats = () => readAll();

/**
 * The next challenge after playing `gameId` in `zone` at `band`: a higher-zone challenge it has just unlocked, else the
 * weakest game of the same skill, else a new one of that skill. { gameId, zone, reason, skill } or null.
 */
export const nextChallenge = (gameId, zone, band) => recommendNext(readAll(), gameId, zone, band);
