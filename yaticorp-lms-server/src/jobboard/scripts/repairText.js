/**
 * Cleans job descriptions saved by the old importer, which removed "&lt;"
 * and "&gt;" but left the tag names: "h1 strong Product Intern /strong p …".
 *
 *   npm run jobs:fix-text -- --dry   # count only
 *   npm run jobs:fix-text            # clean
 *
 * New imports are clean already (utils/jobText); this is for rows saved before.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const { repairText, looksBroken } = require("../utils/jobText");

const dry = process.argv.includes("--dry");

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const jobs = mongoose.connection.db.collection("jobboard_jobs");
  const cursor = jobs.find({ description: /(^|\s)\/?(h[1-6]|strong|div|span|li|ul)(\s|$)|(^|\s)p\s|(^|\s)\/a(\s|$)|amp;|nbsp;|class=/i }, { projection: { description: 1 } });
  let ops = [], seen = 0, fixed = 0;
  for await (const j of cursor) {
    seen++;
    if (!looksBroken(j.description)) continue;
    const clean = repairText(j.description);
    if (clean === j.description) continue;
    fixed++;
    ops.push({ updateOne: { filter: { _id: j._id }, update: { $set: { description: clean } } } });
    if (ops.length >= 500) { if (!dry) await jobs.bulkWrite(ops, { ordered: false }); ops = []; }
  }
  if (ops.length && !dry) await jobs.bulkWrite(ops, { ordered: false });
  console.log(`${dry ? "[dry] " : ""}${seen} descriptions looked at, ${fixed} cleaned`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
