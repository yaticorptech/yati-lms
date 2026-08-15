/**
 * @author Preethesh Kulal
 * @description JWT token generation utility with role and expiry support
 */
const jwt = require('jsonwebtoken');

const generateToken = (id, role = 'user') => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = generateToken;
