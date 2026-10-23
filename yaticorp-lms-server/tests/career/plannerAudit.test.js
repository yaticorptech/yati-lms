/**
 * Career Path fixes from the October 2026 audit.
 *
 * - A failed daily plan is kept, failed, and only an explicit retry (after a
 *   cooldown) builds it again; only successful AI calls count towards the cap,
 *   and the cap's day is the platform's (#24, #78).
 * - The student reads words, not the provider's error (#64).
 * - An exam tomorrow withdraws only untouched work — never a task with a
 *   lesson, or one brought back from the backlog (#27).
 * - "N tasks moved to your backlog" is read from the data (#55).
 * - Completion is atomic: racing gates complete the task once, and a task
 *   whose gates are all met is finished when its lesson is opened (#28).
 * - The server enforces the lesson gates and checks the seconds watched (#20),
 *   and refuses a silent rebuild over an existing lesson (#26).
 * - POST /tasks/generate never takes the tracker past eight skills (#20).
 * - A roadmap being built is reported as such, and a duplicate build comes
 *   back as ROADMAP_EXISTS (#52).
 * - Level badges follow the admin's ladder; "First Task Completed" means a
 *   task (#69).
 * - Tasks carry their platform day and the XP they actually paid (#77, #78).
 *
 * Gemini and YouTube are stubbed on their module exports before anything that
 * destructures them loads, so nothing here spends quota or needs a key.
 */
// Set before anything reads the clock: the server's zone must not matter.
process.env.TZ = 'America/New_York';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, cleanup } = require('../helpers');

const gemini = require('../../src/career/services/geminiService');
const youtube = require('../../src/career/services/youtubeService');
const aiQuota = require('../../src/career/services/aiQuota');

const calls = { daily: 0 };
let dailyImpl = async () => ({ tasks: [{ title: 'Practise SQL joins', description: 'Write three.', duration: '30 mins', learning: 'none' }] });
gemini.generateDailyTasksFromAI = async (...args) => {
  calls.daily += 1;
  return dailyImpl(...args);
};
gemini.generateTasksFromAI = async () => ({
  // The model calls every one of these "Advanced". New skills must start at
  // Beginner anyway, and the tracker must stop at eight.
  skillsToDevelop: ['Docker', 'Kubernetes', 'GraphQL', 'Redis', 'Kafka'].map((skillName) => ({ skillName, level: 'Advanced' })),
  tasks: [{ title: 'Containerise the app', description: 'One Dockerfile', category: 'Daily', duration: '30 mins', learning: 'none' }]
});
let roadmapImpl = async () => ({ educationRoadmap: [{ phase: 'Phase one', steps: ['a'] }], skills: { technical: [] } });
gemini.generateRoadmapFromAI = async (...args) => roadmapImpl(...args);
youtube.findVideoForTopic = async () => null;

const { getTasks, updateTask, generateTasks } = require('../../src/career/controllers/taskController');
const { getTaskStudy, updateStudyProgress, generateTaskStudy } = require('../../src/career/controllers/taskStudyController');
const { getRoadmap, generateRoadmap } = require('../../src/career/controllers/roadmapController');
const { getBadges } = require('../../src/career/controllers/badgeController');
const { getProfileSummary } = require('../../src/career/controllers/profileController');
const { completeTask } = require('../../src/career/services/taskCompletionService');
const { startOfDay, addDays, toISODate, clearTodaysPendingWork } = require('../../src/career/services/dailyPlanService');
const { getConfig, levelFloor, xpFor } = require('../../src/rewards/services/configService');
const platformDay = require('../../src/rewards/config/constants');
const Task = require('../../src/career/models/Task');
const TaskStudy = require('../../src/career/models/TaskStudy');
const Goal = require('../../src/career/models/Goal');
const Roadmap = require('../../src/career/models/Roadmap');
const SkillProgress = require('../../src/career/models/SkillProgress');
const DailyPlan = require('../../src/career/models/DailyPlan');
const CalendarEvent = require('../../src/career/models/CalendarEvent');
const AiUsage = require('../../src/career/models/AiUsage');
const User = require('../../src/models/User');

/** Call a controller the way Express would, and resolve with what it sent. */
const invoke = (handler, user, { params = {}, body = {}, query = {} } = {}) =>
  new Promise((resolve, reject) => {
    const req = { user, params, body, query };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload, req }); return this; }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });

