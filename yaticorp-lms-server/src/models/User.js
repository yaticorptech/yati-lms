/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student accounts with card number, QR and org scoping
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    cardNumber: {
        type: String,
        required: true,
        unique: true
    },
    serialNumber: {
        type: String
    },
    qrNumber: {
        type: String
    },
    courseId: {
        type: String,
        ref: 'Course'
    },
    bundleId: {
        type: String,
        ref: 'Bundle'
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked'],
        default: 'active'
    },
    credits: {
        type: Number,
        default: 0
    },
    profilePicture: {
        type: String,
        default: ''
    },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },

    // ─── Career Path (FuturePath) ────────────────────────────────────────────
    // The AI career-roadmap section keeps its own collections (career_*), but
    // these four belong to the student rather than to a roadmap, and the ported
    // gamification code reads and writes them straight off the account. They
    // are additive with defaults, so existing student documents need no
    // migration — an untouched account simply reads as level 1 with 0 XP.
    xp: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    // Last day the student completed a Career Path task. Drives the streak.
    /**
     * How many times this account has signed in.
     *
     * The "welcome back" panel is for people coming back, not for someone
     * seeing the site for the first time — and nothing recorded that. A count
     * rather than a boolean so "second visit" can be told from "fiftieth" later
     * if the panel ever wants to say something different to a new returner.
     *
     * Accounts that existed before this field was added start at 0 and reach 1
     * on their next sign-in, so they are treated as first-time once. That is a
     * single missed panel, which is preferable to guessing from other data.
     */
    loginCount: {
        type: Number,
        default: 0
    },
    lastActiveDate: {
        type: Date
    },
    // Minutes the student expects to have on a normal day. Used as the starting
    // size for each day's plan, so a working professional is not handed the same
    // three hours of work as a student on holiday. Overridable per day.
    dailyTimeBudget: {
        type: Number,
        default: 60,
        min: 15,
        max: 480
    },

    // ─── Rewards & wallet ────────────────────────────────────────────────────
    // Who this student is, for the purpose of money. School and college
    // accounts earn XP, badges and reward points; whether a type may turn
    // points into cash is decided in the rewards rulebook, and an admin can
    // override one account with walletAccess. Existing accounts default to the
    // most conservative type and need no migration.
    accountType: {
        type: String,
        enum: ['school_student', 'college_student', 'adult', 'professional', 'instructor'],
        default: 'school_student'
    },
    walletAccess: {
        type: String,
        enum: ['default', 'enabled', 'disabled'],
        default: 'default'
    },
    // Free-text cohort labels for the "My institution" / "My class"
    // leaderboards. Students in the same institution and class see each other.
    institution: { type: String, default: '', trim: true },
    className: { type: String, default: '', trim: true }
}, { timestamps: true });

// Match user entered password to database password (which is plain text Verification_value)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
