/**
 * One player's go at a competition quiz (services/challengeService.js): when
 * they pressed Start, their answers as they gave them, and — once handed in,
 * or once their time ran out — the score. One per player per competition.
 */
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionTeam', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    // Their own last moment: Start plus the time limit, never past the quiz's close.
    endsAt: { type: Date, required: true },
    // Question id → the place of the choice picked.
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    // From Start to handing in (or to the time running out), for breaking ties.
    timeMs: { type: Number, default: 0 }
}, { timestamps: true, minimize: false });

attemptSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CompetitionQuizAttempt', attemptSchema, 'competition_quiz_attempts');
