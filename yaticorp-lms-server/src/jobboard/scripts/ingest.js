/**
 * Pulls fresh listings from every global job source into MongoDB.
 * Run manually, or on a schedule (cron / a hosted scheduler):
 *
 *   npm run ingest
 *   npm run ingest -- "data analyst"     # bias the query
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const { ingestAll, deactivateStale, meteredUsage } = require("../services/providerService.js");
const { resolvePlace } = require("../services/geoService.js");
const Job = require("../models/Job.js");

/*  npm run ingest -- "data analyst"              query only
    npm run ingest -- "data analyst" --in=Mangalore   …and pull for that city  */
const args = process.argv.slice(2);
const search = args.filter((a) => !a.startsWith("-")).join(" ");
const where = (args.find((a) => a.startsWith("--in=")) ?? "").slice(5);

async function main() {
  const ok = await connectDB();
  if (!ok) process.exit(1);

  // Location-aware sources need a resolved place before they can be asked
  // for anything; the others ignore it.
  const place = where ? await resolvePlace(where) : null;
  if (where && !place) console.log(`• Could not resolve "${where}" — ingesting without a location.`);

  console.log(
    `• Ingesting${search ? ` with query: "${search}"` : " all sources"}` +
      `${place ? ` near ${place.label}` : ""}…`
  );

  const { upserted, report } = await ingestAll({ search, place });
  for (const r of report) {
    console.log(
      r.ok
        ? `  ✔ ${r.source}: ${r.count} fetched, ${r.written ?? 0} written`
        : `  ✖ ${r.source}: ${r.error}`
    );
  }

  const retired = await deactivateStale(45);
  const total = await Job.countDocuments({ active: true });

  console.log(`\n  ${upserted} listings written, ${retired} stale retired.`);
  console.log(`  ${total} active listings in the index.`);

  // Metered sources bill by request, so the running total belongs where the
  // person spending it will see it.
  for (const u of await meteredUsage()) {
    console.log(`  ${u.provider}: ${u.calls} requests used in ${u.month}.`);
  }

  if (!process.env.JSEARCH_RAPIDAPI_KEY && !process.env.ADZUNA_APP_ID) {
    console.log("\n  No city-level source configured — searches outside a metro will be thin.");
    console.log("  Add JSEARCH_RAPIDAPI_KEY or the Adzuna pair to server/.env.");
  }
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Ingest failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
