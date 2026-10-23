/**
 * @description A one-time code for a superadmin's "view as student".
 *
 * The admin panel used to open the student app with the student's whole
 * sign-in (a two-hour token) in the URL fragment, and the student app saved
 * whatever token arrived that way. So any link of that shape signed a browser
 * in — a classic login CSRF: someone could be sent a link that quietly put
 * them into an account of the sender's choosing.
 *
 * Now the panel asks for one of these instead. It is useless on its own: it
 * lasts two minutes, works once, and only the student app's exchange
 * (POST /api/auth/admin-access/exchange) turns it into a session. Only the
 * code's SHA-256 is kept, so a copy of the collection hands nobody a working
 * link. Spent and expired codes are swept by MongoDB an hour after expiry.
 */
const mongoose = require('mongoose');

const adminAccessCodeSchema = new mongoose.Schema({
    codeHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    // Shown on the student app's "an administrator is viewing" banner.
    adminName: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null }
}, { timestamps: true });

adminAccessCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('AdminAccessCode', adminAccessCodeSchema, 'admin_access_codes');
