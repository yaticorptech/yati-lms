/**
 * Puts every student's certificate numbers into the one format (2026-10-31):
 * YATI<card number>-001, -002, … oldest certificate first — course
 * certificates (whose PDFs then print the new number), uploads and the
 * competition certificates already numbered. Numbers made before this format
 * (YATI<card>-01, YATI<card>001) are replaced.
 *
 *   node scripts/renumberCertificates.js            # what would change, nothing written
 *   node scripts/renumberCertificates.js --apply    # renumber
 *
 * Uses MONGO_URI from .env. Safe to run again: a student already in the format
 * is renumbered to the same numbers.
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const User = require('../src/models/User');
    const Certificate = require('../src/models/Certificate');
    const Achievement = require('../src/models/Achievement');
    const { renumber, FORMAT } = require('../src/services/certificateNumbers');

    const ids = new Set([
        ...(await Certificate.distinct('userId')).map(String),
        ...(await Achievement.distinct('userId')).map(String),
        ...(await User.find({ 'certificateNumbers.0': { $exists: true } }).distinct('_id')).map(String)
    ]);
    let changed = 0;
    for (const id of ids) {
        const user = await User.findById(id).select('name cardNumber +certificateNumbers').lean();
        if (!user) continue;
        const oldCourse = await Certificate.countDocuments({ userId: id, certificateNumber: { $not: FORMAT } });
        const oldProfile = (user.certificateNumbers || []).filter((e) => !FORMAT.test(e.number || '')).length;
        const needs = oldCourse || oldProfile || !(user.certificateNumbers || []).length;
        if (!needs) continue;
        changed += 1;
        if (apply) {
            const numbers = await renumber(id);
            console.log(`${user.name || id} (${user.cardNumber}): ${Object.values(numbers).join(', ') || 'no certificates'}`);
        } else {
            console.log(`${user.name || id} (${user.cardNumber}): ${oldCourse} course and ${oldProfile} profile numbers to put right`);
        }
    }
    console.log(`${changed} of ${ids.size} students ${apply ? 'renumbered' : 'to renumber (run with --apply)'}.`);
    await mongoose.disconnect();
})().catch((error) => { console.error(error); process.exit(1); });
