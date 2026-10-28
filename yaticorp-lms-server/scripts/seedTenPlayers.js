/**
 * A finished test competition with ten players, to see the competition
 * pop-up's participants list (asked 2026-10-28): "[TEST] Ten Players Code
 * Clash", five colleges (neworg among them, so its coordinator sees it under
 * Take part), a team of two from each, results published with 1st, 2nd and
 * 3rd. The ten students are made too (cards 999900000101–110, password below).
 *
 *   node scripts/seedTenPlayers.js            # create or replace it
 *   node scripts/seedTenPlayers.js --remove   # delete it and the ten students
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Competition = require('../src/competitions/models/Competition');
const Team = require('../src/competitions/models/Team');

const NAME = '[TEST] Ten Players Code Clash';
const PASSWORD = 'Test@1234';
const PLAYERS = ['Aarav Sharma', 'Diya Patel', 'Rohan Gupta', 'Ananya Iyer', 'Kabir Singh', 'Meera Nair', 'Arjun Reddy', 'Isha Kulkarni', 'Vihaan Joshi', 'Sara Thomas']
    .map((name, i) => ({ name, cardNumber: `9999000001${String(i + 1).padStart(2, '0')}`, email: `test.ten${i + 1}@yaticorp-test.invalid` }));

const main = async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const old = await Competition.findOne({ name: NAME }).select('_id').lean();
    if (old) { await Team.deleteMany({ competitionId: old._id }); await Competition.deleteOne({ _id: old._id }); }
    if (process.argv.includes('--remove')) {
        await User.deleteMany({ cardNumber: { $in: PLAYERS.map((p) => p.cardNumber) } });
        console.log('Removed the test competition and its ten students.');
        return mongoose.disconnect();
    }
    // Five colleges: neworg first, then four other active ones (not the test suite's).
    const db = mongoose.connection.db.collection('organizations');
    const neworg = await db.findOne({ name: 'neworg' });
    const others = await db.find({ status: 'active', name: { $not: /\d{8,}$/ }, ...(neworg ? { _id: { $ne: neworg._id } } : {}) }).project({ name: 1 }).sort({ _id: -1 }).limit(neworg ? 4 : 5).toArray();
    const orgs = [neworg, ...others].filter(Boolean).slice(0, 5);
    if (orgs.length < 5) throw new Error('Five active organizations are needed.');

    const users = [];
    for (const [i, p] of PLAYERS.entries()) {
        let u = await User.findOne({ cardNumber: p.cardNumber });
        if (!u) u = new User({ ...p, phone: `90000011${String(i).padStart(2, '0')}` });
        Object.assign(u, { name: p.name, status: 'active', organizationId: orgs[Math.floor(i / 2)]._id, password: PASSWORD });
        await u.save({ validateBeforeSave: false });
        users.push(u);
    }
    const day = 86400e3; const now = Date.now();
    const c = await Competition.create({
        name: NAME, organizedBy: 'YATICORP', description: 'A test competition with ten players, made by scripts/seedTenPlayers.js.',
        game: 'codeclash', registrationOpensAt: new Date(now - 4 * day), registrationDeadline: new Date(now - 3 * day), startsAt: new Date(now - 2 * day),
        maxTeams: 8, playersPerTeam: 2, playersPerSide: 1, teamsPerMatch: 4, rules: 'Standard rules of the game.',
        prizes: [{ place: 1, title: 'Winner', xp: 300, rewardPoints: 100 }, { place: 2, title: 'Runner-up', xp: 200, rewardPoints: 50 }, { place: 3, title: 'Third place', xp: 100, rewardPoints: 25 }],
        participationXp: 10, certificates: true, participationCertificates: true,
        status: 'completed', completedAt: new Date(now - 2 * day + 3600e3), resultsPublishedAt: new Date(now - day)
    });
    const teams = await Team.insertMany(orgs.map((o, k) => ({
        competitionId: c._id, organizationId: o._id, collegeName: o.name, teamName: `${o.name} Coders`,
        players: users.slice(k * 2, k * 2 + 2).map((u) => ({ userId: u._id, name: u.name })),
        coordinator: { name: 'Test Coordinator', phone: '9876543210' },
        status: 'approved', reviewedAt: new Date(), place: k < 3 ? k + 1 : null
    })));
    await Competition.updateOne({ _id: c._id }, { $set: { winners: teams.slice(0, 3).map((t, k) => ({ place: k + 1, teamId: t._id })) } });
    console.log(`Made "${NAME}" with ${users.length} students in ${orgs.length} colleges: ${orgs.map((o) => o.name).join(', ')}.`);
    console.log(`Students sign in with cards ${PLAYERS[0].cardNumber}–${PLAYERS.at(-1).cardNumber}, password ${PASSWORD}.`);
    return mongoose.disconnect();
};
main().catch((e) => { console.error(e.message); process.exit(1); });
