/**
 * One-off: give every certificate the numbered form YATI<card number>-NN,
 * where NN counts the student's certificates in the order they were issued.
 * Certificates issued before the sequence existed were all numbered
 * YATI<card number>, so a student with three courses had three identical
 * numbers. Certificates already carrying a suffix are renumbered too, so the
 * sequence per student is consistent with issue order.
 *
 *   node scripts/renumberCertificates.js --dry-run   # report only
 *   node scripts/renumberCertificates.js             # apply
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('../src/models/Certificate');
const User = require('../src/models/User');

const dryRun = process.argv.includes('--dry-run');

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const certs = await Certificate.find({}).sort({ issuedAt: 1, createdAt: 1, _id: 1 }).lean();
    const userIds = [...new Set(certs.map(c => String(c.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select('cardNumber').lean();
    const cardOf = new Map(users.map(u => [String(u._id), u.cardNumber]));

    const byUser = new Map();
    certs.forEach(c => { const k = String(c.userId); if (!byUser.has(k)) byUser.set(k, []); byUser.get(k).push(c); });

    const changes = [];
    for (const [uid, list] of byUser) {
        // Keep whatever base the student already has when there is no card:
        // the old number without its suffix, or a fresh code if there is none.
        const fallback = (list.find(c => c.certificateNumber)?.certificateNumber || '').replace(/-\d+$/, '').replace(/^YATI/, '')
            || Math.random().toString(36).substr(2, 6).toUpperCase();
        const base = `YATI${cardOf.get(uid) || fallback}`;
        list.forEach((c, i) => {
            const next = `${base}-${String(i + 1).padStart(2, '0')}`;
            if (c.certificateNumber !== next) changes.push({ _id: c._id, from: c.certificateNumber, to: next });
        });
    }

    console.log(`${certs.length} certificate(s) held by ${byUser.size} student(s); ${changes.length} to renumber.`);
    changes.slice(0, 20).forEach(ch => console.log(`  ${ch.from || '(none)'}  ->  ${ch.to}`));
    if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);
    if (dryRun || changes.length === 0) { console.log(dryRun ? 'Dry run: nothing written.' : 'Nothing to do.'); await mongoose.disconnect(); return; }

    const res = await Certificate.bulkWrite(changes.map(ch => ({ updateOne: { filter: { _id: ch._id }, update: { $set: { certificateNumber: ch.to } } } })));
    console.log(`Renumbered ${res.modifiedCount} certificate(s).`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
