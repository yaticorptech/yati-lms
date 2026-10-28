/**
 * Group Brain's records (asked 2026-10-27, part 3), in the LMS's MongoDB like
 * everything else. A room's game itself is a PlayGame (../models/PlayGame.js);
 * these are what it leaves behind, and what the dashboards, leaderboards and
 * certificates are worked out from.
 *
 * All of them share ONE collection, `group_brain`, told apart by `type`
 * (Mongoose discriminators): the Atlas cluster this runs on has a limit on
 * collections (500, shared by every database on it) and was already at it,
 * so eight new collections could not be made. Every unique index is limited
 * to its own type (partialFilterExpression), so one kind of record never
 * clashes with another.
 *
 *   GroupBrainResult       one per player per finished room game: score,
 *                          accuracy, place, XP, chess rating change, flags.
 *                          Written once (unique game + player); the only
 *                          thing that changes it later is an admin's
 *                          correction, which the audit log records.
 *   GroupBrainProfile      one per player: their chess rating.
 *   GroupBrainAchievement  one per player per achievement, once.
 *   GroupBrainCertificate  an issued certificate, with its public ID.
 *   GroupBrainSettings     the one settings document the admin edits.
 *   GroupBrainTournament   a window of play for one game (or all); finalised once.
 *   GroupBrainQuestion     an admin's own question for a quiz game.
 *   GroupBrainAudit        every admin change to settings, results and certificates.
 */
const mongoose = require('mongoose');

const { ObjectId, Mixed } = mongoose.Schema.Types;

const resultSchema = new mongoose.Schema({
    gameId: { type: ObjectId, ref: 'PlayGame', required: true },
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: '' },
    game: { type: String, required: true, index: true },
    difficulty: { type: String, default: 'medium' },
    skill: { type: String, enum: ['memory', 'reasoning', 'spatial', 'strategy'], required: true },
    players: { type: Number, required: true },
    place: { type: Number, default: null },
    won: { type: Boolean, default: false },
    draw: { type: Boolean, default: false },
    resigned: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },           // 0..1
    performance: { type: Number, default: 0 },        // 0..100, the Brain Performance Score's input
    timeMs: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    // XP for the game: paid, held for review (flagged), reversed (voided), or none.
    xp: { type: Number, default: 0 },
    xpStatus: { type: String, enum: ['paid', 'held', 'reversed', 'none'], default: 'none' },
    ratingBefore: { type: Number, default: null },
    ratingAfter: { type: Number, default: null },
    flags: { type: [String], default: [] },
    reviewed: { type: Boolean, default: false },
    voided: { type: Boolean, default: false },
    correctedBy: { type: ObjectId, ref: 'Admin', default: null },
    finishedAt: { type: Date, required: true, index: true }
});
resultSchema.index({ gameId: 1, userId: 1 }, { unique: true, partialFilterExpression: { type: 'result' } });
resultSchema.index({ type: 1, voided: 1, finishedAt: -1 });
resultSchema.index({ type: 1, userId: 1, finishedAt: -1 });

const profileSchema = new mongoose.Schema({
    userId: { type: ObjectId, ref: 'User', required: true },
    chessRating: { type: Number, default: 1200 },
    chessGames: { type: Number, default: 0 }
});

profileSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { type: 'profile' } });

const achievementSchema = new mongoose.Schema({
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    xp: { type: Number, default: 0 },
    earnedAt: { type: Date, default: Date.now }
});
achievementSchema.index({ userId: 1, key: 1 }, { unique: true, partialFilterExpression: { type: 'achievement' } });

const certificateSchema = new mongoose.Schema({
    certId: { type: String, required: true },
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    line: { type: String, default: '' },               // "for winning 10 Group Brain games", "1st place"
    eventName: { type: String, default: 'Group Brain' },
    rank: { type: Number, default: null },
    // What earned it: an eligibility rule's key, a tournament place, or 'manual'.
    ruleKey: { type: String, required: true },
    issuedBy: { type: String, enum: ['auto', 'admin'], default: 'auto' },
    issuedByAdmin: { type: ObjectId, ref: 'Admin', default: null },
    status: { type: String, enum: ['valid', 'revoked'], default: 'valid', index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
    reissueOf: { type: String, default: null },        // the certId it replaced
    issuedAt: { type: Date, default: Date.now }
});
// One valid certificate per player per rule: earning it twice cannot issue it twice.
certificateSchema.index({ userId: 1, ruleKey: 1 }, { unique: true, partialFilterExpression: { type: 'certificate', status: 'valid' } });
certificateSchema.index({ certId: 1 }, { unique: true, partialFilterExpression: { type: 'certificate' } });

const settingsSchema = new mongoose.Schema({
    key: { type: String, default: 'main' },
    games: { type: Mixed, default: {} },               // { [gameId]: { enabled, difficulties: [] } }
    xp: { type: Mixed, default: {} },                  // { win, draw, play, perCorrect, max }
    certificateRules: { type: [Mixed], default: [] },
    suspicious: { type: Mixed, default: {} }           // thresholds
});

settingsSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { type: 'settings' } });

const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    game: { type: String, default: null },             // null: every Group Brain game
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    rewards: { type: [Number], default: [100, 60, 30] },   // XP for 1st, 2nd, 3rd
    certificates: { type: Boolean, default: true },
    status: { type: String, enum: ['scheduled', 'finalized', 'cancelled'], default: 'scheduled' },
    standings: { type: [Mixed], default: [] },
    finalizedAt: { type: Date, default: null },
    createdBy: { type: ObjectId, ref: 'Admin', default: null }
});

const questionSchema = new mongoose.Schema({
    game: { type: String, required: true, index: true },
    topic: { type: String, default: '' },
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: Number, required: true },
    explain: { type: String, default: '' },
    active: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: 'Admin', default: null }
});

const auditSchema = new mongoose.Schema({
    adminId: { type: ObjectId, ref: 'Admin', default: null },
    adminName: { type: String, default: '' },
    action: { type: String, required: true },
    target: { type: String, default: '' },
    before: { type: Mixed, default: null },
    after: { type: Mixed, default: null },
    reason: { type: String, default: '' }
});
auditSchema.index({ type: 1, createdAt: -1 });

// The one collection, and a model per type on it.
const Base = mongoose.models.GroupBrainRecord || mongoose.model('GroupBrainRecord', new mongoose.Schema({}, { discriminatorKey: 'type', strict: false, timestamps: true, minimize: false }), 'group_brain');
const model = (name, schema, type) => mongoose.models[name] || Base.discriminator(name, schema, type);

module.exports = {
    GroupBrainResult: model('GroupBrainResult', resultSchema, 'result'),
    GroupBrainProfile: model('GroupBrainProfile', profileSchema, 'profile'),
    GroupBrainAchievement: model('GroupBrainAchievement', achievementSchema, 'achievement'),
    GroupBrainCertificate: model('GroupBrainCertificate', certificateSchema, 'certificate'),
    GroupBrainSettings: model('GroupBrainSettings', settingsSchema, 'settings'),
    GroupBrainTournament: model('GroupBrainTournament', tournamentSchema, 'tournament'),
    GroupBrainQuestion: model('GroupBrainQuestion', questionSchema, 'question'),
    GroupBrainAudit: model('GroupBrainAudit', auditSchema, 'audit')
};
