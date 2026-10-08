const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const User = require('../models/User');
const PlannerContext = require('../models/PlannerContext');
const TaskStudy = require('../models/TaskStudy');
const DailyPlan = require('../models/DailyPlan');
const { generateTasksFromAI } = require('../services/geminiService');
const { completeTask } = require('../services/taskCompletionService');
const { lessonGates } = require('./taskStudyController');
const { getLessonIndex, matchTasksToLessons } = require('../services/lmsContext');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');
const {
  startOfDay,
  addDays,
  parseMinutes,
  fitToBudget,
  sweepMissedTasks,
  ensureTodaysPlan,
  setTodaysTimeBudget,
  addAnotherTask,
  examsTomorrow
} = require('../services/dailyPlanService');

// @desc    Generate one extra task for today, on request
// @route   POST /api/tasks/another
// @access  Private
const generateAnotherTask = async (req, res) => {
  try {
    const result = await addAnotherTask(req.user._id);

    if (result.status === 'no-roadmap') {
      return res.status(400).json({ message: 'Build your roadmap before adding tasks.' });
    }
    if (result.status === 'exam-eve') {
      return res.status(400).json({
        message: `Today is kept clear for tomorrow's ${result.exams[0]}. Use it to revise.`
      });
    }
    if (result.status !== 'ready') {
      return res.status(502).json({ message: result.message || 'Could not generate another task.' });
    }

    res.status(201).json({ task: result.task, overBudget: result.overBudget });
  } catch (error) {
    console.error('Extra task generation failed:', error.message);
    res.status(statusFor(error)).json(aiAwareBody(error, 'Could not generate another task.'));
  }
};

