/**
 * @description Who the current Gemini call is being made for.
 *
 * Every generation in this module funnels through geminiService, but that file
 * has no idea which student it is working for — and threading a userId through
 * `generateRoadmapFromAI`, `generateDailyTasksFromAI`, `generateReadingLesson`
 * and the rest would mean touching a dozen signatures AND remembering to pass
 * it at every nested call site, including the three inside dailyPlanService
 * that no controller calls directly.
 *
 * AsyncLocalStorage carries it request-scoped instead: the router opens a store
 * per request, and anything downstream — however deep, however many awaits
 * later — can read it. Miss a call site and the meter simply records no user
 * rather than billing the wrong one.
 */
const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Express middleware: bind this request to everything it triggers.
 *
 * Stores the REQUEST, not the user id read from it.
 *
 * This middleware necessarily runs before `protect` — it is mounted on the
 * router, and the guards are mounted per route — so at this moment `req.user`
 * does not exist yet. Reading the id here captured null every time, which meant
 * every call was metered against nobody and the per-student cap never fired.
 * Holding the request instead defers the read to the moment a generation
 * actually happens, by which time the guard has long since run.
 */
const withAiContext = (req, res, next) => {
  storage.run({ req, userId: null }, next);
};

/** The student this call belongs to, or null outside a request. */
const currentUserId = () => {
  const store = storage.getStore();
  if (!store) return null;
  if (store.userId) return store.userId;
  const id = store.req?.user?._id;
  return id ? String(id) : null;
};

/**
 * Run something in an explicit context.
 *
 * For work that outlives the request that started it — a cron job, or a plan
 * rebuilt in the background — where there is no request to inherit from.
 */
const runFor = (userId, fn) => storage.run({ req: null, userId: userId ? String(userId) : null }, fn);

module.exports = { withAiContext, currentUserId, runFor };
