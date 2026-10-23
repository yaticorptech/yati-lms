const User = require('../models/User');
const Achievement = require('../models/Achievement');
const SkillProgress = require('../models/SkillProgress');
const Task = require('../models/Task');
const { addXP, evaluateBadges } = require('./gamificationService');
const { tokenise, overlapScore } = require('./lmsContext');

// XP for a finished task: the admin's 'career_task' rule (Rewards → Reward rules).
const { xpFor } = require('../../rewards/services/configService');

// How much one finished task moves the skill it was about. Twenty tasks on the
// same skill take it from nothing to the next level, which is a real amount of
// work for a real promotion.
const SKILL_STEP = 5;

/**
 * A task carrying no tag can still be matched by what it is about, but only on
 * strong evidence. `overlapScore` already refuses anything under two shared
 * words, and this sits above its own lesson-matching threshold: crediting the
 * wrong skill is worse than crediting none, because the skill profile is what
 * the job matcher shows to employers.
 */
const SKILL_MATCH_THRESHOLD = 0.5;

/**
 * The one skill a completed task advances — or none.
 *
 * The tag written at generation time is the real mechanism; it names a tracked
 * skill exactly, having been validated against the student's own list. The
 * token match is only a fallback for tasks written before tagging existed, and
 * is deliberately strict enough to decline most of the time.
 */
const skillAdvancedBy = (task, skills) => {
  if (task.skill) {
    const wanted = String(task.skill).trim().toLowerCase();
    const tagged = skills.find((s) => s.skillName.toLowerCase() === wanted);
    if (tagged) return tagged;
  }

  const taskTokens = tokenise(`${task.title || ''} ${task.description || ''}`);
  let best = null;
  let bestScore = 0;
  for (const skill of skills) {
    const score = overlapScore(taskTokens, tokenise(skill.skillName));
    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }
  return bestScore >= SKILL_MATCH_THRESHOLD ? best : null;
};

/**
 * Everything that happens *because* a task was completed: XP, achievements,
 * skill progress, activity stamp.
 *
 * Extracted from taskController so the manual tick and the automatic
 * completion at the end of a lesson run the identical path. Two copies of this
 * would drift, and the drift would be silent — a student who finished via the
 * lesson would quietly earn different XP from one who ticked the box.
 *
 * Failures here are logged, never thrown: a gamification problem must not fail
 * the request that completed the task, or the student loses the completion too.
 */
const runCompletionSideEffects = async (userId, task) => {
  // What was actually paid, so the caller can report it rather than the rule.
  let xpPaid = 0;
  try {
    await User.findByIdAndUpdate(userId, { lastActiveDate: new Date() });

    const tasksCompleted = await Task.countDocuments({ userId, status: 'Completed' });

    const checkAndAward = async (title, description) => {
      const exists = await Achievement.findOne({ userId, title });
      if (!exists) await Achievement.create({ userId, title, description });
    };

    if (tasksCompleted === 1) await checkAndAward('First Step', 'Completed your very first task.');
    if (tasksCompleted === 10) await checkAndAward('Getting Serious', 'Completed 10 tasks.');

    // Keyed on the task, so the ledger refuses a second payout for it even if
    // two completions race past the creditedAt check below.
    const taskXp = await xpFor('career_task');
    if (taskXp > 0) xpPaid = await addXP(userId, taskXp, `completing "${task.title}"`, { refId: `task:${task._id}` });
    // "First Task Completed" is earned by the task, not by XP, so it lands
    // even when nothing was paid (a rule of 0). addXP checks the badges only
    // when it pays.
    if (!xpPaid) await evaluateBadges(userId, { announce: true });

    // A finished task is a meaningful learning activity: it advances the
    // daily streak and counts toward badges. XP was paid just above, so the
    // activity is recorded without paying it again.
    const { safeRecordActivity } = require('../../rewards/services/activityService');
    await safeRecordActivity({ userId, type: 'career_task', refId: task._id, skipXp: true });

    // XP rule (optional): every task in today's plan done, once a day. Only a
    // finished day counts; a skipped task leaves it unfinished.
    const { recordIfRuled } = require('../../rewards/services/xpHooks');
    const { startOfDay, addDays } = require('./dailyPlanService');
    const dayStart = startOfDay();
    const todays = await Task.find({ userId, assignedDate: { $gte: dayStart, $lt: addDays(dayStart, 1) } }).select('status').lean();
    if (todays.length && todays.every((t) => t.status === 'Completed')) {
      await recordIfRuled({ userId, type: 'day_plan_complete', refId: `day:${require('../../rewards/config/constants').dayKey()}` });
    }

    // ONE skill, the one this task was about. This loop used to run over every
    // skill the student had, so a task on SQL joins advanced their public
    // speaking by the same five points and the whole tracker read as a single
    // identical number. A task that advances nothing simply advances nothing.
    const skills = await SkillProgress.find({ userId });
    const skill = skillAdvancedBy(task, skills);

    if (skill) {
      const levelBefore = skill.level;
      skill.progress = Math.min((Number(skill.progress) || 0) + SKILL_STEP, 100);

      if (skill.progress === 100) {
        if (skill.level === 'Beginner') { skill.level = 'Intermediate'; skill.progress = 0; }
        else if (skill.level === 'Intermediate') { skill.level = 'Advanced'; skill.progress = 0; }
        else if (skill.level === 'Advanced') { skill.level = 'Expert'; skill.progress = 0; }
        // Expert is the top of the ladder: hold at 100 rather than wrapping to
        // zero, which used to make a finished skill look untouched.
        else skill.progress = 100;
      }
      skill.lastUpdated = new Date();
      await skill.save();
      // XP rule (optional): a skill moving up a level here, through finished
      // tasks — never from the level the Skills page lets a student type in.
      // Keyed by the skill's name, not its id: a rebuilt roadmap makes new
      // skill rows, and the same level must not pay twice.
      if (skill.level !== levelBefore) {
        await recordIfRuled({ userId, type: 'skill_level_up', refId: `skill:${String(skill.skillName || '').trim().toLowerCase()}:${skill.level}` });
      }
    }
  } catch (error) {
    console.error('Gamification error:', error);
  }
  return xpPaid;
};

