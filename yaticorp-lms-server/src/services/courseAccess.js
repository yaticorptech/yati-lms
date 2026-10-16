/**
 * Who may see a course.
 *
 * A platform course (no organizationId) is open to every student, as it
 * always was. An organization's own course is open only to that
 * organization's current members — a student who leaves or is removed loses
 * it, and a student of another organization never sees it.
 *
 * Seeing a course is not opening it: its lessons (the player, its quizzes,
 * its videos, its progress) open only to a student who has it (canOpenCourse).
 */
const mongoose = require('mongoose');

const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a) === String(b);

// How a course's content is listed everywhere — the player, the outline, the
// progress check and the quiz check: by the admin's order, and by id where two
// share a number, so they all agree on which lesson comes next.
const CONTENT_ORDER = { order: 1, _id: 1 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when `user` may see and open `course`. */
const canAccessCourse = (user, course) => {
    if (!course) return false;
    if (!course.organizationId) return true;
    return sameId(course.organizationId, user?.organizationId);
};

/** A Mongo filter for the courses `user` may see, to merge into a Course query. */
const visibleCoursesFilter = (user) => ({
    $or: [
        { organizationId: null },
        { organizationId: { $exists: false } },
        ...(user?.organizationId ? [{ organizationId: user.organizationId }] : [])
    ]
});

/**
 * The bundles that give `user` their courses for nothing: any published bundle
 * (those are open to every signed-in student), and any bundle they are
 * enrolled in, published or not. A Mongo filter on Bundle.
 */
const openBundlesFilter = async (user) => {
    const Enrollment = require('../models/Enrollment');
    const bundleIds = (await Enrollment.distinct('bundleId', { userId: user._id, type: 'Bundle' })).filter(Boolean);
    return { $or: [{ isPublished: true }, { _id: { $in: bundleIds } }] };
};

/**
 * The bundle through which `user` already has `courseId`, or null. Its title
 * is what the enrol button says when it refuses to charge for the course.
 */
const openingBundle = async (user, courseId) => {
    if (!user?._id) return null;
    const Bundle = require('../models/Bundle');
    return Bundle.findOne({ courses: String(courseId), ...(await openBundlesFilter(user)) }).select('title').lean();
};

/**
 * True when `user` may open `course`'s lessons. The course player and
 * everything it calls ask this, so a priced course cannot be watched by
 * opening its address without enrolling (and paying) first.
 *
 * The student has it when they are enrolled in it, or in a bundle that holds
 * it. A course in any published bundle opens too: published bundles are open
 * to every signed-in student (getBundleContent), so putting a course in one
 * is how an administrator gives it away. `course` needs its _id and
 * organizationId; an organization's course stays its members' only.
 */
const canOpenCourse = async (user, course) => {
    if (!user?._id || !canAccessCourse(user, course)) return false;
    const Enrollment = require('../models/Enrollment');
    const courseId = String(course._id);
    if (await Enrollment.exists({ userId: user._id, type: 'Course', courseId })) return true;
    return Boolean(await openingBundle(user, courseId));
};

/**
 * A course's published lessons in the order it runs — module by module, each
 * module's lessons by CONTENT_ORDER — with the modules themselves. The one
 * place that order is worked out, so the player's locks and the server's
 * checks never disagree about which lesson is next.
 */
const courseLessons = async (courseId) => {
    const Module = require('../models/Module');
    const Lesson = require('../models/Lesson');
    const modules = await Module.find({ courseId }).sort(CONTENT_ORDER).select('_id dripDays').lean();
    const published = await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) }, isPublished: true })
        .sort(CONTENT_ORDER).select('_id moduleId type assignmentId').lean();
    const lessons = modules.flatMap((m) => published.filter((l) => String(l.moduleId) === String(m._id)));
    return { modules, lessons };
};

/**
 * When this student's drip clock started for a course — the day they were
 * enrolled — or null when its modules do not drip for them: the demo cards
 * see every module at once (services/fullAccess.js), and a course opened only
 * through a bundle has no enrolment to count from.
 */
const dripStart = async (user, courseId) => {
    if (require('./fullAccess').hasFullAccess(user)) return null;
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ userId: user._id, courseId: String(courseId) }).select('assignedAt createdAt').lean();
    return enrollment ? new Date(enrollment.assignedAt || enrollment.createdAt) : null;
};

/** When a module opens for a student whose clock started at `start`; null when it does not drip. */
const moduleUnlockAt = (mod, start) => {
    const days = mod?.dripDays || 0;
    return start && days > 0 ? new Date(start.getTime() + days * DAY_MS) : null;
};

const dateLabel = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Whether `user` may use this lesson right now: open its quiz, submit it, or
 * mark it done. The player locks lessons on the page; this is the same rule on
 * the server, so a request cannot step around it:
 *
 *   - the lesson is published, in a published course the student can open;
 *   - its module is not still drip-locked for this student;
 *   - it is done already, or it is the next lesson to do in course order.
 *
 * `courseId`, when given, is the course the request says the lesson is in.
 * Answers `{ ok: true, course, lesson, lessons, progress }` — the course's
 * lessons in order and the student's progress row (lean, or null) — or
 * `{ ok: false, status, body }` to send back as it is.
 */
const lessonAccess = async (user, lessonId, { courseId } = {}) => {
    const deny = (status, body) => ({ ok: false, status, body });
    if (!mongoose.isValidObjectId(lessonId)) return deny(404, { message: 'Lesson not found' });
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');
    const Course = require('../models/Course');
    const lesson = await Lesson.findById(lessonId).select('moduleId type isPublished assignmentId').lean();
    if (!lesson || lesson.isPublished === false) return deny(404, { message: 'Lesson not found' });
    const mod = await Module.findById(lesson.moduleId).select('courseId dripDays').lean();
    if (!mod || (courseId !== undefined && String(mod.courseId) !== String(courseId))) {
        return deny(404, { message: 'Lesson not found in this course' });
    }
    const course = await Course.findById(mod.courseId).select('organizationId isPublished').lean();
    if (!course || !course.isPublished || !canAccessCourse(user, course)) return deny(404, { message: 'Course not found' });
    if (!(await canOpenCourse(user, course))) {
        return deny(403, { code: 'NOT_ENROLLED', message: 'Enrol in this course to open its lessons.' });
    }

    const unlockAt = moduleUnlockAt(mod, await dripStart(user, course._id));
    if (unlockAt && Date.now() < unlockAt.getTime()) {
        return deny(403, { code: 'LESSON_DRIP_LOCKED', unlockAt, message: `This lesson opens on ${dateLabel(unlockAt)}.` });
    }

    const { lessons } = await courseLessons(course._id);
    const Progress = require('../models/Progress');
    const progress = await Progress.findOne({ userId: user._id, courseId: String(course._id) })
        .select('completedLessons passedQuizzes percentage').lean();
    const done = new Set((progress?.completedLessons || []).map(String));
    if (!done.has(String(lessonId))) {
        const next = lessons.find((l) => !done.has(String(l._id)));
        if (!next || String(next._id) !== String(lessonId)) {
            return deny(403, { code: 'LESSON_LOCKED', message: 'Finish the earlier lessons first.' });
        }
    }
    return { ok: true, course, lesson, lessons, progress };
};

module.exports = {
    CONTENT_ORDER, canAccessCourse, canOpenCourse, visibleCoursesFilter, openBundlesFilter, openingBundle,
    courseLessons, dripStart, moduleUnlockAt, lessonAccess
};
