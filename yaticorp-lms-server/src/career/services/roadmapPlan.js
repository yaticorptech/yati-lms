/**
 * The order of a roadmap's stages, decided and checked in code.
 *
 * A roadmap used to come out of one prompt that handed the model a fixed
 * template — final year, internships, postgraduate, job applications, exams,
 * first role — for every career. The model filled the template in, and the
 * saved roadmaps showed what that does:
 *
 *   - entrance exams after the stage they let you into: a Class 12 student's
 *     "Entrance & Recruitment Exams (Prior to PG)" sat after MBA Year 2, an
 *     MD came before NEET-PG, a pilot's DGCA papers came after flying school;
 *   - internships after the last degree was finished;
 *   - a pilot given "Internships", a Cost Accountant never given the CMA;
 *   - a BSc Statistics 1st-year student whose roadmap opened at Year 2, and
 *     "BCA Year 2 / 5th Semester" (semester 5 is Year 3);
 *   - "Postgraduate Year 1 (2 years)" followed by "Postgraduate Year 2".
 *
 * So the roadmap is now planned before it is written (geminiService), and
 * this module is the part that does not trust the model:
 *
 *   openingStages  the stages the student is certainly about to live — the
 *                  rest of their school classes, or the rest of their current
 *                  degree — written here from their own answers, never by
 *                  the model;
 *   checkPlan      everything after that, as the model planned it: put right
 *                  where the fix is certain, reported where it is not.
 *
 * Pure functions throughout, so the rules are tested without a Gemini call.
 */

/**
 * Standard programme lengths, in years, for the degrees this app actually sees.
 *
 * Degrees are NOT all four years: BCA, B.Sc, B.Com and BBA run three, most
 * master's run two, and MBBS runs five and a half. Left to itself the model
 * defaults to a four-year bachelor's and a two-year master's, which produces a
 * "Year 4" phase for a BCA student whose course ends at Year 3.
 *
 * Keys are matched against a normalised (lowercased, punctuation-stripped)
 * degree name, longest first, so "b.tech" wins over "b" and "m.sc" over "sc".
 */
const DEGREE_YEARS = {
  // Undergraduate
  'btech': 4, 'be': 4, 'bengineering': 4,
  'bca': 3, 'bsc': 3, 'bcom': 3, 'bba': 3, 'ba': 3, 'bbm': 3, 'bms': 3,
  'bscagriculture': 4, 'bscnursing': 4, 'bpharm': 4, 'bdes': 4, 'bfa': 4,
  'barch': 5, 'mbbs': 5.5, 'bds': 5, 'bvsc': 5, 'pharmd': 6,
  'llb': 3, 'balllb': 5, 'bbaLlb': 5,
  'diploma': 3, 'polytechnic': 3,
  // Postgraduate
  'mtech': 2, 'me': 2, 'mca': 2, 'msc': 2, 'mcom': 2, 'mba': 2, 'ma': 2,
  'mpharm': 2, 'mdes': 2, 'llm': 2, 'ms': 2, 'md': 3, 'phd': 4
};

/** Normalise a degree name for lookup: "B.Tech (Hons)" -> "btech". */
const normaliseDegree = (degree = '') =>
  String(degree).toLowerCase().replace(/[^a-z]/g, '');

/**
 * How long the student's current programme runs, or null when unrecognised.
 * Returns years and the semester count, since Indian programmes are usually
 * discussed in semesters.
 */
const degreeLength = (goal) => {
  const key = normaliseDegree(goal?.degree);
  if (!key) return null;

  // Longest key first so "btech" is not shadowed by a shorter partial match.
  const match = Object.keys(DEGREE_YEARS)
    .sort((a, b) => b.length - a.length)
    .find((k) => key.startsWith(k) || key === k);

  if (!match) return null;
  const years = DEGREE_YEARS[match];
  return { years, semesters: Math.round(years * 2) };
};

/**
 * The length of a degree named in a stage's title, or null. Stricter than
 * degreeLength: a title's words are not a degree field, and "Bachelor of
 * Technology" must not be read as a three-year BA because it starts "ba". The
 * two-letter keys (BA, BE, MA, ME, MS, MD) count only when they are the
 * whole name.
 */
const titleDegreeYears = (key) => {
  const match = Object.keys(DEGREE_YEARS)
    .sort((a, b) => b.length - a.length)
    .find((k) => key === k || (k.length >= 3 && key.startsWith(k)));
  return match ? DEGREE_YEARS[match] : null;
};

