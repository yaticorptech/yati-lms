/**
 * Admin → Verify cards (super admins only). A free card can be registered
 * only after a super admin verifies it here; cards added here are verified
 * at once. Every card not yet registered waits for this, old or new.
 * Registered cards are listed but never changed.
 *
 *   GET  /api/admin/cards                 the cards: ?state=waiting|verified|registered|inactive|all, ?q=, ?page=
 *   POST /api/admin/cards/verify          { cardNumbers: [...] } → a result for each
 *   POST /api/admin/cards                 { cards: [{ CardNumber, CVV, qrCodeNumber, SerialNumber? }] } → add (verified)
 *   POST /api/admin/cards/:id/unverify    undo a verification, while the card is still free
 */
const mongoose = require('mongoose');
const Card = require('../models/Card');
const { FREE, verifiedFields } = require('../services/cardVerification');
const { normaliseCardNumber } = require('../utils/cardNumber');

const MAX_BATCH = 1000;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What a card is, for the page: waiting, verified, registered or inactive. */
const stateOf = (c) => (c.status === 'used' ? 'registered' : c.status === 'inactive' ? 'inactive' : c.verified ? 'verified' : 'waiting');
const STATE_QUERY = {
    waiting: { status: { $in: FREE }, verified: { $ne: true } },
    verified: { status: { $in: FREE }, verified: true },
    registered: { status: 'used' },
    inactive: { status: 'inactive' },
    all: {}
};

