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
  regenerate_bio: 'Rewriting your learning bio',
  download_competition_certificate: 'Downloading a competition certificate',
  create_game_room: 'Creating a game room'
};

const money = (n) => Math.round(Number(n) * 100) / 100;
const fmt = (n, currency) => (currency === 'INR' ? `₹${money(n).toLocaleString('en-IN')}` : `${money(n)} ${currency}`);

const priceOf = async (action) => {
  const config = await getConfig();
  // Rewards switched off for the platform: nothing is charged.
  if (config.enabled === false) return { amount: 0, currency: config.conversion?.currency || 'INR' };
  return { amount: Math.max(0, money(config.walletRules?.[action] || 0)), currency: config.conversion?.currency || 'INR' };
};

/*
 * The ledger key for a once-only charge. The first charge under a reference
 * is `charge:<action>:<ref>`; a charge that was refunded (the feature failed)
 * does not count as paid, and the next attempt is booked as `…:2`, then `…:3`.
 *
 * It used to reuse the first key, which the ledger's unique index refuses: with
 * transactions the refusal read as "already paid", so after one failure the
 * feature was free for good; without them the money left the wallet with no
 * ledger row. Numbering the retries keeps both halves of the idempotency —
 * two submits of the same attempt work out the same number, so the second
 * still hits the index and is not charged again.
 *
 * Returns { paid: true } when an unrefunded charge exists, else the key to use.
 */
const onceOnlyKey = async (userId, action, referenceKey) => {
  const base = `charge:${action}:${referenceKey}`;
  const prior = await WalletTransaction.find({ userId, source: 'feature_charge', $or: [{ referenceKey: base }, { 'meta.chargeRef': base }] }).select('_id').lean();
  if (!prior.length) return { key: base, base };
  const refunds = await WalletTransaction.countDocuments({ userId, referenceKey: { $in: prior.map((c) => `refund:${c._id}`) } });
  if (refunds < prior.length) return { paid: true };
  return { key: `${base}:${prior.length + 1}`, base };
};

const shortOf = (amount, available, currency, action) => {
  const e = new Error(`${LABELS[action] || 'This'} costs ${fmt(amount, currency)} from your wallet, and your balance is ${fmt(available, currency)}.`);
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
  let key = `charge:${action}:${crypto.randomUUID()}`;
  let chargeRef = null;
  if (referenceKey) {
    // Paid before under this reference (and not refunded): free now, whatever
    // the balance is today.
    const once = await onceOnlyKey(userId, action, referenceKey);
    if (once.paid) return { charged: 0, currency, alreadyPaid: true };
    key = once.key;
    chargeRef = once.base;
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
      let txn;
      try {
        [txn] = await WalletTransaction.create([{
          userId, type: 'debit', amount, currency, source: 'feature_charge', referenceKey: key,
          description: LABELS[action] || action, meta: { action, fromSpendOnly, ...meta, ...(chargeRef ? { chargeRef } : {}) }, createdBy: 'user', balanceAfter: wallet.available
        }], { session });
      } catch (err) {
        // Without a transaction nothing rolls the balance back for us, and a
        // ledger row that could not be written must not leave money gone.
        if (!session) await Wallet.updateOne({ userId }, { $inc: { available: amount, totalSpent: -amount, spendOnly: fromSpendOnly } });
        throw err;
      }
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

/**
 * Ask first (2026-10-28): before a priced feature takes money, the student is
 * shown what it costs and agrees. The app sends `X-Wallet-Ask: 1` on every
 * request; a priced one is then answered 428 WALLET_CONFIRM with the price and
 * the balance, and comes back with `X-Wallet-Confirm: <the price agreed to>`.
 *
 * Nothing is asked when nothing would be taken: a free feature, one already
 * paid for under its reference (a job listing reopened), or a request `when`
 * does not price (a first roadmap). Nor when the balance is short — the charge
 * itself then says so (402), as before. An app from before this (no
 * X-Wallet-Ask) is charged straight away, as it always was, rather than shown
 * an answer it does not understand.
 *
 * Returns true when it has answered the request.
 */
const askFirst = async (req, res, { action, referenceKey = null }) => {
  if (req.get?.('x-wallet-ask') !== '1' || !req.user?._id) return false;
  const { amount, currency } = await priceOf(action);
  if (!(amount > 0)) return false;
  // Agreed to this price (a price changed in between is asked about again).
  if (Number(req.get('x-wallet-confirm')) === amount) return false;
  if (referenceKey && (await onceOnlyKey(req.user._id, action, referenceKey)).paid) return false;
  await require('./walletService').grantStartingCredit(req.user._id);
  const w = await Wallet.findOne({ userId: req.user._id }).select('available').lean();
  const balance = money(w?.available || 0);
  if (balance < amount) return false;
  res.status(428).json({
    code: 'WALLET_CONFIRM', action, label: LABELS[action] || 'This', amount, currency, balance,
    message: `${LABELS[action] || 'This'} costs ${fmt(amount, currency)} from your wallet.`
  });
  return true;
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
    // The demo (presentation) cards use every priced feature free (services/fullAccess.js).
    if (require('../../services/fullAccess').hasFullAccess(req.user)) return next();
    if (when && !(await when(req))) return next();
    if (await askFirst(req, res, { action, referenceKey: ref ? ref(req) : null })) return;
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

module.exports = { chargeFor, refundCharge, chargeWallet, askFirst, sendShort, priceOf, LABELS };
