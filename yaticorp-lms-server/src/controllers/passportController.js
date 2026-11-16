/**
 * AI Passport QR (services/passport.js).
 *
 *   POST /api/auth/passport/link        public, at sign-up: { qrCodeNumber | cardNumber, passport }
 *                                       links the book to a card not yet registered and verifies it
 *   GET  /api/user/passport             the signed-in student's passport and reward
 *   POST /api/user/passport/claim       { code } link the student's own card and pay the reward
 *   GET  /api/admin/passports           ?state=free|linked|inactive|all, ?q=, ?page=
 *   POST /api/admin/passports           { codes: [...] | "pasted text", batch? } add codes
 *   POST /api/admin/passports/lookup    { code } a scanned book → its card and student
 *   POST /api/admin/passports/:id/status { status: 'free'|'inactive' } withdraw / restore an unlinked book
 */
const mongoose = require('mongoose');
const Passport = require('../models/Passport');
const Card = require('../models/Card');
const User = require('../models/User');
const P = require('../services/passport');
const { normaliseCardNumber, findUserByCardNumber } = require('../utils/cardNumber');

const send = (res, error, fallback) => {
    if (error?.code && error.status) return res.status(error.status).json({ code: error.code, message: error.message });
    console.error('[passport]', fallback, error?.message);
    return res.status(500).json({ message: fallback });
};

