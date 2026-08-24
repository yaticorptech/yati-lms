/**
 * @description What Career Path knows about the student's actual LMS courses.
 *
 * The port arrived blind: the roadmap, the recommendations and the mentor all
 * advised students to go and learn on LeetCode and HackerRank while those same
 * students were sitting on a shelf of YATICORP courses nobody mentioned. This
 * module is the one place the career section reads the course side of the LMS,
 * so that stays deliberate and reviewable rather than spreading through a dozen
 * controllers.
 *
 * Everything here is READ-ONLY and best-effort. A failure to load course
 * context must never take down a roadmap generation or a mentor reply — the
 * feature worked without any of this yesterday, and degrading to that is always
 * better than a 500.
 */
const Enrollment = require('../../models/Enrollment');
const Bundle = require('../../models/Bundle');
const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const Progress = require('../../models/Progress');

/** Prompts have a budget. These caps keep course context from crowding out the roadmap. */
const MAX_ENROLLED = 12;
const MAX_CATALOGUE = 25;
const MAX_LESSONS_MATCHED = 2500;

/**
 * Course ids the student can actually open.
 *
 * Mirrors getMyCourses in userCourseController: a Bundle enrolment grants every
 * course inside it, and only published courses count. Kept in step with that
 * deliberately — a student being recommended a course the LMS will not let them
 * open is worse than not recommending anything.
 */
const enrolledCourseIds = async (userId) => {
  const enrollments = await Enrollment.find({ userId }).lean();
  const courseIds = new Set();
  const bundleIds = new Set();

  for (const e of enrollments) {
    if (e.type === 'Course' && e.courseId) courseIds.add(String(e.courseId));
    else if (e.type === 'Bundle' && e.bundleId) bundleIds.add(String(e.bundleId));
  }

  if (bundleIds.size) {
    const bundles = await Bundle.find({ _id: { $in: [...bundleIds] } }).lean();
    for (const b of bundles) {
      for (const cid of b.courses || []) courseIds.add(String(cid));
    }
  }

  return [...courseIds];
};

/** The student's courses, each with how far through it they are. */
const getEnrolledCourses = async (userId) => {
  const ids = await enrolledCourseIds(userId);
  if (!ids.length) return [];

  const [courses, progressDocs] = await Promise.all([
    Course.find({ _id: { $in: ids }, isPublished: true }).select('title description').lean(),
    Progress.find({ userId, courseId: { $in: ids } }).select('courseId percentage completedLessons').lean()
  ]);

  const byCourse = new Map(progressDocs.map((p) => [String(p.courseId), p]));

  return courses.slice(0, MAX_ENROLLED).map((c) => {
    const p = byCourse.get(String(c._id));
    return {
      courseId: String(c._id),
      title: c.title,
      description: c.description || '',
      progress: p ? Math.min(100, Math.round(p.percentage || 0)) : 0,
      completedLessons: p?.completedLessons?.length || 0,
      started: Boolean(p && (p.percentage > 0 || p.completedLessons?.length))
    };
  });
};

/**
 * Published courses the student is NOT yet enrolled in.
 *
 * Offered to the model as things worth taking next. Recommending a course they
 * cannot open yet is fine — that is a conversation with the office, and a far
 * better outcome than pointing them at someone else's platform.
 */
const getCatalogue = async (userId) => {
  const mine = new Set(await enrolledCourseIds(userId));
  const courses = await Course.find({ isPublished: true }).select('title description').lean();
  return courses
    .filter((c) => !mine.has(String(c._id)))
    .slice(0, MAX_CATALOGUE)
    .map((c) => ({
      courseId: String(c._id),
      title: c.title,
      description: c.description || ''
    }));
};

// ── Task → lesson matching ──────────────────────────────────────────────────

// A single word in common is never enough to claim a lesson teaches a task.
const MIN_SHARED_TOKENS = 2;

