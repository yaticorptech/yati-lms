/**
 * @author Preethesh Kulal
 * @description Student quiz retrieval and answer submission with credit rewards
 */
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const GlobalQuestion = require('../models/GlobalQuestion');
const Setting = require('../models/Setting');

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
 * A general-knowledge paper drawn from the bank an administrator writes in
 * the admin dashboard. It is deliberately NOT built from the quizzes inside
 * courses: those belong to their lessons, are already scored there, and would
 * make this a re-run of work the student has done rather than something new.
 *
 * It is practice, and says so: no credits, no course progress, no pass marks,
 * no reward activity.
 */

const MAX_QUESTIONS = 25;
const DEFAULT_QUESTIONS = 10;

const shuffle = (rows) => {
    const out = [...rows];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};

const quizConfig = async () => (await Setting.findOne().select('globalQuiz').lean())?.globalQuiz || {};

// @desc    A general-knowledge paper from the global bank
// @route   GET /api/user/quizzes/global?limit=10
// @access  Private/User
const getGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false) return res.status(403).json({ code: 'GLOBAL_QUIZ_OFF', message: 'The global quiz is currently unavailable.' });
        const fallback = Math.min(MAX_QUESTIONS, Math.max(3, Number(config.defaultLength) || DEFAULT_QUESTIONS));
        const limit = Math.min(MAX_QUESTIONS, Math.max(3, Number(req.query.limit) || fallback));

        const pool = await GlobalQuestion.find({ isPublished: { $ne: false } }).select('question options category difficulty').lean();
        const picked = shuffle(pool).slice(0, limit);
        res.json({
            // The answers stay on the server; the client sends the ids back to be marked.
            questions: picked.map((q) => ({ questionId: String(q._id), questionText: q.question, options: q.options, category: q.category || 'General', difficulty: q.difficulty || 'medium' })),
            available: pool.length,
            categories: [...new Set(pool.map((q) => q.category || 'General'))]
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
        const config = await quizConfig();
        if (config.enabled === false) return res.status(403).json({ code: 'GLOBAL_QUIZ_OFF', message: 'The global quiz is currently unavailable.' });
        const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, MAX_QUESTIONS) : null;
        if (!answers || !answers.length) return res.status(400).json({ message: 'Answer at least one question first.' });

        const ids = answers.map((a) => a.questionId).filter((id) => mongoose.isValidObjectId(id));
        const rows = ids.length ? await GlobalQuestion.find({ _id: { $in: ids } }).lean() : [];
        const byId = Object.fromEntries(rows.map((q) => [String(q._id), q]));
        const marked = answers.filter((a) => byId[a.questionId]);
        if (!marked.length) return res.status(400).json({ message: 'Those questions are not in the quiz bank.' });

        let correctCount = 0;
        const results = marked.map((a) => {
            const q = byId[a.questionId];
            const isCorrect = a.answer === q.correctAnswerIndex;
            if (isCorrect) correctCount++;
            return {
                questionId: String(q._id), questionText: q.question,
                providedAnswer: a.answer ?? null, correctAnswer: q.correctAnswerIndex,
                isCorrect, explanation: q.explanation || ''
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
