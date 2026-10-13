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
const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a) === String(b);

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
    const Bundle = require('../models/Bundle');
    const courseId = String(course._id);
    if (await Enrollment.exists({ userId: user._id, type: 'Course', courseId })) return true;
    const bundleIds = (await Enrollment.distinct('bundleId', { userId: user._id, type: 'Bundle' })).filter(Boolean);
    return Boolean(await Bundle.exists({ courses: courseId, $or: [{ isPublished: true }, { _id: { $in: bundleIds } }] }));
};

module.exports = { canAccessCourse, canOpenCourse, visibleCoursesFilter };
