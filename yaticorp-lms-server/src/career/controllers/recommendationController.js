const Recommendation = require('../models/Recommendation');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const { generateRecommendationsFromAI } = require('../services/geminiService');
const { getStudentCourseContext } = require('../services/lmsContext');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// @desc    Generate recommendations using AI based on goal & roadmap
// @route   POST /api/recommendations/generate
// @access  Private
const generateRecommendations = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    const roadmap = await Roadmap.findOne({ userId: req.user._id });

    if (!goal || !roadmap) {
      return res.status(400).json({ message: 'Roadmap and Goal must exist before generating recommendations.' });
    }

    // Call Gemini API
    const { prompt: courseContext, enrolled, catalogue } = await getStudentCourseContext(req.user._id);
    const recsData = await generateRecommendationsFromAI(goal, roadmap, courseContext);

    // Trust nothing the model says about ids. It is asked to copy them from the
    // list it was given; anything that does not match a real published course is
    // dropped rather than rendered as a dead "Start this course" button.
    const realCourses = new Map(
      [...enrolled, ...catalogue].map((c) => [String(c.courseId), c])
    );
    const enrolledIds = new Set(enrolled.map((c) => String(c.courseId)));
    recsData.yaticorpCourses = (Array.isArray(recsData.yaticorpCourses) ? recsData.yaticorpCourses : [])
      .map((pick) => {
        const course = realCourses.get(String(pick.courseId).trim());
        if (!course) return null;
        return {
          courseId: course.courseId,
          // The stored title is the course's real one, not whatever the model
          // typed — a recommendation must match what they see in the player.
          title: course.title,
          why: pick.why || '',
          when: pick.when || '',
          enrolled: enrolledIds.has(course.courseId),
          progress: course.progress || 0
        };
      })
      .filter(Boolean);

    // Save to DB (upsert)
    const recommendation = await Recommendation.findOneAndUpdate(
      { userId: req.user._id },
      {
        roadmapId: roadmap._id,
        yaticorpCourses: recsData.yaticorpCourses || [],
        colleges: recsData.colleges || [],
        internships: recsData.internships || [],
        courses: recsData.courses || [],
        certifications: recsData.certifications || [],
        books: recsData.books || [],
        scholarships: recsData.scholarships || [],
        youtubeChannels: recsData.youtubeChannels || [],
        practiceResources: recsData.practiceResources || [],
        competitions: recsData.competitions || [],
        communities: recsData.communities || [],
        careerTips: recsData.careerTips || []
      },
      { upsert: true, new: true }
    );

    res.status(201).json(recommendation);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Get user's recommendations
// @route   GET /api/recommendations
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    const recs = await Recommendation.findOne({ userId: req.user._id });
    if (!recs) {
      return res.status(404).json({ message: 'No recommendations found.' });
    }
    res.status(200).json(recs);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Delete user's recommendations
// @route   DELETE /api/recommendations
// @access  Private
const deleteRecommendations = async (req, res) => {
  try {
    const recs = await Recommendation.findOne({ userId: req.user._id });
    if (!recs) {
      return res.status(404).json({ message: 'No recommendations found to delete.' });
    }
    await recs.deleteOne();
    res.status(200).json({ message: 'Recommendations deleted successfully.' });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  generateRecommendations,
  getRecommendations,
  deleteRecommendations
};
