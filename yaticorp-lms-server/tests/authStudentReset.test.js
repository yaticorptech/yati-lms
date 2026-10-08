/**
 * The student "Forgot password?" link: only the token's hash is stored, a link
 * works once, a weak password does not use it up, and the answer to
 * "send me a link" is the same whether or not the card exists.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { connect, startApp, cleanup } = require('./helpers');

const mailer = require('../src/utils/emailService');
const sent = [];
mailer.sendEmail = async (msg) => { sent.push(msg); };

const User = require('../src/models/User');
const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const BCRYPT = /^\$2[aby]\$\d{2}\$/;
const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
let seq = 0;
const cardNo = () => `96${STAMP}${seq++}`;

let authApp;
const made = [];
const call = (path, body) => authApp.call(null)('POST', path, body);
const forgot = (cardNumber) => call('/student/forgot-password', { cardNumber });
const reset = (body) => call('/student/reset-password', body);
const login = (cardNumber, password) => call('/student/login', { cardNumber, password });
const stored = async (_id) => User.collection.findOne({ _id }, { projection: { password: 1, resetPasswordToken: 1, resetPasswordExpiry: 1 } });

const createStudent = async (password = 'Start-Pass1!') => {
    const user = await User.create({ name: 'Reset Student', email: `reset-${STAMP}-${seq}@example.com`, phone: '9999999999', cardNumber: cardNo(), password });
    made.push(user);
    return user;
};

/** Ask for a link and return the token from the email it sent. */
const requestLink = async (cardNumber) => {
    sent.length = 0;
    const r = await forgot(cardNumber);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const msg = sent.find((m) => /reset-password\?token=/.test(m.htmlContent));
    assert.ok(msg, 'a reset email was sent');
    return /reset-password\?token=([a-f0-9]+)/.exec(msg.htmlContent)[1];
};

before(async () => {
    await connect();
    authApp = startApp({ mount: '/api/auth', router: require('../src/routes/authRoutes') });
});

after(async () => { await cleanup(made, authApp.server); });

describe('student password reset link', () => {
    test('only the hash of the emailed token is stored, never the token, and the response never carries it', async () => {
        const user = await createStudent();
        sent.length = 0;
        const r = await forgot(user.cardNumber);
        assert.ok(!JSON.stringify(r.body).includes('token='), 'the link is not in the response');
        const token = /reset-password\?token=([a-f0-9]+)/.exec(sent[0].htmlContent)[1];
        const row = await stored(user._id);
        assert.notEqual(row.resetPasswordToken, token);
        assert.equal(row.resetPasswordToken, sha256(token));
        const ttl = new Date(row.resetPasswordExpiry).getTime() - Date.now();
        assert.ok(ttl > 55 * 60000 && ttl <= 60 * 60000, 'valid for an hour');
    });

    test('the link sets the new password, works once, and the old password stops working', async () => {
        const user = await createStudent('Old-Pass1!');
        const token = await requestLink(user.cardNumber);
        const ok = await reset({ token, newPassword: 'New-Pass1!' });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal(ok.body.message, 'Password reset successful. You can now log in.');
        const row = await stored(user._id);
        assert.match(row.password, BCRYPT);
        assert.equal(row.resetPasswordToken, undefined);
        assert.equal(row.resetPasswordExpiry, undefined);
        assert.equal((await login(user.cardNumber, 'New-Pass1!')).status, 200);
        assert.equal((await login(user.cardNumber, 'Old-Pass1!')).status, 401);

        const again = await reset({ token, newPassword: 'Other-Pass1!' });
        assert.equal(again.status, 400, 'a used link is refused');
        assert.equal((await login(user.cardNumber, 'New-Pass1!')).status, 200);
    });

    test('the same link sent twice at once changes the password only once', async () => {
        const user = await createStudent();
        const token = await requestLink(user.cardNumber);
        const results = await Promise.all([
            reset({ token, newPassword: 'Race-PassA1!' }),
            reset({ token, newPassword: 'Race-PassB1!' })
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    });

    test('the stored hash itself is not a working token', async () => {
        const user = await createStudent();
        const token = await requestLink(user.cardNumber);
        const r = await reset({ token: sha256(token), newPassword: 'Hash-Pass1!' });
        assert.equal(r.status, 400);
    });

    test('an expired link is refused', async () => {
        const user = await createStudent();
        const token = await requestLink(user.cardNumber);
        await User.collection.updateOne({ _id: user._id }, { $set: { resetPasswordExpiry: new Date(Date.now() - 1000) } });
        const r = await reset({ token, newPassword: 'Late-Pass1!' });
        assert.equal(r.status, 400);
    });

    test('asking again replaces the earlier link', async () => {
        const user = await createStudent();
        const first = await requestLink(user.cardNumber);
        const second = await requestLink(user.cardNumber);
        assert.equal((await reset({ token: first, newPassword: 'First-Pass1!' })).status, 400);
        assert.equal((await reset({ token: second, newPassword: 'Second-Pass1!' })).status, 200);
    });

    test('a weak password is refused without using up the link', async () => {
        const user = await createStudent();
        const token = await requestLink(user.cardNumber);
        const weak = await reset({ token, newPassword: 'short' });
        assert.equal(weak.status, 400);
        assert.match(weak.body.message, /at least 8 characters/);
        assert.equal((await reset({ token, newPassword: 'Strong-Pass1!' })).status, 200);
    });

    test('an operator object in place of a token matches nothing', async () => {
        const user = await createStudent('Keep-Pass1!');
        await requestLink(user.cardNumber);
        const r = await reset({ token: { $ne: null }, newPassword: 'Taken-Pass1!' });
        assert.equal(r.status, 400);
        assert.equal((await login(user.cardNumber, 'Keep-Pass1!')).status, 200, 'the password is unchanged');
    });

    test('the answer is the same for an unknown card, a card without email, and a real one', async () => {
        const real = await createStudent();
        const realReply = await forgot(real.cardNumber);

        const unknown = await forgot(`95${STAMP}`);

        const noEmail = await createStudent();
        await User.collection.updateOne({ _id: noEmail._id }, { $unset: { email: '' } });
        sent.length = 0;
        const noEmailReply = await forgot(noEmail.cardNumber);
        assert.equal(sent.length, 0, 'nothing is sent when there is no address');

        for (const r of [realReply, unknown, noEmailReply]) {
            assert.equal(r.status, 200);
            assert.deepEqual(r.body, realReply.body);
        }
    });

    test('an operator object in place of a card number sends nothing', async () => {
        await createStudent();
        sent.length = 0;
        const r = await forgot({ $ne: null });
        assert.equal(r.status, 200);
        assert.equal(sent.length, 0);
    });
});
