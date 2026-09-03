/**
 * Seeds MongoDB with the role taxonomy and the curated job index.
 * Idempotent — safe to re-run. Pass --fresh to wipe first.
 *
 *   npm run seed
 *   npm run seed -- --fresh
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const Role = require("../models/Role.js");
const { slugify } = require("../models/Role.js");
const Job = require("../models/Job.js");
const { ROLES } = require("../data/roles.js");
const { SEED_JOBS } = require("../data/seedJobs.js");

const fresh = process.argv.includes("--fresh");

async function main() {
  const ok = await connectDB();
  if (!ok) {
    console.error("Cannot seed without a database connection.");
    process.exit(1);
  }

  if (fresh) {
    await Promise.all([Role.deleteMany({}), Job.deleteMany({ source: "CareerCompass index" })]);
    console.log("• Cleared roles and curated jobs.");
  }

  /* ---- roles ---- */
  const roleOps = ROLES.map((r) => ({
    updateOne: {
      filter: { name: r.name },
      update: { $set: { ...r, slug: slugify(r.name), category: r.category ?? "Technology" } },
      upsert: true,
    },
  }));
  // Remove roles that are no longer in the taxonomy. Upserting alone leaves
  // deleted entries behind forever: renaming eight roles left the old names
  // in the dropdown under orphaned category headings, so the list showed 142
  // roles from a file defining 132. The file is the source of truth.
  const stale = await Role.deleteMany({ name: { $nin: ROLES.map((r) => r.name) } });
  if (stale.deletedCount) console.log(`✔ Removed ${stale.deletedCount} role(s) no longer in the taxonomy.`);

  const roleRes = await Role.bulkWrite(roleOps, { ordered: false });
  console.log(`✔ Roles: ${roleRes.upsertedCount ?? 0} inserted, ${roleRes.modifiedCount ?? 0} updated`);

  /* ---- retire the old invented index ----
     Earlier versions seeded fictional employers with example.com apply
     links. They are indistinguishable from real listings in the UI right
     up until someone clicks one, so remove any left in the database rather
     than merely not writing new ones. */
  const purged = await Job.deleteMany({
    $or: [{ source: "CareerCompass index" }, { url: /(^|\/\/)([^/]*\.)?example\.(com|org|net)\b/i }],
  });
  if (purged.deletedCount) {
    console.log(`✔ Removed ${purged.deletedCount} placeholder listings with dead apply links.`);
  }

  /* ---- curated jobs ---- */
  const jobOps = SEED_JOBS.map((j, i) => {
    const externalId = `seed:${slugify(j.company)}-${slugify(j.title)}-${i}`;
    const doc = {
      externalId,
      title: j.title,
      company: j.company,
      description: "",
      location: [j.city, j.country].filter(Boolean).join(", "),
      city: j.city,
      country: j.country,
      remote: !!j.remote,
      type: j.type,
      skills: j.skills,
      salary: j.salary ?? "",
      url: j.url,
      source: "CareerCompass index",
      postedAt: new Date(Date.now() - (j.daysAgo ?? 0) * 86400000),
      fetchedAt: new Date(),
      active: true,
    };
    if (Array.isArray(j.geo) && j.geo.length === 2) {
      doc.geo = { type: "Point", coordinates: j.geo };
    }
    return { updateOne: { filter: { externalId }, update: { $set: doc }, upsert: true } };
  });

  if (jobOps.length) {
    const jobRes = await Job.bulkWrite(jobOps, { ordered: false });
    console.log(`✔ Jobs:  ${jobRes.upsertedCount ?? 0} inserted, ${jobRes.modifiedCount ?? 0} updated`);
  }

  const total = await Job.countDocuments({ active: true });
  console.log(`\n  ${total} active listings in the index.`);
  console.log("  Listings come from live sources — run `npm run ingest` to pull them,");
  console.log("  then `npm run geocode` so they can be ranked by distance.\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
