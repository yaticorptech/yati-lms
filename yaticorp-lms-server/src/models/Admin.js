/**
 * @author Preethesh Kulal
 * @description Mongoose schema for admin accounts (platform and per-organization)
 *              with bcrypt password hashing and 2FA support
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    /**
     * The sign-in. Stored trimmed and lower-case, the way organization
     * registration always wrote it, so "Info@School.edu" and "info@school.edu"
     * are one account and can never become two. Safe to enforce: a read-only
     * check on 2026-10-07 found every stored admin email already lower-case
     * and no case-insensitive duplicates (scripts/reportOrgEmailMismatch.js
     * reports any that appear later).
     */
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    /**
     * superadmin — the whole platform, including organization approval
     * admin      — the whole platform's content and students
     * orgadmin   — one organization only, and nothing else; see
     *              src/organizations/. An orgadmin token is deliberately
     *              refused by protectAdmin, so /api/admin/* stays closed to it.
     */
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'orgadmin'],
        default: 'admin'
    },
    /**
     * The organization an `orgadmin` speaks for. Null for platform admins.
     *
     * This — never a value from the request — is what organization queries are
     * scoped by, so an organization admin cannot reach another organization's
     * students by editing a URL or a payload.
     */
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false
    },
    /**
     * Forgotten-password link (organization admins). Only the SHA-256 of the
     * emailed token is kept, so someone reading the database cannot use a
     * pending link; the token is cleared the moment it is used. Additive —
     * absent on every existing account.
     */
    resetPasswordTokenHash: { type: String, default: undefined, select: false },
    resetPasswordExpiry: { type: Date, default: undefined, select: false },
    /**
     * When the password last changed. A token issued before it is refused by
     * protectAdmin and protectOrgAdmin, so changing or resetting a password
     * ends every other session — a stolen token stops working the moment the
     * owner changes it. Additive: absent on existing accounts, whose tokens
     * keep working until their password next changes.
     */
    passwordChangedAt: { type: Date, default: undefined }
}, { timestamps: true });

// Email is unique across the single organization
adminSchema.index({ email: 1 }, { unique: true });

// Hash password before saving
// Every password write in the codebase goes through save() — own change,
// emailed reset, superadmin edit, scripts/resetAdminPassword.js — so this is
// the one place passwordChangedAt is stamped. Not on creation: a new account
// has no older sessions to end.
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) this.passwordChangedAt = new Date();
});

/**
 * Whether a token issued at `iat` (JWT seconds) predates the last password
 * change. One second of slack, because `iat` is truncated to whole seconds: a
 * token signed in the same second as the change, just after it, reads as
 * earlier and must not be refused.
 */
adminSchema.methods.tokenPredatesPassword = function (iat) {
    if (!this.passwordChangedAt || typeof iat !== 'number') return false;
    return iat * 1000 < this.passwordChangedAt.getTime() - 1000;
};

/** How an email is compared everywhere it is a sign-in: trimmed, lower-case. */
adminSchema.statics.normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/**
 * The account signing in with this email, whatever case it was typed in.
 *
 * The exact lower-case match is the normal path (stored emails are lower-case).
 * The case-insensitive retry only exists for a row written before the schema
 * lower-cased emails, so such an account is never locked out; it runs only on
 * a miss, over a collection of a handful of documents.
 */
adminSchema.statics.findByLoginEmail = async function (value) {
    const email = this.normalizeEmail(value);
    if (!email) return null;
    const exact = await this.findOne({ email });
    if (exact) return exact;
    return this.findOne({ email }).collation({ locale: 'en', strength: 2 });
};

// Match user entered password to hashed password in database
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
