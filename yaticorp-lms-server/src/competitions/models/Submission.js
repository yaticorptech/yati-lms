/**
 * A team's project in a hackathon (services/challengeService.js): what it is,
 * where to see it, who handed it in, and the organizer's marks out of 100 with
 * a note. One per team; its players may change it until the deadline.
 */
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionTeam', required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    summary: { type: String, default: '', trim: true, maxlength: 4000 },
    repoUrl: { type: String, default: '', trim: true, maxlength: 600 },
    demoUrl: { type: String, default: '', trim: true, maxlength: 600 },
    submittedBy: { userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, name: { type: String, default: '' } },
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, default: null, min: 0, max: 100 },
    feedback: { type: String, default: '', trim: true, maxlength: 2000 },
    judgedAt: { type: Date, default: null }
}, { timestamps: true });

submissionSchema.index({ competitionId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('CompetitionSubmission', submissionSchema, 'competition_submissions');
