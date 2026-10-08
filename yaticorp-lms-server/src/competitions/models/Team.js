/**
 * One college's entry in one competition: the team its coordinator (the
 * college's organization admin) registered, and the students they picked.
 *
 * pending   — registered, waiting for the platform admin
 * approved  — in the draw
 * rejected  — turned down (with a note); the coordinator may correct and resubmit
 * withdrawn — taken back by the coordinator before the deadline
 *
 * One team per college per competition: a unique index says so.
 */
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    collegeName: { type: String, required: true, trim: true },
    coordinator: {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
        name: { type: String, default: '', trim: true, maxlength: 80 },
        email: { type: String, default: '', trim: true },
        phone: { type: String, default: '', trim: true, maxlength: 20 }
    },
    teamName: { type: String, required: true, trim: true, maxlength: 80 },
    players: {
        type: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, default: '' }, _id: false }],
        default: []
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending', index: true },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    reviewedAt: { type: Date, default: null },
    // Where the team finished, once the competition is decided (1, 2, 3).
    place: { type: Number, default: null }
}, { timestamps: true });

teamSchema.index({ competitionId: 1, organizationId: 1 }, { unique: true });
teamSchema.index({ 'players.userId': 1 });

module.exports = mongoose.model('CompetitionTeam', teamSchema, 'competition_teams');
