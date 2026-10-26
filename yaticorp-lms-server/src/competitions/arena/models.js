/**
 * Quiz Arena: an individual quiz contest every registered student plays at
 * once — three rounds (Live Quiz Battle, Picture Challenge, Current Affairs
 * Clash), the same questions at the same moment for everyone.
 *
 *   ArenaQuestion     the question bank. A question is a draft until an
 *                     admin approves it (for Current Affairs, verifies the
 *                     answer); only approved questions go into a contest.
 *   ArenaCompetition  one contest. Publishing it copies its questions into
 *                     `paper`, so later edits to the bank cannot change it.
 *   ArenaEntry        one student's entry, and their answers. As in Chess, a
 *                     college's coordinator enters its students (pending)
 *                     and the platform admin approves them; only approved
 *                     students play and are ranked.
 *
 * Status: draft → published (registration, then the live quiz, by the clock:
 * see ./timeline.js) → results published; or cancelled. Whether it is live or
 * over is read from the clock, never stored, so no job has to flip it.
 */
const mongoose = require('mongoose');

const ROUNDS = [1, 2, 3];
const ROUND_NAMES = { 1: 'Live Quiz Battle', 2: 'Picture Challenge', 3: 'Current Affairs Clash' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const questionSchema = new mongoose.Schema({
    round: { type: Number, enum: ROUNDS, required: true, index: true },
    category: { type: String, default: '', trim: true, maxlength: 60 },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    prompt: { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 600 },
    options: { type: [String], required: true },
    answer: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, default: '', trim: true, maxlength: 600 },
    // Current Affairs: where the answer was checked (a source, a date).
    source: { type: String, default: '', trim: true, maxlength: 300 },
    // Where the answer can be checked, and for current affairs when it
    // happened and when someone confirmed it (the Generate Question Bank
    // import fills these from its datasets; see ./importer.js).
    sourceUrl: { type: String, default: '', trim: true, maxlength: 600 },
    eventDate: { type: Date, default: null },
    verifiedOn: { type: Date, default: null },
    imageCredit: { type: String, default: '', trim: true, maxlength: 300 },
    // Something an admin must check before approving, and why.
    needsReview: { type: Boolean, default: false, index: true },
    reviewNotes: { type: [String], default: [] },
    // The dataset entry it was imported from: importing again skips it.
    importKey: { type: String, default: null },
    // A hosting college's own question bank (null: the platform's).
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    // An imported question an admin deleted: kept only so importing again
    // does not bring it back. Never listed, chosen or counted.
    deletedAt: { type: Date, default: null, index: true },
    status: { type: String, enum: ['draft', 'approved'], default: 'draft', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    // An approved question's place in its round: the order Publish takes them
    // in. Set on approving (so the newest go last); Shuffle reorders them.
    bankOrder: { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true });

// A question as it was when the contest was published: a copy, not a link.
const paperSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    round: { type: Number, required: true },
    category: { type: String, default: '' },
    difficulty: { type: String, default: 'medium' },
    prompt: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    options: { type: [String], required: true },
    answer: { type: Number, required: true },
    explanation: { type: String, default: '' }
}, { _id: false });

const competitionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    organizedBy: { type: String, default: 'YATICORP', trim: true, maxlength: 140 },
    bannerUrl: { type: String, default: '', trim: true, maxlength: 600 },
    instructions: { type: String, default: '', trim: true, maxlength: 3000 },
    // A college hosting its own contest (null: the platform's), for its own students.
    hostOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    startsAt: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    // Optional: before this, colleges cannot enter students yet.
    registrationOpensAt: { type: Date, default: null },
    // Set when an admin presses Start now; the quiz runs from here instead.
    startedAt: { type: Date, default: null },
    maxParticipants: { type: Number, default: 500, min: 1, max: 100000 },
    // How many students one college may enter.
    playersPerCollege: { type: Number, default: 10, min: 1, max: 500 },
    // Entries not rejected (pending and approved): the seats taken.
    registeredCount: { type: Number, default: 0, min: 0 },
    // Who may register: every college (empty), or only these.
    eligibility: {
        organizationIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        collegeStudentsOnly: { type: Boolean, default: true }
    },
    // Questions in each round, and the ones chosen for it (any not chosen
    // are drawn from the approved bank on publishing).
    counts: {
        1: { type: Number, default: 10, min: 0, max: 50 },
        2: { type: Number, default: 5, min: 0, max: 50 },
        3: { type: Number, default: 10, min: 0, max: 50 }
    },
    selection: {
        1: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        2: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        3: { type: [mongoose.Schema.Types.ObjectId], default: [] }
    },
    secondsPerQuestion: { type: Number, default: 20, min: 5, max: 120 },
    pointsPerQuestion: { type: Number, default: 100, min: 1, max: 1000 },
    // XP and reward points for the top three, and XP for everyone who took
    // part — paid when the results are published, as in the other games.
    prizes: {
        type: [{ _id: false, place: { type: Number, enum: [1, 2, 3] }, title: { type: String, default: '', maxlength: 120 }, xp: { type: Number, default: 0, min: 0 }, rewardPoints: { type: Number, default: 0, min: 0 } }],
        default: [{ place: 1, title: 'Winner', xp: 300, rewardPoints: 100 }, { place: 2, title: 'Runner-up', xp: 200, rewardPoints: 50 }, { place: 3, title: 'Third place', xp: 100, rewardPoints: 25 }]
    },
    participationXp: { type: Number, default: 20, min: 0, max: 10000 },
    // An entry fee, set by the organizer: each approved player pays it from
    // their wallet before they can join (no code, no seat, until paid).
    entryFee: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0, min: 0, max: 100000 }
    },
    certificates: {
        winners: { type: Boolean, default: true },
        participants: { type: Boolean, default: true },
        // Participation certificates only from this score up (0: anyone who took part).
        minScore: { type: Number, default: 0, min: 0 }
    },
    status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft', index: true },
    paper: { type: [paperSchema], default: [] },
    publishedAt: { type: Date, default: null },
    resultsPublishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true, minimize: false });

const answerSchema = new mongoose.Schema({
    q: { type: Number, required: true },          // the question's place in the paper
    choice: { type: Number, required: true },
    correct: { type: Boolean, required: true },
    points: { type: Number, required: true },
    ms: { type: Number, required: true },          // how long after it opened
    at: { type: Date, default: Date.now }
}, { _id: false });

const entrySchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ArenaCompetition', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: '' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    collegeName: { type: String, default: '' },
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    // The student's own joining code, given on approval: the live quiz lets
    // them in only once they have entered it (joinedAt).
    joinCode: { type: String, default: null },
    // The entry fee, when the contest has one: paid from the wallet before joining.
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: null },
    answers: { type: [answerSchema], default: [] },
    // Written when the results are published.
    score: { type: Number, default: null },
    correctCount: { type: Number, default: null },
    timeMs: { type: Number, default: null },
    rank: { type: Number, default: null }
}, { timestamps: true });

entrySchema.index({ competitionId: 1, userId: 1 }, { unique: true });
entrySchema.index({ joinCode: 1 }, { unique: true, partialFilterExpression: { joinCode: { $type: 'string' } } });

questionSchema.index({ importKey: 1 }, { unique: true, partialFilterExpression: { importKey: { $type: 'string' } } });

const ArenaQuestion = mongoose.model('ArenaQuestion', questionSchema, 'arena_questions');
const ArenaCompetition = mongoose.model('ArenaCompetition', competitionSchema, 'arena_competitions');
const ArenaEntry = mongoose.model('ArenaEntry', entrySchema, 'arena_entries');

module.exports = { ArenaQuestion, ArenaCompetition, ArenaEntry, ROUNDS, ROUND_NAMES, DIFFICULTIES };
