/**
 * Edit Profile's details on the server: the same rules as the form, one
 * email per account in any capitals, refusals in words rather than a 500, and
 * only the fields sent are written.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const User = require('../../src/models/User');

let app, me, other, call;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Details');
    other = await makeUser('Other');
    call = app.call(me.token);
});

after(async () => { await cleanup([me.user, other.user], app.server); });

test("another student's email is refused in words, in any capitals", async () => {
    for (const email of [other.user.email, other.user.email.toUpperCase(), `  ${other.user.email}  `]) {
        const r = await call('PUT', '/profile', { email });
        assert.equal(r.status, 400, `${email}: ${JSON.stringify(r.body)}`);
        assert.equal(r.body.code, 'EMAIL_TAKEN');
        assert.equal(r.body.field, 'email');
        assert.match(r.body.message, /already uses this email/);
        assert.ok(!('error' in r.body), 'no database text in the answer');
    }
    assert.equal((await User.findById(me.user._id).lean()).email, me.user.email, 'my email is unchanged');
});

test('a new email is stored trimmed and lower-case', async () => {
    const fresh = `  Details.${Date.now()}@Example.COM `;
    const r = await call('PUT', '/profile', { email: fresh });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.email, fresh.trim().toLowerCase());
    assert.equal((await User.findById(me.user._id).lean()).email, fresh.trim().toLowerCase());
    // My own address in other capitals is still mine.
    assert.equal((await call('PUT', '/profile', { email: fresh.trim().toUpperCase() })).status, 200);
});

test('the form rules hold on the server too', async () => {
    const cases = [
        [{ name: '   ' }, 'name', /required/],
        [{ name: 'A' }, 'name', /at least 2/],
        [{ name: 'x'.repeat(61) }, 'name', /60 characters/],
        [{ email: 'not-an-email' }, 'email', /valid email/],
        [{ email: '' }, 'email', /required/],
        [{ phone: 'abc' }, 'phone', /7–15 digits/],
        [{ phone: '12345' }, 'phone', /7–15 digits/],
        [{ phone: '' }, 'phone', /required/]
    ];
    const before = await User.findById(me.user._id).lean();
    for (const [body, field, message] of cases) {
        const r = await call('PUT', '/profile', body);
        assert.equal(r.status, 400, `${JSON.stringify(body)} → ${JSON.stringify(r.body)}`);
        assert.equal(r.body.field, field);
        assert.match(r.body.message, message);
    }
    const now = await User.findById(me.user._id).lean();
    assert.deepEqual([now.name, now.email, now.phone], [before.name, before.email, before.phone], 'nothing was saved');
});

test('only the fields sent are written, trimmed', async () => {
    await User.updateOne({ _id: me.user._id }, { $set: { name: 'Server Side Name', phone: '9999999999' } });
    const r = await call('PUT', '/profile', { phone: ' +91 98765 43210 ' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const now = await User.findById(me.user._id).lean();
    assert.equal(now.phone, '+91 98765 43210');
    assert.equal(now.name, 'Server Side Name', 'the name nobody sent is left alone');
});

test('an older account missing a field the schema now requires can still edit', async () => {
    await User.collection.updateOne({ _id: me.user._id }, { $unset: { phone: '' } });
    const r = await call('PUT', '/profile', { name: 'Legacy Account' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await User.findById(me.user._id).lean()).name, 'Legacy Account');
    await User.updateOne({ _id: me.user._id }, { $set: { phone: '9999999999' } });
});

test('reading the profile tidies an email saved with capitals, unless that would clash', async () => {
    const mixed = `Tidy.${Date.now()}@Example.com`;
    await User.collection.updateOne({ _id: me.user._id }, { $set: { email: mixed } });
    const r = await call('GET', '/profile');
    assert.equal(r.status, 200);
    assert.equal(r.body.user.email, mixed.toLowerCase());
    assert.equal((await User.findById(me.user._id).lean()).email, mixed.toLowerCase());

    // Another account already has the tidy form: both are left as they are.
    await User.collection.updateOne({ _id: other.user._id }, { $set: { email: mixed.toLowerCase().replace('tidy', 'clash') } });
    const clash = mixed.replace('Tidy', 'Clash');
    await User.collection.updateOne({ _id: me.user._id }, { $set: { email: clash } });
    assert.equal((await call('GET', '/profile')).body.user.email, clash);
    assert.equal((await User.findById(me.user._id).lean()).email, clash, 'not merged by guesswork');
});