const roadmapId = new mongoose.Types.ObjectId();
const QUIZ = Array.from({ length: 3 }, (_, i) => ({ question: `Q${i}?`, options: ['Right', 'Wrong'], correctIndex: 0, explanation: '.' }));

/** A student with a goal and a roadmap, so today's plan can be built. */
const onboarded = async (label) => {
  const { user } = await makeUser(label);
  const goal = await Goal.create({ userId: user._id, educationLevel: 'Working Professional', currentJob: 'Analyst', experience: 2, careerGoal: 'Data Engineer' });
  await Roadmap.create({ userId: user._id, goalId: goal._id, roadmapData: { educationRoadmap: [{ phase: 'One' }] } });
  return user;
};

const users = [];
const fresh = async (label, { withRoadmap = true } = {}) => {
  const user = withRoadmap ? await onboarded(label) : (await makeUser(label)).user;
  users.push(user);
  return user;
};

before(async () => { await connect(); });
after(async () => { await cleanup(users); });

describe('the AI allowance', () => {
  test('runs on the platform day, whatever the server clock says', () => {
    assert.equal(aiQuota.dayKey(), platformDay.dayKey(new Date()));
    assert.equal(aiQuota.resetsAt().getTime(), platformDay.startOfDay(platformDay.addDays(platformDay.dayKey(new Date()), 1)).getTime());
  });

  test('counts only calls that came back', async () => {
    const user = await fresh('AiCap', { withRoadmap: false });
    const day = aiQuota.dayKey();
    await AiUsage.create([
      { userId: user._id, day, kind: 'daily-tasks', ok: true },
      { userId: user._id, day, kind: 'daily-tasks', ok: false },
      { userId: user._id, day, kind: 'daily-tasks', ok: false }
    ]);
    const { mine } = await aiQuota.usageToday(user._id);
    assert.equal(mine, 1, 'two failures cost the student nothing');
  });
});

describe('a failed daily plan', () => {
  test('is kept failed, read without another AI call, and rebuilt only by an explicit retry after its cooldown', async () => {
    const user = await fresh('FailedDay');
    calls.daily = 0;
    dailyImpl = async () => { throw new Error("Failed to generate today's plan: fetch failed"); };

    const first = await invoke(getTasks, user);
    assert.equal(first.status, 200);
    assert.equal(first.body.day.status, 'failed');
    assert.doesNotMatch(first.body.day.message, /fetch failed|GEMINI|\.env/i, 'the student reads words, not the error');
    assert.ok(first.body.day.retryAfter, 'says when it may be tried again');
    assert.equal(calls.daily, 1);
    const plan = await DailyPlan.findOne({ userId: user._id, date: startOfDay() }).lean();
    assert.equal(plan?.status, 'failed', 'the failed day is kept, not deleted');

    // Every other page reading today's plan: no new call.
    await invoke(getTasks, user);
    await invoke(getTasks, user);
    assert.equal(calls.daily, 1, 'reading a failed day does not build it again');

    // An explicit retry inside the cooldown is not a build either.
    await invoke(getTasks, user, { query: { retry: '1' } });
    assert.equal(calls.daily, 1, 'not before the cooldown');

    // Past the cooldown, the retry builds it.
    await DailyPlan.updateOne({ _id: plan._id }, { $set: { retryAfter: new Date(Date.now() - 1000) } });
    dailyImpl = async () => ({ tasks: [{ title: 'Practise SQL joins', description: 'Write three.', duration: '30 mins', learning: 'none' }] });
    const retried = await invoke(getTasks, user, { query: { retry: '1' } });
    assert.equal(calls.daily, 2);
    assert.equal(retried.body.day.status, 'ready');
    assert.equal(retried.body.tasks.length, 1);
    assert.equal(retried.body.tasks[0].day, toISODate(startOfDay()), 'each task names its platform day');
  });

  test('a spent allowance keeps its code and the moment it comes back', async () => {
    const user = await fresh('SpentDay');
    dailyImpl = async () => { throw new aiQuota.AiBudgetError('You have used today\'s AI allowance.', 'student-daily-cap'); };
    const { body } = await invoke(getTasks, user);
    assert.equal(body.day.status, 'failed');
    assert.equal(body.day.code, 'student-daily-cap');
    assert.ok(body.day.resetsAt, 'the planner can say when it comes back');
  });
});

