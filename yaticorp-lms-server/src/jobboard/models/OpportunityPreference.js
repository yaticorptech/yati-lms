const mongoose = require("mongoose");

/**
 * ♡ Interested / ✕ Not interested, one row per student per opportunity.
 *
 * The category, interests and type are copied from the opportunity at the
 * moment of the tap so the recommender can learn from the preference even
 * after the listing closes or is edited: "liked three events things" must
 * keep meaning that.
 */
const preferenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    verdict: { type: String, enum: ["interested", "not_interested"], required: true },
    category: { type: String, default: "" },
    interests: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    opportunityType: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

preferenceSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

/** Recently viewed — one row per pair, the timestamp moving on every open. */
const viewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    viewedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);
viewSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });

/** A safety report on an opportunity or the organisation behind it. */
const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    target: { type: String, enum: ["opportunity", "organization"], required: true },
    reason: { type: String, required: true },
    details: { type: String, default: "" },
    status: { type: String, enum: ["open", "reviewed", "actioned"], default: "open", index: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = {
  OpportunityPreference: mongoose.model("JobBoardOpportunityPreference", preferenceSchema, "jobboard_opportunity_preferences"),
  OpportunityView: mongoose.model("JobBoardOpportunityView", viewSchema, "jobboard_opportunity_views"),
  OpportunityReport: mongoose.model("JobBoardOpportunityReport", reportSchema, "jobboard_opportunity_reports")
};
