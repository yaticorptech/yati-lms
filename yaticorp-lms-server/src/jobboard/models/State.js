const mongoose = require("mongoose");

/**
 * Run bookkeeping, one document per key: when did <key> last happen.
 *
 * Holds the timestamps behind every cooldown in this module — the daily alert
 * run, the scheduled ingest, the per-country lazy refresh, the per-city
 * fetches. In the database rather than in memory for the same reason twice
 * over: a redeploy must not forget that today's run already happened, and two
 * server instances must not both decide they are the one to run it.
 */
const stateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lastRunAt: { type: Date, default: null }
  },
  { versionKey: false }
);

module.exports = mongoose.model("JobBoardState", stateSchema, "jobboard_state");
