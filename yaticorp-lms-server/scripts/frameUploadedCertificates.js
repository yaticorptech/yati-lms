/**
 * Frames every certificate students uploaded before framing (2026-11-11): each gets its number in the student's
 * series printed on the white frame, the framed picture kept in the student's Drive (when linked) and the file as
 * uploaded kept beside it (controllers/achievementController.js frameExisting). Safe to run again: framed ones are
 * skipped. The profile also frames a student's own the next time they open it.
 *
 *   node scripts/frameUploadedCertificates.js          count what is left
 *   node scripts/frameUploadedCertificates.js --apply  frame them
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const Achievement = require('../src/models/Achievement');
    const { frameExisting } = require('../src/controllers/achievementController');
    const rows = await Achievement.find({ framed: { $ne: true } }).sort({ createdAt: 1 }).lean();
    console.log(`${rows.length} uploaded certificate(s) not framed yet.`);
    if (!process.argv.includes('--apply')) { await mongoose.disconnect(); return; }
    const tally = {};
    for (const r of rows) {
        const result = await frameExisting(r).catch((e) => `error: ${e.message}`);
        tally[result] = (tally[result] || 0) + 1;
        console.log(`  ${r._id} "${r.title}" → ${result}`);
    }
    console.log('Done:', JSON.stringify(tally));
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
