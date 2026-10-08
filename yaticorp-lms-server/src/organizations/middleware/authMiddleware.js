/**
 * @description The guard in front of everything an organization administrator
 *              can reach.
 *
 * The one rule this file exists to enforce: the organization whose data a
 * request may touch is read from the authenticated account, never from the URL,
 * the query string or the body. `req.organization` is set here and controllers
 * use only that, so there is no path by which editing a request can widen what
 * it returns.
 *
 * It reuses the platform's JWT and the ordinary `Admin` collection — an
 * organization admin is an Admin document with role `orgadmin` — so there is no
 * second set of credentials, no second login endpoint and no second token
 * format to keep in step.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../../models/Admin');
const Organization = require('../models/Organization');
const OrgAuditLog = require('../models/OrgAuditLog');

/** The header a superadmin sends to look at one organization's own panel. */
const VIEW_HEADER = 'x-view-organization';

/**
 * Authenticate an organization administrator and attach their organization.
 *
 * Platform admins are refused. A superadmin is let in to work in an
 * organization's panel exactly as that organization does, without its
 * password. They name the organization in the X-View-Organization header —
 * the only case where the organization comes from the request, and only for
 * an account that can already read and edit every organization through
 * /api/organizations/admin/*. They may change what the organization could
 * change itself, with one exception: the sign-in password. `req.admin` is the
 * superadmin's own account, so /me/password would change theirs, not the
 * organization's — that one route is refused.
 */
const protectOrgAdmin = async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            return res.status(401).json({ message: 'Not authorized, admin not found' });
        }
        // Signed in before the password last changed: that session ended with
        // the change (models/Admin.js, passwordChangedAt).
        if (admin.tokenPredatesPassword(decoded.iat)) {
            return res.status(401).json({ code: 'PASSWORD_CHANGED', message: 'Your password was changed. Please sign in again.' });
        }
        if (admin.role === 'superadmin' && req.headers[VIEW_HEADER]) {
            const viewed = String(req.headers[VIEW_HEADER]);
            if (!mongoose.isValidObjectId(viewed)) return res.status(404).json({ message: 'Organization not found' });
            const organization = await Organization.findById(viewed);
            if (!organization) return res.status(404).json({ message: 'Organization not found' });
            // Express matches routes case-insensitively and ignores a trailing
            // slash, so the path is compared the same way — '/PASSWORD/' must
            // not slip past. changeMyPassword refuses a viewing superadmin too.
            if (req.method === 'PUT' && req.path.replace(/\/+$/, '').toLowerCase() === '/password') {
                return res.status(403).json({
                    code: 'NOT_YOUR_PASSWORD',
                    message: `Only ${organization.name} can change its own sign-in password.`
                });
            }
            req.admin = admin;
            req.organization = organization;
            req.viewingAsSuperAdmin = true;
            // Every change a superadmin makes while working as the
            // organization is recorded against it, once the response is
            // known — the organization would otherwise see edits nobody there
            // made, with no trace of who did.
            if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
                res.on('finish', () => {
                    OrgAuditLog.record({
                        orgId: organization._id,
                        admin,
                        action: 'view-mode-write',
                        req,
                        details: { status: res.statusCode }
                    });
                });
            }
            return next();
        }
        if (admin.role !== 'orgadmin') {
            return res.status(403).json({ message: 'Not authorized as an organization administrator' });
        }
        // An orgadmin with no organization cannot exist through any supported
        // path, but a hand-edited document would read every student if this
        // fell through to an unfiltered query.
        if (!admin.organizationId) {
            return res.status(403).json({ message: 'This account is not linked to an organization' });
        }

        const organization = await Organization.findById(admin.organizationId);
        if (!organization) {
            return res.status(404).json({ message: 'The linked organization no longer exists' });
        }

        req.admin = admin;
        req.organization = organization;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired' });
        }
        console.error('[organizations] org admin auth failed:', error.message);
        return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
};

/**
 * Only an approved organization may be administered.
 *
 * A pending, rejected, suspended or inactive organization gets 403 with a code
 * and its own status, which the admin app turns into a screen explaining where
 * the application stands. 403 rather than 401, because the credentials are
 * genuine — it is the organization that is not open.
 *
 * Mounted after protectOrgAdmin and in front of every organization route, so
 * suspending an organization closes the API and not merely the navigation.
 */
const requireActiveOrganization = (req, res, next) => {
    const organization = req.organization;

    if (organization && organization.status === 'active') {
        return next();
    }

    const messages = {
        pending: 'Your organization registration is still being reviewed.',
        rejected: 'Your organization registration was not approved.',
        suspended: 'Your organization has been suspended. Please contact the platform administrator.',
        inactive: 'Your organization is no longer active. Please contact the platform administrator.'
    };

    return res.status(403).json({
        code: 'ORGANIZATION_NOT_ACTIVE',
        status: organization?.status || 'unknown',
        reason: organization?.statusReason || '',
        message: messages[organization?.status] || 'Your organization does not currently have access.'
    });
};

module.exports = { protectOrgAdmin, requireActiveOrganization };