/** What a stage can be. Anything else the model writes is read as 'training'. */
const KINDS = [
  'school', 'exam', 'degree', 'pg', 'phd', 'internship', 'training', 'qualification',
  'recruitment', 'job-search', 'first-role', 'work'
];
// Studying, in any form: what an internship has to come before the end of.
const STUDY = ['school', 'degree', 'pg', 'phd', 'training', 'qualification'];
// An internship a degree itself requires after its final exams — MBBS and BDS's
// rotating internship, a BPT or nursing internship, a house job — is part of
// the degree and stays where it is. Only the industry kind moves.
const COMPULSORY_INTERNSHIP = /compulsory|rotat|house\s*(?:surgeon|job)|crmi|clinical|mandatory|statutory|practical training|residency/i;
// Getting the job, always last, always in this order.
const TAIL = { recruitment: 0, 'job-search': 1, 'first-role': 2 };

const isSchoolLevel = (level = '') => /school|secondary/i.test(level);
const isWorking = (goal) => goal?.educationLevel === 'Working Professional';
const PAST_SCHOOL = ['Diploma', 'Undergraduate', 'Postgraduate', 'Working Professional'];

/** For comparing titles: lowercase words, nothing else. */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const firstNumber = (s) => Number(String(s || '').match(/\d+/)?.[0]) || null;

/** "BCA" + "Computer Science", without "Diploma in IT Information Technology". */
const programmeName = (goal) => {
  const degree = String(goal.degree || '').trim();
  const spec = String(goal.specialization || '').trim();
  if (!degree) return spec || goal.educationLevel;
  if (!spec || degree.toLowerCase().includes(spec.toLowerCase())) return degree;
  return `${degree} ${spec}`;
};

/**
 * "Class 11 (ISC · Science – PCM)". The board's own name for its senior
 * classes where it has one: ICSE schools sit the ISC in Class 11 and 12.
 */
const schoolTitle = (k, board, stream) => {
  const boardName = board && k >= 11 && /^icse$/i.test(board.trim()) ? 'ISC' : board;
  const extras = [boardName, k >= 11 ? stream : null].filter(Boolean).join(' · ');
  return extras ? `Class ${k} (${extras})` : `Class ${k}`;
};

/**
 * "BCA Year 2 (Semesters 3–4)", "BCA Year 3 / Final Year (Semesters 5–6)".
 * The semester a student gave is kept on their current year only, and only
 * when it belongs to that year — "Year 2, semester 5" is the error this
 * replaces, not something to repeat.
 */
const degreeTitle = (name, k, last, { semester, semesters } = {}) => {
  const finalYear = last && k === last ? ' / Final Year' : '';
  let sems = '';
  if (semesters) {
    const a = 2 * k - 1, b = 2 * k;
    sems = semester === b ? ` (Semester ${b})` : ` (Semesters ${a}–${b})`;
  }
  return `${name} Year ${k}${finalYear}${sems}`;
};

/**
 * The stages the student is certainly about to live, in order, from their own
 * answers: every school class from theirs to Class 12, or every year of their
 * current degree from theirs to its last. Empty when their answers do not say
 * enough (no class, an unrecognised degree with no year), in which case the
 * model plans from their current stage and checkPlan holds it to that.
 *
 * `stream` is the Class 11–12 stream the plan chose, for a student who has not
 * picked one yet; their own answer wins when they have.
 */
