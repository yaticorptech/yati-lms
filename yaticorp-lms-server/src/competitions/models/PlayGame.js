/**
 * One online game in progress or played: a competition match's game, a Group
 * Brain room (`kind: 'room'`, asked 2026-10-27: a student makes it, shares its
 * code, and starts it once the others are ready), or a friendly one between
 * students who shared a room code (no longer made: playing with friends was
 * removed on 2026-10-23; older ones are kept as they were).
 *
 * waiting   — seats being filled (a room, until joinDeadline) or players
 *             joining (a match, until joinDeadline)
 * active    — being played; `state` is the engine's (games/<id>.js)
 * finished  — decided; `outcome` holds the engine's places, as seat SIDES
 * abandoned — closed before it started (a room nobody started, or everyone left; a match nobody joined)
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
    // This player's own joining code (asked 2026-10-24): the game lets them
    // take their seat only with it. Null on games opened before then.
    code: { type: String, default: null },
    joinedAt: { type: Date, default: null },
    // A Group Brain room: this player has said they are ready to start.
    ready: { type: Boolean, default: false },
    // A room's presence: when this player's screen last checked in, and
    // whether that was recent enough to count them as here (gameService's presence()).
    lastSeenAt: { type: Date, default: null },
    online: { type: Boolean, default: true }
}, { _id: false });

const playGameSchema = new mongoose.Schema({
    kind: { type: String, enum: ['match', 'room', 'friendly'], required: true },
    game: { type: String, enum: ['chess', 'rapidfire', 'codeclash', 'brainsprint', 'memorymatrix', 'patternmaster', 'numberlogic', 'wordlogic', 'sudoku', 'deduction', 'spatialiq', 'sequence', 'losttreasure', 'finalvault', 'lostkingdom', 'ludo', 'carrom', 'uno', ...require('../games/soloquiz').SOLO_QUIZ, ...require('../games/race').RACE, ...require('../games/turns').TURNS], required: true },
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', default: null, index: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionMatch', default: null, index: true },
    // Rooms: the code other students type to join, and who made it (who starts it).
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
    finishedAt: { type: Date, default: null },
    // A Group Brain room's game: when its results were written (groupbrain/results.js), so they are written once.
    recordedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

playGameSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
playGameSchema.index({ 'seats.userId': 1, status: 1 });
playGameSchema.index({ kind: 1, status: 1, finishedAt: -1 });
playGameSchema.index({ 'seats.code': 1 }, { unique: true, partialFilterExpression: { 'seats.code': { $type: 'string' } } });

module.exports = mongoose.model('PlayGame', playGameSchema, 'competition_games');
