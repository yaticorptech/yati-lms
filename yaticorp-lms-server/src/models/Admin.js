/**
 * @author Preethesh Kulal
 * @description Mongoose schema for organization admin accounts with bcrypt password hashing and 2FA support
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
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'admin'
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
