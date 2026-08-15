/**
 * @author Preethesh Kulal
 * @description Handles analytics data: enrollment counts, completion rates, active users per org
 */

const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Bundle = require('../models/Bundle');

// @desc    Get analytics overview
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);

        // ── Fetch org-level base data first ──────────────────────────────────
        const [orgUsers, courses, allBundles] = await Promise.all([
            User.find({}, '_id').lean(),
            Course.find({ isPublished: true }).lean(),
            Bundle.find({ isPublished: true }, 'courses').lean(),
        ]);

        const totalStudents = orgUsers.length;
        const orgUserIds = orgUsers.map(u => u._id); // ObjectId[]
        const courseIds = courses.map(c => c._id.toString()); // string[]

        console.log(`[Analytics] students=${totalStudents} courses=${courseIds.length}`);

        // ── Enrollment & Progress scoped by org user IDs ──────────────────────
        const [allEnrollments, activeThisWeekIds, quizPassAgg, allProgress] = await Promise.all([
            Enrollment.find(
                { userId: { $in: orgUserIds } },
                'userId courseId bundleId type'
            ).lean(),

            Progress.distinct('userId', {
                userId: { $in: orgUserIds },
                updatedAt: { $gte: startOfWeek }
            }),

            Progress.aggregate([
                { $match: { userId: { $in: orgUserIds } } },
                { $project: { count: { $size: { $ifNull: ['$passedQuizzes', []] } } } },
                { $group: { _id: null, total: { $sum: '$count' } } }
            ]),

            Progress.find(
                { userId: { $in: orgUserIds } },
                'courseId userId percentage'
            ).lean(),
        ]);

        console.log(`[Analytics] enrollments=${allEnrollments.length} courseIds=${JSON.stringify(courseIds.slice(0,3))}`);
        if (allEnrollments.length > 0) {
            console.log(`[Analytics] sample enrollment courseId=${allEnrollments[0].courseId} type=${typeof allEnrollments[0].courseId}`);
        }

        // ✅ Bundle → Courses map
        const bundleCourseMap = {};
        allBundles.forEach(b => {
            bundleCourseMap[b._id.toString()] =
                (b.courses || []).map(c => c.toString());
        });

        // ✅ Enrolled users per course
        const enrolledUsersByCourse = {};
        courseIds.forEach(cid => {
            enrolledUsersByCourse[cid] = new Set();
        });

        allEnrollments.forEach(enr => {
            const uid = enr.userId?.toString();
            if (!uid) return;

            if (enr.type === 'Course' && enr.courseId) {
                const cid = enr.courseId.toString();
                if (courseIds.includes(cid)) {
                    enrolledUsersByCourse[cid]?.add(uid);
                }
            }

            if (enr.type === 'Bundle' && enr.bundleId) {
                const bundleCourses = bundleCourseMap[enr.bundleId.toString()];
                if (!bundleCourses) return;

                bundleCourses.forEach(cid => {
                    enrolledUsersByCourse[cid]?.add(uid);
                });
            }
        });

        // ── Modules & Lessons ─────────────────────────────────────────────────
        const allModules = await Module.find(
            { courseId: { $in: courseIds } },
            '_id courseId'
        ).lean();

        const moduleIdToCourseId = {};
        allModules.forEach(m => {
            moduleIdToCourseId[m._id.toString()] = m.courseId.toString();
        });

        // ✅ Lessons
        const allModuleIds = allModules.map(m => m._id);

        const allLessons = await Lesson.find(
            { moduleId: { $in: allModuleIds } },
            'moduleId'
        ).lean();

        const lessonCountByCourse = {};
        allLessons.forEach(l => {
            const cid = moduleIdToCourseId[l.moduleId.toString()];
            if (cid) {
                lessonCountByCourse[cid] =
                    (lessonCountByCourse[cid] || 0) + 1;
            }
        });

        // ── Progress (org-scoped, already fetched above) ─────────────────────

        const progressByCourse = {};
        allProgress.forEach(p => {
            const cid = p.courseId?.toString();
            if (!cid) return;

            if (!progressByCourse[cid]) {
                progressByCourse[cid] = {
                    completedCount: 0,
                    totalPct: 0,
                    count: 0
                };
            }

            progressByCourse[cid].count++;
            progressByCourse[cid].totalPct += p.percentage || 0;

            if ((p.percentage || 0) >= 100) {
                progressByCourse[cid].completedCount++;
            }
        });

        // ✅ Course stats
        const courseStats = courses.map(c => {
            const cid = c._id.toString();

            const prog = progressByCourse[cid] || {
                completedCount: 0,
                totalPct: 0,
                count: 0
            };

            const enrolled = enrolledUsersByCourse[cid]?.size ?? 0;

            const completedCount = Math.min(
                prog.completedCount,
                enrolled
            );

            const avgCompletion =
                prog.count > 0
                    ? Math.round(prog.totalPct / prog.count)
                    : 0;

            return {
                _id: c._id,
                title: c.title,
                isPublished: c.isPublished,
                enrolledCount: enrolled,
                lessonCount: lessonCountByCourse[cid] || 0,
                completedCount,
                avgCompletion,
                completionRate:
                    enrolled > 0
                        ? Math.round((completedCount / enrolled) * 100)
                        : 0
            };
        });

        // ✅ Total enrollments
        const totalEnrollments = Object.values(enrolledUsersByCourse)
            .reduce((sum, set) => sum + set.size, 0);

        res.json({
            totalStudents,
            totalEnrollments,
            activeThisWeek: activeThisWeekIds.length,
            totalPassedQuizzes: quizPassAgg[0]?.total || 0,
            courseStats
        });

    } catch (error) {
        console.error('[Analytics]', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = { getAnalytics };