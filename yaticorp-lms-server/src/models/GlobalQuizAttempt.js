/**
 * @description One student's one attempt at a Global Quiz.
 *
 * A quiz is taken once. The attempt opens when the student presses Start,
 * takes each answer as it is marked (the first answer to a question stands),
 * and closes when they ask for the score or the time runs out. The unique
 * index on student and quiz is the rule itself: a second attempt cannot be
 * created. Publishing a different quiz is a different paper, and a fresh
 * attempt.
 *
 * It records the attempt only — no credits, progress or reward activity come
 * from it, which is what keeps the Global Quiz practice.
 */
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalQuestion', required: true },
    answer: { type: Number, default: null },
    isCorrect: { type: Boolean, default: false }
}, { _id: false });

const globalQuizAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalQuiz', required: true },
    // The paper's question order for this attempt, fixed at Start so a reload
    // brings the same paper back in the same order.
    order: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    answers: { type: [answerSchema], default: [] },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    timedOut: { type: Boolean, default: false },
    // Filled in when the attempt closes.
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
}, { timestamps: true });

globalQuizAttemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });

module.exports = mongoose.model('GlobalQuizAttempt', globalQuizAttemptSchema, 'global_quiz_attempts');
