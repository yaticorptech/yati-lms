const mongoose = require('mongoose');

/**
 * Reject a malformed :id before it reaches a query.
 *
 * Mongoose throws a CastError when it cannot turn a path segment into an
 * ObjectId, and every controller catches its errors into a blanket 500. So
 * `PUT /api/skills/not-a-real-id` answered "500 Cast to ObjectId failed for
 * value ..." — an internal database message, reported as a server fault, for
 * what is plainly a bad request.
 *
 * Wired in with `router.param('id', ...)`, so it covers every route in a router
 * that takes an :id without each one having to remember.
 */
const validateObjectId = (req, res, next, value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: 'That id is not valid.' });
  }
  next();
};

module.exports = { validateObjectId };
