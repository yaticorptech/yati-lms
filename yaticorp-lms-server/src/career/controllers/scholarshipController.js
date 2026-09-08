const Scholarship = require('../models/Scholarship');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const { generateScholarshipsFromAI } = require('../services/geminiService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// @desc    The student's scholarship list, or an empty one if none is built yet
// @route   GET /api/career/scholarships
// @access  Private
const getScholarships = async (req, res) => {
  try {
    const doc = await Scholarship.findOne({ userId: req.user._id }).lean();
    const goal = await Goal.findOne({ userId: req.user._id }).select('careerGoal').lean();
    res.status(200).json({
      items: doc?.items || [],
      generatedAt: doc?.generatedAt || null,
      builtFor: doc?.builtFor || '',
      hasGoal: !!goal
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Build (or rebuild) the student's scholarship list with the AI
// @route   POST /api/career/scholarships/generate
// @access  Private
const generateScholarships = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(400).json({ message: 'Set up your Career Path goal first.' });
    }
    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    const data = await generateScholarshipsFromAI(goal, roadmap);
    const items = (Array.isArray(data?.scholarships) ? data.scholarships : [])
      .filter((s) => s && s.name)
      .map((s) => ({
        name: String(s.name).trim(),
        provider: s.provider ? String(s.provider).trim() : '',
        amount: s.amount ? String(s.amount).trim() : '',
        eligibility: s.eligibility ? String(s.eligibility).trim() : '',
        deadline: s.deadline ? String(s.deadline).trim() : '',
        link: s.link && /^https?:\/\//i.test(String(s.link)) ? String(s.link).trim() : '',
        why: s.why ? String(s.why).trim() : ''
      }));

    const doc = await Scholarship.findOneAndUpdate(
      { userId: req.user._id },
      { items, builtFor: goal.careerGoal || '', generatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();

    res.status(201).json({ items: doc.items, generatedAt: doc.generatedAt, builtFor: doc.builtFor, hasGoal: true });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getScholarships, generateScholarships };
