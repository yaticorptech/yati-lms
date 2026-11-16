/**
 * Repairs AI-discovered jobs whose apply link is a Google search redirect
 * (vertexaisearch.cloud.google.com/grounding-api-redirect/…). Those links
 * stop working after a while and open a Google 404 page.
 *
 *   npm run jobs:fix-links -- --dry   # report only
 *   npm run jobs:fix-links            # fix
 *
 * A redirect that still leads somewhere is replaced by the real page; one
 * that no longer does hides the job (active: false). Company links that are
 * redirects are resolved the same way, or cleared.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const Job = require("../models/Job");
const { resolveUrl } = require("../services/geminiDiscoveryService");
const { stableId } = require("../services/providerService");

const REDIRECT = /grounding-api-redirect|vertexaisearch\.cloud\.google\.com/i;
const dry = process.argv.includes("--dry");

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  // Live jobs only (2026-11-16): one hidden on an earlier run is left alone, not checked and counted again.
  const rows = await Job.find({ active: true, $or: [{ url: REDIRECT }, { companyUrl: REDIRECT }] }).lean();
  let fixed = 0, hidden = 0, companies = 0;
  for (const j of rows) {
    const set = {};
    if (REDIRECT.test(j.url)) {
      const real = await resolveUrl(j.url);
      if (real) {
        const externalId = `gemini:${stableId(real)}`;
        const twin = await Job.exists({ externalId, _id: { $ne: j._id } });
        if (twin) { set.active = false; hidden++; }
        else { set.url = real; set.externalId = externalId; fixed++; }
      } else { set.active = false; hidden++; }
    }
    if (REDIRECT.test(j.companyUrl || "")) { set.companyUrl = await resolveUrl(j.companyUrl); companies++; }
    if (!dry) await Job.updateOne({ _id: j._id }, { $set: set });
  }
  console.log(`${dry ? "[dry] " : ""}${rows.length} jobs checked: ${fixed} links fixed, ${hidden} dead jobs hidden, ${companies} company links fixed`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
