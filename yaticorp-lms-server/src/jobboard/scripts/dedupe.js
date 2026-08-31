/**
 * Removes listings that are the same job stored more than once.
 *
 *   npm run dedupe -- --dry     # report only
 *   npm run dedupe              # delete the redundant copies
 *
 * Google for Jobs mints a fresh id for the same posting on every query, so
 * before the id scheme was keyed on the apply link, each re-fetch inserted
 * rather than updated: one Mangalore listing appeared three times with
 * three ids and one identical URL. Providers keyed on their own stable ids
 * are unaffected.
 *
 * Two jobs are the same only when they share an apply URL. That is the
 * one rule that cannot be wrong: the same link is the same posting.
 *
 * Matching on employer + title + city instead looks equivalent and is not.
 * High-volume employers really do run many openings under one title in one
 * city — Sutherland had seven "Customer Service Representative" reqs in
 * Cairo, each with its own id and its own application link — and collapsing
 * those destroys six real jobs while claiming to remove noise. That rule is
 * available behind --collapse-postings for anyone who wants one row per
 * title, but it is not the default and it is not reversible.
 *
 * The copy kept is the most recently fetched, so whatever the newest ingest
 * learned about the listing survives.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const Job = require("../models/Job.js");

const DRY = process.argv.includes("--dry");
const COLLAPSE_POSTINGS = process.argv.includes("--collapse-postings");

/** Ignore tracking parameters, which differ between fetches of one posting. */
function canonicalUrl(url) {
  const raw = String(url ?? "").trim();
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|ref|src|source|gh_src|campaign)/i.test(k)) u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

async function main() {
  if (!(await connectDB())) process.exit(1);

  const jobs = await Job.find({ active: true })
    .select("externalId url company title city fetchedAt")
    .sort({ fetchedAt: -1 })
    .lean();

  console.log(`\n• ${jobs.length} active listings.`);

  const keptByUrl = new Map();
  const keptByPosting = new Map();
  const redundant = [];

  for (const job of jobs) {
    const urlKey = canonicalUrl(job.url);
    const postingKey = [job.company, job.title, job.city]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .join("|");

    // Sorted newest-first, so the first sighting of a key is the keeper.
    if (urlKey && keptByUrl.has(urlKey)) {
      redundant.push(job);
      continue;
    }
    if (COLLAPSE_POSTINGS && postingKey.replace(/\|/g, "") && keptByPosting.has(postingKey)) {
      redundant.push(job);
      continue;
    }

    if (urlKey) keptByUrl.set(urlKey, job._id);
    keptByPosting.set(postingKey, job._id);
  }

  console.log(`  ${redundant.length} redundant cop${redundant.length === 1 ? "y" : "ies"}.`);

  if (redundant.length) {
    const sample = redundant.slice(0, 5);
    console.log("\n  examples:");
    for (const r of sample) {
      console.log(`    ${String(r.company).slice(0, 24).padEnd(26)} ${String(r.title).slice(0, 40)}`);
    }
  }

  if (DRY) {
    console.log("\n  --dry: nothing deleted.\n");
  } else if (redundant.length) {
    const res = await Job.deleteMany({ _id: { $in: redundant.map((r) => r._id) } });
    console.log(`\n  Deleted ${res.deletedCount}.`);
    console.log(`  ${await Job.countDocuments({ active: true })} active listings remain.\n`);
  } else {
    console.log("  Nothing to do.\n");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Dedupe failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
