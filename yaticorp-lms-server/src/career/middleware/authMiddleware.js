/**
 * @description Career Path route guard.
 *
 * FuturePath's own `protect` verified a FuturePath token against a FuturePath
 * user. Inside the LMS the student is already signed in, so this maps the name
 * the ported routes use onto the LMS student guard: same JWT, same `req.user`,
 * and the same "inactive accounts are turned away" rule the rest of the student
 * API enforces.
 *
 * There is no admin equivalent — Career Path is a student-only section, and its
 * admin panel was deliberately left out of the port.
 */
const { protectUser } = require('../../middleware/authMiddleware');

module.exports = { protect: protectUser };
