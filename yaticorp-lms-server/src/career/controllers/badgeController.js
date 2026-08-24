const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const User = require('../models/User');
const { seedBadges } = require('../services/gamificationService');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

// @desc    Get the badges this user can see: everything earned, plus the next one
// @route   GET /api/badges
// @access  Private
const getBadges = async (req, res) => {
  try {
    await seedBadges();

    const [badges, user] = await Promise.all([
      Badge.find().sort({ xpRequired: 1 }),
      User.findById(req.user._id).select('xp')
    ]);
    const xp = user?.xp || 0;

    let earned = await UserBadge.find({ userId: req.user._id });
    const earnedIds = new Set(earned.map((ub) => String(ub.badgeId)));

    // Award anything already deserved but never recorded.
    //
    // Badges were only ever checked inside addXP, so a badge added to the
    // catalogue after a student had already passed its threshold stayed locked
    // for them forever — they would have had to earn more XP just to be given
    // something they had already earned. Every badge above Skill Master is in
    // exactly that position for existing students, so without this the whole
    // ladder would be invisible to the people furthest along it.
    const owed = badges.filter(
      (b) => b.xpRequired > 0 && xp >= b.xpRequired && !earnedIds.has(String(b._id))
    );
    if (owed.length) {
      await Promise.all(
        owed.map((b) =>
          UserBadge.create({ userId: req.user._id, badgeId: b._id }).catch(() => {
            // A concurrent request may have just awarded it. Losing that race
            // is the correct outcome, not an error.
          })
        )
      );
      earned = await UserBadge.find({ userId: req.user._id });
    }

    const earnedMap = new Map(earned.map((ub) => [String(ub.badgeId), ub.createdAt]));

    // Show everything earned, plus the single next one to aim at. Anything
    // beyond that is not sent at all — hiding it in the browser would still
    // leave the whole ladder sitting in the network response, and the point is
    // that the next badge is a surprise until the one before it is earned.
    const revealed = [];
    for (const badge of badges) {
      const unlocked = earnedMap.has(String(badge._id));
      revealed.push({
        _id: badge._id,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        xpRequired: badge.xpRequired,
        unlocked,
        unlockedAt: earnedMap.get(String(badge._id)) || null
      });
      if (!unlocked) break;
    }

    res.status(200).json(revealed);
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

module.exports = { getBadges };
