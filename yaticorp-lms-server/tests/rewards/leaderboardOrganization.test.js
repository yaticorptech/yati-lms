/**
 * The leaderboard card's Global / My Organization choice (asked 2026-10-27):
 * the organization board ranks only the students of the student's own
 * organization; Global ranks everyone. The board says which organization the
 * student is in, so the card offers the choice only to a student who has one.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');
const User = require('../../src/models/User');
const Organization = require('../../src/organizations/models/Organization');
const { XpTransaction } = require('../../src/rewards/models');
const { getBoard } = require('../../src/rewards/services/leaderboardService');

const STAMP = `${Date.now()}`.slice(-7);
let org, first, second, outsider;
const xpNow = (u, amount, tag) => XpTransaction.collection.insertOne({ userId: u.user._id, amount, source: 'admin', refId: null, key: `test:org-board:${tag}:${u.user._id}`, courseId: null, description: 'test', balanceAfter: null, createdAt: new Date(), updatedAt: new Date() });
const ids = (rows) => rows.map((e) => String(e.userId));

before(async () => {
    await connect();
    org = await Organization.create({ orgCode: `TLB-${STAMP}`, name: `Board College ${STAMP}`, organizationType: 'college', email: `org-lb-${STAMP}@example.com`, status: 'active', logo: 'https://cdn.example.com/x.png' });
    [first, second, outsider] = await Promise.all(['First', 'Second', 'Outsider'].map((n) => makeUser(`OrgBoard${n}`)));
    await User.updateMany({ _id: { $in: [first.user._id, second.user._id] } }, { $set: { organizationId: org._id } });
    first.user.organizationId = org._id;
    second.user.organizationId = org._id;
    // The outsider out-earns them both: on Global they are above, on the organization board absent.
    await xpNow(outsider, 3_000_000, 'outsider');
    await xpNow(first, 2_000_000, 'first');
    await xpNow(second, 1_000_000, 'second');
});

after(async () => {
    await XpTransaction.deleteMany({ key: /^test:org-board:/ });
    await Organization.deleteOne({ _id: org._id });
    await cleanup([first.user, second.user, outsider.user]);
});

test('My Organization ranks only the students of the organization', async () => {
    const board = await getBoard({ period: 'weekly', scope: 'organization', me: second.user, limit: 500 });
    assert.equal(board.scope, 'organization');
    assert.deepEqual(ids(board.entries), [String(first.user._id), String(second.user._id)]);
    assert.equal(board.me.rank, 2);
    assert.equal(board.organization.name, org.name);
});

test('Global still ranks everyone, outsiders included', async () => {
    const board = await getBoard({ period: 'weekly', scope: 'global', me: second.user, limit: 500 });
    const shown = ids(board.entries);
    for (const u of [outsider, first, second]) assert.ok(shown.includes(String(u.user._id)));
    assert.ok(shown.indexOf(String(outsider.user._id)) < shown.indexOf(String(first.user._id)));
    assert.equal(board.organization.name, org.name, 'the card knows to offer My Organization');
});

test('a student of no organization has no organization board', async () => {
    const board = await getBoard({ period: 'weekly', scope: 'organization', me: outsider.user, limit: 500 });
    assert.equal(board.entries.length, 0);
    assert.equal(board.organization, null);
    assert.equal((await getBoard({ period: 'weekly', scope: 'global', me: outsider.user, limit: 500 })).organization, null);
});
