/**
 * @author Preethesh Kulal
 * @description JWT authentication middleware for admin, student and superadmin route protection
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
