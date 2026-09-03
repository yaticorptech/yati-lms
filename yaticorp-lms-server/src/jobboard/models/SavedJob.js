const mongoose = require("mongoose");

/**
 * A listing a student bookmarked.
 *
 * A snapshot of the card, not a reference to it. The index churns nightly —
 * listings are retired after 45 days and a board can withdraw one any time —
 * and a bookmark that silently vanished with the listing would read as the
 * student's mistake, not the index's. So everything the card renders is
 * copied here at save time; `jobId`/`externalId` tie it back to the live
 * listing for as long as that exists, and the list endpoint says which saved
 * jobs are still active.
 */
const savedJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    jobId: { type: String, required: true },
    externalId: { type: String, default: "" },

    title: { type: String, required: true },
    company: { type: String, default: "" },
    companyUrl: { type: String, default: "" },
    companyLocation: { type: String, default: "" },
    location: { type: String, default: "" },
    remote: { type: Boolean, default: false },
    type: { type: String, default: "Unknown" },
    salary: { type: String, default: "" },
    url: { type: String, required: true },
    source: { type: String, default: "" },
    postedAt: { type: Date, default: null },

    savedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// One bookmark per listing per student — saving twice is a no-op, not a dupe.
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("JobBoardSavedJob", savedJobSchema, "jobboard_saved");
