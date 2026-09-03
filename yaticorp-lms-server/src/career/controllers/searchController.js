/**
 * @description Search across the student's own Career Path material.
 *
 * A separate endpoint rather than an extension of the LMS `searchContent`, on
 * purpose. The rule this port has followed throughout is that Career Path may
 * read the LMS and never the other way round — see services/lmsContext.js. Had
 * the LMS search reached into career_* collections, that would be the first
 * edge pointing back, and the two halves would stop being separable. The
 * sidebar calls both endpoints and merges the results instead.
 *
 * Everything here is scoped to req.user: a search must never surface another
 * student's roadmap.
 */
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// Enough to be useful in a dropdown, few enough that the panel stays scannable.
const PER_GROUP = 5;

/** Escape a user's query so a stray "(" or "*" cannot break the regex. */
const safeRegex = (q) => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// @desc    Search this student's roadmap phases, tasks and skills
// @route   GET /api/career/search?q=
// @access  Private
const searchCareer = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ phases: [], tasks: [], skills: [] });

    const regex = safeRegex(q);
    const userId = req.user._id;

    const [roadmap, tasks, skills, goal] = await Promise.all([
      Roadmap.findOne({ userId }).select('roadmapData completedPhases').lean(),
      Task.find({ userId, $or: [{ title: regex }, { description: regex }] })
        .select('title status assignedDate')
        .sort({ assignedDate: -1 })
        .limit(PER_GROUP)
        .lean(),
      SkillProgress.find({ userId, skillName: regex })
        .select('skillName level progress')
        .limit(PER_GROUP)
        .lean(),
      Goal.findOne({ userId }).select('careerGoal').lean()
    ]);

    // Roadmap phases live inside a JSON blob rather than their own collection,
    // so they are filtered here rather than by the database. The array is a
    // dozen entries at most — one student's roadmap — so this is cheap.
    const done = new Set(roadmap?.completedPhases || []);
    const phases = (roadmap?.roadmapData?.educationRoadmap || [])
      .map((phase, index) => ({ phase, index }))
      .filter(({ phase }) =>
        regex.test(phase?.phase || '') ||
        regex.test(phase?.title || '') ||
        regex.test(phase?.focus || '') ||
        regex.test(phase?.description || '')
      )
      .slice(0, PER_GROUP)
      .map(({ phase, index }) => ({
        index,
        title: phase.phase || phase.title || `Phase ${index + 1}`,
        focus: phase.focus || phase.description || '',
        completed: done.has(index)
      }));

    res.json({
      phases,
      tasks: tasks.map((t) => ({ _id: t._id, title: t.title, status: t.status })),
      skills: skills.map((s) => ({
        _id: s._id,
        skillName: s.skillName,
        level: s.level,
        progress: s.progress
      })),
      careerGoal: goal?.careerGoal || null
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { searchCareer };
