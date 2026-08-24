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
    }
}, { timestamps: true });

// Match user entered password to database password (which is plain text Verification_value)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
