/**
 * Run `fn(session)` inside a MongoDB transaction when the deployment supports
 * one (Atlas and any replica set), and plainly when it does not (a bare
 * standalone in development). Callers pass the session into every model call.
 */
const mongoose = require('mongoose');

const unsupported = (err) => {
  const m = String(err && err.message || '');
  return err && (err.code === 20 || err.codeName === 'IllegalOperation' || /Transaction numbers are only allowed|replica set|does not support transactions/i.test(m));
};

let transactionsWork = null; // unknown until the first attempt

const runInTransaction = async (fn) => {
  if (transactionsWork === false) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await fn(session); });
    transactionsWork = true;
    return result;
  } catch (err) {
    if (transactionsWork === null && unsupported(err)) {
      transactionsWork = false;
      console.warn('[rewards] MongoDB transactions unavailable on this deployment; wallet writes fall back to ordered single-document updates.');
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

const isDuplicate = (err) => err && (err.code === 11000 || /E11000/.test(String(err.message)));

module.exports = { runInTransaction, isDuplicate };
