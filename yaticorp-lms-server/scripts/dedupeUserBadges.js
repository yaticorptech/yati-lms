/**
 * Collapse duplicate Career Path XP badges (career_user_badges) to one row per
 * { userId, badgeId }, keeping the earliest, then build the unique index the
 * model now declares.
 *
 * Run this BEFORE deploying the UserBadge unique index. Mongoose builds a
 * declared index on startup, and the build fails while duplicates exist — the
 * server keeps running, but without the index, so the race that made the
 * duplicates stays open.
 *
 *   node scripts/dedupeUserBadges.js           # dry run: report only
 *   node scripts/dedupeUserBadges.js --apply   # delete duplicates, build index
 *
 * Works on the raw collection rather than the model, so loading this script
 * never itself triggers the index build it is preparing for.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

(async () => {
    await connectDB();
    const badges = mongoose.connection.collection('career_user_badges');

    const groups = await badges.aggregate([
        // Earliest first, so the first id in each group is the one kept. _id
        // breaks ties, and orders rows written before timestamps existed.
        { $sort: { createdAt: 1, _id: 1 } },
        { $group: { _id: { userId: '$userId', badgeId: '$badgeId' }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } }
    ]).toArray();

    const extra = groups.flatMap((g) => g.ids.slice(1));
    const students = new Set(groups.map((g) => String(g._id.userId))).size;
    console.log(`${groups.length} duplicated badge(s) across ${students} student(s); ${extra.length} extra row(s).`);

    if (!APPLY) {
        console.log('Dry run — nothing changed. Re-run with --apply to delete the extra rows and build the index.');
    } else {
        if (extra.length) {
            const { deletedCount } = await badges.deleteMany({ _id: { $in: extra } });
            console.log(`Deleted ${deletedCount} duplicate row(s), keeping the earliest of each.`);
        }
        await badges.createIndex({ userId: 1, badgeId: 1 }, { unique: true });
        console.log('Unique index { userId, badgeId } is in place.');
    }

    await mongoose.disconnect();
})().catch(async (e) => {
    console.error(e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
