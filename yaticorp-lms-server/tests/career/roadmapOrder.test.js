/**
 * The order of a roadmap's stages.
 *
 * The roadmaps saved before this came out of one prompt with a fixed template,
 * and were in the wrong order in ways a student notices at once: entrance
 * exams after the degree they let you into, internships after graduation, a
 * BSc 1st-year student's roadmap opening at Year 2, "BCA Year 2 / 5th
 * Semester", "Postgraduate Year 1 (2 years)". Each case below is one of them.
 *
 * The rules (roadmapPlan.js) are pure. The pipeline at the end runs against a
 * fake Gemini that makes the same mistakes, so nothing here spends a call.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// The pipeline's AI client and metering, replaced before the service loads.
const userAiKey = require('../../src/utils/userAiKey');
const aiQuota = require('../../src/career/services/aiQuota');
aiQuota.assertWithinBudget = async () => {};
aiQuota.record = async () => {};
let fakeGemini = null;
userAiKey.geminiClient = async () => ({ models: { generateContent: (req) => fakeGemini(req) } });

const { openingStages, checkPlan, fillMissing, timelineFor } = require('../../src/career/services/roadmapPlan');
const { generateRoadmapFromAI } = require('../../src/career/services/geminiService');

const titles = (stages) => stages.map((s) => s.title);
const kinds = (stages) => stages.map((s) => s.kind);

describe('where the roadmap starts: from the student’s own answers', () => {
  test('a Class 5 student has every class to Class 12, in order, ISC for 11 and 12', () => {
    const opening = openingStages({ educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 5', board: 'ICSE' }, { stream: 'Science – PCM' });
    assert.deepEqual(titles(opening), [
      'Class 5 (ICSE)', 'Class 6 (ICSE)', 'Class 7 (ICSE)', 'Class 8 (ICSE)', 'Class 9 (ICSE)', 'Class 10 (ICSE)',
      'Class 11 (ISC · Science – PCM)', 'Class 12 (ISC · Science – PCM)'
    ]);
  });

  test('a BSc 1st-year student starts at Year 1, not Year 2', () => {
    const opening = openingStages({ educationLevel: 'Undergraduate', degree: 'BSc', specialization: 'Statistics', currentYear: '1st year' });
    assert.deepEqual(titles(opening), [
      'BSc Statistics Year 1 (Semesters 1–2)', 'BSc Statistics Year 2 (Semesters 3–4)', 'BSc Statistics Year 3 / Final Year (Semesters 5–6)'
    ]);
  });

  test('semester 4 is the end of Year 2, and semester 5 belongs to Year 3', () => {
    const opening = openingStages({ educationLevel: 'Undergraduate', degree: 'BCA', specialization: 'Computer Science', currentYear: '2nd Year', semester: '4' });
    assert.deepEqual(titles(opening), ['BCA Computer Science Year 2 (Semester 4)', 'BCA Computer Science Year 3 / Final Year (Semesters 5–6)']);
    assert.equal(opening[0].duration, '6 months');
  });

  test('a semester that does not belong to the year is not repeated', () => {
    const [first] = openingStages({ educationLevel: 'Undergraduate', degree: 'BCA', currentYear: '2nd Year', semester: '5' });
    assert.equal(first.title, 'BCA Year 2 (Semesters 3–4)');
  });

  test('"3rd Year" of a two-year M.Com is its final year', () => {
    const opening = openingStages({ educationLevel: 'Postgraduate', degree: 'M.Com', specialization: 'Banking & Insurance', currentYear: '3rd Year' });
    assert.deepEqual(titles(opening), ['M.Com Banking & Insurance Year 2 / Final Year (Semesters 3–4)']);
    assert.equal(opening[0].kind, 'pg');
  });

  test('a working professional starts at their current role', () => {
    const opening = openingStages({ educationLevel: 'Working Professional', currentJob: 'QA Engineer', experience: 3 });
    assert.deepEqual(titles(opening), ['QA Engineer (current role, 3 years in)']);
    assert.equal(opening[0].kind, 'work');
  });
});

describe('the plan after it: put right, or sent back', () => {
  const class12 = { educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12', stream: 'Commerce', careerGoal: 'HR Manager' };

  test('an entrance exam after the stage it opens is moved before it', () => {
    const { stages } = checkPlan([
      { title: 'BBA Year 1', kind: 'degree' }, { title: 'BBA Year 2', kind: 'degree' }, { title: 'BBA Year 3 / Final Year', kind: 'degree' },
      { title: 'MBA Year 1 (HR)', kind: 'pg' }, { title: 'MBA Year 2 (HR)', kind: 'pg' },
      { title: 'CAT / XAT', kind: 'exam', unlocks: 'MBA Year 1 (HR)' },
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' }, { title: 'First Role → HR Manager', kind: 'first-role' }
    ], class12, openingStages(class12));
    const cat = titles(stages).indexOf('CAT / XAT');
    assert.equal(titles(stages)[cat + 1], 'MBA Year 1 (HR)');
  });

  test('a stage that needs a named exam, with none before it, gets one', () => {
    const { stages } = checkPlan([
      { title: 'College Year 1: BBA / B.Com', kind: 'degree', entry: 'CUET' },
      { title: 'First Role → HR Manager', kind: 'first-role' }, { title: 'Job Applications & Placement Preparation', kind: 'job-search' }
    ], class12, openingStages(class12));
    assert.deepEqual(titles(stages).slice(0, 3), ['Class 12 (Commerce)', 'Entrance exam: CUET', 'College Year 1: BBA / B.Com']);
  });

  test('"merit" and an exam already in the plan add nothing', () => {
    const { stages } = checkPlan([
      { title: 'JEE Main & Advanced', kind: 'exam', unlocks: 'B.Tech CSE Year 1' },
      { title: 'B.Tech CSE Year 1', kind: 'degree', entry: 'JEE Main' },
      { title: 'BCA Year 1', kind: 'degree', entry: 'merit' }
    ], class12, []);
    assert.deepEqual(titles(stages), ['JEE Main & Advanced', 'B.Tech CSE Year 1', 'BCA Year 1']);
  });

  test('an internship after the last degree moves before its final year', () => {
    const ug = { educationLevel: 'Undergraduate', degree: 'B.Tech', currentYear: '3rd Year', careerGoal: 'Software Engineer' };
    const { stages } = checkPlan([
      { title: 'Internships & Industry Experience', kind: 'internship' },
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' }, { title: 'First Role → Software Engineer', kind: 'first-role' }
    ], ug, openingStages(ug));
    assert.deepEqual(titles(stages), [
      'B.Tech Year 3 (Semesters 5–6)', 'Internships & Industry Experience', 'B.Tech Year 4 / Final Year (Semesters 7–8)',
      'Job Applications & Placement Preparation', 'First Role → Software Engineer'
    ]);
  });

  test('for a student already in their final year, it runs alongside it', () => {
    const pg = { educationLevel: 'Postgraduate', degree: 'MCA', currentYear: '2nd Year', careerGoal: 'Full Stack Developer' };
    const { stages } = checkPlan([
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' },
      { title: 'Internships & Industry Experience', kind: 'internship' },
      { title: 'First Role → Full Stack Developer', kind: 'first-role' }
    ], pg, openingStages(pg));
    assert.deepEqual(kinds(stages), ['pg', 'internship', 'job-search', 'first-role']);
  });

  test('an internship is never moved into school years', () => {
    const school = { educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 11', careerGoal: 'Pilot' };
    const { stages } = checkPlan([
      { title: 'Internships & Industry Experience', kind: 'internship' },
      { title: 'First Role → Pilot', kind: 'first-role' }, { title: 'Job Applications & Placement Preparation', kind: 'job-search' }
    ], school, openingStages(school));
    assert.deepEqual(kinds(stages), ['school', 'school', 'internship', 'job-search', 'first-role']);
  });

  test("a compulsory internship stays after its degree: MBBS's rotating internship", () => {
    const { stages } = checkPlan([
      { title: 'MBBS Year 4', kind: 'degree', duration: '1.5 years' },
      { title: 'Compulsory Rotatory Medical Internship', kind: 'internship', duration: '1 year' },
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' }, { title: 'First Role → Doctor', kind: 'first-role' }
    ], class12, []);
    assert.deepEqual(titles(stages).slice(0, 2), ['MBBS Year 4', 'Compulsory Rotatory Medical Internship']);
  });

  test('getting the job comes last: hiring tests, applications, the role', () => {
    const { stages } = checkPlan([
      { title: 'First Role → HR Manager', kind: 'first-role' },
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' },
      { title: 'Recruitment Exams & Hiring Tests', kind: 'recruitment' },
      { title: 'BBA Year 1', kind: 'degree' }
    ], class12, openingStages(class12));
    assert.deepEqual(kinds(stages), ['school', 'degree', 'recruitment', 'job-search', 'first-role']);
  });

  test('years the opening already has, and finished classes, are dropped', () => {
    const ug = { educationLevel: 'Undergraduate', degree: 'BCA', currentYear: '2nd Year', careerGoal: 'Backend Developer' };
    const { stages } = checkPlan([
      { title: 'Class 12', kind: 'school' },
      { title: 'BCA Year 2 / 5th Semester', kind: 'degree' },
      { title: 'BCA Year 3 / 6th Semester (Final Year)', kind: 'degree' },
      { title: 'MCA Year 1', kind: 'pg' }
    ], ug, openingStages(ug));
    assert.deepEqual(titles(stages), ['BCA Year 2 (Semesters 3–4)', 'BCA Year 3 / Final Year (Semesters 5–6)', 'MCA Year 1']);
  });

  test('one year of study is not the whole degree', () => {
    const { stages } = checkPlan([{ title: 'Postgraduate Year 1: M.Des / MBA', kind: 'pg', duration: '2 years' }], class12, []);
    assert.equal(stages[0].duration, '1 year');
  });

  test('a year and a half that is real stays: the last part of MBBS', () => {
    const { stages } = checkPlan([{ title: 'MBBS Year 4', kind: 'degree', duration: '1.5 years' }], class12, []);
    assert.equal(stages[0].duration, '1.5 years');
  });

  test('the timeline adds up the plan: each programme by name, internships and exams alongside it', () => {
    const st = (title, kind, duration) => ({ title, kind, duration });
    assert.equal(timelineFor([
      st('BCA Year 2 (Semester 4)', 'degree', '6 months'), st('BCA Year 3 / Final Year', 'degree', '1 year'),
      st('NIMCET', 'exam', '3–6 months'), st('MCA Year 1', 'pg', '1 year'),
      st('Internships & Industry Experience', 'internship', '3–6 months'), st('MCA Year 2 / Final Year', 'pg', '1 year'),
      st('Job Applications & Placement Preparation', 'job-search', '2–3 months'), st('First Role → Backend Developer', 'first-role', 'Ongoing')
    ]), 'About 3.5–4 years from now: BCA Year 2 (Semester 4) to BCA Year 3 / Final Year (1.5 years), MCA Year 1 to MCA Year 2 / Final Year (2 years), plus about 2–3 months for the shorter steps in between.');
    // A year of preparing for JEE is Class 12, not a year after it.
    assert.match(timelineFor([
      st('Class 12', 'school', '1 year'), st('JEE Main & Advanced', 'exam', '1 year'),
      st('B.Tech Year 1', 'degree', '1 year'), st('B.Tech Year 2', 'degree', '1 year'), st('B.Tech Year 3', 'degree', '1 year'), st('B.Tech Year 4', 'degree', '1 year')
    ]), /^About 5 years from now:/);
    // The doctor the model counted as "13 to 14 years".
    assert.match(timelineFor([
      st('Class 10', 'school', '1 year'), st('Class 11', 'school', '1 year'), st('Class 12', 'school', '1 year'),
      st('MBBS Year 1', 'degree', '1 year'), st('MBBS Year 2', 'degree', '1 year'), st('MBBS Year 3', 'degree', '1 year'), st('MBBS Year 4', 'degree', '1.5 years'),
      st('MD / MS Year 1', 'pg', '1 year'), st('MD / MS Year 2', 'pg', '1 year'), st('MD / MS Year 3', 'pg', '1 year')
    ]), /^About 10\.5 years from now: Class 10 to Class 12 \(3 years\), MBBS Year 1 to MBBS Year 4 \(4\.5 years\), MD \/ MS Year 1 to MD \/ MS Year 3 \(3 years\)\.$/);
  });

  test('merged years, a skipped year and a year the degree lacks are sent back', () => {
    const merged = checkPlan([{ title: 'Lateral Entry Degree Year 2-3: B.Tech CSE', kind: 'degree' }], class12, []);
    assert.ok(merged.problems.some((p) => p.hard && /several years/.test(p.text)));
    const skipped = checkPlan([{ title: 'MCA Year 1', kind: 'pg' }, { title: 'MCA Year 3', kind: 'pg' }], class12, []);
    assert.ok(skipped.problems.some((p) => p.hard && /one after another/.test(p.text)));
    const extra = checkPlan([{ title: 'BCA Year 3', kind: 'degree' }, { title: 'BCA Year 4', kind: 'degree' }], class12, []);
    assert.ok(extra.problems.some((p) => p.hard && /only 3 years/.test(p.text)));
  });

  test('"Bachelor of Technology Year 4" is not read as a three-year BA', () => {
    const { problems } = checkPlan([
      { title: 'Bachelor of Technology Year 3', kind: 'degree' }, { title: 'Bachelor of Technology Year 4', kind: 'degree' }
    ], class12, []);
    assert.ok(!problems.some((p) => p.hard), JSON.stringify(problems));
  });

  test('a working professional is not sent back to an internship', () => {
    const pro = { educationLevel: 'Working Professional', currentJob: 'QA Engineer', careerGoal: 'Engineering Manager' };
    const { stages, problems } = checkPlan([
      { title: 'QA Engineer → SDET', kind: 'work' }, { title: 'Internships & Industry Experience', kind: 'internship' },
      { title: 'Next Role → Engineering Manager', kind: 'first-role' }
    ], pro, []);
    assert.deepEqual(kinds(stages), ['work', 'first-role']);
    assert.deepEqual(problems, []);
  });

  test('a Data Scientist is not told to get a PhD; a Researcher is', () => {
    const plan = [{ title: 'Job Applications & Placement Preparation', kind: 'job-search' }, { title: 'First Role', kind: 'first-role' }];
    const ug = { educationLevel: 'Undergraduate', degree: 'MBBS', currentYear: '5th year' };
    assert.ok(!checkPlan(plan, { ...ug, careerGoal: 'Data Scientist' }, []).problems.some((p) => /PhD/.test(p.text)));
    assert.ok(checkPlan(plan, { ...ug, careerGoal: 'Medical Researcher' }, []).problems.some((p) => /PhD/.test(p.text)));
  });

  test('a plan with no job stages gets them, in order, at the end', () => {
    const checked = checkPlan([{ title: 'BBA Year 1', kind: 'degree' }], class12, openingStages(class12));
    assert.deepEqual(kinds(fillMissing(checked.stages, checked.problems, class12)), ['school', 'degree', 'job-search', 'first-role']);
  });
});

describe('the whole pipeline, against a fake Gemini that gets the order wrong', () => {
  // Plans and writes like the model: the plan puts CAT after the MBA and the
  // internship after graduation; each write call returns the stages it was
  // asked for, named as in the plan.
  const planFor = (opts) => ({
    route: [
      { title: 'College Year 1: BBA / B.Com (HR)', kind: 'degree', entry: 'CUET' },
      { title: 'College Year 2: BBA / B.Com (HR)', kind: 'degree' },
      { title: 'College Year 3: BBA / B.Com (Final Year)', kind: 'degree' },
      { title: 'MBA Year 1 (HR)', kind: 'pg', duration: '2 years' },
      { title: 'MBA Year 2 (HR)', kind: 'pg' },
      { title: 'Internships & Industry Experience', kind: 'internship' },
      { title: 'Job Applications & Placement Preparation', kind: 'job-search' },
      { title: 'CAT / XAT', kind: 'exam', unlocks: 'MBA Year 1 (HR)' },
      { title: 'First Role → HR Manager', kind: 'first-role' },
      ...(opts.merged ? [{ title: 'MBA Year 3-4', kind: 'pg' }] : [])
    ]
  });
  const calls = [];
  const fake = (opts = {}) => async ({ contents, config }) => {
    const { merged = false, dropOne = false } = opts;
    calls.push({ contents, config });
    if (/PLAN a student/.test(contents)) {
      // Sent back once with problems: the second answer is clean.
      return { text: JSON.stringify(planFor({ merged: merged && !/YOUR PREVIOUS PLAN/.test(contents) })) };
    }
    const [, from, to] = contents.match(/WRITE STAGES (\d+) TO (\d+)/);
    const plan = contents.split('THE PLAN')[1].split('WRITE STAGES')[0];
    const stageTitles = [...plan.matchAll(/^\d+\. (.+?)(?: — .*)?$/gm)].map((m) => m[1]);
    let wanted = stageTitles.slice(from - 1, to);
    // Drop the last stage of the first part, once: the retry must fill it.
    if (dropOne && Number(from) === 1 && !calls.some((c) => c.dropped)) { calls[calls.length - 1].dropped = true; wanted = wanted.slice(0, -1); }
    const reply = {
      educationRoadmap: wanted.map((t) => ({ phase: t, description: `About ${t}.`, actionItems: ['Do it'] })),
      ...(/"currentStage"/.test(contents)
        ? (opts.cutExtras && !calls.some((c) => c.cut) ? (calls[calls.length - 1].cut = true, { currentStage: 'Cut', colleges: [{ name: 'One' }] })
          : { currentStage: 'Now', colleges: [], timeline: 't', motivation: 'm' })
        : {})
    };
    return { text: JSON.stringify(reply) };
  };
  const goal = { educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12', stream: 'Commerce', careerGoal: 'HR Manager', country: 'India' };

  test('the saved roadmap is in the right order, whatever order the plan came in', async () => {
    calls.length = 0;
    fakeGemini = fake();
    const roadmap = await generateRoadmapFromAI(goal);
    assert.deepEqual(roadmap.educationRoadmap.map((p) => p.phase), [
      'Class 12 (Commerce)',
      'Entrance exam: CUET',
      'College Year 1: BBA / B.Com (HR)',
      'College Year 2: BBA / B.Com (HR)',
      'College Year 3: BBA / B.Com (Final Year)',
      'CAT / XAT',
      'MBA Year 1 (HR)',
      'Internships & Industry Experience',
      'MBA Year 2 (HR)',
      'Job Applications & Placement Preparation',
      'First Role → HR Manager'
    ]);
    assert.equal(roadmap.educationRoadmap.find((p) => p.phase === 'MBA Year 1 (HR)').duration, '1 year');
    assert.equal(roadmap.currentStage, 'Now');
    // The plan is the call given room to think; the write-ups are not.
    assert.ok(calls[0].config.thinkingConfig?.thinkingBudget > 0);
    assert.ok(calls.slice(1).every((c) => !c.config.thinkingConfig));
  });

  test('a plan with merged years is sent back once, with its problems', async () => {
    calls.length = 0;
    fakeGemini = fake({ merged: true });
    const roadmap = await generateRoadmapFromAI(goal);
    const plans = calls.filter((c) => /PLAN a student/.test(c.contents));
    assert.equal(plans.length, 2);
    assert.match(plans[1].contents, /covers several years in one stage/);
    assert.ok(!roadmap.educationRoadmap.some((p) => /Year 3-4/.test(p.phase)));
  });

  test('a stage the write-up left out is asked for again, not dropped', async () => {
    calls.length = 0;
    fakeGemini = fake({ dropOne: true });
    const roadmap = await generateRoadmapFromAI(goal);
    assert.equal(roadmap.educationRoadmap.length, 11);
    assert.ok(roadmap.educationRoadmap.every((p) => p.description));
  });

  test('a write-up cut off before its timeline is asked for again', async () => {
    calls.length = 0;
    fakeGemini = fake({ cutExtras: true });
    const roadmap = await generateRoadmapFromAI(goal);
    assert.equal(roadmap.currentStage, 'Now');
    // The timeline is not the model's to write: it is the plan, added up.
    assert.match(roadmap.timeline, /^About .* from now: Class 12 \(Commerce\) \(1 year\), College Year 1: BBA \/ B\.Com \(HR\) to College Year 3/);
    assert.ok(calls.every((c) => !/"timeline"/.test(c.contents)));
  });

  test('a long roadmap is written in parts of eight, side by side', async () => {
    calls.length = 0;
    fakeGemini = fake();
    await generateRoadmapFromAI({ ...goal, educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 5', stream: undefined });
    const parts = calls.filter((c) => /WRITE STAGES/.test(c.contents)).map((c) => c.contents.match(/WRITE STAGES (\d+ TO \d+)/)[1]);
    assert.deepEqual(parts, ['1 TO 8', '9 TO 16', '17 TO 18']);
  });

  test('a model with no thinking mode is asked again without it', async () => {
    calls.length = 0;
    const inner = fake();
    let refused = false;
    fakeGemini = async (req) => {
      if (req.config.thinkingConfig && !refused) {
        refused = true;
        const error = new Error('thinking is not supported by this model');
        error.status = 400;
        throw error;
      }
      return inner(req);
    };
    const roadmap = await generateRoadmapFromAI(goal);
    assert.ok(refused);
    assert.equal(roadmap.educationRoadmap.length, 11);
  });

  test('a plan still wrong after a second look is not saved, and refunds (5xx)', async () => {
    fakeGemini = async ({ contents }) => {
      if (/PLAN a student/.test(contents)) return { text: JSON.stringify({ route: [{ title: 'MBA Year 1-2', kind: 'pg' }] }) };
      throw new Error('should not be written');
    };
    await assert.rejects(generateRoadmapFromAI(goal), (error) => error.status === 502 && /correct order/.test(error.message));
  });
});
