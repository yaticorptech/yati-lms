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
 *   summariseStudents(userIds, organizationId) — a handful of grouped queries for the table
 *   studentDetail(student, organizationId)     — every section of one student's record
 *
 * `organizationId` is the organization doing the viewing. When it is given,
 * another organization's private courses (Course.organizationId set to someone
 * else) are left out of every number and list: a student who moved from
 * organization A to B keeps their record in A's courses, but B neither counts
 * nor sees it — the same rule canAccessCourse applies to the student. Platform
 * courses and the viewer's own courses count. Without it (the superadmin's
 * any-student view) the whole record is shown. Nothing is ever deleted.
 *
 * What the numbers mean, everywhere in this file:
 *   coursesEnrolled  — distinct courses the student can open (direct or bundle
 *                      enrollment), within the viewer's scope
 *   coursesStarted   — of those, courses with progress above 0%
 *   coursesCompleted — of those, courses whose progress reached 100%; never
 *                      more than coursesEnrolled
 *   progressPercent / overallPercent — mean progress over coursesEnrolled,
 *                      untouched courses counting as 0%; always 0–100
 *   certificates     — certificates issued to the student, excluding ones for
 *                      another organization's private courses when scoped
 * A student with two Progress rows for one course (written before the unique
 * index existed) counts once, by the further-along row.
 */
const Enrollment = require('../../models/Enrollment');
const Progress = require('../../models/Progress');
const Certificate = require('../../models/Certificate');
const Course = require('../../models/Course');
const Bundle = require('../../models/Bundle');

/** A course counts as finished at 100%. */
const COMPLETE_AT = 100;

/** A stored percentage as one that can be shown: a number from 0 to 100. */
const clampPercent = (value) => Math.max(0, Math.min(COMPLETE_AT, Number(value) || 0));

/**
 * One Progress row per student and course: where duplicates exist, the one
 * with the highest percentage, then the most completed lessons. Keyed
 * `userId|courseId`. Shared with courseStats.
 */
/**
 * How many lessons a Progress row has completed, whether it was read whole
 * (`completedLessons`) or through the projected read below (`lessonCount`).
 */
const lessonCountOf = (p) => p.lessonCount ?? p.completedLessons?.length ?? 0;
const quizCountOf = (p) => p.quizCount ?? p.passedQuizzes?.length ?? 0;

const bestProgressByKey = (docs) => {
    const best = new Map();
    for (const p of docs) {
        const k = `${p.userId}|${p.courseId}`;
        const held = best.get(k);
        const ahead = !held
            || clampPercent(p.percentage) > clampPercent(held.percentage)
            || (clampPercent(p.percentage) === clampPercent(held.percentage)
                && lessonCountOf(p) > lessonCountOf(held));
        if (ahead) best.set(k, p);
    }
    return best;
};

/**
 * Of these course ids, the ones that belong privately to an organization other
 * than `organizationId` — the courses that viewer must not count or see.
 */
const foreignCourseIds = async (courseIds, organizationId) => {
    if (!organizationId || !courseIds.length) return new Set();
    const ids = await Course.find({
        _id: { $in: courseIds },
        organizationId: { $ne: null, $nin: [organizationId] }
    }).distinct('_id');
    return new Set(ids.map(String));
};

/**
 * Every course id each of these students can open, whether enrolled directly
 * or through a bundle.
 *
 * Bundles are resolved in one extra query rather than per student, because a
 * whole institution is usually put on the same two or three bundles.
 */
const courseIdsByStudent = async (userIds, organizationId = null) => {
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

    // Another organization's private courses are out of the viewer's scope.
    const allIds = [...new Set([...byStudent.values()].flatMap((set) => [...set]))];
    const foreign = await foreignCourseIds(allIds, organizationId);
    if (foreign.size) {
        for (const set of byStudent.values()) for (const cid of foreign) set.delete(cid);
    }

    return { byStudent, enrolledAt, foreign };
};

/**
 * One row per student for the organization's student table.
 *
 * `progressPercent` is the mean across the courses the student can open, not
 * across the courses they have touched — a student enrolled in four courses who
 * has finished one is at 25%, which is what an institution means by progress.
 * A student with no courses at all reads 0 rather than dividing by zero.
 */
