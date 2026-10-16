const UserBadge = require('../models/UserBadge');
const { evaluateBadges } = require('../services/gamificationService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// @desc    Get the badges this user can see: everything earned, plus the next one
// @route   GET /api/badges
// @access  Private
const getBadges = async (req, res) => {
  try {
    // Award anything already deserved but never recorded — and put right any
    // badge given under the old rules (see evaluateBadges).
    //
    // Badges were only ever checked inside addXP, so a badge added to the
    // catalogue after a student had already passed its threshold stayed locked
    // for them forever — they would have had to earn more XP just to be given
    // something they had already earned. Every badge above Skill Master is in
    // exactly that position for existing students, so without this the whole
    // ladder would be invisible to the people furthest along it. The same
    // check now brings old awards in line with the admin's ladder and with
    // "First Task Completed" meaning a task.
    const { badges } = await evaluateBadges(req.user._id);

    const earned = await UserBadge.find({ userId: req.user._id }).select('badgeId createdAt').lean();
    const earnedMap = new Map(earned.map((ub) => [String(ub.badgeId), ub.createdAt]));

    // Show everything earned, plus the single next one to aim at. Anything
    // beyond that is not sent at all — hiding it in the browser would still
    // leave the whole ladder sitting in the network response, and the point is
    // that the next badge is a surprise until the one before it is earned.
    // In catalogue order, which is the order they are earned in. Not cut
    // off at the first locked one: "First Task Completed" is earned by a task
    // and the rest by XP, so a student with the XP for Level 2 and no task
    // finished yet has the second badge without the first.
    const revealed = [];
    let nextShown = false;
    for (const badge of badges) {
      const unlocked = earnedMap.has(String(badge._id));
      if (!unlocked && nextShown) continue;
      if (!unlocked) nextShown = true;
      revealed.push({
        _id: badge._id,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        // On the admin's ladder as it stands; 0 for "First Task Completed",
        // which is earned by a task rather than by XP.
        xpRequired: badge.xpRequired,
        level: badge.level || null,
        rule: badge.rule || null,
        unlocked,
        unlockedAt: earnedMap.get(String(badge._id)) || null
      });
    }

    res.status(200).json(revealed);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getBadges };
