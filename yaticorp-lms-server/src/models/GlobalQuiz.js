/**
 * @description One Global Quiz: a titled set of general questions an
 * administrator writes, sized by them (5, 10, 20…), kept as a draft until
 * they publish it.
 *
 * Exactly one quiz is published at a time — that is the paper students get.
 * Publishing another moves the previous one back to draft, so the student app
 * never has to choose between quizzes.
 */
const mongoose = require('mongoose');

const SIZE_MIN = 3;
const SIZE_MAX = 50;

const globalQuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    // How many questions the quiz holds. The bank refuses more, and a quiz is
    // published only once it is full.
    size: { type: Number, required: true, min: SIZE_MIN, max: SIZE_MAX, default: 10 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

globalQuizSchema.statics.SIZE_MIN = SIZE_MIN;
globalQuizSchema.statics.SIZE_MAX = SIZE_MAX;

module.exports = mongoose.model('GlobalQuiz', globalQuizSchema, 'global_quizzes');
