/**
 * @description Presentation (demo) cards: the ten built in (services/fullAccess.js) and any an
 * administrator scans in on Admin → Demo cards (Card.demo). Scanning one at the student sign-in
 * opens its dashboard with no password (controllers/registrationController.js scanCard); it sees
 * every section; and Reset gives it a brand-new, empty account — its data wiped, the account kept.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const Card = require('../models/Card');
const User = require('../models/User');
const { DEMO_CARDS, setScannedDemoCards } = require('./fullAccess');
const { normaliseCardNumber, findUserByCardNumber } = require('../utils/cardNumber');

/** Re-read the scanned demo cards into the in-memory list fullAccess checks. */
const refresh = async () => {
    const rows = await Card.find({ demo: true }).select('CardNumber').lean();
    setScannedDemoCards(rows.map((r) => r.CardNumber));
};
if (mongoose.connection.readyState === 1) refresh().catch(() => {});
else mongoose.connection.once('open', () => refresh().catch(() => {}));

/** The student account a card belongs to, by its number or its QR number. */
const accountFor = async (card) => (await findUserByCardNumber(card.CardNumber))
    || (card.qrCodeNumber ? User.findOne({ qrNumber: card.qrCodeNumber }) : null);

/** A demo card with no account yet gets one: "Demo 4472", active, with a password nobody needs. */
const ensureAccount = async (card) => {
    const existing = await accountFor(card);
    if (existing) return existing;
    const n = normaliseCardNumber(card.CardNumber);
    const user = await User.create({
        name: `Demo ${n.slice(-4)}`,
        email: `demo.${n}@demo.yaticorp.in`,
        phone: '0000000000',
        cardNumber: card.CardNumber,
        qrNumber: card.qrCodeNumber || '',
        password: crypto.randomBytes(18).toString('base64url'),
        status: 'active'
    });
    await Card.updateOne({ _id: card._id }, { $set: { status: 'used', verified: true, verifiedVia: 'admin', verifiedAt: new Date() } });
    return user;
};

/** Every demo card, built-in first: its number, its account, and when it was last used. */
const listDemoCards = async () => {
    const scanned = await Card.find({ demo: true }).select('CardNumber qrCodeNumber demoAddedAt').lean();
    const numbers = [...DEMO_CARDS, ...scanned.map((c) => normaliseCardNumber(c.CardNumber)).filter((n) => !DEMO_CARDS.has(n))];
    const users = await User.find({ cardNumber: { $in: numbers } }).select('name cardNumber lastActiveDate xp level createdAt').lean();
    return numbers.map((n) => {
        const card = scanned.find((c) => normaliseCardNumber(c.CardNumber) === n);
        const user = users.find((u) => normaliseCardNumber(u.cardNumber) === n);
        return {
            cardNumber: n,
            builtIn: DEMO_CARDS.has(n),
            addedAt: card?.demoAddedAt || null,
            account: user ? { id: user._id, name: user.name, lastActiveDate: user.lastActiveDate || null, xp: user.xp || 0, level: user.level || 1 } : null
        };
    });
};

/** Mark a scanned card as a demo card, giving it an account when it has none. */
const addDemoCard = async (card) => {
    await Card.updateOne({ _id: card._id }, { $set: { demo: true, demoAddedAt: card.demoAddedAt || new Date() } });
    await refresh();
    return ensureAccount(card);
};

/** No longer a demo card: back to an ordinary card (its account stays). Built-in ones cannot be removed here. */
const removeDemoCard = async (cardNumber) => {
    const n = normaliseCardNumber(cardNumber);
    if (DEMO_CARDS.has(n)) return { error: 'This is a built-in demo card and cannot be removed here.' };
    const done = await Card.updateOne({ CardNumber: { $in: [n, cardNumber] }, demo: true }, { $set: { demo: false, demoAddedAt: null } });
    await refresh();
    return done.modifiedCount ? { ok: true } : { error: 'That card is not a demo card.' };
};

// Never emptied by a reset: the account itself and the platform's own records.
const KEEP = new Set(['User', 'Card', 'Admin', 'Organization', 'Teacher', 'AdminAuditLog', 'OrgAuditLog']);

/**
 * A fresh start: everything the account has done is deleted — from every collection that points
 * at a student — and the account's own progress is put back to new. Its name, card and login stay.
 */
const resetAccount = async (userId) => {
    const id = new mongoose.Types.ObjectId(String(userId));
    let removed = 0;
    for (const name of mongoose.modelNames()) {
        if (KEEP.has(name)) continue;
        const model = mongoose.model(name);
        const paths = [];
        model.schema.eachPath((path, type) => {
            if (type.instance === 'ObjectId' && (type.options?.ref === 'User' || /^(userId|user|studentId|student)$/.test(path.split('.').pop()))) paths.push(path);
        });
        if (!paths.length) continue;
        try {
            const r = await model.deleteMany({ $or: paths.map((p) => ({ [p]: id })) });
            removed += r.deletedCount || 0;
        } catch (e) {
            console.error(`[demo-cards] reset ${name} failed:`, e.message);
        }
    }
    await User.updateOne({ _id: id }, {
        $set: {
            xp: 0, level: 1, credits: 0, loginCount: 0, lastActiveDate: null, profilePicture: '',
            devices: [], deviceRemovedAt: null, activeSessionId: '', residentialCard: false,
            geminiApiKey: '', geminiApiKeyAddedAt: null, organizationId: null, organizationJoinedAt: null,
            institution: '', className: '', courseId: null, bundleId: null
        }
    }, { strict: false });
    return { removed };
};

module.exports = { refresh, ensureAccount, accountFor, listDemoCards, addDemoCard, removeDemoCard, resetAccount };
