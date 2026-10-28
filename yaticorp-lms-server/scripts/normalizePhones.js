/**
 * One-off: store every user's phone as text, as the schema says. Records
 * imported from the external student database held it as a number, and the
 * admin Users page crashed opening Edit on them (phone.replace is not a
 * function). Same digits, different type.
 *
 *   node scripts/normalizePhones.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    const rows = await users.find({ phone: { $type: 'number' } }, { projection: { phone: 1 } }).toArray();
    let changed = 0;
    for (const r of rows) {
        const res = await users.updateOne({ _id: r._id, phone: r.phone }, { $set: { phone: String(r.phone) } });
        changed += res.modifiedCount;
    }
    console.log(`Normalised ${changed} of ${rows.length} numeric phone numbers to text.`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
