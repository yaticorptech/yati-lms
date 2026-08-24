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

/** 'YYYY-MM-DD' in server-local time — the same day a student would name. */
const dayKey = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Local midnight tonight, so the UI can say when the allowance comes back. */
const resetsAt = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
};

/**
 * Refused because a budget is spent, not because anything is broken.
 *
 * Carries an HTTP status so controllers can hand it straight back — a spent
 * allowance is 429, and reporting it as a 500 would send the operator hunting
 * for a fault that does not exist.
 */
class AiBudgetError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AiBudgetError';
    this.status = 429;
    this.code = code;
    this.resetsAt = resetsAt();
  }
}

/** What this student has spent today, and what everyone has. */
const usageToday = async (userId) => {
  const day = dayKey();
  const [mine, all] = await Promise.all([
    userId ? AiUsage.countDocuments({ userId, day }) : Promise.resolve(0),
    PER_SERVICE > 0 ? AiUsage.countDocuments({ day }) : Promise.resolve(0)
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
    const { mine, all } = await usageToday(userId);

    if (userId && mine >= PER_STUDENT) {
      throw new AiBudgetError(
        `You have used today's AI allowance (${PER_STUDENT} requests). ` +
        'It resets at midnight — your roadmap, plan and past lessons all stay available in the meantime.',
        'student-daily-cap'
      );
    }

    if (PER_SERVICE > 0 && all >= PER_SERVICE) {
      throw new AiBudgetError(
        "Career Path has reached today's AI limit for everyone. " +
        'It resets at midnight. Everything already generated is still here.',
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
  AiBudgetError,
  PER_STUDENT,
  PER_SERVICE
};
