/**
 * @author Preethesh Kulal
 * @description Student course access, progress tracking, enrollment and content search
 */
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const Bundle = require('../models/Bundle');
const Progress = require('../models/Progress');

/**
 * Every published bundle, with only its published courses attached.
 *
 * Bundles are open to anyone with an account — enrolment decides which
 * standalone courses land in "My Courses", not what a student may open. The
 * populate match matters: without it an unpublished course stays listed inside
 * the bundle and links to a player that then refuses it.
 */
const findPublishedBundles = (filter = {}) =>
    Bundle.find({ ...filter, isPublished: true }).populate({
        path: 'courses',
        match: { isPublished: true },
        select: 'title thumbnail description isPublished'
    });

/**
 * Bundle completion as the average of its courses' percentages.
 *
 * A course the student has never opened has no Progress document and counts as
 * zero rather than being skipped, so a half-finished bundle cannot report 100%.
 */
const bundleProgress = (bundle, progressByCourse) => {
    const courses = bundle.courses || [];
    if (courses.length === 0) return 0;
    const total = courses.reduce(
        (sum, c) => sum + (progressByCourse.get(c._id.toString()) || 0),
        0
    );
    return Math.round(total / courses.length);
};

// @desc    Get all courses student is enrolled in directly or via bundle
// @route   GET /api/user/courses
// @access  Private/User
const getMyCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ userId: req.user._id });
        const courseIds = new Set();
        const bundleIds = new Set();
        const orphanEnrollmentIds = [];

        // Collect bundle IDs first
        for (const enr of enrollments) {
            if (enr.type === 'Course' && enr.courseId) {
                courseIds.add(enr.courseId.toString());
            } else if (enr.type === 'Bundle' && enr.bundleId) {
                bundleIds.add(enr.bundleId.toString());
            }
        }

        // Batch-fetch ALL bundles in one query (avoids N+1)
        if (bundleIds.size > 0) {
            const enrolledBundles = await Bundle.find({ _id: { $in: Array.from(bundleIds) } });
            const foundBundleIds = new Set(enrolledBundles.map(b => b._id.toString()));

            enrolledBundles.forEach(bundle => {
                if (bundle.courses) {
                    bundle.courses.forEach(cid => courseIds.add(cid.toString()));
                }
            });

            // Mark bundle enrollments as orphans if bundle no longer exists
            enrollments.forEach(enr => {
                if (enr.type === 'Bundle' && enr.bundleId && !foundBundleIds.has(enr.bundleId.toString())) {
                    orphanEnrollmentIds.push(enr._id);
                }
            });
        }

        // Every published bundle, not only the enrolled ones — a bundle is open
        // to any signed-in student, so the list is the same for everybody and
        // only the progress on it differs.
        const bundles = await findPublishedBundles();

        const courses = await Course.find({ _id: { $in: Array.from(courseIds) }, isPublished: true });
        const foundCourseIds = new Set(courses.map(c => c._id.toString()));

        // Mark course enrollments as orphans if course no longer exists
        enrollments.forEach(enr => {
            if (enr.type === 'Course' && enr.courseId && !foundCourseIds.has(enr.courseId.toString())) {
                orphanEnrollmentIds.push(enr._id);
            }
        });

        // Clean up orphans silently
        if (orphanEnrollmentIds.length > 0) {
            Enrollment.deleteMany({ _id: { $in: orphanEnrollmentIds } }).catch(() => {});
        }

        // Progress covers the bundle courses as well as the enrolled ones: a
        // student can now start a course inside a bundle without ever being
        // enrolled in it, and that progress still has to show on the bundle.
        const progressCourseIds = new Set(courseIds);
        bundles.forEach(b => b.courses?.forEach(c => progressCourseIds.add(c._id.toString())));
        const progressDocs = await Progress.find({
            userId: req.user._id,
            courseId: { $in: Array.from(progressCourseIds) }
        });
        const progressByCourse = new Map(
            progressDocs.map(p => [p.courseId.toString(), Math.min(100, p.percentage)])
        );

        const coursesWithProgress = courses.map(course => {
            const prog = progressDocs.find(p => p.courseId.toString() === course._id.toString());
            return {
                ...course.toObject(),
                progress: prog ? Math.min(100, prog.percentage) : 0,
                completedLessons: prog ? prog.completedLessons.length : 0
            };
        });


        const bundlesWithProgress = bundles.map(bundle => ({
            ...bundle.toObject(),
            progress: bundleProgress(bundle, progressByCourse)
        }));

        res.json({ courses: coursesWithProgress, bundles: bundlesWithProgress });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get detailed course content for player
