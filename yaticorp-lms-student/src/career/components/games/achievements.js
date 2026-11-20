/**
 * Brain games progress maths (2026-11-13): achievements, the daily brain challenge, improvement over time and the
 * next challenge to suggest. Pure — every function takes the adaptive records ({ [gameId]: { stage, sessions, best } },
 * adaptive.js) as an argument — so tests/games/progress.test.js runs them under node. adaptive.js wraps the ones that
 * read this browser's records.
 *
 * Every number here is a practice indicator for these games, never an IQ score.
 */
import { GAME_ZONES, SKILLS, placeOf, accessFor } from './zones.js';

const DAY = 86400000;
const ZONE_ORDER = ['young', 'smart', 'master'];

/** Each solo game's name and hub category (Games.jsx CATEGORIES), for words and the "every category" achievement. */
export const GAME_INFO = {
    'memory-match': { name: 'Memory Match', category: 'memory' },
    'sequence-recall': { name: 'Sequence Recall', category: 'memory' },
    'number-recall': { name: 'Number Recall', category: 'memory' },
    'colour-match': { name: 'Colour Match', category: 'memory' },
    'grid-recall': { name: 'Grid Recall', category: 'memory' },
    'reverse-recall': { name: 'Reverse Recall', category: 'memory' },
    'shadow-detective': { name: 'Shadow Detective', category: 'memory' },
    'next-in-sequence': { name: 'Next in Sequence', category: 'logic' },
    'tic-tac-toe': { name: 'Tic-Tac-Toe', category: 'logic' },
    'mini-sudoku': { name: 'Mini Sudoku', category: 'logic' },
    'picture-logic': { name: 'Colouring Book', category: 'logic' },
    'treasure-path': { name: 'Treasure Path', category: 'logic' },
    'algorithm-builder': { name: 'Algorithm Builder', category: 'logic' },
    'logic-detective': { name: 'Logic Detective', category: 'logic' },
    'word-scramble': { name: 'Word Scramble', category: 'vocab' },
    'synonym-match': { name: 'Synonyms & Antonyms', category: 'vocab' },
    'sentence-gap': { name: 'Sentence Gap', category: 'vocab' },
    'spelling-fix': { name: 'Spelling Fix', category: 'vocab' },
    'typing-sprint': { name: 'Typing Sprint', category: 'vocab' },
    'idiom-sense': { name: 'Idiom Sense', category: 'vocab' },
    'tense-pick': { name: 'Tense Pick', category: 'vocab' },
    'sound-alike': { name: 'Sound Alike', category: 'vocab' },
    'chess-challenge': { name: 'Chess', category: 'logic' },
    'chess-master': { name: 'Chess Master', category: 'logic' },
    'word-ladder': { name: 'Word Ladder', category: 'vocab' },
    'math-sprint': { name: 'Math Sprint', category: 'math' },
    'percent-snap': { name: 'Percent Snap', category: 'math' },
    'running-total': { name: 'Running Total', category: 'math' },
    'speed-sort': { name: 'Speed Sort', category: 'math' },
    'number-forge': { name: 'Number Forge', category: 'math' },
    'probability-lab': { name: 'Probability Lab', category: 'math' }
};
/** A picture per skill, for the young wording and the skill bars. */
export const SKILL_EMOJI = { memory: '🧠', logic: '🧩', number: '🔢', pattern: '🔁', spatial: '📐', verbal: '📖', attention: '👀', speed: '⚡', strategy: '♟️', critical: '💡' };
export const CATEGORY_NAMES = { memory: 'Memory & Focus', logic: 'Logic & Deduction', vocab: 'Vocabulary & Linguistics', math: 'Math & Speed Processing' };
export const gameName = (id) => GAME_INFO[id]?.name || String(id || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** The local calendar day of a time, 'YYYY-MM-DD'. */
export const dayKeyOf = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDay = (key, delta) => {
    const [y, m, d] = key.split('-').map(Number);
    return dayKeyOf(new Date(y, m - 1, d + delta, 12));
};

/** Every session of every game, oldest first: [{ gameId, ...session }]. */
export const allSessions = (all) => Object.entries(all || {})
    .flatMap(([gameId, g]) => (Array.isArray(g?.sessions) ? g.sessions.map((s) => ({ gameId, ...s })) : []))
    .filter((s) => Number.isFinite(s.at))
    .sort((a, b) => a.at - b.at);

const avg = (xs) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null);
const perfOf = (s) => (Number.isFinite(s.perf) ? s.perf : 0);

