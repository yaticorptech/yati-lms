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
  forum_post: 'for posting in the community forum',
  forum_comment: 'for replying in the community forum',
  resume_upload: 'for uploading your resume',
  part_time_apply: 'for applying for a part-time job',
  scholarship_search: 'for searching for scholarships',
  course_complete: 'for completing a course',
  certificate_earned: 'for earning a certificate',
  career_task: 'for completing a Career Path task',
  daily_activity: 'for today\'s activity',
  interview_prep: 'for preparing for interviews',
  interview_practice: 'for practising an interview question',
  mock_interview: 'for completing a mock interview',
  interview_improved: 'for beating your best interview score',
  interview_challenge: 'for completing the interview challenge',
  global_quiz_win: 'for winning the Global Quiz',
  global_quiz_complete: 'for finishing the Global Quiz',
  roadmap_milestone: 'for completing a roadmap phase',
  task_video_watched: 'for watching a task lesson video',
  profile_picture: 'for adding a profile photo',
  achievement_added: 'for adding an achievement',
  career_onboarding: 'for building your Career Path roadmap',
  day_plan_complete: 'for finishing today\'s plan',
  skill_level_up: 'for levelling up a skill',
  competition_match_win: 'for winning a competition match',
  friendly_game_played: 'for playing a multiplayer game',
  friendly_game_win: 'for winning a multiplayer game',
  course_enroll: 'for enrolling in a course',
  opportunity_profile: 'for setting up your part-time jobs profile',
  organization_join: 'for joining your college on YATICORP',
  bio_strength_full: 'for a complete Learning Bio',
  google_connect: 'for connecting your Google account'
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
  const day = dayKey();

  // The fact is recorded whether or not Rewards is switched on: it is the
  // student's learning history ("Your Progress", the quiz average, the
  // ledger-based badges), not a payout. Returning before this insert while
  // Rewards was off meant every lesson and quiz done in that time was simply
  // never counted, even after Rewards came back on.
  let activity;
  try {
    activity = await LearningActivity.create({ userId, type, refId: String(refId), courseId: courseId ? String(courseId) : null, day, meta });
  } catch (err) {
    if (isDuplicate(err)) return { enabled: config.enabled !== false, duplicate: true, events: [] };
    throw err;
  }

  // Only the payouts — XP, the streak and its milestones, badges — wait on
  // the switch.
  if (!config.enabled) return { enabled: false, duplicate: false, events: [] };

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
