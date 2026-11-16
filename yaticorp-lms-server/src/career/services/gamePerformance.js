/**
 * Game performance for the student's My Progress page (2026-11-14): GET /api/career/games/performance.
 *
 * Everything is read from what the server already stores — the solo records (GameProgress: levels, stars and the
 * adaptive sessions in `stats`), the star history (GameStarEvent) and the group results (competitions/groupbrain) —
 * and nothing is taken from the browser at read time. Individual and group play are reported apart and never mixed.
 * It describes how a student does in these games: game performance, not an IQ or any measure of intelligence.
 *
 * Definitions (the UI is built against them):
 *   played      games with any progress (a level cleared, a star, or a recorded session)
 *   completed   levels completed (GameProgress.cleared, summed)
 *   stars       best stars, summed
 *   accuracy    mean accuracy (0–100) of the last 10 recorded sessions that have one; null when none
 *   trend       the last up-to-10 sessions, oldest first: accuracy, or performance × 100 when a session has none
 *   attempts    recorded sessions for the game (the browser keeps its last 12)
 *   strengths   categories with at least 3 sessions scoring 70 or more on average (best first, at most 2)
 *   practice    categories with at least 3 sessions scoring under 60 on average (weakest first, at most 2)
 *
 * Achievements are earned only from that stored data, and none for speed alone.
 */
const { CATEGORIES, catalogGame, categoryOf, gameTitle } = require('../data/gameCatalog');
const { dayKey } = require('../../rewards/config/constants');

const TREND = 10;
const HISTORY = 30;
const CATEGORY_STARS = 30;      // Memory Champion, Logic Explorer, Word Master, Number Ninja
const SPECIALIST_LEVELS = 10;   // Category Specialist
const STREAK = 3;               // Accuracy Streak: sessions in a row
const STREAK_ACCURACY = 90;
const DAYS = 5;                 // Consistency Champion
const GROUP_GAMES = 3;          // Multiplayer Challenger

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sessionsOf = (doc) => (Array.isArray(doc?.stats?.sessions) ? doc.stats.sessions : [])
    .filter((s) => s && Number.isFinite(Number(s.at)))
    .map((s) => ({ ...s, gameId: doc.gameId }))
    .sort((a, b) => a.at - b.at);
const accuracyOf = (s) => (Number.isFinite(s.accuracy) ? s.accuracy : null);
const markOf = (s) => (Number.isFinite(s.accuracy) ? s.accuracy : Math.round((Number(s.perf) || 0) * 100));
const starTotalOf = (doc) => {
    if (Number.isFinite(doc.starTotal)) return doc.starTotal;
    const stars = doc.stars instanceof Map ? [...doc.stars.values()] : Object.values(doc.stars || {});
    return stars.reduce((n, v) => n + (Number(v) || 0), 0);
};
const iso = (t) => (t == null ? null : new Date(t).toISOString());

/**
 * Pure. `docs`: the student's GameProgress documents (lean); `events`: their GameStarEvents, oldest first;
 * `group`: the group summary ({ played, wins, podiums, winRate, recent, finishedAt: [oldest first] }).
 */
