/**
 * Money. Every balance change here creates a WalletTransaction in the same
 * database transaction as the $inc that moves the number, and every entry
 * carries the source it came from, so "learning ₹50 / leaderboard ₹100 /
 * jobs ₹300" is a fact and not an estimate.
 */
const { Wallet, WalletTransaction, RewardTransaction, WithdrawalRequest } = require('../models');
const User = require('../../models/User');
const { runInTransaction, isDuplicate } = require('./tx');
const { getConfig } = require('./configService');
const { monetaryEnabledFor, pointsToMoney } = require('./eligibility');
const { getOrCreateWallet } = require('./rewardPointsService');
const { notify, celebrate } = require('./notify');
const { periodWindow } = require('../config/constants');

const fail = (message, status = 400, code = 'WALLET_ERROR') => { const e = new Error(message); e.status = status; e.code = code; return e; };
const money = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Add money. `referenceKey` makes the credit idempotent per user.
 * Returns { duplicate: true } when that key has already been credited.
 */
const credit = async ({ userId, amount, source, referenceKey = null, description = '', meta = {}, createdBy = 'system', status = 'completed' }) => {
  amount = money(amount);
  if (!(amount > 0)) throw fail('Amount must be greater than zero');
  try {
    return await runInTransaction(async (session) => {
      const [txn] = await WalletTransaction.create([{ userId, type: 'credit', amount, source, referenceKey, description, meta, createdBy, status }], { session });
      await getOrCreateWallet(userId, session);
      const inc = status === 'completed'
        ? { available: amount, totalEarned: amount, [`earnedBySource.${source}`]: amount }
        : { pending: amount };
      const wallet = await Wallet.findOneAndUpdate({ userId }, { $inc: inc }, { returnDocument: 'after', session });
      await WalletTransaction.updateOne({ _id: txn._id }, { $set: { balanceAfter: wallet.available } }, { session });
      return { txn, wallet, duplicate: false };
    });
  } catch (err) {
    if (isDuplicate(err)) return { duplicate: true };
    throw err;
  }
};

/**
 * Take money out of `available`. Refuses rather than overdrawing: the update
 * is conditional on the balance, so two spends racing for the last rupee
 * cannot both succeed.
 */
const debit = async ({ userId, amount, source, referenceKey = null, description = '', meta = {}, createdBy = 'system', hold = false }) => {
  amount = money(amount);
  if (!(amount > 0)) throw fail('Amount must be greater than zero');
  try {
    return await runInTransaction(async (session) => {
      await getOrCreateWallet(userId, session);
      const inc = hold ? { available: -amount, pending: amount } : { available: -amount, totalSpent: amount };
      const wallet = await Wallet.findOneAndUpdate({ userId, available: { $gte: amount } }, { $inc: inc }, { returnDocument: 'after', session });
      if (!wallet) throw fail('Insufficient wallet balance', 400, 'INSUFFICIENT_FUNDS');
      const [txn] = await WalletTransaction.create([{ userId, type: 'debit', amount, source, referenceKey, description, meta, createdBy, status: hold ? 'pending' : 'completed', balanceAfter: wallet.available }], { session });
      return { txn, wallet, duplicate: false };
    });
  } catch (err) {
    if (isDuplicate(err)) return { duplicate: true };
    throw err;
  }
};

// Which wallet source a reward-point source becomes when it is cashed out.
const WALLET_SOURCE_FOR = {
  streak_milestone: 'learning_reward',
  badge: 'learning_reward',
  campaign: 'learning_reward',
  admin: 'learning_reward',
  leaderboard: 'leaderboard_reward',
  referral: 'referral_reward'
};