const openingStages = (goal, { stream } = {}) => {
  const level = goal?.educationLevel || '';

  if (isSchoolLevel(level)) {
    const n = firstNumber(goal.currentClass);
    if (!n || n > 12) return [];
    const chosen = goal.stream || stream || null;
    const out = [];
    for (let k = n; k <= 12; k++) {
      out.push({ title: schoolTitle(k, goal.board, chosen), kind: 'school', duration: '1 year', fixed: true });
    }
    return out;
  }

  if (['Undergraduate', 'Postgraduate', 'Diploma'].includes(level)) {
    const length = degreeLength(goal);
    const last = length ? Math.ceil(length.years) : null;
    let year = /final/i.test(goal.currentYear || '') && last ? last : firstNumber(goal.currentYear);
    if (!year) return [];
    // "3rd Year" of a two-year M.Com can only mean its final year.
    if (last && year > last) year = last;
    const kind = level === 'Postgraduate' ? 'pg' : 'degree';
    const name = programmeName(goal);
    // Semesters only where the programme really runs in two a year.
    const semesters = length && Number.isInteger(length.years) && length.years <= 5;
    const semester = firstNumber(goal.semester);
    const validSemester = semester && Math.ceil(semester / 2) === year ? semester : null;

    if (!last) {
      return [{ title: `${name} Year ${year}`, kind, duration: '1 year', fixed: true }];
    }
    const out = [];
    for (let k = year; k <= last; k++) {
      const current = k === year ? validSemester : null;
      out.push({
        title: degreeTitle(name, k, last, { semester: current, semesters }),
        kind,
        // Half of the current year is already behind a student in its second semester.
        duration: current && current === 2 * k ? '6 months' : length.years - (k - 1) < 1 ? '6 months' : '1 year',
        fixed: true
      });
    }
    return out;
  }

  // A working professional starts where they are, like everyone else: their
  // current role, which the plan then climbs from.
  if (isWorking(goal) && String(goal.currentJob || '').trim()) {
    const years = Number(goal.experience) > 0 ? `, ${Number(goal.experience)} year${Number(goal.experience) === 1 ? '' : 's'} in` : '';
    return [{ title: `${String(goal.currentJob).trim()} (current role${years})`, kind: 'work', duration: 'Ongoing', fixed: true }];
  }

  return [];
};

/** The model's stage, tidied, or null when it is not one. */
const cleanStage = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title || raw.phase || '').replace(/\s+/g, ' ').trim();
  if (!title) return null;
  let kind = String(raw.kind || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (kind === 'jobsearch' || kind === 'job') kind = 'job-search';
  if (kind === 'firstrole' || kind === 'role') kind = 'first-role';
  if (!KINDS.includes(kind)) kind = 'training';
  const out = { title, kind };
  for (const k of ['duration', 'why', 'entry', 'unlocks']) {
    const v = String(raw[k] || '').replace(/\s+/g, ' ').trim();
    if (v) out[k] = v;
  }
  return out;
};

const SCHOOL_TITLE = /^\s*(?:phase\s*\d+\s*[:-]\s*)?(?:class|grade|std\.?|standard)\s*\d+/i;
// Several years in one stage: "Year 2–3", "Class 6-8", "Semesters 3 to 5" is fine (one year's two).
const MERGED_YEARS = /\b(?:year|class|grade|std)s?\s*\d+\s*(?:-|–|—|to|and|&)\s*(?:year\s*|class\s*)?\d+/i;
// Admission that needs no exam stage before it.
const NO_EXAM = /^(?:none|n\/?a|not applicable|merit|direct|automatic|lateral|interview|board marks|class 1[02] marks|marks)\b/i;

/** "College Year 1: B.Tech / BCA" -> { key: 'college', year: 1 }. */
const programmeYear = (title) => {
  const m = String(title).match(/^(.*?)\byear\s*(\d+)/i);
  if (!m) return null;
  return { key: normaliseDegree(m[1]) || 'year', year: Number(m[2]) };
};

/** Where `to` is, or -1: an exam's "unlocks" may abbreviate the title it names. */
const findTitle = (stages, to, from = 0) => {
  const want = norm(to);
  if (!want) return -1;
  for (let i = from; i < stages.length; i++) {
    const have = norm(stages[i].title);
    if (have === want || have.startsWith(want) || want.startsWith(have)) return i;
  }
  return -1;
};

const move = (list, from, to) => {
  const [item] = list.splice(from, 1);
  list.splice(from < to ? to - 1 : to, 0, item);
};

/**
 * The model's planned route after the opening, put in order and checked.
 *
 * Returns the whole roadmap (opening + route), the fixes made, and the
 * problems that could not be fixed with certainty. `problems` that are
 * `hard` mean the plan is wrong and must not be written; `soft` ones are a
 * stage the student should have but is not wrong without.
 */
