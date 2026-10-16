/**
 * Scheduled work: close out finished leaderboard periods with their rewards,
 * and refresh the standings snapshot. Called on a timer from server.js far
 * more often than it acts — the RewardJobRun claim makes each payout once-only
 * across restarts and instances.
 */
const { RewardJobRun, Streak } = require('../models');
const { getConfig, recomputeLevels } = require('./configService');
const { ranking, takeSnapshot } = require('./leaderboardService');
const { awardPoints } = require('./rewardPointsService');
const badgeService = require('./badgeService');
const { notify, celebrate, LINKS } = require('./notify');
const { isDuplicate } = require('./tx');
const { periodWindow } = require('../config/constants');
const { pointsToMoney } = require('./eligibility');

// A claimed run with no result this long after its last touch is taken to
// have died part-way (a restart, a crash) rather than to be still running on
// another instance. A payout run takes seconds; this is generous.
const STALE_RUN_MS = 15 * 60 * 1000;

const claim = async (key) => {
  try { await RewardJobRun.create({ key }); return true; } catch (err) { if (isDuplicate(err)) return false; throw err; }
};

/**
 * A run that was claimed but never finished — the server went down between
 * the claim and the last payout — is picked up again, by exactly one caller:
 * the update only matches while the run is still unfinished and stale, and
 * it touches updatedAt, so a second caller then finds it fresh. Re-paying is
 * safe because every reward carries its own per-student claim key; the ones
 * already paid answer "duplicate" and only the rest are paid.
 */
const resume = async (key) => {
  const taken = await RewardJobRun.findOneAndUpdate(
    { key, 'result.ranked': { $exists: false }, updatedAt: { $lt: new Date(Date.now() - STALE_RUN_MS) } },
    { $set: { 'result.resumedAt': new Date() } },
    { returnDocument: 'after' }
  );
  return !!taken;
};

/**
 * Pay the previous period's top finishers. Idempotent twice over: the job
 * claim, and the per-user claimKey on each reward. `now` is only ever moved
 * by the tests, to close a period nobody else has XP in.
 */
const payoutPeriod = async (period, { now = new Date() } = {}) => {
  const config = await getConfig();
  if (!config.enabled) return null;
  const rewards = (config.leaderboardRewards && config.leaderboardRewards[period]) || [];
  const { key } = periodWindow(period, now, -1);
  const jobKey = `leaderboard:${period}:${key}`;
  if (!(await claim(jobKey)) && !(await resume(jobKey))) return null;

  // Rank the window that just closed exactly as the board ranked it: active
  // students only. A deactivated account no longer shows on the board, and it
  // must not take a paid place (or push a visible student out of one) either.
  const rows = await ranking({ period, scope: 'global', offset: -1, now });

  const paid = [];
  for (let i = 0; i < rows.length; i++) {
    const rank = i + 1;
    const userId = rows[i].userId;
    if (period === 'weekly' && rank <= 10) {
      await Streak.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true });
      // Counted once per week, even when a resumed run reaches this student again.
      await Streak.updateOne({ userId, top10WeekKeys: { $ne: key } }, { $inc: { top10Weeks: 1 }, $addToSet: { top10WeekKeys: key } });
      // Not $min: the field starts as null, which sorts below every number,
      // so $min never replaced it and the best rank always read "—".
      await Streak.updateOne({ userId, $or: [{ bestWeeklyRank: null }, { bestWeeklyRank: { $gt: rank } }] }, { $set: { bestWeeklyRank: rank } });
      await badgeService.evaluate(userId, config).catch((e) => console.error('[rewards] badge eval failed:', e.message));
    }
    const reward = rewards.find((r) => r.rank === rank);
    if (!reward || reward.rewardPoints <= 0) { if (rank > 10 && rank > Math.max(0, ...rewards.map((r) => r.rank))) break; continue; }
    const result = await awardPoints({ userId, points: reward.rewardPoints, source: 'leaderboard', claimKey: `leaderboard:${period}:${key}`, description: `${period === 'weekly' ? 'Weekly' : 'Monthly'} rank #${rank}`, meta: { period, periodKey: key, rank }, quiet: true });
    if (result) {
      const label = period === 'weekly' ? 'week' : 'month';
      await notify(userId, `🏆 Rank #${rank} last ${label}!`, `+${reward.rewardPoints} reward points for finishing #${rank} on the leaderboard.`, LINKS.leaderboard);
      await celebrate(userId, 'leaderboard_reward', `You finished #${rank} last ${label}!`, 'Leaderboard reward', { rank, period, rewardPoints: reward.rewardPoints, value: pointsToMoney(reward.rewardPoints, config), currency: config.conversion.currency });
      paid.push({ userId, rank, points: reward.rewardPoints });
    }
  }
  await RewardJobRun.updateOne({ key: jobKey }, { $set: { 'result.ranked': rows.length, 'result.paid': paid } });
  console.log(`[rewards] ${jobKey}: ranked ${rows.length}, paid ${paid.length}`);
  return paid;
};

// Once per server process: stored levels repaired against the ladder in
// force, for any edit made before ladder saves recomputed them themselves.
let levelsRepaired = false;

const runScheduled = async () => {
  try {
    await payoutPeriod('weekly');
    await payoutPeriod('monthly');
    for (const p of ['daily', 'weekly', 'monthly', 'all']) await takeSnapshot(p);
  } catch (err) {
    console.error('[rewards] scheduled run failed:', err.message);
  }
  if (!levelsRepaired) {
    levelsRepaired = true;
    await recomputeLevels().catch((err) => console.error('[rewards] level repair failed:', err.message));
  }
};

module.exports = { runScheduled, payoutPeriod };
