/**
 * Achievements. Each badge names a metric and a target; when the metric gets
 * there the badge unlocks once (unique index) and pays its points once
 * (claim key).
 */
const User = require('../../models/User');
const { RewardBadge, RewardUserBadge, LearningActivity, Streak } = require('../models');
const { seedBadges } = require('./configService');
const { awardPoints } = require('./rewardPointsService');
const { isDuplicate } = require('./tx');
const { notify, celebrate } = require('./notify');
const { pointsToMoney } = require('./eligibility');

const computeStats = async (userId) => {
  const [user, streak, counts] = await Promise.all([
    User.findById(userId).select('xp level').lean(),
    Streak.findOne({ userId }).lean(),
    LearningActivity.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', n: { $sum: 1 }, perfect: { $sum: { $cond: [{ $eq: ['$meta.score', 100] }, 1, 0] } } } }
    ])
  ]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c]));
  return {
    lessons: by.lesson_complete?.n || 0,
    quizzes: by.quiz_complete?.n || 0,
    perfect_quizzes: by.quiz_complete?.perfect || 0,
    courses: by.course_complete?.n || 0,
    certificates: by.certificate_earned?.n || 0,
    xp: user?.xp || 0,
    level: user?.level || 1,
    longest_streak: streak?.longest || 0,
    current_streak: streak?.current || 0,
    top10_weeks: streak?.top10Weeks || 0
  };
};

/**
 * Unlock whatever the student now qualifies for. Returns the newly unlocked
 * badges (already paid and announced).
 */
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
    const paid = badge.rewardPoints > 0 ? await awardPoints({ userId, points: badge.rewardPoints, source: 'badge', claimKey: `badge:${badge.key}`, description: `${badge.title} badge`, meta: { badgeKey: badge.key }, quiet: true }) : null;
    await notify(userId, `${badge.emoji} Badge unlocked: ${badge.title}`, `${badge.description}${paid ? ` +${badge.rewardPoints} reward points.` : ''}`);
    await celebrate(userId, 'badge', `${badge.title} unlocked!`, badge.description, { key: badge.key, emoji: badge.emoji, rewardPoints: paid ? badge.rewardPoints : 0, value: paid ? pointsToMoney(badge.rewardPoints, config) : 0 });
    unlocked.push({ key: badge.key, title: badge.title, emoji: badge.emoji, rewardPoints: paid ? badge.rewardPoints : 0 });
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
    return { key: b.key, title: b.title, description: b.description, emoji: b.emoji, metric: b.metric, target: b.target, rewardPoints: b.rewardPoints, unlocked: !!ownedAt[b.key], unlockedAt: ownedAt[b.key] || null, progress: value, percent: Math.round((value / b.target) * 100) };
  });
};

module.exports = { evaluate, listForUser, computeStats };
