/**
 * Achievements. Each badge names a metric and a target; when the metric gets
 * there the badge unlocks once (unique index).
 *
 * Badges no longer pay reward points: points are what UNLOCK some of them
 * (metric 'reward_points' — lifetime points earned, never spent). A badge
 * paying points would also loop, a points badge paying the points for the next.
 */
const User = require('../../models/User');
const { RewardBadge, RewardUserBadge, LearningActivity, Streak, Wallet } = require('../models');
const { seedBadges, getLevelThresholds, levelFor } = require('./configService');
const { isDuplicate } = require('./tx');
const { notify, celebrate, linkFor } = require('./notify');
const { historyCounts } = require('./learningHistory');

const computeStats = async (userId) => {
  const [user, streak, counts, prep, wallet, history, ladder] = await Promise.all([
    User.findById(userId).select('xp').lean(),
    Streak.findOne({ userId }).lean(),
    LearningActivity.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', n: { $sum: 1 }, perfect: { $sum: { $cond: [{ $eq: ['$meta.score', 100] }, 1, 0] } } } }
    ]),
    // Required lazily: the interview module also requires this service.
    require('../../interview/models').InterviewPrep.findOne({ userId }).select('readiness').lean().catch(() => null),
    Wallet.findOne({ userId }).select('rewardPointsEarned').lean(),
    // Lessons, passes and courses from the ledger AND course progress: those
    // done while Rewards was off are only in the second (learningHistory.js).
    historyCounts(userId),
    getLevelThresholds()
  ]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c]));
  return {
    lessons: Math.max(by.lesson_complete?.n || 0, history.lessons),
    // A passed quiz is a completed one, so the passes set a floor.
    quizzes: Math.max(by.quiz_complete?.n || 0, history.quizzesPassed),
    perfect_quizzes: by.quiz_complete?.perfect || 0,
    courses: Math.max(by.course_complete?.n || 0, history.courses),
    certificates: by.certificate_earned?.n || 0,
    xp: user?.xp || 0,
    // From XP under the admin's ladder: the stored level lags a ladder edit.
    level: levelFor(user?.xp || 0, ladder),
    longest_streak: streak?.longest || 0,
    current_streak: streak?.current || 0,
    top10_weeks: streak?.top10Weeks || 0,
    mock_interviews: by.mock_interview?.n || 0,
    interview_readiness: prep?.readiness || 0,
    // Lifetime points earned: a points badge, once reached, stays reached.
    reward_points: wallet?.rewardPointsEarned || 0
  };
};

/**
 * Unlock whatever the student now qualifies for. Returns the newly unlocked
 * badges (already paid and announced).
 */
// eslint-disable-next-line no-unused-vars
const evaluate = async (userId, config) => {
  await seedBadges();
  const [catalogue, owned, stats] = await Promise.all([
    RewardBadge.find({ isActive: true }).sort({ order: 1 }).lean(),
    RewardUserBadge.find({ userId }).distinct('badgeKey'),
    computeStats(userId)
  ]);
  const unlocked = [];
  for (const badge of catalogue) {
    if (owned.includes(badge.key)) continue;
    const value = stats[badge.metric] || 0;
    if (value < badge.target) continue;
    try {
      await RewardUserBadge.create({ userId, badgeKey: badge.key });
    } catch (err) {
      if (isDuplicate(err)) continue;
      throw err;
    }
    await notify(userId, `${badge.emoji} Badge unlocked: ${badge.title}`, badge.description, await linkFor('badges'));
    await celebrate(userId, 'badge', `${badge.title} unlocked!`, badge.description, { key: badge.key, emoji: badge.emoji, rewardPoints: 0, value: 0 });
    unlocked.push({ key: badge.key, title: badge.title, emoji: badge.emoji, rewardPoints: 0 });
  }
  return unlocked;
};

// The full catalogue with this student's progress, for the badges section.
const listForUser = async (userId) => {
  await seedBadges();
  const [catalogue, owned, stats] = await Promise.all([
    RewardBadge.find({ isActive: true }).sort({ order: 1 }).lean(),
    RewardUserBadge.find({ userId }).lean(),
    computeStats(userId)
  ]);
  const ownedAt = Object.fromEntries(owned.map((o) => [o.badgeKey, o.unlockedAt]));
  return catalogue.map((b) => {
    const value = Math.min(stats[b.metric] || 0, b.target);
    return { key: b.key, title: b.title, description: b.description, emoji: b.emoji, metric: b.metric, target: b.target, rewardPoints: 0, unlocked: !!ownedAt[b.key], unlockedAt: ownedAt[b.key] || null, progress: value, percent: Math.round((value / b.target) * 100) };
  });
};

module.exports = { evaluate, listForUser, computeStats };
