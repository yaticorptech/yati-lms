/**
 * Group Brain's numbers, all from the saved results (models.js) — the
 * student's dashboard, the leaderboards and the certificate rules read them
 * here. A voided result counts nowhere.
 *
 *   Brain Performance Score (BPS): for each skill — memory, reasoning,
 *   spatial, strategy — the average performance (0–100) of the player's last
 *   20 games of that skill, and the BPS the average of the skills they have
 *   played. It describes how a player does in these games. It is not an IQ
 *   score and is not a scientific measure of intelligence.
 */
const mongoose = require('mongoose');
const { ROOM_GAMES, engine } = require('../games');
const { GroupBrainResult, GroupBrainProfile, GroupBrainAchievement, GroupBrainCertificate } = require('./models');

const SKILLS = ['memory', 'reasoning', 'spatial', 'strategy'];
const RECENT = 20;
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const BPS_NOTE = 'The Brain Performance Score sums up how you do in Group Brain games. It is a game-performance measure, not an IQ score.';

/** Monday 00:00 of this week (server time). */
const weekStart = (now = new Date()) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
};

/** One player's totals: played, won, drawn, lost, by game, streaks. */
const totals = async (userId) => {
    const rows = await GroupBrainResult.find({ userId, voided: false }).sort({ finishedAt: -1 }).lean();
    const byGame = Object.fromEntries(ROOM_GAMES.map((id) => [id, { played: 0, wins: 0, draws: 0, best: 0, totalScore: 0 }]));
    let streak = 0; let streakOpen = true; let bestStreak = 0; let run = 0;
    for (const r of rows) {
        const g = byGame[r.game];
        if (g) { g.played += 1; g.wins += r.won ? 1 : 0; g.draws += r.draw ? 1 : 0; g.best = Math.max(g.best, r.score); g.totalScore += r.score; }
        if (streakOpen) { if (r.won) streak += 1; else streakOpen = false; }
    }
    for (const r of [...rows].reverse()) { run = r.won ? run + 1 : 0; bestStreak = Math.max(bestStreak, run); }
    const wins = rows.filter((r) => r.won).length;
    const draws = rows.filter((r) => r.draw).length;
    return {
        rows, played: rows.length, wins, draws, losses: rows.length - wins - draws,
        xp: rows.filter((r) => r.xpStatus === 'paid').reduce((n, r) => n + r.xp, 0),
        byGame, gamesPlayed: Object.values(byGame).filter((g) => g.played).length,
        streak, bestStreak,
        perfect: rows.some((r) => r.game !== 'chess' && r.total >= 5 && r.correct === r.total),
        sudokuFinished: rows.some((r) => r.game === 'sudoku' && r.total > 0 && r.correct === r.total)
    };
};

/** The BPS and each skill, with how the last 10 compare with the 10 before. */
const brainScore = (rows) => {
    const skills = SKILLS.map((skill) => {
        const mine = rows.filter((r) => r.skill === skill).slice(0, RECENT);
        const avg = (xs) => (xs.length ? Math.round(xs.reduce((n, r) => n + r.performance, 0) / xs.length) : null);
        const recent = avg(mine.slice(0, 10));
        const before = avg(mine.slice(10, 20));
        return { skill, score: avg(mine), games: mine.length, trend: recent != null && before != null ? recent - before : null };
    });
    const played = skills.filter((s) => s.score != null);
    return { bps: played.length ? Math.round(played.reduce((n, s) => n + s.score, 0) / played.length) : null, skills, note: BPS_NOTE };
};

/**
 * A leaderboard. `period`: 'all' or 'week'; `game`: one game or all;
 * `from`/`to`: a tournament's window. Ranked by points (3 a win, 1 a shared
 * first place), then wins, then total score, then fewer games.
 */
const board = async ({ period = 'all', game = null, from = null, to = null, limit = 50, userId = null } = {}) => {
    const match = { voided: false };
    if (game) match.game = game;
    if (period === 'week') match.finishedAt = { $gte: weekStart() };
    if (from || to) match.finishedAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    const rows = await GroupBrainResult.aggregate([
        { $match: match },
        { $group: { _id: '$userId', name: { $last: '$name' }, played: { $sum: 1 }, wins: { $sum: { $cond: ['$won', 1, 0] } }, draws: { $sum: { $cond: ['$draw', 1, 0] } }, score: { $sum: '$score' }, xp: { $sum: { $cond: [{ $eq: ['$xpStatus', 'paid'] }, '$xp', 0] } } } },
        { $addFields: { points: { $add: [{ $multiply: ['$wins', 3] }, '$draws'] } } },
        { $sort: { points: -1, wins: -1, score: -1, played: 1, _id: 1 } }
    ]);
    const ranked = rows.map((r, i) => ({ rank: i + 1, userId: String(r._id), name: r.name, played: r.played, wins: r.wins, draws: r.draws, points: r.points, score: r.score, xp: r.xp, winRate: r.played ? Math.round((100 * r.wins) / r.played) : 0 }));
    const top = ranked.slice(0, limit);
    await withPictures(top);
    const me = userId ? ranked.find((r) => r.userId === String(userId)) || null : null;
    return { period, game, players: top, me };
};

