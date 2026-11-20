/**
 * The brand is YATICORPX3 (2026-11-20): saved "YATICORP" / "YATICORP LMS" names
 * (course instructor, competition organizer) become "YATICORPX3".
 *
 *   node scripts/renameBrandX3.js            # what would change, nothing written
 *   node scripts/renameBrandX3.js --apply    # rename
 *
 * Uses MONGO_URI from .env. Safe to run again.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const OLD = /^\s*(?:YATICORP|Yaticorp|YatiCorp)(?:\s+LMS)?\s*$/;
const TARGETS = [['courses', 'instructor'], ['competitions', 'organizedBy'], ['arena_competitions', 'organizedBy']];

(async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    for (const [coll, field] of TARGETS) {
        const filter = { [field]: { $regex: OLD.source } };
        const n = await db.collection(coll).countDocuments(filter);
        if (apply && n) await db.collection(coll).updateMany(filter, { $set: { [field]: 'YATICORPX3' } });
        console.log(`${coll}.${field}: ${n} ${apply ? 'renamed' : 'to rename'}`);
    }
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
