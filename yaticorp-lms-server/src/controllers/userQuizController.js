/**
 * @author Preethesh Kulal
 * @description Student quiz retrieval and answer submission with credit rewards
 */
const Quiz = require('../models/Quiz');

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
            results // Send back the correct answers and explanations for review
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getQuizForStudent,
    submitQuizAnswers
};
