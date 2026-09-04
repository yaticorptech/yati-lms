/**
 * Scheduled work: close out finished leaderboard periods with their rewards,
 * and refresh the standings snapshot. Called on a timer from server.js far
 * more often than it acts — the RewardJobRun claim makes each payout once-only
 * across restarts and instances.
 */
const { RewardJobRun, Streak } = require('../models');
const { getConfig } = require('./configService');
const { ranking, takeSnapshot } = require('./leaderboardService');
const { awardPoints } = require('./rewardPointsService');
const badgeService = require('./badgeService');
const { notify, celebrate } = require('./notify');
const { isDuplicate } = require('./tx');
const { periodWindow } = require('../config/constants');
const { pointsToMoney } = require('./eligibility');

const claim = async (key) => {
  try { await RewardJobRun.create({ key }); return true; } catch (err) { if (isDuplicate(err)) return false; throw err; }
};

/**
 * Pay the previous period's top finishers. Idempotent twice over: the job
 * claim, and the per-user claimKey on each reward.
 */
const payoutPeriod = async (period) => {
  const config = await getConfig();
  if (!config.enabled) return null;
  const rewards = (config.leaderboardRewards && config.leaderboardRewards[period]) || [];
  const { key } = periodWindow(period, new Date(), -1);
  const jobKey = `leaderboard:${period}:${key}`;
  if (!(await claim(jobKey))) return null;

  // Rank over the window that just closed.
  const win = periodWindow(period, new Date(), -1);
  const { XpTransaction } = require('../models');
  const rows = await XpTransaction.aggregate([
    { $match: { amount: { $gt: 0 }, createdAt: { $gte: win.start, $lt: win.end } } },
    { $group: { _id: '$userId', xp: { $sum: '$amount' } } },
    { $sort: { xp: -1, _id: 1 } }
  ]);

  const paid = [];
  for (let i = 0; i < rows.length; i++) {
    const rank = i + 1;
    const userId = rows[i]._id;
    if (period === 'weekly' && rank <= 10) {
      await Streak.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true });
      await Streak.updateOne({ userId }, { $inc: { top10Weeks: 1 }, $min: { bestWeeklyRank: rank } });
      await badgeService.evaluate(userId, config).catch((e) => console.error('[rewards] badge eval failed:', e.message));
    }
    const reward = rewards.find((r) => r.rank === rank);
    if (!reward || reward.rewardPoints <= 0) { if (rank > 10 && rank > Math.max(0, ...rewards.map((r) => r.rank))) break; continue; }
    const result = await awardPoints({ userId, points: reward.rewardPoints, source: 'leaderboard', claimKey: `leaderboard:${period}:${key}`, description: `${period === 'weekly' ? 'Weekly' : 'Monthly'} rank #${rank}`, meta: { period, periodKey: key, rank }, quiet: true });
    if (result) {
      const label = period === 'weekly' ? 'week' : 'month';
      await notify(userId, `🏆 Rank #${rank} last ${label}!`, `+${reward.rewardPoints} reward points for finishing #${rank} on the leaderboard.`);
      await celebrate(userId, 'leaderboard_reward', `You finished #${rank} last ${label}!`, 'Leaderboard reward', { rank, period, rewardPoints: reward.rewardPoints, value: pointsToMoney(reward.rewardPoints, config), currency: config.conversion.currency });
      paid.push({ userId, rank, points: reward.rewardPoints });
    }
  }
  await RewardJobRun.updateOne({ key: jobKey }, { $set: { result: { ranked: rows.length, paid } } });
  console.log(`[rewards] ${jobKey}: ranked ${rows.length}, paid ${paid.length}`);
  return paid;
};

const runScheduled = async () => {
  try {
    await payoutPeriod('weekly');
    await payoutPeriod('monthly');
    for (const p of ['daily', 'weekly', 'monthly', 'all']) await takeSnapshot(p);
  } catch (err) {
    console.error('[rewards] scheduled run failed:', err.message);
  }
};

module.exports = { runScheduled, payoutPeriod };
