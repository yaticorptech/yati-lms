/**
 * Rankings by XP earned in a window (daily/weekly/monthly) or all time,
 * within a scope (everyone, the student's institution or class, or one
 * course). Always answers with the student's own position, even when they are
 * nowhere near the top.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const { XpTransaction, Streak, RewardUserBadge, RewardBadge, LeaderboardSnapshot } = require('../models');
const { periodWindow } = require('../config/constants');

const PERIODS = ['daily', 'weekly', 'monthly', 'all'];
const SCOPES = ['global', 'institution', 'class', 'course'];

// The set of user ids a scope covers, or null for "everyone".
const scopeUserIds = async (scope, me) => {
  if (scope === 'institution') {
    if (!me?.institution) return [];
    return User.find({ institution: me.institution, status: 'active' }).distinct('_id');
  }
  if (scope === 'class') {
    if (!me?.institution || !me?.className) return [];
    return User.find({ institution: me.institution, className: me.className, status: 'active' }).distinct('_id');
  }
  return null;
};

/**
 * Every ranked user for a window, sorted. Returns [{userId, xp}] — the whole
 * list, so the caller can find any position. Fine at LMS scale; a paged
 * variant would replace this if the student count grows past tens of thousands.
 */
const ranking = async ({ period, scope = 'global', courseId = null, me = null }) => {
  const ids = await scopeUserIds(scope, me);
  if (ids && ids.length === 0) return [];

  if (period === 'all' && scope !== 'course') {
    const q = { status: 'active', xp: { $gt: 0 } };
    if (ids) q._id = { $in: ids };
    const users = await User.find(q).select('_id xp').sort({ xp: -1, _id: 1 }).lean();
    return users.map((u) => ({ userId: u._id, xp: u.xp }));
  }

  const { start, end } = periodWindow(period);
  const match = { amount: { $gt: 0 } };
  if (start) match.createdAt = { $gte: start, $lt: end };
  if (scope === 'course' && courseId) match.courseId = String(courseId);
  if (ids) match.userId = { $in: ids };
  const rows = await XpTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$userId', xp: { $sum: '$amount' } } },
    { $sort: { xp: -1, _id: 1 } }
  ]);
  return rows.map((r) => ({ userId: r._id, xp: r.xp }));
};

const latestSnapshot = (period, periodKey, scope) =>
  LeaderboardSnapshot.findOne({ period, periodKey, scope }).sort({ takenAt: -1 }).lean();

/**
 * The board as the student sees it.
 */
const getBoard = async ({ period = 'weekly', scope = 'global', courseId = null, me, limit = 10 }) => {
  if (!PERIODS.includes(period)) period = 'weekly';
  if (!SCOPES.includes(scope)) scope = 'global';
  const rows = await ranking({ period, scope, courseId, me });
  const meId = String(me._id);
  const myIndex = rows.findIndex((r) => String(r.userId) === meId);
  const top = rows.slice(0, limit);
  const shownIds = new Set(top.map((r) => String(r.userId)));
  // The student's own row, plus a neighbour either side, when outside the top.
  const around = myIndex >= limit ? rows.slice(Math.max(limit, myIndex - 1), myIndex + 2) : [];
  const wanted = [...top, ...around];
  const userIds = wanted.map((r) => r.userId);

  const [users, streaks, badges, catalogue, snapshot] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('name profilePicture level xp institution className').lean(),
    Streak.find({ userId: { $in: userIds } }).select('userId current lastActivityDay').lean(),
    RewardUserBadge.aggregate([{ $match: { userId: { $in: userIds } } }, { $sort: { unlockedAt: -1 } }, { $group: { _id: '$userId', badgeKey: { $first: '$badgeKey' }, count: { $sum: 1 } } }]),
    RewardBadge.find({}).select('key title emoji').lean(),
    scope === 'global' ? latestSnapshot(period, periodWindow(period).key, 'global') : null
  ]);
  const userBy = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const streakBy = Object.fromEntries(streaks.map((s) => [String(s.userId), s.current]));
  const badgeBy = Object.fromEntries(badges.map((b) => [String(b._id), b]));
  const badgeMeta = Object.fromEntries(catalogue.map((b) => [b.key, b]));
  const prevRank = snapshot ? Object.fromEntries(snapshot.ranks.map((r) => [String(r.userId), r.rank])) : {};

  const shape = (r, index) => {
    const u = userBy[String(r.userId)];
    const b = badgeBy[String(r.userId)];
    const rank = index + 1;
    const prev = prevRank[String(r.userId)];
    return {
      rank, userId: r.userId, name: u?.name || 'Student', profilePicture: u?.profilePicture || '',
      level: u?.level || 1, xp: r.xp, totalXp: u?.xp || 0, streak: streakBy[String(r.userId)] || 0,
      badge: b ? { key: b.badgeKey, emoji: badgeMeta[b.badgeKey]?.emoji || '🎖️', title: badgeMeta[b.badgeKey]?.title || '', count: b.count } : null,
      movement: prev ? prev - rank : null, // + moved up, - moved down
      isMe: String(r.userId) === meId
    };
  };

  return {
    period, scope, courseId, periodKey: periodWindow(period).key, total: rows.length,
    entries: top.map((r, i) => shape(r, i)),
    around: around.map((r) => shape(r, rows.indexOf(r))),
    me: myIndex >= 0 ? shape(rows[myIndex], myIndex) : { rank: null, xp: 0, isMe: true, name: me.name, level: me.level || 1, streak: streakBy[meId] || 0, movement: null },
    snapshotAt: snapshot?.takenAt || null
  };
};

const myRank = async (me, period = 'weekly') => {
  const rows = await ranking({ period, scope: 'global', me });
  const i = rows.findIndex((r) => String(r.userId) === String(me._id));
  return { rank: i >= 0 ? i + 1 : null, xp: i >= 0 ? rows[i].xp : 0, total: rows.length, period, periodKey: periodWindow(period).key };
};

// Freeze the global standings so the next page load can draw ↑ / ↓.
const takeSnapshot = async (period) => {
  const rows = await ranking({ period, scope: 'global' });
  const { key } = periodWindow(period);
  await LeaderboardSnapshot.create({ period, periodKey: key, scope: 'global', ranks: rows.slice(0, 500).map((r, i) => ({ userId: r.userId, rank: i + 1, xp: r.xp })) });
  return rows.length;
};

module.exports = { getBoard, myRank, ranking, takeSnapshot, PERIODS, SCOPES };
