/**
 * READ-ONLY report: organizations whose email and whose admin's sign-in email
 * have drifted apart, and admin sign-ins that are not stored the way the login
 * now compares them (trimmed, lower-case, unique regardless of case).
 *
 * Until 2026-10-07 editing an organization's email changed the Organization
 * only, leaving its orgadmin signing in with the old address. New edits write
 * both (src/organizations/services/orgEmail.js); this lists anything an older
 * edit left behind so a person can decide which address is right. It never
 * writes — there is no --apply, because which of the two addresses the
 * organization actually uses is not something a script can know.
 *
 * Also counts student passwords still stored in plain text. Those need no
 * action: each is hashed the next time that student signs in (models/User.js).
 *
 *   node scripts/reportOrgEmailMismatch.js
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

(async () => {
    const { connectDB } = require('../src/config/db');
    await connectDB();
    const db = mongoose.connection.db;

    const organizations = await db.collection('organizations')
        .find({}, { projection: { name: 1, orgCode: 1, email: 1, status: 1 } }).toArray();
    const admins = await db.collection('admins')
        .find({}, { projection: { email: 1, role: 1, organizationId: 1 } }).toArray();

    const byOrg = new Map();
    for (const a of admins) {
        if (a.role !== 'orgadmin' || !a.organizationId) continue;
        const key = String(a.organizationId);
        if (!byOrg.has(key)) byOrg.set(key, []);
        byOrg.get(key).push(a);
    }

    const lower = (v) => String(v || '').trim().toLowerCase();
    const mismatched = [];
    const noAccount = [];
    const severalAccounts = [];
    for (const o of organizations) {
        const linked = byOrg.get(String(o._id)) || [];
        if (!linked.length) { noAccount.push(o); continue; }
        if (linked.length > 1) severalAccounts.push({ o, linked });
        if (!linked.some((a) => lower(a.email) === lower(o.email))) mismatched.push({ o, linked });
    }

    const notNormalized = admins.filter((a) => a.email !== lower(a.email));
    const groups = new Map();
    for (const a of admins) {
        const k = lower(a.email);
        groups.set(k, [...(groups.get(k) || []), a]);
    }
    const caseDuplicates = [...groups.entries()].filter(([, list]) => list.length > 1);

    const users = db.collection('users');
    const totalUsers = await users.countDocuments();
    const hashedUsers = await users.countDocuments({ password: { $regex: /^\$2[aby]\$\d{2}\$/ } });

    console.log('\n── Organization email vs. its admin sign-in (read-only) ──');
    console.log(`Organizations: ${organizations.length}   Admin accounts: ${admins.length}`);
    console.log(`Email differs from the admin sign-in: ${mismatched.length}`);
    for (const { o, linked } of mismatched) {
        console.log(`  - ${o.name} [${o.orgCode}] (${o.status}) org=${o.email}  sign-in=${linked.map((a) => a.email).join(', ')}  orgId=${o._id}`);
    }
    console.log(`No admin account at all: ${noAccount.length}`);
    for (const o of noAccount) console.log(`  - ${o.name} [${o.orgCode}] orgId=${o._id}`);
    console.log(`More than one admin account: ${severalAccounts.length}`);
    for (const { o, linked } of severalAccounts) console.log(`  - ${o.name} [${o.orgCode}]: ${linked.map((a) => a.email).join(', ')}`);

    console.log('\n── Admin sign-in emails ──');
    console.log(`Not stored trimmed and lower-case: ${notNormalized.length}`);
    for (const a of notNormalized) console.log(`  - ${JSON.stringify(a.email)} (${a.role}) id=${a._id}`);
    console.log(`Same address in different case: ${caseDuplicates.length}`);
    for (const [k, list] of caseDuplicates) console.log(`  - ${k}: ${list.map((a) => `${a.email} (${a.role}, ${a._id})`).join('; ')}`);

    console.log('\n── Student passwords ──');
    console.log(`Hashed: ${hashedUsers} of ${totalUsers}. The other ${totalUsers - hashedUsers} are hashed automatically at each student's next sign-in.`);

    console.log('\nNothing was changed.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
