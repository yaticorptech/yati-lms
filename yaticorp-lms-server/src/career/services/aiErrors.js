/**
 * @description Turning a thrown error into the body a controller sends back.
 *
 * Career Path controllers all ended their catch blocks the same way — a 500
 * carrying `error.message`. That was fine while every failure really was a
 * fault, but a spent AI allowance is not a fault: the server is healthy, the
 * day's budget is not, and the student needs to be told when it comes back
 * rather than shown "Server Error".
 *
 * So the body grows two fields when — and only when — the error is a budget
 * one. Everything else keeps exactly the shape the client already handles.
 */
const { AiBudgetError } = require('./aiQuota');

/**
 * @param {Error} error
 * @param {string} [fallback] used when the error carries no message of its own
 * @returns {{message: string, code?: string, resetsAt?: Date}}
 */
const errorBody = (error, fallback) => {
  if (error instanceof AiBudgetError) {
    return {
      message: error.message,
      // Lets the client tell "you have used your own allowance" apart from
      // "the whole service is out for today" — the first is the student's to
      // fix by waiting, the second is the operator's.
      code: error.code,
      resetsAt: error.resetsAt
    };
  }
  // A duplicate-key error is a database implementation detail. Left alone it
  // reached the student as
  //   "E11000 duplicate key error collection: yati_lms_test.career_milestone_badges
  //    index: userId_1_phaseIndex_1 dup key: { userId: ObjectId('…') }"
  // — the database name, the collection, the index definition and a raw id, in
  // a 500, on a page where the honest answer is "you already have this one".
  if (error?.code === 11000) {
    return { message: fallback || 'That already exists.' };
  }

  return { message: error.message || fallback };
};

/**
 * The HTTP status a thrown error deserves.
 *
 * Controllers all ended their catch blocks with `error.status || 500`, and a
 * Mongoose ValidationError carries no `status` — so a student who typed 500
 * into a progress field, or sent a value outside an enum, was told "Server
 * Error". The input was correctly refused; only the reporting was wrong, which
 * is the worst version of it: nothing looks broken in the data, and the logs
 * fill with 500s that are nobody's fault.
 *
 * CastError is the same story one level down — an id that is not an ObjectId is
 * a bad request, not a fault.
 *
 * @param {Error} error
 * @returns {number}
 */
const statusFor = (error) => {
  if (error?.status) return error.status;
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return 400;
  // Writing something that already exists is the caller asking for a state the
  // data will not hold — a conflict, not a fault in the server.
  if (error?.code === 11000) return 409;
  return 500;
};

module.exports = { errorBody, statusFor };
