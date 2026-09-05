/**
 * Reward points: earned by milestones, badges, leaderboard finishes and admin
 * promotions; separate from XP; redeemable into the wallet by eligible
 * accounts (see walletService.redeemPoints).
 */
const { RewardTransaction, Wallet } = require('../models');
const { runInTransaction, isDuplicate } = require('./tx');
const { notify, celebrate } = require('./notify');

const getOrCreateWallet = async (userId, session = null) => {
  const w = await Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { returnDocument: 'after', upsert: true, session }
  );
  return w;
};

/**
 * Pay points exactly once per claimKey. Returns null when the claim was
 * already paid, which callers treat as "nothing happened" rather than an error.
 */
const awardPoints = async ({ userId, points, source, claimKey, description = '', meta = {}, quiet = false }) => {
  points = Math.round(Number(points) || 0);
  if (points <= 0) return null;

  let created = null;
  try {
    created = await runInTransaction(async (session) => {
      const [row] = await RewardTransaction.create([{ userId, points, source, claimKey, description, meta }], { session });
      await getOrCreateWallet(userId, session);
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { rewardPoints: points, rewardPointsEarned: points } },
        { returnDocument: 'after', session }
      );
      await RewardTransaction.updateOne({ _id: row._id }, { $set: { balanceAfter: wallet.rewardPoints } }, { session });
      return { row, balance: wallet.rewardPoints };
    });
  } catch (err) {
    if (isDuplicate(err)) return null;
    throw err;
  }

  if (!quiet) {
    await notify(userId, 'Reward points earned', `+${points} reward points — ${description || source.replace(/_/g, ' ')}.`);
  }
  return created;
};

module.exports = { awardPoints, getOrCreateWallet };
