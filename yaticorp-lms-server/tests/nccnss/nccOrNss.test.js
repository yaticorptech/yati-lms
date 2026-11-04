/**
 * NCC or NSS, not both (2026-11-02, src/nccnss/corps.js): a student in one — or waiting for
 * one — cannot ask for the other; the organization cannot add them to it, nor approve a request
 * for it while they are active in the first. Scouts & Guides and clubs are unaffected, and a
 * membership that has ended does not count.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const { NccNssMember } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
let app, org, admin, asOrg, kids = [];

before(async () => {
    await connect();
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    org = await Organization.create({ orgCode: `TNN-${STAMP}`, name: `Corps College ${STAMP}`, organizationType: 'college', email: `tnn-${STAMP}@example.com`, status: 'active' });
    admin = await Admin.create({ name: 'Corps Admin', email: `tnn-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    asOrg = app.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
});

after(async () => {
    const ids = kids.map((k) => k._id);
    await NccNssMember.deleteMany({ userId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await Admin.deleteOne({ _id: admin._id });
    await Organization.deleteOne({ _id: org._id });
    await new Promise((r) => app.server.close(r));
    await mongoose.disconnect();
});

const student = async (n) => {
    const kid = await User.create({ name: `Cadet ${n}`, email: `tnn-${n}-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TNN${n}${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    kids.push(kid);
    return { kid, as: app.call(jwt.sign({ id: String(kid._id) }, process.env.JWT_SECRET, { expiresIn: '10m' })) };
};
const join = (s, scheme) => s.as('POST', '/student/nccnss/join', { scheme, year: 1 });

test('in NSS (or waiting for it): no request for NCC, and the other way round; Scouts & Guides still fine', async () => {
    const a = await student('a');
    assert.equal((await join(a, 'NSS')).status, 201, 'asks for NSS');
    const waiting = await join(a, 'NCC');
    assert.deepEqual([waiting.status, waiting.body.code], [409, 'NCC_OR_NSS']);
    assert.match(waiting.body.message, /You have asked to join NSS\. A student can be in NCC or NSS, not both/);
    const nss = await NccNssMember.findOne({ userId: a.kid._id, scheme: 'NSS' });
    assert.equal((await asOrg('PUT', `/me/nccnss/members/${nss._id}`, { status: 'active' })).status, 200);
    const joined = await join(a, 'NCC');
    assert.match(joined.body.message, /You are in NSS\. A student can be in NCC or NSS, not both: leave NSS before joining NCC/);
    assert.equal((await join(a, 'SCOUTS')).status, 201, 'Scouts & Guides alongside, as before');
});

test('the organization cannot add a student to NCC while they are in NSS, nor approve an old request', async () => {
    const b = await student('b');
    assert.equal((await asOrg('POST', '/me/nccnss/members', { userId: String(b.kid._id), scheme: 'NSS' })).status, 201);
    const add = await asOrg('POST', '/me/nccnss/members', { userId: String(b.kid._id), scheme: 'NCC' });
    assert.deepEqual([add.status, add.body.code], [409, 'NCC_OR_NSS']);
    assert.match(add.body.message, /This student is in NSS/);
    // A request from before the rule: waiting for NCC while active in NSS. It cannot be approved.
    const old = await NccNssMember.create({ organizationId: org._id, userId: b.kid._id, scheme: 'NCC', status: 'pending' });
    const approve = await asOrg('PUT', `/me/nccnss/members/${old._id}`, { status: 'active' });
    assert.deepEqual([approve.status, approve.body.code], [409, 'NCC_OR_NSS']);
    assert.equal((await asOrg('PUT', `/me/nccnss/members/${old._id}`, { status: 'rejected' })).status, 200, 'it can be turned down');
});

test('a membership that has ended does not count', async () => {
    const c = await student('c');
    await NccNssMember.create({ organizationId: org._id, userId: c.kid._id, scheme: 'NSS', status: 'completed', endedAt: new Date() });
    assert.equal((await join(c, 'NCC')).status, 201);
});
