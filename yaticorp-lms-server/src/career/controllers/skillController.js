const SkillProgress = require('../models/SkillProgress');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

const getSkills = async (req, res) => {
  try {
    const skills = await SkillProgress.find({ userId: req.user._id });
    res.status(200).json(skills);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getSkills };
