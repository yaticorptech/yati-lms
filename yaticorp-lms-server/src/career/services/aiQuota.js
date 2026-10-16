/**
 * @description How much AI a student — and the whole school — may spend today.
 *
 * The free tier is metered per day, per model. One onboarding costs three calls
 * (roadmap + tasks + recommendations), so a hundred students onboarding on the
 * morning a college is introduced to the platform is three hundred calls before
 * anyone has asked the mentor a single question. Without a cap the first cohort
 * through the door spends the day's budget and everyone after them meets a wall
 * of red errors that says nothing useful.
 *
 * Two limits, both advisory rather than clever:
 *   • per student, so one person cannot drain the day by hammering "regenerate";
 *   • per service, so the day's budget is spent evenly rather than by whoever
 *     logs in first.
 *
 * Neither replaces enabling billing. They make the failure honest and bounded
 * instead of sudden and total.
 */
const AiUsage = require('../models/AiUsage');
const { currentUserId } = require('./aiContext');

/** Generous enough for onboarding (3) plus a full day of planning and mentoring. */
const PER_STUDENT = Number(process.env.CAREER_AI_DAILY_PER_STUDENT || 30);

/**
 * Whole-service ceiling. 0 disables it, which is the right default: a wrong
 * number here locks out every student at once, and the correct number depends
 * on a billing plan only the operator knows.
 */
const PER_SERVICE = Number(process.env.CAREER_AI_DAILY_TOTAL || 0);

/*
 * The allowance runs on the platform's day — the timezone the daily plan, the
 * rewards streak and the leaderboard all turn over in (REWARDS_TIMEZONE,
 * Asia/Kolkata by default). It used to run on the server process's own clock,
 * which only agreed with everything else on a machine set to IST: on a server
 * running UTC the allowance came back at 05:30 in the morning while the plan
 * it pays for turned over at midnight, and the "resets at midnight" the
 * student was told was neither.
 */
const platformDay = require('../../rewards/config/constants');

/** 'YYYY-MM-DD' in the platform timezone — the day the plan and the streak use. */
const dayKey = (date = new Date()) => platformDay.dayKey(new Date(date));

/** The next platform midnight, so the UI can say when the allowance comes back. */
const resetsAt = (now = new Date()) => platformDay.startOfDay(platformDay.addDays(dayKey(now), 1));

/**
 * The next midnight in another timezone. The provider's own free-tier quota
 * turns over at midnight Pacific Time, not at ours, so a refusal from Google
 * reports that moment rather than the platform's.
 */
const nextMidnightIn = (timeZone, now = new Date()) => {
  const key = platformDay.dayKey(now, timeZone);
  return platformDay.startOfDay(platformDay.addDays(key, 1), timeZone);
};

/**
 * Refused because a budget is spent, not because anything is broken.
 *
 * Carries an HTTP status so controllers can hand it straight back — a spent
 * allowance is 429, and reporting it as a 500 would send the operator hunting
 * for a fault that does not exist.
 */
class AiBudgetError extends Error {
  constructor(message, code, at = resetsAt()) {
    super(message);
    this.name = 'AiBudgetError';
    this.status = 429;
    this.code = code;
    this.resetsAt = at;
  }
}

/**
 * What this student has spent today, and what everyone has.
 *
 * Only calls that came back count. A failed call costs the provider nothing,
 * and charging it to the student meant a day whose plan kept failing (a model
 * outage, a reply that would not parse) quietly spent their whole allowance on
 * nothing — and then refused them the retry that would have worked. Failures
 * are still recorded, with `ok: false`, for the operator's view of the day.
 */
const usageToday = async (userId) => {
  const day = dayKey();
  const spent = { day, ok: { $ne: false } };
  const [mine, all] = await Promise.all([
    userId ? AiUsage.countDocuments({ ...spent, userId }) : Promise.resolve(0),
    PER_SERVICE > 0 ? AiUsage.countDocuments(spent) : Promise.resolve(0)
  ]);
  return { day, mine, all };
};

/**
 * Throw if this call cannot be afforded.
 *
 * Called immediately before every Gemini request. A failure to read the meter
 * lets the call through: the cap exists to protect a budget, and enforcing it
 * by breaking the feature when the database hiccups gets that backwards.
 */
const assertWithinBudget = async () => {
  const userId = currentUserId();
  try {
    // A student on their own Gemini key spends their own allowance, not the
    // platform's, so neither cap applies to them.
    if (await require('../../utils/userAiKey').usingOwnKey()) return;
    // Nor to the demo cards, which run on the platform key without an
    // allowance (services/fullAccess.js).
    if (await require('../../services/fullAccess').fullAccessForUserId(userId)) return;

    const { mine, all } = await usageToday(userId);

    if (userId && mine >= PER_STUDENT) {
      throw new AiBudgetError(
        `You have used today's AI allowance (${PER_STUDENT} requests). ` +
        'Your roadmap, plan and past lessons all stay available until it resets.',
        'student-daily-cap'
      );
    }

    if (PER_SERVICE > 0 && all >= PER_SERVICE) {
      throw new AiBudgetError(
        "Career Path has reached today's AI limit for everyone. " +
        'Everything already generated is still here until it resets.',
        'service-daily-cap'
      );
    }
  } catch (error) {
    if (error instanceof AiBudgetError) throw error;
    console.error('[career] Could not read the AI meter, allowing the call:', error.message);
  }
};

/** Record a call that was attempted. Never throws — metering must not break generation. */
const record = async ({ kind = 'unknown', model, ok = true, ms }) => {
  try {
    await AiUsage.create({ userId: currentUserId() || undefined, day: dayKey(), kind, model, ok, ms });
  } catch (error) {
    console.error('[career] Could not record AI usage:', error.message);
  }
};

/** What the student has left today, for the UI to show before they spend it. */
const remainingForStudent = async (userId) => {
  const { mine } = await usageToday(userId);
  // A demo card has no allowance to run out of: report it full.
  if (await require('../../services/fullAccess').fullAccessForUserId(userId)) {
    return { used: mine, limit: PER_STUDENT, remaining: PER_STUDENT, unlimited: true, resetsAt: resetsAt() };
  }
  return {
    used: mine,
    limit: PER_STUDENT,
    remaining: Math.max(0, PER_STUDENT - mine),
    resetsAt: resetsAt()
  };
};

module.exports = {
  assertWithinBudget,
  record,
  usageToday,
  remainingForStudent,
  dayKey,
  resetsAt,
  nextMidnightIn,
  AiBudgetError,
  PER_STUDENT,
  PER_SERVICE
};
