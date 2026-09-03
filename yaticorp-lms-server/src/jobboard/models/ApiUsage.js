const mongoose = require("mongoose");

/**
 * Monthly call counter for metered upstream APIs.
 *
 * JSearch's free tier is roughly 200 requests a month — small enough that
 * an ordinary week of development can exhaust it without anyone noticing,
 * and the failure is silent: the key keeps working, the plan just starts
 * refusing or charging. An in-process counter wouldn't help, because the
 * dev server restarts constantly and every restart would forget the spend.
 *
 * So the count lives here, keyed by provider and calendar month. A new
 * month makes a new document, which is the reset — nothing has to run on a
 * schedule to clear it.
 */
const apiUsageSchema = new mongoose.Schema(
  {
    // "jsearch:2026-08"
    key: { type: String, required: true, unique: true, index: true },
    provider: { type: String, required: true },
    month: { type: String, required: true },
    calls: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobBoardApiUsage", apiUsageSchema, "jobboard_api_usage");
