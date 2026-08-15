/**
 * @author Preethesh Kulal
 * @description Mongoose schema for lesson quizzes with questions and passing score
 */
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true,
        validate: [v => v.length >= 2, 'A question must have at least 2 options.']
    },
    correctAnswerIndex: {
        type: Number,
        required: true,
        min: 0
    },
    explanation: {
        type: String,
        default: ''
    }
});

const quizSchema = new mongoose.Schema({
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
        unique: true
    },
    passingScore: {
        type: Number,
        required: true,
        default: 80,
        min: 0,
        max: 100
    },
    questions: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