// Words that appear in half the lesson titles in any catalogue and so carry no
// signal. Without this, "Introduction to Python" matches "Introduction to SQL".
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'to', 'of', 'for', 'in', 'on', 'at', 'with', 'your', 'you',
  'is', 'are', 'be', 'this', 'that', 'it', 'as', 'by', 'from', 'or', 'using', 'use',
  'introduction', 'intro', 'basics', 'basic', 'fundamentals', 'getting', 'started',
  'part', 'lesson', 'module', 'course', 'chapter', 'session', 'video', 'overview',
  'learn', 'learning', 'understand', 'understanding', 'practice', 'practise',
  'practising', 'practicing', 'revising', 'reviewing', 'studying', 'solving',
  'building', 'creating', 'writing', 'reading', 'implementing', 'working',
  'spend', 'spending', 'minutes', 'minute', 'hour', 'hours', 'complete',
  'completing', 'least', 'solve', 'read', 'write', 'build', 'create',
  'implement', 'study', 'revise', 'review', 'work', 'today', 'problems',
  'problem', 'exercises', 'exercise'
]);

const tokenise = (text) =>
  new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );

/**
 * How well a task and a lesson are about the same thing, 0..1.
 *
 * Deliberately NOT a Gemini call. Matching is per-task and would multiply the
 * daily quota by the size of every plan; a token overlap is free, runs in
 * microseconds and is easy to reason about when it gets something wrong.
 */
const overlapScore = (taskTokens, lessonTokens) => {
  if (!taskTokens.size || !lessonTokens.size) return 0;
  let shared = 0;
  for (const t of taskTokens) if (lessonTokens.has(t)) shared += 1;

  // One word in common is a coincidence, not a topic. Dividing by the smaller
  // side means a two-word title like "Practice Python Coding" scores 0.50
  // against ANY Python lesson on the strength of the word "python" alone — and
  // it then links to whichever happened to be first in the index. Two shared
  // words is the difference between "both mention Python" and "both are about
  // pandas joins".
  if (shared < MIN_SHARED_TOKENS) return 0;

  // Divided by the smaller side, so a three-word lesson title is not punished
  // for being shorter than the task description it genuinely covers.
  return shared / Math.min(taskTokens.size, lessonTokens.size);
};

// Below this, a "match" is two words of coincidence. A wrong lesson link is
// worse than none: it sends the student somewhere irrelevant and teaches them
// not to trust the link next time.
//
// 0.45 rather than a rounder number because of where the two populations
// actually sit: across the fixture set, genuine matches score 0.5–1.0 and
// unrelated pairs score 0.00 once stopwords are stripped. The gap is wide, so
// the threshold sits just under the true positives to leave room for a task
// worded slightly differently, without reaching anywhere near the noise.
const MATCH_THRESHOLD = 0.45;

/** Every published lesson in the student's own courses, tokenised once. */
const getLessonIndex = async (userId) => {
  const ids = await enrolledCourseIds(userId);
  if (!ids.length) return [];

  const [courses, modules] = await Promise.all([
    Course.find({ _id: { $in: ids }, isPublished: true }).select('title').lean(),
    Module.find({ courseId: { $in: ids } }).select('courseId title').lean()
  ]);
  if (!modules.length) return [];

  const lessons = await Lesson.find({
    moduleId: { $in: modules.map((m) => m._id) },
    isPublished: true
  })
    .select('moduleId title type')
    .limit(MAX_LESSONS_MATCHED)
    .lean();

  const courseTitle = new Map(courses.map((c) => [String(c._id), c.title]));
  const moduleById = new Map(modules.map((m) => [String(m._id), m]));

  return lessons
    .map((l) => {
      const mod = moduleById.get(String(l.moduleId));
      if (!mod) return null;
      return {
        lessonId: String(l._id),
        lessonTitle: l.title,
        type: l.type,
        courseId: String(mod.courseId),
        courseTitle: courseTitle.get(String(mod.courseId)) || '',
        moduleTitle: mod.title,
        // Module and course titles included: a lesson called "Joins" only means
        // something alongside the "SQL" that its module supplies.
        tokens: tokenise(`${l.title} ${mod.title} ${courseTitle.get(String(mod.courseId)) || ''}`)
      };
    })
    .filter(Boolean);
};

