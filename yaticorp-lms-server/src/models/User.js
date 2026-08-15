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
    resetPasswordExpiry: { type: Date }
}, { timestamps: true });

// Match user entered password to database password (which is plain text Verification_value)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