/**
 * Mark a task Completed and run its side effects exactly once.
 *
 * Idempotent by design. The lesson can report "video watched" and "notes read"
 * more than once (a re-render, a second tab, a retried request), and each one
 * re-checks the completion gates — so without this guard a student could bank
 * XP repeatedly for the same task.
 *
 * Both steps are single atomic writes, conditional on the state they change.
 * This used to read the task, check it in memory and then save it, so two
 * requests finishing the same task together (the video gate and the notes
 * gate landing in the same second) could both see "not completed", both
 * save, and both run the side effects — the skill moved +10 instead of +5.
 * Now only the request whose write actually flipped the task completes it,
 * and only the one that stamped creditedAt pays for it.
 *
 * Returns `completed: false` when the task was already done, so callers can
 * tell a fresh completion from a no-op and only celebrate the former. `task`
 * is the task as it now stands in the database.
 */
const completeTask = async (userId, task) => {
  if (!task) return { completed: false, task: null, xp: 0 };
  if (task.status === 'Completed') return { completed: false, task, xp: 0 };

  // Stamp the completion date with the flip itself, so re-saving never shifts
  // the date this task's streak credit belongs to. Finishing a missed task
  // clears the skip: the profile should credit the catch-up rather than keep
  // listing it as missed.
  const done = await Task.findOneAndUpdate(
    { _id: task._id, userId, status: { $ne: 'Completed' } },
    { $set: { status: 'Completed', completedAt: new Date() }, $unset: { skippedAt: 1 } },
    { returnDocument: 'after' }
  );
  if (!done) {
    // Another request completed it first. Report it as it stands.
    const current = await Task.findOne({ _id: task._id, userId });
    return { completed: false, task: current || task, xp: 0 };
  }

  // Pay out once per task, ever. The status guard above stops a repeated
  // completion, but not a reopen followed by another tick — and that loop was
  // worth 10 XP and five points of skill progress every time round it. Also
  // conditional, so of two completions only one can claim the payout.
  const credited = await Task.findOneAndUpdate(
    { _id: task._id, userId, creditedAt: null },
    { $set: { creditedAt: new Date() } },
    { returnDocument: 'after' }
  );

  const xp = credited ? await runCompletionSideEffects(userId, credited) : 0;

  return { completed: true, task: credited || done, credited: !!credited, xp };
};

/**
 * The XP each of these tasks actually paid on completion, from the ledger.
 *
 * Screens used to show "Done · +N XP" and "XP earned" as the number of
 * finished tasks times TODAY's 'career_task' rule — so an admin changing the
 * rule rewrote history, a task re-completed after a reopen (paid once) read as
 * paid twice, and a rule of 0 at the time read as paid. The ledger row keyed
 * `career:task:<id>` (addXP above, via the rewards XP service) is what was
 * really credited. Tasks with no row paid nothing.
 *
 * @returns {Promise<Map<string, number>>} task id → XP paid
 */
const xpPaidForTasks = async (userId, taskIds = []) => {
  const paid = new Map();
  if (!userId || !taskIds.length) return paid;
  const XpTransaction = require('../../rewards/models/XpTransaction');
  const keys = taskIds.map((id) => `career:task:${id}`);
  const rows = await XpTransaction.find({ userId, key: { $in: keys } }).select('key amount').lean();
  for (const row of rows) paid.set(String(row.key).slice('career:task:'.length), Number(row.amount) || 0);
  return paid;
};

module.exports = {
  completeTask,
  xpPaidForTasks,
  runCompletionSideEffects,
  // Exported for tests: pure, and the part most worth pinning down.
  skillAdvancedBy
};
