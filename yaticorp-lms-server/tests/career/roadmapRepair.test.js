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

  test('badges after the removed phase move down with it, keeping their links', async () => {
    await seed({ completedPhases: [0, 1, 2, 3], badgeIndices: [0, 3] });
    const MilestoneBadge = require('../../src/career/models/MilestoneBadge');
    const codesBefore = (await MilestoneBadge.find({ userId: me.user._id }).sort({ phaseIndex: 1 }).lean())
      .map((b) => b.shareCode);
    await api('GET', '/');
    assert.deepEqual(await badgesNow(), [
      [0, PHASES[0].phase],
      [2, PHASES[3].phase]   // was 3
    ]);
    const codesAfter = (await MilestoneBadge.find({ userId: me.user._id }).sort({ phaseIndex: 1 }).lean())
      .map((b) => b.shareCode);
    assert.deepEqual(codesAfter, codesBefore, 'a posted /b/<code> link must keep working');
  });

  test('a badge on the phase it would drop stops the repair; no badge is ever deleted', async () => {
    // The student earned — and may have shared — a badge for that phase, so
    // the phase is real to them. Deleting the badge broke its public link.
    await seed({ completedPhases: [0, 1, 2, 3], badgeIndices: [0, 2, 3] });
    const res = await api('GET', '/');
    assert.equal(res.body.roadmapData.educationRoadmap.length, PHASES.length);
    assert.deepEqual(res.body.completedPhases, [0, 1, 2, 3]);
    assert.deepEqual(await badgesNow(), [
      [0, PHASES[0].phase], [2, PHASES[2].phase], [3, PHASES[3].phase]
    ]);
  });

  test('runs once per roadmap, not again after the goal changes', async () => {
    await seed();
    await api('GET', '/');   // first read: repaired and marked
    const Goal = require('../../src/career/models/Goal');
    const Roadmap = require('../../src/career/models/Roadmap');
    // Put a fresh PG-entry phase back, as if written for a different goal,
    // and move the goal so the rule would match it.
    await Roadmap.updateOne(
      { userId: me.user._id },
      { $push: { 'roadmapData.educationRoadmap': { phase: 'Postgraduate Year 1: Something Else' } } }
    );
    await Goal.updateOne({ userId: me.user._id }, { $set: { currentYear: '2nd Year' } });
    const res = await api('GET', '/');
    assert.equal(res.body.roadmapData.educationRoadmap.length, 5);
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

/**
 * The order errors every roadmap from the old one-prompt template carries:
 * "Job Applications" before "Entrance & Recruitment Exams", an internship
 * after the final year of the degree, and a first master's year claiming the
 * whole degree's length. GET puts them right in place, once, moving nothing
 * the student has finished and nothing at all past a badge.
 */
describe('GET /api/roadmap puts an old roadmap in order', () => {
  const OLD = [
    { phase: 'M.Tech Data Science — 1st Year, 2nd Semester', duration: '6 months' },
    { phase: 'M.Tech Data Science — 2nd Year (Final Year)', duration: '2 years' },
    { phase: 'Internships & Industry Experience', duration: '3 to 6 months' },
    { phase: 'Job Applications & Placement Preparation', duration: '3 to 6 months' },
    { phase: 'Entrance & Recruitment Exams', duration: '3 to 6 months' },
    { phase: 'First Role → Data Scientist', duration: '1 to 3 years' }
  ];
  const seedOld = async ({ completedPhases = [], badgeIndices = [], phases = OLD, extra = {} } = {}) => {
    const Goal = require('../../src/career/models/Goal');
    const Roadmap = require('../../src/career/models/Roadmap');
    const MilestoneBadge = require('../../src/career/models/MilestoneBadge');
    await Promise.all([Goal.deleteMany({ userId: me.user._id }), Roadmap.deleteMany({ userId: me.user._id }), MilestoneBadge.deleteMany({ userId: me.user._id })]);
    const goal = await Goal.create({
      userId: me.user._id, educationLevel: 'Postgraduate', degree: 'M.Tech', specialization: 'Data Science', currentYear: '1st Year', careerGoal: 'Data Scientist'
    });
    const roadmap = await Roadmap.create({
      userId: me.user._id, goalId: goal._id, roadmapData: { educationRoadmap: phases.map((p) => ({ ...p })), ...extra }, completedPhases
    });
    for (const i of badgeIndices) {
      await MilestoneBadge.create({ userId: me.user._id, roadmapId: roadmap._id, phaseIndex: i, phaseTitle: phases[i].phase, studentName: 'RoadmapRepair Student' });
    }
    return roadmap;
  };
  const stored = async () => (await require('../../src/career/models/Roadmap').findOne({ userId: me.user._id }).lean());

  test('exams before applications, the internship before the final year', async () => {
    await seedOld();
    const res = await api('GET', '/');
    assert.equal(res.status, 200);
    const want = [OLD[0].phase, OLD[2].phase, OLD[1].phase, OLD[4].phase, OLD[3].phase, OLD[5].phase];
    assert.deepEqual(res.body.roadmapData.educationRoadmap.map((p) => p.phase), want);
    const saved = await stored();
    assert.deepEqual(saved.roadmapData.educationRoadmap.map((p) => p.phase), want);
    // One year of the degree, not two.
    assert.equal(saved.roadmapData.educationRoadmap[2].duration, '1 year');
    assert.equal(saved.roadmapData.orderRepair, 1);
    // The stage repair's own mark survives the order repair's write.
    assert.equal(saved.roadmapData.stageRepair, 1);
  });

  test('nothing the student has finished moves', async () => {
    // Finished through the final year: the internship would have to cross it.
    await seedOld({ completedPhases: [0, 1] });
    const res = await api('GET', '/');
    const phases = res.body.roadmapData.educationRoadmap.map((p) => p.phase);
    assert.deepEqual(phases.slice(0, 3), [OLD[0].phase, OLD[1].phase, OLD[2].phase]);
    // ...while the job stages, still ahead, are put in order.
    assert.deepEqual(phases.slice(3), [OLD[4].phase, OLD[3].phase, OLD[5].phase]);
    assert.deepEqual(res.body.completedPhases, [0, 1]);
  });

  test('a badge past the finished phases holds every phase where it is', async () => {
    await seedOld({ completedPhases: [0], badgeIndices: [0, 3] });
    const res = await api('GET', '/');
    assert.deepEqual(res.body.roadmapData.educationRoadmap.map((p) => p.phase), OLD.map((p) => p.phase));
    assert.deepEqual((await badgesNow()).map(([i]) => i), [0, 3]);
  });

  test('a roadmap already in order, or already repaired, is left alone', async () => {
    const inOrder = [OLD[0], OLD[2], OLD[1], OLD[4], OLD[3], OLD[5]].map((p) => ({ ...p, duration: '1 year' }));
    await seedOld({ phases: inOrder });
    await api('GET', '/');
    assert.deepEqual((await stored()).roadmapData.educationRoadmap.map((p) => p.phase), inOrder.map((p) => p.phase));
    await seedOld({ extra: { orderRepair: 1 } });
    await api('GET', '/');
    assert.deepEqual((await stored()).roadmapData.educationRoadmap.map((p) => p.phase), OLD.map((p) => p.phase));
  });

  test("a compulsory internship after the degree stays: MBBS's rotating internship", async () => {
    const mbbs = [
      { phase: 'MBBS Year 3 (Part 2) / Final Year', duration: '1 year' },
      { phase: 'Compulsory Rotatory Medical Internship', duration: '1 year' },
      { phase: 'Job Applications & Placement Preparation' }, { phase: 'First Role → Doctor' }
    ];
    await seedOld({ phases: mbbs });
    const res = await api('GET', '/');
    assert.deepEqual(res.body.roadmapData.educationRoadmap.map((p) => p.phase), mbbs.map((p) => p.phase));
  });
});
