/**
 * The leaderboard tells the truth about streaks and levels, and pays the
 * students it shows.
 *
 *  - A streak that ended before yesterday is over: the board used the stored
 *    number, so a student who stopped weeks ago still showed "🔥 40 days".
 *  - Levels on the board are worked out from XP, not the stored level.
 *  - Weekly payouts rank active students only, as the board does: they ranked
 *    the raw ledger, so a deactivated account could take a paid place.
 *  - A payout run that died part-way is finished by the next run, paying only
 *    the winners not yet paid, and a top-10 week is never counted twice.
 *
 * The payout is run against a week in January 2001, so nobody outside this
 * test has XP in it; its job-run row is removed afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');

const User = require('../../src/models/User');
const { XpTransaction, Streak, RewardJobRun, RewardTransaction } = require('../../src/rewards/models');
const { getBoard, ranking } = require('../../src/rewards/services/leaderboardService');
const { payoutPeriod } = require('../../src/rewards/services/jobs');
const config = require('../../src/rewards/services/configService');
const { dayKey, addDays, periodWindow } = require('../../src/rewards/config/constants');

// A Wednesday; "last week" is Monday 1 – Sunday 7 January 2001.
const NOW = new Date('2001-01-10T06:00:00Z');
const LAST_WEEK = new Date('2001-01-03T06:00:00Z');
const JOB_KEY = `leaderboard:weekly:${periodWindow('weekly', NOW, -1).key}`;

let gone, first, second, live, lapsed;
const xpAt = (u, amount, createdAt, tag) => XpTransaction.collection.insertOne({ userId: u.user._id, amount, source: 'admin', refId: null, key: `test:${tag}:${u.user._id}`, courseId: null, description: 'test', balanceAfter: null, createdAt, updatedAt: createdAt });

before(async () => {
    await connect();
    config.invalidate();
    [gone, first, second, live, lapsed] = await Promise.all(['Gone', 'First', 'Second', 'Live', 'Lapsed'].map((n) => makeUser(`Board${n}`)));
    await User.updateOne({ _id: gone.user._id }, { $set: { status: 'inactive' } });
    await xpAt(gone, 900, LAST_WEEK, 'gone');
    await xpAt(first, 500, LAST_WEEK, 'first');
    await xpAt(second, 300, LAST_WEEK, 'second');
});
after(async () => {
    await RewardJobRun.deleteMany({ key: JOB_KEY });
    await cleanup([gone.user, first.user, second.user, live.user, lapsed.user]);
});

describe('the leaderboard', () => {
    test('a lapsed streak shows as 0; a streak still alive today or from yesterday shows its length', async () => {
        const today = dayKey();
        await Streak.create({ userId: live.user._id, current: 5, longest: 5, lastActivityDay: addDays(today, -1) });
        await Streak.create({ userId: lapsed.user._id, current: 40, longest: 40, lastActivityDay: addDays(today, -9) });
        const now = new Date();
        // Enough XP this week to sit in the top ten of the test database's board.
        await xpAt(live, 1_000_000, now, 'live-now');
        await xpAt(lapsed, 999_999, now, 'lapsed-now');
        await User.updateOne({ _id: live.user._id }, { $set: { xp: 1_000_000, level: 1 } });

        const board = await getBoard({ period: 'weekly', me: live.user, limit: 10 });
        const row = (u) => board.entries.find((e) => String(e.userId) === String(u.user._id));
        assert.equal(row(live).streak, 5);
        assert.equal(row(lapsed).streak, 0, 'a streak that ended nine days ago is over');
        assert.equal(row(live).level, config.levelFor(1_000_000, await config.getLevelThresholds()), 'the level is worked out from XP, not the stored 1');
    });

    test("a closed week ranks active students only, the way the board does", async () => {
        const rows = await ranking({ period: 'weekly', offset: -1, now: NOW });
        const ids = rows.map((r) => String(r.userId));
        assert.ok(!ids.includes(String(gone.user._id)), 'a deactivated account is not ranked');
        assert.deepEqual(ids.slice(0, 2), [String(first.user._id), String(second.user._id)]);
    });

    test('a run that died after its claim is finished by the next one, without paying or counting anyone twice', async () => {
        const rewards = (await config.getConfig()).leaderboardRewards.weekly;
        const prize = (rank) => rewards.find((r) => r.rank === rank)?.rewardPoints || 0;
        // The crashed run: claimed long ago, never finished. First place had
        // already been counted and paid before it stopped.
        await RewardJobRun.collection.insertOne({ key: JOB_KEY, result: {}, createdAt: new Date(Date.now() - 3600_000), updatedAt: new Date(Date.now() - 3600_000) });
        if (prize(1) > 0) await RewardTransaction.create({ userId: first.user._id, points: prize(1), source: 'leaderboard', claimKey: JOB_KEY, description: 'paid before the crash' });
        const week = periodWindow('weekly', NOW, -1).key;
        await Streak.create({ userId: first.user._id, top10Weeks: 1, top10WeekKeys: [week] });

        const paid = await payoutPeriod('weekly', { now: NOW });
        assert.ok(Array.isArray(paid), 'the stale run was resumed');
        const paidIds = paid.map((p) => String(p.userId));
        assert.ok(!paidIds.includes(String(first.user._id)), 'first place was already paid');
        assert.ok(!paidIds.includes(String(gone.user._id)), 'the deactivated account is never paid');
        if (prize(2) > 0) assert.ok(paidIds.includes(String(second.user._id)), 'second place, not reached before the crash, is paid now');
        assert.equal(await RewardTransaction.countDocuments({ userId: first.user._id, claimKey: JOB_KEY }), prize(1) > 0 ? 1 : 0);
        assert.equal((await Streak.findOne({ userId: first.user._id }).lean()).top10Weeks, 1, 'the week is counted once');
        const s2 = await Streak.findOne({ userId: second.user._id }).lean();
        assert.equal(s2.top10Weeks, 1);
        assert.equal(s2.bestWeeklyRank, 2, 'and the best rank is recorded (it stayed null under $min)');

        const run = await RewardJobRun.findOne({ key: JOB_KEY }).lean();
        assert.equal(typeof run.result.ranked, 'number', 'the run is marked finished');
        assert.equal(await payoutPeriod('weekly', { now: NOW }), null, 'and a finished run is not run again');
    });
});
