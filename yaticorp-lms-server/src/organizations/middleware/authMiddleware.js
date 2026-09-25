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
const Admin = require('../../models/Admin');
const Organization = require('../models/Organization');

/**
 * Authenticate an organization administrator and attach their organization.
 *
 * Deliberately refuses platform admins and superadmins too. They read
 * organization data through /api/organizations/admin/*, which is scoped by an
 * explicit id and guarded by superAdminOnly; letting them in here as well would
 * mean two code paths deciding what "my organization" means.
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
