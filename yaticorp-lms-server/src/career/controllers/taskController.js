const Task = require('../models/Task');
const SkillProgress = require('../models/SkillProgress');
const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const User = require('../models/User');
const PlannerContext = require('../models/PlannerContext');
const TaskStudy = require('../models/TaskStudy');
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
  addAnotherTask
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
  try {
    const goal = await Goal.findOne({ userId: req.user._id });
    const roadmap = await Roadmap.findOne({ userId: req.user._id });

    if (!goal || !roadmap) {
      return res.status(400).json({ message: 'Roadmap and Goal must exist before generating tasks.' });
    }

    const aiData = await generateTasksFromAI(goal, roadmap);

    // Save Skills
    if (aiData.skillsToDevelop && aiData.skillsToDevelop.length > 0) {
      for (const skill of aiData.skillsToDevelop) {
        await SkillProgress.findOneAndUpdate(
          { userId: req.user._id, skillName: skill.skillName },
          { 
            $set: { level: skill.level },
            $setOnInsert: { progress: 0 }
          },
          { upsert: true, new: true }
        );
      }
    }

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
      const user = await User.findById(req.user._id).select('dailyTimeBudget');
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
          guidance: task.learning === 'none' && task.guidance?.length ? task.guidance : undefined,
          // These join today's plan, so they appear alongside the generated
          // ones and fall under the same end-of-day sweep.
          assignedDate: startOfDay(),
          status: 'Pending'
        });
        createdTasks.push(newTask);
      }
    }

    res.status(201).json({ message: 'Tasks and Skills generated', tasks: createdTasks });
  } catch (error) {
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

// @desc    Every task ever assigned, for history views
// @route   GET /api/tasks/history
// @access  Private
const getTaskHistory = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
      .sort({ assignedDate: -1, createdAt: -1 })
      .limit(200);
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