// ── Sign-up ──────────────────────────────────────────────────────────────────
const linkAtSignup = async (req, res) => {
    try {
        const { scanCandidates, findScannedCard } = require('./registrationController');
        const scanned = typeof req.body?.qrCodeNumber === 'string' ? req.body.qrCodeNumber.trim() : '';
        const cardNumber = normaliseCardNumber(req.body?.cardNumber);
        if (!scanned && cardNumber.length !== 12) return res.status(400).json({ message: 'Scan or type your card first.' });
        const card = scanned
            ? await findScannedCard(scanCandidates(scanned))
            : await Card.findOne({ CardNumber: { $in: [cardNumber, cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')] } });
        if (!card) return res.status(404).json({ message: 'No card was found. Go back and check your card.' });
        if (card.status === 'used') return res.status(400).json({ code: 'CARD_USED', message: 'This card already has an account — sign in, then scan your AI Passport from your wallet.' });

        const passport = await P.findPassport(req.body?.passport);
        const { passport: linked } = await P.linkToCard({ passport, card, via: 'signup' });
        const { getConfig } = require('../rewards/services/configService');
        const reward = Number((await getConfig()).startingCredit || 0);
        res.json({ valid: true, verified: true, passportCode: linked.code, reward, ...P.cardForSignup(card) });
    } catch (error) {
        send(res, error, 'Your AI Passport could not be checked just now. Please try again.');
    }
};

/**
 * The QR link, no sign-in: the passport (from its QR) and the student's card
 * (scanned, or its number typed) are linked for good.
 *  - A card with an account: the bonus goes into that account's wallet now.
 *  - A card not registered yet: it is verified, and the bonus is paid the
 *    moment the account is made (registerStudent).
 */
const claimByScan = async (req, res) => {
    try {
        const { scanCandidates, findScannedCard } = require('./registrationController');
        const scanned = typeof req.body?.qrCodeNumber === 'string' ? req.body.qrCodeNumber.trim() : '';
        const cardNumber = normaliseCardNumber(req.body?.cardNumber);
        if (!scanned && cardNumber.length !== 12) return res.status(400).json({ message: 'Scan your student card, or type its 12-digit number.' });
        const passport = await P.findPassport(req.body?.passport);
        const card = scanned
            ? await findScannedCard(scanCandidates(scanned))
            : await Card.findOne({ CardNumber: { $in: [cardNumber, cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')] } });
        if (!card) return res.status(404).json({ message: scanned ? 'That card was not recognised. Scan the QR on your student card again, or type its number.' : 'No card has that number. Check the number printed on your card.' });
        if (card.status === 'inactive') return res.status(400).json({ message: 'This card is inactive. Contact your administrator.' });
        const digits = normaliseCardNumber(card.CardNumber);

        const { passport: linked, already } = await P.linkToCard({ passport, card, via: 'scan' });
        const { getConfig } = require('../rewards/services/configService');
        const amount = Number((await getConfig()).startingCredit || 0);
        const { formatMoney } = require('../rewards/services/notify');

        const user = card.status === 'used'
            ? (await findUserByCardNumber(card.CardNumber)) || (card.qrCodeNumber ? await User.findOne({ qrNumber: card.qrCodeNumber }) : null)
            : null;
        if (user) {
            const reward = await P.payReward(user._id, linked);
            return res.json({
                registered: true, passportCode: linked.code, cardNumber: digits, firstName: String(user.name || '').split(' ')[0],
                reward,
                message: reward.paid ? `${formatMoney(reward.amount)} has been added to your wallet.` : already ? 'This passport is already linked to your card, and its bonus was already claimed.' : 'Passport linked to your card. Your welcome bonus was already in your wallet.'
            });
        }
        res.json({
            registered: false, passportCode: linked.code, cardNumber: digits, reward: { amount, paid: false },
            message: `Passport linked and card verified. Create your account to receive ${formatMoney(amount)} in your wallet.`
        });
    } catch (error) {
        send(res, error, 'Your AI Passport could not be linked just now. Please try again.');
    }
};

// ── Student ──────────────────────────────────────────────────────────────────
const myPassport = async (req, res) => {
    try { res.json(await P.statusForUser(req.user)); } catch (error) { send(res, error, 'Could not load your AI Passport.'); }
};

const claimMine = async (req, res) => {
    try {
        const result = await P.claimForUser(req.user, req.body?.code);
        const { formatMoney } = require('../rewards/services/notify');
        res.json({
            ...result,
            message: result.reward.paid
                ? `AI Passport linked. ${formatMoney(result.reward.amount)} has been added to your wallet.`
                : 'AI Passport linked to your card. Your welcome reward was already in your wallet.'
        });
    } catch (error) {
        send(res, error, 'Your AI Passport could not be linked just now. Please try again.');
    }
};

// ── Admin ────────────────────────────────────────────────────────────────────
const STATE_QUERY = { free: { status: 'free' }, linked: { status: 'linked' }, inactive: { status: 'inactive' }, all: {} };
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const studentsFor = async (rows) => {
    const ids = rows.map((r) => r.userId).filter(Boolean);
    const users = ids.length ? await User.find({ _id: { $in: ids } }).select('name email phone cardNumber').lean() : [];
    const byId = new Map(users.map((u) => [String(u._id), u]));
    return (r) => {
        const u = r.userId ? byId.get(String(r.userId)) : null;
        return u ? { _id: u._id, name: u.name, email: u.email, phone: u.phone } : null;
    };
};

const shape = (r, student) => ({
    _id: r._id, code: r.code, status: r.status, cardNumber: r.cardNumber || null,
    linkedAt: r.linkedAt, linkedVia: r.linkedVia, rewardAmount: r.rewardAmount || 0, rewardedAt: r.rewardedAt,
    batch: r.batch || '', createdAt: r.createdAt, student
});

const listPassports = async (req, res) => {
    try {
        const state = STATE_QUERY[req.query.state] ? req.query.state : 'all';
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = 50;
        let filter = { ...STATE_QUERY[state] };
        const q = String(req.query.q || '').trim().slice(0, 60);
        if (q) {
            const pattern = new RegExp(escapeRegExp(q.replace(/\s+/g, '')), 'i');
            const users = await User.find({ $or: [{ name: new RegExp(escapeRegExp(q), 'i') }, { email: new RegExp(escapeRegExp(q), 'i') }] }).select('_id').limit(200).lean();
            filter = { ...filter, $or: [{ code: pattern }, { cardNumber: pattern }, { batch: pattern }, ...(users.length ? [{ userId: { $in: users.map((u) => u._id) } }] : [])] };
        }
        const [rows, total, free, linked, inactive, rewarded] = await Promise.all([
            Passport.find(filter).sort({ linkedAt: -1, createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Passport.countDocuments(filter),
            Passport.countDocuments(STATE_QUERY.free),
            Passport.countDocuments(STATE_QUERY.linked),
            Passport.countDocuments(STATE_QUERY.inactive),
            Passport.countDocuments({ rewardedAt: { $ne: null } })
        ]);
        const who = await studentsFor(rows);
        res.json({ passports: rows.map((r) => shape(r, who(r))), total, page, pages: Math.max(1, Math.ceil(total / limit)), counts: { free, linked, inactive, rewarded } });
    } catch (error) {
        send(res, error, 'Could not load the AI Passports.');
    }
};

const MAX_ADD = 5000;
const addPassports = async (req, res) => {
    try {
        const input = req.body?.codes;
        const list = Array.isArray(input) ? input : String(input || '').split(/[\s,;]+/);
        const codes = [...new Set(list.map(P.cleanCode).filter(Boolean))];
        if (!codes.length) return res.status(400).json({ message: 'Enter at least one AI Passport ID.' });
        if (codes.length > MAX_ADD) return res.status(400).json({ message: `Add up to ${MAX_ADD} IDs at a time.` });
        const short = codes.filter((c) => c.length < 4);
        const valid = codes.filter((c) => c.length >= 4);
        const existing = new Set((await Passport.find({ code: { $in: valid } }).select('code').lean()).map((p) => p.code));
        const fresh = valid.filter((c) => !existing.has(c));
        const batch = String(req.body?.batch || '').trim().slice(0, 60);
        if (fresh.length) {
            await Passport.insertMany(fresh.map((code) => ({ code, addedBy: req.admin._id, batch, qrText: code })), { ordered: false }).catch((e) => { if (e?.code !== 11000 && !e?.writeErrors) throw e; });
        }
        res.status(fresh.length ? 201 : 400).json({
            summary: { added: fresh.length, existing: existing.size, invalid: short.length },
            message: fresh.length
                ? `${fresh.length} AI Passport${fresh.length === 1 ? '' : 's'} added.${existing.size ? ` ${existing.size} already existed.` : ''}${short.length ? ` ${short.length} too short.` : ''}`
                : existing.size ? 'All of these IDs are already in the system.' : 'IDs need at least 4 letters or digits.'
        });
    } catch (error) {
        send(res, error, 'The AI Passports could not be added just now.');
    }
};

const lookupPassport = async (req, res) => {
    try {
        const raw = String(req.body?.code || '');
        const codes = P.candidatesOf(raw);
        const passport = codes.length ? await Passport.findOne({ code: { $in: codes } }).lean() : null;
        if (!passport) return res.status(404).json({ code: 'PASSPORT_NOT_FOUND', message: 'This AI Passport is not in the system. Add its ID first.' });
        const card = passport.cardId ? await Card.findById(passport.cardId).select('CardNumber status verified verifiedVia').lean() : null;
        const user = passport.userId ? await User.findById(passport.userId).select('name email phone').lean()
            : passport.cardNumber ? await findUserByCardNumber(passport.cardNumber).then((u) => (u ? { _id: u._id, name: u.name, email: u.email, phone: u.phone } : null)) : null;
        res.json({
            ...shape(passport, user ? { _id: user._id, name: user.name, email: user.email, phone: user.phone } : null),
            card: card ? { cardNumber: normaliseCardNumber(card.CardNumber), state: card.status === 'used' ? 'registered' : card.status === 'inactive' ? 'inactive' : card.verified ? 'verified' : 'waiting', verifiedVia: card.verifiedVia } : null
        });
    } catch (error) {
        send(res, error, 'That AI Passport could not be checked just now.');
    }
};

const setStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'AI Passport not found.' });
        const to = req.body?.status;
        if (!['free', 'inactive'].includes(to)) return res.status(400).json({ message: 'Choose free or inactive.' });
        const from = to === 'free' ? 'inactive' : 'free';
        const row = await Passport.findOneAndUpdate({ _id: req.params.id, status: from }, { $set: { status: to } }, { returnDocument: 'after' }).lean();
        if (!row) return res.status(400).json({ message: 'Only an AI Passport not linked to a card can be withdrawn or restored.' });
        res.json({ ...shape(row, null), message: to === 'inactive' ? `${row.code} withdrawn.` : `${row.code} can be scanned again.` });
    } catch (error) {
        send(res, error, 'Could not change that AI Passport.');
    }
};

// ── QR stickers (services/passportStickers.js) ───────────────────────────────
const stickers = require('../services/passportStickers');
const fromError = (res, error, fallback) => (error?.status ? res.status(error.status).json({ message: error.message }) : send(res, error, fallback));

const generatePassports = async (req, res) => {
    try {
        const result = await stickers.generate({ ...req.body, adminId: req.admin._id });
        res.status(201).json({ ...result, message: `${result.count} AI Passport QR code${result.count === 1 ? '' : 's'} created in "${result.batch}".` });
    } catch (error) { fromError(res, error, 'The QR codes could not be created just now.'); }
};

const listBatches = async (req, res) => {
    try { res.json({ batches: await stickers.batches(), linkBase: stickers.defaultLinkBase(), max: stickers.MAX_GENERATE }); }
    catch (error) { fromError(res, error, 'Could not load the batches.'); }
};

const downloadStickers = async (req, res) => {
    try {
        const { pdf } = await stickers.stickersPdf({ batch: req.query.batch, onlyFree: req.query.free === '1' });
        const name = `ai-passport-qr-${String(req.query.batch || 'batch').replace(/[^\w-]+/g, '-').slice(0, 60)}.pdf`;
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
        res.send(pdf);
    } catch (error) { fromError(res, error, 'The sticker sheet could not be made just now.'); }
};

module.exports = { claimByScan, linkAtSignup, myPassport, claimMine, listPassports, addPassports, lookupPassport, setStatus, generatePassports, listBatches, downloadStickers };
