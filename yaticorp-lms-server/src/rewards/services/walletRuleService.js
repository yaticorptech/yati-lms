/**
 * Wallet rules: features that cost money from the student's wallet balance.
 *
 * The price of each feature is the admin's (Rewards → Reward rules → Wallet
 * rules), read live from the one shared rulebook, so a change applies to every
 * student from the next use. 0 means free. The charge is taken before the
 * feature runs, refused with 402 when the balance is short, and given back
 * automatically when the feature itself then fails — the student only ever
 * pays for something that happened. Both moves are ledger rows
 * (feature_charge / feature_refund), so the wallet history explains them.
 */
const crypto = require('crypto');
const { Wallet, WalletTransaction } = require('../models');
const { runInTransaction, isDuplicate } = require('./tx');
const { getConfig } = require('./configService');
const { getOrCreateWallet } = require('./rewardPointsService');
const C = require('../config/constants');

const LABELS = {
  download_resume: 'Downloading your resume',
  upload_resume: 'Uploading a resume',
  download_bio: 'Downloading your learning bio',
  start_global_quiz: 'Starting the Global Quiz',
  find_job: 'Opening a job listing',
  apply_part_time: 'Applying for a part-time job',
  rebuild_roadmap: 'Rebuilding your roadmap',
  start_mock_interview: 'Starting a mock interview',
  find_scholarship: 'Finding scholarships',
  generate_ideas: 'Rebuilding your Ideas list',
  download_certificate: 'Downloading a certificate',
  ask_mentor: 'Asking the AI mentor',
  build_task_lesson: 'Building a task lesson',
  generate_study_material: 'Building a study pack',
  add_extra_task: 'Adding another task',
  regenerate_bio: 'Rewriting your learning bio'
};

const money = (n) => Math.round(Number(n) * 100) / 100;
const fmt = (n, currency) => (currency === 'INR' ? `₹${money(n).toLocaleString('en-IN')}` : `${money(n)} ${currency}`);

const priceOf = async (action) => {
  const config = await getConfig();
  // Rewards switched off for the platform: nothing is charged.
  if (config.enabled === false) return { amount: 0, currency: config.conversion?.currency || 'INR' };
  return { amount: Math.max(0, money(config.walletRules?.[action] || 0)), currency: config.conversion?.currency || 'INR' };
};

// A charge that was given back does not count as paid.
const refunded = async (userId, key) => {
  const charge = await WalletTransaction.findOne({ userId, referenceKey: key }).select('_id').lean();
  return !!charge && !!(await WalletTransaction.exists({ userId, referenceKey: `refund:${charge._id}` }));
};

const shortOf = (amount, available, currency, action) => {
  const e = new Error(`${LABELS[action] || 'This'} costs ${fmt(amount, currency)} from your wallet, and your balance is ${fmt(available, currency)}. Earn XP on Career Path to add to your wallet balance.`);
  e.status = 402;
  e.code = 'INSUFFICIENT_FUNDS';
  e.details = { action, needed: amount, balance: money(available), currency };
  return e;
};

/**
 * Take the price of `action` from the wallet. Resolves { charged: 0 } when the
 * feature is free. `referenceKey` makes a charge once-only (a job listing is
 * paid for once, however often it is reopened); without one, each use pays.
 */
