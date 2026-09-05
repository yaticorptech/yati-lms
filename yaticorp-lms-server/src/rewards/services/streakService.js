/**
 * The daily streak. Advanced only by activityService, which has already
 * proven the activity is new; never by a login.
 */
const { Streak } = require('../models');
const { addDays, dayKey } = require('../config/constants');
const { awardPoints } = require('./rewardPointsService');
const { addXp } = require('./xpService');
const { notify, celebrate } = require('./notify');
const { pointsToMoney } = require('./eligibility');

const MAX_ACTIVE_DAYS = 400;

const getOrCreate = async (userId) =>
  Streak.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { returnDocument: 'after', upsert: true });

/**
 * Register activity on `day`. Returns the streak plus any milestones this
 * activity just reached, each already paid.
 */
const touch = async (userId, day, config) => {
  const streak = await getOrCreate(userId);
  if (streak.lastActivityDay === day) return { streak, changed: false, milestones: [] };

  const prevDay = streak.lastActivityDay;
  const continues = prevDay === addDays(day, -1);
  // A day earlier than the last recorded one (a clock skew, a late write) must
  // not reset a live streak.
  if (prevDay && day < prevDay) return { streak, changed: false, milestones: [] };

  const current = continues ? streak.current + 1 : 1;
  const runStartDay = continues && streak.runStartDay ? streak.runStartDay : day;
  const longest = Math.max(streak.longest, current);
  const activeDays = [...streak.activeDays.filter((d) => d !== day), day].slice(-MAX_ACTIVE_DAYS);

  // Optimistic write: only wins if nobody advanced the streak meanwhile.
  const res = await Streak.updateOne(
    { _id: streak._id, lastActivityDay: prevDay },
    { $set: { current, longest, lastActivityDay: day, runStartDay, activeDays } }
  );
  if (res.matchedCount === 0) return { streak: await Streak.findById(streak._id), changed: false, milestones: [] };

  // Milestones reached by this run and not yet paid. The claim key names the
  // run, so a streak that breaks and is rebuilt can earn the milestone again,
  // while the same run can never earn it twice — the ledger's unique index is
  // the final word even if two requests get here at once.
  const milestones = [];
  for (const m of (config.streakMilestones || []).slice().sort((a, b) => a.days - b.days)) {
    if (m.days > current) break;
    const claim = `${m.days}:${runStartDay}`;
    if (streak.claimedMilestones.includes(claim)) continue;
    const mark = await Streak.updateOne({ _id: streak._id, claimedMilestones: { $ne: claim } }, { $addToSet: { claimedMilestones: claim } });
    if (mark.matchedCount === 0) continue;
    const paid = m.rewardPoints > 0 ? await awardPoints({ userId, points: m.rewardPoints, source: 'streak_milestone', claimKey: `streak:${claim}`, description: `${m.days}-day streak`, meta: { days: m.days, runStartDay }, quiet: true }) : null;
    const xp = m.xp > 0 ? await addXp({ userId, amount: m.xp, source: 'streak', refId: claim, description: `for a ${m.days}-day streak`, silent: true }) : null;
    const value = pointsToMoney(m.rewardPoints, config);
    await notify(userId, `🔥 ${m.days}-day streak!`, `${m.rewardPoints ? `+${m.rewardPoints} reward points` : 'Milestone reached'}${m.xp ? ` and +${m.xp} XP` : ''}. Keep it going!`);
    await celebrate(userId, 'streak_milestone', `${m.days}-Day Streak Achieved!`, 'Congratulations!', { days: m.days, rewardPoints: m.rewardPoints, xp: m.xp, value, currency: config.conversion.currency });
    milestones.push({ days: m.days, rewardPoints: paid ? m.rewardPoints : 0, xp: xp && !xp.duplicate ? m.xp : 0, value });
  }

  return { streak: await Streak.findById(streak._id), changed: true, milestones };
};

// What the profile shows: the streak, today's status, the next milestone and
// a line of encouragement that fits the situation.
const summary = async (userId, config) => {
  const streak = (await Streak.findOne({ userId }).lean()) || { current: 0, longest: 0, lastActivityDay: null, activeDays: [], claimedMilestones: [], runStartDay: null };
  const today = dayKey();
  const yesterday = addDays(today, -1);
  const doneToday = streak.lastActivityDay === today;
  // A streak that ended yesterday is still alive until midnight; one that
  // ended earlier is over even though the stored number has not been zeroed.
  const alive = doneToday || streak.lastActivityDay === yesterday;
  const current = alive ? streak.current : 0;
  const milestones = (config.streakMilestones || []).slice().sort((a, b) => a.days - b.days);
  const next = milestones.find((m) => m.days > current) || null;
  const prevDays = milestones.filter((m) => m.days <= current).map((m) => m.days).pop() || 0;
  const progress = next ? Math.min(100, Math.round(((current - prevDays) / (next.days - prevDays)) * 100)) : 100;

  let message;
  if (current === 0) message = 'Complete a lesson or quiz today to start a streak.';
  else if (!doneToday) message = `Learn today to keep your ${current}-day streak alive.`;
  else if (next) message = `You're on fire! ${next.days - current} more day${next.days - current === 1 ? '' : 's'} to the ${next.days}-day milestone.`;
  else message = 'Legendary. Every milestone unlocked — keep learning tomorrow.';

  // Last 13 weeks of days for a calendar heat-strip.
  const calendar = [];
  const active = new Set(streak.activeDays || []);
  for (let i = 90; i >= 0; i--) { const d = addDays(today, -i); calendar.push({ day: d, active: active.has(d) }); }

  return {
    current, longest: streak.longest, doneToday, alive, lastActivityDay: streak.lastActivityDay,
    nextMilestone: next ? { days: next.days, rewardPoints: next.rewardPoints, xp: next.xp, remaining: next.days - current } : null,
    progress, message, milestones: milestones.map((m) => ({ days: m.days, rewardPoints: m.rewardPoints, xp: m.xp, reached: m.days <= streak.longest, claimedThisRun: streak.claimedMilestones?.includes(`${m.days}:${streak.runStartDay}`) })),
    calendar
  };
};

module.exports = { touch, summary, getOrCreate };