/** Days in a row with at least one session, up to today (or yesterday, while today has not been played yet). */
export const playStreak = (all, now = Date.now()) => {
    const days = new Set(allSessions(all).map((s) => dayKeyOf(s.at)));
    let day = dayKeyOf(now);
    if (!days.has(day)) day = shiftDay(day, -1);
    let n = 0;
    while (days.has(day)) { n += 1; day = shiftDay(day, -1); }
    return n;
};

/* ---- Improvement ---------------------------------------------------------- */

/**
 * This period against the one before, from session times: average performance (0–100) and accuracy, and the change.
 * `days`: 7 for the week, 30 for the month. Null figures when a period has no sessions.
 */
export const periodChange = (sessions, days, now = Date.now()) => {
    const span = days * DAY;
    const cur = sessions.filter((s) => s.at > now - span && s.at <= now);
    const prev = sessions.filter((s) => s.at > now - 2 * span && s.at <= now - span);
    const p = (xs) => { const a = avg(xs.map(perfOf)); return a == null ? null : Math.round(a * 100); };
    const acc = (xs) => { const a = avg(xs.filter((s) => s.accuracy != null).map((s) => s.accuracy)); return a == null ? null : Math.round(a); };
    const now_ = p(cur), before = p(prev);
    return {
        sessions: cur.length, previousSessions: prev.length,
        score: now_, previousScore: before, change: now_ != null && before != null ? now_ - before : null,
        accuracy: acc(cur), previousAccuracy: acc(prev)
    };
};
export const improvement = (all, now = Date.now()) => {
    const sessions = allSessions(all);
    return { week: periodChange(sessions, 7, now), month: periodChange(sessions, 30, now) };
};

/**
 * The session just played against the attempts before it: accuracy (or performance, when a game has no right/wrong
 * answers) against the average of the previous three. { metric, current, average, change } or null with no history.
 */
export const vsRecent = (sessions, count = 3) => {
    if (!Array.isArray(sessions) || sessions.length < 2) return null;
    const last = sessions[sessions.length - 1];
    const before = sessions.slice(0, -1).slice(-count);
    if (last.accuracy != null) {
        const xs = before.filter((s) => s.accuracy != null).map((s) => s.accuracy);
        if (xs.length) { const a = Math.round(avg(xs)); return { metric: 'accuracy', current: last.accuracy, average: a, change: last.accuracy - a }; }
    }
    const a = Math.round(avg(before.map(perfOf)) * 100);
    const c = Math.round(perfOf(last) * 100);
    return { metric: 'performance', current: c, average: a, change: c - a };
};

/** The best before the last session: the highest score (or performance) among the earlier sessions, or the stored best. */
export const previousBest = (g, isNewBest) => {
    const earlier = (g?.sessions || []).slice(0, -1);
    if (!isNewBest) return g?.best || null;
    if (!earlier.length) return null;
    const top = earlier.reduce((b, s) => ((s.score ?? s.perf) > (b.score ?? b.perf) ? s : b));
    return { mark: top.score ?? top.perf, score: top.score ?? null, accuracy: top.accuracy ?? null, at: top.at };
};

/* ---- The daily brain challenge --------------------------------------------- */

/** A small string hash (FNV-1a), for picks that are the same all day for one student. */
const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
};
const rng = (seed) => () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The games playable in a zone at a band: placed there and not waiting for a later band. */
export const playableIn = (zone, band) => Object.keys(GAME_ZONES).filter((id) => { const p = placeOf(id, zone, band); return p && !p.locked; });

