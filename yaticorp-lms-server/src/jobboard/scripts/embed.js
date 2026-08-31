/**
 * Builds the semantic vectors the Gemini matching pass reads.
 *
 *   npm run embed -- --check      # verify the key works, embed nothing
 *   npm run embed                 # embed listings that don't have a vector
 *   npm run embed -- --limit=500  # cap the work
 *   npm run embed -- --all        # re-embed everything (model change)
 *
 * Embeddings are computed here rather than during a search because a search
 * can afford exactly one API call — the user's profile — and not one per
 * candidate listing. Vectors are keyed on `externalId` and on a hash of the
 * text they came from, so re-running after an ingest only embeds listings
 * that are new or whose wording actually changed.
 *
 * Safe to interrupt; it resumes from whatever is still missing.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const JobEmbedding = require("../models/JobEmbedding.js");
const { embedMissing } = require("../services/embedService.js");
const {
  embedOne, cosineSimilarity, geminiInfo, geminiConfigured,
} = require("../services/geminiService.js");

const args = process.argv.slice(2);
const flagged = (n) => args.includes(`--${n}`);
const value = (n, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : fallback;
};

const LIMIT = Number(value("limit", "0")) || Infinity;
const REDO_ALL = flagged("all");

/** Prove the key and model work before spending anything on a backfill. */
async function check() {
  const info = geminiInfo();
  console.log(`\n  model      ${info.model}`);
  console.log(`  dimensions ${info.dimensions}`);
  console.log(`  key        ${info.configured ? "set" : "MISSING"}`);

  if (!info.configured) {
    console.log("\n  Set GEMINI_API_KEY in server/.env, then re-run.\n");
    return false;
  }

  const a = await embedOne("Senior React developer building web interfaces", { retry: true });
  const b = await embedOne("Frontend engineer working with JavaScript and UI", { retry: true });
  const c = await embedOne("Warehouse forklift operator, night shift", { retry: true });

  if (!a || !b || !c) {
    console.log("\n  ✖ The API returned no vector. Check the key and the model name.\n");
    return false;
  }

  console.log(`\n  ✔ Embeddings returned (${a.length} dimensions).`);
  console.log(`    related pair   ${cosineSimilarity(a, b).toFixed(3)}`);
  console.log(`    unrelated pair ${cosineSimilarity(a, c).toFixed(3)}`);
  console.log("    The first should be clearly higher than the second.\n");
  return true;
}

async function main() {
  if (!(await connectDB())) process.exit(1);

  if (flagged("check")) {
    await check();
    await mongoose.disconnect();
    return;
  }

  if (!geminiConfigured()) {
    console.error("\n✖ GEMINI_API_KEY is not set — nothing to do.");
    console.error("  Semantic matching stays off and the other four signals are unaffected.\n");
    await mongoose.disconnect();
    process.exit(1);
  }

  const out = await embedMissing({
    maxTexts: LIMIT,
    redoAll: REDO_ALL,
    onProgress: ({ done, queued, written, failed }) => {
      process.stdout.write(`\r  ${done}/${queued} · ${written} stored · ${failed} failed`);
    }
  });

  console.log(`\n\n• ${out.active} active listings, ${out.pending} needed embedding, ${out.written} stored this run.`);
  if (out.pending > out.written + out.failed) {
    console.log(`  ${out.pending - out.written - out.failed} still pending — re-run to continue.`);
  }

  const total = await JobEmbedding.countDocuments({});
  console.log(`\n\n  ${total} listings carry a vector.\n`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nEmbed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
