/**
 * GET /api/career/goals for a student with no goal yet: Career Path's own
 * screens get the 404 they look for, and a caller that asks with ?optional=1
 * (the Jobs search prefill) gets null instead of an error in the browser's
 * console (found testing Jobs, 2026-10-16).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let me, app, call;

before(async () => {
    await connect();
    me = await makeUser('GoalOptional');
    app = startApp({ mount: '/api/career/goals', router: require('../../src/career/routes/goalRoutes') });
    call = app.call(me.token);
});
after(async () => { await cleanup([me.user], app.server); });

test('no goal yet: still a 404 for Career Path', async () => {
    const r = await call('GET', '');
    assert.equal(r.status, 404);
});

test('no goal yet, asked as optional: an empty answer, not an error', async () => {
    const r = await call('GET', '?optional=1');
    assert.equal(r.status, 200);
    assert.equal(r.body, null);
});
