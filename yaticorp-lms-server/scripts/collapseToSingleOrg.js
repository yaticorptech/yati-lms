/**
 * One-time cleanup to collapse the LMS to a single organization (YATICORP).
 *
 * What it does:
 *   1. Deletes all data belonging to any org other than YATICORP (orgId '1000').
 *   2. Removes orphaned enrollments (whose student no longer exists).
 *   3. Drops the now-unused `organizations` and `platformadmins` collections.
 *   4. Strips the `orgId` field from every remaining document.
 *   5. Removes all existing admins and creates ONE super admin.
 *
 * Usage:
 *   node scripts/collapseToSingleOrg.js --dry-run                 # preview only, no writes
 *   node scripts/collapseToSingleOrg.js                           # run with defaults below
 *   node scripts/collapseToSingleOrg.js ceo@yaticorp.com 12345678 "YATICORP Super Admin"
 */
const mongoose = require('mongoose');
require('dotenv').config();

const KEEP_ORG_ID = '1000'; // YATICORP
const DRY_RUN = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => a !== '--dry-run');
const ADMIN_EMAIL = args[0] || 'ceo@yaticorp.com';
const ADMIN_PASSWORD = args[1] || '12345678';
const ADMIN_NAME = args[2] || 'YATICORP Super Admin';

// Collections that carried an orgId
const ORG_SCOPED = ['users', 'courses', 'bundles', 'announcements', 'cards', 'communityposts', 'tickets'];

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        console.log(`Connected to: ${mongoose.connection.name}`);
        console.log(DRY_RUN ? '\n*** DRY RUN — no changes will be written ***\n' : '\nApplying changes...\n');

        const otherOrgFilter = { orgId: { $exists: true, $ne: KEEP_ORG_ID } };

        // 1. Delete data belonging to other orgs
        for (const coll of ORG_SCOPED) {
            const c = db.collection(coll);
            const n = await c.countDocuments(otherOrgFilter);
            console.log(`${coll}: ${n} doc(s) belong to other orgs`);
            if (!DRY_RUN && n > 0) await c.deleteMany(otherOrgFilter);
        }

        // 2. Remove orphaned enrollments (student deleted above)
        const remainingUserIds = (await db.collection('users').find({}, { projection: { _id: 1 } }).toArray()).map(u => u._id);
        const orphanFilter = { userId: { $nin: remainingUserIds } };
        const orphanCount = await db.collection('enrollments').countDocuments(orphanFilter);
        console.log(`enrollments: ${orphanCount} orphaned (no matching student)`);
        if (!DRY_RUN && orphanCount > 0) await db.collection('enrollments').deleteMany(orphanFilter);

        // 3. Drop unused collections
        for (const coll of ['organizations', 'platformadmins']) {
            const exists = (await db.listCollections({ name: coll }).toArray()).length > 0;
            console.log(`${coll}: ${exists ? 'will drop' : 'not present'}`);
            if (!DRY_RUN && exists) await db.collection(coll).drop();
        }

        // 4. Strip orgId from every remaining document
        for (const coll of ORG_SCOPED) {
            const c = db.collection(coll);
            const n = await c.countDocuments({ orgId: { $exists: true } });
            console.log(`${coll}: stripping orgId from ${n} doc(s)`);
            if (!DRY_RUN && n > 0) await c.updateMany({ orgId: { $exists: true } }, { $unset: { orgId: '' } });
        }

        // 5. Reset admins to a single super admin
        const adminCount = await db.collection('admins').countDocuments({});
        console.log(`admins: removing all ${adminCount}, then creating 1 super admin (${ADMIN_EMAIL})`);
        if (!DRY_RUN) {
            await db.collection('admins').deleteMany({});
            // Drop any stale indexes (e.g. the old email+orgId compound) so the model rebuilds them
            try { await db.collection('admins').dropIndexes(); } catch (e) { /* ignore if none */ }

            const Admin = require('../src/models/Admin');
            await Admin.syncIndexes();
            await Admin.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'superadmin' });

            const created = await Admin.findOne({ email: ADMIN_EMAIL });
            const ok = await created.matchPassword(ADMIN_PASSWORD);
            console.log(`\nSuper admin created: ${ADMIN_EMAIL} — password verification: ${ok ? 'OK' : 'FAILED'}`);
        }

        console.log(DRY_RUN ? '\nDry run complete — re-run without --dry-run to apply.' : '\nDone. The LMS now has a single organization and one super admin.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
