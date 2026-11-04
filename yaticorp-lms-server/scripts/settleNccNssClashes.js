/**
 * NCC or NSS, not both (2026-11-02, src/nccnss/corps.js). A student who is active in one and
 * still has a request waiting for the other — asked before the rule — would wait for ever: the
 * organization can no longer approve it. Those requests are turned down here, with the reason.
 * Students already active in both are left as they are (they joined before the rule).
 *
 *   node scripts/settleNccNssClashes.js            # what it would do
 *   node scripts/settleNccNssClashes.js --apply    # do it
 *
 * Uses MONGO_URI from .env.
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const { NccNssMember } = require('../src/nccnss/models');
    const waiting = await NccNssMember.find({ scheme: { $in: ['NCC', 'NSS'] }, status: 'pending' }).select('userId scheme').lean();
    let settled = 0;
    for (const w of waiting) {
        const other = w.scheme === 'NCC' ? 'NSS' : 'NCC';
        const active = await NccNssMember.exists({ userId: w.userId, scheme: other, status: 'active' });
        if (!active) continue;
        settled += 1;
        console.log(`${apply ? 'Turning down' : 'Would turn down'} the ${w.scheme} request of student ${w.userId} (active in ${other}).`);
        if (apply) await NccNssMember.updateOne({ _id: w._id, status: 'pending' }, { $set: { status: 'rejected', endReason: `A student can be in NCC or NSS, not both: you are in ${other}.` } });
    }
    console.log(settled ? `${settled} request(s) ${apply ? 'turned down' : 'to turn down (run with --apply)'}.` : 'Nothing to settle.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
