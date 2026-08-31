const StudyMaterial = require('../models/StudyMaterial');
const SkillProgress = require('../models/SkillProgress');
const Goal = require('../models/Goal');
const { generateStudyMaterialFromAI } = require('../services/geminiService');
const { ensureMinimumQuiz } = require('../services/quizService');
const { addXP } = require('../services/gamificationService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// XP for a quiz is awarded once, on the first pass, so replaying an easy quiz
// cannot be farmed for levels.
const QUIZ_PASS_MARK = 0.6;
const QUIZ_XP = 25;

/**
 * Strip the answer key before sending a quiz to the browser. Grading happens on
 * the server; shipping correctIndex to the client would put every answer in the
 * page source.
 */
const publicView = (material) => {
  const doc = material.toObject ? material.toObject() : material;
  return {
    ...doc,
    quiz: (doc.quiz || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options
    }))
  };
};

// @desc    Get all study material for the logged-in user
// @route   GET /api/study
// @access  Private
const getStudyMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ userId: req.user._id }).sort({ skillName: 1 });
    res.status(200).json(materials.map(publicView));
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Generate (or regenerate) study material for one skill
// @route   POST /api/study/generate
// @access  Private
const generateStudyMaterial = async (req, res) => {
  try {
    // Type-checked before trimming. A JSON body can carry an object where a
    // string is expected — `{"skillName": {"$ne": null}}` — and calling .trim()
    // on it threw a TypeError that surfaced as a 500, reporting a server fault
    // for what is simply a malformed request.
    const skillName = typeof req.body.skillName === 'string' ? req.body.skillName.trim() : '';
    if (!skillName) {
      return res.status(400).json({ message: 'A skillName is required.' });
    }

    // Only generate for skills the user is actually tracking — otherwise this
    // endpoint is an open prompt into the Gemini quota.
    const skill = await SkillProgress.findOne({ userId: req.user._id, skillName });
    if (!skill) {
      return res.status(404).json({ message: 'That skill is not on your tracker.' });
    }

    const goal = await Goal.findOne({ userId: req.user._id });
    const generated = await generateStudyMaterialFromAI(skillName, goal, skill.level);

    // Drop questions that cannot be answered, then top the quiz back up to the
    // minimum if the model returned fewer than it was asked for.
    const quiz = await ensureMinimumQuiz(generated.quiz, {
      topic: skillName,
      notes: generated.notes
    });

    const material = await StudyMaterial.findOneAndUpdate(
      { userId: req.user._id, skillName },
      {
        userId: req.user._id,
        skillName,
        notes: generated.notes || {},
        videos: generated.videos || [],
        quiz,
        // Regenerating replaces the questions, so previous scores no longer
        // describe this quiz.
        bestScore: 0,
        attempts: 0,
        lastAttemptAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(publicView(material));
  } catch (error) {
    console.error('Study material generation error:', error);
    res.status(statusFor(error)).json(aiAwareBody(error, 'Failed to generate study material.'));
  }
};

// @desc    Submit quiz answers and get graded results
// @route   POST /api/study/:id/quiz
// @access  Private
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array.' });
    }

    const material = await StudyMaterial.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!material) {
      return res.status(404).json({ message: 'Study material not found.' });
    }
    if (!material.quiz?.length) {
      return res.status(400).json({ message: 'This material has no quiz.' });
    }

    const results = material.quiz.map((q, i) => {
      const selected = answers[i];
      return {
        selected: Number.isInteger(selected) ? selected : null,
        correctIndex: q.correctIndex,
        correct: selected === q.correctIndex,
        explanation: q.explanation
      };
    });

    const score = results.filter((r) => r.correct).length;
    const total = material.quiz.length;
    const passed = score / total >= QUIZ_PASS_MARK;

    // First pass only — a quiz already beaten cannot be re-farmed for XP.
    const earnsXp = passed && material.bestScore / total < QUIZ_PASS_MARK;

    material.attempts += 1;
    material.lastAttemptAt = new Date();
    material.bestScore = Math.max(material.bestScore, score);
    await material.save();

    if (earnsXp) {
      await addXP(req.user._id, QUIZ_XP, `passing the ${material.skillName} quiz`);
    }

    res.status(200).json({
      score,
      total,
      passed,
      xpAwarded: earnsXp ? QUIZ_XP : 0,
      bestScore: material.bestScore,
      attempts: material.attempts,
      results
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  getStudyMaterials,
  generateStudyMaterial,
  submitQuiz
};
