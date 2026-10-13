/**
 * One college's entry in one competition: the team its coordinator (the
 * college's organization admin) registered, and the students they picked.
 *
 * pending   — registered, waiting for the platform admin
 * approved  — in the draw
 * rejected  — turned down (with a note); the coordinator may correct and resubmit
 * withdrawn — taken back by the coordinator before the deadline
 *
 * One team per college per competition: a unique index says so. A college's
 * own competition (Competition.hostOrganizationId) is the exception: it is for
 * that college's students only, and the college makes several teams from them,
 * approved as they are made and told apart by `entry`.
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
        // certificateHiddenAt: the player deleted this competition's certificate
        // from My Profile. It stays theirs — downloading it again from Games &
        // Competitions clears this and puts it back (routes/student.js).
        type: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, default: '' }, certificateHiddenAt: { type: Date, default: null }, _id: false }],
        default: []
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending', index: true },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    reviewedAt: { type: Date, default: null },
    // Where the team finished, once the competition is decided (1, 2, 3).
    place: { type: Number, default: null },
    // 0: a college's one team in an inter-college competition. 1, 2, 3…: the
    // teams a college makes for its own competition.
    entry: { type: Number, default: 0 }
}, { timestamps: true });

teamSchema.index({ competitionId: 1, organizationId: 1, entry: 1 }, { unique: true });
teamSchema.index({ 'players.userId': 1 });

const Team = mongoose.model('CompetitionTeam', teamSchema, 'competition_teams');

/**
 * Until 13 Oct 2026 the unique index was (competition, college) alone, which
 * would stop a college making a second team for its own competition. It is
 * dropped once (from src/competitions/index.js at start-up, and awaited
 * before a college makes a team); a database without it is left as it is.
 * A failure that is not "no such index" is tried again next time.
 */
const OLD_INDEX = 'competitionId_1_organizationId_1';
let dropping = null;
Team.dropOldIndex = () => {
    dropping ||= Team.collection.dropIndex(OLD_INDEX).then(() => true).catch((err) => {
        if (err?.codeName === 'IndexNotFound' || err?.codeName === 'NamespaceNotFound' || err?.code === 27 || err?.code === 26) return false;
        dropping = null;
        return false;
    });
    return dropping;
};

module.exports = Team;