/**
 * Best lesson for each task, or null.
 *
 * Returns a Map keyed by task id so callers can decorate a list in one pass.
 */
const matchTasksToLessons = (tasks, lessonIndex) => {
  const out = new Map();
  if (!lessonIndex.length) return out;

  for (const task of tasks) {
    // Scored twice, best wins.
    //
    // The title carries the topic; the description elaborates and, in
    // AI-written tasks, is mostly noise — "solve problems on platforms like
    // LeetCode or HackerRank" adds seven tokens that match no lesson and drag
    // the average down. Folding both into one bag took a genuine 0.50 match
    // down to 0.17 and lost it. Title-only catches those; the combined pass
    // still catches the opposite case, where the title is vague ("Practice
    // coding") and only the description says what it is actually about.
    const titleTokens = tokenise(task.title);
    const fullTokens = tokenise(`${task.title} ${task.description || ''}`);
    let best = null;
    let bestScore = 0;
    for (const lesson of lessonIndex) {
      const score = Math.max(
        overlapScore(titleTokens, lesson.tokens),
        overlapScore(fullTokens, lesson.tokens)
      );
      if (score > bestScore) {
        bestScore = score;
        best = lesson;
      }
    }
    if (best && bestScore >= MATCH_THRESHOLD) {
      out.set(String(task._id), {
        lessonId: best.lessonId,
        lessonTitle: best.lessonTitle,
        courseId: best.courseId,
        courseTitle: best.courseTitle,
        moduleTitle: best.moduleTitle
      });
    }
  }
  return out;
};

// ── Prompt context ──────────────────────────────────────────────────────────

/**
 * The course paragraph handed to Gemini.
 *
 * Returns '' when the student has no courses, which leaves every prompt exactly
 * as it was before this module existed.
 */
const buildCourseContext = ({ enrolled = [], catalogue = [] }) => {
  if (!enrolled.length && !catalogue.length) return '';

  const lines = [];
  if (enrolled.length) {
    lines.push('COURSES THIS STUDENT IS ALREADY ENROLLED IN AT YATICORP:');
    for (const c of enrolled) {
      const state = c.progress >= 100 ? 'finished'
        : c.started ? `${c.progress}% through`
        : 'not started yet';
      lines.push(`  - [${c.courseId}] "${c.title}" — ${state}`);
    }
  }
  if (catalogue.length) {
    lines.push('OTHER YATICORP COURSES AVAILABLE:');
    for (const c of catalogue) {
      lines.push(`  - [${c.courseId}] "${c.title}"`);
    }
  }
  lines.push(
    'Prefer these over any outside platform. When a YATICORP course covers what',
    'the student needs, name it exactly as written above and cite its id in',
    'square brackets. Only send them elsewhere for something no course here covers.'
  );
  return lines.join('\n');
};

/** Everything a prompt needs, in one round trip. Never throws. */
const getStudentCourseContext = async (userId) => {
  try {
    const [enrolled, catalogue] = await Promise.all([getEnrolledCourses(userId), getCatalogue(userId)]);
    return { enrolled, catalogue, prompt: buildCourseContext({ enrolled, catalogue }) };
  } catch (error) {
    // Course context is an enhancement, not a dependency. Losing it degrades
    // the advice; failing the request would lose the student their roadmap.
    console.error('[career] Could not load LMS course context:', error.message);
    return { enrolled: [], catalogue: [], prompt: '' };
  }
};

module.exports = {
  getEnrolledCourses,
  getCatalogue,
  getStudentCourseContext,
  buildCourseContext,
  getLessonIndex,
  matchTasksToLessons,
  // Exported for tests: both are pure.
  tokenise,
  overlapScore
};
