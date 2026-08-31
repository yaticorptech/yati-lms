const mongoose = require("mongoose");

/**
 * Every recommendation request is logged. This drives the "trending
 * skills" and "popular roles" endpoints, and gives a student their own
 * recent-search list.
 *
 * Inside the LMS the caller is always signed in, so searches are keyed on the
 * real user rather than the client-generated sessionId the standalone app used.
 * That matters for history: a guessable id in a query string would have let one
 * student read another's searches.
 *
 * Records expire after 90 days via a TTL index.
 */
const searchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    // Kept for rows written before the port, and harmless on new ones.
    sessionId: { type: String, index: true },
    skills: { type: [String], default: [] },
    role: { type: String, default: "" },
    jobType: { type: String, default: "Any" },
    location: { type: String, default: "" },
    remoteOnly: { type: Boolean, default: false },
    resultCount: { type: Number, default: 0 },
    topScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

searchSchema.index({ createdAt: -1 });
searchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("JobBoardSearch", searchSchema, "jobboard_searches");
