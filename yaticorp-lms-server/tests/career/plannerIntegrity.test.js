/**
 * The daily planner's integrity fixes.
 *
 * - "Different video" swaps the video and nothing else: the quiz the student
 *   already passed stays passed, and the quiz XP is paid once per task even
 *   across a full rebuild (the ledger is keyed on the task).
 * - POST /tasks/generate refuses a day that already has its task, and never
 *   overwrites a skill level the student earned with the model's guess.
 * - Career Path days turn over at midnight in the platform timezone (IST),
 *   whatever timezone the server process runs in.
 *
 * Gemini and YouTube are stubbed on their module exports before the
 * controllers load, so nothing here spends quota or needs a key. Controllers
 * are called directly with a fake req/res, which also keeps the wallet charge
 * middleware out of the picture.
 */
// Set before anything reads the clock: the server's zone must not matter.
process.env.TZ = 'America/New_York';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');

const gemini = require('../../src/career/services/geminiService');
const youtube = require('../../src/career/services/youtubeService');

const calls = { tasksFromAI: 0 };
const QUIZ = Array.from({ length: 5 }, (_, i) => ({
  question: `Question ${i + 1} about joins?`,
  options: ['Right', 'Wrong'],
  correctIndex: 0,
  explanation: 'Because.'
}));
let nextVideoId = 'vid-one';

gemini.generateVideoSearchQuery = async () => 'sql joins tutorial';
gemini.chooseVideoForTask = async () => null;
gemini.generateTaskStudyFromVideo = async () => ({
  notes: { summary: 'Joins combine rows.', sections: [{ heading: 'Inner', points: ['Matches only'] }] },
  quiz: QUIZ.map((q, i) => ({ ...q, question: `Rebuilt ${i + 1} about joins?` }))
});
gemini.generateTasksFromAI = async () => {
  calls.tasksFromAI += 1;
  return {
    skillsToDevelop: [{ skillName: 'SQL', level: 'Beginner' }],
    tasks: [{ title: 'Write three joins', description: 'Practice', category: 'Daily', duration: '30 mins', learning: 'none' }]
  };
};
youtube.findVideoForTopic = async () => ({ videoId: nextVideoId, title: `Video ${nextVideoId}`, channel: 'Chan', language: 'en' });

const { generateTaskStudy, submitTaskQuiz } = require('../../src/career/controllers/taskStudyController');
const { generateTasks } = require('../../src/career/controllers/taskController');
const { startOfDay, addDays, toISODate } = require('../../src/career/services/dailyPlanService');
const { dayKey: activityDayKey } = require('../../src/career/controllers/activityController');
const { addXP } = require('../../src/career/services/gamificationService');
const { xpFor } = require('../../src/rewards/services/configService');
const Task = require('../../src/career/models/Task');
const TaskStudy = require('../../src/career/models/TaskStudy');
const Goal = require('../../src/career/models/Goal');
const Roadmap = require('../../src/career/models/Roadmap');
const SkillProgress = require('../../src/career/models/SkillProgress');
const DailyPlan = require('../../src/career/models/DailyPlan');
const XpTransaction = require('../../src/rewards/models/XpTransaction');

/** Call a controller the way Express would, and resolve with what it sent. */
const invoke = (handler, user, { params = {}, body = {}, query = {} } = {}) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; }
    };
    Promise.resolve(handler({ user, params, body, query }, res)).catch(reject);
  });

let me;
before(async () => {
  await connect();
  me = await makeUser('Planner');
});
after(async () => { await cleanup([me.user]); });

