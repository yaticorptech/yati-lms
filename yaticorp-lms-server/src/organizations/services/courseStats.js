/**
 * How an organization's students are doing on its own courses.
 *
 * Only current members count: a student who left no longer shows in the
 * organization's numbers, though their progress is kept for if they rejoin.
 * A learner is a member who is enrolled in the course or has started it;
 * completed means their progress reached 100%.
 */
const User = require('../../models/User');
const Course = require('../../models/Course');
const Enrollment = require('../../models/Enrollment');
const Progress = require('../../models/Progress');
const Certificate = require('../../models/Certificate');
const { bestProgressByKey, clampPercent } = require('./studentProgress');

const memberIds = (organizationId) => User.find({ organizationId }).distinct('_id');

/** courseId → { learners, completed }, for the given courses. */
const learnerStats = async (organizationId, courseIds) => {
    const ids = courseIds.map(String);
    const members = await memberIds(organizationId);
    const [enrolments, progress] = await Promise.all([
        Enrollment.find({ userId: { $in: members }, courseId: { $in: ids } }).select('userId courseId').lean(),
        Progress.find({ userId: { $in: members }, courseId: { $in: ids } }).select('userId courseId percentage').lean()
    ]);
    const out = new Map(ids.map((id) => [id, { learners: new Set(), completed: new Set() }]));
    for (const e of enrolments) out.get(String(e.courseId))?.learners.add(String(e.userId));
    for (const p of progress) {
        const row = out.get(String(p.courseId));
        if (!row) continue;
        row.learners.add(String(p.userId));
        if ((p.percentage || 0) >= 100) row.completed.add(String(p.userId));
    }
    return new Map([...out].map(([id, r]) => [id, { learners: r.learners.size, completed: r.completed.size }]));
};

/**
 * Every current member's progress on each of the organization's courses, and
 * the courses they have completed — the "certificate progress" view.
 */
const certificateProgress = async (organizationId) => {
    const courses = await Course.find({ organizationId }).select('title isPublished').sort({ createdAt: 1 }).lean();
    const courseIds = courses.map((c) => String(c._id));
    const students = await User.find({ organizationId }).select('name email profilePicture').sort({ name: 1 }).lean();
    const ids = students.map((s) => s._id);
    const [enrolments, progress, certificates] = await Promise.all([
        Enrollment.find({ userId: { $in: ids }, courseId: { $in: courseIds } }).select('userId courseId').lean(),
        Progress.find({ userId: { $in: ids }, courseId: { $in: courseIds } }).select('userId courseId percentage completedLessons updatedAt').lean(),
        Certificate.find({ userId: { $in: ids }, courseId: { $in: courseIds } }).select('userId courseId pdfUrl issuedAt').lean()
    ]);
    const key = (u, c) => `${u}|${c}`;
    const enrolled = new Set(enrolments.map((e) => key(e.userId, e.courseId)));
    // One row per student and course even if duplicates were stored.
    const byProgress = bestProgressByKey(progress);
    const byCert = new Map(certificates.map((c) => [key(c.userId, c.courseId), c]));
    const titleOf = new Map(courses.map((c) => [String(c._id), c.title]));

    const rows = students.map((s) => {
        const perCourse = courseIds.map((courseId) => {
            const k = key(s._id, courseId);
            const p = byProgress.get(k);
            const cert = byCert.get(k);
            const percentage = clampPercent(Math.round(p?.percentage || 0));
            return {
                courseId, title: titleOf.get(courseId),
                started: enrolled.has(k) || Boolean(p),
                percentage,
                completed: percentage >= 100,
                completedAt: percentage >= 100 ? (cert?.issuedAt || p?.updatedAt || null) : null
            };
        });
        return {
            _id: s._id, name: s.name, email: s.email, profilePicture: s.profilePicture || '',
            courses: perCourse,
            earned: perCourse.filter((c) => c.completed).map(({ courseId, title, completedAt }) => ({ courseId, title, completedAt }))
        };
    });

    return {
        courses: courses.map((c) => ({ _id: c._id, title: c.title, isPublished: c.isPublished })),
        students: rows,
        totals: {
            students: rows.length,
            certificates: rows.reduce((n, r) => n + r.earned.length, 0),
            studentsWithCertificate: rows.filter((r) => r.earned.length).length
        }
    };
};

module.exports = { learnerStats, certificateProgress };
