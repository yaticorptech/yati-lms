/**
 * A platform admin can read a student's current password (GET /api/admin/users/:id/password).
 *
 * The hash stays what sign-in checks; a sealed copy beside it is what the admin
 * reads. These tests pin down that every way a password is written keeps that
 * copy current, that an account hashed before the copy existed gets one at its
 * next sign-in, and that a copy which no longer matches the hash is never shown.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { connect, makeAdmin, startApp, cleanup } = require('../helpers');

const mailer = require('../../src/utils/emailService');
mailer.sendEmail = async () => {};

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
let seq = 0;
const cardNo = () => `96${STAMP}${seq++}`;

let authApp, adminApp;
let admin;
const made = [];

const User = require('../../src/models/User');

const createStudent = async (password) => {
    const user = await User.create({ name: 'Pw Student', email: `pw-${STAMP}-${seq}@example.com`, phone: '9999999999', cardNumber: cardNo(), password });
    made.push(user);
    return user;
};

const insertRaw = async (fields) => {
    const _id = new mongoose.Types.ObjectId();
    const cardNumber = cardNo();
    await User.collection.insertOne({
        _id, name: 'Raw Student', email: `raw-${STAMP}-${seq}@example.com`, phone: '9999999999',
        cardNumber, status: 'active', createdAt: new Date(), updatedAt: new Date(), ...fields
    });
    made.push({ _id });
    return { _id, cardNumber };
};

const reveal = (id, token = admin.token) => adminApp.call(token)('GET', `/users/${id}/password`);
const login = (cardNumber, password) => authApp.call(null)('POST', '/student/login', { cardNumber, password });
const sealedOf = async (_id) => (await User.collection.findOne({ _id }, { projection: { passwordSealed: 1 } })).passwordSealed;

before(async () => {
    await connect();
    authApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    admin = await makeAdmin('PwView');
});

after(async () => {
    await new Promise((r) => adminApp.server.close(r));
    await cleanup(made, authApp.server, [admin.admin]);
});

describe('reading a student password', () => {
    test('a password set through the model is shown as typed', async () => {
        const user = await createStudent('Shown-Pass1!');
        const r = await reveal(user._id);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body, { available: true, password: 'Shown-Pass1!' });
    });

    test('the student list and detail never carry it', async () => {
        const user = await createStudent('Hidden-Pass1!');
        const detail = await adminApp.call(admin.token)('GET', `/users/${user._id}`);
        assert.equal(detail.status, 200);
        assert.ok(!JSON.stringify(detail.body).includes('Hidden-Pass1!'));
        assert.ok(!('passwordSealed' in detail.body.user) && !('password' in detail.body.user));
        const list = await adminApp.call(admin.token)('GET', '/users');
        const row = list.body.find((u) => String(u._id) === String(user._id));
        assert.ok(row && !('passwordSealed' in row) && !('password' in row));
    });

    test('a password still stored as typed is shown, and still after the sign-in that hashes it', async () => {
        const { _id, cardNumber } = await insertRaw({ password: 'Legacy-View1!' });
        assert.equal((await reveal(_id)).body.password, 'Legacy-View1!');
        assert.equal((await login(cardNumber, 'Legacy-View1!')).status, 200);
        assert.deepEqual((await reveal(_id)).body, { available: true, password: 'Legacy-View1!' });
    });

    test('a password hashed before the sealed copy existed shows after the student next signs in', async () => {
        const { _id, cardNumber } = await insertRaw({ password: await bcrypt.hash('Old-Hash1!', 10) });
        const before = await reveal(_id);
        assert.equal(before.status, 200);
        assert.equal(before.body.available, false);
        assert.ok(!('password' in before.body));

        assert.equal((await login(cardNumber, 'Wrong-Hash1!')).status, 401);
        assert.equal((await reveal(_id)).body.available, false, 'a wrong password captures nothing');

        assert.equal((await login(cardNumber, 'Old-Hash1!')).status, 200);
        assert.deepEqual((await reveal(_id)).body, { available: true, password: 'Old-Hash1!' });

        const sealed = await sealedOf(_id);
        assert.equal((await login(cardNumber, 'Old-Hash1!')).status, 200);
        assert.equal(await sealedOf(_id), sealed, 'a copy that is already right is not rewritten');
    });

    test('follows an admin edit and an emailed reset', async () => {
        const user = await createStudent('First-Pass1!');
        assert.equal((await adminApp.call(admin.token)('PUT', `/users/${user._id}`, { password: 'Admin-Set1!' })).status, 200);
        assert.equal((await reveal(user._id)).body.password, 'Admin-Set1!');

        await User.collection.updateOne({ _id: user._id }, { $set: { resetPasswordToken: require('crypto').createHash('sha256').update(`pwtok${STAMP}`).digest('hex'), resetPasswordExpiry: new Date(Date.now() + 60000) } });
        assert.equal((await authApp.call(null)('POST', '/student/reset-password', { token: `pwtok${STAMP}`, newPassword: 'Reset-View1!' })).status, 200);
        assert.equal((await reveal(user._id)).body.password, 'Reset-View1!');
    });

    test('a copy that no longer matches the hash is not shown', async () => {
        const user = await createStudent('Stale-Pass1!');
        // A change that went around the hooks: the hash moves on, the copy does not.
        await User.collection.updateOne({ _id: user._id }, { $set: { password: await bcrypt.hash('Elsewhere1!', 10) } });
        const r = await reveal(user._id);
        assert.equal(r.body.available, false);
        assert.ok(!JSON.stringify(r.body).includes('Stale-Pass1!'));
    });

    test('only for an admin', async () => {
        const user = await createStudent('Guarded-Pass1!');
        assert.equal((await adminApp.call(null)('GET', `/users/${user._id}/password`)).status, 401);
        const studentToken = require('jsonwebtoken').sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
        assert.equal((await reveal(user._id, studentToken)).status, 401);
        assert.equal((await reveal(new mongoose.Types.ObjectId())).status, 404);
        assert.equal((await reveal('not-an-id')).status, 404);
    });
});
