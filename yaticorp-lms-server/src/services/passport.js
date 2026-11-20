/**
 * AI Passport books: the QR sticker on the book's last page.
 *
 * The first scan links the book to one student card, for good:
 *  - the card counts as verified (verifiedVia 'passport'), so a new student
 *    can register without an admin verifying the card by hand;
 *  - the student's account gets the one-off wallet reward — the starting
 *    credit, ₹1,50,000 by default — paid once, under the same 'starting-credit'
 *    key, so nobody can be paid it twice by any route.
 * A book already linked answers for its own card only.
 */
const Passport = require('../models/Passport');
const Card = require('../models/Card');
const { FREE } = require('./cardVerification');
const { normaliseCardNumber } = require('../utils/cardNumber');

const fail = (message, code, status = 400) => Object.assign(new Error(message), { code, status });

/** A code as stored: upper-case letters and digits (and - _), no spaces. */
const cleanCode = (raw) => String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);

/**
 * What a scanned passport QR might hold: the ID alone, or a link with the ID
 * at its end (…/passport/ABC123 or ?code=ABC123). Both ways are tried.
 */
const candidatesOf = (raw) => {
    const text = String(raw || '').trim().slice(0, 500);
    const tail = text.split(/[?#/=&]/).filter(Boolean).pop() || text;
    return [...new Set([cleanCode(text), cleanCode(tail)].filter(Boolean))];
};

const findPassport = async (raw) => {
    const codes = candidatesOf(raw);
    if (!codes.length) throw fail('Scan the QR on the last page of your AI Passport, or type the ID printed under it.', 'PASSPORT_EMPTY');
    const passport = await Passport.findOne({ code: { $in: codes } });
    if (!passport) throw fail('This AI Passport QR was not recognised. Check the ID printed under the QR and try again.', 'PASSPORT_NOT_FOUND', 404);
    if (passport.status === 'inactive') throw fail('This AI Passport has been withdrawn. Contact support.', 'PASSPORT_INACTIVE');
    return passport;
};

/**
 * Link a passport to a card. Idempotent for the same pair; refuses a book
 * linked to another card, or a card that already has another book.
 */
const linkToCard = async ({ passport, card, via, adminId = null }) => {
    const cardNumber = normaliseCardNumber(card.CardNumber);
    if (passport.status === 'linked') {
        if (String(passport.cardId) === String(card._id)) return { passport, already: true };
        throw fail('This AI Passport is already linked to another student card.', 'PASSPORT_TAKEN', 409);
    }
    if (card.passportCode && card.passportCode !== passport.code) {
        throw fail(`This card is already linked to AI Passport ${card.passportCode}.`, 'CARD_HAS_PASSPORT', 409);
    }
    if (card.status === 'inactive') throw fail('This card is inactive and cannot be used.', 'CARD_INACTIVE');

    // Claim the book first, conditionally, so two scans racing cannot both win.
    const linked = await Passport.findOneAndUpdate(
        { _id: passport._id, status: 'free' },
        { $set: { status: 'linked', cardId: card._id, cardNumber, linkedAt: new Date(), linkedVia: via } },
        { returnDocument: 'after' }
    );
    if (!linked) throw fail('This AI Passport is already linked to another student card.', 'PASSPORT_TAKEN', 409);

    const set = { passportCode: linked.code };
    // A free card not yet verified is verified by its passport; registered
    // cards are left as they are apart from the link.
    if (FREE.includes(card.status) && card.verified !== true) {
        Object.assign(set, { verified: true, verifiedAt: new Date(), verifiedBy: adminId, verifiedVia: 'passport' });
    }
    const updated = await Card.updateOne({ _id: card._id, $or: [{ passportCode: null }, { passportCode: { $exists: false } }, { passportCode: linked.code }] }, { $set: set });
    if (!updated.matchedCount) {
        await Passport.updateOne({ _id: linked._id }, { $set: { status: 'free', cardId: null, cardNumber: null, linkedAt: null, linkedVia: null } });
        throw fail('This card is already linked to another AI Passport.', 'CARD_HAS_PASSPORT', 409);
    }
    return { passport: linked, already: false };
};

/**
 * Pay the passport reward to a student once their account exists. Returns
 * { amount, paid } — paid false when it was already paid (by this book or as
 * an earlier starting credit) or the reward is off.
 */
const payReward = async (userId, passport) => {
    const W = require('../rewards/services/walletService');
    const { getConfig } = require('../rewards/services/configService');
    const config = await getConfig();
    const amount = W.money(config.startingCredit || 0);
    if (passport && !passport.userId) await Passport.updateOne({ _id: passport._id, userId: null }, { $set: { userId } });
    if (!(amount > 0)) return { amount: 0, paid: false };
    const result = await W.credit({
        userId, amount, source: 'starting_credit', referenceKey: 'starting-credit', spendOnly: true,
        description: 'AI Passport reward', meta: { passportCode: passport?.code || null }
    });
    if (result?.duplicate) return { amount, paid: false };
    if (passport) await Passport.updateOne({ _id: passport._id }, { $set: { rewardAmount: amount, rewardedAt: new Date() } });
    try {
        const { notify, celebrate, LINKS, formatMoney } = require('../rewards/services/notify');
        await notify(userId, 'AI Passport reward unlocked', `${formatMoney(amount)} has been added to your wallet for scanning your AI Passport.`, LINKS.wallet);
        await celebrate(userId, 'wallet', 'AI Passport reward unlocked', `${formatMoney(amount)} added to your wallet`, { amount, passportCode: passport?.code });
    } catch { /* best effort */ }
    return { amount, paid: true };
};

/** A card's details for the sign-up form, as validate-qr returns them. */
const cardForSignup = (card) => ({ cardNumber: card.CardNumber, cvv: card.CVV, qrCodeNumber: card.qrCodeNumber });

/**
 * A signed-in student scanning their book from the app: link it to their
 * card (if it is not already) and pay the reward.
 */
const claimForUser = async (user, raw) => {
    const passport = await findPassport(raw);
    const digits = normaliseCardNumber(user.cardNumber);
    const numbers = [...new Set([String(user.cardNumber || ''), digits, digits.replace(/(\d{4})(?=\d)/g, '$1 ')].filter(Boolean))];
    const card = await Card.findOne({ $or: [{ CardNumber: { $in: numbers } }, ...(user.qrNumber ? [{ qrCodeNumber: user.qrNumber }] : [])] });
    if (!card) throw fail('No student card is on your account, so an AI Passport cannot be linked. Contact support.', 'NO_CARD', 404);
    if (passport.status === 'linked' && String(passport.cardId) !== String(card._id)) {
        throw fail('This AI Passport is already linked to another student card.', 'PASSPORT_TAKEN', 409);
    }
    const { passport: linked } = await linkToCard({ passport, card, via: 'app' });
    const reward = await payReward(user._id, linked);
    return { passportCode: linked.code, cardNumber: normaliseCardNumber(card.CardNumber), reward };
};

/** The passport linked to a student, for the wallet. */
const statusForUser = async (user) => {
    const passport = await Passport.findOne({ $or: [{ userId: user._id }, { cardNumber: normaliseCardNumber(user.cardNumber) }] }).select('code linkedAt rewardAmount rewardedAt').lean();
    const { getConfig } = require('../rewards/services/configService');
    const config = await getConfig();
    return {
        linked: Boolean(passport),
        code: passport?.code || null,
        linkedAt: passport?.linkedAt || null,
        rewardedAt: passport?.rewardedAt || null,
        rewardAmount: passport?.rewardAmount || 0,
        reward: Number(config.startingCredit || 0)
    };
};

module.exports = { cleanCode, candidatesOf, findPassport, linkToCard, payReward, cardForSignup, claimForUser, statusForUser };