/**
 * Today's three games for a student: the same all day (date + student + zone), different skills where the zone
 * allows, only games playable in the zone at the student's band.
 */
export const dailyPicks = ({ zone, band, studentId = 'guest', date = dayKeyOf(Date.now()), count = 3 }) => {
    const pool = playableIn(zone, band);
    const next = rng(hash(`${date}|${studentId}|${zone}|${band}`));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const picks = [];
    const skills = new Set();
    for (const id of shuffled) {
        if (picks.length >= count) break;
        if (!skills.has(GAME_ZONES[id].skill)) { picks.push(id); skills.add(GAME_ZONES[id].skill); }
    }
    for (const id of shuffled) { if (picks.length >= count) break; if (!picks.includes(id)) picks.push(id); }
    return picks;
};

/** Whether each pick has a session on that day: [{ gameId, done }]. */
export const dailyProgress = (picks, all, date = dayKeyOf(Date.now())) =>
    picks.map((gameId) => ({ gameId, done: (all?.[gameId]?.sessions || []).some((s) => dayKeyOf(s.at) === date) }));

/** Days in a row with the whole daily challenge done, up to today (or yesterday, while today's is open). */
export const dailyStreak = (all, { zone, band, studentId = 'guest', now = Date.now() }) => {
    const done = (date) => dailyProgress(dailyPicks({ zone, band, studentId, date }), all, date).every((p) => p.done);
    let day = dayKeyOf(now);
    if (!done(day)) day = shiftDay(day, -1);
    let n = 0;
    while (n < 366 && done(day)) { n += 1; day = shiftDay(day, -1); }
    return n;
};

/* ---- The next challenge ----------------------------------------------------- */

const recentPerf = (g) => { const xs = (g?.sessions || []).slice(-5).map(perfOf); return xs.length ? avg(xs) : null; };

/**
 * What to play after `gameId`: a higher-zone challenge this game has just unlocked, else the weakest game of the same
 * skill, else an unplayed one of that skill, else one sharing a skill. { gameId, zone, reason, skill } or null.
 * reason: 'unlocked' | 'weaker' | 'new' | 'related'.
 */
export const recommendNext = (all, gameId, zone, band) => {
    const me = GAME_ZONES[gameId];
    if (!me) return null;
    const above = ZONE_ORDER.slice(ZONE_ORDER.indexOf(zone) + 1);
    for (const z of above) {
        if (me.zones[z] && accessFor(zone, z, all?.[gameId]) === 'unlocked') return { gameId, zone: z, reason: 'unlocked', skill: me.skill };
    }
    const pool = playableIn(zone, band).filter((id) => id !== gameId);
    const same = pool.filter((id) => GAME_ZONES[id].skill === me.skill);
    const mine = recentPerf(all?.[gameId]) ?? 1;
    const weaker = same.filter((id) => { const p = recentPerf(all?.[id]); return p != null && p < mine; })
        .sort((a, b) => recentPerf(all[a]) - recentPerf(all[b]));
    if (weaker.length) return { gameId: weaker[0], zone, reason: 'weaker', skill: me.skill };
    const fresh = same.filter((id) => !all?.[id]?.sessions?.length);
    if (fresh.length) return { gameId: fresh[0], zone, reason: 'new', skill: me.skill };
    const mySkills = [me.skill, ...(me.also || [])];
    const related = pool.filter((id) => GAME_ZONES[id].skill !== me.skill && mySkills.includes(GAME_ZONES[id].skill))
        .sort((a, b) => (recentPerf(all?.[a]) ?? -1) - (recentPerf(all?.[b]) ?? -1));
    if (related.length) return { gameId: related[0], zone, reason: 'related', skill: GAME_ZONES[related[0]].skill };
    if (same.length) return { gameId: same[0], zone, reason: 'weaker', skill: me.skill };
    return null;
};

/* ---- Skills over time -------------------------------------------------------- */

