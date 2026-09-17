/**
 * Enrol every student in every published bundle. Students already enrolled in
 * a bundle are left alone, so the script can be run again safely. Mirrors what
 * the admin "Assign" button does: an Enrollment row assigned by admin, and the
 * bundle added to the student's enrolledBundles.
 *
 *   node scripts/assignBundlesToAllUsers.js --dry-run     # report only, write nothing
 *   node scripts/assignBundlesToAllUsers.js               # enrol
 *   node scripts/assignBundlesToAllUsers.js --revert=<assignedAt ISO printed by a run>
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Bundle = require('../src/models/Bundle');
const Enrollment = require('../src/models/Enrollment');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const revert = (args.find(a => a.startsWith('--revert=')) || '').split('=')[1];

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    if (revert) {
        const at = new Date(revert);
        if (Number.isNaN(at.getTime())) throw new Error('--revert needs the assignedAt timestamp a previous run printed.');
        const rows = await Enrollment.find({ type: 'Bundle', assignedBy: 'admin', assignedAt: at }).lean();
        for (const r of rows) await User.updateOne({ _id: r.userId }, { $pull: { enrolledBundles: r.bundleId } });
        const res = await Enrollment.deleteMany({ _id: { $in: rows.map(r => r._id) } });
        console.log(`Reverted ${res.deletedCount} bundle enrolments assigned at ${at.toISOString()}.`);
        await mongoose.disconnect();
        return;
    }

    const bundles = await Bundle.find({ isPublished: true }).select('_id title').lean();
    const users = await User.find({}).select('_id').lean();
    const existing = await Enrollment.find({ type: 'Bundle', bundleId: { $in: bundles.map(b => b._id) } }).select('userId bundleId').lean();
    const have = new Set(existing.map(e => `${e.userId}|${e.bundleId}`));

    const assignedAt = new Date();
    const toCreate = [];
    for (const u of users) for (const b of bundles) {
        if (!have.has(`${u._id}|${b._id}`)) toCreate.push({ userId: u._id, bundleId: b._id, type: 'Bundle', assignedBy: 'admin', assignedAt });
    }

    console.log(`${bundles.length} published bundle(s): ${bundles.map(b => `${b.title} (${b._id})`).join(', ') || 'none'}`);
    console.log(`${users.length} user(s); ${have.size} bundle enrolment(s) already exist; ${toCreate.length} to create.`);
    if (dryRun || toCreate.length === 0) { console.log(dryRun ? 'Dry run: nothing written.' : 'Nothing to do.'); await mongoose.disconnect(); return; }

    let created = 0;
    for (let i = 0; i < toCreate.length; i += 500) {
        const chunk = toCreate.slice(i, i + 500);
        const res = await Enrollment.insertMany(chunk, { ordered: false });
        created += res.length;
        await User.bulkWrite(chunk.map(e => ({ updateOne: { filter: { _id: e.userId }, update: { $addToSet: { enrolledBundles: e.bundleId } } } })));
    }
    console.log(`Created ${created} bundle enrolment(s), assignedAt ${assignedAt.toISOString()}.`);
    console.log(`To undo: node scripts/assignBundlesToAllUsers.js --revert=${assignedAt.toISOString()}`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
