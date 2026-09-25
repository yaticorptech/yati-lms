/**
 * @description Reading the learning record the LMS already holds, for the
 *              organization views.
 *
 * Nothing here computes or stores progress. Every number is read from the
 * collection that already owns it — Enrollment, Progress, Certificate, the
 * student account for XP and level, and the Career Path collections — so an
 * organization sees exactly what the student's own dashboard shows. Where a
 * student has no data, the answer is zero or null and the caller renders an
 * empty state; it is never filled in with a plausible-looking number.
 *
 * Two entry points, because a list of 200 students and one student's full page
 * have very different shapes:
 *   summariseStudents(userIds) — a handful of grouped queries for the table
 *   studentDetail(userId)      — every section of one student's record
 */
const Enrollment = require('../../models/Enrollment');
const Progress = require('../../models/Progress');
const Certificate = require('../../models/Certificate');
const Course = require('../../models/Course');
const Bundle = require('../../models/Bundle');

/** A course counts as finished at 100%. */
const COMPLETE_AT = 100;

/**
 * Every course id each of these students can open, whether enrolled directly
 * or through a bundle.
 *
 * Bundles are resolved in one extra query rather than per student, because a
 * whole institution is usually put on the same two or three bundles.
 */
const courseIdsByStudent = async (userIds) => {
    const enrollments = await Enrollment.find({ userId: { $in: userIds } })
        .select('userId courseId bundleId type createdAt')
        .lean();

    const bundleIds = [...new Set(
        enrollments.filter((e) => e.type === 'Bundle' && e.bundleId).map((e) => String(e.bundleId))
    )];
    const bundles = bundleIds.length
        ? await Bundle.find({ _id: { $in: bundleIds } }).select('courses').lean()
        : [];
    const coursesInBundle = new Map(bundles.map((b) => [String(b._id), (b.courses || []).map(String)]));

    const byStudent = new Map(userIds.map((id) => [String(id), new Set()]));
    const enrolledAt = new Map();

    for (const e of enrollments) {
        const key = String(e.userId);
        const set = byStudent.get(key);
        if (!set) continue;

        if (e.type === 'Course' && e.courseId) set.add(String(e.courseId));
        if (e.type === 'Bundle' && e.bundleId) {
            for (const cid of coursesInBundle.get(String(e.bundleId)) || []) set.add(cid);
        }

        // Earliest enrollment stands in for "started with us".
        const at = e.createdAt || e.assignedAt;
        if (at && (!enrolledAt.has(key) || at < enrolledAt.get(key))) enrolledAt.set(key, at);
    }

    return { byStudent, enrolledAt };
};

/**
 * One row per student for the organization's student table.
 *
 * `progressPercent` is the mean across the courses the student can open, not
 * across the courses they have touched — a student enrolled in four courses who
 * has finished one is at 25%, which is what an institution means by progress.
 * A student with no courses at all reads 0 rather than dividing by zero.
 */
const summariseStudents = async (userIds) => {
    const ids = userIds.map(String);
    if (!ids.length) return new Map();

    const { byStudent, enrolledAt } = await courseIdsByStudent(userIds);

    const progressDocs = await Progress.find({ userId: { $in: userIds } })
        .select('userId courseId percentage completedLessons passedQuizzes updatedAt')
        .lean();

    const certificates = await Certificate.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const certificateCount = new Map(certificates.map((c) => [String(c._id), c.count]));

    const rows = new Map();
    for (const id of ids) {
        rows.set(id, {
            coursesEnrolled: (byStudent.get(id) || new Set()).size,
            coursesCompleted: 0,
            coursesStarted: 0,
            progressPercent: 0,
            lessonsCompleted: 0,
            quizzesPassed: 0,
            certificates: certificateCount.get(id) || 0,
            lastActive: null,
            enrolledAt: enrolledAt.get(id) || null
        });
    }

    // Sum only the progress rows for courses the student can still open, so a
    // deleted course cannot push someone past 100%.
    const totals = new Map(ids.map((id) => [id, 0]));
    for (const p of progressDocs) {
        const id = String(p.userId);
        const row = rows.get(id);
        if (!row) continue;
        const reachable = byStudent.get(id);
        if (reachable && !reachable.has(String(p.courseId))) continue;

        const pct = Math.min(COMPLETE_AT, p.percentage ?? 0);
        totals.set(id, totals.get(id) + pct);
        if (pct > 0) row.coursesStarted += 1;
        if (pct >= COMPLETE_AT) row.coursesCompleted += 1;
        row.lessonsCompleted += p.completedLessons?.length ?? 0;
        row.quizzesPassed += p.passedQuizzes?.length ?? 0;
        if (p.updatedAt && (!row.lastActive || p.updatedAt > row.lastActive)) row.lastActive = p.updatedAt;
    }

    for (const [id, row] of rows) {
        row.progressPercent = row.coursesEnrolled
            ? Math.round(totals.get(id) / row.coursesEnrolled)
            : 0;
    }

    return rows;
};