const summariseStudents = async (userIds, organizationId = null) => {
    const ids = userIds.map(String);
    if (!ids.length) return new Map();

    const { byStudent, enrolledAt } = await courseIdsByStudent(userIds, organizationId);

    // Counted in the database rather than read whole: a table only needs how
    // many lessons and quizzes, and the arrays themselves (one id per lesson,
    // per course, per student) were most of what a large organization's list
    // and dashboard pulled over the wire.
    const progressDocs = await Progress.find({ userId: { $in: userIds } })
        .select({
            userId: 1, courseId: 1, percentage: 1, updatedAt: 1,
            lessonCount: { $size: { $ifNull: ['$completedLessons', []] } },
            quizCount: { $size: { $ifNull: ['$passedQuizzes', []] } }
        })
        .lean();

    const certificateDocs = await Certificate.find({ userId: { $in: userIds } }).select('userId courseId').lean();
    const foreignCerts = await foreignCourseIds([...new Set(certificateDocs.map((c) => String(c.courseId)))], organizationId);
    const certificateCount = new Map();
    for (const c of certificateDocs) {
        if (foreignCerts.has(String(c.courseId))) continue;
        const id = String(c.userId);
        certificateCount.set(id, (certificateCount.get(id) || 0) + 1);
    }

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
    // deleted course cannot push someone past 100%, and only one row per
    // course, so a duplicated Progress row cannot either.
    const totals = new Map(ids.map((id) => [id, 0]));
    for (const p of bestProgressByKey(progressDocs).values()) {
        const id = String(p.userId);
        const row = rows.get(id);
        if (!row) continue;
        const reachable = byStudent.get(id);
        if (!reachable || !reachable.has(String(p.courseId))) continue;

        const pct = clampPercent(p.percentage);
        totals.set(id, totals.get(id) + pct);
        if (pct > 0) row.coursesStarted += 1;
        if (pct >= COMPLETE_AT) row.coursesCompleted += 1;
        row.lessonsCompleted += lessonCountOf(p);
        row.quizzesPassed += quizCountOf(p);
        if (p.updatedAt && (!row.lastActive || p.updatedAt > row.lastActive)) row.lastActive = p.updatedAt;
    }

    for (const [id, row] of rows) {
        row.progressPercent = row.coursesEnrolled
            ? clampPercent(Math.round(totals.get(id) / row.coursesEnrolled))
            : 0;
        row.coursesCompleted = Math.min(row.coursesCompleted, row.coursesEnrolled);
        row.coursesStarted = Math.min(row.coursesStarted, row.coursesEnrolled);
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
const withSummaries = async (students, organizationId = null, precomputed = null) => {
    // A caller that already summarised a wider set (the paged student list,
    // which sorts or filters on progress before slicing) passes the map in
    // rather than having the same queries run twice.
    const summaries = precomputed || await summariseStudents(students.map((s) => s._id), organizationId);

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
const studentDetail = async (student, organizationId = null) => {
    const userId = student._id;

    const { byStudent, enrolledAt } = await courseIdsByStudent([userId], organizationId);
    const courseIds = [...(byStudent.get(String(userId)) || new Set())];

    const [courses, progressDocs, certificates] = await Promise.all([
        Course.find({ _id: { $in: courseIds } }).select('title thumbnail').lean(),
        Progress.find({ userId, courseId: { $in: courseIds } }).lean(),
        Certificate.find({ userId }).select('courseId certificateNumber issuedAt pdfUrl').lean()
    ]);

    const titleFor = new Map(courses.map((c) => [String(c._id), c.title]));
    const progressFor = new Map([...bestProgressByKey(progressDocs).values()].map((p) => [String(p.courseId), p]));
    const foreignCerts = await foreignCourseIds([...new Set(certificates.map((c) => String(c.courseId)))], organizationId);
    const visibleCertificates = certificates.filter((c) => !foreignCerts.has(String(c.courseId)));

    const courseRows = courseIds.map((id) => {
        const p = progressFor.get(id) || {};
        const percentage = clampPercent(p.percentage);
        return {
            courseId: id,
            title: titleFor.get(id) || 'Course no longer available',
            percentage,
            lessonsCompleted: p.completedLessons?.length ?? 0,
            quizzesPassed: p.passedQuizzes?.length ?? 0,
            completed: percentage >= COMPLETE_AT,
            lastActivity: p.updatedAt || null
        };
    }).sort((a, b) => b.percentage - a.percentage);

    const overallPercent = courseRows.length
        ? clampPercent(Math.round(courseRows.reduce((sum, r) => sum + r.percentage, 0) / courseRows.length))
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
        certificates: visibleCertificates.map((c) => ({
            courseId: c.courseId,
            courseTitle: titleFor.get(String(c.courseId)) || '',
            certificateNumber: c.certificateNumber || '',
            issuedAt: c.issuedAt
        })),
        careerPath,
        rewards
    };
};

module.exports = { summariseStudents, withSummaries, studentDetail, bestProgressByKey, clampPercent };
