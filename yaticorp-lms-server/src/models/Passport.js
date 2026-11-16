/**
 * An AI Passport book, by the QR sticker on its last page.
 *
 * Codes are loaded by a super admin (Admin → AI Passports). The first scan
 * links the book to one student card for good: that verifies the card (no
 * one has to verify it by hand in Admin → Verify cards), and once the card's
 * account exists it pays the one-off wallet reward (services/passport.js).
 * A linked book is never moved to another card.
 */
const mongoose = require('mongoose');

const passportSchema = new mongoose.Schema({
    // The ID printed under the QR, stored upper-case without spaces.
    code: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['free', 'linked', 'inactive'], default: 'free', index: true },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null, index: true },
    cardNumber: { type: String, default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    linkedAt: { type: Date, default: null },
    // 'signup' (scanned while registering), 'app' (from the wallet) or 'scan'
    // (the QR link: passport then card, no sign-in).
    linkedVia: { type: String, enum: ['signup', 'app', 'scan', null], default: null },
    rewardAmount: { type: Number, default: 0 },
    rewardedAt: { type: Date, default: null },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    batch: { type: String, default: '', index: true },
    // What the sticker's QR holds, fixed when it was generated (a link to
    // <student app>/passport/<code>), so a re-download prints the same QR.
    qrText: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Passport', passportSchema);