describe('an exam tomorrow', () => {
  test('withdraws only untouched work: a task with a lesson and one redone from the backlog stay', async () => {
    const user = await fresh('ExamEve');
    const today = startOfDay();
    const base = { userId: user._id, roadmapId, duration: '30 mins', assignedDate: today, status: 'Pending' };
    const untouched = await Task.create({ ...base, title: 'Untouched' });
    const withLesson = await Task.create({ ...base, title: 'Half watched' });
    await TaskStudy.create({ userId: user._id, taskId: withLesson._id, quiz: QUIZ, progress: { watchedSeconds: 40 } });
    const redone = await Task.create({ ...base, title: 'Back from the backlog', redoneAt: new Date() });
    await CalendarEvent.create({ userId: user._id, title: 'Finals', type: 'Exam', date: toISODate(addDays(today, 1)) });

    const { body } = await invoke(getTasks, user);
    assert.equal(body.day.status, 'exam-eve');
    assert.equal(await Task.exists({ _id: untouched._id }), null, 'untouched work is withdrawn');
    assert.ok(await Task.exists({ _id: withLesson._id }), 'a task with a lesson stays');
    assert.ok(await TaskStudy.exists({ taskId: withLesson._id }), 'and so does its lesson');
    assert.ok(await Task.exists({ _id: redone._id }), 'a redone task stays');

    const { kept } = await clearTodaysPendingWork(user._id, today);
    assert.equal(kept.length, 2);
  });
});

describe('yesterday\'s missed tasks', () => {
  test('are counted from the data, on every read', async () => {
    const user = await fresh('Missed');
    dailyImpl = async () => ({ tasks: [{ title: 'Practise SQL joins', duration: '30 mins', learning: 'none' }] });
    await Task.create({ userId: user._id, roadmapId, title: 'Missed one', assignedDate: addDays(startOfDay(), -1), status: 'Pending' });
    const first = await invoke(getTasks, user);
    const second = await invoke(getTasks, user);
    assert.equal(first.body.day.skippedYesterday, 1);
    assert.equal(second.body.day.skippedYesterday, 1, 'not 0 because the first read did the sweeping');
  });
});

describe('completing a task', () => {
  test('two completions racing run the side effects once', async () => {
    const user = await fresh('Race', { withRoadmap: false });
    await SkillProgress.create({ userId: user._id, skillName: 'SQL', progress: 0 });
    const task = await Task.create({ userId: user._id, roadmapId, title: 'SQL joins', skill: 'SQL', assignedDate: startOfDay(), learning: 'none' });
    const [a, b] = await Promise.all([
      completeTask(user._id, await Task.findById(task._id)),
      completeTask(user._id, await Task.findById(task._id))
    ]);
    assert.equal([a.completed, b.completed].filter(Boolean).length, 1, 'exactly one request completes it');
    assert.equal((await SkillProgress.findOne({ userId: user._id, skillName: 'SQL' })).progress, 5, 'the skill moves once');

    const rule = await xpFor('career_task');
    const { body } = await invoke(getTasks, user);
    const row = body.tasks.find((t) => String(t._id) === String(task._id));
    // No roadmap: the plan is not built, but today's tasks still come back.
    assert.ok(row, "today's task is listed");
    assert.equal(row.xpPaid, rule, 'the XP actually paid, from the ledger');
    assert.equal(row.completedDay, toISODate(new Date()), 'and the platform day it was finished');
  });

  test('a manual tick cannot finish a task that has a lesson to do', async () => {
    const user = await fresh('Gates', { withRoadmap: false });
    const lessonTask = await Task.create({ userId: user._id, roadmapId, title: 'Learn joins', learning: 'video', assignedDate: startOfDay() });
    const refused = await invoke(updateTask, user, { params: { id: String(lessonTask._id) }, body: { status: 'Completed' } });
    assert.equal(refused.status, 400);
    assert.equal(refused.body.code, 'LESSON_NOT_FINISHED');
    assert.equal((await Task.findById(lessonTask._id)).status, 'Pending');

    const tickTask = await Task.create({ userId: user._id, roadmapId, title: 'Push to GitHub', learning: 'none', assignedDate: startOfDay() });
    const ticked = await invoke(updateTask, user, { params: { id: String(tickTask._id) }, body: { status: 'Completed' } });
    assert.equal(ticked.status, 200);
    assert.equal(ticked.body.status, 'Completed');
  });
});

