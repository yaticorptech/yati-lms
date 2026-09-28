/**
 * An organization's own courses, as its administrator writes them.
 *
 * The building itself — courses, modules, lessons, quizzes, uploads — is the
 * platform admin's code (controllers/adminCourseController.js and friends),
 * so both sides build courses the same way. What this file adds is the fence
 * around it:
 *
 *   - course access must be switched on for the organization, by a superadmin;
 *   - a new course counts against the limit that superadmin set;
 *   - every course, module, lesson and quiz touched must be this
 *     organization's own — anything else answers 404, exactly as if it did
 *     not exist, so one organization cannot even learn another's ids;
 *   - an edit can never move a module or lesson into someone else's course.
 */
const mongoose = require('mongoose');
const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');

const NOT_FOUND = { message: 'Not found' };
const ownCourse = (course, req) => Boolean(course?.organizationId) && String(course.organizationId) === String(req.organization._id);

const courseIsOurs = async (courseId, req) => {
    if (!courseId) return false;
    const course = await Course.findById(String(courseId)).select('organizationId').lean();
    return ownCourse(course, req);
};
const moduleIsOurs = async (moduleId, req) => {
    if (!mongoose.isValidObjectId(moduleId)) return false;
    const mod = await Module.findById(moduleId).select('courseId').lean();
    return Boolean(mod) && courseIsOurs(mod.courseId, req);
};
const lessonIsOurs = async (lessonId, req) => {
    if (!mongoose.isValidObjectId(lessonId)) return false;
    const lesson = await Lesson.findById(lessonId).select('moduleId').lean();
    return Boolean(lesson) && moduleIsOurs(lesson.moduleId, req);
};

/** A guard from an async check: 404 when it fails, next() when it passes. */
const guard = (check) => async (req, res, next) => {
    try {
        if (await check(req)) return next();
        return res.status(404).json(NOT_FOUND);
    } catch (error) {
        console.error('[organizations] course ownership check failed:', error.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

/* ── The switch and the limit ─────────────────────────────────────────── */

/** Course building is open only while a superadmin has switched it on. */
const requireCourseAccess = (req, res, next) => {
    if (req.organization.courseAccess?.enabled) return next();
    return res.status(403).json({
        code: 'COURSES_DISABLED',
        message: 'Courses are not switched on for your organization. Contact the platform administrator.'
    });
};

// @desc    Whether courses are on for this organization, the limit, and how many are used
// @route   GET /api/organizations/me/course-access
const getCourseAccess = async (req, res) => {
    try {
        const used = await Course.countDocuments({ organizationId: req.organization._id });
        const access = req.organization.courseAccess || {};
        // `hasLogo`: the first step, before any course can be made or published.
        res.json({ enabled: Boolean(access.enabled), limit: access.limit || 0, used, hasLogo: Boolean(req.organization.logo) });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * The institution's logo comes first. Until it has one, an organization can
 * neither make a course nor publish one: its students see its courses under
 * its name and logo. Saving a draft that stays a draft is still allowed.
 */
const requireLogo = (req, res, next) => {
    if (req.organization.logo) return next();
    const publishing = req.method === 'PUT' && (req.body?.isPublished === true || req.body?.isPublished === 'true');
    if (req.method === 'POST' || publishing) {
        return res.status(403).json({
            code: 'LOGO_REQUIRED',
            message: "Upload your institution's logo first. After that you can add and publish your own courses."
        });
    }
    return next();
};

/** A new course only while the organization is under its limit. */
const withinCourseLimit = async (req, res, next) => {
    try {
        const used = await Course.countDocuments({ organizationId: req.organization._id });
        const limit = req.organization.courseAccess?.limit || 0;
        if (used >= limit) {
            return res.status(409).json({
                code: 'COURSE_LIMIT',
                message: `Your organization can have ${limit} course${limit === 1 ? '' : 's'}, and has ${used}. Delete one, or ask the platform administrator for a higher limit.`
            });
        }
        return next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/* ── Ownership guards ─────────────────────────────────────────────────── */

const ownsCourseParam = (param = 'id') => guard((req) => courseIsOurs(req.params[param], req));
const ownsModuleParam = guard((req) => moduleIsOurs(req.params.id, req));
const ownsLessonParam = (param = 'id') => guard((req) => lessonIsOurs(req.params[param], req));

/** A module being created — or moved by an edit — lands only in our own course. */
const ownsBodyCourse = (required) => guard((req) => (req.body?.courseId === undefined ? !required : courseIsOurs(req.body.courseId, req)));
/** A lesson being created — or moved by an edit — lands only in our own module. */
const ownsBodyModule = (required) => guard((req) => (req.body?.moduleId === undefined ? !required : moduleIsOurs(req.body.moduleId, req)));

/** Every id in a reorder list must be ours. */
const ownsAllModules = guard(async (req) => {
    const ids = (req.body?.orderData || []).map((o) => o?.id);
    if (!ids.length) return true;
    for (const id of ids) if (!(await moduleIsOurs(id, req))) return false;
    return true;
});
const ownsAllLessons = guard(async (req) => {
    const ids = (req.body?.orderData || []).map((o) => o?.id);
    if (!ids.length) return true;
    for (const id of ids) if (!(await lessonIsOurs(id, req))) return false;
    return true;
});

/**
 * A video may be managed when no lesson uses it yet (it was just uploaded) or
 * when the lesson that uses it is ours. A video in anyone else's lesson is not.
 */
const ownsVideo = guard(async (req) => {
    const users = await Lesson.find({ videoId: req.params.videoId }).select('_id').lean();
    for (const l of users) if (!(await lessonIsOurs(l._id, req))) return false;
    return true;
});

module.exports = {
    requireCourseAccess, getCourseAccess, withinCourseLimit, requireLogo,
    ownsCourseParam, ownsModuleParam, ownsLessonParam, ownsBodyCourse, ownsBodyModule,
    ownsAllModules, ownsAllLessons, ownsVideo
};
