/**
 * Rebuilding a roadmap, and the things a rebuild must never cost.
 *
 * POST /generate used to delete the roadmap, its tasks, tracked skills, planner
 * context and recommendations BEFORE asking Gemini for the new one. A quota
 * 429, a timeout or a reply that would not parse then left the student with
 * nothing at all. It also replaced an existing roadmap for any caller, so a
 * retry on onboarding or a stale "Map my journey" button could wipe one.
 *
 * Gemini is replaced with a switchable stub before the controller loads (it
 * destructures the function at require time), so nothing here spends a call.
 */
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const gemini = require('../../src/career/services/geminiService');
let nextRoadmap = null;
gemini.generateRoadmapFromAI = async () => {
  if (nextRoadmap instanceof Error) throw nextRoadmap;
  return typeof nextRoadmap === 'function' ? nextRoadmap() : nextRoadmap;
};

const Goal = require('../../src/career/models/Goal');
const Roadmap = require('../../src/career/models/Roadmap');
const Task = require('../../src/career/models/Task');
const SkillProgress = require('../../src/career/models/SkillProgress');
const DailyPlan = require('../../src/career/models/DailyPlan');
const MilestoneBadge = require('../../src/career/models/MilestoneBadge');
const { startOfDay } = require('../../src/career/services/dailyPlanService');

let real, bare, me;

const OLD_PHASES = [{ phase: 'BCA Year 2' }, { phase: 'BCA Year 3' }, { phase: 'Job Applications' }];
const NEW_ROADMAP = () => ({
  educationRoadmap: [{ phase: 'BCA Year 2 (rebuilt)' }, { phase: 'First Role' }],
  skills: { technical: ['React'] }
});

const seed = async () => {
  await Promise.all([Goal, Roadmap, Task, SkillProgress, DailyPlan, MilestoneBadge]
    .map((M) => M.deleteMany({ userId: me.user._id })));
  const goal = await Goal.create({
    userId: me.user._id, educationLevel: 'Undergraduate', degree: 'BCA',
    specialization: 'Computer Applications', currentYear: '2nd Year', careerGoal: 'Frontend Developer'
  });
  const roadmap = await Roadmap.create({
    userId: me.user._id, goalId: goal._id,
    roadmapData: { educationRoadmap: OLD_PHASES, stageRepair: 1 }, completedPhases: [0]
  });
  await Task.create({ userId: me.user._id, title: 'Old task', status: 'Pending' }).catch(() => null);
  await SkillProgress.create({ userId: me.user._id, skillName: 'HTML', level: 'Beginner', progress: 40 });
  await DailyPlan.create({ userId: me.user._id, date: startOfDay(), status: 'ready' });
  return { goal, roadmap };
};

before(async () => {
  await connect();
  me = await makeUser('RoadmapRebuild');
  // The real router, for the consent check that runs ahead of the wallet.
  real = startApp({ mount: '/api/roadmap', router: require('../../src/career/routes/roadmapRoutes') });
  // The controller without the wallet charge, so a rebuild can be exercised
  // whatever the admin has priced it at.
  const { protect } = require('../../src/career/middleware/authMiddleware');
  const { requireRebuildConsent, generateRoadmap } = require('../../src/career/controllers/roadmapController');
  const router = express.Router();
  router.post('/generate', protect, requireRebuildConsent, generateRoadmap);
  bare = startApp({ mount: '/api/roadmap', router });
});

after(async () => {
  await new Promise((r) => real.server.close(r));
  await cleanup([me.user], bare.server);
});

beforeEach(() => { nextRoadmap = NEW_ROADMAP; });

describe('replacing a roadmap needs the student to ask for it', () => {
  test('without { rebuild: true } an existing roadmap is refused, before any charge', async () => {
    const { roadmap } = await seed();
    const res = await real.call(me.token)('POST', '/generate', {});
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ROADMAP_EXISTS');
    assert.equal(res.body.charged, undefined);
    const still = await Roadmap.findOne({ userId: me.user._id }).lean();
    assert.equal(String(still._id), String(roadmap._id));
  });

  test('a truthy string is not consent', async () => {
    await seed();
    const res = await bare.call(me.token)('POST', '/generate', { rebuild: 'yes' });
    assert.equal(res.status, 409);
  });

  test('the first roadmap needs no flag', async () => {
    await seed();
    await Roadmap.deleteMany({ userId: me.user._id });
    const res = await bare.call(me.token)('POST', '/generate', {});
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.roadmapData.educationRoadmap.length, 2);
  });
});

