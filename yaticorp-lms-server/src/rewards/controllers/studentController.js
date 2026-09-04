/**
 * The student's view of the rewards system. Everything here is read-only
 * except redeem, withdraw and "I've seen these events" — and those never
 * accept an amount the server does not recompute.
 */
const User = require('../../models/User');
const { Wallet, WalletTransaction, RewardTransaction, WithdrawalRequest, RewardEvent, RewardUserBadge, LearningActivity, XpTransaction } = require('../models');
const { periodWindow, dayKey, addDays } = require('../config/constants');
const S = require('../services');
const { TIMEZONE, startOfDay } = require('../config/constants');
// Midnight, `offset` days ago, in the platform timezone.
const startOfDayOffset = (offset) => startOfDay(addDays(dayKey(), offset));

const err = (res, error) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error', code: error.code, error: error.status ? undefined : error.message });
const page = (req, max = 100) => ({ limit: Math.min(max, Math.max(1, Number(req.query.limit) || 20)), skip: Math.max(0, Number(req.query.skip) || 0) });

// Public bits of the rulebook the UI needs to explain itself.
const publicConfig = (c) => ({
  enabled: c.enabled, xpRules: c.xpRules, levelThresholds: c.levelThresholds, streakMilestones: c.streakMilestones,
  leaderboardRewards: c.leaderboardRewards, conversion: c.conversion, limits: c.limits
});

// @desc  Everything the profile cards need in one call
// @route GET /api/rewards/summary
const getSummary = async (req, res) => {
  try {
    const config = await S.config.getConfig();
    const userId = req.user._id;
    const week = periodWindow('weekly');
    const [user, wallet, streak, rank, badgeCount, badges, activity, weekActivity, xpWeek, dailyActivity, dailyXp] = await Promise.all([
      User.findById(userId).select('xp level accountType walletAccess institution className').lean(),
      S.points.getOrCreateWallet(userId),
      S.streak.summary(userId, config),
      S.leaderboard.myRank(req.user, 'weekly'),
      RewardUserBadge.countDocuments({ userId }),
      S.badges.listForUser(userId),
      LearningActivity.aggregate([{ $match: { userId } }, { $group: { _id: '$type', n: { $sum: 1 }, score: { $avg: '$meta.score' } } }]),
      LearningActivity.aggregate([{ $match: { userId, createdAt: { $gte: week.start } } }, { $group: { _id: '$type', n: { $sum: 1 } } }]),
      XpTransaction.aggregate([{ $match: { userId, createdAt: { $gte: week.start } } }, { $group: { _id: null, xp: { $sum: '$amount' } } }]),
      // The last seven days, day by day, for the little trend charts on the
      // progress tiles. Days are the platform's, not the server's.
      LearningActivity.aggregate([{ $match: { userId, day: { $gte: addDays(dayKey(), -6) } } }, { $group: { _id: { day: '$day', type: '$type' }, n: { $sum: 1 } } }]),
      XpTransaction.aggregate([{ $match: { userId, createdAt: { $gte: startOfDayOffset(-6) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } }, xp: { $sum: '$amount' } } }])
    ]);
    const days = Array.from({ length: 7 }, (_, i) => addDays(dayKey(), i - 6));
    const daily = { lessons: days.map(() => 0), quizzes: days.map(() => 0), courses: days.map(() => 0), xp: days.map(() => 0), streak: days.map((d) => (streak.calendar || []).some((c) => c.day === d && c.active) ? 1 : 0) };
    for (const row of dailyActivity) {
      const i = days.indexOf(row._id.day); if (i < 0) continue;
      if (row._id.type === 'lesson_complete') daily.lessons[i] += row.n;
      if (row._id.type === 'quiz_pass') daily.quizzes[i] += row.n;
      if (row._id.type === 'course_complete') daily.courses[i] += row.n;
    }
    for (const row of dailyXp) { const i = days.indexOf(row._id); if (i >= 0) daily.xp[i] += row.xp; }
    const by = Object.fromEntries(activity.map((a) => [a._id, a]));
    const byWeek = Object.fromEntries(weekActivity.map((a) => [a._id, a.n]));
    const stats = {
      lessons: { total: by.lesson_complete?.n || 0, thisWeek: byWeek.lesson_complete || 0 },
      quizzes: { passed: by.quiz_pass?.n || 0, completed: by.quiz_complete?.n || 0, avgScore: by.quiz_complete?.score != null ? Math.round(by.quiz_complete.score) : null, thisWeek: byWeek.quiz_pass || 0 },
      courses: { completed: by.course_complete?.n || 0, thisWeek: byWeek.course_complete || 0 },
      xpThisWeek: xpWeek[0]?.xp || 0
    };
    const monetary = S.eligibility.monetaryEnabledFor(user, config);
    res.json({
      xp: user.xp || 0,
      level: S.config.levelInfo(user.xp || 0, config.levelThresholds),
      streak,
      rank,
      badges: { unlocked: badgeCount, total: badges.length, recent: badges.filter((b) => b.unlocked).sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 4) },
      stats,
      series: { days, ...daily },
      wallet: { available: wallet.available, pending: wallet.pending, totalEarned: wallet.totalEarned, totalSpent: wallet.totalSpent, totalWithdrawn: wallet.totalWithdrawn, currency: wallet.currency, rewardPoints: wallet.rewardPoints, rewardPointsValue: S.eligibility.pointsToMoney(wallet.rewardPoints, config), monetaryEnabled: monetary },
      config: publicConfig(config)
    });
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/streak
const getStreak = async (req, res) => {
  try { res.json(await S.streak.summary(req.user._id, await S.config.getConfig())); } catch (error) { err(res, error); }
};

