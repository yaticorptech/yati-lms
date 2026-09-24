/**
 * Repairing a roadmap that was already saved with a phase the student had
 * finished before it was written.
 *
 * Fixing the prompt stops new roadmaps carrying the phase; it does nothing for
 * the ones in the database. An MCA Year 2 student is still looking at
 * "Postgraduate Year 1: MCA Advanced Specialisation" sitting after their own
 * final year. GET /api/roadmap repairs the record in place, which means moving
 * the progress and the badges stored against phase INDICES — the roadmap's
 * only name for a phase — by the same amount.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let server, api, me;

// The roadmap from the report, phase for phase.
const PHASES = [
  { phase: 'MCA Year 2 / Final Year (Semester 4)' },
  { phase: 'Internships & Industry Experience' },
  { phase: 'Postgraduate Year 1: MCA Advanced Specialisation & Research' },
  { phase: 'Job Applications & Placement Preparation' },
  { phase: 'First Role → Full Stack Developer' }
];

const seed = async ({ completedPhases = [], badgeIndices = [] } = {}) => {
  const Goal = require('../../src/career/models/Goal');
  const Roadmap = require('../../src/career/models/Roadmap');
  const MilestoneBadge = require('../../src/career/models/MilestoneBadge');
  await Promise.all([
    Goal.deleteMany({ userId: me.user._id }),
    Roadmap.deleteMany({ userId: me.user._id }),
    MilestoneBadge.deleteMany({ userId: me.user._id })
  ]);

  const goal = await Goal.create({
    userId: me.user._id, educationLevel: 'Postgraduate', degree: 'MCA',
    specialization: 'Computer Applications', currentYear: '2nd Year', careerGoal: 'Full Stack Developer'
  });
  const roadmap = await Roadmap.create({
    userId: me.user._id, goalId: goal._id,
    roadmapData: { educationRoadmap: PHASES.map((p) => ({ ...p })) },
    completedPhases
  });
  for (const i of badgeIndices) {
    await MilestoneBadge.create({
      userId: me.user._id, roadmapId: roadmap._id, phaseIndex: i,
      phaseTitle: PHASES[i].phase, studentName: 'RoadmapRepair Student'
    });
  }
  return roadmap;
};

const badgesNow = async () => {
  const MilestoneBadge = require('../../src/career/models/MilestoneBadge');
  const rows = await MilestoneBadge.find({ userId: me.user._id }).sort({ phaseIndex: 1 }).lean();
  return rows.map((b) => [b.phaseIndex, b.phaseTitle]);
};

before(async () => {
  await connect();
  me = await makeUser('RoadmapRepair');
  ({ server, api: undefined } = { server: null });
  const started = startApp({ mount: '/api/roadmap', router: require('../../src/career/routes/roadmapRoutes') });
  server = started.server;
  api = started.call(me.token);
});

after(async () => { await cleanup([me.user], server); });

describe('GET /api/roadmap repairs a roadmap saved with a finished phase', () => {
  test('drops the postgraduate-entry phase the student had already done', async () => {
    await seed();
    const res = await api('GET', '/');
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.roadmapData.educationRoadmap.map((p) => p.phase),
      [PHASES[0].phase, PHASES[1].phase, PHASES[3].phase, PHASES[4].phase]
    );
  });

  test('the repair sticks, rather than running on every read', async () => {
    await seed();
    await api('GET', '/');
    const Roadmap = require('../../src/career/models/Roadmap');
    const saved = await Roadmap.findOne({ userId: me.user._id }).lean();
    assert.equal(saved.roadmapData.educationRoadmap.length, 4);
    assert.doesNotMatch(JSON.stringify(saved.roadmapData), /Postgraduate Year 1/);
  });

  test('progress after the removed phase shifts down with it', async () => {
    // Finished phases 0-3, which under the old numbering included the bad one.
    await seed({ completedPhases: [0, 1, 2, 3] });
    const res = await api('GET', '/');
    // 0 and 1 stay; 2 is the phase itself and goes; 3 becomes 2.
    assert.deepEqual(res.body.completedPhases, [0, 1, 2]);
  });

  test('badges move with their phase, and the orphan is deleted', async () => {
    await seed({ completedPhases: [0, 1, 2, 3], badgeIndices: [0, 2, 3] });
    await api('GET', '/');
    assert.deepEqual(await badgesNow(), [
      [0, PHASES[0].phase],
      [2, PHASES[3].phase]   // was 3; the badge for phase 2 went with the phase
    ]);
  });

  test('a roadmap with nothing to drop is left exactly alone', async () => {
    const Roadmap = require('../../src/career/models/Roadmap');
    await seed();
    await Roadmap.updateOne(
      { userId: me.user._id },
      { $set: { 'roadmapData.educationRoadmap': [PHASES[0], PHASES[1], PHASES[3]] } }
    );
    const before = await Roadmap.findOne({ userId: me.user._id }).lean();
    const res = await api('GET', '/');
    assert.equal(res.body.roadmapData.educationRoadmap.length, 3);
    assert.equal(before.updatedAt.getTime(),
      (await Roadmap.findOne({ userId: me.user._id }).lean()).updatedAt.getTime());
  });
});
