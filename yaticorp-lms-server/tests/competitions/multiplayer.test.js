/**
 * The 84-game catalogue's multiplayer map (games/multiplayer.js, 2026-11-14): every key a catalogue game (read from
 * the student app's catalog.js), every value a room game, played in that game's section; and the student app's copy
 * (career/components/games/multiplayer.js) the same map. Also the student zones.js GROUP_ZONES / GROUP_TWIN in step
 * with the server's.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const { MULTIPLAYER } = require('../../src/competitions/games/multiplayer');
const { ROOM_GAMES } = require('../../src/competitions/games');
const { GROUP_ZONES } = require('../../src/competitions/games/zones');

const STUDENT = path.resolve(__dirname, '../../../yaticorp-lms-student/src/career/components/games');
const load = (file) => import(pathToFileURL(path.join(STUDENT, file)).href);

test('every catalogue game with a room game maps to a room game played in its section', async () => {
    const { CATALOG } = await load('catalog.js');
    const byId = Object.fromEntries(CATALOG.map((g) => [g.id, g]));
    assert.equal(CATALOG.length, 84);
    assert.ok(Object.keys(MULTIPLAYER).length >= 11);
    for (const [gameId, room] of Object.entries(MULTIPLAYER)) {
        assert.ok(byId[gameId], `${gameId} is not in the catalogue`);
        assert.ok(ROOM_GAMES.includes(room), `${room} is not a room game`);
        assert.ok((GROUP_ZONES[room] || []).includes(byId[gameId].section), `${room} is not played in ${byId[gameId].section} (${gameId})`);
    }
    // Since 2026-11-17 every group game is played in all three sections (the user), so each covers its solo game's.
});

test('the student app has the same map, and the same group zones', async () => {
    const student = await load('multiplayer.js');
    assert.deepEqual(student.MULTIPLAYER, MULTIPLAYER);
    const zones = await load('zones.js');
    assert.deepEqual(zones.GROUP_ZONES, GROUP_ZONES);
    assert.deepEqual(Object.keys(zones.GROUP_TWIN).sort(), Object.keys(GROUP_ZONES).sort());
    for (const [gameId, room] of Object.entries(MULTIPLAYER)) assert.ok(zones.GROUP_TWIN[room], `${room} has a twin (${gameId})`);
});
