/**
 * Pre-fetches listings city by city, so local searches are already answered
 * before anyone runs them.
 *
 *   npm run warm                                  # major Indian cities
 *   npm run warm -- --set=global
 *   npm run warm -- --cities="Kochi, India|Surat, India"
 *   npm run warm -- --queries="developer|data analyst"
 *   npm run warm -- --limit=20                    # cap requests spent
 *
 * Why this exists: the keyless company boards publish only where employers
 * keep offices, so outside a few metros the index depends on JSearch or
 * Adzuna. Those are asked about a city only when somebody searches it,
 * which means the first person to search a new city waits for the fetch and
 * still sees a thin page. Running this moves that cost off them.
 *
 * Cost is one metered request per city per query, and every request is
 * counted against the monthly ceiling in `.env` — this script cannot exceed
 * it, because the provider itself refuses once the budget is gone. Start
 * with the default single query; add more only if the allowance is there.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const { ingestAll, meteredUsage } = require("../services/providerService.js");
const { resolvePlace, cityCoverageQuery } = require("../services/geoService.js");
const { CITY_SETS, INDIA_BY_REGION } = require("../data/cities.js");
const Job = require("../models/Job.js");

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

// Pipe-separated, because city names contain commas.
const split = (s) => s.split("|").map((x) => x.trim()).filter(Boolean);

const set = flag("set", "india");
const cities = flag("cities") ? split(flag("cities")) : CITY_SETS[set] ?? CITY_SETS.india;
const queries = flag("queries") ? split(flag("queries")) : ["developer"];
const limit = Number(flag("limit", "0")) || Infinity;
const force = args.includes("--force");

/** Matches the server's own threshold for "this city is covered". */
const MIN_CITY_JOBS = 12;

const CITY_PROVIDERS = ["JSearch", "Adzuna"];

async function main() {
  if (!(await connectDB())) process.exit(1);

  if (!process.env.JSEARCH_RAPIDAPI_KEY && !process.env.ADZUNA_APP_ID) {
    console.error("\n✖ No city-capable source configured.");
    console.error("  Set JSEARCH_RAPIDAPI_KEY or the Adzuna pair in server/.env first.\n");
    await mongoose.disconnect();
    process.exit(1);
  }

  const planned = Math.min(cities.length * queries.length, limit);
  console.log(`\n• Warming ${cities.length} cities × ${queries.length} quer${queries.length === 1 ? "y" : "ies"}.`);
  console.log(`  Up to ${planned} metered request${planned === 1 ? "" : "s"}; the monthly ceiling still applies.`);
  console.log(force ? "  --force: refetching every city.\n" : "  Already-covered cities are skipped; pass --force to refetch.\n");

  let spent = 0;
  let written = 0;
  let skipped = 0;
  const failed = [];

  for (const city of cities) {
    if (spent >= limit) break;

    const place = await resolvePlace(city);
    if (!place) {
      failed.push([city, "could not resolve"]);
      continue;
    }

    // Requests are metered and a warmed city stays warm, so re-running this
    // must not re-buy what's already there. `--force` overrides for a
    // deliberate refresh.
    if (!force) {
      const here = cityCoverageQuery(place);
      const have = here ? await Job.countDocuments({ active: true, remote: false, ...here }) : 0;
      if (have >= MIN_CITY_JOBS) {
        skipped++;
        continue;
      }
    }

    for (const query of queries) {
      if (spent >= limit) break;
      spent++;

      try {
        const { upserted, report } = await ingestAll({
          search: query,
          place,
          only: CITY_PROVIDERS,
          maxGeocodes: 0,      // these sources carry their own coordinates
        });
        written += upserted;

        const got = report.filter((r) => r.ok && r.count).map((r) => `${r.source} ${r.count}`).join(", ");
        console.log(`  ${place.label.padEnd(38).slice(0, 38)} ${got || "nothing returned"}`);
      } catch (err) {
        failed.push([city, err.message]);
        console.log(`  ${place.label.padEnd(38).slice(0, 38)} ✖ ${err.message}`);
      }
    }
  }

  const onsiteIndia = await Job.countDocuments({ active: true, remote: false, country: /india/i });

  // Per-region coverage is the number that matters: a state absent here is
  // one whose residents get nothing local until they search it themselves.
  if (set === "india" && !flag("cities")) {
    const bare = [];
    for (const [region, list] of Object.entries(INDIA_BY_REGION)) {
      let total = 0;
      for (const name of list) {
        const place = await resolvePlace(`${name}, India`);
        const here = place && cityCoverageQuery(place);
        if (here) total += await Job.countDocuments({ active: true, remote: false, ...here });
      }
      if (!total) bare.push(region);
    }
    const covered = Object.keys(INDIA_BY_REGION).length - bare.length;
    console.log(`  ${covered}/${Object.keys(INDIA_BY_REGION).length} states and union territories have local listings.`);
    if (bare.length) console.log(`  No local listings yet: ${bare.join(", ")}`);
  }
  console.log(`\n  ${written} listings written, ${spent} request${spent === 1 ? "" : "s"} spent, ${skipped} cit${skipped === 1 ? "y" : "ies"} already covered.`);
  console.log(`  ${onsiteIndia} on-site listings in India.`);
  for (const u of await meteredUsage()) console.log(`  ${u.provider}: ${u.calls} requests used in ${u.month}.`);
  if (failed.length) {
    console.log(`\n  ${failed.length} skipped:`);
    for (const [c, why] of failed) console.log(`    ${c} — ${why}`);
  }
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Warm failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
