const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const { generateRoadmapFromAI } = require('../services/geminiService');
const { getStudentCourseContext } = require('../services/lmsContext');

const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const PlannerContext = require('../models/PlannerContext');
const Recommendation = require('../models/Recommendation');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

// @desc    Generate a new roadmap for the user's goal
// @route   POST /api/roadmap/generate
// @access  Private
/**
 * Put the roadmap's technical skills on the tracker.
 *
 * Technical only. The tracker's whole meaning is "+5% for every task you
 * finish", which fits a skill you practise; "Resilience under Tight Deadlines"
 * is not something a task ticks off, and mixing them in would make the page
 * read as a personality assessment.
 *
 * Capped, because a list of twenty bars is not a tracker either. Never
 * duplicates: an existing row for the same name is left exactly as it is, so a
 * student who has built progress does not lose it.
 */
const MAX_TRACKED_SKILLS = 8;

const seedSkillTracker = async (userId, roadmapData) => {
  const named = roadmapData?.skills?.technical;
  if (!Array.isArray(named) || !named.length) return 0;

  const names = [...new Set(named.map((s) => String(s || '').trim()).filter(Boolean))]
    .slice(0, MAX_TRACKED_SKILLS);

  await Promise.all(
    names.map((skillName) =>
      SkillProgress.findOneAndUpdate(
        { userId, skillName },
        { $setOnInsert: { userId, skillName, level: 'Beginner', progress: 0 } },
        { upsert: true }
      )
    )
  );
  return names.length;
};

const generateRoadmap = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'No career goal found. Please create a goal first.' });
    }

    // Check if roadmap already exists
    let roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (roadmap) {
      // You could choose to delete the old one or just return it. 
      // Assuming we regenerate and overwrite if called again.
      await Roadmap.findOneAndDelete({ userId: req.user._id });
      
      // Also delete all associated old data to ensure a clean slate for the new career
      await Task.deleteMany({ userId: req.user._id });
      await SkillProgress.deleteMany({ userId: req.user._id });
      await PlannerContext.findOneAndDelete({ userId: req.user._id });
      await Recommendation.deleteMany({ userId: req.user._id });
    }

    // Call Gemini API
    // The roadmap is written knowing which YATICORP courses this student can
    // already open, so a phase it covers points at their own shelf rather than
    // at a platform they would have to go and pay for.
    const { prompt: courseContext } = await getStudentCourseContext(req.user._id);
    const roadmapData = await generateRoadmapFromAI(goal, courseContext);

    // Save to DB
    roadmap = await Roadmap.create({
      userId: req.user._id,
      goalId: goal._id,
      roadmapData
    });

    // Seed the skill tracker from the roadmap that just named these skills.
    //
    // Until now the only thing that ever wrote a SkillProgress row was the
    // legacy POST /tasks/generate, which the app calls from a single
    // empty-state button. A student who used it normally — open the planner,
    // the day generates itself — reached an empty Skills page forever, and
    // could never generate skill study material either, because that looks the
    // skill up on the tracker first.
    //
    // The roadmap is the right source: it already lists the technical skills
    // this path needs, and it is regenerated (and the tracker cleared) together
    // with everything else above.
    await seedSkillTracker(req.user._id, roadmapData);

    res.status(201).json(roadmap);
  } catch (error) {
    console.error('Roadmap Generation Error:', error);
    res.status(error.status || 500).json(aiAwareBody(error, 'Failed to generate roadmap'));
  }
};

// @desc    Get user's roadmap
// @route   GET /api/roadmap
// @access  Private
const getRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ message: 'No roadmap found.' });
    }

    // Repair legacy records in place: a roadmap saved with gaps (Class 12 ticked
    // but Class 11 not) would otherwise keep rendering Class 11 as the current
    // phase every time it loads.
    const repaired = asPrefix(roadmap.completedPhases);
    if (repaired.length !== (roadmap.completedPhases || []).length) {
      roadmap.completedPhases = repaired;
      await roadmap.save();
    }

    res.status(200).json(roadmap);
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

/**
 * Education phases run in sequence, so "completed" is always a prefix of the
 * roadmap: you cannot have finished Class 12 while Class 11 is outstanding.
 *
 * Stored progress is therefore normalised to [0..highest] on both read and
 * write. This also repairs older records written before the rule existed —
 * a saved [7] becomes [0..7] rather than needing a migration.
 */
const asPrefix = (completed = []) => {
  if (!completed.length) return [];
  const highest = Math.max(...completed);
  return Array.from({ length: highest + 1 }, (_, i) => i);
};

// @desc    Toggle a roadmap phase between done and not done
// @route   PATCH /api/roadmap/phase
// @access  Private
const togglePhase = async (req, res) => {
  try {
    const index = Number(req.body.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: 'A non-negative phase index is required.' });
    }

    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ message: 'No roadmap found.' });
    }

    // Reject indices past the end so a stale client cannot store progress
    // against phases that do not exist.
    const phaseCount = roadmap.roadmapData?.educationRoadmap?.length || 0;
    if (index >= phaseCount) {
      return res.status(400).json({ message: 'Phase index is out of range.' });
    }

    // Completing a phase completes everything leading up to it; reopening one
    // reopens everything after it, since you cannot be partway back through
    // Class 11 while Class 12 still counts as finished.
    const wasDone = asPrefix(roadmap.completedPhases).includes(index);
    roadmap.completedPhases = wasDone
      ? Array.from({ length: index }, (_, i) => i)
      : Array.from({ length: index + 1 }, (_, i) => i);

    await roadmap.save();

    res.status(200).json({ completedPhases: roadmap.completedPhases });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    Delete user's roadmap
// @route   DELETE /api/roadmap
// @access  Private
const deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ message: 'No roadmap found to delete.' });
    }
    
    await roadmap.deleteOne();
    res.status(200).json({ message: 'Roadmap deleted successfully.' });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

module.exports = {
  generateRoadmap,
  getRoadmap,
  togglePhase,
  deleteRoadmap
};
