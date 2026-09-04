const mongoose = require("mongoose");
const { CATEGORY_IDS, INTEREST_IDS, HOUR_IDS, TYPE_IDS, SAFETY_IDS } = require("../data/opportunityVocab");

/**
 * A local job on specific dates — a wedding buffet to serve, sweets to box
 * before Diwali, buntings to hang for an annual day. Distinct from
 * JobBoardJob: those are scraped listings from global boards with no age
 * data at all, which is exactly why they can never be shown to a minor.
 * Everything here carries the facts the age rules need, plus the dates the
 * matching is built on.
 *
 * `slug` is the natural key so the starter rows can be re-seeded without
 * duplicating; `source` says where a row came from — seed rows are swept
 * when the seed version changes, admin rows are never touched.
 */
const opportunitySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    source: { type: String, enum: ["seed", "admin", "partner"], default: "admin", index: true },
    seedVersion: { type: Number, default: 0 },

    title: { type: String, required: true, trim: true },
    organization: {
      name: { type: String, required: true, trim: true },
      verified: { type: Boolean, default: false },
      about: { type: String, default: "" }
    },
    description: { type: String, default: "" },
    category: { type: String, enum: CATEGORY_IDS, required: true, index: true },
    icon: { type: String, default: "🌱" },

    // Tags the student's interests are matched against; the category is
    // always one of them, an event job may also be catering, and so on.
    interests: { type: [{ type: String, enum: INTEREST_IDS.concat(["delivery"]) }], default: [] },
    skills: { type: [String], default: [] },
    opportunityType: { type: String, enum: TYPE_IDS, required: true, index: true },

    location: {
      area: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      landmark: { type: String, default: "", trim: true }
    },

    // The dates the job runs. A one-day job has endsAt on the same day; a
    // week of sweet boxing spans several. Matching is against this range.
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    timeLabel: { type: String, default: "" },          // "11:00–15:00"
    hoursPerSession: { type: String, enum: HOUR_IDS, default: "2-4" },
    slots: { type: Number, default: 1, min: 1 },

    minimumAge: { type: Number, required: true, min: 0 },
    maximumAge: { type: Number, default: null },

    compensation: {
      kind: { type: String, enum: ["paid", "stipend", "volunteer", "free"], default: "paid" },
      label: { type: String, default: "" }
    },

    verified: { type: Boolean, default: false, index: true },
    safetyClassification: { type: String, enum: SAFETY_IDS, default: "general", index: true },
    guardianApprovalRequired: { type: Boolean, default: true },
    supervision: { type: String, default: "" },
    safetyNotes: { type: String, default: "" },

    // Never rendered to a minor — see eligibilityRules.publicView.
    contact: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },

    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    postedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

opportunitySchema.index({ status: 1, startsAt: 1, minimumAge: 1 });

// "local_" because a `jobboard_opportunities` collection already exists in
// the shared test database with rows of another shape (no slug, no status,
// capitalised types) from an earlier experiment. Sharing the name would hide
// this index behind those rows and never seed.
module.exports = mongoose.model("JobBoardOpportunity", opportunitySchema, "jobboard_local_opportunities");
