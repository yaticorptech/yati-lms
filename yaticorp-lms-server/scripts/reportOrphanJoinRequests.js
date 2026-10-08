/**
 * Report, and optionally remove, organization join requests (org_join_requests)
 * that point at a student account or an organization that no longer exists.
 *
 * Deleting a student from the platform admin used to leave their join requests
 * behind (adminUserController.deleteUser now removes them). Those rows were
 * already hidden from the organization's list, but they still counted in the
 * pending badge and the superadmin's "waiting" numbers, so the badge could say
 * 3 while the list showed 2.
 *
 *   node scripts/reportOrphanJoinRequests.js           # dry run: counts and a sample
 *   node scripts/reportOrphanJoinRequests.js --apply   # delete the orphaned rows
 *
 * Only rows whose user, or whose organization, is missing are touched. A row
 * for a live student and a live organization is never deleted, whatever its
 * status. Works on the raw collections so loading it builds no indexes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

(async () => {
    await connectDB();
    const db = mongoose.connection;
    const requests = db.collection('org_join_requests');

    const orphans = await requests.aggregate([
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
        { $lookup: { from: 'organizations', localField: 'organizationId', foreignField: '_id', as: 'o' } },
        { $match: { $or: [{ u: { $size: 0 } }, { o: { $size: 0 } }] } },
        { $project: { userId: 1, organizationId: 1, status: 1, createdAt: 1, missingUser: { $eq: [{ $size: '$u' }, 0] }, missingOrg: { $eq: [{ $size: '$o' }, 0] } } }
    ]).toArray();

    const total = await requests.countDocuments({});
    const byStatus = orphans.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

    console.log(`Join requests in total:        ${total}`);
    console.log(`Orphaned (user or org missing): ${orphans.length}`);
    console.log(`  missing student account:      ${orphans.filter((r) => r.missingUser).length}`);
    console.log(`  missing organization:         ${orphans.filter((r) => r.missingOrg).length}`);
    console.log(`  by status:                    ${JSON.stringify(byStatus)}`);
    for (const r of orphans.slice(0, 20)) {
        console.log(`  - ${r._id} status=${r.status} user=${r.userId}${r.missingUser ? ' (gone)' : ''} org=${r.organizationId}${r.missingOrg ? ' (gone)' : ''}`);
    }
    if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);

    if (!APPLY) {
        console.log('\nDry run — nothing changed. Re-run with --apply to delete the rows above.');
    } else if (orphans.length) {
        const result = await requests.deleteMany({ _id: { $in: orphans.map((r) => r._id) } });
        console.log(`\nDeleted ${result.deletedCount} orphaned join request(s).`);
    } else {
        console.log('\nNothing to delete.');
    }

    await mongoose.disconnect();
})().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
