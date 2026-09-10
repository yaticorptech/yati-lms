const mongoose = require('mongoose');

/**
 * One student's connection to their own Google account.
 *
 * The refresh token is the sensitive part: it is long-lived and it is what
 * lets this server act on the student's behalf. It is never stored in the
 * clear — see ../../jobboard/utils/secretBox.js — and it is never returned to
 * the browser by any endpoint.
 */
const googleLinkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // Which Google account, so the student can see they linked the right one.
    email: { type: String, default: '' },
    // Sealed. Never selected into a response.
    refreshToken: { type: String, default: '', select: false },
    accessToken: { type: String, default: '', select: false },
    accessExpiresAt: { type: Date, default: null },
    scopes: { type: [String], default: [] },
    // The one folder this app created and may write to.
    driveFolderId: { type: String, default: '' },
    connectedAt: { type: Date, default: Date.now },
    // Set when Google rejects our refresh token, so the UI can ask the student
    // to reconnect rather than failing silently for ever.
    needsReconnect: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoogleLink', googleLinkSchema, 'google_links');
