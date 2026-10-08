/**
 * One online game in progress or played: a competition match's game, or a
 * friendly one between students who share a room code.
 *
 * waiting   — seats being filled (a friendly room) or players joining (a match,
 *             until joinDeadline)
 * active    — being played; `state` is the engine's (games/<id>.js)
 * finished  — decided; `outcome` holds the engine's places, as seat SIDES
 * abandoned — closed before it started (a room nobody started, a match nobody joined)
 *
 * `version` goes up by one on every change. Writes are conditional on it
 * (optimistic concurrency): two players acting at the same instant cannot both
 * win, and a poll can say "nothing new" with one number.
 */
const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' },
    side: { type: Number, required: true, min: 0 },
    joinedAt: { type: Date, default: null }
}, { _id: false });

const playGameSchema = new mongoose.Schema({
    kind: { type: String, enum: ['match', 'friendly'], required: true },
    game: { type: String, enum: ['chess', 'ludo', 'carrom', 'uno'], required: true },
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', default: null, index: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionMatch', default: null, index: true },
    // Friendly rooms: the code other students type to join, and who made it.
    code: { type: String, default: null },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Competition games: which team each side is (index = side number).
    sideTeams: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    // Teams whose players never joined: they did not play, and place last.
    absentTeams: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    seats: { type: [seatSchema], default: [] },
    status: { type: String, enum: ['waiting', 'active', 'finished', 'abandoned'], default: 'waiting', index: true },
    joinDeadline: { type: Date, default: null },
    options: { type: mongoose.Schema.Types.Mixed, default: {} },
    state: { type: mongoose.Schema.Types.Mixed, default: null },
    version: { type: Number, default: 0 },
    // When the engine next has a timeout to apply; the sweeper reads this.
    nextDeadline: { type: Date, default: null, index: true },
    outcome: { type: mongoose.Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

playGameSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
playGameSchema.index({ 'seats.userId': 1, status: 1 });

module.exports = mongoose.model('PlayGame', playGameSchema, 'competition_games');
