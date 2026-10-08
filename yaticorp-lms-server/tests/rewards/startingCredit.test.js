/**
 * The ₹1,50,000 starting credit.
 *
 * A student who registers after the credit was introduced gets it on their
 * first wallet read. A student from before then gets it only while their
 * wallet stands at ₹0 — one who already has money keeps exactly that. Either
 * way it is paid once, however many times the wallet is read.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');

const config = require('../../src/rewards/services/configService');
const wallet = require('../../src/rewards/services/walletService');
const { Wallet, WalletTransaction } = require('../../src/rewards/models');
const User = require('../../src/models/User');

const CREDIT = 150000;
let savedCredit, fresh, oldEmpty, oldWithMoney;
const available = async (u) => (await Wallet.findOne({ userId: u.user._id }).lean())?.available ?? 0;
const credits = (u) => WalletTransaction.countDocuments({ userId: u.user._id, source: 'starting_credit' });
// An account from long before the credit existed. Straight to the collection:
// Mongoose treats createdAt as immutable and would quietly drop the $set.
const backdate = (u) => User.collection.updateOne({ _id: u.user._id }, { $set: { createdAt: new Date('2025-01-01') } });

before(async () => {
    await connect();
    savedCredit = (await config.getConfig()).startingCredit;
    await config.updateConfig({ startingCredit: CREDIT }); config.invalidate();
    fresh = await makeUser('CreditFresh');
    oldEmpty = await makeUser('CreditOldEmpty');
    oldWithMoney = await makeUser('CreditOldMoney');
    await backdate(oldEmpty);
    await backdate(oldWithMoney);
    // Money earned before the credit existed: an older wallet with a balance.
    await wallet.credit({ userId: oldWithMoney.user._id, amount: 40, source: 'admin_adjustment', description: 'earned earlier' });
});
after(async () => {
    await config.updateConfig({ startingCredit: savedCredit }); config.invalidate();
    await cleanup([fresh.user, oldEmpty.user, oldWithMoney.user]);
});

describe('the starting credit', () => {
    test('a new student gets it, once, however often the wallet is read', async () => {
        await Promise.all([wallet.grantStartingCredit(fresh.user._id), wallet.grantStartingCredit(fresh.user._id)]);
        await wallet.grantStartingCredit(fresh.user._id);
        assert.equal(await available(fresh), CREDIT);
        assert.equal(await credits(fresh), 1);
    });

    test('a student from before it existed, with ₹0 in the wallet, gets it too', async () => {
        assert.ok((await User.findById(oldEmpty.user._id).lean()).createdAt < await wallet.startingCreditFrom(), 'really from before the credit');
        await wallet.grantStartingCredit(oldEmpty.user._id);
        await wallet.grantStartingCredit(oldEmpty.user._id);
        assert.equal(await available(oldEmpty), CREDIT);
        assert.equal(await credits(oldEmpty), 1, 'paid once');
        const w = await Wallet.findOne({ userId: oldEmpty.user._id }).lean();
        assert.equal(w.spendOnly, CREDIT, 'spend-only, like every starting credit');
    });

    test('a student from before it existed who already has money keeps exactly that', async () => {
        await wallet.grantStartingCredit(oldWithMoney.user._id);
        assert.equal(await available(oldWithMoney), 40);
        assert.equal(await credits(oldWithMoney), 0);
    });
});
