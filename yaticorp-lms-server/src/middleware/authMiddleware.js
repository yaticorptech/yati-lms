/**
 * @author Preethesh Kulal
 * @description JWT authentication middleware for admin, student and superadmin route protection.
 *              Organization admins are deliberately refused by protectAdmin; their guard
 *              lives in src/organizations/middleware/authMiddleware.js
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const protectAdmin = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.admin = await Admin.findById(decoded.id).select('-password');

            if (!req.admin) {
                return res.status(401).json({ message: 'Not authorized, admin not found' });
            }
            // Signed in before the password last changed: that session ended
            // with the change (models/Admin.js, passwordChangedAt).
            if (req.admin.tokenPredatesPassword(decoded.iat)) {
                return res.status(401).json({ code: 'PASSWORD_CHANGED', message: 'Your password was changed. Please sign in again.' });
            }

            /**
             * An organization's admin is not a platform administrator.
             *
             * Every /api/admin/* route is guarded by this function alone, so
             * without this check the moment `orgadmin` became a valid role an
             * organization admin's token would have read every student, course
             * and ticket on the platform. Organization administration has its
             * own mount and its own guard — see src/organizations/.
             */
            if (req.admin.role === 'orgadmin') {
                return res.status(403).json({
                    code: 'ORG_ADMIN_SCOPE',
                    message: 'Organization administrators cannot access platform administration'
                });
            }

            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Session expired" });
            }
            console.error(error);
            return res.status(401).json({ message: "Not authorized, token invalid" });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const superAdminOnly = (req, res, next) => {
    if (req.admin && req.admin.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as superadmin' });
    }
};

// What the closed screen itself needs, so it stays reachable outside access hours.
const OPEN_WHEN_CLOSED = ['/api/user/profile', '/api/user/settings', '/api/user/update-password', '/api/organizations/student/'];

const protectUser = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user || req.user.status !== 'active') {
                return res.status(401).json({ message: 'Not authorized or account inactive' });
            }
            // Signed in before the student last changed their password: that
            // session ended with the change (models/User.js, passwordChangedAt).
            if (req.user.tokenPredatesPassword(decoded.iat)) {
                return res.status(401).json({ code: 'PASSWORD_CHANGED', message: 'Your password was changed. Please sign in again.' });
            }
            // An administrator's view-as-student (adminUserController) names
            // the superadmin behind it. Kept on the request so the few things
            // only the student may do (changing their password) can refuse it.
            req.impersonatedBy = decoded.impersonatedBy || null;
            // The student's organization may open the platform only at set
            // hours (organizations/services/accessSchedule.js). Outside them
            // everything but the closed screen's own needs answers 423. An
            // administrator viewing as the student is let through.
            if (!req.impersonatedBy && req.user.organizationId) {
                const path = req.originalUrl.split('?')[0];
                if (!OPEN_WHEN_CLOSED.some((p) => path.startsWith(p))) {
                    const access = await require('../organizations/services/accessSchedule').studentAccess(req.user);
                    if (!access.open) {
                        return res.status(423).json({ code: 'PLATFORM_CLOSED', message: `${access.organization} opens YATICORP for its students ${access.hours}.`, opensAt: access.opensAt, hours: access.hours, organization: access.organization });
                    }
                }
            }
            next();
        } catch (error) {
    console.error(error);

    if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired" }); // ✅ IMPORTANT
    }

    return res.status(401).json({ message: "Not authorized, token invalid" });
}
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protectAdmin, superAdminOnly, protectUser };
