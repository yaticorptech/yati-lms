/**
 * An organization adds a student with their card (Students → Add student):
 * the card must be verified, is claimed once, and the student is the
 * organization's member at once. The card is looked up the way the popup
 * does it (validate-qr): by card number typed, or by QR code scanned.
 *
 * And Students → Scan cards: many cards checked one by one, then added
 * together: a free card is linked (its student joins on registering), a
 * registered student with no organization joins now.
 */
// No real email: the welcome is captured.
const sent = [];
require('../../src/utils/emailService').sendEmail = async (msg) => { sent.push(msg); };
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, startApp } = require('../helpers');
const mongoose = require('mongoose');
const Card = require('../../src/models/Card');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');

const STAMP = `${Date.now()}`.slice(-7);
let orgApp, authApp, org, orgAdmin, asOrg;
const cards = {};

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    authApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    org = await Organization.create({ orgCode: `TADD-${STAMP}`, name: `Add Student College ${STAMP}`, organizationType: 'college', email: `org-add-${STAMP}@example.com`, status: 'active', logo: 'https://cdn.example.com/x.png' });
    orgAdmin = await Admin.create({ name: 'Add Admin', email: `orgadmin-add-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    asOrg = orgApp.call(jwt.sign({ id: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    const card = (n, over) => Card.create({ CardNumber: `96${STAMP}00${n}`, CVV: `AB${n}CD`, qrCodeNumber: `ADD${STAMP}${n}`, status: 'unactivated', verified: true, ...over });
    cards.good = await card(1);
    cards.unverified = await card(2, { verified: false });
    cards.free = await card(3);
    cards.held = await card(4, { status: 'used' });
    cards.otherOrg = await card(5, { organizationId: new mongoose.Types.ObjectId() });
    cards.toRegister = await card(6);
    // A student who registered with `held` and belongs to no organization.
    await User.create({ name: 'Ravi Kumar', email: `ravi-${STAMP}@example.com`, phone: '9845012346', cardNumber: cards.held.CardNumber, password: 'Study-Pass1!' });
});

after(async () => {
    const users = await User.find({ cardNumber: { $in: Object.values(cards).map((c) => c.CardNumber) } }).select('_id').lean();
    await mongoose.connection.db.collection('orgauditlogs').deleteMany({ orgId: org._id }).catch(() => {});
    await User.deleteMany({ _id: { $in: users.map((u) => u._id) } });
    await Card.deleteMany({ _id: { $in: Object.values(cards).map((c) => c._id) } });
    await Admin.deleteOne({ _id: orgAdmin._id });
    await Organization.deleteOne({ _id: org._id });
    await new Promise((r) => authApp.server.close(r));
    await new Promise((r) => orgApp.server.close(r));
    await mongoose.disconnect();
});

const student = (card, over = {}) => ({
    name: 'Asha Rao', email: `asha-${STAMP}@example.com`, phone: '98450 12345', password: 'Study-Pass1!',
    CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber, ...over
});

test('the card is found by its number or its QR code; an unverified card is refused', async () => {
    const byNumber = await authApp.call(null)('POST', '/validate-qr', { cardNumber: cards.good.CardNumber });
    assert.equal(byNumber.status, 200);
    assert.equal(byNumber.body.cvv, cards.good.CVV);
    assert.equal((await authApp.call(null)('POST', '/validate-qr', { qrCodeNumber: cards.good.qrCodeNumber })).body.cardNumber, cards.good.CardNumber);
    assert.notEqual((await authApp.call(null)('POST', '/validate-qr', { cardNumber: cards.unverified.CardNumber })).status, 200);
});

test('a student is added with a verified card, is the organization’s member, and is emailed', async () => {
    const r = await asOrg('POST', '/me/students', student(cards.good));
    assert.equal(r.status, 201);
    const saved = await User.findById(r.body._id).lean();
    assert.equal(String(saved.organizationId), String(org._id));
    assert.ok(saved.organizationJoinedAt);
    assert.equal(saved.email, `asha-${STAMP}@example.com`);
    assert.equal((await Card.findById(cards.good._id).lean()).status, 'used');
    assert.ok(sent.some((m) => m.to === saved.email && /Add Student College/.test(m.subject)));
    const list = await asOrg('GET', '/me/students', undefined);
    assert.ok((list.body.students || []).some((s) => String(s._id) === String(saved._id)), 'in the Students list');
});

test('the same card twice, an unverified card, and form mistakes are refused by field', async () => {
    const again = await asOrg('POST', '/me/students', student(cards.good, { email: `other-${STAMP}@example.com` }));
    assert.equal(again.status, 400);
    assert.equal(again.body.field, 'card');
    const unverified = await asOrg('POST', '/me/students', student(cards.unverified, { email: `u-${STAMP}@example.com` }));
    assert.equal(unverified.body.field, 'card');
    assert.equal(unverified.body.code, 'CARD_NOT_VERIFIED');
    assert.equal((await Card.findById(cards.unverified._id).lean()).status, 'unactivated', 'the card is not used up');
    assert.equal((await asOrg('POST', '/me/students', student(cards.unverified, { email: 'not-an-email' }))).body.field, 'email');
    assert.equal((await asOrg('POST', '/me/students', student(cards.unverified, { password: 'weak' }))).body.field, 'password');
    assert.equal((await asOrg('POST', '/me/students', student(cards.unverified, { CVV: 'WRONG' }))).body.field, 'card');
    assert.equal((await orgApp.call(null)('POST', '/me/students', student(cards.unverified))).status, 401);
});

test('scanned cards are checked one by one: what adding each would do', async () => {
    const check = async (code) => (await asOrg('POST', '/me/cards/check', { code })).body;
    assert.deepEqual([(await check(cards.free.qrCodeNumber)).result, (await check(cards.free.qrCodeNumber)).addable], ['ready', true]);
    assert.equal((await check(cards.free.CardNumber.replace(/(\d{4})(?=\d)/g, '$1 '))).result, 'ready', 'a number typed with spaces');
    const held = await check(cards.held.qrCodeNumber);
    assert.equal(held.result, 'student');
    assert.equal(held.studentName, 'Ravi Kumar');
    assert.equal((await check(cards.unverified.qrCodeNumber)).result, 'not_verified');
    assert.equal((await check(cards.otherOrg.qrCodeNumber)).result, 'linked_elsewhere');
    assert.equal((await check(cards.good.qrCodeNumber)).result, 'member', 'the student added earlier');
    assert.equal((await check(`NOPE${STAMP}`)).result, 'not_found');
});

test('adding them links the free cards and brings the registered student in; the rest are left', async () => {
    const r = await asOrg('POST', '/me/cards', { codes: [cards.free.qrCodeNumber, cards.held.CardNumber, cards.unverified.qrCodeNumber, cards.toRegister.qrCodeNumber, cards.free.CardNumber] });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.summary, { linked: 2, joined: 1, skipped: 1 });
    assert.equal(String((await Card.findById(cards.free._id).lean()).organizationId), String(org._id));
    assert.equal((await Card.findById(cards.unverified._id).lean()).organizationId, null);
    const ravi = await User.findOne({ cardNumber: cards.held.CardNumber }).lean();
    assert.equal(String(ravi.organizationId), String(org._id));
    assert.equal((await asOrg('POST', '/me/cards/check', { code: cards.free.qrCodeNumber })).body.result, 'linked');
});

test('a student who registers with a linked card joins the organization at once', async () => {
    const r = await authApp.call(null)('POST', '/register', {
        name: 'Meera Iyer', email: `meera-${STAMP}@example.com`, phone: '9845012347', password: 'Study-Pass1!',
        CardNumber: cards.toRegister.CardNumber, CVV: cards.toRegister.CVV, qrCodeNumber: cards.toRegister.qrCodeNumber
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.organization.joined, true);
    const meera = await User.findById(r.body._id).lean();
    assert.equal(String(meera.organizationId), String(org._id));
});

test('another organization\'s card cannot be added as a student here', async () => {
    const r = await asOrg('POST', '/me/students', student(cards.otherOrg, { email: `x-${STAMP}@example.com` }));
    assert.equal(r.body.field, 'card');
    assert.equal(r.body.code, 'CARD_OTHER_ORG');
});

test('the scanned cards are listed: waiting ones, and registered ones with their student', async () => {
    const r = await asOrg('GET', '/me/cards', undefined);
    assert.equal(r.status, 200);
    const by = (card) => r.body.cards.find((c) => c.cardNumber === card.CardNumber);
    assert.equal(by(cards.free).state, 'waiting');
    assert.equal(by(cards.toRegister).state, 'registered');
    assert.equal(by(cards.toRegister).student.name, 'Meera Iyer');
    assert.equal(by(cards.toRegister).student.member, true);
    assert.equal(by(cards.held).student.name, 'Ravi Kumar', 'a student brought in by their card is listed too');
    assert.equal(by(cards.unverified), undefined);
    assert.equal(r.body.waiting, 1);
});

test('a waiting card can be unlinked; a registered one cannot', async () => {
    assert.equal((await asOrg('DELETE', `/me/cards/${cards.toRegister._id}`, undefined)).status, 404);
    assert.equal((await asOrg('DELETE', `/me/cards/${cards.free._id}`, undefined)).status, 200);
    assert.equal((await Card.findById(cards.free._id).lean()).organizationId, null);
    assert.equal((await asOrg('GET', '/me/cards', undefined)).body.cards.some((c) => c.cardNumber === cards.free.CardNumber), false);
});

test('a student the website made with a linked card joins when they sign in, and leaves the waiting list', async () => {
    const card = await Card.create({ CardNumber: `96${STAMP}009`, CVV: 'WEB9X', qrCodeNumber: `ADD${STAMP}9`, status: 'unactivated', verified: true });
    cards.web = card;
    // The website's sync makes the account without marking the card used.
    const user = await User.create({ name: 'Kavya Shetty', email: `kavya-${STAMP}@example.com`, phone: '9845012349', cardNumber: card.CardNumber, password: 'Study-Pass1!' });
    assert.equal((await asOrg('POST', '/me/cards/check', { code: card.qrCodeNumber })).body.result, 'student', 'a card someone holds is theirs, not waiting');
    await Card.updateOne({ _id: card._id }, { $set: { organizationId: org._id, organizationLinkedAt: new Date() } });
    const userApp = startApp({ mount: '/api/user', router: require('../../src/routes/authRoutes') });
    try {
        const login = await userApp.call(null)('POST', '/student/login', { cardNumber: card.CardNumber, password: 'Study-Pass1!' });
        assert.equal(login.status, 200);
    } finally { await new Promise((r) => userApp.server.close(r)); }
    assert.equal(String((await User.findById(user._id).lean()).organizationId), String(org._id));
    const listed = (await asOrg('GET', '/me/cards', undefined)).body.cards.find((c) => c.cardNumber === card.CardNumber);
    assert.equal(listed.student.name, 'Kavya Shetty');
});
