/**
 * The one place XP is written. Career Path's addXP funnels through here too,
 * so every XP source lands in the ledger the leaderboard is summed from and
 * every level is computed from the same admin thresholds.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const { XpTransaction } = require('../models');
const { getConfig, levelFor } = require('./configService');
const { isDuplicate } = require('./tx');
const { notify, celebrate } = require('./notify');

/**
 * @param {object} p
 * @param {string|ObjectId} p.userId
 * @param {number} p.amount           positive XP to add
 * @param {string} p.source           activity type or 'career' / 'streak' / 'admin'
 * @param {string} [p.refId]          natural key for idempotency (lesson id, quiz id…)
 * @param {string} [p.courseId]       for course-specific leaderboards
 * @param {string} [p.description]
 * @param {boolean} [p.silent]        skip the "XP earned" notification (callers that batch)
 * @returns {{ duplicate: boolean, xp?: number, level?: number, leveledUp?: boolean, oldLevel?: number }}
 */
const addXp = async ({ userId, amount, source, refId = null, courseId = null, description = '', silent = false }) => {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0) return { duplicate: false, skipped: true };

  const key = refId ? `${source}:${refId}` : `${source}:${new mongoose.Types.ObjectId().toString()}`;
  let txn;
  try {
    txn = await XpTransaction.create({ userId, amount, source, refId: refId ? String(refId) : null, key, courseId: courseId ? String(courseId) : null, description });
  } catch (err) {
    if (isDuplicate(err)) return { duplicate: true };
    throw err;
  }

  const before = await User.findById(userId).select('xp level').lean();
  const oldLevel = Math.max(1, before?.level || 1);
  const user = await User.findByIdAndUpdate(userId, { $inc: { xp: amount } }, { returnDocument: 'after', select: 'xp level' });
  if (!user) return { duplicate: false, missingUser: true };

  const config = await getConfig();
  const level = levelFor(user.xp, config.levelThresholds);
  if (level !== user.level) await User.updateOne({ _id: userId }, { $set: { level } });
  await XpTransaction.updateOne({ _id: txn._id }, { $set: { balanceAfter: user.xp } });

  const leveledUp = level > oldLevel;
  if (!silent) await notify(userId, 'XP earned', `+${amount} XP ${description || `for ${source.replace(/_/g, ' ')}`}.`);
  if (leveledUp) {
    await notify(userId, 'Level up!', `You reached Level ${level}. Keep going!`);
    await celebrate(userId, 'level_up', `Level ${level} reached!`, 'Your learning just moved you up a level.', { level, xp: user.xp });
  }
  return { duplicate: false, xp: user.xp, level, oldLevel, leveledUp, amount };
};

module.exports = { addXp };