describe('a task lesson', () => {
  const lesson = (user, task, progress = {}) => TaskStudy.create({
    userId: user._id,
    taskId: task._id,
    video: { videoId: 'vid', durationSeconds: 100 },
    notes: { summary: 'Joins combine rows.' },
    quiz: QUIZ,
    bestScore: 3,
    progress
  });

  test('two gates landing together still complete the task', async () => {
    const user = await fresh('LessonRace', { withRoadmap: false });
    const task = await Task.create({ userId: user._id, roadmapId, title: 'Joins', assignedDate: startOfDay() });
    await lesson(user, task);
    const id = String(task._id);
    await Promise.all([
      invoke(updateStudyProgress, user, { params: { id }, body: { videoWatched: true, watchedSeconds: 95 } }),
      invoke(updateStudyProgress, user, { params: { id }, body: { notesRead: true } })
    ]);
    assert.equal((await Task.findById(task._id)).status, 'Completed');
  });

  test('"watched" needs the seconds to back it, and the XP hook only hears an accepted watch', async () => {
    const user = await fresh('Watch', { withRoadmap: false });
    const task = await Task.create({ userId: user._id, roadmapId, title: 'Joins', assignedDate: startOfDay() });
    await lesson(user, task);
    const id = String(task._id);

    const early = await invoke(updateStudyProgress, user, { params: { id }, body: { videoWatched: true, watchedSeconds: 12 } });
    assert.equal(early.body.videoRefused, true);
    assert.equal(early.body.progress.videoWatched, false);
    assert.equal(early.req.videoWatchAccepted, false);

    // Progress pings on the way build the seconds up; then the watch is accepted.
    await invoke(updateStudyProgress, user, { params: { id }, body: { watchedSeconds: 60 } });
    const done = await invoke(updateStudyProgress, user, { params: { id }, body: { videoWatched: true, watchedSeconds: 92 } });
    assert.equal(done.body.progress.videoWatched, true);
    assert.equal(done.body.progress.watchedSeconds, 92);
    assert.equal(done.req.videoWatchAccepted, true);

    // A claim past the end of the video is capped at its length.
    await invoke(updateStudyProgress, user, { params: { id }, body: { watchedSeconds: 99999 } });
    assert.equal((await TaskStudy.findOne({ taskId: task._id })).progress.watchedSeconds, 100);
  });

  test('a task stuck with every gate met is finished when the lesson is opened', async () => {
    const user = await fresh('Stuck', { withRoadmap: false });
    const task = await Task.create({ userId: user._id, roadmapId, title: 'Joins', assignedDate: startOfDay() });
    await lesson(user, task, { videoWatched: true, watchedSeconds: 95, notesRead: true });
    const { body } = await invoke(getTaskStudy, user, { params: { id: String(task._id) } });
    assert.equal(body.autoCompleted, true);
    assert.equal((await Task.findById(task._id)).status, 'Completed');
  });

  test('is not rebuilt unless the request asks for it', async () => {
    const user = await fresh('NoRebuild', { withRoadmap: false });
    const task = await Task.create({ userId: user._id, roadmapId, title: 'Joins', assignedDate: startOfDay() });
    await lesson(user, task, { watchedSeconds: 50 });
    const { status, body } = await invoke(generateTaskStudy, user, { params: { id: String(task._id) }, body: { mode: 'read' } });
    assert.equal(status, 409);
    assert.equal(body.code, 'LESSON_EXISTS');
    assert.equal((await TaskStudy.findOne({ taskId: task._id })).progress.watchedSeconds, 50, 'progress untouched');
  });
});

describe('POST /tasks/generate', () => {
  test('never takes the tracker past eight skills, and new skills start at Beginner', async () => {
    const user = await fresh('SkillCap');
    await SkillProgress.insertMany(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((skillName) => ({ userId: user._id, skillName })));
    const { status } = await invoke(generateTasks, user);
    assert.equal(status, 201);
    const skills = await SkillProgress.find({ userId: user._id }).lean();
    assert.equal(skills.length, SkillProgress.MAX_TRACKED);
    const added = skills.find((s) => s.skillName === 'Docker');
    assert.equal(added.level, 'Beginner', 'the model\'s "Advanced" is not taken on trust');
  });
});

