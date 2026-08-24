const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Notification = require('../models/Notification');

// Example Level threshold calculation: Level 2 = 100XP, Level 3 = 300XP, Level 4 = 600XP
const calculateLevel = (xp) => {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  return Math.floor(Math.sqrt(xp / 100)) + 2; // general scaling
};

/**
 * Every badge in the game, in the order they are earned.
 *
 * The thresholds past Skill Master are the real level boundaries from
 * calculateLevel above — 100 * (level - 2)² — so "Reach Level 8" is the actual
 * moment the badge lands rather than a number picked to sound hard.
 *
 * Skill Master used to be the end of the road: a student who passed 1500 XP had
 * nothing left to earn, ever. These continue the ladder.
 */
const BADGE_CATALOGUE = [
  { title: 'First Task Completed', description: 'Complete your very first task.', xpRequired: 10, icon: 'CheckCircle' },
  { title: 'Consistent Learner', description: 'Reach Level 2.', xpRequired: 100, icon: 'TrendingUp' },
  { title: 'Skill Master', description: 'Reach Level 5.', xpRequired: 1500, icon: 'Award' },
  { title: 'Steady Climber', description: 'Reach Level 6.', xpRequired: 1600, icon: 'Flame' },
  { title: 'Deep Focus', description: 'Reach Level 7.', xpRequired: 2500, icon: 'Target' },
  { title: 'Relentless', description: 'Reach Level 8.', xpRequired: 3600, icon: 'Zap' },
  { title: 'Trailblazer', description: 'Reach Level 9.', xpRequired: 4900, icon: 'Rocket' },
  { title: 'Path Finder', description: 'Reach Level 10.', xpRequired: 6400, icon: 'Crown' }
];

// Done once per process rather than on every call — the catalogue cannot change
// while the server is running, and this used to sit in the path of every badge
// read and every XP award.
let catalogueSynced = false;

/**
 * Make sure the database holds the catalogue.
 *
 * Upserted by title, not inserted only when the collection is empty. The old
 * version bailed out the moment a single badge existed, so any badge added to
 * the catalogue afterwards would never reach a database that had already been
 * seeded — which is every database except a brand new one.
 */
const seedBadges = async () => {
  if (catalogueSynced) return;
  await Promise.all(
    BADGE_CATALOGUE.map((badge) =>
      Badge.updateOne({ title: badge.title }, { $set: badge }, { upsert: true })
    )
  );
  catalogueSynced = true;
};

const addXP = async (userId, amount, reason) => {
  await seedBadges();

  const user = await User.findById(userId);
  if (!user) return;

  const oldLevel = user.level;
  user.xp += amount;
  user.level = calculateLevel(user.xp);

  await user.save();

  // Create XP Notification
  await Notification.create({
    userId,
    title: 'XP Earned!',
    message: `You earned ${amount} XP for ${reason}.`,
    type: 'achievement'
  });

  // Check Level Up
  if (user.level > oldLevel) {
    await Notification.create({
      userId,
      title: 'Level Up!',
      message: `Congratulations! You have reached Level ${user.level}!`,
      type: 'achievement'
    });
  }

  // Check Badges based on XP / Level
  const allBadges = await Badge.find();
  for (const badge of allBadges) {
    if (badge.xpRequired > 0 && user.xp >= badge.xpRequired) {
      // check if user already has it
      const hasBadge = await UserBadge.findOne({ userId, badgeId: badge._id });
      if (!hasBadge) {
        await UserBadge.create({ userId, badgeId: badge._id });
        await Notification.create({
          userId,
          title: 'Badge Unlocked!',
          message: `You unlocked the ${badge.title} badge!`,
          type: 'achievement'
        });
      }
    }
  }

};

module.exports = { addXP, seedBadges, calculateLevel, BADGE_CATALOGUE };
