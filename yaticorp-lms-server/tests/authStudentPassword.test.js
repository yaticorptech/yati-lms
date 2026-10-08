/**
 * Student passwords are hashed, and nobody who could sign in before is locked out.
 *
 * Every existing student password was stored as typed. Rather than rewrite
 * them all at once, each is hashed the next time that student signs in; these
 * tests pin down both halves — the old accounts still work (and are upgraded),
 * and every way a password is written now stores a bcrypt hash.
 *
 * A "legacy" student is inserted straight into the collection, the way those
 * accounts exist today, because the model itself no longer writes plain text.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeAdmin, startApp, cleanup } = require('./helpers');

const mailer = require('../src/utils/emailService');
mailer.sendEmail = async () => {};

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const BCRYPT = /^\$2[aby]\$\d{2}\$/;
let seq = 0;
/** A card number that is digits only, as the student login reads it, and unique to this run. */
const cardNo = () => `97${STAMP}${seq++}`;

let authApp, adminApp, userApp;
let admin;
const made = [];

const User = require('../src/models/User');

const insertLegacy = async (password) => {
    const _id = new mongoose.Types.ObjectId();
    const cardNumber = cardNo();
    await User.collection.insertOne({
        _id, name: 'Legacy Student', email: `legacy-${STAMP}-${seq}@example.com`, phone: '9999999999',
        cardNumber, password, status: 'active', createdAt: new Date(), updatedAt: new Date()
    });
    made.push({ _id });
    return { _id, cardNumber };
};

const createStudent = async (password) => {
    const user = await User.create({ name: 'New Student', email: `new-${STAMP}-${seq}@example.com`, phone: '9999999999', cardNumber: cardNo(), password });
    made.push(user);
    return user;
};

const storedPassword = async (_id) => (await User.collection.findOne({ _id }, { projection: { password: 1 } })).password;
const login = (cardNumber, password) => authApp.call(null)('POST', '/student/login', { cardNumber, password });

before(async () => {
    await connect();
    authApp = startApp({ mount: '/api/auth', router: require('../src/routes/authRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../src/routes/adminRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../src/routes/userRoutes') });
    admin = await makeAdmin('Pw');
});

after(async () => {
    for (const app of [adminApp, userApp]) await new Promise((r) => app.server.close(r));
    await cleanup(made, authApp.server, [admin.admin]);
});

describe('a student whose password is still stored as typed', () => {
    test('signs in as before, and the stored password becomes a hash', async () => {
        const { _id, cardNumber } = await insertLegacy('Legacy-Pass1!');
        const r = await login(cardNumber, 'Legacy-Pass1!');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(!('password' in r.body), 'the response never carries a password');
        const stored = await storedPassword(_id);
        assert.match(stored, BCRYPT, 'upgraded to bcrypt');
        assert.notEqual(stored, 'Legacy-Pass1!');

        const again = await login(cardNumber, 'Legacy-Pass1!');
        assert.equal(again.status, 200, 'and still signs in with the same password afterwards');
    });

    test('a wrong password is refused and nothing is changed', async () => {
        const { _id, cardNumber } = await insertLegacy('Legacy-Pass2!');
        assert.equal((await login(cardNumber, 'legacy-pass2!')).status, 401);
        assert.equal((await login(cardNumber, '')).status, 401);
        assert.equal(await storedPassword(_id), 'Legacy-Pass2!', 'a failed attempt does not touch it');
    });

    test('an old record that fails today\'s validation still signs in and is upgraded', async () => {
        const { _id, cardNumber } = await insertLegacy('Legacy-Pass3!');
        await User.collection.updateOne({ _id }, { $unset: { phone: '' } });   // `phone` is required now
        const user = await User.findById(_id);
        assert.equal(await user.matchPassword('Legacy-Pass3!'), true);
        assert.match(await storedPassword(_id), BCRYPT);
    });
});

describe('a student with a hashed password', () => {
    test('signs in, and a wrong password is refused', async () => {
        const user = await createStudent('Hashed-Pass1!');
        assert.match(await storedPassword(user._id), BCRYPT, 'User.create hashes — the path registration, admin entry and bulk upload use');
        assert.equal((await login(user.cardNumber, 'Hashed-Pass1!')).status, 200);
        assert.equal((await login(user.cardNumber, 'Hashed-Pass1?')).status, 401);
        assert.equal((await login(user.cardNumber, await storedPassword(user._id))).status, 401, 'the hash itself is not a password');
    });

    test('saving the account for other reasons does not hash the hash again', async () => {
        const user = await createStudent('Hashed-Pass2!');
        const first = await storedPassword(user._id);
        const doc = await User.findById(user._id);
        doc.loginCount = 5;
        await doc.save();
        assert.equal(await storedPassword(user._id), first);
    });
});

describe('every way a password is written stores a hash', () => {
    test('an admin editing a student', async () => {
        const user = await createStudent('Before-Edit1!');
        const r = await adminApp.call(admin.token)('PUT', `/users/${user._id}`, { password: 'After-Edit1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(!('password' in r.body));
        assert.match(await storedPassword(user._id), BCRYPT);
        assert.equal((await login(user.cardNumber, 'After-Edit1!')).status, 200);
    });

    test('a student changing their own password', async () => {
        const user = await createStudent('Own-Change1!');
        const token = require('jsonwebtoken').sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
        const r = await userApp.call(token)('PUT', '/update-password', { currentPassword: 'Own-Change1!', newPassword: 'Own-Change2!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.match(await storedPassword(user._id), BCRYPT);
        assert.equal((await login(user.cardNumber, 'Own-Change2!')).status, 200);
    });

    test('the emailed reset link (a query update, not save)', async () => {
        const { _id, cardNumber } = await insertLegacy('Forgot-Pass1!');
        // Only the token's SHA-256 is stored; the link carries the token itself.
        await User.collection.updateOne({ _id }, { $set: { resetPasswordToken: require('crypto').createHash('sha256').update(`tok${STAMP}`).digest('hex'), resetPasswordExpiry: new Date(Date.now() + 60000) } });
        const r = await authApp.call(null)('POST', '/student/reset-password', { token: `tok${STAMP}`, newPassword: 'Reset-Pass1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.match(await storedPassword(_id), BCRYPT);
        assert.equal((await login(cardNumber, 'Reset-Pass1!')).status, 200);
        assert.equal((await login(cardNumber, 'Forgot-Pass1!')).status, 401);
    });

    test('insertMany, which skips save hooks', async () => {
        const [doc] = await User.insertMany([{ name: 'Bulk Student', email: `bulk-${STAMP}@example.com`, phone: '9999999999', cardNumber: cardNo(), password: 'Bulk-Pass1!' }]);
        made.push(doc);
        assert.match(await storedPassword(doc._id), BCRYPT);
        assert.equal(await (await User.findById(doc._id)).matchPassword('Bulk-Pass1!'), true);
    });
});