describe('the roadmap', () => {
  test('a build under way is reported as such, and a duplicate build comes back as ROADMAP_EXISTS', async () => {
    const user = await fresh('RoadmapBuild', { withRoadmap: false });
    await Goal.create({ userId: user._id, educationLevel: 'Working Professional', currentJob: 'Analyst', experience: 2, careerGoal: 'Data Engineer', roadmapBuildingAt: new Date() });

    const reading = await invoke(getRoadmap, user);
    assert.equal(reading.status, 404);
    assert.equal(reading.body.code, 'ROADMAP_BUILDING');

    const second = await invoke(generateRoadmap, user);
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'ROADMAP_BUILDING');

    // A stale mark (a build that died) does not hold the page.
    await Goal.updateOne({ userId: user._id }, { $set: { roadmapBuildingAt: new Date(Date.now() - 60 * 60 * 1000) } });
    assert.equal((await invoke(getRoadmap, user)).body.code, undefined);

    // Another build saving first: the student is told they have a roadmap.
    roadmapImpl = async () => {
      const goal = await Goal.findOne({ userId: user._id });
      await Roadmap.create({ userId: user._id, goalId: goal._id, roadmapData: { educationRoadmap: [{ phase: 'Other' }] } });
      return { educationRoadmap: [{ phase: 'Mine' }], skills: { technical: [] } };
    };
    const raced = await invoke(generateRoadmap, user);
    assert.equal(raced.status, 409);
    assert.equal(raced.body.code, 'ROADMAP_EXISTS');
    assert.equal((await Goal.findOne({ userId: user._id })).roadmapBuildingAt, undefined, 'the mark is cleared on the way out');
  });
});

describe('career badges', () => {
  test('follow the admin ladder, and "First Task Completed" needs a task', async () => {
    const user = await fresh('Badges', { withRoadmap: false });
    const { levelThresholds } = await getConfig();
    // Exactly the XP Level 5 starts at, with no task ever finished.
    await User.updateOne({ _id: user._id }, { $set: { xp: levelFloor(5, levelThresholds) } });

    const first = await invoke(getBadges, user);
    const byTitle = (list, title) => list.find((b) => b.title === title);
    assert.equal(byTitle(first.body, 'Skill Master')?.unlocked, true, 'Level 5 reached is Skill Master earned');
    assert.equal(byTitle(first.body, 'Skill Master').xpRequired, levelFloor(5, levelThresholds));
    assert.equal(byTitle(first.body, 'Consistent Learner')?.unlocked, true, 'earned badges are all shown');
    assert.equal(byTitle(first.body, 'First Task Completed')?.unlocked, false, 'XP alone is not a finished task');

    const task = await Task.create({ userId: user._id, roadmapId, title: 'First one', learning: 'none', assignedDate: startOfDay() });
    await completeTask(user._id, task);
    const after = await invoke(getBadges, user);
    assert.equal(byTitle(after.body, 'First Task Completed')?.unlocked, true);
  });
});

describe('the profile summary', () => {
  test('counts and groups without loading the whole history', async () => {
    const user = await fresh('Summary');
    const yesterday = addDays(startOfDay(), -1);
    await Task.insertMany([
      { userId: user._id, roadmapId, title: 'Same', status: 'Skipped', assignedDate: yesterday, skippedAt: new Date(Date.now() - 2000) },
      { userId: user._id, roadmapId, title: 'Same', status: 'Skipped', assignedDate: addDays(yesterday, -1), skippedAt: new Date(Date.now() - 1000) },
      { userId: user._id, roadmapId, title: 'Done', status: 'Completed', assignedDate: yesterday, completedAt: new Date() }
    ]);
    const { status, body } = await invoke(getProfileSummary, user);
    assert.equal(status, 200);
    assert.equal(body.stats.completed, 1);
    assert.equal(body.stats.skipped, 2);
    assert.equal(body.stats.completionRate, 33);
    const row = body.skippedTasks.find((t) => t.title === 'Same');
    assert.equal(row.times, 2, 'one row per piece of work, with a count');
    assert.ok(row._id, 'with an id "Do it today" can move');
  });
});
