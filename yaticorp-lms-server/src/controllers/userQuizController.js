/**
 * @author Preethesh Kulal
 * @description Student quiz retrieval and answer submission with credit rewards
 */
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const GlobalQuestion = require('../models/GlobalQuestion');
const GlobalQuizAttempt = require('../models/GlobalQuizAttempt');
const { livePaper } = require('../services/globalQuizService');
const Setting = require('../models/Setting');
const { canAccessCourse } = require('../services/courseAccess');

/**
 * Whether the student may use this lesson's quiz: the lesson's course must be
 * one they can open. An organization's own course is its members' alone.
 */
const lessonOpenTo = async (user, lessonId) => {
    if (!mongoose.isValidObjectId(lessonId)) return false;
    const lesson = await require('../models/Lesson').findById(lessonId).select('moduleId').lean();
    if (!lesson) return false;
    const mod = await require('../models/Module').findById(lesson.moduleId).select('courseId').lean();
    if (!mod) return false;
    const course = await require('../models/Course').findById(mod.courseId).select('organizationId').lean();
    return canAccessCourse(user, course);
};

// @desc    Get quiz for a specific lesson (Student view - hides correct answers)
// @route   GET /api/user/lessons/:lessonId/quiz
// @access  Private/User
const getQuizForStudent = async (req, res) => {
    try {
        if (!(await lessonOpenTo(req.user, req.params.lessonId))) return res.status(404).json({ message: 'Quiz not found for this lesson' });
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
        if (!(await lessonOpenTo(req.user, req.params.lessonId))) return res.status(404).json({ message: 'Quiz not found for this lesson' });
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
 * A general-knowledge paper drawn from the bank an administrator writes in
 * the admin dashboard. It is deliberately NOT built from the quizzes inside
 * courses: those belong to their lessons, are already scored there, and would
 * make this a re-run of work the student has done rather than something new.
 *
 * Each student gets ONE attempt at the published quiz (see GlobalQuizAttempt):
 * Start opens it, every marked answer is kept, and asking for the score or
 * running out of time closes it. Nothing else is recorded: no credits, no
 * course progress, no pass marks, no reward activity.
 */

// The largest paper a quiz can be (see GlobalQuiz's size limit).
const MAX_QUESTIONS = 50;
// The clock runs on the student's device; a few seconds' grace covers the
// last answer's trip to the server.
const TIME_GRACE_MS = 5000;

const shuffle = (rows) => {
    const out = [...rows];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};
/** The quiz's questions in the order an attempt fixed; any added since go last. */
const inOrder = (order, rows) => {
    const pos = new Map((order || []).map((id, i) => [String(id), i]));
    return [...rows].sort((a, b) => (pos.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) - (pos.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER));
};
// The answers stay on the server; the client sends the ids back to be marked.
const safeQuestion = (q) => ({ questionId: String(q._id), questionText: q.question, options: q.options, category: q.category || 'General', difficulty: q.difficulty || 'medium' });

const quizConfig = async () => (await Setting.findOne().select('globalQuiz').lean())?.globalQuiz || {};
// The demo cards see every section, the quiz included (services/fullAccess.js).
const { hasFullAccess } = require('../services/fullAccess');
const quizOff = (res) => res.status(403).json({ code: 'GLOBAL_QUIZ_OFF', message: 'The global quiz is currently unavailable.' });

const timeUp = (attempt, quiz) => (quiz.timeLimitMinutes || 0) > 0 && Date.now() - attempt.startedAt.getTime() > quiz.timeLimitMinutes * 60_000 + TIME_GRACE_MS;

/** Close an attempt and score it out of the whole paper. */
const closeAttempt = async (attempt, { timedOut = false, total }) => {
    if (attempt.finishedAt) return attempt;
    attempt.finishedAt = new Date();
    attempt.timedOut = !!timedOut;
    attempt.totalQuestions = total;
    attempt.correctCount = attempt.answers.filter((a) => a.isCorrect).length;
    attempt.score = total ? Math.round((attempt.correctCount / total) * 100) : 0;
    await attempt.save();
    return attempt;
};

/**
 * The attempt as the student app reads it. `byId` holds the quiz's questions,
 * so each answer the student gave comes back with its mark and explanation —
 * what they were already shown when it was marked.
 */
const attemptView = (attempt, byId) => {
    if (!attempt) return null;
    const finished = !!attempt.finishedAt;
    const answers = {};
    for (const a of attempt.answers) {
        const q = byId[String(a.questionId)];
        answers[String(a.questionId)] = {
            questionId: String(a.questionId), questionText: q?.question || '',
            providedAnswer: a.answer, correctAnswer: q ? q.correctAnswerIndex : null,
            isCorrect: a.isCorrect, explanation: q?.explanation || ''
        };
    }
    return {
        status: finished ? 'finished' : 'open',
        startedAt: attempt.startedAt, finishedAt: attempt.finishedAt,
        elapsedMs: Math.max(0, (finished ? attempt.finishedAt : new Date()) - attempt.startedAt),
        timedOut: !!attempt.timedOut, answers,
        correctCount: attempt.correctCount, totalQuestions: attempt.totalQuestions, score: attempt.score
    };
};

/** The published paper, the student's attempt at it (if any), and the questions by id. */
const paperFor = async (user) => {
    const live = await livePaper();
    if (!live) return { live: null, attempt: null, byId: {} };
    const byId = Object.fromEntries(live.questions.map((q) => [String(q._id), q]));
    let attempt = await GlobalQuizAttempt.findOne({ userId: user._id, quizId: live.quiz._id });
    // An open attempt whose time has run out closes now, so a reload cannot stretch the clock.
    if (attempt && !attempt.finishedAt && timeUp(attempt, live.quiz)) attempt = await closeAttempt(attempt, { timedOut: true, total: live.questions.length });
    return { live, attempt, byId };
};

// @desc    The published Global Quiz. The administrator decides the paper —
//          its questions, how many, how long — so every student gets all of
//          it. With an attempt under way or finished, the questions come in
//          that attempt's order and the attempt comes with them. A `limit`
//          sent by an older client is not applied.
// @route   GET /api/user/quizzes/global
// @access  Private/User
const getGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        // No published quiz: an empty paper, which the student app already
        // shows as "No quiz questions yet".
        const { live, attempt, byId } = await paperFor(req.user);
        const pool = live ? live.questions : [];
        const picked = (attempt ? inOrder(attempt.order, pool) : shuffle(pool)).slice(0, MAX_QUESTIONS);
        res.json({
            questions: picked.map(safeQuestion),
            available: pool.length,
            categories: [...new Set(pool.map((q) => q.category || 'General'))],
            quiz: live ? { title: live.quiz.title, description: live.quiz.description, timeLimitMinutes: live.quiz.timeLimitMinutes || 0 } : null,
            attempt: attemptView(attempt, byId)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Open the student's one attempt at the published quiz. Pressing
//          Start again resumes the same attempt; a finished one is refused.
// @route   POST /api/user/quizzes/global/start
// @access  Private/User
const startGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const found = await paperFor(req.user);
        const { live, byId } = found;
        let { attempt } = found;
        if (!live || !live.questions.length) return res.status(404).json({ message: 'No quiz is published right now.' });
        if (attempt?.finishedAt) {
            return res.status(409).json({ code: attempt.timedOut ? 'TIME_UP' : 'ALREADY_ATTEMPTED', message: 'You have already taken this quiz. Each quiz can be taken once.', attempt: attemptView(attempt, byId) });
        }
        let created = false;
        if (!attempt) {
            try {
                attempt = await GlobalQuizAttempt.create({ userId: req.user._id, quizId: live.quiz._id, order: shuffle(live.questions).map((q) => q._id), startedAt: new Date() });
                created = true;
            } catch (err) {
                // Two taps at once: the first one's attempt is the attempt.
                if (err.code !== 11000) throw err;
                attempt = await GlobalQuizAttempt.findOne({ userId: req.user._id, quizId: live.quiz._id });
            }
        }
        res.status(created ? 201 : 200).json({
            attempt: attemptView(attempt, byId),
            questions: inOrder(attempt.order, live.questions).slice(0, MAX_QUESTIONS).map(safeQuestion)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Mark answers. With an attempt open, each answer is kept as part of
//          it, and the first answer to a question is the one that stands.
//          Without one (an older app), the marking is stateless.
// @route   POST /api/user/quizzes/global/submit
// @access  Private/User
const submitGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, MAX_QUESTIONS) : null;
        if (!answers || !answers.length) return res.status(400).json({ message: 'Answer at least one question first.' });

        const ids = answers.map((a) => a.questionId).filter((id) => mongoose.isValidObjectId(id));
        const rows = ids.length ? await GlobalQuestion.find({ _id: { $in: ids } }).lean() : [];
        const byId = Object.fromEntries(rows.map((q) => [String(q._id), q]));
        const marked = answers.filter((a) => byId[a.questionId]);
        if (!marked.length) return res.status(400).json({ message: 'Those questions are not in the quiz bank.' });

        const { live, attempt, byId: liveById } = await paperFor(req.user);
        if (attempt?.finishedAt) {
            return res.status(409).json({ code: attempt.timedOut ? 'TIME_UP' : 'ALREADY_ATTEMPTED', message: attempt.timedOut ? 'Time is up for this quiz.' : 'You have already taken this quiz.', attempt: attemptView(attempt, liveById) });
        }
        const kept = attempt ? Object.fromEntries(attempt.answers.map((a) => [String(a.questionId), a])) : {};

        let correctCount = 0;
        const results = marked.map((a) => {
            const q = byId[a.questionId];
            // An answer already on record is the one that counts, whatever is sent now.
            const given = kept[a.questionId] ? kept[a.questionId].answer : (a.answer ?? null);
            const isCorrect = given === q.correctAnswerIndex;
            if (isCorrect) correctCount++;
            return {
                questionId: String(q._id), questionText: q.question,
                providedAnswer: given, correctAnswer: q.correctAnswerIndex,
                isCorrect, explanation: q.explanation || ''
            };
        });
        if (attempt) {
            for (const r of results) {
                if (!kept[r.questionId] && liveById[r.questionId]) attempt.answers.push({ questionId: r.questionId, answer: r.providedAnswer, isCorrect: r.isCorrect });
            }
            await attempt.save();
        }
        res.json({
            score: Math.round((correctCount / results.length) * 100),
            correctCount, totalQuestions: results.length, results,
            practiceOnly: true,
            attempt: attemptView(attempt, liveById)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Close the attempt: the score is final, and the quiz cannot be
//          taken again. Closing a closed attempt just reports it.
// @route   POST /api/user/quizzes/global/finish
// @access  Private/User
const finishGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const found = await paperFor(req.user);
        const { live, byId } = found;
        let { attempt } = found;
        if (!live || !attempt) return res.status(404).json({ message: 'Start the quiz first.' });
        attempt = await closeAttempt(attempt, { timedOut: !!req.body?.timedOut || timeUp(attempt, live.quiz), total: live.questions.length });
        res.json({ attempt: attemptView(attempt, byId) });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getQuizForStudent,
    submitQuizAnswers,
    getGlobalQuiz,
    startGlobalQuiz,
    submitGlobalQuiz,
    finishGlobalQuiz
};
