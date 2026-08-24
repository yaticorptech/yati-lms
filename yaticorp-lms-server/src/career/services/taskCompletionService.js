const User = require('../models/User');
const Achievement = require('../models/Achievement');
const SkillProgress = require('../models/SkillProgress');
const Task = require('../models/Task');
const { addXP } = require('./gamificationService');

const TASK_XP = 10;

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
  try {
    await User.findByIdAndUpdate(userId, { lastActiveDate: new Date() });

    const tasksCompleted = await Task.countDocuments({ userId, status: 'Completed' });

    const checkAndAward = async (title, description) => {
      const exists = await Achievement.findOne({ userId, title });
      if (!exists) await Achievement.create({ userId, title, description });
    };

    if (tasksCompleted === 1) await checkAndAward('First Step', 'Completed your very first task.');
    if (tasksCompleted === 10) await checkAndAward('Getting Serious', 'Completed 10 tasks.');

    await addXP(userId, TASK_XP, `completing "${task.title}"`);

    const skills = await SkillProgress.find({ userId });
    for (const skill of skills) {
      skill.progress = Math.min((Number(skill.progress) || 0) + 5, 100);

      if (skill.progress === 100) {
        if (skill.level === 'Beginner') { skill.level = 'Intermediate'; skill.progress = 0; }
        else if (skill.level === 'Intermediate') { skill.level = 'Advanced'; skill.progress = 0; }
        else if (skill.level === 'Advanced') { skill.level = 'Expert'; skill.progress = 0; }
      }
      await skill.save();
    }
  } catch (error) {
    console.error('Gamification error:', error);
  }
};

/**
 * Mark a task Completed and run its side effects exactly once.
 *
 * Idempotent by design. The lesson can report "video watched" and "notes read"
 * more than once (a re-render, a second tab, a retried request), and each one
 * re-checks the completion gates — so without this guard a student could bank
 * XP repeatedly for the same task.
 *
 * Returns `completed: false` when the task was already done, so callers can
 * tell a fresh completion from a no-op and only celebrate the former.
 */
const completeTask = async (userId, task) => {
  if (!task) return { completed: false, task: null };
  if (task.status === 'Completed') return { completed: false, task };

  task.status = 'Completed';
  // Stamp the first completion only, so re-saving never shifts the date this
  // task's streak credit belongs to.
  task.completedAt = new Date();
  // Finishing a missed task clears the skip: the profile should credit the
  // catch-up rather than keep listing it as missed.
  task.skippedAt = undefined;
  await task.save();

  await runCompletionSideEffects(userId, task);

  return { completed: true, task };
};

module.exports = { completeTask, runCompletionSideEffects, TASK_XP };
