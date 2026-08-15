/**
 * @author Preethesh Kulal
 * @description Password strength validation: min 8 chars, uppercase, lowercase, number, special char
 */
/**
 * Validates password strength.
 * Rules: min 8 chars, uppercase, lowercase, number, special character.
 */
const validatePasswordStrength = (password) => {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must include at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must include at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must include at least one number.';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Password must include at least one special character (e.g. @, #, $, !).';
    }
    return null; // null = valid
};

module.exports = { validatePasswordStrength };
