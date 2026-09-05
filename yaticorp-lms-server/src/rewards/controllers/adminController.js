/**
 * Administration of the rewards system, inside the existing admin panel.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const { RewardBadge, RewardUserBadge, Wallet, WalletTransaction, RewardTransaction, WithdrawalRequest, XpTransaction, LearningActivity, Streak, RewardJobRun } = require('../models');
const S = require('../services');
const { ACCOUNT_TYPES } = require('../config/constants');

const err = (res, error) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error', code: error.code, error: error.status ? undefined : error.message });
const page = (req, max = 200) => ({ limit: Math.min(max, Math.max(1, Number(req.query.limit) || 50)), skip: Math.max(0, Number(req.query.skip) || 0) });
const oid = (v) => mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null;

// ── Overview ────────────────────────────────────────────────────────────────
// @route GET /api/rewards/admin/overview
const getOverview = async (req, res) => {
  try {
    const [wallets, pendingWithdrawals, pendingAmount, pointsIssued, activeStreaks, badgesUnlocked, xpWeek, recentActivity] = await Promise.all([
      Wallet.aggregate([{ $group: { _id: null, available: { $sum: '$available' }, pending: { $sum: '$pending' }, points: { $sum: '$rewardPoints' }, withdrawn: { $sum: '$totalWithdrawn' }, count: { $sum: 1 } } }]),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
      WithdrawalRequest.aggregate([{ $match: { status: { $in: ['pending', 'approved'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      RewardTransaction.aggregate([{ $match: { points: { $gt: 0 } } }, { $group: { _id: '$source', points: { $sum: '$points' }, n: { $sum: 1 } } }]),
      Streak.countDocuments({ current: { $gte: 2 } }),
      RewardUserBadge.countDocuments({}),
      XpTransaction.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } }, { $group: { _id: null, xp: { $sum: '$amount' }, n: { $sum: 1 } } }]),
      LearningActivity.aggregate([{ $match: { createdAt: { $gte: new Date(Date.now() - 14 * 86400000) } } }, { $group: { _id: '$day', n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    ]);
    res.json({
      wallets: wallets[0] || { available: 0, pending: 0, points: 0, withdrawn: 0, count: 0 },
      pendingWithdrawals, pendingWithdrawalAmount: pendingAmount[0]?.total || 0,
      pointsIssuedBySource: pointsIssued, activeStreaks, badgesUnlocked,
      xpLast7Days: xpWeek[0] || { xp: 0, n: 0 }, activityByDay: recentActivity
    });
  } catch (error) { err(res, error); }
};

// ── Rules ───────────────────────────────────────────────────────────────────
// @route GET /api/rewards/admin/config
const getConfig = async (req, res) => {
  try { res.json({ ...(await S.config.getConfig()), accountTypes: ACCOUNT_TYPES }); } catch (error) { err(res, error); }
};
// @route PUT /api/rewards/admin/config
const updateConfig = async (req, res) => {
  try { res.json({ ...(await S.config.updateConfig(req.body || {})), accountTypes: ACCOUNT_TYPES }); } catch (error) { err(res, error); }
};

// ── Badges ──────────────────────────────────────────────────────────────────
// @route GET /api/rewards/admin/badges
const listBadges = async (req, res) => {
  try {
    await S.config.seedBadges();
    const [badges, counts] = await Promise.all([
      RewardBadge.find({}).sort({ order: 1 }).lean(),
      RewardUserBadge.aggregate([{ $group: { _id: '$badgeKey', n: { $sum: 1 } } }])
    ]);
    const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({ badges: badges.map((b) => ({ ...b, unlockedCount: by[b.key] || 0 })), metrics: RewardBadge.METRICS });
  } catch (error) { err(res, error); }
};
const badgeBody = (b) => ({
  title: String(b.title || '').trim(), description: String(b.description || '').trim(), emoji: String(b.emoji || '🎖️').slice(0, 8),
  metric: b.metric, target: Math.round(Number(b.target)), rewardPoints: Math.max(0, Math.round(Number(b.rewardPoints) || 0)),
  order: Number.isFinite(Number(b.order)) ? Number(b.order) : 100, isActive: b.isActive !== false
});
// @route POST /api/rewards/admin/badges
const createBadge = async (req, res) => {
  try {
    const body = badgeBody(req.body);
    const key = String(req.body.key || '').trim().toLowerCase();
    if (!key || !body.title || !body.metric || !(body.target >= 1)) return res.status(400).json({ message: 'key, title, metric and a target ≥ 1 are required' });
    const badge = await RewardBadge.create({ key, ...body });
    res.status(201).json(badge);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A badge with that key already exists' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    err(res, error);
  }
};
// @route PUT /api/rewards/admin/badges/:id
const updateBadge = async (req, res) => {
  try {
    const body = badgeBody({ ...req.body });
    if (!body.title || !body.metric || !(body.target >= 1)) return res.status(400).json({ message: 'title, metric and a target ≥ 1 are required' });
    const badge = await RewardBadge.findByIdAndUpdate(req.params.id, { $set: body }, { returnDocument: 'after', runValidators: true });
    if (!badge) return res.status(404).json({ message: 'Badge not found' });
    res.json(badge);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    err(res, error);
  }
};
// @route DELETE /api/rewards/admin/badges/:id  — deactivates; unlocked history is kept
const deleteBadge = async (req, res) => {
  try {
    const badge = await RewardBadge.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { returnDocument: 'after' });
    if (!badge) return res.status(404).json({ message: 'Badge not found' });
    res.json(badge);
  } catch (error) { err(res, error); }
};

// ── Wallets & transactions ──────────────────────────────────────────────────
// @route GET /api/rewards/admin/wallets?q=
const listWallets = async (req, res) => {
  try {
    const { limit, skip } = page(req);
    let userFilter = null;
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      userFilter = await User.find({ $or: [{ name: rx }, { email: rx }, { cardNumber: rx }] }).distinct('_id');
    }
    const q = userFilter ? { userId: { $in: userFilter } } : {};
    const [wallets, total] = await Promise.all([
      Wallet.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email cardNumber accountType walletAccess xp level').lean(),
      Wallet.countDocuments(q)
    ]);
    res.json({ rows: wallets.map((w) => ({ ...w, earnedBySource: w.earnedBySource || {} })), total, limit, skip });
  } catch (error) { err(res, error); }
};
// @route GET /api/rewards/admin/transactions?userId=&source=&status=&type=
const listTransactions = async (req, res) => {
  try {
    const { limit, skip } = page(req);
    const q = {};
    if (req.query.userId && oid(req.query.userId)) q.userId = oid(req.query.userId);
    for (const k of ['source', 'status', 'type']) if (req.query[k]) q[k] = req.query[k];
    const [rows, total] = await Promise.all([
      WalletTransaction.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email cardNumber').lean(),
      WalletTransaction.countDocuments(q)
    ]);
    res.json({ rows, total, limit, skip, sources: WalletTransaction.SOURCES, statuses: WalletTransaction.STATUSES });
  } catch (error) { err(res, error); }
};

// ── Withdrawals ─────────────────────────────────────────────────────────────
// @route GET /api/rewards/admin/withdrawals?status=
const listWithdrawals = async (req, res) => {
  try {
    const { limit, skip } = page(req);
    const q = req.query.status ? { status: req.query.status } : {};
    const [rows, total] = await Promise.all([
      WithdrawalRequest.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email cardNumber phone accountType').populate('processedBy', 'name').lean(),
      WithdrawalRequest.countDocuments(q)
    ]);
    res.json({ rows, total, limit, skip });
  } catch (error) { err(res, error); }
};
// @route PUT /api/rewards/admin/withdrawals/:id { decision, note, payoutReference }
const decideWithdrawal = async (req, res) => {
  try {
    const request = await S.wallet.decideWithdrawal({ requestId: req.params.id, decision: req.body.decision, adminId: req.admin._id, note: String(req.body.note || ''), payoutReference: String(req.body.payoutReference || '') });
    res.json(request);
  } catch (error) { err(res, error); }
};

// ── Per-user history & adjustments ──────────────────────────────────────────
// @route GET /api/rewards/admin/users/:id
const getUserHistory = async (req, res) => {
  try {
    const userId = oid(req.params.id);
    if (!userId) return res.status(400).json({ message: 'That id is not valid.' });
    const config = await S.config.getConfig();
    const [user, wallet, streak, badges, xp, points, money, withdrawals, activity] = await Promise.all([
      User.findById(userId).select('name email cardNumber accountType walletAccess institution className xp level status').lean(),
      Wallet.findOne({ userId }).lean(),
      Streak.findOne({ userId }).lean(),
      RewardUserBadge.find({ userId }).sort({ unlockedAt: -1 }).lean(),
      XpTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
      RewardTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
      WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
      WithdrawalRequest.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      LearningActivity.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
    ]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user, monetaryEnabled: S.eligibility.monetaryEnabledFor(user, config), level: S.config.levelInfo(user.xp || 0, config.levelThresholds),
      wallet: wallet ? { ...wallet, earnedBySource: wallet.earnedBySource || {} } : null, streak, badges, xp, points, money, withdrawals, activity,
      audit: await S.wallet.auditWallet(userId)
    });
  } catch (error) { err(res, error); }
};

// @route POST /api/rewards/admin/users/:id/adjust
// { kind: 'points'|'money'|'xp', amount, reason, source? }
// Money and points arrive as signed numbers; a negative money adjustment is a
// debit that fails rather than overdrawing. Every one leaves a ledger row.
const adjustUser = async (req, res) => {
  try {
    const userId = oid(req.params.id);
    if (!userId) return res.status(400).json({ message: 'That id is not valid.' });
    const user = await User.findById(userId).select('name').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { kind } = req.body;
    const amount = Number(req.body.amount);
    const reason = String(req.body.reason || '').trim();
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: 'Enter a non-zero amount' });
    if (!reason) return res.status(400).json({ message: 'A reason is required; it appears on the student\'s statement' });
    const by = `admin:${req.admin._id}`;
    const ref = `admin:${req.admin._id}:${Date.now()}`;

    if (kind === 'points') {
      const source = ['admin', 'campaign', 'referral'].includes(req.body.source) ? req.body.source : 'admin';
      if (amount < 0) {
        // Points removal — only what the student actually has.
        const w = await Wallet.findOneAndUpdate({ userId, rewardPoints: { $gte: -amount } }, { $inc: { rewardPoints: amount } }, { returnDocument: 'after' });
        if (!w) return res.status(400).json({ message: 'The student does not have that many points' });
        await RewardTransaction.create({ userId, points: Math.round(amount), source: 'reversal', claimKey: ref, description: reason, balanceAfter: w.rewardPoints, meta: { by } });
        return res.json({ ok: true, rewardPoints: w.rewardPoints });
      }
      const result = await S.points.awardPoints({ userId, points: amount, source, claimKey: ref, description: reason, meta: { by } });
      await S.notify.celebrate(userId, 'reward_points', `+${Math.round(amount)} reward points`, reason, { rewardPoints: Math.round(amount) });
      return res.json({ ok: true, rewardPoints: result?.balance });
    }
    if (kind === 'money') {
      const source = ['admin_adjustment', 'job_earning', 'referral_reward', 'learning_reward', 'leaderboard_reward', 'purchase'].includes(req.body.source) ? req.body.source : 'admin_adjustment';
      const result = amount > 0
        ? await S.wallet.credit({ userId, amount, source, referenceKey: ref, description: reason, createdBy: by })
        : await S.wallet.debit({ userId, amount: -amount, source: source === 'admin_adjustment' ? 'admin_adjustment' : 'purchase', referenceKey: ref, description: reason, createdBy: by });
      if (amount > 0) await S.notify.celebrate(userId, 'wallet', `${result.wallet.currency} ${amount} added to your wallet`, reason, { amount, source });
      await S.notify.notify(userId, amount > 0 ? 'Wallet credited' : 'Wallet debited', `${result.wallet.currency} ${Math.abs(amount)} — ${reason}`);
      return res.json({ ok: true, wallet: result.wallet });
    }
    if (kind === 'xp') {
      if (amount < 0) return res.status(400).json({ message: 'XP cannot be removed; adjust with a positive amount only' });
      const result = await S.xp.addXp({ userId, amount, source: 'admin', description: reason });
      return res.json({ ok: true, xp: result.xp, level: result.level });
    }
    res.status(400).json({ message: 'kind must be points, money or xp' });
  } catch (error) { err(res, error); }
};

// ── Fraud / integrity checks ────────────────────────────────────────────────
// @route GET /api/rewards/admin/audit
const runAudit = async (req, res) => {
  try {
    const [dupActivity, dupClaims, dupRefs, wallets] = await Promise.all([
      LearningActivity.aggregate([{ $group: { _id: { u: '$userId', t: '$type', r: '$refId' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 50 }]),
      RewardTransaction.aggregate([{ $group: { _id: { u: '$userId', k: '$claimKey' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 50 }]),
      WalletTransaction.aggregate([{ $match: { referenceKey: { $type: 'string' } } }, { $group: { _id: { u: '$userId', k: '$referenceKey' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 50 }]),
      Wallet.find({}).select('userId').limit(500).lean()
    ]);
    const audits = [];
    for (const w of wallets) {
      const a = await S.wallet.auditWallet(w.userId);
      if (!a.ok) audits.push(a);
    }
    const recentJobs = await RewardJobRun.find({}).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ duplicateActivities: dupActivity, duplicateClaims: dupClaims, duplicateReferences: dupRefs, walletMismatches: audits, walletsChecked: wallets.length, recentJobs, ok: !dupActivity.length && !dupClaims.length && !dupRefs.length && !audits.length });
  } catch (error) { err(res, error); }
};

// @route POST /api/rewards/admin/jobs/run  — run the scheduled payouts now
const runJobsNow = async (req, res) => {
  try { await S.jobs.runScheduled(); res.json({ ok: true }); } catch (error) { err(res, error); }
};

module.exports = { getOverview, getConfig, updateConfig, listBadges, createBadge, updateBadge, deleteBadge, listWallets, listTransactions, listWithdrawals, decideWithdrawal, getUserHistory, adjustUser, runAudit, runJobsNow };
