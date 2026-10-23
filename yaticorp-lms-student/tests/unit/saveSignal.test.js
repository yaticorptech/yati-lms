/**
 * The save signal (src/utils/saveSignal.js): every save that succeeds, on any
 * of the app's API clients, says so on the window, so the leaderboard climb
 * can follow XP the server pays without the page mentioning it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const heard = [];
globalThis.window = new EventTarget();
window.addEventListener('yati:saved', (e) => heard.push(e.detail.url));

const { onSaved } = await import('../../src/utils/saveSignal.js');

test('a successful save is announced with its url, and the response passes through untouched', () => {
    heard.length = 0;
    const response = { data: { ok: true }, config: { method: 'post', url: '/community' } };
    assert.equal(onSaved(response), response);
    onSaved({ data: {}, config: { method: 'PUT', url: '/user/profile' } });
    onSaved({ data: {}, config: { method: 'delete', url: '/community/p1' } });
    assert.deepEqual(heard, ['/community', '/user/profile', '/community/p1']);
});

test('a read is not a save, and a response without its request is left alone', () => {
    heard.length = 0;
    onSaved({ data: {}, config: { method: 'get', url: '/rewards/leaderboard' } });
    onSaved({ data: {}, config: { url: '/courses' } });
    assert.equal(onSaved(undefined), undefined);
    assert.deepEqual(heard, []);
});
