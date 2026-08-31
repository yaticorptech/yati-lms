const mongoose = require("mongoose");

/**
 * The role → skills taxonomy, stored in MongoDB so it can be edited
 * without a redeploy. `core` skills are required for the role;
 * `preferred` skills make a candidate competitive.
 */
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    aliases: { type: [String], default: [] },
    core: { type: [String], default: [] },
    preferred: { type: [String], default: [] },
    blurb: { type: String, default: "" },
    category: { type: String, default: "Technology" },
  },
  { timestamps: true }
);

roleSchema.index({ name: "text", aliases: "text" });

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

module.exports = mongoose.model("JobBoardRole", roleSchema, "jobboard_roles");

Object.assign(module.exports, { slugify });
