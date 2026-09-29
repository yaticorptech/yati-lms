/**
 * The rules for a playback save, without a database: what a body may say,
 * the update it turns into, and what a row looks like to the client.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parsePlaybackUpdate, updateFor, serialize, clientTime, MAX_SECONDS } = require('../../src/services/playbackService');

const L1 = '64b7f0c2a1d2e3f4a5b6c7d8';
const L2 = '64b7f0c2a1d2e3f4a5b6c7d9';
const NOW = Date.parse('2026-09-29T10:00:00.000Z');

describe('reading a save', () => {
    test('a position needs a real lesson id and a non-negative number of seconds', () => {
        assert.deepEqual(parsePlaybackUpdate({ lessonId: L1, seconds: 42.5, at: NOW - 1000 }, NOW),
            { lessonId: L1, seconds: 42.5, at: new Date(NOW - 1000) });
        assert.match(parsePlaybackUpdate({ lessonId: 'L1', seconds: 5 }, NOW).error, /lessonId/);
        assert.match(parsePlaybackUpdate({ seconds: 5 }, NOW).error, /lessonId/);
        assert.match(parsePlaybackUpdate({ lessonId: L1 }, NOW).error, /seconds/);
        assert.match(parsePlaybackUpdate({ lessonId: L1, seconds: -1 }, NOW).error, /seconds/);
        assert.match(parsePlaybackUpdate({ lessonId: L1, seconds: 'soon' }, NOW).error, /seconds/);
    });

    test('seconds are capped, since nothing is two days long', () => {
        assert.equal(parsePlaybackUpdate({ lessonId: L1, seconds: 1e9 }, NOW).seconds, MAX_SECONDS);
    });

    test('the open lesson can be saved alone, or with a position', () => {
        const alone = parsePlaybackUpdate({ activeLessonId: L2 }, NOW);
        assert.equal(alone.activeLessonId, L2);
        assert.equal(alone.lessonId, undefined);
        const both = parsePlaybackUpdate({ lessonId: L1, seconds: 3, activeLessonId: L2 }, NOW);
        assert.equal(both.lessonId, L1); assert.equal(both.activeLessonId, L2);
        assert.match(parsePlaybackUpdate({ activeLessonId: 'nope' }, NOW).error, /activeLessonId/);
    });

    test('an empty body is refused', () => {
        assert.match(parsePlaybackUpdate({}, NOW).error, /nothing/);
        assert.match(parsePlaybackUpdate(undefined, NOW).error, /nothing/);
        assert.match(parsePlaybackUpdate({ activeLessonId: null }, NOW).error, /nothing/);
    });

    test('a wrong clock is replaced with the server\'s', () => {
        assert.equal(clientTime(NOW - 60000, NOW).getTime(), NOW - 60000);
        assert.equal(clientTime('x', NOW).getTime(), NOW);
        assert.equal(clientTime(undefined, NOW).getTime(), NOW);
        assert.equal(clientTime(NOW + 10 * 60000, NOW).getTime(), NOW, 'ten minutes ahead');
        assert.equal(clientTime(NOW - 400 * 24 * 3600000, NOW).getTime(), NOW, 'over a year back');
    });
});

describe('the update it becomes', () => {
    test('a position is set under its lesson', () => {
        const at = new Date(NOW);
        assert.deepEqual(updateFor({ lessonId: L1, seconds: 42, at }),
            { $set: { [`positions.${L1}`]: { seconds: 42, at } } });
    });

    test('zero seconds removes the entry: the video was finished', () => {
        assert.deepEqual(updateFor({ lessonId: L1, seconds: 0, at: new Date(NOW) }),
            { $unset: { [`positions.${L1}`]: 1 } });
    });

    test('the open lesson carries its own time', () => {
        const at = new Date(NOW);
        assert.deepEqual(updateFor({ activeLessonId: L2, at }), { $set: { activeLessonId: L2, activeLessonAt: at } });
        assert.deepEqual(updateFor({ lessonId: L1, seconds: 0, activeLessonId: L2, at }),
            { $set: { activeLessonId: L2, activeLessonAt: at }, $unset: { [`positions.${L1}`]: 1 } });
    });
});

describe('what the client gets', () => {
    test('nothing saved yet is an empty answer, not a 404', () => {
        assert.deepEqual(serialize(null), { activeLessonId: null, activeLessonAt: null, positions: {} });
    });

    test('a lean row (plain object) and a document (Map) read the same', () => {
        const at = new Date(NOW);
        const plain = { activeLessonId: L2, activeLessonAt: at, positions: { [L1]: { seconds: 42, at } } };
        const withMap = { activeLessonId: L2, activeLessonAt: at, positions: new Map([[L1, { seconds: 42, at }]]) };
        const want = { activeLessonId: L2, activeLessonAt: NOW, positions: { [L1]: { seconds: 42, at: NOW } } };
        assert.deepEqual(serialize(plain), want);
        assert.deepEqual(serialize(withMap), want);
    });

    test('an entry at zero or with no number is left out', () => {
        const at = new Date(NOW);
        const row = { positions: { [L1]: { seconds: 0, at }, [L2]: { seconds: 'x', at } } };
        assert.deepEqual(serialize(row).positions, {});
    });
});