// ₹ already cashed out of reward points this month, against the monthly cap.
const redeemedThisMonth = async (userId) => {
  const { start, end } = periodWindow('monthly');
  const rows = await WalletTransaction.aggregate([
    { $match: { userId, type: 'credit', status: 'completed', source: { $in: ['learning_reward', 'leaderboard_reward', 'referral_reward'] }, createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return rows[0]?.total || 0;
};

/**
 * Turn reward points into wallet money.
 *
 * Points are consumed oldest-first, and the money is booked per source of the
 * points consumed, so a redemption of 300 points that were 200 from a streak
 * and 100 from a leaderboard week produces two wallet credits, not one.
 */
const redeemPoints = async ({ user, points }) => {
  const config = await getConfig();
  if (!config.enabled) throw fail('Rewards are currently unavailable', 403, 'REWARDS_LOCKED');
  if (!monetaryEnabledFor(user, config)) throw fail('Your account type can use reward points for learning rewards, but not cash. Ask an administrator if you think this is wrong.', 403, 'NOT_ELIGIBLE');
  points = Math.round(Number(points) || 0);
  const { pointsPerUnit, minRedeemPoints, unitValue } = config.conversion;
  if (!(unitValue > 0)) throw fail('Redemption is not available right now', 400, 'CONVERSION_OFF');
  if (points < Math.max(minRedeemPoints, pointsPerUnit)) throw fail(`Minimum redemption is ${Math.max(minRedeemPoints, pointsPerUnit)} points`);
  if (points % pointsPerUnit !== 0) throw fail(`Points must be a multiple of ${pointsPerUnit}`);
  const value = pointsToMoney(points, config);
  const cap = config.limits.monthlyCashCap;
  if (cap > 0) {
    const used = await redeemedThisMonth(user._id);
    if (used + value > cap + 1e-9) throw fail(`Monthly cash reward limit is ${config.conversion.currency} ${cap}. You have ${config.conversion.currency} ${money(cap - used)} left this month.`, 400, 'MONTHLY_CAP');
  }

  const userId = user._id;
  return runInTransaction(async (session) => {
    // 1. Take the points, conditionally on having them.
    const wallet = await Wallet.findOneAndUpdate(
      { userId, rewardPoints: { $gte: points } },
      { $inc: { rewardPoints: -points, rewardPointsRedeemed: points } },
      { returnDocument: 'after', session }
    );
    if (!wallet) throw fail('Not enough reward points', 400, 'INSUFFICIENT_POINTS');
    const [redeemRow] = await RewardTransaction.create([{ userId, points: -points, source: 'redeem', claimKey: `redeem:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, description: `Redeemed ${points} points for ${config.conversion.currency} ${value}`, balanceAfter: wallet.rewardPoints }], { session });

    // 2. Consume earned points oldest-first, grouped by where they came from.
    let remaining = points;
    const bySource = {};
    const earned = await RewardTransaction.find({ userId, points: { $gt: 0 }, status: 'completed' }).sort({ createdAt: 1 }).session(session);
    for (const row of earned) {
      if (remaining <= 0) break;
      const free = row.points - (row.redeemedPoints || 0);
      if (free <= 0) continue;
      const take = Math.min(free, remaining);
      row.redeemedPoints = (row.redeemedPoints || 0) + take;
      await row.save({ session });
      const ws = WALLET_SOURCE_FOR[row.source] || 'learning_reward';
      bySource[ws] = (bySource[ws] || 0) + take;
      remaining -= take;
    }
    if (remaining > 0) bySource.learning_reward = (bySource.learning_reward || 0) + remaining; // points with no traceable origin

    // 3. One wallet credit per source. Rounding is settled on the last one so
    //    the credits add up to exactly the value promised.
    const entries = Object.entries(bySource);
    let booked = 0;
    const txns = [];
    for (let i = 0; i < entries.length; i++) {
      const [source, pts] = entries[i];
      const amount = i === entries.length - 1 ? money(value - booked) : pointsToMoney(pts, config);
      booked = money(booked + amount);
      if (!(amount > 0)) continue;
      const [txn] = await WalletTransaction.create([{ userId, type: 'credit', amount, source, referenceKey: `redeem:${redeemRow._id}:${source}`, description: `${pts} reward points redeemed`, createdBy: 'user', meta: { points: pts, redeemId: redeemRow._id } }], { session });
      const w = await Wallet.findOneAndUpdate({ userId }, { $inc: { available: amount, totalEarned: amount, [`earnedBySource.${source}`]: amount } }, { returnDocument: 'after', session });
      await WalletTransaction.updateOne({ _id: txn._id }, { $set: { balanceAfter: w.available } }, { session });
      txns.push(txn);
    }
    const finalWallet = await Wallet.findOne({ userId }).session(session);
    await celebrate(userId, 'wallet', `${config.conversion.currency} ${value} added to your wallet`, `${points} reward points redeemed.`, { amount: value, points });
    await notify(userId, 'Wallet credited', `${config.conversion.currency} ${value} from ${points} reward points.`);
    return { value, points, txns, wallet: finalWallet };
  });
};

// A payout destination the student typed; refused unless it is well-formed.
const validateMethod = (method) => {
  if (!method || !['upi', 'bank'].includes(method.type)) throw fail('Choose UPI or bank transfer');
  const m = { type: method.type, upiId: String(method.upiId || '').trim(), accountName: String(method.accountName || '').trim(), accountNumber: String(method.accountNumber || '').trim(), ifsc: String(method.ifsc || '').trim().toUpperCase() };
  if (m.type === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(m.upiId)) throw fail('Enter a valid UPI id (name@bank)');
  if (m.type === 'bank' && (!m.accountName || !/^\d{9,18}$/.test(m.accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(m.ifsc))) throw fail('Enter the account name, a 9–18 digit account number and a valid IFSC');
  return m;
};

/**
 * Put money on hold and open a request for an administrator to pay out.
 * Kept server-side for operators; the student wallet is an in-LMS balance
 * and does not offer this itself.
 */
const requestWithdrawal = async ({ user, amount, method }) => {
  const config = await getConfig();
  if (!config.enabled) throw fail('Rewards are currently unavailable', 403, 'REWARDS_LOCKED');
  if (!monetaryEnabledFor(user, config)) throw fail('Withdrawals are not enabled for your account type', 403, 'NOT_ELIGIBLE');
  amount = money(amount);
  if (!(amount > 0)) throw fail('Enter an amount');
  if (amount < config.limits.minWithdrawal) throw fail(`Minimum withdrawal is ${config.conversion.currency} ${config.limits.minWithdrawal}`);
  if (config.limits.maxWithdrawal > 0 && amount > config.limits.maxWithdrawal) throw fail(`Maximum withdrawal is ${config.conversion.currency} ${config.limits.maxWithdrawal}`);
  const m = validateMethod(method);
  const open = await WithdrawalRequest.countDocuments({ userId: user._id, status: { $in: ['pending', 'approved'] } });
  if (open > 0) throw fail('You already have a withdrawal in progress. Wait for it to be processed first.', 400, 'WITHDRAWAL_OPEN');

  return runInTransaction(async (session) => {
    await getOrCreateWallet(user._id, session);
    const wallet = await Wallet.findOneAndUpdate({ userId: user._id, available: { $gte: amount } }, { $inc: { available: -amount, pending: amount } }, { returnDocument: 'after', session });
    if (!wallet) throw fail('Insufficient wallet balance', 400, 'INSUFFICIENT_FUNDS');
    const [txn] = await WalletTransaction.create([{ userId: user._id, type: 'debit', amount, source: 'withdrawal', status: 'pending', description: `Withdrawal to ${m.type === 'upi' ? m.upiId : `bank ****${m.accountNumber.slice(-4)}`}`, createdBy: 'user', balanceAfter: wallet.available }], { session });
    const [request] = await WithdrawalRequest.create([{ userId: user._id, amount, currency: config.conversion.currency, method: m, walletTransactionId: txn._id }], { session });
    await WalletTransaction.updateOne({ _id: txn._id }, { $set: { referenceKey: `withdrawal:${request._id}`, 'meta.requestId': request._id } }, { session });
    return { request, wallet };
  });
};

/**
 * Admin decision on a withdrawal. approve → keeps the hold, marks approved;
 * paid → releases the hold as withdrawn; rejected → returns the money with a
 * refund entry so the ledger explains the round trip.
 */
const decideWithdrawal = async ({ requestId, decision, adminId, note = '', payoutReference = '' }) => {
  if (!['approved', 'paid', 'rejected'].includes(decision)) throw fail('decision must be approved, paid or rejected');
  return runInTransaction(async (session) => {
    const request = await WithdrawalRequest.findById(requestId).session(session);
    if (!request) throw fail('Withdrawal request not found', 404);
    const allowedFrom = { approved: ['pending'], paid: ['pending', 'approved'], rejected: ['pending', 'approved'] }[decision];
    if (!allowedFrom.includes(request.status)) throw fail(`Cannot mark a ${request.status} request as ${decision}`, 409, 'BAD_TRANSITION');
    const { userId, amount } = request;

    if (decision === 'paid') {
      await Wallet.updateOne({ userId, pending: { $gte: amount } }, { $inc: { pending: -amount, totalWithdrawn: amount } }, { session });
      await WalletTransaction.updateOne({ _id: request.walletTransactionId }, { $set: { status: 'completed', 'meta.payoutReference': payoutReference } }, { session });
      await notify(userId, 'Withdrawal paid', `${request.currency} ${amount} has been sent to your ${request.method.type === 'upi' ? 'UPI id' : 'bank account'}.`);
    } else if (decision === 'rejected') {
      const w = await Wallet.findOneAndUpdate({ userId, pending: { $gte: amount } }, { $inc: { pending: -amount, available: amount } }, { returnDocument: 'after', session });
      await WalletTransaction.updateOne({ _id: request.walletTransactionId }, { $set: { status: 'cancelled', 'meta.rejectedNote': note } }, { session });
      await WalletTransaction.create([{ userId, type: 'credit', amount, source: 'withdrawal_refund', status: 'completed', referenceKey: `withdrawal-refund:${request._id}`, description: `Withdrawal request returned${note ? `: ${note}` : ''}`, createdBy: String(adminId || 'admin'), balanceAfter: w ? w.available : null }], { session });
      await notify(userId, 'Withdrawal not approved', note ? `Reason: ${note}. The amount is back in your wallet.` : 'The amount is back in your wallet.');
    } else {
      await notify(userId, 'Withdrawal approved', `${request.currency} ${amount} is being processed.`);
    }
    request.status = decision;
    request.adminNote = note;
    request.payoutReference = payoutReference;
    request.processedBy = adminId || undefined;
    request.processedAt = new Date();
    await request.save({ session });
    return request;
  });
};

// Verify that ledger rows still add up to the stored balance — the fraud/
// integrity check the admin panel runs.
const auditWallet = async (userId) => {
  const wallet = await Wallet.findOne({ userId }).lean();
  const rows = await WalletTransaction.find({ userId }).lean();
  let available = 0, pending = 0;
  for (const r of rows) {
    if (r.type === 'credit' && r.status === 'completed') available += r.amount;
    if (r.type === 'credit' && r.status === 'pending') pending += r.amount;
    if (r.type === 'debit' && r.status === 'completed') available -= r.amount;
    if (r.type === 'debit' && r.status === 'pending') { available -= r.amount; pending += r.amount; }
    if (r.type === 'debit' && r.status === 'cancelled') available -= r.amount; // the refund credit adds it back
  }
  const pts = await RewardTransaction.aggregate([{ $match: { userId: wallet ? wallet.userId : userId, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$points' } } }]);
  const points = pts[0]?.total || 0;
  return {
    userId,
    stored: wallet ? { available: wallet.available, pending: wallet.pending, rewardPoints: wallet.rewardPoints } : null,
    computed: { available: money(available), pending: money(pending), rewardPoints: points },
    ok: !wallet ? rows.length === 0 && points === 0 : (money(available) === money(wallet.available) && money(pending) === money(wallet.pending) && points === wallet.rewardPoints)
  };
};

module.exports = { credit, debit, redeemPoints, requestWithdrawal, decideWithdrawal, auditWallet, redeemedThisMonth, money };