const chargeFor = async ({ userId, action, referenceKey = null, meta = {} }) => {
  if (!C.WALLET_ACTIONS.includes(action)) throw new Error(`Unknown wallet action: ${action}`);
  const { amount, currency } = await priceOf(action);
  if (!(amount > 0)) return { charged: 0, currency };
  const key = `charge:${action}:${referenceKey || crypto.randomUUID()}`;
  // Paid before under this reference (and not refunded): free now, whatever
  // the balance is today.
  if (referenceKey && (await WalletTransaction.exists({ userId, referenceKey: key })) && !(await refunded(userId, key))) {
    return { charged: 0, currency, alreadyPaid: true };
  }
  // Every student has their starting credit before the first price is taken.
  await require('./walletService').grantStartingCredit(userId);
  try {
    return await runInTransaction(async (session) => {
      const w = await getOrCreateWallet(userId, session);
      const wallet = await Wallet.findOneAndUpdate({ userId, available: { $gte: amount } }, { $inc: { available: -amount, totalSpent: amount } }, { returnDocument: 'after', session });
      if (!wallet) throw shortOf(amount, w?.available || 0, currency, action);
      // Spent from the starting credit first, so earned money stays withdrawable.
      const fromSpendOnly = Math.min(Math.max(0, wallet.spendOnly || 0), amount);
      if (fromSpendOnly > 0) await Wallet.updateOne({ userId }, { $inc: { spendOnly: -fromSpendOnly } }, { session });
      const [txn] = await WalletTransaction.create([{
        userId, type: 'debit', amount, currency, source: 'feature_charge', referenceKey: key,
        description: LABELS[action] || action, meta: { action, fromSpendOnly, ...meta }, createdBy: 'user', balanceAfter: wallet.available
      }], { session });
      return { charged: amount, currency, txnId: txn._id, balance: wallet.available, fromSpendOnly };
    });
  } catch (err) {
    // Already paid under this reference (the same job listing again): free now.
    if (isDuplicate(err)) return { charged: 0, currency, alreadyPaid: true };
    throw err;
  }
};

/** Give a charge back, once, when the feature it paid for did not happen. */
const refundCharge = async ({ userId, charge, action }) => {
  if (!charge?.charged || !charge.txnId) return null;
  try {
    return await runInTransaction(async (session) => {
      // What came out of the starting credit goes back into it, not into the
      // withdrawable part — a failed feature must not turn credit into cash.
      const wallet = await Wallet.findOneAndUpdate({ userId }, { $inc: { available: charge.charged, totalSpent: -charge.charged, spendOnly: charge.fromSpendOnly || 0 } }, { returnDocument: 'after', session });
      await WalletTransaction.create([{
        userId, type: 'credit', amount: charge.charged, currency: charge.currency, source: 'feature_refund', referenceKey: `refund:${charge.txnId}`,
        description: `Refund: ${(LABELS[action] || action).toLowerCase()} did not complete`, meta: { action, chargeTxn: String(charge.txnId) }, createdBy: 'system', balanceAfter: wallet?.available ?? null
      }], { session });
      return true;
    });
  } catch (err) {
    if (isDuplicate(err)) return null;
    throw err;
  }
};

const sendShort = (res, err) => res.status(402).json({ message: err.message, error: err.message, code: err.code, ...err.details });

/**
 * Route middleware: charge `action` before the handler runs, and refund it if
 * the handler answers with an error (status 400 or above). `when(req)` limits
 * the charge to real uses — a rebuild, not a first roadmap; a new application,
 * not the same one opened again. The charge is reported in the
 * X-Wallet-Charged header so the page can refresh the balance it shows.
 */
const chargeWallet = (action, { when = null, ref = null } = {}) => async (req, res, next) => {
  try {
    if (!req.user?._id) return next();
    if (when && !(await when(req))) return next();
    const charge = await chargeFor({ userId: req.user._id, action, referenceKey: ref ? ref(req) : null });
    if (charge.charged > 0) {
      res.setHeader('X-Wallet-Charged', String(charge.charged));
      res.on('finish', () => {
        if (res.statusCode >= 400) refundCharge({ userId: req.user._id, charge, action }).catch((e) => console.error('[wallet] refund failed:', e.message));
      });
    }
    next();
  } catch (err) {
    if (err.code === 'INSUFFICIENT_FUNDS') return sendShort(res, err);
    next(err);
  }
};

module.exports = { chargeFor, refundCharge, chargeWallet, sendShort, priceOf, LABELS };
