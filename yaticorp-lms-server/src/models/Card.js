/**
 * @author Preethesh Kulal
 * @description Mongoose schema for activation cards with QR code, CVV and status lifecycle
 */
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    CardNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    CVV: {
        type: String,
        required: true
    },
    qrCodeNumber: {
        type: String,
        required: true
    },
    SerialNumber: {
        type: String
    },
    /**
     * 'unactivated' and 'activated' both mean free to sign up with: nothing
     * activates a card by hand (the old verify-card step flipped it on the
     * way through), and deleting a student puts their card back to
     * 'unactivated'. Registration accepts either and marks the card 'used';
     * 'inactive' is a card an administrator has withdrawn.
     */
    status: {
        type: String,
        enum: ['unactivated', 'activated', 'used', 'inactive'],
        default: 'unactivated'
    }
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