// @desc    Generate Tasks using AI based on roadmap
// @route   POST /api/tasks/generate
// @access  Private
const generateTasks = async (req, res) => {
  // Set once this request owns today's DailyPlan, so a failure can hand the day
  // back exactly as it found it.
  let claim = null;
  let claimCreated = false;
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    const roadmap = await Roadmap.findOne({ userId: req.user._id });

    if (!goal || !roadmap) {
      return res.status(400).json({ message: 'Roadmap and Goal must exist before generating tasks.' });
    }

    const today = startOfDay();
    const tomorrow = addDays(today, 1);

    // This is the planner's empty-state button, and the planner showed it
    // while GET /tasks was still building the day in another request — so a
    // click landed a second task and a second Gemini call on top of the one
    // already coming. A day that already has work is refused; "Generate
    // another task" is the way to ask for more.
    const existing = await Task.find({ userId: req.user._id, assignedDate: { $gte: today, $lt: tomorrow } })
      .sort({ createdAt: 1 });
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Today already has its task.', code: 'already-planned', tasks: existing });
    }

    // The day before an exam is kept clear on every other path; this one must
    // not be the way round it.
    const exams = await examsTomorrow(req.user._id, today);
    if (exams.length > 0) {
      return res.status(400).json({ message: `Today is kept clear for tomorrow's ${exams[0].title}. Use it to revise.` });
    }

    // Claim the day the same way the daily plan does, so two clicks (or a
    // click racing the planner's own build) cannot both reach the model. A
    // plan that is 'ready' with nothing on it — its tasks withdrawn since —
    // is taken over rather than refused, or the empty state would be a dead
    // end until midnight.
    const user = await User.findById(req.user._id).select('dailyTimeBudget');
    try {
      claim = await DailyPlan.create({
        userId: req.user._id,
        date: today,
        status: 'generating',
        timeBudgetMinutes: user?.dailyTimeBudget || 60
      });
      claimCreated = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      claim = await DailyPlan.findOneAndUpdate(
        { userId: req.user._id, date: today, status: 'ready' },
        { $set: { status: 'generating' } },
        { new: true }
      );
      if (!claim) {
        return res.status(409).json({ message: "Today's task is already being prepared.", code: 'generating', tasks: [] });
      }
    }

    const aiData = await generateTasksFromAI(goal, roadmap);

    // Save Skills.
    //
    // Capped like the roadmap's own seeding is. This path used to upsert every
    // skill the model returned, so an account seeded at the ceiling of eight
    // quietly grew past it — the tracker is meant to be a focus, not a list.
    const offeredSkills = (aiData.skillsToDevelop || []).slice(0, SkillProgress.MAX_TRACKED);
    for (const skill of offeredSkills) {
      await SkillProgress.findOneAndUpdate(
        { userId: req.user._id, skillName: skill.skillName },
        // The model's level is only a starting guess for a skill the student
        // has not tracked before. Setting it on every call overwrote a level
        // they had earned by finishing tasks — an Advanced skill knocked back
        // to Beginner because a prompt said so.
        { $setOnInsert: { level: skill.level, progress: 0 } },
        { upsert: true, new: true }
      );
    }

    // What a task may claim to advance: the skills this student actually
    // tracks, including any this response just added. A tag matching none of
    // them is dropped rather than stored, so it can never credit a row that
    // does not exist — the same guard the daily planner applies.
    const trackedNames = (await SkillProgress.find({ userId: req.user._id }).select('skillName').lean())
      .map((row) => row.skillName);
    const validSkillTag = (tag) => {
      if (!tag || typeof tag !== 'string') return undefined;
      const wanted = tag.trim().toLowerCase();
      return trackedNames.find((name) => name.toLowerCase() === wanted);
    };

    // Save PlannerContext
    await PlannerContext.findOneAndUpdate(
      { userId: req.user._id },
      {
        currentFocus: aiData.currentFocus || [],
        skillsToDevelop: aiData.skillsToDevelop || [],
        learningResources: aiData.learningResources || { courses: [], books: [] }
      },
      { upsert: true, new: true }
    );

    // Save Tasks — ONE of them.
    //
    // This prompt returns a list of Daily, Weekly and Monthly tasks, and this
    // endpoint used to insert every one of them onto today. That quietly broke
    // the rule the rest of the app keeps: a day is one task, and anyone wanting
    // more asks for it with "Generate another task". A student who reached the
    // planner's empty state got handed six.
    let createdTasks = [];
    const offered = (aiData.tasks || []).filter((t) => t.title);
    if (offered.length > 0) {
      const { tasks } = fitToBudget(offered, user?.dailyTimeBudget || 60);

      for (const task of tasks) {
        const newTask = await Task.create({
          userId: req.user._id,
          roadmapId: roadmap._id,
          title: task.title,
          description: task.description,
          category: task.category,
          duration: task.duration,
          learning: task.learning || 'video',
          skill: validSkillTag(task.skill),
          guidance: task.learning === 'none' && task.guidance?.length ? task.guidance : undefined,
          // These join today's plan, so they appear alongside the generated
          // ones and fall under the same end-of-day sweep.
          assignedDate: today,
          dueDate: tomorrow,
          status: 'Pending'
        });
        createdTasks.push(newTask);
      }
    }

    claim.status = 'ready';
    claim.taskCount = createdTasks.length;
    await claim.save();
    claim = null;

    res.status(201).json({ message: 'Tasks and Skills generated', tasks: createdTasks });
  } catch (error) {
    // Release the day so the student can retry: a claim this request made is
    // removed, one it took over goes back to how it was.
    if (claim) {
      await (claimCreated
        ? DailyPlan.deleteOne({ _id: claim._id })
        : DailyPlan.updateOne({ _id: claim._id }, { $set: { status: 'ready' } })
      ).catch(() => {});
    }
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Get today's plan, generating it on the first visit of the day
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    // Order matters. Sweeping first means anything missed yesterday is already
    // marked Skipped when today's prompt reads the history, so the plan can
    // react to it on the same request.
    const skippedCount = await sweepMissedTasks(req.user._id);
    const plan = await ensureTodaysPlan(req.user._id);

    const today = startOfDay();
    const tomorrow = addDays(today, 1);

    const tasks = await Task.find({
      userId: req.user._id,
      assignedDate: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: 1 });

    // Which of today's tasks have a lesson attached, and how far through it the
    // student is. A task with a lesson is completed by finishing it — watch,
    // read, pass — so the planner hides the manual tick for those and keeps it
    // only for bare tasks, which have no gates to satisfy and would otherwise
    // be impossible to finish.
    //
    // The gate detail rides along so the list can show a half-finished lesson
    // as half-finished. Without it every row looks identical whether the
    // student watched the video an hour ago or has never opened it, and there
    // is nothing pulling them back to the one they were partway through.
    const studies = await TaskStudy.find({
      userId: req.user._id,
      taskId: { $in: tasks.map((t) => t._id) }
    }).select('taskId mode video notes quiz progress bestScore');

    const lessonByTask = new Map(
      studies.map((study) => {
        const gates = lessonGates(study);
        const steps = [
          gates.needsVideo && { key: 'video', done: gates.videoWatched },
          gates.needsNotes && { key: 'notes', done: gates.notesRead },
          gates.needsQuiz && { key: 'quiz', done: gates.quizPassed }
        ].filter(Boolean);

        return [
          String(study.taskId),
          {
            steps,
            done: steps.filter((s) => s.done).length,
            total: steps.length,
            // So a row can say how this one is being learned without opening it.
            mode: study.mode || 'video'
          }
        ];
      })
    );

    // Where one of today's tasks is already covered by a lesson in a course the
    // student owns, that lesson wins. The AI lesson is a fallback for topics the
    // catalogue does not reach — sending a student to a stranger's video for
    // something YATICORP already teaches them properly is the wrong answer.
    //
    // Matching is a token overlap rather than a model call: it is per-task, so
    // asking Gemini would multiply the daily quota by the size of every plan.
    const courseLessonByTask = await getLessonIndex(req.user._id)
      .then((index) => matchTasksToLessons(tasks, index))
      .catch((error) => {
        console.error('[career] lesson matching failed:', error.message);
        return new Map();
      });

    const plannerContext = await PlannerContext.findOne({ userId: req.user._id });

    res.status(200).json({
      tasks: tasks.map((t) => ({
        ...t.toObject(),
        hasLesson: lessonByTask.has(String(t._id)),
        lesson: lessonByTask.get(String(t._id)) || null,
        // A real lesson from one of their own courses, when this task is about
        // something YATICORP teaches. Null the rest of the time.
        courseLesson: courseLessonByTask.get(String(t._id)) || null
      })),
      context: plannerContext || null,
      day: {
        date: today,
        status: plan.status,
        message: plan.message || null,
        // Set when today's plan could not be built because the AI allowance is
        // spent rather than because anything is broken.
        code: plan.code || null,
        // What tomorrow holds, when tomorrow is an exam. The planner shows the
        // day as deliberately clear rather than as a plan that failed to arrive.
        exams: plan.exams || null,
        timeBudgetMinutes: plan.timeBudgetMinutes,
        // What today's tasks actually add up to, so the planner can show the
        // budget being honoured rather than asking the student to trust it.
        plannedMinutes: tasks.reduce((total, t) => total + parseMinutes(t.duration), 0),
        // Surfaced so the planner can tell the student what yesterday cost them
        // instead of silently moving on.
        skippedYesterday: skippedCount
      }
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Set how much time is available today and reshape the plan to fit
// @route   PUT /api/tasks/day/time-budget
// @access  Private
const setTimeBudget = async (req, res) => {
  try {
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 480) {
      return res.status(400).json({ message: 'Pick between 15 minutes and 8 hours.' });
    }

    const result = await setTodaysTimeBudget(req.user._id, minutes, !!req.body.remember);

    const today = startOfDay();
    const tasks = await Task.find({
      userId: req.user._id,
      assignedDate: { $gte: today, $lt: addDays(today, 1) }
    }).sort({ createdAt: 1 });

    const plannerContext = await PlannerContext.findOne({ userId: req.user._id });

    res.status(200).json({
      tasks,
      context: plannerContext || null,
      day: {
        date: today,
        status: result.status,
        message: result.message || null,
        timeBudgetMinutes: result.timeBudgetMinutes,
        // Tells the UI to say "you've already done enough today" rather than
        // showing an empty plan that reads like a failure.
        alreadyDone: !!result.alreadyDone,
        skippedYesterday: 0
      }
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

/** A 'YYYY-MM-DD' query value as the platform midnight it names, or null. */
const parseDayParam = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(at.getTime()) ? null : startOfDay(at);
};

// @desc    Every task ever assigned, for history views
// @route   GET /api/tasks/history?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Private
const getTaskHistory = async (req, res) => {
  try {
    // Without a range this is the newest 200, which is all the existing
    // callers want. A calendar paging back through older months asks for a
    // window instead — 200 is only a few months of a busy student, and the
    // cap silently emptied everything before that.
    const from = parseDayParam(req.query.from);
    const to = parseDayParam(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to)) {
      return res.status(400).json({ message: 'from and to must be dates in YYYY-MM-DD form.' });
    }

    const filter = { userId: req.user._id };
    if (from || to) {
      filter.assignedDate = {};
      if (from) filter.assignedDate.$gte = from;
      // Inclusive of the whole `to` day.
      if (to) filter.assignedDate.$lt = addDays(to, 1);
    }

    // A window is still bounded, just far more generously: a year of extra
    // tasks fits, a crafted ten-year range cannot pull an unbounded list.
    const tasks = await Task.find(filter)
      .sort({ assignedDate: -1, createdAt: -1 })
      .limit(from || to ? 2000 : 200);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const wasCompleted = task.status === 'Completed';
    const nextStatus = req.body.status || task.status;

    if (nextStatus === 'Completed' && !wasCompleted) {
      // One shared path for completion, so a manual tick and the automatic
      // finish at the end of a lesson award exactly the same thing.
      await completeTask(req.user._id, task);
    } else {
      task.status = nextStatus;

      // Reopening a task clears its completion date, so the streak stops
      // counting a day it no longer earned.
      if (nextStatus !== 'Completed') task.completedAt = undefined;

      // Finishing a missed task clears the skip: the profile should credit the
      // catch-up rather than keep listing it as missed.
      if (nextStatus !== 'Skipped') task.skippedAt = undefined;

      await task.save();
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  generateTasks,
  generateAnotherTask,
  getTasks,
  getTaskHistory,
  setTimeBudget,
  updateTask
};
