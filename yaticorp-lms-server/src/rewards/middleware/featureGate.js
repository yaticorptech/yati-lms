/**
 * The lock on the rewards section, modelled on the Career Path gate: an admin
 * can close it from Platform Settings, and a hidden tab is not a closed door,
 * so the check lives in front of every student route here.
 */
const { isEnabled, invalidate } = require('../services/configService');

const requireRewardsEnabled = async (req, res, next) => {
  try {
    if (await isEnabled()) return next();
    return res.status(403).json({ code: 'REWARDS_LOCKED', message: 'Rewards are currently unavailable. Please check back later.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { requireRewardsEnabled, invalidateRewardsSetting: invalidate };
