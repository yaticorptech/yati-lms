const Achievement = require('../models/Achievement');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

const getAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({ userId: req.user._id }).sort({ unlockedAt: -1 });
    res.status(200).json(achievements);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getAchievements };