describe('swapping a lesson video', () => {
  test('keeps the passed quiz, and the quiz XP is paid once per task even after a rebuild', async () => {
    const user = me.user;
    const task = await Task.create({ userId: user._id, roadmapId: new (require('mongoose').Types.ObjectId)(), title: 'SQL joins', duration: '30 mins', assignedDate: startOfDay(), status: 'Pending' });
    await TaskStudy.create({
      userId: user._id,
      taskId: task._id,
      mode: 'video',
      video: { videoId: 'vid-zero', title: 'Old', searchQuery: 'sql joins' },
      notes: { summary: 'Joins combine rows.' },
      quiz: QUIZ,
      progress: { videoWatched: true, watchedSeconds: 300, notesRead: true }
    });

    const rule = await xpFor('career_task_quiz');
    const first = await invoke(submitTaskQuiz, user, { params: { id: String(task._id) }, body: { answers: [0, 0, 0, 0, 0] } });
    assert.equal(first.status, 200);
    assert.equal(first.body.passed, true);
    assert.equal(first.body.xpAwarded, rule);

    const before = await TaskStudy.findOne({ taskId: task._id }).lean();
    nextVideoId = 'vid-two';
    const swap = await invoke(generateTaskStudy, user, { params: { id: String(task._id) }, body: { mode: 'video', lang: 'en', replace: 'video' } });
    assert.equal(swap.status, 201, JSON.stringify(swap.body));

    const swapped = await TaskStudy.findOne({ taskId: task._id }).lean();
    assert.equal(swapped.video.videoId, 'vid-two', 'the video is replaced');
    assert.equal(swapped.bestScore, before.bestScore, 'the best score survives');
    assert.equal(swapped.attempts, before.attempts, 'the attempts survive');
    assert.deepEqual(swapped.quiz.map((q) => q.question), before.quiz.map((q) => q.question), 'the quiz is untouched');
    assert.equal(swapped.notes.summary, before.notes.summary, 'the notes are untouched');
    assert.equal(swapped.progress.notesRead, true, 'notes stay read');
    assert.equal(swapped.progress.videoWatched, false, 'the new video still has to be watched');
    assert.equal(swapped.progress.watchedSeconds, 0);
    assert.equal(swap.body.gates.quizPassed, true, 'the quiz still reads as passed');

    // A full rebuild may reset the score — but passing again pays nothing.
    nextVideoId = 'vid-three';
    const rebuild = await invoke(generateTaskStudy, user, { params: { id: String(task._id) }, body: { mode: 'video', lang: 'en' } });
    assert.equal(rebuild.status, 201);
    assert.equal(rebuild.body.bestScore, 0);
    const again = await invoke(submitTaskQuiz, user, { params: { id: String(task._id) }, body: { answers: [0, 0, 0, 0, 0] } });
    assert.equal(again.body.passed, true);
    assert.equal(again.body.xpAwarded, 0, 'no second payout after a rebuild');

    if (rule > 0) {
      const rows = await XpTransaction.countDocuments({ userId: user._id, key: `career:taskquiz:${task._id}` });
      assert.equal(rows, 1, 'exactly one ledger row for this task quiz');
    }
  });

  test('two racing payouts with the same refId credit once', async () => {
    const results = await Promise.all([
      addXP(me.user._id, 7, 'a race', { refId: 'task:race-test' }),
      addXP(me.user._id, 7, 'a race', { refId: 'task:race-test' })
    ]);
    assert.deepEqual(results.sort(), [0, 7]);
  });
});

describe('generating today\'s task by hand', () => {
  test('never overwrites an earned skill level, and refuses a day that already has its task', async () => {
    const user = me.user;
    await Task.deleteMany({ userId: user._id });
    await DailyPlan.deleteMany({ userId: user._id });
    const goal = await Goal.create({ userId: user._id, educationLevel: 'Postgraduate', degree: 'MCA', specialization: 'Computer Applications', currentYear: '2nd Year', careerGoal: 'Data Analyst' });
    await Roadmap.create({ userId: user._id, goalId: goal._id, roadmapData: { educationRoadmap: [{ phase: 'Year 1' }] } });
    await SkillProgress.create({ userId: user._id, skillName: 'SQL', level: 'Advanced', progress: 40 });

    const made = await invoke(generateTasks, user);
    assert.equal(made.status, 201, JSON.stringify(made.body));
    assert.equal(made.body.tasks.length, 1);
    const sql = await SkillProgress.findOne({ userId: user._id, skillName: 'SQL' }).lean();
    assert.equal(sql.level, 'Advanced', 'the earned level stands');
    assert.equal(sql.progress, 40);
    const plan = await DailyPlan.findOne({ userId: user._id, date: startOfDay() }).lean();
    assert.equal(plan?.status, 'ready', 'the day is recorded as planned');

    const callsBefore = calls.tasksFromAI;
    const second = await invoke(generateTasks, user);
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'already-planned');
    assert.equal(second.body.tasks.length, 1, 'the existing task is handed back');
    assert.equal(calls.tasksFromAI, callsBefore, 'no second AI call');
    assert.equal(await Task.countDocuments({ userId: user._id }), 1, 'no second task');
  });

  test('refuses while the day is still being built', async () => {
    const user = me.user;
    await Task.deleteMany({ userId: user._id });
    await DailyPlan.deleteMany({ userId: user._id });
    await DailyPlan.create({ userId: user._id, date: startOfDay(), status: 'generating' });
    const callsBefore = calls.tasksFromAI;
    const r = await invoke(generateTasks, user);
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'generating');
    assert.equal(calls.tasksFromAI, callsBefore);
  });
});

describe('the Career Path day', () => {
  test('turns over at midnight IST, not at the server\'s midnight', () => {
    // 19:00 UTC on 4 Oct is 00:30 on 5 Oct in India (and 15:00 on 4 Oct in New York).
    const lateUtc = new Date('2026-10-04T19:00:00Z');
    assert.equal(startOfDay(lateUtc).toISOString(), '2026-10-04T18:30:00.000Z');
    assert.equal(addDays(startOfDay(lateUtc), 1).toISOString(), '2026-10-05T18:30:00.000Z');
    assert.equal(toISODate(lateUtc), '2026-10-05');
    assert.equal(activityDayKey(lateUtc), '2026-10-05');

    // One minute before IST midnight is still the 4th.
    const beforeMidnight = new Date('2026-10-04T18:29:00Z');
    assert.equal(toISODate(beforeMidnight), '2026-10-04');
    assert.equal(startOfDay(beforeMidnight).toISOString(), '2026-10-03T18:30:00.000Z');
  });

  test('a row stamped at UTC midnight still falls inside its IST day', () => {
    // What a UTC server wrote before the switch.
    const legacy = new Date('2026-10-05T00:00:00Z');
    const day = startOfDay(legacy);
    assert.ok(legacy >= day && legacy < addDays(day, 1));
    assert.equal(toISODate(legacy), '2026-10-05');
  });
});
