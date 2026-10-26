/**
 * Verify cards → "Scan and verify": the admin's camera reads a card's QR code
 * and the card is verified on the spot. Super admins only; registered and
 * inactive cards are left as they are.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeAdmin, startApp, cleanup } = require('../helpers');
const Card = require('../../src/models/Card');

const STAMP = `${Date.now()}`.slice(-7);
let server, call, superAdmin, plainAdmin;
const cards = {};

before(async () => {
    await connect();
    ({ server, call } = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') }));
    plainAdmin = await makeAdmin('CardScan');
    superAdmin = await makeAdmin('CardScanSuper');
    await superAdmin.admin.updateOne({ role: 'superadmin' });
    const card = (n, over) => Card.create({ CardNumber: `97${STAMP}00${n}`, CVV: `C${n}`, qrCodeNumber: `SCN${STAMP}${n}`, status: 'unactivated', ...over });
    cards.waiting = await card(1, { verified: false });
    cards.verified = await card(2, { verified: true });
    cards.used = await card(3, { status: 'used', verified: false });
    cards.inactive = await card(4, { status: 'inactive', verified: false });
});

after(async () => {
    await Card.deleteMany({ _id: { $in: Object.values(cards).map((c) => c._id) } });
    await cleanup([], server, [plainAdmin.admin, superAdmin.admin]);
});

test('a scanned card is verified at once; the same card again says so', async () => {
    const as = call(superAdmin.token);
    const first = await as('POST', '/cards/scan', { code: cards.waiting.qrCodeNumber });
    assert.equal(first.status, 200);
    assert.equal(first.body.result, 'verified');
    assert.equal(first.body.cardNumber, cards.waiting.CardNumber);
    const saved = await Card.findById(cards.waiting._id).lean();
    assert.equal(saved.verified, true);
    assert.equal(saved.verifiedVia, 'admin');
    assert.equal((await as('POST', '/cards/scan', { code: cards.waiting.qrCodeNumber })).body.result, 'already_verified');
});

test('a QR that holds a link ending in the code, in lower case, still reads', async () => {
    const r = await call(superAdmin.token)('POST', '/cards/scan', { code: `https://yaticorp.com/card/${cards.verified.qrCodeNumber.toLowerCase()}` });
    assert.equal(r.body.result, 'already_verified');
});

test('registered and inactive cards are left as they are; an unknown code is not found', async () => {
    const as = call(superAdmin.token);
    assert.equal((await as('POST', '/cards/scan', { code: cards.used.qrCodeNumber })).body.result, 'registered');
    assert.equal((await as('POST', '/cards/scan', { code: cards.inactive.qrCodeNumber })).body.result, 'inactive');
    assert.equal((await Card.findById(cards.used._id).lean()).verified, false);
    assert.equal((await as('POST', '/cards/scan', { code: `NOPE${STAMP}` })).body.result, 'not_found');
    assert.equal((await as('POST', '/cards/scan', { code: '  ' })).status, 400);
});

test('only a super admin can scan', async () => {
    assert.equal((await call(plainAdmin.token)('POST', '/cards/scan', { code: cards.waiting.qrCodeNumber })).status, 403);
    assert.equal((await call(null)('POST', '/cards/scan', { code: cards.waiting.qrCodeNumber })).status, 401);
});