/** The chess ratings, best first. */
const chessBoard = async ({ limit = 50, userId = null } = {}) => {
    const rows = await GroupBrainProfile.find({ chessGames: { $gt: 0 } }).sort({ chessRating: -1, chessGames: -1 }).lean();
    const User = require('../../models/User');
    const users = await User.find({ _id: { $in: rows.slice(0, limit).map((r) => r.userId) } }).select('name profilePicture').lean();
    const u = new Map(users.map((x) => [String(x._id), x]));
    const ranked = rows.map((r, i) => ({ rank: i + 1, userId: String(r.userId), rating: r.chessRating, games: r.chessGames }));
    return {
        players: ranked.slice(0, limit).map((r) => ({ ...r, name: u.get(r.userId)?.name || 'Player', avatar: u.get(r.userId)?.profilePicture || null })),
        me: userId ? ranked.find((r) => r.userId === String(userId)) || null : null
    };
};

/** XP earned in Group Brain, most first (`period` 'all' or 'week'). */
const xpBoard = async ({ period = 'all', limit = 50, userId = null } = {}) => {
    const match = { voided: false, xpStatus: 'paid' };
    if (period === 'week') match.finishedAt = { $gte: weekStart() };
    const rows = await GroupBrainResult.aggregate([{ $match: match }, { $group: { _id: '$userId', name: { $last: '$name' }, xp: { $sum: '$xp' }, played: { $sum: 1 } } }, { $sort: { xp: -1, _id: 1 } }]);
    const ranked = rows.map((r, i) => ({ rank: i + 1, userId: String(r._id), name: r.name, xp: r.xp, played: r.played }));
    const top = ranked.slice(0, limit);
    await withPictures(top);
    return { players: top, me: userId ? ranked.find((r) => r.userId === String(userId)) || null : null };
};

const withPictures = async (rows) => {
    const User = require('../../models/User');
    const users = await User.find({ _id: { $in: rows.map((r) => r.userId) } }).select('name profilePicture').lean();
    const u = new Map(users.map((x) => [String(x._id), x]));
    for (const r of rows) { r.name = u.get(r.userId)?.name || r.name; r.avatar = u.get(r.userId)?.profilePicture || null; }
    return rows;
};

/** Everything the student's dashboard shows, for one player. */
const dashboard = async (user) => {
    const t = await totals(user._id);
    const [profile, achievements, certificates, global, weekly, chess] = await Promise.all([
        GroupBrainProfile.findOne({ userId: user._id }).lean(),
        GroupBrainAchievement.find({ userId: user._id }).sort({ earnedAt: -1 }).lean(),
        GroupBrainCertificate.find({ userId: user._id }).sort({ issuedAt: -1 }).lean(),
        board({ userId: user._id, limit: 0 }),
        board({ period: 'week', userId: user._id, limit: 0 }),
        chessBoard({ userId: user._id, limit: 0 })
    ]);
    const games = await Promise.all(ROOM_GAMES.map(async (id) => {
        const g = t.byGame[id];
        const rank = g.played ? (await board({ game: id, userId: user._id, limit: 0 })).me?.rank || null : null;
        return { game: id, label: engine(id).label, emoji: engine(id).emoji, ...g, rank, average: g.played ? Math.round(g.totalScore / g.played) : 0 };
    }));
    const User = require('../../models/User');
    const u = await User.findById(user._id).select('name profilePicture xp level').lean();
    return {
        name: u?.name || user.name, avatar: u?.profilePicture || null,
        played: t.played, wins: t.wins, draws: t.draws, losses: t.losses,
        winRate: t.played ? Math.round((100 * t.wins) / t.played) : 0,
        streak: t.streak, bestStreak: t.bestStreak,
        groupBrainXp: t.xp, xp: u?.xp || 0, level: u?.level || 1,
        rank: global.me?.rank || null, weeklyRank: weekly.me?.rank || null, points: global.me?.points || 0,
        chess: { rating: profile?.chessRating ?? 1200, games: profile?.chessGames || 0, rank: chess.me?.rank || null },
        brain: brainScore(t.rows),
        games,
        achievements: achievements.map((a) => ({ key: a.key, title: a.title, description: a.description, xp: a.xp, earnedAt: a.earnedAt })),
        certificates: certificates.map((c) => ({ certId: c.certId, title: c.title, line: c.line, eventName: c.eventName, rank: c.rank, status: c.status, issuedAt: c.issuedAt, revokedReason: c.revokedReason })),
        recent: t.rows.slice(0, 10).map((r) => ({ id: String(r.gameId), game: r.game, label: engine(r.game)?.label || r.game, emoji: engine(r.game)?.emoji || '🎮', place: r.place, won: r.won, draw: r.draw, score: r.score, xp: r.xpStatus === 'paid' ? r.xp : 0, finishedAt: r.finishedAt }))
    };
};

/** My finished games, newest first, with each one's players. */
const history = async (userId, limit = 30) => {
    const rows = await GroupBrainResult.find({ userId, voided: false }).sort({ finishedAt: -1 }).limit(limit).lean();
    const others = await GroupBrainResult.find({ gameId: { $in: rows.map((r) => r.gameId) } }).select('gameId name').lean();
    return rows.map((r) => ({
        id: String(r.gameId), game: r.game, label: engine(r.game)?.label || r.game, emoji: engine(r.game)?.emoji || '🎮',
        difficulty: r.difficulty, players: others.filter((o) => String(o.gameId) === String(r.gameId)).map((o) => o.name),
        place: r.place, won: r.won, draw: r.draw, score: r.score, correct: r.correct, total: r.total, xp: r.xpStatus === 'paid' ? r.xp : 0,
        ratingBefore: r.ratingBefore, ratingAfter: r.ratingAfter, reason: r.reason, finishedAt: r.finishedAt
    }));
};

module.exports = { totals, brainScore, board, chessBoard, xpBoard, dashboard, history, weekStart, SKILLS, BPS_NOTE, oid };
