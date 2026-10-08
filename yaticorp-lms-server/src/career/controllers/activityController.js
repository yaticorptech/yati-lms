/**
 * @description The small daily activity on the student dashboard.
 *
 * A puzzle pitched at the class they told Career Path, handed out once a day
 * and never repeated: hand-written puzzles first, then generated ones. It exists to make
 * arriving at the LMS feel like something rather than a list of courses.
 *
 * No AI. See data/activities.js for why.
 */
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const { ACTIVITIES, bandFor, forBand, publicShape } = require('../data/activities');
const { generatedIds, generated } = require('../data/activityGenerators');
const { addXP } = require('../services/gamificationService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// What a correct answer is worth. Small on purpose: this is a warm-up, not a
// route to a level. A task is 10 and a lesson quiz is 20, so five keeps the
// ladder honest — the puzzle should never out-earn the work.
// XP for a right answer: the admin's 'daily_activity' rule (Rewards → Reward rules).
const { xpFor } = require('../../rewards/services/configService');

// The platform's day (Asia/Kolkata unless REWARDS_TIMEZONE says otherwise),
// the same one the streak and the rest of Career Path roll over on. Reading
// the server process's own clock here meant a server running UTC handed out
// the next puzzle at 05:30 in the morning for Indian students.
const { dayKey: platformDayKey } = require('../../rewards/config/constants');
const dayKey = (date = new Date()) => platformDayKey(date);

const byId = new Map(ACTIVITIES.map((a) => [a.id, a]));

/** A hand-written activity, or a generated one rebuilt from its id. */
const findActivity = (id) => byId.get(id) || generated(id);

/**
 * Pick today's activity: something in this band the student has never met.
 *
 * The hand-written ones come first, then the generated ones (thousands a band,
 * see data/activityGenerators.js). A prompt they have already seen is skipped
 * too, so two ids that happen to render the same question cannot both appear.
 *
 * Only if every one has been served does an old one come back — the one whose
 * LAST serving is furthest in the past. (Picking by first serving instead is
 * what used to hand out the same puzzle every day once the ten ran out.)
 */
const chooseFor = async (userId, band) => {
  const pool = forBand(band);

  const seen = await DailyActivity.find({ userId }).select('activityId createdAt').sort({ createdAt: 1 }).lean();
  const seenIds = new Set(seen.map((s) => s.activityId));
  const seenPrompts = new Set([...seenIds].map((id) => findActivity(id)?.prompt).filter(Boolean));
  const unseen = (a) => a && a.band === band && !seenIds.has(a.id) && !seenPrompts.has(a.prompt);

  const fresh = pool.find(unseen);
  if (fresh) return fresh;

  for (const id of generatedIds(band)) {
    const candidate = generated(id);
    if (unseen(candidate)) return candidate;
  }

  // Everything served at least once. Later rows overwrite earlier ones, so
  // this maps each id to its most recent serving.
  const lastServed = new Map();
  seen.forEach((s) => lastServed.set(s.activityId, new Date(s.createdAt).getTime()));
  const stalest = [...lastServed.entries()]
    .filter(([id]) => findActivity(id)?.band === band)
    .sort((a, b) => a[1] - b[1])[0];
  return (stalest && findActivity(stalest[0])) || pool[0] || null;
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

    const activity = findActivity(row.activityId);
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

    const activity = findActivity(row.activityId);
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
        try {
          // Keyed on the student and the day, so two tabs answering at once
          // cannot both be paid even if both got past answeredAt.
          const rule = await xpFor('daily_activity');
          awarded = rule > 0
            ? await addXP(req.user._id, rule, `solving today's ${activity.kind.toLowerCase()}`, { refId: `activity:${req.user._id}:${row.day}` })
            : 0;
          // Counts toward the daily streak; XP was paid just above.
          const { safeRecordActivity } = require('../../rewards/services/activityService');
          await safeRecordActivity({ userId: req.user._id, type: 'daily_activity', refId: `${activity.id || activity.kind}:${req.body.day || ''}`, skipXp: true });
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
