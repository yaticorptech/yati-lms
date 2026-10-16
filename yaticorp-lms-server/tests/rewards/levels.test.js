/**
 * Levels follow XP under the admin's ladder, everywhere.
 *
 * The stored User.level was only written when XP was added, so an admin who
 * edited the level thresholds left every student on their old level until
 * they next earned something — the sidebar, the leaderboard and the dashboard
 * banner (stored level) disagreed with the header (worked out from XP). And
 * two awards landing together could leave the level of the smaller total, or
 * both celebrate the same level-up. These pin the repair: a ladder save (and
 * the first scheduled run after a start) brings stored levels back in line,
 * addXp derives the level from the final XP, and the helpers other modules
 * use read the ladder in force.
 *
 * The rulebook is one shared document: the one ladder edit here is confined
 * to the top rung and put back at once.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');

const User = require('../../src/models/User');
const config = require('../../src/rewards/services/configService');
const { addXp } = require('../../src/rewards/services/xpService');

let a, b, c, ladder;
const levelOf = async (u) => (await User.findById(u.user._id).select('level').lean()).level;

before(async () => {
    await connect();
    config.invalidate();
    ladder = await config.getLevelThresholds();
    [a, b, c] = await Promise.all([makeUser('LevelsA'), makeUser('LevelsB'), makeUser('LevelsC')]);
});
after(async () => {
    await config.levelsSettled();
    await cleanup([a.user, b.user, c.user]);
});

describe('levels', () => {
    test('a stored level that lags the ladder is recomputed from XP, inside the table and past it', async () => {
        const top = ladder[ladder.length - 1];
        const gap = top - ladder[ladder.length - 2];
        const xpIn = ladder[2] + 1;                 // level 3
        const xpPast = top + gap * 2 + 1;           // two levels past the table
        await User.updateOne({ _id: a.user._id }, { $set: { xp: xpIn, level: 1 } });
        await User.updateOne({ _id: b.user._id }, { $set: { xp: xpPast, level: 1 } });
        await User.updateOne({ _id: c.user._id }, { $set: { xp: 0, level: 7 } });

        await config.recomputeLevels();

        assert.equal(await levelOf(a), 3);
        assert.equal(await levelOf(b), ladder.length + 2);
        assert.equal(await levelOf(c), 1, 'no XP is level 1, whatever was stored');
        assert.equal(await levelOf(b), config.levelFor(xpPast, ladder), 'the same answer as levelFor');
    });

    test('saving a new ladder moves stored levels without anyone earning XP', async () => {
        const top = ladder[ladder.length - 1];
        // Only the top rung moves (and back), so nobody outside this test is
        // levelled differently for more than a moment.
        await User.updateOne({ _id: a.user._id }, { $set: { xp: top + 1, level: ladder.length } });
        const raised = [...ladder.slice(0, -1), top + 50];
        try {
            await config.updateConfig({ levelThresholds: raised });
            await config.levelsSettled();
            assert.equal(await levelOf(a), ladder.length - 1, 'below the raised top rung now');
        } finally {
            await config.updateConfig({ levelThresholds: ladder });
            await config.levelsSettled();
            config.invalidate();
        }
        assert.equal(await levelOf(a), ladder.length, 'and back on it once the ladder is restored');
    });

    test('two awards at once: the level follows the final XP, and only one of them levels up', async () => {
        const start = ladder[1] - 10;               // 10 short of level 2
        await User.updateOne({ _id: c.user._id }, { $set: { xp: start, level: 1 } });
        const results = await Promise.all([
            addXp({ userId: c.user._id, amount: 5, source: 'admin', silent: true }),
            addXp({ userId: c.user._id, amount: 10, source: 'admin', silent: true })
        ]);
        const after = await User.findById(c.user._id).select('xp level').lean();
        assert.equal(after.xp, start + 15);
        assert.equal(after.level, 2);
        assert.equal(results.filter((r) => r.leveledUp).length, 1, 'one level-up celebrated, not two');
    });

    test('the helpers other modules use read the ladder in force', async () => {
        assert.deepEqual(await config.getLevelThresholds(), ladder);
        assert.equal(await config.xpForLevel(1), 0);
        assert.equal(await config.xpForLevel(3), ladder[2]);
        assert.equal(await config.xpForLevel(ladder.length + 1), config.levelFloor(ladder.length + 1, ladder));
        assert.equal(await config.levelForUser({ xp: ladder[4] }), 5);
        assert.equal(await config.levelForUser(ladder[1] - 1), 1);
    });
});
