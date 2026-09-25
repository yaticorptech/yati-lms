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
    email: {
        type: String,
        required: true
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
    }
}, { timestamps: true });

// Email is unique across the single organization
adminSchema.index({ email: 1 }, { unique: true });

// Hash password before saving
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
