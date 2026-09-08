/**
 * One-off: store every student's cardNumber as text, as the schema says.
 * Records imported from the external student database held it as a number,
 * which no string query could match. Same digits, different type.
 *
 *   node scripts/normalizeCardNumbers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const users = mongoose.connection.collection('users');
    const rows = await users.find({ cardNumber: { $type: 'number' } }, { projection: { cardNumber: 1 } }).toArray();
    let changed = 0;
    for (const r of rows) {
        const res = await users.updateOne({ _id: r._id, cardNumber: r.cardNumber }, { $set: { cardNumber: String(r.cardNumber) } });
        changed += res.modifiedCount;
    }
    console.log(`Normalised ${changed} of ${rows.length} numeric card numbers to text.`);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