const buildPerformance = ({ zone = null, band = null, docs = [], events = [], group = null }) => {
    const played = docs.filter((d) => (d.cleared || 0) > 0 || starTotalOf(d) > 0 || sessionsOf(d).length > 0);
    const allSessions = played.flatMap(sessionsOf).sort((a, b) => a.at - b.at);

    // Per game.
    const games = played.map((d) => {
        const ss = sessionsOf(d);
        const accs = ss.slice(-TREND).map(accuracyOf).filter((x) => x != null);
        const scores = ss.map((s) => s.score).filter(Number.isFinite);
        const bestScore = Number.isFinite(d.stats?.best?.score) ? Math.max(d.stats.best.score, ...scores) : scores.length ? Math.max(...scores) : null;
        const last = ss[ss.length - 1];
        const lastPlayed = Math.max(new Date(d.updatedAt || 0).getTime(), last?.at || 0) || null;
        return {
            gameId: d.gameId, title: gameTitle(d.gameId), section: catalogGame(d.gameId)?.section || null, category: categoryOf(d.gameId),
            level: d.level || 1, stars: starTotalOf(d), attempts: ss.length,
            accuracy: accs.length ? Math.round(mean(accs)) : null,
            lastScore: Number.isFinite(last?.score) ? last.score : null, bestScore, lastPlayed: iso(lastPlayed)
        };
    }).sort((a, b) => String(b.lastPlayed || '').localeCompare(String(a.lastPlayed || '')) || a.gameId.localeCompare(b.gameId));

    // Per category.
    const categories = {};
    for (const key of CATEGORIES) {
        const mine = played.filter((d) => categoryOf(d.gameId) === key);
        const ss = mine.flatMap(sessionsOf).sort((a, b) => a.at - b.at);
        const accs = ss.slice(-TREND).map(accuracyOf).filter((x) => x != null);
        const top = [...mine].sort((a, b) => starTotalOf(b) - starTotalOf(a) || (b.cleared || 0) - (a.cleared || 0))[0];
        categories[key] = {
            played: mine.length,
            completed: mine.reduce((n, d) => n + (d.cleared || 0), 0),
            stars: mine.reduce((n, d) => n + starTotalOf(d), 0),
            accuracy: accs.length ? Math.round(mean(accs)) : null,
            trend: ss.slice(-TREND).map(markOf),
            best: top && starTotalOf(top) > 0 ? { gameId: top.gameId, title: gameTitle(top.gameId), stars: starTotalOf(top) } : null
        };
    }
    const judged = Object.entries(categories).filter(([, c]) => c.trend.length >= 3).map(([k, c]) => [k, mean(c.trend)]);
    const strengths = judged.filter(([, v]) => v >= 70).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
    const practice = judged.filter(([, v]) => v < 60).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);

    // History: the newest star improvements, each with the stars the level reached then.
    const reached = new Map();
    const withReached = events.map((e) => {
        const k = `${e.gameId}|${e.level}`;
        const to = Math.min(3, (reached.get(k) || 0) + (Number(e.stars) || 0));
        reached.set(k, to);
        return { gameId: e.gameId, title: gameTitle(e.gameId), level: e.level, stars: to, at: iso(e.createdAt) };
    });
    const history = withReached.slice(-HISTORY).reverse();

    const individual = {
        played: played.length,
        completed: played.reduce((n, d) => n + (d.cleared || 0), 0),
        stars: played.reduce((n, d) => n + starTotalOf(d), 0),
        categories, games, history, strengths, practice
    };

    const groupOut = group
        ? { played: group.played, wins: group.wins, podiums: group.podiums, winRate: group.winRate, recent: group.recent }
        : { played: 0, wins: 0, podiums: 0, winRate: 0, recent: [] };

    return { zone, band, individual, group: groupOut, achievements: achievementsFor({ played, allSessions, events, group, categories }) };
};

/** When a running total over events (oldest first) first reached `need`, or null. */
const reachedAt = (events, need, count = (e) => Number(e.stars) || 0) => {
    let n = 0;
    for (const e of events) { n += count(e); if (n >= need) return iso(e.createdAt); }
    return null;
};

