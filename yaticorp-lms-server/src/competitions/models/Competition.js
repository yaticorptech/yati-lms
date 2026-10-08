/**
 * An inter-college competition, created and run by the platform admin.
 *
 * Its life, in `status`:
 *   draft        — being written; nobody else sees it
 *   registration — open: college admins register a team and pick players
 *   closed       — registration over; the admin approves teams and draws round 1
 *   live         — rounds being played
 *   completed    — the final is decided; winners, certificates and rewards issued
 *   cancelled    — called off; kept, never deleted once anyone has registered
 *
 * A team is one college's entry (models/Team.js). A match puts two or more
 * teams' players at one online game (models/Match.js); its winner goes on to
 * the next round until one team is left.
 */
const mongoose = require('mongoose');

const GAMES = ['chess', 'ludo', 'carrom', 'uno'];
const STATUSES = ['draft', 'registration', 'closed', 'live', 'completed', 'cancelled'];

const prizeSchema = new mongoose.Schema({
    place: { type: Number, enum: [1, 2, 3], required: true },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    xp: { type: Number, default: 0, min: 0, max: 100000 },
    rewardPoints: { type: Number, default: 0, min: 0, max: 100000 },
    description: { type: String, default: '', trim: true, maxlength: 300 }
}, { _id: false });

const competitionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 140 },
    organizedBy: { type: String, default: 'YATICORP', trim: true, maxlength: 140 },
    // The organization hosting it, when one does (an organization admin
    // created it from their panel). Null: the platform runs it. The platform
    // admin can manage every competition either way.
    hostOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    bannerUrl: { type: String, default: '', trim: true, maxlength: 600 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    game: { type: String, enum: GAMES, required: true },

    startsAt: { type: Date, required: true },
    // Registration runs from registrationOpensAt (or from publishing, when
    // unset) to registrationDeadline.
    registrationOpensAt: { type: Date, default: null },
    registrationDeadline: { type: Date, required: true },

    // Who may enter and how a match is made up.
    maxTeams: { type: Number, default: 16, min: 2, max: 256 },
    playersPerTeam: { type: Number, default: 1, min: 1, max: 10 },
    // How many players one team puts at the board in a match: 1, or 2 for
    // carrom doubles. The rest of the team are substitutes.
    playersPerSide: { type: Number, default: 1, min: 1, max: 2 },
    // How many teams share one match: 2 for chess and carrom; 2–4 for ludo and UNO.
    teamsPerMatch: { type: Number, default: 2, min: 2, max: 4 },
    gameOptions: { type: mongoose.Schema.Types.Mixed, default: {} },

    rules: { type: String, default: '', trim: true, maxlength: 5000 },
    prizes: { type: [prizeSchema], default: [] },
    // The prize in words, shown on the card and the page ("Trophy and ₹5,000").
    prizeDetails: { type: String, default: '', trim: true, maxlength: 600 },
    participationXp: { type: Number, default: 0, min: 0, max: 10000 },
    // Certificates for 1st, 2nd and 3rd, and separately for everyone else.
    certificates: { type: Boolean, default: true },
    participationCertificates: { type: Boolean, default: true },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    // Once completed: the teams in 1st, 2nd and 3rd place.
    winners: {
        type: [{ place: Number, teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionTeam' }, _id: false }],
        default: []
    },
    completedAt: { type: Date, default: null },
    awardedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

competitionSchema.statics.GAMES = GAMES;
competitionSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Competition', competitionSchema, 'competitions');
