/**
 * Sign-up step 1 accepts the card number printed on the card, as well as the
 * QR code a scan reads; both answer with the card's details and its QR code,
 * which registration still sends.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, startApp } = require('../helpers');
const Card = require('../../src/models/Card');

const STAMP = `${Date.now()}`.slice(-6);
const NUMBER = `9900${STAMP}00`;      // 12 digits
let app, call, card, used;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    call = app.call(null);
    card = await Card.create({ CardNumber: NUMBER, CVV: 'T1E2S', qrCodeNumber: `QRTEST${STAMP}`, status: 'activated' });
    used = await Card.create({ CardNumber: `9901${STAMP}00`, CVV: 'T1E2S', qrCodeNumber: `QRUSED${STAMP}`, status: 'used' });
});

after(async () => {
    await Card.deleteMany({ _id: { $in: [card._id, used._id] } });
    await new Promise((r) => app.server.close(r));
    await require('mongoose').disconnect();
});

test('a typed card number finds the card, with spaces or without', async () => {
    for (const typed of [NUMBER, NUMBER.replace(/(\d{4})(?=\d)/g, '$1 ')]) {
        const r = await call('POST', '/validate-qr', { cardNumber: typed });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.cardNumber, NUMBER);
        assert.equal(r.body.cvv, 'T1E2S');
        assert.equal(r.body.qrCodeNumber, `QRTEST${STAMP}`, 'the QR code comes back for registration');
    }
});

test('a scanned QR code still works', async () => {
    const r = await call('POST', '/validate-qr', { qrCodeNumber: `qrtest${STAMP}` });
    assert.equal(r.status, 200);
    assert.equal(r.body.cardNumber, NUMBER);
});

test('a wrong, short or used card number is refused with a plain message', async () => {
    const wrong = await call('POST', '/validate-qr', { cardNumber: `9999${STAMP}99` });
    assert.equal(wrong.status, 404);
    assert.match(wrong.body.message, /No card has that number/);
    const short = await call('POST', '/validate-qr', { cardNumber: '1234' });
    assert.equal(short.status, 400);
    assert.match(short.body.message, /12 digits/);
    const taken = await call('POST', '/validate-qr', { cardNumber: `9901${STAMP}00` });
    assert.equal(taken.status, 400);
    assert.match(taken.body.message, /card number has already been used/);
    const empty = await call('POST', '/validate-qr', {});
    assert.equal(empty.status, 400);
});
