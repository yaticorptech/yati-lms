/**
 * @description What the signed-in student has left of today's AI allowance.
 *
 * Shown before they spend it rather than only after it runs out. "3 AI requests
 * left today" lets a student decide to save them for the mentor; discovering
 * the same fact as a red error after clicking Regenerate does not.
 */
const { remainingForStudent } = require('../services/aiQuota');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

// @desc    Today's AI allowance for this student
// @route   GET /api/career/ai-usage
// @access  Private
const getMyAiUsage = async (req, res) => {
  try {
    res.status(200).json(await remainingForStudent(req.user._id));
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

module.exports = { getMyAiUsage };
