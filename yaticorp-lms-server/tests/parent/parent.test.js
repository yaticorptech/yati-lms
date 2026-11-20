/**
 * The parent dashboard (src/parent, 2026-11-19): a parent registers their own card, signs in with it (also through the
 * student sign-in, which hands a parent's card over), adds their child by the child's card number, and sees the child's
 * activity — read only, and only for a child on their list.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const Card = require('../../src/models/Card');
const User = require('../../src/models/User');

const digits = () => `98${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1e4)).padStart(4, '0')}`;
let api, studentAuth, child, other, card, card2, childCard, token;
const PASSWORD = 'Parent@2026x';

before(async () => {
    await connect();
    api = startApp({ mount: '/api/parent', router: require('../../src/parent') });
    const app = express(); app.use(express.json());
    app.post('/api/auth/login', require('../../src/controllers/userAuthController').loginUser);
    const server = app.listen(0);
    studentAuth = { server, login: (body) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() })) };
    child = await makeUser('Parent Child');
    other = await makeUser('Not Mine');
    childCard = digits();
    await User.updateOne({ _id: child.user._id }, { $set: { cardNumber: childCard } });
    card = await Card.create({ CardNumber: digits(), CVV: 'K7Q', qrCodeNumber: `QR${Date.now()}`, status: 'unactivated', verified: true, verifiedAt: new Date() });
    card2 = await Card.create({ CardNumber: digits(), CVV: 'Z1Z', qrCodeNumber: `QR2${Date.now()}`, status: 'unactivated', verified: false });
});

after(async () => {
    await Card.deleteMany({ _id: { $in: [card._id, card2._id] } });
    await require('../../src/career/models/Notification').deleteMany({ userId: child.user._id });
    await cleanup([child.user, other.user], api.server);
    studentAuth.server.close();
});

test('a parent registers their own card (no CVV): a real, verified, free card, one account per card', async () => {
    const base = { cardNumber: card.CardNumber, name: 'Asha Rao', phone: '98450 12345', password: PASSWORD };
    assert.equal((await api.call()('POST', '/auth/register', { ...base, cardNumber: '000011112222' })).body.code, 'CARD_INVALID', 'no such card');
    assert.equal((await api.call()('POST', '/auth/register', { ...base, cardNumber: card2.CardNumber })).body.code, 'CARD_NOT_VERIFIED');
    const r = await api.call()('POST', '/auth/register', base);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body.token);
    assert.equal(r.body.role, 'parent');
    assert.equal(r.body.password, undefined);
    const saved = await Card.findById(card._id).lean();
    assert.equal(saved.status, 'used');
    assert.equal((await api.call()('POST', '/auth/register', base)).body.code, 'CARD_USED');
});

test('signing in: with the card or the mobile number, and the student sign-in hands a parent card over', async () => {
    assert.equal((await api.call()('POST', '/auth/login', { login: card.CardNumber, password: 'nope' })).body.code, 'WRONG_PASSWORD');
    const byCard = await api.call()('POST', '/auth/login', { login: card.CardNumber, password: PASSWORD });
    assert.equal(byCard.status, 200);
    token = byCard.body.token;
    assert.equal((await api.call()('POST', '/auth/login', { login: '9845012345', password: PASSWORD })).status, 200, 'by mobile number');
    const handoff = await studentAuth.login({ login: card.CardNumber, password: PASSWORD });
    assert.equal(handoff.body.code, 'PARENT_CARD');
    // A student's token is not a parent's.
    assert.equal((await api.call(child.token)('GET', '/me')).status, 401);
});

test('adding a child by card number, seeing their activity; not someone else, not twice; the child is told', async () => {
    const me = api.call(token);
    assert.equal((await me('POST', '/children', { cardNumber: '1234' })).status, 400);
    assert.equal((await me('POST', '/children', { cardNumber: '000011112222' })).status, 404);
    assert.equal((await me('POST', '/children', { cardNumber: card.CardNumber })).status, 400, 'own card');
    const add = await me('POST', '/children', { cardNumber: childCard });
    assert.equal(add.status, 201, JSON.stringify(add.body));
    assert.equal(add.body.child.name, child.user.name);
    assert.equal((await me('POST', '/children', { cardNumber: childCard })).status, 409);
    const list = await me('GET', '/me');
    assert.deepEqual(list.body.children.map((c) => String(c._id)), [String(child.user._id)]);
    const page = await me('GET', `/children/${child.user._id}`);
    assert.equal(page.status, 200, JSON.stringify(page.body).slice(0, 300));
    for (const k of ['child', 'courses', 'rewards', 'timeline', 'quizzes', 'competitions', 'jobs', 'extraCurricular']) assert.ok(k in page.body, k);
    assert.equal((await me('GET', `/children/${other.user._id}`)).status, 404, 'not their child');
    await new Promise((r) => setTimeout(r, 200));
    const told = await require('../../src/career/models/Notification').findOne({ userId: child.user._id, title: 'A parent added you' }).lean();
    assert.ok(told, 'the child is told');
    assert.equal((await me('DELETE', `/children/${child.user._id}`)).status, 200);
    assert.equal((await me('GET', `/children/${child.user._id}`)).status, 404);
});

test('adding a child by scanning their card\'s QR code (2026-11-19); an unknown code is refused', async () => {
    const me = api.call(token);
    const childCardDoc = await Card.create({ CardNumber: childCard, CVV: 'A1A', qrCodeNumber: `QRC${Date.now()}`, status: 'used', verified: true });
    try {
        assert.equal((await me('POST', '/children', { code: 'NOT-A-CARD-123' })).status, 404);
        const r = await me('POST', '/children', { code: childCardDoc.qrCodeNumber });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(r.body.child.name, child.user.name);
        await me('DELETE', `/children/${child.user._id}`);
    } finally { await Card.deleteOne({ _id: childCardDoc._id }); }
});

test('an organization announces to parents: the parent of one of its students sees it, with the child it is for (2026-11-19)', async () => {
    const Organization = require('../../src/organizations/models/Organization');
    const { orgAdmin, parentsReached } = require('../../src/parent/announcements');
    const STAMP = Date.now();
    const org = await Organization.create({ orgCode: `TPAR-${STAMP}`, name: `Parent Notice College ${STAMP}`, organizationType: 'college', email: `org-par-${STAMP}@example.com`, status: 'active' });
    const app = express(); app.use(express.json());
    app.use('/o', (req, _res, nx) => { req.organization = org; req.admin = { name: 'Principal' }; nx(); }, orgAdmin);
    const server = app.listen(0);
    const o = (method, path, body) => fetch(`http://127.0.0.1:${server.address().port}/o${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const me = api.call(token);
    try {
        await User.updateOne({ _id: child.user._id }, { $set: { organizationId: org._id } });
        assert.equal((await me('POST', '/children', { cardNumber: childCard })).status, 201);
        assert.equal((await o('POST', '/', { title: '' })).status, 400);
        const sent = await o('POST', '/', { title: 'PTA meeting on Saturday', body: 'At 10 am in the main hall.', pinned: true });
        assert.equal(sent.status, 201, JSON.stringify(sent.body));
        assert.equal(await parentsReached(org._id), 1);
        const list = await o('GET', '/');
        assert.equal(list.body.announcements[0].title, 'PTA meeting on Saturday');
        const seen = await me('GET', '/announcements');
        assert.equal(seen.status, 200);
        const a = seen.body.announcements.find((x) => x.title === 'PTA meeting on Saturday');
        assert.ok(a, 'the parent sees it');
        assert.equal(a.organization, org.name);
        assert.deepEqual(a.for, [child.user.name]);
        assert.equal((await o('PUT', `/${a._id}`, { title: 'PTA meeting moved to Sunday', body: '', pinned: false })).status, 200);
        assert.ok((await me('GET', '/announcements')).body.announcements.some((x) => x.title === 'PTA meeting moved to Sunday'));
        assert.equal((await o('DELETE', `/${a._id}`)).status, 200);
        assert.ok(!(await me('GET', '/announcements')).body.announcements.some((x) => String(x._id) === String(a._id)));
    } finally {
        await me('DELETE', `/children/${child.user._id}`);
        await User.updateOne({ _id: child.user._id }, { $set: { organizationId: null } });
        await Organization.deleteOne({ _id: org._id });
        server.close();
    }
});