const checkPlan = (route, goal, opening = []) => {
  const fixes = [];
  const problems = [];
  const fix = (msg) => fixes.push(msg);
  const working = isWorking(goal);
  const pastSchool = PAST_SCHOOL.includes(goal?.educationLevel);

  // ---- 1. Only stages still ahead, each once, none the opening already has.
  const openingKey = opening.length && opening[0].kind !== 'school' ? normaliseDegree(goal.degree) : null;
  const lastOpeningYear = openingKey ? firstNumber(opening[opening.length - 1].title.match(/year\s*\d+/i)?.[0]) : null;
  const seen = new Set(opening.map((s) => norm(s.title)));
  let stages = [];
  for (const stage of (Array.isArray(route) ? route : []).map(cleanStage).filter(Boolean)) {
    const isSchool = stage.kind === 'school' || SCHOOL_TITLE.test(stage.title);
    if (isSchool && (pastSchool || opening.some((s) => s.kind === 'school'))) {
      fix(`dropped "${stage.title}": a school class ${pastSchool ? 'already behind the student' : 'already in the opening'}`);
      continue;
    }
    const py = programmeYear(stage.title);
    if (openingKey && py && normaliseDegree(stage.title).startsWith(openingKey) && py.year <= lastOpeningYear) {
      fix(`dropped "${stage.title}": a year of the current degree, already in the opening`);
      continue;
    }
    if (working && (stage.kind === 'internship' || isSchool)) {
      fix(`dropped "${stage.title}": a working professional does not go back to it`);
      continue;
    }
    if (seen.has(norm(stage.title))) {
      fix(`dropped "${stage.title}": repeated`);
      continue;
    }
    seen.add(norm(stage.title));
    stages.push(stage);
  }
  let all = [...opening.map((s) => ({ ...s })), ...stages];

  // ---- 2. Years one at a time, in order, no more than the degree has.
  const runs = new Map();
  all.forEach((s, i) => {
    if (!['school', 'degree', 'pg'].includes(s.kind)) return;
    if (MERGED_YEARS.test(s.title)) {
      problems.push({ hard: true, text: `"${s.title}" covers several years in one stage. Give each year its own stage.` });
    }
    const py = s.kind === 'school' ? { key: 'class', year: firstNumber(s.title) } : programmeYear(s.title);
    if (!py || !py.year) return;
    const prev = runs.get(py.key);
    if (prev && py.year !== prev.year + 1) {
      problems.push({ hard: true, text: `"${s.title}" follows "${prev.title}": years must run one after another (${prev.year} then ${prev.year + 1}).` });
    }
    const years = s.kind === 'school' ? null : titleDegreeYears(py.key);
    if (years && py.year > Math.ceil(years)) {
      problems.push({ hard: true, text: `"${s.title}": this degree has only ${years} years, so there is no Year ${py.year}.` });
    }
    runs.set(py.key, { year: py.year, title: s.title, at: i });
    // One year of study is not two: "Postgraduate Year 1 (2 years)" was the
    // whole degree written onto its first year. Less than two stands — the
    // last part of MBBS really is a year and a half.
    const claimed = Number(String(s.duration || '').match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)?\s*\d*\s*years?/i)?.[1]);
    if (!s.fixed && /\byear\s*\d+|^\s*class\s*\d+/i.test(s.title) && !MERGED_YEARS.test(s.title) && (!s.duration || claimed >= 2)) {
      fix(`"${s.title}": duration "${s.duration || '—'}" set to 1 year`);
      s.duration = '1 year';
    }
  });

  // ---- 3. Every exam right before the stage it opens.
  for (let pass = 0; pass < all.length; pass++) {
    let moved = false;
    for (let i = 0; i < all.length; i++) {
      const s = all[i];
      if (s.kind !== 'exam' || !s.unlocks) continue;
      const target = findTitle(all, s.unlocks);
      if (target >= 0 && target < i) {
        fix(`moved "${s.title}" before "${all[target].title}", the stage it opens`);
        move(all, i, target);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  // A stage that needs an exam to get in, with no stage before it for that
  // exam, gets one: the exam is part of the road, and the one place the old
  // roadmaps left it was the end.
  // Only exams named outright (JEE, CUET, CAT, GATE, NEET-PG, DGCA…), and
  // only when no stage before mentions them: "entry" is free text, and a
  // stage added on a misreading would be a wrong stage of our own making.
  for (let i = 0; i < all.length; i++) {
    const s = all[i];
    if (s.fixed || !s.entry || NO_EXAM.test(s.entry) || s.kind === 'exam') continue;
    // Capitalised runs are one name each: "IIT JAM", "NEET-PG", "CSIR-NET JRF".
    const exams = [...new Set(s.entry.match(/\b[A-Z][A-Z0-9]+(?:[ -][A-Z][A-Z0-9]+)*\b/g) || [])];
    if (!exams.length) continue;
    const earlier = ` ${all.slice(0, i).map((p) => norm(`${p.title} ${p.unlocks || ''}`)).join(' ')} `;
    const absent = exams.filter((e) => !earlier.includes(` ${norm(e)} `));
    if (absent.length < exams.length) continue;
    const name = exams.join(' / ');
    all.splice(i, 0, { title: `Entrance exam: ${name}`, kind: 'exam', duration: '3–6 months', unlocks: s.title, why: `Sit ${name} to get into ${s.title}.`, added: true });
    fix(`added an exam stage for ${name} before "${s.title}"`);
    i++;
  }

  // ---- 4. Internships while studying, never after the last degree.
  const lastOf = (kinds) => { for (let i = all.length - 1; i >= 0; i--) if (kinds.includes(all[i].kind)) return i; return -1; };
  for (let guard = 0; guard < all.length; guard++) {
    const lastStudy = lastOf(['degree', 'pg']) >= 0 ? lastOf(['degree', 'pg']) : lastOf(STUDY);
    // Never into school: an internship is for after school, whatever came of it.
    if (lastStudy >= 0 && all[lastStudy].kind === 'school') break;
    // Right after a final year the student is already in is "during it".
    const late = all.findIndex((s, i) => s.kind === 'internship' && !COMPULSORY_INTERNSHIP.test(s.title) && i > lastStudy && !(lastStudy === 0 && i === 1));
    if (late < 0 || lastStudy < 0) break;
    // Before the final year; for a student already in it, alongside it (next).
    let at = lastStudy === 0 ? 1 : lastStudy;
    // Never between an exam and the stage it opens.
    while (at > 1 && all[at - 1].kind === 'exam') at--;
    fix(`moved "${all[late].title}" to ${lastStudy === 0 ? 'run alongside' : 'before'} "${all[lastStudy].title}"`);
    move(all, late, at);
  }

  // ---- 5. Getting the job comes last, in order: tests, applications, the role.
  const growth = [];
  const main = [];
  const tail = [];
  all.forEach((s) => {
    if (Object.hasOwn(TAIL, s.kind)) tail.push(s);
    else if (s.kind === 'work' && !working) growth.push(s);
    else main.push(s);
  });
  tail.sort((a, b) => TAIL[a.kind] - TAIL[b.kind]);
  const reordered = [...main, ...tail, ...growth];
  if (reordered.some((s, i) => s !== all[i])) fix('put the job stages last, in order: hiring tests, applications, first role');
  all = reordered;

  // ---- 6. What every roadmap needs.
  if (!all.some((s) => s.kind === 'first-role')) {
    problems.push({ hard: false, missing: 'first-role', text: `There is no final stage of kind "first-role" (${working ? 'Next Role' : 'First Role'} → ${goal.careerGoal}).` });
  }
  if (!working && !all.some((s) => s.kind === 'job-search')) {
    problems.push({ hard: false, missing: 'job-search', text: 'There is no "Job Applications & Placement Preparation" stage (kind "job-search").' });
  }
  const level = goal?.educationLevel || '';
  const ladderAhead = isSchoolLevel(level) || ['Undergraduate', 'Diploma'].includes(level);
  if (ladderAhead && !all.some((s) => ['pg', 'qualification', 'training'].includes(s.kind) && !s.fixed)) {
    problems.push({ hard: false, text: 'There is no postgraduate stage, and no professional qualification or training in its place.' });
  }
  // Not "scientist": a Data Scientist or an ISRO scientist is hired without one.
  if (/research|professor|lecturer|academi/i.test(goal?.careerGoal || '') && !working && !all.some((s) => s.kind === 'phd')) {
    problems.push({ hard: false, text: `"${goal.careerGoal}" is a research career, and there is no PhD stage (kind "phd").` });
  }

  return { stages: all, fixes, problems };
};

/**
 * Stages a plan still lacks after the model has had its chance to add them,
 * in words that need no model: the details step writes them up like any other.
 */
const fillMissing = (stages, problems, goal) => {
  const out = [...stages];
  const working = isWorking(goal);
  const firstRole = out.findIndex((s) => s.kind === 'first-role');
  if (problems.some((p) => p.missing === 'job-search')) {
    const stage = { title: 'Job Applications & Placement Preparation', kind: 'job-search', duration: '3–6 months', added: true };
    if (firstRole >= 0) out.splice(firstRole, 0, stage); else out.push(stage);
  }
  if (problems.some((p) => p.missing === 'first-role')) {
    out.push({ title: `${working ? 'Next Role' : 'First Role'} → ${goal.careerGoal}`, kind: 'first-role', duration: '1–2 years', added: true });
  }
  return out;
};

const UNIT_YEARS = { y: 1, m: 1 / 12, w: 1 / 52, d: 1 / 365 };
/** "1 year" -> [1, 1], "3–6 months" -> [0.25, 0.5], "1 day" -> [~0, ~0]; null for "Ongoing" and the like. */
const durationRange = (d) => {
  const t = String(d || '').trim();
  const range = t.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(year|month|week|day)s?$/i);
  if (range) { const u = UNIT_YEARS[range[3][0].toLowerCase()]; return [range[1] * u, range[2] * u]; }
  const one = t.match(/^(\d+(?:\.\d+)?)\s*(year|month|week|day)s?$/i);
  if (one) { const u = UNIT_YEARS[one[2][0].toLowerCase()]; return [one[1] * u, one[1] * u]; }
  return null;
};
// Months under a year, half-years above it: "4–6 months", "1–2 years", "11.5 years".
const months = (y) => Math.max(1, Math.round(y * 12));
const halfYears = (y) => Math.round(y * 2) / 2;
const formatRange = ([lo, hi]) => {
  if (hi < 1) {
    const [a, b] = [months(lo), months(hi)];
    return a === b ? `${a} month${a === 1 ? '' : 's'}` : `${a}–${b} months`;
  }
  if (lo < 1) return `${months(lo)} months–${halfYears(hi)} year${halfYears(hi) === 1 ? '' : 's'}`;
  const [a, b] = [halfYears(lo), halfYears(hi)];
  return a === b ? `${a} year${a === 1 ? '' : 's'}` : `${a}–${b} years`;
};

/**
 * The roadmap's "Estimated journey", from the plan's own durations.
 *
 * The model used to write this sentence and could not add up: a pilot's two
 * years of flying school came out as one, a doctor's 11.5 years as "13 to 14",
 * a student's current class left out. It is arithmetic, so code does it: each
 * programme's years together by name, then the shorter steps in one figure.
 * Internships and entrance exams are not counted: both happen alongside the
 * study around them (checkPlan puts internships there; a JEE or GATE stage's
 * "1 year" is a year of preparing during Class 12 or the final year, and
 * counted, it put an 8-year road at "9.5–10 years"). Nor is the job itself,
 * which is where the road ends.
 */
const timelineFor = (stages) => {
  const groups = [];
  const byLabel = new Map();
  for (const s of stages) {
    if (s.kind === 'internship' || s.kind === 'exam') continue;
    const range = durationRange(s.duration);
    if (!range) continue;
    const label = s.kind === 'school' ? 'school' : ['degree', 'pg', 'phd', 'training', 'qualification'].includes(s.kind) ? programmeYear(s.title)?.key || null : null;
    const group = label && byLabel.get(label);
    if (group) {
      group.stages.push(s); group.sum[0] += range[0]; group.sum[1] += range[1];
    } else {
      const fresh = { stages: [s], sum: [...range] };
      groups.push(fresh);
      if (label) byLabel.set(label, fresh);
    }
  }
  const total = [0, 0];
  const rest = [0, 0];
  const parts = [];
  for (const { stages: group, sum } of groups) {
    total[0] += sum[0]; total[1] += sum[1];
    if (sum[1] >= 1) {
      const name = group.length > 1 ? `${group[0].title} to ${group[group.length - 1].title}` : group[0].title;
      parts.push(`${name} (${formatRange(sum)})`);
    } else {
      rest[0] += sum[0]; rest[1] += sum[1];
    }
  }
  if (!parts.length && total[1] === 0) return '';
  const extra = rest[1] > 0 ? `${parts.length ? ', plus ' : ''}about ${formatRange(rest)} for the shorter steps in between` : '';
  return `About ${formatRange(total)} from now: ${parts.join(', ')}${extra}.`;
};

/**
 * What a phase of a roadmap saved before plans had kinds most likely is, from
 * its title alone. Those roadmaps all came from the one template, so its
 * titles are predictable: "Entrance & Recruitment Exams", "Job Applications &
 * Placement Preparation", "First Role → …", "Internships & Industry Experience".
 */
const savedKind = (title) => {
  const t = String(title || '');
  if (/^\s*(?:entrance\s*&\s*)?recruitment\s+exams/i.test(t)) return 'recruitment';
  if (/^\s*job\s+applications/i.test(t)) return 'job-search';
  if (/^\s*(?:first|next)\s+role\b/i.test(t)) return 'first-role';
  if (/internship/i.test(t)) return 'internship';
  if (/^\s*(?:higher\s+secondary\s*\(?)?(?:class|grade|std\.?)\s*\d+/i.test(t)) return 'school';
  if (/\byear\s*\d+|\d+(?:st|nd|rd|th)\s+year|final\s+year|semester/i.test(t)) return 'study';
  return 'other';
};

/**
 * The order errors of a roadmap already saved, put right in place.
 *
 * Every roadmap from the old template has its job stages as "applications,
 * then exams, then the role", and most have their internship after the final
 * year it belongs before. Those two are moved; and a single year that claims
 * to last two or more ("Postgraduate Year 1 (2 years)") is given its one year.
 *
 * Phase indices are how progress and badges are stored, so nothing the student
 * has finished moves (`keep`, the length of their completed prefix), and
 * nothing moves at all if a badge sits past that point (`pinned`): a badge is
 * a public link to one phase, and a reopened phase can still carry one.
 * Missing stages and wrong routes cannot be repaired this way; the student's
 * "Save & rebuild" makes a whole new plan.
 */
const repairSavedOrder = (phases, { keep = 0, pinned = [] } = {}) => {
  if (!Array.isArray(phases)) return { phases, changed: false, notes: [] };
  const notes = [];
  const list = phases.map((p) => (p && typeof p === 'object' ? { ...p } : p));
  const titleOf = (p) => (typeof p === 'string' ? p : p?.phase || '');

  // Durations first: they move nothing.
  list.forEach((p) => {
    if (!p || typeof p !== 'object') return;
    const title = titleOf(p);
    const years = (title.match(/\byear\s*\d+|\d+(?:st|nd|rd|th)\s+year/gi) || []).length;
    const claimed = Number(String(p.duration || '').match(/^\s*(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*\d+(?:\.\d+)?\s*)?years?/i)?.[1]);
    if (years === 1 && !MERGED_YEARS.test(title) && claimed >= 2 && savedKind(title) === 'study') {
      notes.push(`"${title}": ${p.duration} -> 1 year`);
      p.duration = '1 year';
    }
  });

  if (pinned.some((i) => i >= keep)) return { phases: list, changed: notes.length > 0, notes };

  const kinds = () => list.map((p) => savedKind(titleOf(p)));
  // An internship straight after the last year of a degree — where the old
  // template put it — moves before that year. Only then: an internship after
  // something that is not a degree year (a pilot's flying school) is not the
  // template's, and moving it past that would land it in school.
  let k = kinds();
  const lastStudy = k.lastIndexOf('study');
  const late = lastStudy + 1;
  if (lastStudy > 0 && lastStudy >= keep && k[late] === 'internship' && !COMPULSORY_INTERNSHIP.test(titleOf(list[late]))) {
    notes.push(`moved "${titleOf(list[late])}" before "${titleOf(list[lastStudy])}"`);
    move(list, late, lastStudy);
  }

  // The job stages, when they are the roadmap's last stages: tests, applications, the role.
  k = kinds();
  let start = list.length;
  while (start > 0 && Object.hasOwn(TAIL, k[start - 1])) start--;
  if (start >= keep && list.length - start > 1) {
    const tail = list.slice(start).sort((a, b) => TAIL[savedKind(titleOf(a))] - TAIL[savedKind(titleOf(b))]);
    if (tail.some((p, i) => p !== list[start + i])) {
      notes.push(`job stages put in order: ${tail.map(titleOf).join(' -> ')}`);
      list.splice(start, tail.length, ...tail);
    }
  }

  return { phases: list, changed: notes.length > 0, notes };
};

module.exports = {
  DEGREE_YEARS,
  normaliseDegree,
  degreeLength,
  KINDS,
  openingStages,
  checkPlan,
  fillMissing,
  timelineFor,
  repairSavedOrder,
  norm
};
