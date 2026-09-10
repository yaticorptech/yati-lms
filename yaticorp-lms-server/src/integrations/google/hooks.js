/**
 * What the rest of the app needs undone when a student disconnects Google.
 *
 * This folder deliberately knows nothing about Career Path, or about anything
 * else that might come to mirror data into a student's Google account. Those
 * modules register here instead, so that "disconnect" can go on meaning what a
 * student thinks it means without this integration growing a dependency on
 * every feature that uses it.
 *
 * Handlers run best-effort. The grant is already revoked and the link already
 * deleted by the time they run; a module that fails to tidy up after itself
 * must not turn a successful disconnect into an error the student sees.
 */
const handlers = { disconnect: [], calendarReset: [] };

const fire = async (what, userId) => {
  for (const handler of handlers[what]) {
    try {
      await handler(userId);
    } catch (error) {
      console.error(`[google] a ${what} handler failed:`, error.message);
    }
  }
};

/** Register something to run when any student disconnects. */
const onDisconnect = (handler) => {
  handlers.disconnect.push(handler);
};

/**
 * Register something to run when a student's calendar had to be replaced —
 * they deleted ours, or it went away with an account they disconnected.
 *
 * Every id anything holds for an event on that calendar now points at nothing,
 * and whoever stored those ids has to be told, or they will believe their
 * events are safely synced to a calendar that no longer exists.
 */
const onCalendarReset = (handler) => {
  handlers.calendarReset.push(handler);
};

const fireDisconnect = (userId) => fire('disconnect', userId);
const fireCalendarReset = (userId) => fire('calendarReset', userId);

module.exports = { onDisconnect, onCalendarReset, fireDisconnect, fireCalendarReset };
