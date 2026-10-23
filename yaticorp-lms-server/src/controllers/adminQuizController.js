/**
 * @author Preethesh Kulal
 * @description Admin CRUD for lesson quizzes and questions
 */
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');

// @desc    Get quiz for a specific lesson
// @route   GET /api/admin/lessons/:lessonId/quiz
// @access  Private/Admin
const getQuizByLesson = async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
        if (!quiz) {
            return res.status(200).json(null); // Return null if no quiz exists yet
        }
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create or update full quiz for a lesson
// @route   POST /api/admin/lessons/:lessonId/quiz
// @access  Private/Admin
const saveQuiz = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { questions, passingScore } = req.body;

        // Verify lesson exists and is of type quiz
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        let quiz = await Quiz.findOne({ lessonId });

        // A quiz needs at least one question. An empty one could not be
        // passed, and a student's course stopped at it: the lesson is done by
        // passing its quiz. (The player now lets an empty quiz's lesson be
        // marked done, for any saved before this check.)
        const next = Array.isArray(questions) ? questions : quiz?.questions || [];
        if (next.length === 0) {
            return res.status(400).json({ code: 'QUIZ_EMPTY', message: 'Add at least one question before saving the quiz.' });
        }

        if (quiz) {
            // Update existing quiz
            quiz.questions = questions || quiz.questions;
            if (passingScore !== undefined) quiz.passingScore = passingScore;
            await quiz.save();
        } else {
            // Create new quiz
            quiz = new Quiz({
                lessonId,
                passingScore: passingScore || 80,
                questions: questions || []
            });
            await quiz.save();

            // Link quiz back to lesson
            lesson.quizId = quiz._id.toString();
            await lesson.save();
        }

        res.json({ message: 'Quiz saved successfully', quiz });
    } catch (error) {
        // A question missing its text, options or answer is the form's
        // mistake, not the server's: said as one (a 400 the panel can show).
        if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors || {})[0]?.message || 'A question is incomplete.' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getQuizByLesson,
    saveQuiz
};
