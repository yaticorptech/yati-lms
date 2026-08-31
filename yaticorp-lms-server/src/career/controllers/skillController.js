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

const updateSkill = async (req, res) => {
  try {
    const skill = await SkillProgress.findOne({ _id: req.params.id, userId: req.user._id });
    if (!skill) return res.status(404).json({ message: 'Skill not found' });

    skill.progress = req.body.progress !== undefined ? req.body.progress : skill.progress;
    skill.level = req.body.level || skill.level;
    skill.lastUpdated = Date.now();
    
    await skill.save();
    res.status(200).json(skill);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getSkills, updateSkill };
