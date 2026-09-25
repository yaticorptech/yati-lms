/**
 * @description A question in the Global Quiz bank.
 *
 * These belong to no course and no lesson. An administrator writes them into
 * a quiz (see GlobalQuiz); the published quiz is what every student is asked,
 * which is what makes the Global Quiz general knowledge rather than a re-run of
 * the quizzes inside their courses.
 */
const mongoose = require('mongoose');

const globalQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true },
    options: {
        type: [String],
        required: true,
        validate: [(v) => v.filter((o) => String(o || '').trim()).length >= 2, 'A question needs at least two answers.']
    },
    correctAnswerIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: '' },
    // Free text so you can group them however you teach: "General Knowledge",
    // "Aptitude", "Current Affairs", "Reasoning".
    category: { type: String, default: 'General', trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    // The quiz this question belongs to. Questions written before quizzes
    // existed have none until globalQuizService moves them into one.
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalQuiz', default: null, index: true },
    // Kept for questions from before quizzes; a quiz's own status now decides
    // what students see.
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

module.exports = mongoose.model('GlobalQuestion', globalQuestionSchema, 'global_quiz_questions');
