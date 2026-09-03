/**
 * @description The small daily activity on the student dashboard.
 *
 * A puzzle pitched at the class they told Career Path, handed out once a day
 * and never repeated until the whole band has been seen. It exists to make
 * arriving at the LMS feel like something rather than a list of courses.
 *
 * No AI. See data/activities.js for why.
 */
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const { ACTIVITIES, bandFor, forBand, publicShape } = require('../data/activities');
const { addXP } = require('../services/gamificationService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// What a correct answer is worth. Small on purpose: this is a warm-up, not a
// route to a level. A task is 10 and a lesson quiz is 20, so five keeps the
// ladder honest — the puzzle should never out-earn the work.
const ACTIVITY_XP = 5;

/** The student's own calendar day, not the server's. */
const dayKey = (date = new Date()) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

const byId = new Map(ACTIVITIES.map((a) => [a.id, a]));

/**
 * Pick today's activity: the first one in this band the student has not met.
 *
 * When they have seen every one, the least recently served comes back rather
 * than the feature simply stopping. Ten a band is a fortnight of novelty and
 * then a slow rotation, which is a better failure than an empty panel.
 */
const chooseFor = async (userId, band) => {
  const pool = forBand(band);
  if (!pool.length) return null;

  const seen = await DailyActivity.find({ userId }).select('activityId createdAt').sort({ createdAt: 1 }).lean();
  const seenIds = new Set(seen.map((s) => s.activityId));

  const fresh = pool.find((a) => !seenIds.has(a.id));
  if (fresh) return fresh;

  const oldestFirst = seen.map((s) => s.activityId).filter((id) => byId.get(id)?.band === band);
  return byId.get(oldestFirst[0]) || pool[0];
};

// @desc    Today's activity for this student
// @route   GET /api/career/activity
// @access  Private
const getTodaysActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const goal = await Goal.findOne({ userId }).select('educationLevel').lean();

    // No class on file means no way to pitch a puzzle at the right level, and
    // guessing would put an aptitude question in front of a Class 5 child.
    const band = goal ? bandFor(goal.educationLevel) : null;
    if (!band) return res.status(200).json({ eligible: false });

    const day = dayKey();
    let row = await DailyActivity.findOne({ userId, day });

    if (!row) {
      const chosen = await chooseFor(userId, band);
      if (!chosen) return res.status(200).json({ eligible: false });
      try {
        row = await DailyActivity.create({ userId, day, activityId: chosen.id, band });
      } catch (error) {
        // Another tab claimed today first. Read theirs rather than competing.
        if (error?.code !== 11000) throw error;
        row = await DailyActivity.findOne({ userId, day });
      }
    }

    const activity = byId.get(row.activityId);
    if (!activity) return res.status(200).json({ eligible: false });

    res.status(200).json({
      eligible: true,
      // Already answered today: the panel stays away rather than showing a
      // puzzle they have solved. Tomorrow brings a different one.
      done: Boolean(row.answeredAt),
      activity: publicShape(activity),
      // So the panel can say which day's activity this is without a second call.
      day
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Answer today's activity
// @route   POST /api/career/activity/answer
// @access  Private
const answerTodaysActivity = async (req, res) => {
  try {
    const chosen = req.body.chosen;
    if (!Number.isInteger(chosen)) {
      return res.status(400).json({ message: 'Pick one of the options.' });
    }

    const row = await DailyActivity.findOne({ userId: req.user._id, day: dayKey() });
    if (!row) return res.status(404).json({ message: 'No activity for today yet.' });

    const activity = byId.get(row.activityId);
    if (!activity) return res.status(404).json({ message: 'That activity no longer exists.' });
    if (chosen < 0 || chosen >= activity.options.length) {
      return res.status(400).json({ message: 'Pick one of the options.' });
    }

    // Graded once. Re-posting reports the first answer rather than letting a
    // student try every option until the panel says well done.
    let awarded = 0;
    if (!row.answeredAt) {
      row.answeredAt = new Date();
      row.chosen = chosen;
      row.correct = chosen === activity.answer;
      await row.save();

      // Paid inside the same guard as the grading, so it can only ever happen
      // on the first answer of the day — and only for a right one. Routed
      // through addXP rather than writing the field directly, so the level, the
      // badge check and the notification all behave exactly as they do when a
      // task or a lesson quiz pays out.
      if (row.correct) {
        awarded = ACTIVITY_XP;
        try {
          await addXP(req.user._id, ACTIVITY_XP, `solving today's ${activity.kind.toLowerCase()}`);
        } catch (error) {
          // The student answered correctly; that is the part that matters. A
          // gamification failure must not turn their right answer into an error.
          console.error('[career] activity XP award failed:', error.message);
          awarded = 0;
        }
      }
    }

    res.status(200).json({
      correct: row.correct,
      xpAwarded: awarded,
      // Revealed only now, with the reason — the activity is a moment of
      // learning, so getting it wrong should still teach something.
      answer: activity.answer,
      why: activity.why,
      alreadyAnswered: row.chosen !== chosen
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getTodaysActivity, answerTodaysActivity, dayKey };