// @route GET /api/rewards/badges
const getBadges = async (req, res) => {
  try { res.json(await S.badges.listForUser(req.user._id)); } catch (error) { err(res, error); }
};

// @route GET /api/rewards/leaderboard?period=weekly&scope=global&courseId=
const getLeaderboard = async (req, res) => {
  try {
    const board = await S.leaderboard.getBoard({ period: req.query.period, scope: req.query.scope, courseId: req.query.courseId || null, me: req.user, limit: 10 });
    res.json(board);
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/xp/history
const getXpHistory = async (req, res) => {
  try {
    const { XpTransaction } = require('../models');
    const { limit, skip } = page(req);
    const rows = await XpTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json(rows);
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/wallet
const getWallet = async (req, res) => {
  try {
    const config = await S.config.getConfig();
    const userId = req.user._id;
    const [wallet, user, recent, open, usedThisMonth] = await Promise.all([
      S.points.getOrCreateWallet(userId),
      User.findById(userId).select('accountType walletAccess').lean(),
      WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      WithdrawalRequest.findOne({ userId, status: { $in: ['pending', 'approved'] } }).lean(),
      S.wallet.redeemedThisMonth(userId)
    ]);
    const monetaryEnabled = S.eligibility.monetaryEnabledFor(user, config);
    res.json({
      wallet: { ...wallet.toObject(), earnedBySource: Object.fromEntries(wallet.earnedBySource || new Map()) },
      rewardPointsValue: S.eligibility.pointsToMoney(wallet.rewardPoints, config),
      monetaryEnabled,
      accountType: user.accountType || 'school_student',
      conversion: config.conversion,
      limits: { ...config.limits, monthlyCashUsed: usedThisMonth, monthlyCashLeft: config.limits.monthlyCashCap > 0 ? Math.max(0, config.limits.monthlyCashCap - usedThisMonth) : null },
      openWithdrawal: open,
      recent
    });
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/wallet/transactions?source=&status=&type=
const getWalletTransactions = async (req, res) => {
  try {
    const { limit, skip } = page(req);
    const q = { userId: req.user._id };
    if (req.query.source) q.source = req.query.source;
    if (req.query.status) q.status = req.query.status;
    if (req.query.type) q.type = req.query.type;
    const [rows, total] = await Promise.all([
      WalletTransaction.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WalletTransaction.countDocuments(q)
    ]);
    res.json({ rows, total, limit, skip });
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/wallet/rewards  (the reward-point ledger)
const getRewardLedger = async (req, res) => {
  try {
    const { limit, skip } = page(req);
    const q = { userId: req.user._id };
    const [rows, total] = await Promise.all([
      RewardTransaction.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RewardTransaction.countDocuments(q)
    ]);
    res.json({ rows, total, limit, skip });
  } catch (error) { err(res, error); }
};

// @route POST /api/rewards/wallet/redeem { points }
const redeem = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('accountType walletAccess name').lean();
    const result = await S.wallet.redeemPoints({ user: { ...user, _id: req.user._id }, points: req.body.points });
    res.json({ value: result.value, points: result.points, wallet: result.wallet, transactions: result.txns });
  } catch (error) { err(res, error); }
};

// @route POST /api/rewards/wallet/withdraw { amount, method }
const withdraw = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('accountType walletAccess name').lean();
    const result = await S.wallet.requestWithdrawal({ user: { ...user, _id: req.user._id }, amount: req.body.amount, method: req.body.method });
    res.status(201).json(result);
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/wallet/withdrawals
const getWithdrawals = async (req, res) => {
  try { res.json(await WithdrawalRequest.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean()); } catch (error) { err(res, error); }
};

// @route GET /api/rewards/events/unseen
const getUnseenEvents = async (req, res) => {
  try { res.json(await RewardEvent.find({ userId: req.user._id, seenAt: null }).sort({ createdAt: 1 }).limit(10).lean()); } catch (error) { err(res, error); }
};

// @route POST /api/rewards/events/seen { ids: [] }
const markEventsSeen = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const q = { userId: req.user._id, seenAt: null };
    if (ids.length) q._id = { $in: ids };
    const r = await RewardEvent.updateMany(q, { $set: { seenAt: new Date() } });
    res.json({ marked: r.modifiedCount });
  } catch (error) { err(res, error); }
};

// @route GET /api/rewards/config
const getPublicConfig = async (req, res) => {
  try { res.json(publicConfig(await S.config.getConfig())); } catch (error) { err(res, error); }
};

module.exports = { getSummary, getStreak, getBadges, getLeaderboard, getXpHistory, getWallet, getWalletTransactions, getRewardLedger, redeem, withdraw, getWithdrawals, getUnseenEvents, markEventsSeen, getPublicConfig };