const achievementsFor = ({ played, allSessions, events, group, categories }) => {
    const list = [];
    const add = (key, title, description, have, need, at = null) => {
        const earned = have >= need;
        list.push({ key, title, description, earned, at: earned ? at : null, progress: { have: Math.min(have, need), need } });
    };

    // First Game Completed: a level cleared (or a session passed).
    const cleared = played.reduce((n, d) => n + (d.cleared || 0), 0);
    const firstPass = allSessions.find((s) => s.passed);
    const firstClear = events.find((e) => e.first);
    add('first-game', 'First Game Completed', 'Complete your first level in any brain game.', cleared > 0 || firstPass ? 1 : 0, 1,
        iso(firstClear?.createdAt) || iso(firstPass?.at));

    // A champion of each category: its stars.
    const CHAMPIONS = [
        ['memory', 'memory-champion', 'Memory Champion'], ['logic', 'logic-explorer', 'Logic Explorer'],
        ['vocab', 'word-master', 'Word Master'], ['math', 'number-ninja', 'Number Ninja']
    ];
    for (const [cat, key, title] of CHAMPIONS) {
        const catEvents = events.filter((e) => categoryOf(e.gameId) === cat);
        add(key, title, `Earn ${CATEGORY_STARS} stars in ${({ memory: 'Memory & Focus', logic: 'Logic & Deduction', vocab: 'Vocabulary & Linguistics', math: 'Math & Speed Processing' })[cat]} games.`,
            categories[cat].stars, CATEGORY_STARS, reachedAt(catEvents, CATEGORY_STARS));
    }

    // Accuracy Streak: the most recent sessions with an accuracy, in a row at 90% or more.
    const withAcc = allSessions.filter((s) => accuracyOf(s) != null);
    let run = 0;
    for (let i = withAcc.length - 1; i >= 0 && withAcc[i].accuracy >= STREAK_ACCURACY; i -= 1) run += 1;
    const streak = withAcc.slice(withAcc.length - run);
    add('accuracy-streak', 'Accuracy Streak', `Score ${STREAK_ACCURACY}% accuracy or better in ${STREAK} games in a row.`, run, STREAK,
        run >= STREAK ? iso(streak[STREAK - 1].at) : null);

    // Personal Best: a session that beat every earlier one in the same game (its score, else its accuracy/performance).
    let pb = null;
    for (const d of played) {
        const ss = sessionsOf(d);
        let top = null;
        for (const s of ss) {
            const mark = Number.isFinite(s.score) ? s.score : markOf(s);
            if (top != null && mark > top && (!pb || s.at < pb)) pb = s.at;
            top = top == null ? mark : Math.max(top, mark);
        }
    }
    add('personal-best', 'Personal Best', 'Beat your own best result in a game.', pb ? 1 : 0, 1, iso(pb));

    // Consistency Champion: different days with play (sessions and star improvements).
    const firstOfDay = new Map();
    for (const t of [...allSessions.map((s) => s.at), ...events.map((e) => new Date(e.createdAt).getTime())].sort((a, b) => a - b)) {
        const k = dayKey(new Date(t));
        if (!firstOfDay.has(k)) firstOfDay.set(k, t);
    }
    const days = [...firstOfDay.entries()];
    add('consistency-champion', 'Consistency Champion', `Play brain games on ${DAYS} different days.`, days.length, DAYS,
        days.length >= DAYS ? iso(days[DAYS - 1][1]) : null);

    // Multiplayer Challenger: group games played.
    const groupDates = group?.finishedAt || [];
    add('multiplayer-challenger', 'Multiplayer Challenger', `Play ${GROUP_GAMES} group games.`, group?.played || 0, GROUP_GAMES,
        groupDates.length >= GROUP_GAMES ? iso(groupDates[GROUP_GAMES - 1]) : null);

    // Category Specialist: levels completed in one category.
    const byCat = Object.entries(categories).map(([k, c]) => [k, c.completed]).sort((a, b) => b[1] - a[1]);
    const [bestCat, levels] = byCat[0] || [null, 0];
    add('category-specialist', 'Category Specialist', `Complete ${SPECIALIST_LEVELS} levels in one category.`, levels, SPECIALIST_LEVELS,
        bestCat ? reachedAt(events.filter((e) => categoryOf(e.gameId) === bestCat), SPECIALIST_LEVELS, (e) => (e.first ? 1 : 0)) : null);

    return list;
};

module.exports = { buildPerformance, CATEGORY_STARS, SPECIALIST_LEVELS, STREAK, STREAK_ACCURACY, DAYS, GROUP_GAMES };
