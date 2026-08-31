const mongoose = require("mongoose");

/**
 * Place name → coordinates, persisted.
 *
 * Geocoding is what lets a listing be ranked by real distance rather than
 * by whether two strings happen to share a word, so every ingested job
 * wants a lookup. The upstream geocoder allows roughly one request per
 * second, which makes that prohibitive at ingest scale unless the answers
 * survive a restart — an in-process cache re-pays the whole cost on every
 * boot. Cities do not move, so a stored answer stays correct indefinitely.
 *
 * Failures are cached too, under `found: false`. A place name the geocoder
 * cannot resolve will not start resolving on the next run, and re-asking
 * would spend the rate limit on a guaranteed miss — which is exactly the
 * budget the resolvable names need.
 */
const geoCacheSchema = new mongoose.Schema(
  {
    // Normalized lookup key ("bengaluru karnataka india"), not raw input,
    // so spacing and punctuation variants collapse onto one entry.
    key: { type: String, required: true, unique: true, index: true },
    query: { type: String, default: "" },

    found: { type: Boolean, required: true },

    label: { type: String, default: "" },
    city: { type: String, default: "" },
    region: { type: String, default: "" },
    country: { type: String, default: "" },
    countryCode: { type: String, default: "" },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobBoardGeoCache", geoCacheSchema, "jobboard_geocache");
