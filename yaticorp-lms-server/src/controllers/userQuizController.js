/**
 * @author Preethesh Kulal
 * @description Student quiz retrieval and answer submission with credit rewards
 */
const Quiz = require('../models/Quiz');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const Bundle = require('../models/Bundle');
const Course = require('../models/Course');

// @desc    Get quiz for a specific lesson (Student view - hides correct answers)
// @route   GET /api/user/lessons/:lessonId/quiz
// @access  Private/User
const getQuizForStudent = async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId }).lean();
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found for this lesson' });
        }

        // Security: Remove correctAnswerIndex and explanation before sending to client
        const safeQuestions = quiz.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options
        }));

        res.json({
            _id: quiz._id,
            lessonId: quiz.lessonId,
            passingScore: quiz.passingScore,
            questions: safeQuestions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Submit quiz answers and get score
// @route   POST /api/user/lessons/:lessonId/quiz/submit
// @access  Private/User
const submitQuizAnswers = async (req, res) => {
    try {
        const { answers } = req.body; // Array of selected indices matching question order
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid answers payload' });
        }

        let correctCount = 0;
        const results = quiz.questions.map((q, index) => {
            const isCorrect = answers[index] === q.correctAnswerIndex;
            if (isCorrect) correctCount++;
            return {
                questionId: q._id,
                providedAnswer: answers[index],
                correctAnswer: q.correctAnswerIndex,
                isCorrect,
                explanation: q.explanation
            };
        });

        const scorePercentage = Math.round((correctCount / quiz.questions.length) * 100);
        const passed = scorePercentage >= quiz.passingScore;

        let creditsEarned = 0;
        let totalCredits = 0;
        const rewards = { events: [] };

        try {
            const Setting = require('../models/Setting');
            const settings = await Setting.findOne();
            const isCreditSystemEnabled = settings ? settings.isCreditSystemEnabled : true;

            const User = require('../models/User');
            let user = await User.findById(req.user._id);
            totalCredits = user?.credits || 0;

            const Progress = require('../models/Progress');
            const Lesson = require('../models/Lesson');
            const lesson = await Lesson.findById(quiz.lessonId);

            if (lesson && user) {
                // Lesson has no direct courseId — must resolve via moduleId → Module
                const Module = require('../models/Module');
                const module = await Module.findById(lesson.moduleId, 'courseId').lean();
                const courseId = module?.courseId;

                if (!courseId) {
                    console.error('Could not resolve courseId for lesson', lesson._id);
                } else {
                    let progress = await Progress.findOne({ userId: req.user._id, courseId });
                    if (!progress) {
                        progress = new Progress({ userId: req.user._id, courseId, passedQuizzes: [], attemptedQuizzesForCredit: [] });
                    }

                    // Check First Attempt Logic - if system is enabled
                    if (isCreditSystemEnabled && (!progress.attemptedQuizzesForCredit || !progress.attemptedQuizzesForCredit.includes(quiz._id))) {
                        // Mark as attempted for credit
                        progress.attemptedQuizzesForCredit = progress.attemptedQuizzesForCredit || [];
                        progress.attemptedQuizzesForCredit.push(quiz._id);

                        // Add credits strictly relative to the first score regardless of pass/fail
                        creditsEarned = scorePercentage;
                        user.credits = (user.credits || 0) + creditsEarned;
                        await user.save();
                        totalCredits = user.credits;
                    }

                    // Standard pass logic (independent of credits)
                    if (passed && !progress.passedQuizzes.includes(quiz._id)) {
                        progress.passedQuizzes.push(quiz._id);
                    }

                    await progress.save();

                    // Rewards: completing a quiz pays once, passing it pays once
                    // more; the activity ledger makes retakes free of both.
                    const { safeRecordActivity } = require('../rewards/services/activityService');
                    const done = await safeRecordActivity({ userId: req.user._id, type: 'quiz_complete', refId: quiz._id, courseId, meta: { score: scorePercentage, passed } });
                    rewards.events.push(...done.events);
                    if (passed) {
                        const won = await safeRecordActivity({ userId: req.user._id, type: 'quiz_pass', refId: quiz._id, courseId, meta: { score: scorePercentage } });
                        rewards.events.push(...won.events);
                    }
                }
            }

        } catch (err) {
            console.error('Error awarding credits/progress:', err);
        }

        res.json({
            score: scorePercentage,
            correctCount,
            totalQuestions: quiz.questions.length,
            passed,
            creditsEarned,
            totalCredits,
            rewards,
            results // Send back the correct answers and explanations for review
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/* ── Global quiz ──────────────────────────────────────────────────────────
 *
 * One paper drawn from every quiz across the courses a student can open —
 * revision that crosses course boundaries, which the per-lesson quizzes
 * cannot do.
 *
 * It is practice, and says so: no credits, no course progress, no pass marks,
 * no reward activity. Those all belong to the first attempt of a lesson's own
 * quiz, and paying twice for the same questions would inflate both the
 * credit balance and the "quizzes passed" figure on the progress card.
 */

const MAX_QUESTIONS = 25;
const DEFAULT_QUESTIONS = 10;

/** Every course this student may open: the ones they are enrolled in, plus the published bundles' courses. */
const accessibleCourseIds = async (userId) => {
    const ids = new Set();
    const enrollments = await Enrollment.find({ userId }).lean();
    const bundleIds = [];
    for (const e of enrollments) {
        if (e.type === 'Course' && e.courseId) ids.add(String(e.courseId));
        else if (e.type === 'Bundle' && e.bundleId) bundleIds.push(e.bundleId);
    }
    // Bundles are open to any signed-in student, so their courses count too.
    const bundles = await Bundle.find({ isPublished: true }).select('courses').lean();
    for (const b of bundles) for (const c of b.courses || []) ids.add(String(c));
    if (bundleIds.length) {
        const own = await Bundle.find({ _id: { $in: bundleIds } }).select('courses').lean();
        for (const b of own) for (const c of b.courses || []) ids.add(String(c));
    }
    const published = await Course.find({ _id: { $in: [...ids] }, isPublished: true }).select('_id title').lean();
    return { ids: published.map((c) => String(c._id)), titles: Object.fromEntries(published.map((c) => [String(c._id), c.title])) };
};

/** Every quiz question in those courses, each carrying where it came from. */
const questionPool = async (courseIds, titles) => {
    if (!courseIds.length) return [];
    const modules = await Module.find({ courseId: { $in: courseIds } }).select('_id courseId').lean();
    if (!modules.length) return [];
    const moduleCourse = Object.fromEntries(modules.map((m) => [String(m._id), String(m.courseId)]));
    const lessons = await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) }, isPublished: true }).select('_id moduleId title').lean();
    if (!lessons.length) return [];
    const lessonById = Object.fromEntries(lessons.map((l) => [String(l._id), l]));
    const quizzes = await Quiz.find({ lessonId: { $in: lessons.map((l) => l._id) } }).lean();
    const pool = [];
    for (const quiz of quizzes) {
        const lesson = lessonById[String(quiz.lessonId)];
        const courseId = lesson ? moduleCourse[String(lesson.moduleId)] : null;
        for (const q of quiz.questions || []) {
            pool.push({
                quizId: String(quiz._id), questionId: String(q._id),
                questionText: q.questionText, options: q.options,
                courseId, courseTitle: titles[courseId] || '', lessonTitle: lesson?.title || ''
            });
        }
    }
    return pool;
};

const shuffle = (rows) => {
    const out = [...rows];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};

// @desc    A mixed quiz across everything the student can open
// @route   GET /api/user/quizzes/global?limit=10
// @access  Private/User
const getGlobalQuiz = async (req, res) => {
    try {
        const limit = Math.min(MAX_QUESTIONS, Math.max(3, Number(req.query.limit) || DEFAULT_QUESTIONS));
        const { ids, titles } = await accessibleCourseIds(req.user._id);
        const pool = await questionPool(ids, titles);
        const picked = shuffle(pool).slice(0, limit);
        res.json({
            // The answers stay on the server; the client sends the ids back to be marked.
            questions: picked.map((q) => ({ quizId: q.quizId, questionId: q.questionId, questionText: q.questionText, options: q.options, courseTitle: q.courseTitle, lessonTitle: q.lessonTitle })),
            available: pool.length,
            courses: [...new Set(pool.map((q) => q.courseTitle).filter(Boolean))]
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Mark a global quiz. Practice only: nothing is recorded.
// @route   POST /api/user/quizzes/global/submit
// @access  Private/User
const submitGlobalQuiz = async (req, res) => {
    try {
        const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, MAX_QUESTIONS) : null;
        if (!answers || !answers.length) return res.status(400).json({ message: 'Answer at least one question first.' });

        // Only quizzes from courses this student can open may be marked, so the
        // endpoint cannot be used to read answers to anything else.
        const { ids, titles } = await accessibleCourseIds(req.user._id);
        const allowed = new Set((await questionPool(ids, titles)).map((q) => `${q.quizId}:${q.questionId}`));
        const wanted = answers.filter((a) => allowed.has(`${a.quizId}:${a.questionId}`));
        if (!wanted.length) return res.status(400).json({ message: 'Those questions are not from your courses.' });

        const quizzes = await Quiz.find({ _id: { $in: [...new Set(wanted.map((a) => a.quizId))] } }).lean();
        const byQuiz = Object.fromEntries(quizzes.map((q) => [String(q._id), q]));
        let correctCount = 0;
        const results = wanted.map((a) => {
            const question = (byQuiz[a.quizId]?.questions || []).find((q) => String(q._id) === String(a.questionId));
            const isCorrect = !!question && a.answer === question.correctAnswerIndex;
            if (isCorrect) correctCount++;
            return {
                quizId: a.quizId, questionId: a.questionId, questionText: question?.questionText || '',
                providedAnswer: a.answer ?? null, correctAnswer: question?.correctAnswerIndex ?? null,
                isCorrect, explanation: question?.explanation || ''
            };
        });
        res.json({
            score: Math.round((correctCount / results.length) * 100),
            correctCount, totalQuestions: results.length, results,
            practiceOnly: true
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getQuizForStudent,
    submitQuizAnswers,
    getGlobalQuiz,
    submitGlobalQuiz
};
