/**
 * Normalize the imported cards collection to match the Card schema.
 *
 *   1. Renames the `QrCode` field to `qrCodeNumber` (what the app queries on).
 *   2. Sets `status: 'activated'` on any card missing a status, so the
 *      validate-qr → register flow can complete (registerStudent requires
 *      an 'activated' card).
 *
 * Usage:
 *   node scripts/normalizeCards.js --dry-run   # preview counts only
 *   node scripts/normalizeCards.js             # apply
 */
const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const cards = mongoose.connection.db.collection('cards');

        const needRename = await cards.countDocuments({ QrCode: { $exists: true } });
        const needStatus = await cards.countDocuments({ status: { $exists: false } });
        console.log(`Cards needing QrCode→qrCodeNumber rename: ${needRename}`);
        console.log(`Cards needing a status:                  ${needStatus}`);

        if (DRY_RUN) {
            console.log('\nDry run — no changes written.');
            process.exit(0);
        }

        if (needRename > 0) {
            const r = await cards.updateMany({ QrCode: { $exists: true } }, { $rename: { QrCode: 'qrCodeNumber' } });
            console.log(`Renamed field on ${r.modifiedCount} card(s).`);
        }
        if (needStatus > 0) {
            const r = await cards.updateMany({ status: { $exists: false } }, { $set: { status: 'activated' } });
            console.log(`Set status='activated' on ${r.modifiedCount} card(s).`);
        }

        // Verify a sample lookup the way validateQR does
        const sample = await cards.findOne({ qrCodeNumber: '11729CC711C' });
        console.log('\nSample lookup qrCodeNumber="11729CC711C":', sample
            ? `FOUND (card ${sample.CardNumber}, status ${sample.status})`
            : 'NOT FOUND');

        console.log('\nDone.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
