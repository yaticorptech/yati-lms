/**
 * Who may see a course.
 *
 * A platform course (no organizationId) is open to every student, as it
 * always was. An organization's own course is open only to that
 * organization's current members — a student who leaves or is removed loses
 * it, and a student of another organization never sees it.
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

module.exports = { canAccessCourse, visibleCoursesFilter };
