/**
 * "This student's wallet just changed", for the open pages of that student.
 *
 * The Wallet model announces every update (see models/Wallet.js); the
 * student's open pages hear it on the app's live stream (src/live, topic
 * 'wallet') and re-read the balance. A change inside a database transaction is
 * announced a moment later, so the browser reads it after the commit, and
 * several updates of one payment arrive as one.
 *
 * In-process: with more than one server instance, a change made on one
 * reaches only the streams open on that one. The page still refreshes the
 * balance when the student comes back to the tab.
 */
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0);
const pending = new Map();
const SETTLE_MS = 600;

const walletChanged = (userId) => {
  if (!userId) return;
  const key = String(userId);
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => { pending.delete(key); bus.emit(key); }, SETTLE_MS));
};

/** Calls `fn` whenever that student's wallet changes; returns the unsubscribe. */
const onWalletChange = (userId, fn) => {
  const key = String(userId);
  bus.on(key, fn);
  return () => bus.off(key, fn);
};

module.exports = { walletChanged, onWalletChange };
