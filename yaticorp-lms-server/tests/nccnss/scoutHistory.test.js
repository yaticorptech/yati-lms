/**
 * Memberships keep their history (src/nccnss/membership.js): a transfer
 * between units closes the old row and continues it in a new one; removing a
 * Scouts member keeps them under Former; leaving an organization closes its
 * places, and joining another continues them. Nothing a student did is lost.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const { ScoutUnit, NccNssMember, NccNssEvent, NccNssActivity } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
let app, orgA, orgB, adminA, adminB, kid, asA, asB, asKid, unitA1, unitA2, unitB;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    const mk = (c) => Organization.create({ orgCode: `TSH-${c}-${STAMP}`, name: `History ${c} ${STAMP}`, organizationType: 'school', email: `tsh-${c}-${STAMP}@example.com`, status: 'active' });
    orgA = await mk('a'); orgB = await mk('b');
    const admin = (o, c) => Admin.create({ name: `Admin ${c}`, email: `tsh-admin-${c}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: o._id });
    adminA = await admin(orgA, 'a'); adminB = await admin(orgB, 'b');
    kid = await User.create({ name: 'Moving Scout', email: `tsh-kid-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSH${STAMP}`, password: 'Passw0rd!x', organizationId: orgA._id });
    const t = (id) => jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
    asA = app.call(t(adminA._id)); asB = app.call(t(adminB._id)); asKid = app.call(t(kid._id));
    unitA1 = await ScoutUnit.create({ organizationId: orgA._id, name: 'A Troop', section: 'scouts' });
    unitA2 = await ScoutUnit.create({ organizationId: orgA._id, name: 'A Crew', section: 'rovers' });
    unitB = await ScoutUnit.create({ organizationId: orgB._id, name: 'B Troop', section: 'scouts' });
});

after(async () => {
    const orgs = [orgA._id, orgB._id];
    await Promise.all([
        ScoutUnit.deleteMany({ organizationId: { $in: orgs } }),
        NccNssMember.deleteMany({ userId: kid._id }),
        NccNssEvent.deleteMany({ organizationId: { $in: orgs } }),
        NccNssActivity.deleteMany({ userId: kid._id }),
        User.deleteOne({ _id: kid._id }),
        Admin.deleteMany({ _id: { $in: [adminA._id, adminB._id] } }),
        Organization.deleteMany({ _id: { $in: orgs } })
    ]);
    await new Promise((r) => app.server.close(r));
    await mongoose.disconnect();
});

const M = '/me/nccnss/members';
const live = () => NccNssMember.findOne({ userId: kid._id, status: { $in: ['active', 'pending'] } });

test('a transfer closes the old row with its record and continues it in the new unit', async () => {
    const added = await asA('POST', M, { userId: String(kid._id), scheme: 'SCOUTS', unitId: String(unitA1._id) });
    assert.equal(added.status, 201);
    const first = added.body.member._id;
    await asA('POST', '/me/nccnss/activities', { memberId: first, title: 'Knots', hours: 2, kind: 'other' });
    const ev = await asA('POST', '/me/nccnss/events', { scheme: 'SCOUTS', unitId: String(unitA1._id), title: 'Meet', date: new Date(Date.now() - 60000).toISOString(), hours: 1 });
    await asA('PUT', `/me/nccnss/events/${ev.body.event._id}/attendance`, { presentMemberIds: [first] });

    // Changing the unit in place is refused: that would lose the record.
    assert.equal((await asA('PUT', `${M}/${first}`, { unitId: String(unitA2._id) })).status, 409);
    const moved = await asA('POST', `${M}/${first}/transfer`, { unitId: String(unitA2._id) });
    assert.equal(moved.status, 201);
    const old = await NccNssMember.findById(first);
    assert.equal(old.status, 'transferred');
    assert.equal(String(old.transferredTo), moved.body.member._id);
    assert.equal(String(moved.body.member.transferredFrom), first);
    assert.equal(await NccNssActivity.countDocuments({ memberId: first }), 1);

    // Re-saving that event's attendance keeps the moved row's mark.
    await asA('PUT', `/me/nccnss/events/${ev.body.event._id}/attendance`, { presentMemberIds: [] });
    assert.deepEqual((await NccNssEvent.findById(ev.body.event._id)).presentMemberIds.map(String), [first]);

    const detail = await asA('GET', `${M}/${moved.body.member._id}`);
    assert.equal(detail.body.history.length, 1);
    assert.equal(detail.body.history[0].unit, 'A Troop');
    assert.equal(detail.body.history[0].hours, 3);
});

test('removing a Scouts member keeps them under Former; adding them again continues the record', async () => {
    const current = await live();
    const removed = await asA('DELETE', `${M}/${current._id}`);
    assert.equal(removed.status, 200);
    assert.equal((await NccNssMember.findById(current._id)).status, 'left');
    const former = await asA('GET', `${M}?scheme=SCOUTS&status=former`);
    assert.equal(former.body.members.length, 2);
    const again = await asA('POST', M, { userId: String(kid._id), scheme: 'SCOUTS', unitId: String(unitA1._id) });
    assert.equal(again.status, 201);
    assert.equal(String(again.body.member.transferredFrom), String(current._id));
});

test('leaving an organization closes its places; joining another continues them', async () => {
    assert.equal((await asA('DELETE', `/me/students/${kid._id}`)).status, 200);
    assert.equal(await NccNssMember.countDocuments({ userId: kid._id, status: { $in: ['active', 'pending'] } }), 0);
    await User.updateOne({ _id: kid._id }, { $set: { organizationId: orgB._id } });
    const join = await asKid('POST', '/student/nccnss/join', { scheme: 'SCOUTS', unitId: String(unitB._id) });
    assert.equal(join.status, 201);
    const row = await NccNssMember.findById(join.body.memberId);
    assert.equal(String(row.organizationId), String(orgB._id));
    assert.ok(row.transferredFrom);
    const mine = await asKid('GET', '/student/nccnss');
    assert.equal(mine.body.memberships.length, 1);
    assert.ok(mine.body.history.length >= 3);
    assert.ok(mine.body.history.every((h) => h.organization.startsWith('History a')));
});

test('a place left open at an old organization is closed, not overwritten, when they join a new one', async () => {
    // As before this change: a live row at A while the student is in B.
    await NccNssMember.deleteMany({ userId: kid._id, organizationId: orgB._id });
    const stale = await NccNssMember.create({ organizationId: orgA._id, userId: kid._id, scheme: 'NSS', status: 'active' });
    const added = await asB('POST', M, { userId: String(kid._id), scheme: 'NSS' });
    assert.equal(added.status, 201);
    assert.equal(String(added.body.member.organizationId), String(orgB._id));
    const old = await NccNssMember.findById(stale._id);
    assert.equal(old.status, 'left');
    assert.equal(String(old.organizationId), String(orgA._id));
});