describe('a failed rebuild keeps everything the student had', () => {
  const assertUntouched = async (roadmap) => {
    const still = await Roadmap.findOne({ userId: me.user._id }).lean();
    assert.equal(String(still._id), String(roadmap._id));
    assert.deepEqual(still.roadmapData.educationRoadmap.map((p) => p.phase), OLD_PHASES.map((p) => p.phase));
    assert.equal(await SkillProgress.countDocuments({ userId: me.user._id, skillName: 'HTML' }), 1);
    assert.equal(await DailyPlan.countDocuments({ userId: me.user._id }), 1);
  };

  test('when the AI call throws', async () => {
    const { roadmap } = await seed();
    nextRoadmap = new Error('Daily free-tier quota exhausted');
    const res = await bare.call(me.token)('POST', '/generate', { rebuild: true });
    assert.ok(res.status >= 500, `expected a 5xx so the wallet refunds, got ${res.status}`);
    await assertUntouched(roadmap);
  });

  test('when the AI answers with no phases', async () => {
    const { roadmap } = await seed();
    nextRoadmap = () => ({ educationRoadmap: [] });
    const res = await bare.call(me.token)('POST', '/generate', { rebuild: true });
    assert.equal(res.status, 502);
    await assertUntouched(roadmap);
  });
});

describe('a successful rebuild', () => {
  test('replaces the journey and frees today for the planner, but keeps badges', async () => {
    const { roadmap } = await seed();
    await MilestoneBadge.create({
      userId: me.user._id, roadmapId: roadmap._id, phaseIndex: 0,
      phaseTitle: 'BCA Year 2', studentName: 'RoadmapRebuild Student'
    });
    const res = await bare.call(me.token)('POST', '/generate', { rebuild: true });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.notEqual(String(res.body._id), String(roadmap._id));
    assert.equal(res.body.roadmapData.stageRepair, 1, 'marked so the read-time repair never re-runs');
    assert.equal(await SkillProgress.countDocuments({ userId: me.user._id, skillName: 'HTML' }), 0);
    assert.equal(await SkillProgress.countDocuments({ userId: me.user._id, skillName: 'React' }), 1);
    assert.equal(await DailyPlan.countDocuments({ userId: me.user._id }), 0);
    assert.equal(await MilestoneBadge.countDocuments({ userId: me.user._id }), 1, 'a posted badge link survives');
  });
});

describe('badges survive a goal change', () => {
  test('a roadmap built for the old goal is not re-trimmed against the new one', async () => {
    const { roadmap } = await seed();
    // A roadmap that, read against a postgraduate goal, has a "PG Year 1"
    // phase the old per-read repair would have spliced out — badge and all.
    await Roadmap.updateOne({ _id: roadmap._id }, {
      $set: {
        'roadmapData.educationRoadmap': [
          { phase: 'BCA Year 3' }, { phase: 'Postgraduate Year 1: MCA' }, { phase: 'First Role' }
        ],
        completedPhases: [0, 1]
      }
    });
    for (const i of [0, 1]) {
      await MilestoneBadge.create({
        userId: me.user._id, roadmapId: roadmap._id, phaseIndex: i,
        phaseTitle: `phase ${i}`, studentName: 'RoadmapRebuild Student'
      });
    }
    await Goal.updateOne({ userId: me.user._id }, {
      $set: { educationLevel: 'Postgraduate', degree: 'MCA', currentYear: '2nd Year' }
    });

    const res = await real.call(me.token)('GET', '/');
    assert.equal(res.status, 200);
    assert.equal(res.body.roadmapData.educationRoadmap.length, 3);
    assert.deepEqual(res.body.completedPhases, [0, 1]);
    const badges = await MilestoneBadge.find({ userId: me.user._id }).sort({ phaseIndex: 1 }).lean();
    assert.deepEqual(badges.map((b) => [b.phaseIndex, b.phaseTitle]), [[0, 'phase 0'], [1, 'phase 1']]);
  });
});
