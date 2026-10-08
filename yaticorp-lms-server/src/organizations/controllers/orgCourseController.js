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
const videoOwnership = require('../services/videoOwnership');

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

/**
 * After a course was created: did it land past the limit? Returns the limit
 * when it did (the caller deletes it), null when it is within it.
 *
 * The count-then-create in withinCourseLimit cannot stop two requests that
 * count at the same moment. This settles it afterwards without a lock: every
 * course of the organization is ranked by (createdAt, _id), and the new one is
 * over the limit if `limit` or more rank ahead of it. Concurrent creators all
 * see the same order, so exactly the courses past the limit are taken back —
 * never one too few, never one that was within it.
 */
const overCourseLimit = async (course, organization) => {
    const limit = organization.courseAccess?.limit || 0;
    const ahead = await Course.countDocuments({
        organizationId: organization._id,
        _id: { $ne: course._id },
        $or: [
            { createdAt: { $lt: course.createdAt } },
            { createdAt: course.createdAt, _id: { $lt: course._id } }
        ]
    });
    return ahead >= limit ? limit : null;
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
 * A video may be managed only when it is positively ours: we uploaded it
 * (services/videoOwnership.js). "No lesson uses it yet" is not enough — that
 * is also true of any platform video not yet in a lesson.
 */
const ownsVideo = guard((req) => videoOwnership.orgOwnsVideo(req.params.videoId, req.organization._id));
/** Deleting it from VdoCipher also needs that no one else's lesson still plays it. */
const ownsVideoToDelete = guard(async (req) => (
    await videoOwnership.orgOwnsVideo(req.params.videoId, req.organization._id)
    && videoOwnership.onlyOrgUsesVideo(req.params.videoId, req.organization._id)
));

module.exports = {
    requireCourseAccess, getCourseAccess, withinCourseLimit, overCourseLimit, requireLogo,
    ownsCourseParam, ownsModuleParam, ownsLessonParam, ownsBodyCourse, ownsBodyModule,
    ownsAllModules, ownsAllLessons, ownsVideo, ownsVideoToDelete
};
