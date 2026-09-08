/**
 * Card numbers are twelve digits stored as text — but fifty-odd student
 * records imported from elsewhere held them as BSON numbers, and Mongoose
 * casts a query value to the schema's String type, so `{ cardNumber: '2401…' }`
 * never matched a numeric one (and `mongoose.trusted()` does not stop the
 * cast inside `$in` on this version). The lookup below goes through the raw
 * collection for the id and then loads the document normally, so it matches
 * either spelling; the User schema's setter stores new values as text, and
 * scripts/normalizeCardNumbers.js rewrote the old ones.
 */
const User = require('../models/User');

/** Just the digits of whatever was typed, scanned or stored. */
const normaliseCardNumber = (raw) => String(raw ?? '').replace(/\D/g, '');

/**
 * The student holding this card number, stored as text or as a number.
 * Resolves to a full Mongoose document (so `matchPassword` and `save` work)
 * or null.
 */
const findUserByCardNumber = async (raw) => {
    const text = normaliseCardNumber(raw);
    if (!text) return null;
    const values = [text];
    const num = Number(text);
    if (Number.isSafeInteger(num)) values.push(num);
    const hit = await User.collection.findOne({ cardNumber: { $in: values } }, { projection: { _id: 1 } });
    return hit ? User.findById(hit._id) : null;
};

module.exports = { normaliseCardNumber, findUserByCardNumber };
