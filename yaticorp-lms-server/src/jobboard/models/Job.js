const mongoose = require("mongoose");

/**
 * A job listing. Documents arrive from three places:
 *   - the curated seed index (source: "CareerCompass index")
 *   - live global boards ingested on a schedule (Remotive, Arbeitnow, …)
 *   - anything an admin posts through POST /api/jobs
 *
 * `externalId` is the natural key used for idempotent upserts, so
 * re-ingesting the same board never duplicates rows.
 */
const jobSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, index: true },

    title: { type: String, required: true, trim: true, index: "text" },
    company: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // The employer's own homepage, when we know which employer this is.
    // Listings read straight off a company's board always have one; those
    // from aggregators only do when the name matches the registry. Empty is
    // meaningful — the UI falls back to a map lookup rather than guessing a
    // URL, because a wrong company link is worse than none.
    companyUrl: { type: String, default: "" },
    // Where that company is, for the "about / location" link. Falls back to
    // the registry's head office when a listing names no city.
    companyLocation: { type: String, default: "" },

    location: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true, index: true },
    remote: { type: Boolean, default: false, index: true },

    // GeoJSON point — powers true radius search via the 2dsphere index.
    geo: {
      type: { type: String, enum: ["Point"], default: undefined },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },

    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract", "Unknown"],
      default: "Unknown",
      index: true,
    },

    skills: { type: [String], default: [], index: true },
    salary: { type: String, default: "" },
    url: { type: String, required: true },
    source: { type: String, required: true, index: true },

    postedAt: { type: Date, default: Date.now, index: true },
    fetchedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound index matching the shape of the recommendation pre-filter.
jobSchema.index({ active: 1, type: 1, remote: 1, postedAt: -1 });
jobSchema.index({ geo: "2dsphere" });
jobSchema.index({ title: "text", description: "text", skills: "text" });

/** Days since posting, used by the freshness boost in scoring. */
jobSchema.virtual("daysAgo").get(function () {
  if (!this.postedAt) return null;
  return Math.max(0, Math.round((Date.now() - this.postedAt.getTime()) / 86400000));
});

jobSchema.set("toJSON", { virtuals: true });
jobSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("JobBoardJob", jobSchema, "jobboard_jobs");
