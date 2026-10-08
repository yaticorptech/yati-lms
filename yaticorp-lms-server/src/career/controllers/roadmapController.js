const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const { generateRoadmapFromAI, completedStageIndices } = require('../services/geminiService');
const { getStudentCourseContext } = require('../services/lmsContext');

const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const PlannerContext = require('../models/PlannerContext');
const Recommendation = require('../models/Recommendation');
const MilestoneBadge = require('../models/MilestoneBadge');
const DailyPlan = require('../models/DailyPlan');
const { startOfDay } = require('../services/dailyPlanService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

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
// One definition, on the model, so the other writer cannot disagree with it.
const MAX_TRACKED_SKILLS = SkillProgress.MAX_TRACKED;

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

/**
 * Refuse to replace a roadmap the student did not ask to replace.
 *
 * POST /generate used to overwrite whatever was there, and every caller that
 * reached it by accident — a retry on onboarding, a stale "Map my journey"
 * button shown after a failed load — threw away the roadmap, its tasks and its
 * tracked skills. Replacing one is now an explicit `{ rebuild: true }`, which
 * only the Settings page's "Delete and rebuild" sends.
 *
 * Mounted before the wallet charge as well as checked inside the controller:
 * a refused rebuild should never be priced, even if a refund would follow.
 */
const ROADMAP_EXISTS = 'ROADMAP_EXISTS';

const wantsRebuild = (req) => req.body?.rebuild === true;

const refuseExisting = (res) =>
  res.status(409).json({
    code: ROADMAP_EXISTS,
    message: 'You already have a roadmap. Rebuild it from Settings if you want a new one.'
  });

const requireRebuildConsent = async (req, res, next) => {
  try {
    if (!wantsRebuild(req) && (await Roadmap.exists({ userId: req.user._id }))) {
      return refuseExisting(res);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Throw out everything that belonged to the roadmap being replaced.
 *
 * Only ever called once the new roadmap is in hand. It used to run before the
 * Gemini call, so a quota 429, a timeout or a reply that would not parse left
 * the student with no roadmap, no tasks and no skills — the rebuild failed and
 * took the old journey with it.
 *
 * Milestone badges are deliberately not here: each one is a public share link
 * the student may already have posted, and it renders from its own snapshot.
 */
const clearOldJourney = async (userId) => {
  await Roadmap.findOneAndDelete({ userId });
  await Task.deleteMany({ userId });
  await SkillProgress.deleteMany({ userId });
  await PlannerContext.findOneAndDelete({ userId });
  await Recommendation.deleteMany({ userId });
  // Today's planner claim. The day is claimed once and then only read, so
  // with the claim left in place the planner sat empty for the rest of the
  // day — its tasks were just deleted above, and nothing would build new ones
  // until tomorrow. Earlier days stay: they number the student's days.
  await DailyPlan.deleteMany({ userId, date: { $gte: startOfDay() } });
};

const generateRoadmap = async (req, res) => {
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'No career goal found. Please create a goal first.' });
    }

    const existing = await Roadmap.exists({ userId: req.user._id });
    if (existing && !wantsRebuild(req)) return refuseExisting(res);

    // Call Gemini API
    // The roadmap is written knowing which YATICORP courses this student can
    // already open, so a phase it covers points at their own shelf rather than
    // at a platform they would have to go and pay for.
    const { prompt: courseContext } = await getStudentCourseContext(req.user._id);
    const roadmapData = await generateRoadmapFromAI(goal, courseContext);

    // A reply with no phases is not a roadmap, and saving it would replace a
    // real one with an empty page. 502: the model answered, but not usefully —
    // and a 5xx is what makes the wallet refund the charge.
    const phases = roadmapData?.educationRoadmap;
    if (!Array.isArray(phases) || !phases.length) {
      return res.status(502).json({
        message: 'The AI returned a roadmap with no phases. Nothing was changed — please try again.'
      });
    }

    // generateRoadmapFromAI has already stripped finished stages against this
    // goal, so the read-time repair below has nothing to do for this record.
    roadmapData.stageRepair = STAGE_REPAIR_VERSION;

    if (existing) await clearOldJourney(req.user._id);

    // Save to DB
    const roadmap = await Roadmap.create({
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
    res.status(statusFor(error)).json(aiAwareBody(error, 'Failed to generate roadmap'));
  }
};

/**
 * Which version of the stage repair below a roadmap has been through.
 *
 * Stored inside roadmapData (a free-form object, so no schema change) and set
 * at generation, since generateRoadmapFromAI already strips the same phases.
 * The repair used to run on every GET against the CURRENT goal: a student who
 * later edited their goal had real phases spliced out of a roadmap written for
 * the old one, their progress shifted, and the badges on those phases deleted
 * — killing /b/<code> links they had already posted. Running it once per
 * roadmap fixes the legacy records it exists for and then leaves them alone.
 */
const STAGE_REPAIR_VERSION = 1;

/**
 * Drop phases a saved roadmap should never have contained.
 *
 * The prompt now refuses to write them, but a roadmap generated before that
 * is already in the database with the phase in it — an MCA Year 2 student
 * carrying a "Postgraduate Year 1: MCA Advanced Specialisation" phase after
 * their own final year, which is the degree they are two semesters from
 * finishing. Regenerating would fix it and cost a Gemini call and every task,
 * skill and badge the student has built against the roadmap they have. This
 * repairs the record in place instead, the same way gaps in `completedPhases`
 * are repaired above it.
 *
 * Phase indices are the roadmap's only identifier for a phase: progress is a
 * list of them, and every milestone badge stores one. Removing a phase from
 * the middle therefore has to shift both, or a student's finished phases and
 * their badges quietly slide onto the wrong entries.
 *
 * Badges are never deleted. A badge is a public, permanent link; if the
 * student earned one for a phase this would drop, that phase is evidently
 * real to them, and the roadmap is left exactly as it is.
 */
const dropCompletedStages = async (roadmap, goal) => {
  if (roadmap.roadmapData?.stageRepair >= STAGE_REPAIR_VERSION) return false;

  // Recorded without touching updatedAt: marking a record as checked is not a
  // change to the roadmap the student would want to see dated.
  const markDone = () =>
    Roadmap.updateOne(
      { _id: roadmap._id },
      { $set: { 'roadmapData.stageRepair': STAGE_REPAIR_VERSION } },
      { timestamps: false }
    );

  const phases = roadmap.roadmapData?.educationRoadmap;
  const drop = completedStageIndices(phases, goal);
  if (!drop.length) {
    await markDone();
    return false;
  }

  const badged = await MilestoneBadge.exists({
    userId: roadmap.userId, roadmapId: roadmap._id, phaseIndex: { $in: drop }
  });
  if (badged) {
    await markDone();
    return false;
  }

  const dropped = new Set(drop);
  // Where an index lands once the phases before it are gone.
  const shift = (i) => i - drop.filter((d) => d < i).length;

  roadmap.roadmapData = {
    ...roadmap.roadmapData,
    educationRoadmap: phases.filter((_, i) => !dropped.has(i)),
    stageRepair: STAGE_REPAIR_VERSION
  };
  // Mongoose cannot see a mutation inside a free-form Object field.
  roadmap.markModified('roadmapData');
  roadmap.completedPhases = (roadmap.completedPhases || [])
    .filter((i) => !dropped.has(i))
    .map(shift);
  await roadmap.save();

  // The badges after a removed phase move down with it. No badge sits on a
  // removed index (checked above), and they are shifted in ascending order, so
  // each index a badge moves into is already free before the unique
  // { userId, roadmapId, phaseIndex } index is asked to accept it. The share
  // code and the snapshot title do not change, so posted links keep working.
  const survivors = await MilestoneBadge
    .find({ userId: roadmap.userId, roadmapId: roadmap._id })
    .select('phaseIndex')
    .sort({ phaseIndex: 1 })
    .lean();
  for (const badge of survivors) {
    const moved = shift(badge.phaseIndex);
    if (moved === badge.phaseIndex) continue;
    // updateOne rather than save(): this touches one field, and re-validating
    // the whole document would fail the repair on any badge written before a
    // field became required — exactly the old records this exists to fix.
    await MilestoneBadge.updateOne({ _id: badge._id }, { $set: { phaseIndex: moved } });
  }

  console.warn(
    `Repaired roadmap ${roadmap._id}: removed ${drop.length} already-completed phase(s).`
  );
  return true;
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

    // Likewise for a phase the student had already finished when the roadmap
    // was written. Needs the goal, since what counts as already-finished is
    // decided by where the student actually is — and the year, since a PG
    // "Year N" phase is only finished when N is behind them. Runs once per
    // roadmap; see STAGE_REPAIR_VERSION.
    const goal = await Goal.findOne({ userId: req.user._id }).select('educationLevel currentYear').lean();
    if (goal) await dropCompletedStages(roadmap, goal);

    res.status(200).json(roadmap);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

/**
 * Stored progress is normalised to [0..highest] on both read and write. This
 * also repairs older records written before the rule existed — a saved [7]
 * becomes [0..7] rather than needing a migration.
 *
 * The rule itself lives on the model, because the milestone list needs it too.
 */
const asPrefix = Roadmap.completedPrefix;

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
    res.status(statusFor(error)).json(aiAwareBody(error));
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
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  requireRebuildConsent,
  ROADMAP_EXISTS,
  generateRoadmap,
  getRoadmap,
  togglePhase,
  deleteRoadmap
};
