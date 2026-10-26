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
// all three always agree on which lesson comes next (services/courseAccess.js).
const {
    CONTENT_ORDER, canAccessCourse, canOpenCourse, visibleCoursesFilter, openBundlesFilter, openingBundle,
    dripStart, moduleUnlockAt, lessonAccess
} = require('../services/courseAccess');
const { syncProgress, settleCompletion, refreshProgressRows } = require('../services/courseCompletion');
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
        // Students no longer see bundles (removed from every dashboard,
        // 2026-10-26): a course open to them through any published bundle is
        // listed with their courses instead, so none is out of reach.
        bundles.forEach(b => b.courses?.forEach(c => courseIds.add(c._id.toString())));

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
        // Worked out again against each course's lessons as they are now (an
        // administrator adding or removing a lesson moves the figure), saved
        // back where it moved, and any course that reads complete but was never
        // settled gets its XP and certificate now. Never fails the list.
        let refreshed = { figures: new Map(), events: [] };
        try {
            refreshed = await refreshProgressRows(req.user._id, progressDocs);
        } catch (e) {
            console.error('[getMyCourses] progress refresh failed:', e.message);
        }
        const progressByCourse = new Map(
            progressDocs.map(p => [p.courseId.toString(), Math.min(100, p.percentage || 0)])
        );

        // An organization's own course shows only while the student is still
        // its member. Hidden, not deleted: the enrollment and progress stay,
        // and come back if they rejoin — which is why this is after the orphan
        // clean-up above rather than in the query.
        const coursesWithProgress = courses.filter(course => canAccessCourse(req.user, course)).map(course => {
            const prog = progressDocs.find(p => p.courseId.toString() === course._id.toString());
            const figures = refreshed.figures.get(course._id.toString());
            return {
                ...course.toObject(),
                progress: prog ? Math.min(100, prog.percentage || 0) : 0,
                // Each lesson once, and only lessons still in the course.
                completedLessons: figures ? figures.done : prog ? new Set(prog.completedLessons.map(String)).size : 0
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
            jobsAlwaysOpen: jobsAlwaysOpen(req.user),
            // XP from a course found complete just now, for the rewards toast.
            rewards: { events: refreshed.events }
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
        // rule, 2026-10-09. Every other student keeps the drip. The same rule
        // (dripStart / moduleUnlockAt) guards the lesson's quiz and its progress.
        const startedAt = await dripStart(req.user, courseId);
        const now = new Date();

        const modules = await Module.find({ courseId }).sort(CONTENT_ORDER);
        const modulesWithLessons = await Promise.all(
            modules.map(async (mod) => {
                const modObj = mod.toObject();
                const dripDays = modObj.dripDays || 0;
                const unlockAt = moduleUnlockAt(modObj, startedAt);
                const locked = Boolean(unlockAt) && now < unlockAt;

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

        // The stored percentage, worked out again against the lessons as they
        // are now: an administrator adding a lesson takes a finished course
        // back under 100%, and removing the last one left to do finishes it.
        // A course that reads complete for the first time, or was finished
        // before certificates were issued on completion, is settled here.
        const rewards = { events: [] };
        try {
            const figures = await syncProgress(progress, modulesWithLessons.flatMap((m) => m.lessons.map((l) => l._id)));
            if (figures.complete) {
                const certified = await require('../models/Certificate').exists({ userId: req.user._id, courseId: String(courseId) });
                // Found on opening the course, not just finished by the
                // student: settled without counting today toward the streak.
                if (!figures.wasComplete || !certified) rewards.events.push(...(await settleCompletion({ userId: req.user._id, courseId, repair: true })));
            }
        } catch (e) {
            console.error('[getCourseContent] progress refresh failed:', e.message);
        }

        res.json({
            course,
            modules: modulesWithLessons,
            progress,
            rewards
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

        // The lesson gate the quiz uses too (services/courseAccess.js): a
        // real, published lesson of this course, in a course the student has,
        // not behind a module's drip date, and done already or next in order.
        // Any id used to be taken, in any order, drip or no drip — so lessons
        // could be finished all at once, and a course carried to 100% (and to
        // its XP and certificate) without a lesson being done.
        const access = await lessonAccess(req.user, lessonId, { courseId });
        if (!access.ok) return res.status(access.status).json(access.body);
        const courseLessons = access.lessons;
        const lesson = courseLessons.find((l) => String(l._id) === lessonId) || access.lesson;
        const alreadyDone = (access.progress?.completedLessons || []).map(String).includes(lessonId);

        // A quiz lesson is done by passing its quiz, not by asking. A failed
        // first attempt that earned credits used to complete it, and with it
        // the course and its certificate. A quiz with no questions (or none
        // at all) cannot be passed, so it does not hold the course up: the
        // lesson is completed like any other.
        if (!alreadyDone && lesson.type === 'quiz') {
            const quiz = await Quiz.findOne({ lessonId: lesson._id }).select('_id questions._id').lean();
            const passed = (access.progress?.passedQuizzes || []).map(String).includes(String(quiz?._id));
            if (quiz && (quiz.questions || []).length > 0 && !passed) {
                return res.status(403).json({ code: 'QUIZ_NOT_PASSED', message: 'Pass this lesson\'s quiz to complete it.' });
            }
        }

        const progress = await Progress.findOrCreate(req.user._id, courseId);
        const lessonOid = new (require('mongoose').Types.ObjectId)(lessonId);
        // Added in one step, and only if it is not there yet: two clicks at
        // once used to both find it missing and both push it, so the lesson
        // counted twice. Whichever request adds it is the one that pays.
        const added = await Progress.findOneAndUpdate(
            { _id: progress._id, completedLessons: { $ne: lessonOid } },
            { $push: { completedLessons: lessonOid }, $set: { lastAccessedLesson: lessonOid } },
            { returnDocument: 'after' }
        );
        const newLesson = Boolean(added);
        const current = added || await Progress.findOneAndUpdate(
            { _id: progress._id },
            { $set: { lastAccessedLesson: lessonOid } },
            { returnDocument: 'after' }
        );

        // The share of this course's published lessons that are done, counted
        // against those lessons, so an id saved before the checks above (or a
        // lesson since removed) does not count. Complete means every lesson
        // done — 199 of 200 is not 100%, however it rounds.
        const figures = await syncProgress(current, courseLessons.map((l) => l._id));
        const certificateEarned = figures.complete;

        // Rewards: XP, streak and badges for the lesson; and, the first time
        // the course is complete, its XP and its certificate (with that XP).
        // All exactly-once on the server side (the activity ledger refuses a
        // repeat, a student holds one certificate per course), so a re-sent
        // request or a second tab cannot pay twice. Never fails the update.
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
            if (figures.complete && (newLesson || !figures.wasComplete)) {
                rewards.events.push(...(await settleCompletion({ userId: req.user._id, courseId })));
            }
        } catch (e) { console.error('[rewards] progress hook failed:', e.message); }

        res.json({
            progress: current,
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
        const enrollments = await Enrollment.find({ userId: req.user._id, type: 'Course' }).select('courseId').lean();
        const enrolledCourseIds = new Set(enrollments.filter((e) => e.courseId).map((e) => e.courseId.toString()));

        // Not a course the student already has through a bundle: every
        // published bundle, and any bundle they are enrolled in — the same rule
        // the player opens courses by (canOpenCourse). Only the enrolled
        // bundles used to be left out, so a course free in a published bundle
        // was still offered here at its price, and paid for.
        const openBundles = await Bundle.find(await openBundlesFilter(req.user)).select('courses').lean();
        openBundles.forEach((bundle) => (bundle.courses || []).forEach((cid) => enrolledCourseIds.add(cid.toString())));

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

        // Already the student's through a bundle: nothing to pay for. Refused
        // rather than charged — the Available list no longer offers these, but
        // a list loaded before the bundle was published still can.
        const bundle = await openingBundle(req.user, course._id);
        if (bundle) {
            return res.status(409).json({
                code: 'IN_BUNDLE',
                bundleId: bundle._id,
                message: `This course is already yours in the "${bundle.title}" bundle, so there is nothing to pay. Open it from Bundles.`
            });
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
                        message: `This course costs ${cur} ${price} and your wallet balance is ${cur} ${walletService.money(w?.available || 0)}.`,
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
