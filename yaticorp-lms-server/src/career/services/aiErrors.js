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
  return { message: error.message || fallback };
};

module.exports = { errorBody };