// @route   GET /api/user/courses/:id
// @access  Private/User
const getCourseContent = async (req, res) => {
    try {
        const courseId = req.params.id;
        // Basic verification - check if user enrolled. Real implementation requires robust check.
        const course = await Course.findById(courseId);
        if (!course) {
            console.log(`[getCourseContent] Course ${courseId} not found in DB`);
            return res.status(404).json({ message: 'Course not found' });
        }

        if (!course.isPublished) {
            console.log(`[getCourseContent] Course ${courseId} is currently unpublished.`);
            return res.status(404).json({ message: 'This course is currently unpublished and unavailable.' });
        }

        // Content dripping: modules unlock N days after the student's enrollment.
        const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId });
        const enrollDate = enrollment ? new Date(enrollment.assignedAt || enrollment.createdAt) : null;
        const now = new Date();

        const modules = await Module.find({ courseId }).sort('order');
        const modulesWithLessons = await Promise.all(
            modules.map(async (mod) => {
                const modObj = mod.toObject();
                const dripDays = modObj.dripDays || 0;
                let unlockAt = null;
                let locked = false;
                if (dripDays > 0 && enrollDate) {
                    unlockAt = new Date(enrollDate.getTime() + dripDays * 24 * 60 * 60 * 1000);
                    locked = now < unlockAt;
                }

                const lessons = await Lesson.find({ moduleId: mod._id, isPublished: true }).sort('order');
                // For a still-locked module, expose only titles/types — never the content.
                const safeLessons = locked
                    ? lessons.map(l => ({ _id: l._id, title: l.title, type: l.type, order: l.order, locked: true }))
                    : lessons;

                return { ...modObj, dripDays, locked, unlockAt, lessons: safeLessons };
            })
        );

        let progress = await Progress.findOne({ userId: req.user._id, courseId });
        if (!progress) {
            progress = await Progress.create({ userId: req.user._id, courseId, percentage: 0 });
        }

        res.json({
            course,
            modules: modulesWithLessons,
            progress
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update progress when a lesson is completed
// @route   POST /api/user/progress/update
// @access  Private/User
const updateProgress = async (req, res) => {
    try {
        const { courseId, lessonId } = req.body;

        let progress = await Progress.findOne({ userId: req.user._id, courseId });
        if (!progress) {
            progress = new Progress({ userId: req.user._id, courseId, completedLessons: [] });
        }

        progress.lastAccessedLesson = lessonId;

        if (!progress.completedLessons.includes(lessonId)) {
            progress.completedLessons.push(lessonId);
        }

        // Calculate complete percentage
        const modules = await Module.find({ courseId });
        const moduleIds = modules.map(m => m._id);
        const totalLessons = await Lesson.countDocuments({ moduleId: { $in: moduleIds }, isPublished: true });

        progress.percentage = totalLessons === 0 ? 0 : Math.min(100, Math.round((progress.completedLessons.length / totalLessons) * 100));

        await progress.save();

        // Check if certificate should be generated
        let certificateEarned = false;
        if (progress.percentage === 100) {
            certificateEarned = true;
            // In production, we could trigger the certificate generation API or webhook here automatically
        }

        res.json({
            progress,
            certificateEarned
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get courses available for purchase with credits
// @route   GET /api/user/courses/available
// @access  Private/User
const getAvailableCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ userId: req.user._id });
        const enrolledCourseIds = new Set();
        const bundleIds = [];

        for (const enr of enrollments) {
            if (enr.type === 'Course' && enr.courseId) {
                enrolledCourseIds.add(enr.courseId.toString());
            } else if (enr.type === 'Bundle' && enr.bundleId) {
                bundleIds.push(enr.bundleId);
            }
        }

        // Batch-fetch all enrolled bundles in one query (avoids N+1)
        if (bundleIds.length > 0) {
            const enrolledBundles = await Bundle.find({ _id: { $in: bundleIds } });
            enrolledBundles.forEach(bundle => {
                if (bundle.courses) {
                    bundle.courses.forEach(cid => enrolledCourseIds.add(cid.toString()));
                }
            });
        }

        const availableCourses = await Course.find({
            isPublished: true,
            _id: { $nin: Array.from(enrolledCourseIds) }
        });

        res.json({ availableCourses });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Buy a course using credits
// @route   POST /api/user/courses/:id/buy
// @access  Private/User
const enrollCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);

        if (!course || !course.isPublished) {
            return res.status(404).json({ message: 'Course not found or unavailable' });
        }

        const existingEnrollment = await Enrollment.findOne({
            userId: req.user._id,
            type: 'Course',
            courseId: courseId
        });

        if (existingEnrollment) {
            return res.status(400).json({ message: 'You are already enrolled in this course' });
        }

        await Enrollment.create({
            userId: req.user._id,
            type: 'Course',
            courseId: courseId
        });

        res.json({ message: 'Enrolled successfully!', course });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    List every published bundle, open to any signed-in student
// @route   GET /api/user/bundles
// @access  Private/User
const getBundles = async (req, res) => {
    try {
        const bundles = await findPublishedBundles();
        const courseIds = new Set();
        bundles.forEach(b => b.courses?.forEach(c => courseIds.add(c._id.toString())));

        const progressDocs = await Progress.find({
            userId: req.user._id,
            courseId: { $in: Array.from(courseIds) }
        });
        const progressByCourse = new Map(
            progressDocs.map(p => [p.courseId.toString(), Math.min(100, p.percentage)])
        );

        res.json({
            bundles: bundles.map(bundle => ({
                ...bundle.toObject(),
                progress: bundleProgress(bundle, progressByCourse)
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    One published bundle and the courses inside it
// @route   GET /api/user/bundles/:id
// @access  Private/User
const getBundleContent = async (req, res) => {
    try {
        // No enrolment check: login is the only requirement. An unpublished or
        // missing bundle is still a 404 — publishing is what opens it.
        const [bundle] = await findPublishedBundles({ _id: req.params.id });
        if (!bundle) {
            return res.status(404).json({ message: 'This bundle is unavailable.' });
        }

        const courseIds = (bundle.courses || []).map(c => c._id.toString());
        const progressDocs = await Progress.find({
            userId: req.user._id,
            courseId: { $in: courseIds }
        });
        const progressByCourse = new Map(
            progressDocs.map(p => [p.courseId.toString(), Math.min(100, p.percentage)])
        );

        res.json({
            bundle: {
                ...bundle.toObject(),
                courses: (bundle.courses || []).map(c => ({
                    ...c.toObject(),
                    progress: progressByCourse.get(c._id.toString()) || 0
                })),
                progress: bundleProgress(bundle, progressByCourse)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Search enrolled courses and lessons
// @route   GET /api/user/search?q=
// @access  Private/User
const searchContent = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json({ courses: [], lessons: [] });

        const regex = new RegExp(q, 'i');

        // Get enrolled course IDs
        const enrollments = await Enrollment.find({ userId: req.user._id });
        const courseIds = new Set();
        const bundleIds = [];
        for (const enr of enrollments) {
            if (enr.type === 'Course' && enr.courseId) courseIds.add(enr.courseId.toString());
            else if (enr.type === 'Bundle' && enr.bundleId) bundleIds.push(enr.bundleId);
        }
        if (bundleIds.length > 0) {
            const bundles = await Bundle.find({ _id: { $in: bundleIds } });
            bundles.forEach(b => b.courses?.forEach(cid => courseIds.add(cid.toString())));
        }

        const courseIdsArr = Array.from(courseIds);

        // Search courses
        const courses = await Course.find({
            _id: { $in: courseIdsArr },
            isPublished: true,
            title: regex
        }).select('title thumbnail _id').lean();

        // Search lessons by title in enrolled courses
        const modules = await Module.find({ courseId: { $in: courseIdsArr } }, '_id courseId').lean();
        const moduleIds = modules.map(m => m._id);
        const lessons = await Lesson.find({
            moduleId: { $in: moduleIds },
            isPublished: true,
            title: regex
        }).select('title type _id moduleId').lean();

        // Attach courseId to each lesson
        const modMap = {};
        modules.forEach(m => { modMap[m._id.toString()] = m.courseId.toString(); });
        const lessonsWithCourse = lessons.map(l => ({
            ...l,
            courseId: modMap[l.moduleId.toString()]
        }));

        res.json({ courses, lessons: lessonsWithCourse });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getMyCourses,
    getBundles,
    getBundleContent,
    getCourseContent,
    updateProgress,
    getAvailableCourses,
    enrollCourse,
    searchContent
};
