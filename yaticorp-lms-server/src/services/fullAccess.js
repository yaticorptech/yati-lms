/**
 * The demo cards: accounts that see every part of the LMS, always.
 *
 * The account owner's rule (2026-10-08): these ten cards are used to show the
 * product, so nothing is hidden from them —
 *
 *   - Jobs opens without the usual rule (five Career Path skills at 25%),
 *   - and every section an administrator can switch off for students
 *     (Career Path and Scholarships, Jobs, the Global Quiz, credits) stays
 *     open for them, even while it is switched off for everyone else.
 *
 * The list is here in the code, keyed by card number, on purpose: it then
 * holds on any computer the card signs in from and on any server running this
 * code, whichever database that server uses — a flag set in one database
 * would be missing from the next. Card numbers are compared by their digits,
 * so "2401 0003 4472" and 240100034472 (stored as a number by an old import)
 * are the same card.
 *
 * Their AI runs on the platform's Gemini key from the environment — never a
 * key of their own (they are not offered that setting) — and without the
 * daily per-student AI allowance, as a student with their own key has none.
 *
 * Money is not part of it: turning reward points into cash stays with the
 * rewards rulebook and the account's walletAccess setting.
 */
const jwt = require('jsonwebtoken');
const { normaliseCardNumber } = require('../utils/cardNumber');

const DEMO_CARDS = new Set([
    '240100034472', // Demo1
    '240100044304', // Demo2
    '240100044305', // Demo3
    '240100024640', // Demo4
    '240100024639', // Demo5
    '240100034471', // Demo6
    '240100024638', // Demo7
    '240100044303', // Demo8
    '240100034470', // Demo9
    '240100024637'  // Demo10
]);

/** Is this account one of the demo cards? @param {{cardNumber?: string|number}} user */
const hasFullAccess = (user) => !!user && DEMO_CARDS.has(normaliseCardNumber(user.cardNumber));

/**
 * The same question for a request that has not been through the student
 * sign-in yet — the section locks run first, ahead of it. Reads the student's
 * token itself; any doubt (no token, a bad or expired one, an inactive
 * account) is simply "no", and the lock then does what it always did.
 */
const fullAccessFromRequest = async (req) => {
    if (req.user) return hasFullAccess(req.user);
    const header = String(req.headers?.authorization || '');
    if (!header.startsWith('Bearer ')) return false;
    try {
        const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        const User = require('../models/User');
        const user = await User.findById(id).select('cardNumber status').lean();
        return !!user && user.status === 'active' && hasFullAccess(user);
    } catch {
        return false;
    }
};

/**
 * The same question by user id, for code that knows only the id (the AI
 * meter). Remembered for a minute: it is asked before every AI call.
 */
const byId = new Map();
const fullAccessForUserId = async (userId) => {
    if (!userId) return false;
    const key = String(userId);
    const hit = byId.get(key);
    if (hit && Date.now() - hit.at < 60_000) return hit.value;
    let value = false;
    try {
        const User = require('../models/User');
        value = hasFullAccess(await User.findById(userId).select('cardNumber').lean());
    } catch { value = false; }
    byId.set(key, { value, at: Date.now() });
    return value;
};

module.exports = { DEMO_CARDS, hasFullAccess, fullAccessFromRequest, fullAccessForUserId };