const listCards = async (req, res) => {
    try {
        const state = STATE_QUERY[req.query.state] ? req.query.state : 'waiting';
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = 50;
        const filter = { ...STATE_QUERY[state] };
        const q = String(req.query.q || '').trim().slice(0, 60);
        if (q) {
            const pattern = new RegExp(escapeRegExp(q.replace(/\s+/g, '')), 'i');
            filter.$or = [{ CardNumber: pattern }, { SerialNumber: pattern }, { qrCodeNumber: pattern }];
        }
        const [rows, total, waiting, verified, registered, inactive] = await Promise.all([
            Card.find(filter).select('CardNumber SerialNumber qrCodeNumber status verified verifiedAt verifiedVia createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Card.countDocuments(filter),
            Card.countDocuments(STATE_QUERY.waiting),
            Card.countDocuments(STATE_QUERY.verified),
            Card.countDocuments(STATE_QUERY.registered),
            Card.countDocuments(STATE_QUERY.inactive)
        ]);
        res.json({
            cards: rows.map((c) => ({ _id: c._id, CardNumber: c.CardNumber, SerialNumber: c.SerialNumber || '', qrCodeNumber: c.qrCodeNumber, state: stateOf(c), verifiedAt: c.verifiedAt || null, verifiedVia: c.verifiedVia || null, createdAt: c.createdAt || null })),
            total, page, pages: Math.max(1, Math.ceil(total / limit)),
            counts: { waiting, verified, registered, inactive }
        });
    } catch (error) {
        console.error('[cards] list failed:', error.message);
        res.status(500).json({ message: 'Could not load the cards.' });
    }
};

/** Card numbers from a list or a pasted block: digits only, 12 each. */
const numbersFrom = (input) => {
    const list = Array.isArray(input) ? input : String(input || '').split(/[\s,;]+/);
    return [...new Set(list.map((n) => normaliseCardNumber(n)).filter(Boolean))];
};

const verifyCards = async (req, res) => {
    try {
        const numbers = numbersFrom(req.body?.cardNumbers);
        if (!numbers.length) return res.status(400).json({ message: 'Enter at least one card number.' });
        if (numbers.length > MAX_BATCH) return res.status(400).json({ message: `Verify up to ${MAX_BATCH} cards at a time.` });

        const valid = numbers.filter((n) => n.length === 12);
        const spaced = valid.map((n) => n.replace(/(\d{4})(?=\d)/g, '$1 '));
        const cards = await Card.find({ CardNumber: { $in: [...valid, ...spaced] } }).select('CardNumber status verified').lean();
        const byNumber = new Map(cards.map((c) => [normaliseCardNumber(c.CardNumber), c]));

        const toVerify = cards.filter((c) => FREE.includes(c.status) && !c.verified).map((c) => c._id);
        if (toVerify.length) {
            await Card.updateMany({ _id: { $in: toVerify }, status: { $in: FREE }, verified: { $ne: true } }, { $set: verifiedFields(req.admin._id, 'admin') });
        }
        const verifiedNow = new Set(toVerify.map(String));
        const results = numbers.map((n) => {
            if (n.length !== 12) return { cardNumber: n, result: 'invalid', message: 'A card number has 12 digits.' };
            const c = byNumber.get(n);
            if (!c) return { cardNumber: n, result: 'not_found', message: 'No card with this number is in the system. Add it below.' };
            if (c.status === 'used') return { cardNumber: n, result: 'registered', message: 'Already registered — left as it is.' };
            if (c.status === 'inactive') return { cardNumber: n, result: 'inactive', message: 'This card is inactive.' };
            if (verifiedNow.has(String(c._id))) return { cardNumber: n, result: 'verified', message: 'Verified — it can be used to register now.' };
            return { cardNumber: n, result: 'already_verified', message: 'Was already verified.' };
        });
        const count = (r) => results.filter((x) => x.result === r).length;
        res.json({ results, summary: { verified: count('verified'), alreadyVerified: count('already_verified'), registered: count('registered'), notFound: count('not_found'), invalid: count('invalid'), inactive: count('inactive') } });
    } catch (error) {
        console.error('[cards] verify failed:', error.message);
        res.status(500).json({ message: 'The cards could not be verified just now.' });
    }
};

const addCards = async (req, res) => {
    try {
        const rows = Array.isArray(req.body?.cards) ? req.body.cards : [];
        if (!rows.length) return res.status(400).json({ message: 'Add at least one card.' });
        if (rows.length > MAX_BATCH) return res.status(400).json({ message: `Add up to ${MAX_BATCH} cards at a time.` });

        const results = [];
        const seen = new Set();
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i] || {};
            const cardNumber = normaliseCardNumber(row.CardNumber ?? row.cardNumber);
            const cvv = String(row.CVV ?? row.cvv ?? '').trim().toUpperCase();
            const qr = String(row.qrCodeNumber ?? row.QRCodeNumber ?? row.qr ?? '').trim();
            const serial = String(row.SerialNumber ?? row.serialNumber ?? '').trim().slice(0, 60);
            const fail = (message) => results.push({ row: i + 1, cardNumber: cardNumber || String(row.CardNumber || ''), result: 'failed', message });
            if (cardNumber.length !== 12) { fail('The card number must be 12 digits.'); continue; }
            if (!/^[A-Z0-9]{5}$/.test(cvv)) { fail('The CVV must be 5 letters or digits.'); continue; }
            if (!qr || qr.length > 100) { fail('Enter the QR code number.'); continue; }
            if (seen.has(cardNumber)) { fail('This card number is twice in the list.'); continue; }
            seen.add(cardNumber);
            const exists = await Card.findOne({ $or: [{ CardNumber: { $in: [cardNumber, cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')] } }, { qrCodeNumber: qr }] }).select('CardNumber qrCodeNumber').lean();
            if (exists) { fail(normaliseCardNumber(exists.CardNumber) === cardNumber ? 'This card is already in the system.' : 'Another card already has this QR code.'); continue; }
            try {
                await Card.create({ CardNumber: cardNumber, CVV: cvv, qrCodeNumber: qr, SerialNumber: serial || undefined, status: 'unactivated', ...verifiedFields(req.admin._id, 'admin') });
                results.push({ row: i + 1, cardNumber, result: 'added', message: 'Added and verified.' });
            } catch (error) {
                if (error?.code === 11000) fail('This card is already in the system.');
                else throw error;
            }
        }
        const added = results.filter((r) => r.result === 'added').length;
        res.status(added ? 201 : 400).json({ results, summary: { added, failed: results.length - added }, ...(added ? {} : { message: results[0]?.message || 'No card was added.' }) });
    } catch (error) {
        console.error('[cards] add failed:', error.message);
        res.status(500).json({ message: 'The cards could not be added just now.' });
    }
};

const unverifyCard = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Card not found.' });
        const card = await Card.findOneAndUpdate(
            { _id: req.params.id, status: { $in: FREE }, verified: true },
            { $set: { verified: false, verifiedAt: null, verifiedBy: null, verifiedVia: null } },
            { returnDocument: 'after' }
        ).select('CardNumber status verified').lean();
        if (!card) {
            const any = await Card.findById(req.params.id).select('status').lean();
            if (!any) return res.status(404).json({ message: 'Card not found.' });
            return res.status(400).json({ message: any.status === 'used' ? 'This card is already registered — it cannot be unverified.' : 'This card is not verified.' });
        }
        res.json({ _id: card._id, CardNumber: card.CardNumber, state: 'waiting', message: `Card ${card.CardNumber} is waiting for verification again.` });
    } catch (error) {
        console.error('[cards] unverify failed:', error.message);
        res.status(500).json({ message: 'Could not undo the verification.' });
    }
};

module.exports = { listCards, verifyCards, addCards, unverifyCard };
