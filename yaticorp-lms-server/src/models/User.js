/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student accounts with card number, QR and
 *              optional organization membership
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
        unique: true,
        // Imported records held this as a number; keep every new write as text.
        set: (v) => (v == null ? v : String(v).trim())
    },
    /**
     * Opens the Jobs section for this account without the 25% course progress.
     *
     * Stored on the account rather than in a server's .env so it follows the
     * card to whichever machine it signs in on, and so any server pointed at
     * this database honours it without its own configuration.
     */
    jobsAlwaysOpen: { type: Boolean, default: false },
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

    // ─── Organization membership ─────────────────────────────────────────────
    // The institution this student belongs to, or null for someone who signed
    // up on their own. Null is the default and the overwhelming majority: every
    // account that existed before organizations, and every account created by
    // card registration, admin entry, bulk upload or website sync, reads as
    // unaffiliated and behaves exactly as it did before.
    //
    // It is only ever set by an organization admin approving a join request
    // (src/organizations/), and clearing it removes the membership and nothing
    // else — courses, progress, XP, certificates and Career Path data are the
    // student's own and survive leaving.
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    organizationJoinedAt: {
        type: Date,
        default: null
    },

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
    className: { type: String, default: '', trim: true },

    // ─── Bring your own AI key ───────────────────────────────────────────────
    // A student's own Google Gemini API key, sealed with AES-256-GCM (see
    // utils/userAiKey.js). When present, Career Path, the mock interviewer and
    // the Learning Bio writer call Gemini with it instead of the platform key,
    // and the platform's per-student daily cap no longer applies. Never
    // selected by default, so no API response can carry it by accident.
    geminiApiKey: { type: String, default: '', select: false },
    geminiApiKeyAddedAt: { type: Date, default: null }
}, { timestamps: true });

// ─── Passwords ───────────────────────────────────────────────────────────────
// Student passwords used to be stored as typed (the website sync sends its
// `Verification_value` as the first password). Nothing reads them back — no
// screen shows one, no email repeats a stored one, and every check goes through
// matchPassword — so they are now bcrypt-hashed on every write, and the old
// plain-text ones are upgraded one by one as each student next signs in. No
// bulk migration: an account nobody signs in to keeps working exactly as before.

/** A value that is already a bcrypt hash, and must not be hashed again. */
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const isHashed = (value) => typeof value === 'string' && BCRYPT_HASH.test(value);
const hashPassword = async (plain) => bcrypt.hash(String(plain), await bcrypt.genSalt(10));

// save() and create(): registration, admin entry, bulk upload, website sync,
// profile and password changes all write through here.
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password || isHashed(this.password)) return;
    this.password = await hashPassword(this.password);
});

// insertMany skips save hooks; nothing inserts students that way today, but a
// future import must not quietly bring plain text back.
userSchema.pre('insertMany', async function (docs) {
    const list = Array.isArray(docs) ? docs : [docs];
    for (const doc of list) {
        if (doc && doc.password && !isHashed(doc.password)) doc.password = await hashPassword(doc.password);
    }
});

// Query updates skip save hooks too — the reset-password link sets the new
// password with findOneAndUpdate. Hash a password in any update the same way.
userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany', 'replaceOne'], async function () {
    const update = this.getUpdate();
    if (!update) return;
    for (const holder of [update, update.$set, update.$setOnInsert]) {
        if (holder && typeof holder === 'object' && holder.password && !isHashed(holder.password)) {
            holder.password = await hashPassword(holder.password);
        }
    }
});

/**
 * Check a typed password against the stored one.
 *
 * A bcrypt hash is compared with bcrypt. Anything else is a password from
 * before hashing: compared as before, and on a match replaced by its hash
 * straight away, with a targeted update rather than save() so an older record
 * that would fail today's validation still signs in. If the upgrade fails the
 * sign-in still succeeds and the next one tries again.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (typeof enteredPassword !== 'string' || !enteredPassword || typeof this.password !== 'string') return false;
    if (isHashed(this.password)) return bcrypt.compare(enteredPassword, this.password);

    if (enteredPassword !== this.password) return false;
    try {
        const hashed = await hashPassword(enteredPassword);
        // Only if it is still the same plain text, so a password changed in
        // the meantime is never overwritten with this one.
        await this.constructor.collection.updateOne({ _id: this._id, password: this.password }, { $set: { password: hashed } });
        this.password = hashed;
        this.unmarkModified('password');
    } catch (error) {
        console.error(`[auth] could not upgrade the stored password of student ${this._id}:`, error.message);
    }
    return true;
};

userSchema.statics.isHashedPassword = isHashed;

module.exports = mongoose.model('User', userSchema);
