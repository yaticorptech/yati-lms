/**
 * Sample learners for the leaderboard, so a new student sees a ladder to climb
 * instead of an empty table.
 *
 * These are real accounts in the database, not rows faked at render time: they
 * rank through the same XP ledger as everybody else, and an administrator sees
 * them in the user list. Their addresses end in `.invalid`, a reserved domain
 * that can never receive mail, and each carries a long random password, so
 * nobody can sign in as one or mistake one for a real student.
 *
 * They sit below every real learner, so they fill the two rows under the
 * podium and a student earning XP passes them straight away. Editing the
 * LEARNERS list and re-running is enough: any sample account no longer listed
 * is deleted, so the board holds exactly the learners named here.
 *
 *   node scripts/seedDemoLeaderboard.js            # create or refresh them
 *   node scripts/seedDemoLeaderboard.js --remove   # delete them again
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const mongoose = require('mongoose');

const REMOVE = process.argv.includes('--remove');
const DOMAIN = 'demo.invalid';                       // reserved: mail can never reach it
const LEVELS = [0, 100, 300, 600, 1000, 1600, 2500, 3600, 4900, 6400];
const levelFor = (xp) => LEVELS.filter((t) => xp >= t).length;
const oid = (key) => new mongoose.Types.ObjectId(crypto.createHash('md5').update(key).digest('hex').slice(0, 24));
const dayKey = (d) => d.toISOString().slice(0, 10);

/**
 * Each learner's XP is split across a few days of this week, so the weekly,
 * monthly and all-time boards all show them, and the streak matches the days
 * they were active.
 */
const LEARNERS = [
    { handle: 'aarav.menon', name: 'Aarav Menon', xp: 15, streak: 3, badge: null },
    { handle: 'sneha.pai', name: 'Sneha Pai', xp: 10, streak: 2, badge: null }
];
const ids = LEARNERS.map((l) => oid(`demo-learner:${l.handle}`));

/** Split an amount into `n` plausible awards, largest first, summing exactly. */
const split = (total, n) => {
    const out = []; let left = total;
    for (let i = 0; i < n - 1; i++) { const take = Math.max(5, Math.round((left / (n - i)) * (i % 2 ? 0.8 : 1.2) / 5) * 5); out.push(Math.min(take, left - 5 * (n - i - 1))); left -= out[out.length - 1]; }
    out.push(left);
    return out;
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
    const db = mongoose.connection.db;
    const users = db.collection('users');

    if (REMOVE) {
        const removed = {};
        for (const name of (await db.listCollections().toArray()).map((c) => c.name).filter((n) => n !== 'users')) {
            const n = (await db.collection(name).deleteMany({ userId: { $in: ids } })).deletedCount;
            if (n) removed[name] = n;
        }
        removed.users = (await users.deleteMany({ _id: { $in: ids } })).deletedCount;
        console.log('Removed the sample learners:', removed);
        await mongoose.disconnect();
        return;
    }

    // Anything left from a previous, longer list goes: re-running should leave
    // exactly the learners named above, not add to them.
    const stale = (await users.find({ email: new RegExp(`@${DOMAIN.replace('.', '\\.')}$`) }).project({ _id: 1 }).toArray())
        .map((u) => u._id).filter((id) => !ids.some((keep) => String(keep) === String(id)));
    if (stale.length) {
        for (const name of (await db.listCollections().toArray()).map((c) => c.name).filter((n) => n !== 'users')) {
            await db.collection(name).deleteMany({ userId: { $in: stale } });
        }
        await users.deleteMany({ _id: { $in: stale } });
        console.log(`Removed ${stale.length} sample learner${stale.length === 1 ? '' : 's'} no longer listed.`);
    }

    const now = new Date();
    const SOURCES = ['lesson_complete', 'quiz_pass', 'daily_activity', 'course_complete'];
    for (const [i, learner] of LEARNERS.entries()) {
        const _id = ids[i];
        await users.updateOne(
            { _id },
            {
                $set: { name: learner.name, email: `${learner.handle}@${DOMAIN}`, status: 'active', xp: learner.xp, level: levelFor(learner.xp), updatedAt: now },
                $setOnInsert: {
                    phone: `90000000${String(i).padStart(2, '0')}`,
                    cardNumber: `DEMO${String(i + 1).padStart(4, '0')}`,
                    // Long and random: these accounts exist to be listed, never to be signed into.
                    password: crypto.randomBytes(24).toString('hex'),
                    credits: 0, profilePicture: '', createdAt: now, __v: 0
                }
            },
            { upsert: true }
        );

        // The XP ledger the board actually ranks on, spread over recent days.
        await db.collection('rewards_xp_transactions').deleteMany({ userId: _id });
        const amounts = split(learner.xp, Math.min(4, Math.max(2, learner.streak)));
        const rows = amounts.map((amount, k) => {
            const at = new Date(now.getTime() - (k + 1) * 18 * 3600_000);
            return { _id: oid(`demo-xp:${learner.handle}:${k}`), userId: _id, amount, source: SOURCES[k % SOURCES.length], courseId: null, day: dayKey(at), createdAt: at, updatedAt: at, __v: 0 };
        });
        await db.collection('rewards_xp_transactions').insertMany(rows);

        const days = Array.from({ length: learner.streak }, (_, k) => dayKey(new Date(now.getTime() - k * 86_400_000))).reverse();
        await db.collection('rewards_streaks').updateOne(
            { userId: _id },
            { $set: { current: learner.streak, longest: learner.streak, activeDays: days, lastActivityDay: days[days.length - 1], runStartDay: days[0], top10Weeks: 0, updatedAt: now }, $setOnInsert: { claimedMilestones: [], bestWeeklyRank: null, createdAt: now, __v: 0 } },
            { upsert: true }
        );

        if (learner.badge) {
            await db.collection('rewards_user_badges').updateOne(
                { userId: _id, badgeKey: learner.badge },
                { $setOnInsert: { userId: _id, badgeKey: learner.badge, unlockedAt: now, createdAt: now, updatedAt: now, __v: 0 } },
                { upsert: true }
            );
        }
    }
    console.log(`Seeded ${LEARNERS.length} sample learners: ${LEARNERS.map((l) => `${l.name} ${l.xp}xp`).join(', ')}.`);
    console.log(`They are ordinary accounts at @${DOMAIN} — visible to an administrator, impossible to sign in as, and removable with --remove.`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
