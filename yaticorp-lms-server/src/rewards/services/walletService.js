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
const { monetaryEnabledFor } = require('./eligibility');
const { getOrCreateWallet } = require('./rewardPointsService');
const { notify, celebrate } = require('./notify');
const { periodWindow } = require('../config/constants');

const fail = (message, status = 400, code = 'WALLET_ERROR') => { const e = new Error(message); e.status = status; e.code = code; return e; };
const money = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Add money. `referenceKey` makes the credit idempotent per user.
 * Returns { duplicate: true } when that key has already been credited.
 */
const credit = async ({ userId, amount, source, referenceKey = null, description = '', meta = {}, createdBy = 'system', status = 'completed', spendOnly = false }) => {
  amount = money(amount);
  if (!(amount > 0)) throw fail('Amount must be greater than zero');
  try {
    return await runInTransaction(async (session) => {
      const [txn] = await WalletTransaction.create([{ userId, type: 'credit', amount, source, referenceKey, description, meta, createdBy, status }], { session });
      await getOrCreateWallet(userId, session);
      // A spend-only credit (the starting balance) is not earnings: it adds to
      // what can be spent and to the non-withdrawable part, nothing else.
      const inc = status !== 'completed'
        ? { pending: amount }
        : spendOnly
          ? { available: amount, spendOnly: amount }
          : { available: amount, totalEarned: amount, [`earnedBySource.${source}`]: amount };
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
const debit = async ({ userId, amount, source, referenceKey = null, description = '', meta = {}, createdBy = 'system', hold = false, spendCreditFirst = false }) => {
  amount = money(amount);
  if (!(amount > 0)) throw fail('Amount must be greater than zero');
  try {
    return await runInTransaction(async (session) => {
      await getOrCreateWallet(userId, session);
      const inc = hold ? { available: -amount, pending: amount } : { available: -amount, totalSpent: amount };
      const wallet = await Wallet.findOneAndUpdate({ userId, available: { $gte: amount } }, { $inc: inc }, { returnDocument: 'after', session });
      if (!wallet) throw fail('Insufficient wallet balance', 400, 'INSUFFICIENT_FUNDS');
      // A purchase uses the starting credit first, so earned money stays
      // withdrawable; anything else only keeps the spend-only part within
      // what is left.
      const fromSpendOnly = spendCreditFirst ? Math.min(Math.max(0, wallet.spendOnly || 0), amount) : 0;
      const spendOnlyAfter = Math.min(Math.max(0, (wallet.spendOnly || 0) - fromSpendOnly), wallet.available);
      if (spendOnlyAfter !== (wallet.spendOnly || 0)) await Wallet.updateOne({ userId }, { $set: { spendOnly: spendOnlyAfter } }, { session });
      const [txn] = await WalletTransaction.create([{ userId, type: 'debit', amount, source, referenceKey, description, meta: { ...meta, fromSpendOnly }, createdBy, status: hold ? 'pending' : 'completed', balanceAfter: wallet.available }], { session });
      return { txn, wallet, duplicate: false };
    });
  } catch (err) {
    if (isDuplicate(err)) return { duplicate: true };
    throw err;
  }
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
// eslint-disable-next-line no-unused-vars
const redeemPoints = async ({ user, points }) => {
  // Only XP becomes money now, automatically in blocks (convertXp).
  // Reward points stay a score — badges, streaks, the leaderboard — and are
  // never cashed out. A clear refusal for any old page still asking.
  throw fail('Reward points no longer convert into wallet balance. XP you earn is paid into your wallet automatically.', 410, 'POINTS_NOT_REDEEMABLE');
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
// eslint-disable-next-line no-unused-vars
const requestWithdrawal = async ({ user, amount, method }) => {
  // Wallet money stays inside the LMS: it pays for courses and the features
  // priced under Wallet rules, and is never paid out to a bank or UPI.
  throw fail('Wallet balance cannot be withdrawn. Use it to enroll in courses and for features inside the LMS.', 410, 'WITHDRAWALS_OFF');
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

/**
 * The opening balance, once, as spend-only money — for students who
 * registered after the starting credit was introduced, and for earlier
 * students whose wallet is at ₹0.
 * Safe to call on every wallet read: the reference key makes a second credit
 * a no-op, and a per-process memo skips even the lookups after the first time.
 */
const credited = new Set();
let creditFrom = null;
const startingCreditFrom = async () => {
  if (creditFrom) return creditFrom;
  const { RewardConfig } = require('../models');
  // First time ever: the cut-off is now. Conditional, so two servers starting
  // together agree on one moment.
  await RewardConfig.updateOne({ $or: [{ startingCreditFrom: null }, { startingCreditFrom: { $exists: false } }] }, { $set: { startingCreditFrom: new Date() } });
  const doc = await RewardConfig.findOne().select('startingCreditFrom').lean();
  creditFrom = doc?.startingCreditFrom || new Date();
  return creditFrom;
};
const grantStartingCredit = async (userId) => {
  const id = String(userId);
  if (credited.has(id)) return null;
  const config = await getConfig();
  const amount = money(config.startingCredit || 0);
  if (!(amount > 0)) return null;
  // Accounts from before the credit existed — judged both by when the student
  // registered and by whether they already had a wallet then — get it only
  // while their wallet stands at ₹0 (the user, 2026-10-07: students already
  // using the app with a zero balance get the ₹1,50,000 too). One with money
  // in the wallet keeps what it has. Either way it is paid at most once: the
  // 'starting-credit' reference key is unique per student.
  const cutoff = await startingCreditFrom();
  const [user, wallet] = await Promise.all([
    User.findById(userId).select('createdAt').lean(),
    Wallet.findOne({ userId }).select('createdAt available').lean()
  ]);
  if (!user) {
    credited.add(id);
    return null;
  }
  const existing = !user.createdAt || user.createdAt < cutoff || (wallet?.createdAt && wallet.createdAt < cutoff);
  if (existing && money(wallet?.available || 0) !== 0) {
    credited.add(id);
    return null;
  }
  const result = await credit({
    userId, amount, source: 'starting_credit', referenceKey: 'starting-credit', spendOnly: true,
    description: 'Starting wallet credit'
  });
  credited.add(id);
  return result;
};

/**
 * Turn XP into money in whole blocks, at the admin's rate: every
 * `pointsPerUnit` XP (e.g. 1,000) on the student's XP balance is deducted and
 * `unitValue` (e.g. ₹10) added to the wallet — repeated for every full block.
 * Every account type. Called after each XP award and on each wallet read.
 *
 * The XP balance is lifetime XP minus what has been converted; lifetime XP
 * (level, leaderboard, XP badges) is never touched. The conversion claims its
 * block by moving `xpConverted` on from the value it read, so two awards
 * landing together cannot convert the same XP twice.
 */
const convertXp = async (userId) => {
  const config = await getConfig();
  if (!config.enabled) return null;
  const { pointsPerUnit, unitValue, currency } = config.conversion;
  const unit = Math.max(1, Math.round(Number(pointsPerUnit) || 0));
  const value = money(unitValue);
  if (!(value > 0)) return null;
  const user = await User.findById(userId).select('xp').lean();
  if (!user) return null;
  await grantStartingCredit(userId);

  for (let attempt = 0; attempt < 3; attempt++) {
    const w = await getOrCreateWallet(userId);
    const converted = w.xpConverted || 0;
    const blocks = Math.floor(((user.xp || 0) - converted) / unit);
    if (blocks <= 0) return null;
    const xp = blocks * unit;
    const amount = money(blocks * value);
    const upTo = converted + xp;
    try {
      const result = await runInTransaction(async (session) => {
        const claimed = await Wallet.findOneAndUpdate(
          { userId, xpConverted: converted === 0 ? { $in: [0, null] } : converted },
          { $set: { xpConverted: upTo } },
          { returnDocument: 'after', session }
        );
        if (!claimed) return null; // another award converted first; read again
        const [txn] = await WalletTransaction.create([{
          userId, type: 'credit', amount, source: 'xp_reward', referenceKey: `xp-convert:${upTo}`,
          description: `${xp.toLocaleString('en-IN')} XP converted`,
          meta: { xp, rate: { pointsPerUnit: unit, unitValue: value, currency }, xpConvertedTo: upTo }
        }], { session });
        const wallet = await Wallet.findOneAndUpdate(
          { userId },
          { $inc: { available: amount, totalEarned: amount, 'earnedBySource.xp_reward': amount } },
          { returnDocument: 'after', session }
        );
        await WalletTransaction.updateOne({ _id: txn._id }, { $set: { balanceAfter: wallet.available } }, { session });
        return { xp, amount, wallet };
      });
      if (!result) continue;
      await notify(userId, 'XP converted', `${xp.toLocaleString('en-IN')} XP became ${currency} ${amount} in your wallet.`);
      return result;
    } catch (err) {
      if (isDuplicate(err)) return null;
      throw err;
    }
  }
  return null;
};

module.exports = { credit, debit, redeemPoints, requestWithdrawal, decideWithdrawal, auditWallet, redeemedThisMonth, money, grantStartingCredit, startingCreditFrom, convertXp };
