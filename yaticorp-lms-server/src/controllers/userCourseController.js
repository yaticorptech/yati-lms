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
const { canAccessCourse, visibleCoursesFilter } = require('../services/courseAccess');
const walletService = require('../rewards/services/walletService');
const { getConfig: getRewardsConfig } = require('../rewards/services/configService');
const { Wallet, WalletTransaction } = require('../rewards/models');

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

        // An organization's own course shows only while the student is still
        // its member. Hidden, not deleted: the enrollment and progress stay,
        // and come back if they rejoin — which is why this is after the orphan
        // clean-up above rather than in the query.
        const coursesWithProgress = courses.filter(course => canAccessCourse(req.user, course)).map(course => {
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

        // Whether this account skips the 25% rule for the Jobs section. Decided
        // here, on the account, so it travels with the person to any machine.
        const { jobsAlwaysOpen } = require('../services/jobsAccess');
        res.json({
            courses: coursesWithProgress,
            bundles: bundlesWithProgress,
            jobsAlwaysOpen: jobsAlwaysOpen(req.user)
        });
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

        // An organization's own course opens only for its members; to anyone
        // else it does not exist.
        if (!canAccessCourse(req.user, course)) return res.status(404).json({ message: 'Course not found' });

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

        // Atomic: opening the course in two tabs at once still makes one row.
        const progress = await Progress.findOrCreate(req.user._id, courseId);

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
        // Plain values only: an object here ({"$gt": ""}) would match some course.
        if (typeof courseId !== 'string' || (lessonId != null && typeof lessonId !== 'string')) {
            return res.status(400).json({ message: 'Invalid course or lesson' });
        }

        const target = courseId ? await Course.findById(courseId).select('organizationId').lean() : null;
        if (!target || !canAccessCourse(req.user, target)) return res.status(404).json({ message: 'Course not found' });

        const progress = await Progress.findOrCreate(req.user._id, courseId);

        progress.lastAccessedLesson = lessonId;

        const wasComplete = progress.percentage >= 100;
        const newLesson = !progress.completedLessons.includes(lessonId);
        if (newLesson) {
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

        // Rewards: XP, streak and badges for the lesson, and for the course the
        // first time it reaches 100%. Both are exactly-once on the server side
        // (the activity ledger refuses a repeat), so a re-sent request or a
        // second tab cannot pay twice. Never fails the progress update.
        const rewards = { events: [] };
        try {
            const { safeRecordActivity } = require('../rewards/services/activityService');
            if (newLesson) {
                const r = await safeRecordActivity({ userId: req.user._id, type: 'lesson_complete', refId: lessonId, courseId });
                rewards.events.push(...r.events);
            }
            if (progress.percentage === 100 && !wasComplete) {
                const r = await safeRecordActivity({ userId: req.user._id, type: 'course_complete', refId: courseId, courseId });
                rewards.events.push(...r.events);
            }
        } catch (e) { console.error('[rewards] progress hook failed:', e.message); }

        res.json({
            progress,
            certificateEarned,
            rewards
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

        // Platform courses, and the student's own organization's courses.
        const availableCourses = await Course.find({
            isPublished: true,
            _id: { $nin: Array.from(enrolledCourseIds) },
            ...visibleCoursesFilter(req.user)
        });

        res.json({ availableCourses });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    The student's own organization's published courses, with their progress
// @route   GET /api/user/courses/organization
// @access  Private/User
//
// Every course the organization has published, enrolled in or not, so the
// student can find them in one place. Nothing for a student without an
// organization. `enrolled` says whether it is in their My courses yet; an
// organization course is always free, so starting one just enrols them.
const getOrganizationCourses = async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        if (!orgId) return res.json({ organization: null, courses: [] });

        const Organization = require('../organizations/models/Organization');
        const [organization, courses] = await Promise.all([
            Organization.findById(orgId).select('name logo').lean(),
            Course.find({ organizationId: orgId, isPublished: true })
                .select('title description thumbnail instructor lessonsCount createdAt organizationId')
                .sort({ createdAt: -1 })
                .lean()
        ]);
        if (!organization) return res.json({ organization: null, courses: [] });

        const ids = courses.map(c => c._id);
        const [enrollments, progressDocs] = await Promise.all([
            Enrollment.find({ userId: req.user._id, type: 'Course', courseId: { $in: ids } }).select('courseId').lean(),
            Progress.find({ userId: req.user._id, courseId: { $in: ids } }).select('courseId percentage').lean()
        ]);
        const enrolled = new Set(enrollments.map(e => String(e.courseId)));
        const progress = new Map(progressDocs.map(p => [String(p.courseId), Math.min(100, p.percentage || 0)]));

        res.json({
            organization: { _id: organization._id, name: organization.name, logo: organization.logo || null },
            courses: courses.map(c => ({
                ...c,
                enrolled: enrolled.has(String(c._id)),
                progress: progress.get(String(c._id)) || 0
            }))
        });
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

        if (!course || !course.isPublished || !canAccessCourse(req.user, course)) {
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

        // The admin's price is taken from the wallet, every enrolment. Not for
        // an organization's own courses (free to their members), and not while
        // Rewards is locked — the same rule every wallet price follows.
        const userId = req.user._id;
        const price = walletService.money(course.price || 0);
        const rewards = await getRewardsConfig();
        let charge = null;
        if (price > 0 && !course.organizationId && rewards.enabled !== false) {
            await walletService.grantStartingCredit(userId);
            // Numbered per course, so two clicks at once book one charge (the
            // ledger refuses a second entry with the same key), while a
            // genuine re-enrolment later is charged again.
            const previous = await WalletTransaction.countDocuments({ userId, source: 'purchase', type: 'debit', 'meta.courseId': String(course._id) });
            try {
                charge = await walletService.debit({
                    userId, amount: price, source: 'purchase', spendCreditFirst: true,
                    referenceKey: `course:${course._id}:${previous + 1}`,
                    description: `Enrolled in ${course.title}`,
                    meta: { courseId: String(course._id) },
                    createdBy: 'user'
                });
            } catch (err) {
                if (err.code === 'INSUFFICIENT_FUNDS') {
                    const w = await Wallet.findOne({ userId }).select('available currency').lean();
                    const cur = w?.currency || 'INR';
                    return res.status(402).json({
                        code: 'INSUFFICIENT_FUNDS',
                        message: `This course costs ${cur} ${price} and your wallet balance is ${cur} ${walletService.money(w?.available || 0)}. Earn XP on Career Path to add to your wallet balance.`,
                        needed: price, balance: w?.available || 0
                    });
                }
                throw err;
            }
            if (charge.duplicate) {
                return res.status(409).json({ message: 'Your enrolment is already being processed.' });
            }
        }

        try {
            await Enrollment.create({ userId, type: 'Course', courseId });
        } catch (err) {
            // Paid but not enrolled: the money goes straight back.
            if (charge?.txn) {
                await walletService.credit({
                    userId, amount: price, source: 'feature_refund', referenceKey: `refund:${charge.txn._id}`,
                    description: `Refund: enrolment in ${course.title} did not complete`, spendOnly: (charge.txn.meta?.fromSpendOnly || 0) >= price
                }).catch((e) => console.error('[enroll] refund failed:', e.message));
            }
            throw err;
        }

        res.json({
            message: 'Enrolled successfully!',
            course,
            charged: charge?.txn ? price : 0,
            balance: charge?.wallet?.available ?? null
        });

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
            title: regex,
            ...visibleCoursesFilter(req.user)
        }).select('title thumbnail _id').lean();

        // Search lessons by title in enrolled courses the student can still
        // open (an organization's course only while they are its member).
        const visibleIds = await Course.find({ _id: { $in: courseIdsArr }, ...visibleCoursesFilter(req.user) }).distinct('_id');
        const modules = await Module.find({ courseId: { $in: visibleIds } }, '_id courseId').lean();
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
    getOrganizationCourses,
    enrollCourse,
    searchContent
};
