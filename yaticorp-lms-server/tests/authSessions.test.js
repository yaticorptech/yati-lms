/**
 * Student sessions, sign-up and the administrator's view-as-student.
 *
 *   - changing or resetting a password ends every session signed in with the
 *     old one (User.passwordChangedAt), and the change itself needs the
 *     current password and a strong new one — with form mistakes as 400s,
 *     because the student app reads a 401 as an ended session
 *   - PUT /user/profile neither changes the password nor hands out a token
 *   - signing in counts with $inc, so an old record that fails today's
 *     validation still signs in
 *   - "view as student" travels as a two-minute, single-use code that only the
 *     exchange turns into the two-hour session
 *   - sign-up takes a card whether it reads 'unactivated' or 'activated',
 *     answers in the login's shape, and names the step that owns a failure
 *   - the sign-up scan reads what the sign-in scan reads
 *   - wrong passwords are limited per card, not just per classroom IP
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { connect, startApp, cleanup } = require('./helpers');

const mailer = require('../src/utils/emailService');
mailer.sendEmail = async () => {};

const User = require('../src/models/User');
const Card = require('../src/models/Card');
const Admin = require('../src/models/Admin');

// Twelve-digit card numbers unique to this run: a prefix, eight digits of
// the clock and a two-digit counter.
const STAMP = `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`.slice(-8);
let seq = 0;
const cardNo = () => `96${STAMP}${String(seq++).padStart(2, '0')}`;
const uniqueCardNo = () => `95${STAMP}${String(seq++).padStart(2, '0')}`;

let authApp, userApp, adminApp, superAdmin, superToken;
const made = [];
const cards = [];

const signToken = (user, extra = {}, opts = { expiresIn: '10m' }) => jwt.sign({ id: String(user._id), ...extra }, process.env.JWT_SECRET, opts);
const createStudent = async (password = 'Start-Pass1!') => {
    const user = await User.create({ name: 'Session Student', email: `session-${STAMP}-${seq++}@example.com`, phone: '9999999999', cardNumber: uniqueCardNo(), password });
    made.push(user);
    return user;
};
/** Remember an account a sign-up made, for cleanup. */
const keep = (r) => { if (r.body?._id) made.push({ _id: r.body._id }); return r; };
const login = (cardNumber, password) => authApp.call(null)('POST', '/student/login', { cardNumber, password });

