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
    /**
     * When the student last changed their own password — through the emailed
     * reset link or update-password. A token issued before it is refused by
     * protectUser, so a stolen or forgotten session ends the moment the
     * student changes the password (the same rule as models/Admin.js).
     * Additive: absent on existing accounts, whose tokens keep working until
     * their password next changes. Stamped by those two controllers rather
     * than a save hook: the website sync and admin edits write passwords too,
     * and must not sign the student out on every device as a side effect.
     */
    passwordChangedAt: { type: Date, default: undefined },

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
    geminiApiKeyAddedAt: { type: Date, default: null },

    // The current password, sealed with AES-256-GCM (jobboard/utils/secretBox),
    // so a platform admin can read it back on the student's page
    // (GET /api/admin/users/:id/password). The bcrypt hash in `password` is
    // still what sign-in checks. Written alongside the hash by the hooks
    // below, and at sign-in for a password hashed before this field existed.
    // Never selected by default, so no API response can carry it by accident.
    passwordSealed: { type: String, default: '', select: false }
}, { timestamps: true });

// ─── Passwords ───────────────────────────────────────────────────────────────
// Student passwords used to be stored as typed (the website sync sends its
// `Verification_value` as the first password). Every check goes through
// matchPassword, so they are now bcrypt-hashed on every write, and the old
// plain-text ones are upgraded one by one as each student next signs in. No
// bulk migration: an account nobody signs in to keeps working exactly as before.
//
// Admins can read a student's password back, so each write also keeps a sealed
// copy in `passwordSealed`. A hash cannot be turned back into the password, so
// for an account hashed before that copy existed it is captured the next time
// the student signs in; until then readablePassword() has nothing to show.

const { seal, open } = require('../jobboard/utils/secretBox');

/** A value that is already a bcrypt hash, and must not be hashed again. */
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const isHashed = (value) => typeof value === 'string' && BCRYPT_HASH.test(value);
const hashPassword = async (plain) => bcrypt.hash(String(plain), await bcrypt.genSalt(10));

// save() and create(): registration, admin entry, bulk upload, website sync,
// profile and password changes all write through here.
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password || isHashed(this.password)) return;
    this.passwordSealed = seal(this.password);
    this.password = await hashPassword(this.password);
});

// insertMany skips save hooks; nothing inserts students that way today, but a
// future import must not quietly bring plain text back.
userSchema.pre('insertMany', async function (docs) {
    const list = Array.isArray(docs) ? docs : [docs];
    for (const doc of list) {
        if (doc && doc.password && !isHashed(doc.password)) {
            doc.passwordSealed = seal(doc.password);
            doc.password = await hashPassword(doc.password);
        }
    }
});

// Query updates skip save hooks too — the reset-password link sets the new
// password with findOneAndUpdate. Hash a password in any update the same way.
userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany', 'replaceOne'], async function () {
    const update = this.getUpdate();
    if (!update) return;
    for (const holder of [update, update.$set, update.$setOnInsert]) {
        if (holder && typeof holder === 'object' && holder.password && !isHashed(holder.password)) {
            holder.passwordSealed = seal(holder.password);
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
    if (isHashed(this.password)) {
        if (!(await bcrypt.compare(enteredPassword, this.password))) return false;
        await keepSealedCopy(this, enteredPassword);
        return true;
    }

    if (enteredPassword !== this.password) return false;
    try {
        const hashed = await hashPassword(enteredPassword);
        // Only if it is still the same plain text, so a password changed in
        // the meantime is never overwritten with this one.
        await this.constructor.collection.updateOne(
            { _id: this._id, password: this.password },
            { $set: { password: hashed, passwordSealed: seal(enteredPassword) } }
        );
        this.password = hashed;
        this.unmarkModified('password');
    } catch (error) {
        console.error(`[auth] could not upgrade the stored password of student ${this._id}:`, error.message);
    }
    return true;
};

/**
 * After a sign-in with the right password, make sure the sealed copy holds it:
 * the way an account hashed before `passwordSealed` existed gets one. A read
 * first, so an account whose copy is already right is not written on every
 * sign-in; a write only if the hash is still the one just checked. Never fails
 * the sign-in.
 */
const keepSealedCopy = async (user, plain) => {
    try {
        const stored = await user.constructor.collection.findOne({ _id: user._id }, { projection: { passwordSealed: 1 } });
        if (stored && open(stored.passwordSealed) === plain) return;
        await user.constructor.collection.updateOne(
            { _id: user._id, password: user.password },
            { $set: { passwordSealed: seal(plain) } }
        );
    } catch (error) {
        console.error(`[auth] could not keep the sealed password of student ${user._id}:`, error.message);
    }
};

/**
 * The student's current password as text, or null when it cannot be known.
 *
 * Needs `passwordSealed` selected (`.select('+passwordSealed')`). A password
 * still stored as typed is returned as it is. Otherwise the sealed copy is
 * opened and checked against the hash, so a copy left behind by a change that
 * bypassed the hooks (or sealed under another key) is never shown as current.
 */
userSchema.methods.readablePassword = async function () {
    if (typeof this.password !== 'string' || !this.password) return null;
    if (!isHashed(this.password)) return this.password;
    const plain = open(this.passwordSealed);
    if (!plain) return null;
    return (await bcrypt.compare(plain, this.password)) ? plain : null;
};

userSchema.statics.isHashedPassword = isHashed;

/**
 * Whether a token issued at `iat` (JWT seconds) predates the last password
 * change, as for administrators. One second of slack, because `iat` is
 * truncated to whole seconds: a token signed in the same second as the
 * change, just after it, reads as earlier and must not be refused.
 */
userSchema.methods.tokenPredatesPassword = function (iat) {
    if (!this.passwordChangedAt || typeof iat !== 'number') return false;
    return iat * 1000 < this.passwordChangedAt.getTime() - 1000;
};

module.exports = mongoose.model('User', userSchema);
