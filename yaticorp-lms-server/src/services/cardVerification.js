/**
 * Card verification: a free card can be registered only once a super admin
 * has verified it (Admin → Verify cards), or when a platform admin adds its
 * holder — which verifies it on the way. Every card not yet registered
 * waits for this, old or new. Registered cards are left alone.
 */
const jwt = require('jsonwebtoken');
const Card = require('../models/Card');

const FREE = ['unactivated', 'activated'];
const NOT_VERIFIED = Object.freeze({ code: 'CARD_NOT_VERIFIED', message: "This card hasn't been verified yet. Contact your administrator to verify it, then try again." });

const isVerified = (card) => Boolean(card && card.verified === true);

/** The fields that mark a card verified, for an update. */
const verifiedFields = (adminId, via) => ({ verified: true, verifiedAt: new Date(), verifiedBy: adminId || null, verifiedVia: via });

/**
 * Whether this request comes from a platform administrator (admin or super
 * admin — not an organization's admin). Used by the public card check, which
 * an admin adding a student or teacher also calls: for them an unverified
 * card is fine, because adding the person verifies it.
 */
const fromPlatformAdmin = async (req) => {
    const header = req.headers?.authorization || '';
    if (!header.startsWith('Bearer ')) return false;
    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        const admin = await require('../models/Admin').findById(decoded.id).select('role').lean();
        return Boolean(admin) && ['admin', 'superadmin'].includes(admin.role);
    } catch {
        return false;
    }
};

module.exports = { FREE, NOT_VERIFIED, isVerified, verifiedFields, fromPlatformAdmin };
