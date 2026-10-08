/**
 * Give the starting credit (₹1,50,000 by default — the admin's
 * `startingCredit`) to every existing student whose wallet stands at ₹0.
 *
 * The server already does this on its own, the next time each student opens
 * their wallet or dashboard (walletService.grantStartingCredit). This is for
 * doing it for everyone at once, so admin wallet totals are right before
 * students come back. It goes through that same function, so the rules are the
 * same: a student with money in the wallet keeps exactly that, and nobody is
 * ever paid twice — the 'starting-credit' reference key is unique per student.
 *
 *   node scripts/grantStartingCreditToExisting.js           # dry run: report only
 *   node scripts/grantStartingCreditToExisting.js --apply   # credit them
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

(async () => {
    await connectDB();
    const User = require('../src/models/User');
    const { Wallet, WalletTransaction } = require('../src/rewards/models');
    const { getConfig } = require('../src/rewards/services/configService');
    const wallet = require('../src/rewards/services/walletService');

    const amount = (await getConfig()).startingCredit || 0;
    if (!(amount > 0)) {
        console.log('The starting credit is set to 0 in the rewards settings, so there is nothing to give.');
        return mongoose.disconnect();
    }

    const [students, wallets, alreadyPaid] = await Promise.all([
        User.find({ status: 'active' }).select('_id name cardNumber').lean(),
        Wallet.find().select('userId available').lean(),
        WalletTransaction.distinct('userId', { source: 'starting_credit' })
    ]);
    const balanceOf = new Map(wallets.map((w) => [String(w.userId), w.available || 0]));
    const paid = new Set(alreadyPaid.map(String));

    const due = students.filter((s) => !paid.has(String(s._id)) && (balanceOf.get(String(s._id)) || 0) === 0);
    const withMoney = students.filter((s) => !paid.has(String(s._id)) && (balanceOf.get(String(s._id)) || 0) !== 0).length;

    console.log(`Starting credit: ₹${amount.toLocaleString('en-IN')}`);
    console.log(`${students.length} active student(s): ${paid.size} already have it, ${withMoney} have money in their wallet (left as is), ${due.length} at ₹0 would get it.`);
    due.slice(0, 20).forEach((s) => console.log(`  ${s.cardNumber || '-'}  ${s.name || ''}`));
    if (due.length > 20) console.log(`  … and ${due.length - 20} more`);

    if (!APPLY) {
        console.log('Dry run — nothing changed. Re-run with --apply to credit them.');
        return mongoose.disconnect();
    }

    let credited = 0;
    for (const s of due) {
        const r = await wallet.grantStartingCredit(s._id);
        if (r && !r.duplicate) credited++;
    }
    console.log(`Credited ${credited} student(s) with ₹${amount.toLocaleString('en-IN')} each.`);
    await mongoose.disconnect();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