/** The largest gain (0–100 points) any skill made inside the last two weeks: first half of its sessions vs the second. */
export const bestSkillGain = (all, now = Date.now()) => {
    const by = {};
    for (const s of allSessions(all)) {
        if (s.at <= now - 14 * DAY) continue;
        const skill = GAME_ZONES[s.gameId]?.skill;
        if (skill) (by[skill] ||= []).push(perfOf(s));
    }
    let best = { skill: null, gain: 0 };
    for (const [skill, xs] of Object.entries(by)) {
        if (xs.length < 4) continue;
        const half = Math.floor(xs.length / 2);
        const gain = Math.round((avg(xs.slice(-half)) - avg(xs.slice(0, half))) * 100);
        if (gain > best.gain) best = { skill, gain };
    }
    return best;
};

/* ---- Achievements --------------------------------------------------------------- */

/**
 * Every achievement and whether it is earned, from the adaptive records plus the level ladder's own counts.
 * `extra`: { levelsCleared, threeStarLevels } from levels.js (the sessions keep only each game's last twelve).
 * Returns [{ key, emoji, title, text, earned, progress: 0..1 }].
 */
export const achievements = (all, { zone = null, levelsCleared = 0, threeStarLevels = 0, now = Date.now() } = {}) => {
    const sessions = allSessions(all);
    const played = Math.max(levelsCleared, sessions.length);
    const threes = Math.max(threeStarLevels, sessions.filter((s) => s.stars === 3).length);
    const streak = playStreak(all, now);
    const sharp = sessions.filter((s) => s.accuracy != null && s.accuracy >= 90).length;
    const categories = new Set(sessions.map((s) => GAME_INFO[s.gameId]?.category).filter(Boolean));
    const needed = Object.keys(CATEGORY_NAMES).filter((c) => !zone || Object.entries(GAME_INFO).some(([id, g]) => g.category === c && GAME_ZONES[id]?.zones?.[zone]));
    const gain = bestSkillGain(all, now);
    const expert = Object.values(all || {}).some((g) => g?.stage === 'expert');
    const part = (n, of) => Math.min(1, of ? n / of : 0);
    return [
        { key: 'first-perfect', emoji: '🌟', title: 'Shining Star', text: 'Finish a level with all 3 stars.', earned: threes >= 1, progress: part(threes, 1) },
        { key: 'levels-10', emoji: '🚀', title: 'Warming Up', text: 'Play 10 levels.', earned: played >= 10, progress: part(played, 10) },
        { key: 'levels-50', emoji: '🧗', title: 'Steady Climber', text: 'Play 50 levels.', earned: played >= 50, progress: part(played, 50) },
        { key: 'levels-100', emoji: '🏔️', title: 'Summit Seeker', text: 'Play 100 levels.', earned: played >= 100, progress: part(played, 100) },
        { key: 'streak-7', emoji: '🔥', title: 'Week of Practice', text: 'Play on 7 days in a row.', earned: streak >= 7, progress: part(streak, 7) },
        { key: 'sharp-5', emoji: '🎯', title: 'Sharp Shooter', text: 'Reach 90% accuracy in 5 rounds.', earned: sharp >= 5, progress: part(sharp, 5) },
        { key: 'all-categories', emoji: '🧭', title: 'Explorer', text: 'Play a game from every category.', earned: needed.every((c) => categories.has(c)), progress: part(needed.filter((c) => categories.has(c)).length, needed.length) },
        { key: 'skill-gain', emoji: '📈', title: 'On the Rise', text: `Raise a skill by 15 points in two weeks${gain.skill && gain.gain >= 15 ? ` (${SKILLS[gain.skill]})` : ''}.`, earned: gain.gain >= 15, progress: part(Math.max(0, gain.gain), 15) },
        { key: 'expert', emoji: '🏅', title: 'Expert Level', text: 'Reach the Expert stage in any game.', earned: expert, progress: expert ? 1 : 0 },
        // 2026-11-14: higher sections are never unlocked by results (the registered class decides), so this badge is
        // for ten three-star levels instead.
        { key: 'stars-10', emoji: '✨', title: 'Star Collector', text: 'Finish 10 levels with all 3 stars.', earned: threes >= 10, progress: part(threes, 10) }
    ];
};
