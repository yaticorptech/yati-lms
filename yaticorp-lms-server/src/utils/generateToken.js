/**
 * @author Preethesh Kulal
 * @description JWT token generation utility with role and expiry support
 */
const jwt = require('jsonwebtoken');

// `extra` carries a student's device (did) so a removed device's token stops working (services/deviceGuard.js).
const generateToken = (id, role = 'user', extra = {}) => {
    return jwt.sign({ id, role, ...extra }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = generateToken;
