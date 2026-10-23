/**
 * The leaderboard climb popup is shown for a place better than any already
 * celebrated this week — not at every swap when two students trade places
 * (asked 2026-10-23: "why is this coming again and again").
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rankUpSince } from '../../src/components/rewards/rankPlaces.js';

// A stand-in for the browser's storage.
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; }
};
beforeEach(() => store.clear());
const WEEK = 'weekly:2026-W43';

test('the first look only remembers the place', () => {
    assert.equal(rankUpSince('u1', WEEK, 5), null);
});

test('a climb is celebrated once; trading places with another student after that is not', () => {
    rankUpSince('u1', WEEK, 2);
    assert.deepEqual(rankUpSince('u1', WEEK, 1), { from: 2, to: 1 });
    assert.equal(rankUpSince('u1', WEEK, 2), null, 'overtaken: nothing');
    assert.equal(rankUpSince('u1', WEEK, 1), null, '#1 again: already celebrated this week');
    assert.equal(rankUpSince('u1', WEEK, 2), null);
    assert.equal(rankUpSince('u1', WEEK, 1), null);
});

test('a new best place is still celebrated, from the place last seen', () => {
    rankUpSince('u1', WEEK, 9);
    assert.deepEqual(rankUpSince('u1', WEEK, 6), { from: 9, to: 6 });
    assert.equal(rankUpSince('u1', WEEK, 8), null);
    assert.equal(rankUpSince('u1', WEEK, 7), null, 'back up, but not past #6');
    assert.deepEqual(rankUpSince('u1', WEEK, 4), { from: 7, to: 4 }, 'past #6: a new best');
});

test('a browser that kept only a number still works; a new week starts afresh; each student apart', () => {
    store.set(`rw:rank:u1:${WEEK}`, '3');
    assert.deepEqual(rankUpSince('u1', WEEK, 2), { from: 3, to: 2 });
    assert.equal(rankUpSince('u1', 'weekly:2026-W44', 1), null, 'a new week: first look');
    assert.equal(store.has(`rw:rank:u1:${WEEK}`), false, 'last week cleared');
    assert.equal(rankUpSince('u2', 'weekly:2026-W44', 1), null);
});
