/**
 * Wallet recharge (admin panel, after Verify cards): a super admin finds a
 * student and adds money to their wallet. Booked as "wallet_recharge", credited
 * once however often the same request arrives, never negative, and refused to
 * any admin who is not a super admin.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const { Wallet, WalletTransaction } = require('../../src/rewards/models');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');

let student, superAdmin, plainAdmin, server, asSuper, asPlain;
const available = async () => (await Wallet.findOne({ userId: student.user._id }).lean())?.available ?? 0;

before(async () => {
    await connect();
    student = await makeUser('Recharge');
    // Imported records held the phone as a number; search must still find it.
    await User.collection.updateOne({ _id: student.user._id }, { $set: { phone: 9123456780 } });
    superAdmin = await makeAdmin('RechargeSuper');
    await Admin.updateOne({ _id: superAdmin.admin._id }, { $set: { role: 'superadmin' } });
    plainAdmin = await makeAdmin('RechargePlain');
    let call;
    ({ server, call } = startApp({ mount: '/api/rewards/admin', router: require('../../src/rewards/routes/adminRoutes') }));
    asSuper = call(superAdmin.token);
    asPlain = call(plainAdmin.token);
});
after(() => cleanup([student.user], server, [superAdmin.admin, plainAdmin.admin]));

describe('wallet recharge', () => {
    test('finds the student by name, card or phone, with their balance', async () => {
        for (const q of ['Recharge Student', student.user.cardNumber, '91234567']) {
            const r = await asSuper('GET', `/recharge/students?q=${encodeURIComponent(q)}`);
            assert.equal(r.status, 200);
            const row = r.body.rows.find((u) => u._id === String(student.user._id));
            assert.ok(row, `found by ${q}`);
            assert.equal(typeof row.available, 'number');
            assert.equal(row.phone, '9123456780');
        }
        assert.deepEqual((await asSuper('GET', '/recharge/students?q=a')).body.rows, []);
    });

    test('adds the money once for one key, booked as a wallet recharge', async () => {
        const start = await available();
        const body = { amount: 250, note: 'Scholarship top-up', key: 'test-key-1' };
        const first = await asSuper('POST', `/recharge/${student.user._id}`, body);
        assert.equal(first.status, 200);
        assert.equal(first.body.wallet.available, start + 250);
        const again = await asSuper('POST', `/recharge/${student.user._id}`, body);
        assert.equal(again.status, 200);
        assert.equal(again.body.duplicate, true);
        assert.equal(await available(), start + 250);
        const rows = await WalletTransaction.find({ userId: student.user._id, source: 'wallet_recharge' }).lean();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].description, 'Scholarship top-up');
        const recent = await asSuper('GET', '/recharge/recent');
        assert.ok(recent.body.rows.some((t) => String(t.userId?._id) === String(student.user._id) && t.amount === 250));
    });

    test('never takes money out', async () => {
        const start = await available();
        for (const amount of [-50, 0, 'abc']) {
            const r = await asSuper('POST', `/recharge/${student.user._id}`, { amount });
            assert.equal(r.status, 400);
        }
        assert.equal(await available(), start);
    });

    test('an admin who is not a super admin cannot use it', async () => {
        const start = await available();
        assert.equal((await asPlain('GET', '/recharge/students?q=Recharge')).status, 403);
        assert.equal((await asPlain('GET', '/recharge/recent')).status, 403);
        assert.equal((await asPlain('POST', `/recharge/${student.user._id}`, { amount: 100 })).status, 403);
        assert.equal(await available(), start);
    });
});
