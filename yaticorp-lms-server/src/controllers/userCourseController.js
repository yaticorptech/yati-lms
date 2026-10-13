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
const Quiz = require('../models/Quiz');

// How a course's content is listed everywhere — the player, the outline and the
// progress check: by the admin's order, and by id where two share a number, so
// all three always agree on which lesson comes next.
const CONTENT_ORDER = { order: 1, _id: 1 };
const { canAccessCourse, canOpenCourse, visibleCoursesFilter } = require('../services/courseAccess');
const { hasFullAccess } = require('../services/fullAccess');
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


        // Each course inside a bundle carries the student's own progress on
        // it: the bundle's popup lists courses the student reached only
        // through the bundle, which are not in `courses` above, and read
        // them as 0% and "Start Course" however far along they were.
        const bundlesWithProgress = bundles.map(bundle => {
            const plain = bundle.toObject();
            return {
                ...plain,
                courses: (plain.courses || []).map(c => ({ ...c, progress: progressByCourse.get(c._id.toString()) || 0 })),
                progress: bundleProgress(bundle, progressByCourse)
            };
        });

        // Whether this account skips the rule for the Jobs section. Decided
        // here, on the account, so it travels with the person to any machine.
        // The Jobs gate itself reads GET /user/jobs-access.
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

// @desc    Whether the student may open the Jobs section, and how far along they are
// @route   GET /api/user/jobs-access
// @access  Private/User
const getJobsAccess = async (req, res) => {
    try {
        const { jobsAccessFor } = require('../services/jobsAccess');
        res.json(await jobsAccessFor(req.user));
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
        // Its lessons are for students who have it: enrolled (a priced course
        // is paid for then), or through a bundle. The player answers this with
        // the way to enrol.
        if (!(await canOpenCourse(req.user, course))) {
            return res.status(403).json({ code: 'NOT_ENROLLED', message: 'Enrol in this course to open its lessons.' });
        }

        // Content dripping: modules unlock N days after the student's enrollment.
        // Not for the demo cards (services/fullAccess.js): they show the product,
        // so every module is open to them from the start — the account owner's
        // rule, 2026-10-09. Every other student keeps the drip.
        const drips = !hasFullAccess(req.user);
        const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId });
        const enrollDate = enrollment ? new Date(enrollment.assignedAt || enrollment.createdAt) : null;
        const now = new Date();

        const modules = await Module.find({ courseId }).sort(CONTENT_ORDER);
        const modulesWithLessons = await Promise.all(
            modules.map(async (mod) => {
                const modObj = mod.toObject();
                const dripDays = modObj.dripDays || 0;
                let unlockAt = null;
                let locked = false;
                if (drips && dripDays > 0 && enrollDate) {
                    unlockAt = new Date(enrollDate.getTime() + dripDays * 24 * 60 * 60 * 1000);
                    locked = now < unlockAt;
                }

                const lessons = await Lesson.find({ moduleId: mod._id, isPublished: true }).sort(CONTENT_ORDER);
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

// What a lesson is, as the course player labels it: a quiz, a video, a
// reading (a PDF), an assignment, or a plain lesson with none of those.
const lessonKind = (lesson) => {
    if (lesson.type === 'quiz' || lesson.quizId) return 'quiz';
    if (lesson.videoUrl || lesson.videoId) return 'video';
    if (lesson.pdfUrl) return 'reading';
    if (lesson.assignmentId || lesson.type === 'assignment') return 'assignment';
    return 'lesson';
};

// @desc    What is inside a course, for a student deciding whether to enrol
// @route   GET /api/user/courses/:id/outline
// @access  Private/User
//
// The Preview on an available course. Its sections and the title and kind of
// every lesson, with counts, and nothing that plays: no video, PDF, quiz or
// assignment reference leaves the server, so a priced course gives nothing
// away. Published courses only, and an organization's course only to its own
// students (to anyone else it does not exist, as in the player).
const getCourseOutline = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .select('title description thumbnail instructor price isPublished organizationId').lean();
        if (!course || !course.isPublished || !canAccessCourse(req.user, course)) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const modules = await Module.find({ courseId: course._id }).sort(CONTENT_ORDER).select('title description dripDays').lean();
        const lessons = await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) }, isPublished: true })
            .sort(CONTENT_ORDER).select('moduleId title type videoUrl videoId pdfUrl quizId assignmentId').lean();

        const totals = { modules: modules.length, lessons: lessons.length, video: 0, reading: 0, quiz: 0, assignment: 0 };
        const byModule = new Map(modules.map((m) => [String(m._id), []]));
        for (const lesson of lessons) {
            const kind = lessonKind(lesson);
            if (kind in totals) totals[kind] += 1;
            byModule.get(String(lesson.moduleId))?.push({ title: lesson.title, kind });
        }

        res.json({
            course: {
                id: course._id,
                title: course.title,
                description: course.description || '',
                thumbnail: course.thumbnail || '',
                instructor: course.instructor || '',
                price: course.price || 0
            },
            // Whether the student can open it already (enrolled, or through a
            // bundle), so the Preview offers "Open course" instead of Enroll.
            canOpen: await canOpenCourse(req.user, course),
            totals,
            modules: modules.map((m) => ({
                title: m.title,
                description: m.description || '',
                // Opens this many days after enrolling (the player's drip lock).
                dripDays: m.dripDays || 0,
                lessons: byModule.get(String(m._id))
            }))
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
        if (typeof courseId !== 'string' || typeof lessonId !== 'string' || !require('mongoose').isValidObjectId(lessonId)) {
            return res.status(400).json({ message: 'Invalid course or lesson' });
        }

        const target = courseId ? await Course.findById(courseId).select('organizationId').lean() : null;
        if (!target || !canAccessCourse(req.user, target)) return res.status(404).json({ message: 'Course not found' });
        // No progress (and no lesson or course XP) in a course the student does not have.
        if (!(await canOpenCourse(req.user, target))) {
            return res.status(403).json({ code: 'NOT_ENROLLED', message: 'Enrol in this course to open its lessons.' });
        }

        // A real, published lesson of this course. Any id used to be taken, so
        // made-up ones paid lesson XP and could carry a course to 100% (and so
        // to its course XP and certificate) without a lesson being done.
        const modules = await Module.find({ courseId }).sort(CONTENT_ORDER).select('_id').lean();
        const published = await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) }, isPublished: true }).sort(CONTENT_ORDER).select('_id moduleId type assignmentId').lean();
        // In the order the course runs: module by module, as the player lists them.
        const courseLessons = modules.flatMap((m) => published.filter((l) => String(l.moduleId) === String(m._id)));
        const lesson = courseLessons.find((l) => String(l._id) === lessonId);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found in this course' });

        const progress = await Progress.findOrCreate(req.user._id, courseId);

        if (!progress.completedLessons.map(String).includes(lessonId)) {
            // In order: the next lesson is the first one not yet done, as the
            // player unlocks them. Only the page held this rule; a request
            // could finish a course's lessons in any order, or all at once.
            const done = new Set(progress.completedLessons.map(String));
            const next = courseLessons.find((l) => !done.has(String(l._id)));
            if (!next || String(next._id) !== lessonId) {
                return res.status(403).json({ code: 'LESSON_LOCKED', message: 'Finish the earlier lessons first.' });
            }
            // A quiz lesson is done by passing its quiz, not by asking. A
            // failed first attempt that earned credits used to complete it,
            // and with it the course and its certificate.
            if (lesson.type === 'quiz') {
                const quiz = await Quiz.findOne({ lessonId: lesson._id }).select('_id').lean();
                if (quiz && !(progress.passedQuizzes || []).map(String).includes(String(quiz._id))) {
                    return res.status(403).json({ code: 'QUIZ_NOT_PASSED', message: 'Pass this lesson\'s quiz to complete it.' });
                }
            }
        }

        progress.lastAccessedLesson = lessonId;

        const wasComplete = progress.percentage >= 100;
        const newLesson = !progress.completedLessons.includes(lessonId);
        if (newLesson) {
            progress.completedLessons.push(lessonId);
        }

        // The share of this course's published lessons that are done. Counted
        // against those lessons, so an id saved before the check above (or a
        // lesson since removed) no longer counts toward 100%.
        const lessonIds = new Set(courseLessons.map((l) => String(l._id)));
        const done = new Set(progress.completedLessons.map(String).filter((id) => lessonIds.has(id))).size;
        progress.percentage = lessonIds.size === 0 ? 0 : Math.min(100, Math.round((done / lessonIds.size) * 100));

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
                // An assignment lesson also pays "Complete an assignment" (it
                // was a rule nothing awarded).
                if (lesson.type === 'assignment' || lesson.assignmentId) {
                    const a = await safeRecordActivity({ userId: req.user._id, type: 'assignment_complete', refId: lessonId, courseId });
                    rewards.events.push(...a.events);
                }
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
    getCourseOutline,
    getJobsAccess,
    getBundles,
    getBundleContent,
    getCourseContent,
    updateProgress,
    getAvailableCourses,
    getOrganizationCourses,
    enrollCourse,
    searchContent
};
