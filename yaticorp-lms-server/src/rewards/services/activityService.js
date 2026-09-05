/**
 * The front door for "the student just did something meaningful".
 *
 *   activity → (dedupe) → XP → streak → milestones → badges → events
 *
 * Every hook in the LMS calls recordActivity; it is safe to call twice for
 * the same thing (the second call is a no-op) and it never throws, because a
 * reward failing must not fail the lesson that earned it.
 */
const { LearningActivity } = require('../models');
const { getConfig } = require('./configService');
const { dayKey } = require('../config/constants');
const { isDuplicate } = require('./tx');
const { addXp } = require('./xpService');
const streakService = require('./streakService');
const badgeService = require('./badgeService');

const DESCRIPTIONS = {
  lesson_complete: 'for completing a lesson',
  quiz_complete: 'for completing a quiz',
  quiz_pass: 'for passing a quiz',
  assignment_complete: 'for completing an assignment',
  course_complete: 'for completing a course',
  certificate_earned: 'for earning a certificate',
  career_task: 'for completing a Career Path task',
  daily_activity: 'for today\'s activity'
};

/**
 * @param {object} p
 * @param {ObjectId} p.userId
 * @param {string} p.type          one of ACTIVITY_TYPES
 * @param {string} p.refId         the lesson/quiz/course/task id
 * @param {string} [p.courseId]
 * @param {object} [p.meta]        e.g. { score: 100 }
 * @param {boolean} [p.skipXp]     the caller already paid XP through addXp
 */
const recordActivity = async ({ userId, type, refId, courseId = null, meta = {}, skipXp = false }) => {
  const config = await getConfig();
  if (!config.enabled) return { enabled: false, duplicate: false, events: [] };
  const day = dayKey();

  let activity;
  try {
    activity = await LearningActivity.create({ userId, type, refId: String(refId), courseId: courseId ? String(courseId) : null, day, meta });
  } catch (err) {
    if (isDuplicate(err)) return { enabled: true, duplicate: true, events: [] };
    throw err;
  }

  const events = [];
  const xpAmount = skipXp ? 0 : Number(config.xpRules[type] || 0);
  let xp = null;
  if (xpAmount > 0) {
    xp = await addXp({ userId, amount: xpAmount, source: type, refId: String(refId), courseId, description: DESCRIPTIONS[type] || '' });
    if (xp && !xp.duplicate) {
      await LearningActivity.updateOne({ _id: activity._id }, { $set: { xpAwarded: xpAmount } });
      events.push({ kind: 'xp', amount: xpAmount, total: xp.xp });
      if (xp.leveledUp) events.push({ kind: 'level_up', level: xp.level });
    }
  }

  const { streak, changed, milestones } = await streakService.touch(userId, day, config);
  if (changed) events.push({ kind: 'streak', current: streak.current, longest: streak.longest });
  for (const m of milestones) events.push({ kind: 'streak_milestone', ...m, currency: config.conversion.currency });

  const badges = await badgeService.evaluate(userId, config);
  for (const b of badges) events.push({ kind: 'badge', ...b });

  return { enabled: true, duplicate: false, events, xp: xp?.xp, level: xp?.level, streak: streak.current };
};

// What every LMS hook actually calls.
const safeRecordActivity = async (params) => {
  try {
    return await recordActivity(params);
  } catch (err) {
    console.error('[rewards] recordActivity failed:', err.message);
    return { enabled: true, duplicate: false, events: [], error: err.message };
  }
};

module.exports = { recordActivity, safeRecordActivity };
