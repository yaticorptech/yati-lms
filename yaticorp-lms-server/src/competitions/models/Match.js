/**
 * One match of a competition: two or more teams, one online game (or a
 * rematch after a draw), one team going on.
 *
 * scheduled — drawn and waiting for its time (scheduledAt may be unset: "time
 *             to be announced")
 * live      — a game has been opened; players join and play
 * completed — decided, by the game or by the admin
 * bye       — a team with nobody to play goes straight through
 *
 * `round` counts from 0. `kind` is 'main' for the knockout itself and
 * 'third-place' for the play-off between the two beaten semi-finalists.
 */
const mongoose = require('mongoose');

const sideSchema = new mongoose.Schema({
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionTeam', required: true },
    // The players the coordinator put at the board for this match. Empty
    // means "the team's first players", decided when the game opens.
    lineup: { type: [mongoose.Schema.Types.ObjectId], default: [] }
}, { _id: false });

const matchSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true, index: true },
    round: { type: Number, required: true, min: 0 },
    roundName: { type: String, required: true },
    slot: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['main', 'third-place'], default: 'main' },
    sides: { type: [sideSchema], default: [] },
    scheduledAt: { type: Date, default: null },
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'bye'], default: 'scheduled', index: true },
    // Every game played for this match, latest last (a draw is replayed).
    gameIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    // Team ids in finishing order, ties grouped: [[winner], [runnerUp]].
    places: { type: [[mongoose.Schema.Types.ObjectId]], default: [] },
    winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionTeam', default: null },
    decidedBy: { type: String, enum: ['game', 'admin', 'bye', 'walkover', null], default: null },
    resultNote: { type: String, default: '', trim: true, maxlength: 300 },
    // Three drawn games in a row: the admin decides rather than a fourth replay.
    needsDecision: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

matchSchema.index({ competitionId: 1, round: 1, kind: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('CompetitionMatch', matchSchema, 'competition_matches');
