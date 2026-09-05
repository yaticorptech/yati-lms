const mongoose = require("mongoose");
const { INTEREST_IDS } = require("../data/opportunityVocab");

/**
 * What a student told us for the Local Jobs section — three answers, no
 * resume: when they were born, which dates they want work, what they're
 * interested in.
 *
 * The date of birth is the one field the safety rules cannot do without.
 * The LMS's own User record carries no age, so it is asked for here and the
 * age is derived on every request — never stored, so it cannot go stale.
 */
const guardianSchema = new mongoose.Schema(
  {
    // not-required: adult or under-14 (nothing to approve). none: a teen who
    // has not asked yet. The rest are the request's life.
    status: { type: String, enum: ["not-required", "none", "pending", "approved", "rejected"], default: "none" },
    guardianName: { type: String, default: "" },
    // The parent's mobile, +91XXXXXXXXXX, asked for on the details form.
    phone: { type: String, default: "" },
    requestedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: "" }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    dateOfBirth: { type: Date, required: true },
    // The window the student wants work in. A single day has both the same.
    wantFrom: { type: Date, required: true },
    wantTo: { type: Date, required: true },
    interests: { type: [{ type: String, enum: INTEREST_IDS }], default: [] },
    guardian: { type: guardianSchema, default: () => ({}) },
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobBoardOpportunityProfile", profileSchema, "jobboard_opportunity_profiles");
