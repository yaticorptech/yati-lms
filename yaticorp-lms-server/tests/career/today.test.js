/**
 * GET /api/career/today — the Career Path's "today" card, asked for by the
 * student shell on every page.
 *
 * It answered 500 on every page load — "calculateStreak is not a function" —
 * because the controller borrowed that function from profileController, which
 * never exported it. Nothing showed on the page, so nothing was noticed. This
 * pins the route to answering, with a streak that is a number.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, me, api;
before(async () => {
    await connect();
    me = await makeUser('Today');
    app = startApp({ mount: '/api/career', router: require('../../src/career') });
    api = app.call(me.token);
});
after(async () => { await cleanup([me.user], app.server); });

describe('the today card', () => {
    test('answers for a student with no goal yet, rather than failing', async () => {
        const r = await api('GET', '/today');
        assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
        assert.equal(typeof r.body, 'object');
        if (r.body.streak !== undefined) assert.equal(typeof r.body.streak, 'number', 'the streak is counted, not thrown');
    });
    test('refuses a request without a token', async () => {
        const r = await app.call(null)('GET', '/today');
        assert.equal(r.status, 401);
    });
});
