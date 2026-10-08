/**
 * @description Changing an organization's email — which is also the sign-in of
 *              its administrator account.
 *
 * Registration writes the same address to the Organization and to its orgadmin
 * Admin document, and the settings page tells the organization "This is also
 * your sign-in." Editing only the Organization left the login on the old
 * address, unchecked against other accounts. Both are now checked and written
 * together, by the organization's own settings page and by a superadmin alike.
 */
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Admin = require('../../models/Admin');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The same test the rewards wallet uses to fall back on a standalone server. */
const transactionsUnsupported = (err) => {
    const m = String((err && err.message) || '');
    return err && (err.code === 20 || err.codeName === 'IllegalOperation' || /Transaction numbers are only allowed|replica set|does not support transactions/i.test(m));
};

/**
 * The orgadmin account that signs in for this organization.
 *
 * There is one per organization through every supported path. Should a
 * hand-made second one exist, the one on the organization's current address is
 * the sign-in being renamed; anything more ambiguous is left alone rather than
 * guessed at.
 */
const linkedAdmin = async (organization) => {
    const admins = await Admin.find({ role: 'orgadmin', organizationId: organization._id });
    return admins.find((a) => a.email === organization.email) || (admins.length === 1 ? admins[0] : null);
};

/**
 * Check a requested email change without writing anything.
 *
 * Resolves to { error, status } when it must be refused, { unchanged: true }
 * when there is nothing to do, or { email, admin } to pass to applyEmailChange.
 */
const checkEmailChange = async (organization, raw) => {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.', status: 400 };

    const admin = await linkedAdmin(organization);
    if (email === organization.email && (!admin || admin.email === email)) return { unchanged: true };

    const otherOrg = await Organization.findOne({ email, _id: { $ne: organization._id } }).select('_id').lean();
    if (otherOrg) return { error: 'Another organization already uses that email address.', status: 400 };

    // Any admin account at all — platform or another organization's — already
    // signs in with it. Case-insensitive, like the login itself.
    const holder = await Admin.findByLoginEmail(email);
    if (holder && (!admin || String(holder._id) !== String(admin._id))) {
        return { error: 'That email address is already in use on this platform.', status: 400 };
    }
    return { email, admin };
};

/**
 * Write the new email to the organization (with whatever else was edited on
 * it) and to its sign-in, so neither changes without the other.
 *
 * In a transaction where the deployment has them (Atlas does). On a standalone
 * server the sign-in is changed first and put back if the organization cannot
 * be saved, so a failure never leaves the two on different addresses.
 */
const applyEmailChange = async (organization, { email, admin }) => {
    const previousAdminEmail = admin ? admin.email : null;
    organization.email = email;

    try {
        await mongoose.connection.transaction(async (session) => {
            if (admin) await Admin.updateOne({ _id: admin._id }, { $set: { email } }, { session, runValidators: true });
            await organization.save({ session });
        });
        return;
    } catch (error) {
        if (!transactionsUnsupported(error)) throw error;
    }

    if (admin) await Admin.updateOne({ _id: admin._id }, { $set: { email } }, { runValidators: true });
    try {
        await organization.save();
    } catch (error) {
        if (admin) {
            await Admin.updateOne({ _id: admin._id }, { $set: { email: previousAdminEmail } }).catch((undoError) => {
                console.error(`[organizations] could not restore the sign-in email of admin ${admin._id} after a failed update:`, undoError.message);
            });
        }
        throw error;
    }
};

module.exports = { checkEmailChange, applyEmailChange, EMAIL_PATTERN };