/**
 * Attach the summary rows, XP, level and last-active to a list of student
 * documents, ready for a table.
 *
 * `lastActive` prefers whichever is later: the account's own last-active stamp
 * or the newest progress write. Either alone under-reports — a student reading
 * lessons without finishing one updates neither reliably.
 */
const withSummaries = async (students) => {
    const summaries = await summariseStudents(students.map((s) => s._id));

    return students.map((student) => {
        const summary = summaries.get(String(student._id)) || {};
        const stamps = [summary.lastActive, student.lastActiveDate].filter(Boolean);
        const lastActive = stamps.length ? new Date(Math.max(...stamps.map((d) => new Date(d)))) : null;

        return {
            _id: student._id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            status: student.status,
            profilePicture: student.profilePicture || '',
            xp: student.xp ?? 0,
            level: student.level ?? 1,
            joinedOrganizationAt: student.organizationJoinedAt || null,
            accountCreatedAt: student.createdAt,
            coursesEnrolled: summary.coursesEnrolled ?? 0,
            coursesCompleted: summary.coursesCompleted ?? 0,
            coursesStarted: summary.coursesStarted ?? 0,
            progressPercent: summary.progressPercent ?? 0,
            lessonsCompleted: summary.lessonsCompleted ?? 0,
            quizzesPassed: summary.quizzesPassed ?? 0,
            certificates: summary.certificates ?? 0,
            enrolledAt: summary.enrolledAt || null,
            lastActive
        };
    });
};

/**
 * One student's whole learning record, in the sections the organization views
 * render: overview, courses, assessments, Career Path, achievements.
 *
 * Career Path and rewards are required lazily and each wrapped on its own,
 * because both are optional sections an administrator can lock. A locked or
 * absent section must leave the rest of the page working, so a failure there
 * becomes `null` rather than a 500.
 */