before(async () => {
    await connect();
    authApp = startApp({ mount: '/api/auth', router: require('../src/routes/authRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../src/routes/userRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../src/routes/adminRoutes') });
    superAdmin = await Admin.create({ name: 'Session Super', email: `session-super-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'superadmin' });
    superToken = jwt.sign({ id: String(superAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
});

after(async () => {
    await Card.deleteMany({ _id: { $in: cards.map((c) => c._id) } });
    await require('../src/models/AdminAccessCode').deleteMany({ adminId: superAdmin._id });
    await require('../src/organizations/models/JoinRequest').deleteMany({ userId: { $in: made.map((u) => u._id) } }).catch(() => {});
    for (const app of [userApp, adminApp]) await new Promise((r) => app.server.close(r));
    await cleanup(made, authApp.server, [superAdmin]);
});

describe('a password change ends the sessions signed in with the old one', () => {
    test('the emailed reset: the old token is refused, a new sign-in works', async () => {
        const user = await createStudent('Before-Reset1!');
        const old = signToken(user, {}, { expiresIn: '10m' });
        // A token from a moment ago, so it is clearly older than the change.
        const older = jwt.sign({ id: String(user._id), iat: Math.floor(Date.now() / 1000) - 30 }, process.env.JWT_SECRET, { expiresIn: '10m' });
        assert.equal((await userApp.call(old)('GET', '/profile')).status, 200, 'works before');

        const raw = `reset${STAMP}`;
        await User.updateOne({ _id: user._id }, { $set: { resetPasswordToken: crypto.createHash('sha256').update(raw).digest('hex'), resetPasswordExpiry: new Date(Date.now() + 60000) } });
        const r = await authApp.call(null)('POST', '/student/reset-password', { token: raw, newPassword: 'After-Reset1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));

        const refused = await userApp.call(older)('GET', '/profile');
        assert.equal(refused.status, 401);
        assert.equal(refused.body.code, 'PASSWORD_CHANGED');

        const fresh = await login(user.cardNumber, 'After-Reset1!');
        assert.equal(fresh.status, 200);
        assert.equal((await userApp.call(fresh.body.token)('GET', '/profile')).status, 200, 'a sign-in after the change works');
    });

    test('update-password needs the current password, and mistakes are 400s, not 401s', async () => {
        const user = await createStudent('Own-Pass1!');
        const token = jwt.sign({ id: String(user._id), iat: Math.floor(Date.now() / 1000) - 30 }, process.env.JWT_SECRET, { expiresIn: '10m' });
        const call = userApp.call(token);

        const missing = await call('PUT', '/update-password', { newPassword: 'Own-Pass2!' });
        assert.equal(missing.status, 400);
        const wrong = await call('PUT', '/update-password', { currentPassword: 'Nope-Pass1!', newPassword: 'Own-Pass2!' });
        assert.equal(wrong.status, 400, 'a wrong current password is a form error, not an ended session');
        assert.equal(wrong.body.code, 'WRONG_CURRENT_PASSWORD');
        const weak = await call('PUT', '/update-password', { currentPassword: 'Own-Pass1!', newPassword: 'weak' });
        assert.equal(weak.status, 400);
        assert.match(weak.body.message, /at least 8 characters/);
        assert.equal((await login(user.cardNumber, 'Own-Pass1!')).status, 200, 'nothing changed yet');

        const ok = await call('PUT', '/update-password', { currentPassword: 'Own-Pass1!', newPassword: 'Own-Pass2!' });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.ok(ok.body.token, 'a fresh token for the device that made the change');
        assert.equal((await call('GET', '/profile')).body.code, 'PASSWORD_CHANGED', 'the old session has ended');
        assert.equal((await userApp.call(ok.body.token)('GET', '/profile')).status, 200, 'the new token works');
        assert.equal((await login(user.cardNumber, 'Own-Pass2!')).status, 200);
    });

    test("an administrator's view-as-student cannot change the student's password", async () => {
        const user = await createStudent('Own-Pass3!');
        const viewing = signToken(user, { role: 'student', impersonatedBy: String(superAdmin._id) });
        const r = await userApp.call(viewing)('PUT', '/update-password', { currentPassword: 'Own-Pass3!', newPassword: 'Own-Pass4!' });
        assert.equal(r.status, 403);
        assert.equal((await login(user.cardNumber, 'Own-Pass3!')).status, 200, 'unchanged');
    });
});

describe('the profile update', () => {
    test('ignores a password and returns no token', async () => {
        const user = await createStudent('Keep-Mine1!');
        const r = await userApp.call(signToken(user))('PUT', '/profile', { name: 'Renamed Student', password: 'Taken-Over1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.name, 'Renamed Student');
        assert.ok(!('token' in r.body), 'no fresh thirty-day token');
        assert.equal((await login(user.cardNumber, 'Keep-Mine1!')).status, 200, 'the password is the one it was');
        assert.equal((await login(user.cardNumber, 'Taken-Over1!')).status, 401);
    });
});

describe('signing in', () => {
    test('an old record that fails today\'s validation signs in, and is counted', async () => {
        const user = await createStudent('Legacy-Login1!');
        await User.collection.updateOne({ _id: user._id }, { $unset: { phone: '' }, $set: { loginCount: 4 } });
        const r = await login(user.cardNumber, 'Legacy-Login1!');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.loginCount, 5, "this sign-in's number");
        assert.equal((await User.collection.findOne({ _id: user._id })).loginCount, 5);
    });

    test('ten wrong passwords lock that card for a while, not the rest of the classroom', async () => {
        const target = await createStudent('Card-Limit1!');
        const neighbour = await createStudent('Card-Limit2!');
        for (let i = 0; i < 10; i++) assert.equal((await login(target.cardNumber, `Wrong-${i}aA!`)).status, 401);
        const locked = await login(target.cardNumber, 'Card-Limit1!');
        assert.equal(locked.status, 429);
        assert.match(locked.body.message, /Too many wrong passwords for this card/);
        assert.equal((await login(neighbour.cardNumber, 'Card-Limit2!')).status, 200, 'another card, same IP, still signs in');
    });
});

describe('view as student', () => {
    test('the admin gets a code, not a session; the exchange opens a two-hour one, once', async () => {
        const user = await createStudent('Viewed-Pass1!');
        const r = await adminApp.call(superToken)('POST', `/users/${user._id}/dashboard-access`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(r.body.code && !r.body.token, 'a code only');
        assert.equal(r.body.expiresInSeconds, 120);

        const ex = await authApp.call(null)('POST', '/admin-access/exchange', { code: r.body.code });
        assert.equal(ex.status, 200, JSON.stringify(ex.body));
        assert.equal(String(ex.body._id), String(user._id));
        assert.equal(ex.body.viewedBy, 'Session Super');
        const claims = jwt.decode(ex.body.token);
        assert.equal(claims.impersonatedBy, String(superAdmin._id));
        assert.ok(claims.exp - claims.iat <= 2 * 60 * 60, 'two hours at most');
        assert.equal((await userApp.call(ex.body.token)('GET', '/profile')).status, 200);
        assert.equal((await User.findById(user._id).lean()).loginCount || 0, 0, 'not a sign-in by the student');

        const again = await authApp.call(null)('POST', '/admin-access/exchange', { code: r.body.code });
        assert.equal(again.status, 410, 'single use');
    });

    test('an expired, unknown or missing code opens nothing', async () => {
        const user = await createStudent('Viewed-Pass2!');
        const r = await adminApp.call(superToken)('POST', `/users/${user._id}/dashboard-access`);
        const AdminAccessCode = require('../src/models/AdminAccessCode');
        await AdminAccessCode.updateOne({ codeHash: crypto.createHash('sha256').update(r.body.code).digest('hex') }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        assert.equal((await authApp.call(null)('POST', '/admin-access/exchange', { code: r.body.code })).status, 410);
        assert.equal((await authApp.call(null)('POST', '/admin-access/exchange', { code: 'made-up' })).status, 410);
        assert.equal((await authApp.call(null)('POST', '/admin-access/exchange', {})).status, 410);
        assert.equal((await authApp.call(null)('POST', '/admin-access/exchange', { code: { $ne: null } })).status, 410, 'never an object in the query');
    });
});

describe('signing up', () => {
    const makeCard = async (status, extra = {}) => {
        const n = cardNo();
        const card = await Card.create({ CardNumber: n, CVV: 'S1G2N', qrCodeNumber: `QRSESS${n}`, status, ...extra });
        cards.push(card);
        return card;
    };
    const register = (card, over = {}) => authApp.call(null)('POST', '/register', {
        name: 'Signup Session', email: `signup-${card.CardNumber}@gmail.com`, phone: '9876543210',
        CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber, password: 'Signup-Pass1!', ...over
    });

    test("a card still marked 'unactivated' (the default, and what a deleted student's card returns to) signs up", async () => {
        const card = await makeCard('unactivated');
        const check = await authApp.call(null)('POST', '/validate-qr', { cardNumber: card.CardNumber });
        assert.equal(check.status, 200, 'step one accepts it');
        const r = await register(card);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        keep(r);
        assert.equal((await Card.findById(card._id).lean()).status, 'used');
    });

    test("answers in the login's shape, so the profile is complete from the first screen", async () => {
        const card = await makeCard('activated');
        const r = await register(card);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        keep(r);
        for (const k of ['_id', 'name', 'email', 'phone', 'cardNumber', 'profilePicture', 'credits', 'xp', 'level', 'loginCount', 'role', 'token']) {
            assert.ok(k in r.body, `${k} is in the answer`);
        }
        assert.equal(r.body.phone, '9876543210');
        assert.equal(r.body.level, 1);
        assert.equal(r.body.role, 'student');
    });

    test('a used card or a taken email says which step to go back to', async () => {
        const card = await makeCard('activated');
        const first = await register(card);
        keep(first);
        const reused = await register(card, { email: `other-${card.CardNumber}@gmail.com` });
        assert.equal(reused.status, 400);
        assert.equal(reused.body.code, 'CARD_USED');
        assert.equal(reused.body.field, 'card');

        const card2 = await makeCard('activated');
        const taken = await register(card2, { email: `signup-${card.CardNumber}@gmail.com` });
        assert.equal(taken.status, 400);
        assert.equal(taken.body.code, 'EMAIL_TAKEN');
        assert.equal(taken.body.field, 'email');
        assert.equal((await Card.findById(card2._id).lean()).status, 'activated', 'a refused sign-up does not use the card up');

        const weak = await register(card2, { password: 'weakpass' });
        assert.equal(weak.body.field, 'password');
    });

    test('an Organization ID nobody has is reported with its reason', async () => {
        const card = await makeCard('activated');
        const r = await register(card, { orgCode: 'no_such_org_here' });
        keep(r);
        assert.equal(r.status, 201);
        assert.equal(r.body.organization.reason, 'not_found');
        const card2 = await makeCard('activated');
        const odd = await register(card2, { orgCode: 'not an id' });
        keep(odd);
        assert.equal(odd.body.organization.reason, 'invalid');
    });

    test('the sign-up scan reads what the sign-in scan reads: a URL, or the card number itself', async () => {
        const card = await makeCard('activated');
        const viaUrl = await authApp.call(null)('POST', '/validate-qr', { qrCodeNumber: `https://cards.example.com/c/${card.qrCodeNumber.toLowerCase()}` });
        assert.equal(viaUrl.status, 200, JSON.stringify(viaUrl.body));
        assert.equal(viaUrl.body.cardNumber, card.CardNumber);
        const viaNumber = await authApp.call(null)('POST', '/validate-qr', { qrCodeNumber: card.CardNumber });
        assert.equal(viaNumber.status, 200);
        const dashed = await makeCard('activated', { qrCodeNumber: `QR-SESS-${STAMP}` });
        assert.equal((await authApp.call(null)('POST', '/validate-qr', { qrCodeNumber: `qr-sess-${STAMP}` })).status, 200, 'punctuation kept where the code has it');
        assert.ok(dashed);
    });
});
