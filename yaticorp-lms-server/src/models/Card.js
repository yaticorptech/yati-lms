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
    },
    /**
     * A super admin's say-so that the card may be registered (Admin → Verify
     * cards). A free card that is not verified cannot open an account, except
     * when a platform admin adds the student or teacher, which verifies it.
     * Every card not yet registered waits for this — including cards that
     * were in the system before verification began (the user's rule,
     * 2026-10-23). Registered ('used') cards are never touched.
     */
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    // 'admin' (Verify cards, or added there), 'account' (verified by an admin
    // adding its holder).
    verifiedVia: { type: String, enum: ['admin', 'account', null], default: null }
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
