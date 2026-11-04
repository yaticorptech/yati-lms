/** Group games earned in the solo games (src/competitions/services/unlocks.js): the levels each room size needs. */
const test = require('node:test');
const assert = require('node:assert');
const { needFor, SOLO, NEED } = require('../../src/competitions/services/unlocks');
const { ROOM_GAMES } = require('../../src/competitions/games');
const { GAME_IDS } = require('../../src/career/data/gameIds');

test('a bigger room needs more solo levels', () => {
    assert.strictEqual(needFor(2), 20);
    assert.strictEqual(needFor(4), 30);
    assert.strictEqual(needFor(20), 100);
    const sizes = Object.keys(NEED).map(Number).sort((a, b) => a - b);
    sizes.slice(1).forEach((n, i) => assert.ok(NEED[n] > NEED[sizes[i]], `${n} needs more than ${sizes[i]}`));
});

test('every group game has a solo twin the app ships (or counts the best solo game)', () => {
    for (const g of ROOM_GAMES) {
        assert.ok(g in SOLO, `${g} has no unlock rule`);
        if (SOLO[g]) assert.ok(GAME_IDS.includes(SOLO[g]), `${g} → ${SOLO[g]} is not a solo game`);
    }
});
