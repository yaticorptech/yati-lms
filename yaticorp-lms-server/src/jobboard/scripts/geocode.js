/**
 * Resolves the places named by stored listings into coordinates.
 *
 *   npm run jobs:geocode              # work through everything still missing
 *   npm run jobs:geocode -- --limit=200
 *
 * The actual work lives in services/geocodeService.js, shared with the
 * nightly maintenance run; this wrapper adds the connection, the progress
 * line and the closing summary.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const { geocodeMissing } = require("../services/geocodeService.js");
const Job = require("../models/Job.js");

const args = process.argv.slice(2);
const limitArg = Number((args.find((a) => a.startsWith("--limit=")) ?? "").slice(8));
const LIMIT = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : Infinity;

async function main() {
  const ok = await connectDB();
  if (!ok) process.exit(1);

  console.log(`• Resolving places without coordinates${LIMIT !== Infinity ? ` (up to ${LIMIT})` : ""}…`);
  console.log(`  Cached places resolve instantly; new ones take ~1s each.\n`);

  const out = await geocodeMissing({
    maxPlaces: LIMIT,
    onProgress: ({ done, queued, resolved, failed, written }) => {
      if (done % 25 === 0 || done === queued) {
        process.stdout.write(`\r  ${done}/${queued} places · ${resolved} resolved · ${failed} unresolved · ${written} listings located`);
      }
    }
  });

  if (out.worked < out.missing) {
    console.log(`\n  Worked through ${out.worked} of ${out.missing} places this run.`);
  }

  const located = await Job.countDocuments({ active: true, "geo.coordinates": { $exists: true } });
  const total = await Job.countDocuments({ active: true });
  console.log(`\n\n  ${located}/${total} active listings now carry coordinates.\n`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nGeocode failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
