/**
 * Brain games: the account-side copy of each student's progress, and the
 * leaderboard built from it.
 *
 * Games are still played and scored entirely in the browser. What the server
 * adds is memory across devices and a way to compare — stars and levels,
 * never XP, so a memory game cannot inflate the numbers that measure real
 * work on the roadmap.
 */
const User = require('../models/User');
const GameProgress = require('../models/GameProgress');
const GameStarEvent = require('../models/GameStarEvent');
const { periodWindow } = require('../../rewards/config/constants');

const MAX_LEVEL = 90;
const MAX_STARS = 3;
const GAME_ID = /^[a-z0-9-]{2,40}$/;
const PERIODS = ['daily', 'weekly', 'monthly', 'all'];
const SCOPES = ['global', 'institution', 'class'];
const BOARD_SIZE = 10;

const fail = (res, error, what) => {
  console.error(`[career/games] ${what}:`, error);
  res.status(500).json({ message: `Could not ${what}` });
};

/** Tidy an incoming stars object: level keys 1…90, values 0…3, whole numbers. */
const cleanStars = (input) => {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, value] of Object.entries(input)) {
    const level = Number(key);
    const stars = Math.floor(Number(value));
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) continue;
    if (!Number.isFinite(stars) || stars <= 0) continue;
    out[String(level)] = Math.min(MAX_STARS, stars);
  }
  return out;
};

const sumStars = (stars) => Object.values(stars).reduce((sum, n) => sum + n, 0);

const shapeProgress = (doc) => ({
  gameId: doc.gameId,
  level: doc.level,
  stars: doc.stars instanceof Map ? Object.fromEntries(doc.stars) : doc.stars || {}
});

// @route GET /api/career/games/progress
// Every game the student has touched, for the hub to merge into its browser copy.
const getProgress = async (req, res) => {
  try {
    const docs = await GameProgress.find({ userId: req.user._id }).lean();
    res.json({ games: docs.map(shapeProgress) });
  } catch (error) {
    fail(res, error, 'load game progress');
  }
};

// @route POST /api/career/games/progress   { gameId, level, stars: { "1": 3, ... } }
// Merge the browser's record of one game into the account's. Only ever up.
const saveProgress = async (req, res) => {
  try {
    const gameId = String(req.body?.gameId || '').trim();
    if (!GAME_ID.test(gameId)) return res.status(400).json({ message: 'Unknown game' });

    const level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(req.body?.level) || 1)));
    const incoming = cleanStars(req.body?.stars);

    const doc =
      (await GameProgress.findOne({ userId: req.user._id, gameId })) ||
      new GameProgress({ userId: req.user._id, gameId, level: 1, stars: {} });

    const merged = doc.stars instanceof Map ? Object.fromEntries(doc.stars) : { ...(doc.stars || {}) };
    const events = [];
    for (const [key, stars] of Object.entries(incoming)) {
      const before = merged[key] || 0;
      if (stars <= before) continue;
      merged[key] = stars;
      events.push({ userId: req.user._id, gameId, level: Number(key), stars: stars - before, first: before === 0 });
    }

    doc.level = Math.max(doc.level || 1, level);
    doc.stars = merged;
    doc.starTotal = sumStars(merged);
    doc.cleared = doc.level - 1;
    await doc.save();
    if (events.length) await GameStarEvent.insertMany(events);

    res.json(shapeProgress(doc));
  } catch (error) {
    fail(res, error, 'save game progress');
  }
};

// The user ids a scope covers, or null for everyone. Mirrors the rewards board
// so "my institution" means the same thing on both.
const scopeUserIds = async (scope, me) => {
  if (scope === 'institution') {
    if (!me.institution) return [];
    return User.find({ institution: me.institution, status: 'active' }).distinct('_id');
  }
  if (scope === 'class') {
    if (!me.institution || !me.className) return [];
    return User.find({ institution: me.institution, className: me.className, status: 'active' }).distinct('_id');
  }
  return null;
};

/** Everyone ranked, best first: [{ userId, stars, cleared, games }]. */
const ranking = async ({ period, scope, me }) => {
  const ids = await scopeUserIds(scope, me);
  if (ids && ids.length === 0) return [];

  if (period === 'all') {
    const match = { starTotal: { $gt: 0 } };
    if (ids) match.userId = { $in: ids };
    return GameProgress.aggregate([
      { $match: match },
      { $group: { _id: '$userId', stars: { $sum: '$starTotal' }, cleared: { $sum: '$cleared' }, games: { $sum: 1 } } },
      { $sort: { stars: -1, cleared: -1, _id: 1 } },
      { $project: { _id: 0, userId: '$_id', stars: 1, cleared: 1, games: 1 } }
    ]);
  }

  const { start, end } = periodWindow(period);
  const match = { createdAt: { $gte: start, $lt: end } };
  if (ids) match.userId = { $in: ids };
  return GameStarEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        stars: { $sum: '$stars' },
        cleared: { $sum: { $cond: ['$first', 1, 0] } },
        gameIds: { $addToSet: '$gameId' }
      }
    },
    { $project: { _id: 0, userId: '$_id', stars: 1, cleared: 1, games: { $size: '$gameIds' } } },
    { $sort: { stars: -1, cleared: -1, userId: 1 } }
  ]);
};

// @route GET /api/career/games/leaderboard?period=weekly&scope=global
const getLeaderboard = async (req, res) => {
  try {
    const period = PERIODS.includes(req.query.period) ? req.query.period : 'weekly';
    const scope = SCOPES.includes(req.query.scope) ? req.query.scope : 'global';
    const me = req.user;
    const meId = String(me._id);

    const rows = await ranking({ period, scope, me });
    const myIndex = rows.findIndex((r) => String(r.userId) === meId);
    const top = rows.slice(0, BOARD_SIZE);
    // The student's own row with a neighbour either side, when off the board.
    const around = myIndex >= BOARD_SIZE ? rows.slice(Math.max(BOARD_SIZE, myIndex - 1), myIndex + 2) : [];

    const userIds = [...top, ...around].map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name profilePicture institution className').lean();
    const userBy = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const shape = (row, index) => {
      const u = userBy[String(row.userId)];
      return {
        rank: index + 1,
        userId: row.userId,
        name: u?.name || 'Student',
        profilePicture: u?.profilePicture || '',
        stars: row.stars,
        cleared: row.cleared,
        games: row.games,
        isMe: String(row.userId) === meId
      };
    };

    res.json({
      period,
      scope,
      periodKey: periodWindow(period).key,
      total: rows.length,
      entries: top.map(shape),
      around: around.map((r) => shape(r, rows.indexOf(r))),
      me:
        myIndex >= 0
          ? shape(rows[myIndex], myIndex)
          : { rank: null, userId: me._id, name: me.name, profilePicture: me.profilePicture || '', stars: 0, cleared: 0, games: 0, isMe: true },
      // So the client can say why a cohort board is empty.
      cohort: { institution: me.institution || '', className: me.className || '' }
    });
  } catch (error) {
    fail(res, error, 'load the games leaderboard');
  }
};

module.exports = { getProgress, saveProgress, getLeaderboard, PERIODS, SCOPES };