const studentDetail = async (student) => {
    const userId = student._id;

    const { byStudent, enrolledAt } = await courseIdsByStudent([userId]);
    const courseIds = [...(byStudent.get(String(userId)) || new Set())];

    const [courses, progressDocs, certificates] = await Promise.all([
        Course.find({ _id: { $in: courseIds } }).select('title thumbnail').lean(),
        Progress.find({ userId, courseId: { $in: courseIds } }).lean(),
        Certificate.find({ userId }).select('courseId certificateNumber issuedAt pdfUrl').lean()
    ]);

    const titleFor = new Map(courses.map((c) => [String(c._id), c.title]));
    const progressFor = new Map(progressDocs.map((p) => [String(p.courseId), p]));

    const courseRows = courseIds.map((id) => {
        const p = progressFor.get(id) || {};
        return {
            courseId: id,
            title: titleFor.get(id) || 'Course no longer available',
            percentage: Math.min(COMPLETE_AT, p.percentage ?? 0),
            lessonsCompleted: p.completedLessons?.length ?? 0,
            quizzesPassed: p.passedQuizzes?.length ?? 0,
            completed: (p.percentage ?? 0) >= COMPLETE_AT,
            lastActivity: p.updatedAt || null
        };
    }).sort((a, b) => b.percentage - a.percentage);

    const overallPercent = courseRows.length
        ? Math.round(courseRows.reduce((sum, r) => sum + r.percentage, 0) / courseRows.length)
        : 0;

    // ── Career Path, if the student has ever used it ─────────────────────────
    let careerPath = null;
    try {
        const Goal = require('../../career/models/Goal');
        const Roadmap = require('../../career/models/Roadmap');
        const SkillProgress = require('../../career/models/SkillProgress');

        const [goal, roadmap, skills] = await Promise.all([
            Goal.findOne({ userId }).lean(),
            Roadmap.findOne({ userId }).sort({ createdAt: -1 }).lean(),
            SkillProgress.find({ userId }).select('skillName level progress').sort({ progress: -1 }).lean()
        ]);

        if (goal || roadmap || skills.length) {
            // A roadmap's steps live inside the stored AI response, whose shape
            // has changed over time, so the count is taken from whichever key
            // is present rather than assumed.
            const content = roadmap?.content || {};
            const steps = content.steps || content.milestones || content.phases || [];
            const totalSteps = Array.isArray(steps) ? steps.length : 0;
            const doneSteps = (roadmap?.completedSteps || []).length;

            careerPath = {
                careerGoal: goal?.careerGoal || '',
                educationLevel: goal?.educationLevel || '',
                dreamCompany: goal?.dreamCompany || '',
                hasRoadmap: Boolean(roadmap),
                roadmapStepsTotal: totalSteps,
                roadmapStepsCompleted: doneSteps,
                roadmapPercent: totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0,
                skills: skills.map((s) => ({ name: s.skillName, level: s.level, progress: s.progress }))
            };
        }
    } catch (error) {
        console.error('[organizations] could not read Career Path progress:', error.message);
    }

    // ── Streak and badges, if rewards is in use ──────────────────────────────
    let rewards = null;
    try {
        const Streak = require('../../rewards/models/Streak');
        const UserBadge = require('../../rewards/models/RewardUserBadge');
        const [streak, badges] = await Promise.all([
            Streak.findOne({ userId }).select('current longest lastActivityDay').lean(),
            UserBadge.countDocuments({ userId })
        ]);
        if (streak || badges) {
            rewards = {
                currentStreak: streak?.current ?? 0,
                longestStreak: streak?.longest ?? 0,
                lastActivityDay: streak?.lastActivityDay || null,
                badges
            };
        }
    } catch (error) {
        console.error('[organizations] could not read rewards progress:', error.message);
    }

    const progressStamps = courseRows.map((r) => r.lastActivity).filter(Boolean);
    if (student.lastActiveDate) progressStamps.push(student.lastActiveDate);

    return {
        student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            status: student.status,
            profilePicture: student.profilePicture || '',
            accountType: student.accountType,
            institution: student.institution || '',
            className: student.className || '',
            accountCreatedAt: student.createdAt,
            joinedOrganizationAt: student.organizationJoinedAt || null
        },
        overview: {
            overallPercent,
            coursesEnrolled: courseRows.length,
            coursesCompleted: courseRows.filter((r) => r.completed).length,
            coursesStarted: courseRows.filter((r) => r.percentage > 0).length,
            lessonsCompleted: courseRows.reduce((s, r) => s + r.lessonsCompleted, 0),
            quizzesPassed: courseRows.reduce((s, r) => s + r.quizzesPassed, 0),
            xp: student.xp ?? 0,
            level: student.level ?? 1,
            enrolledAt: enrolledAt.get(String(userId)) || null,
            lastActive: progressStamps.length
                ? new Date(Math.max(...progressStamps.map((d) => new Date(d))))
                : null
        },
        courses: courseRows,
        certificates: certificates.map((c) => ({
            courseId: c.courseId,
            courseTitle: titleFor.get(String(c.courseId)) || '',
            certificateNumber: c.certificateNumber || '',
            issuedAt: c.issuedAt
        })),
        careerPath,
        rewards
    };
};

module.exports = { summariseStudents, withSummaries, studentDetail };
