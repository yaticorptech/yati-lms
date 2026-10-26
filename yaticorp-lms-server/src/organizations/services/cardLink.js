/**
 * Cards linked to an organization (Students → Scan cards).
 *
 * An organization scans a pile of cards and adds them in one go. A card not
 * yet registered is linked: the student who registers with it later joins
 * the organization at once, without a request. A card already registered
 * brings its student in now, if they belong to no organization. Members of
 * another organization, unverified, inactive and unknown cards are listed
 * and left as they are. (The user's choice, 2026-10-26.)
 */
const Card = require('../../models/Card');
const User = require('../../models/User');
const Organization = require('../models/Organization');
const { isVerified, FREE } = require('../../services/cardVerification');
const { normaliseCardNumber } = require('../../utils/cardNumber');

/** The card a scanned or typed code names: its QR code, or its number with or without spaces. */
const findCard = (code) => {
    const { scanCandidates } = require('../../controllers/registrationController');
    const candidates = scanCandidates(code);
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length === 12) candidates.push(digits, digits.replace(/(\d{4})(?=\d)/g, '$1 '));
    return Card.findOne({ $or: [{ qrCodeNumber: { $in: candidates } }, { CardNumber: { $in: candidates } }] })
        .select('CardNumber qrCodeNumber status verified organizationId').lean();
};

/** The student account a registered card opened, if it is a student's. */
const studentOf = (card) => User.findOne({ $or: [{ cardNumber: { $in: [card.CardNumber, normaliseCardNumber(card.CardNumber)] } }, ...(card.qrCodeNumber ? [{ qrNumber: card.qrCodeNumber }] : [])] })
    .select('name organizationId').lean();

/**
 * What adding this card would do for this organization: { cardNumber,
 * result, addable, message, student? }. `addable` cards are the ones
 * "Add to organization" changes.
 */
const describeCard = async (card, organizationId) => {
    if (!card) return { result: 'not_found', addable: false, message: 'No card with this number or QR code.' };
    const cardNumber = normaliseCardNumber(card.CardNumber);
    const ours = (id) => String(id || '') === String(organizationId);
    if (card.status === 'inactive') return { cardNumber, result: 'inactive', addable: false, message: 'This card is inactive.' };
    if (card.status === 'used') {
        const student = await studentOf(card);
        if (!student) return { cardNumber, result: 'not_student', addable: false, message: 'Used by an account that is not a student.' };
        if (ours(student.organizationId)) return { cardNumber, result: 'member', addable: false, message: `${student.name} is already in your organization.` };
        if (student.organizationId && await Organization.exists({ _id: student.organizationId })) {
            return { cardNumber, result: 'member_elsewhere', addable: false, message: `${student.name} belongs to another organization.` };
        }
        return { cardNumber, result: 'student', addable: true, student, message: `${student.name} joins your organization.` };
    }
    if (!FREE.includes(card.status)) return { cardNumber, result: 'inactive', addable: false, message: 'This card cannot be used.' };
    // An account the main website made with this card, which it does not mark used.
    const holder = await studentOf(card);
    if (holder) {
        if (ours(holder.organizationId)) return { cardNumber, result: 'member', addable: false, message: `${holder.name} is already in your organization.` };
        if (holder.organizationId && await Organization.exists({ _id: holder.organizationId })) return { cardNumber, result: 'member_elsewhere', addable: false, message: `${holder.name} belongs to another organization.` };
        return { cardNumber, result: 'student', addable: true, student: holder, message: `${holder.name} joins your organization.` };
    }
    if (!isVerified(card)) return { cardNumber, result: 'not_verified', addable: false, message: 'Not verified by YATICORP yet.' };
    if (ours(card.organizationId)) return { cardNumber, result: 'linked', addable: false, message: 'Already linked to your organization.' };
    if (card.organizationId) return { cardNumber, result: 'linked_elsewhere', addable: false, message: 'Linked to another organization.' };
    return { cardNumber, result: 'ready', addable: true, message: 'Whoever registers with it joins your organization.' };
};

/**
 * A new account opened with a linked card joins that organization, if it is
 * active and the account belongs to none yet. Returns the organization, or
 * null. Never throws: the account stands either way.
 */
const joinLinkedOrganization = async (userId, card) => {
    try {
        if (!card?.organizationId) return null;
        const organization = await Organization.findOne({ _id: card.organizationId, status: 'active' }).select('name orgCode').lean();
        if (!organization) return null;
        const joined = await User.updateOne({ _id: userId, organizationId: null }, { $set: { organizationId: organization._id, organizationJoinedAt: new Date() } });
        return joined.modifiedCount ? organization : null;
    } catch (error) {
        console.error('[cards] could not join the linked organization:', error.message);
        return null;
    }
};

/**
 * A student signing in (or synced from the main website) whose card an
 * organization linked joins it, if they belong to none yet: an account made
 * some other way than sign-up (the website's activation sync does not mark
 * the card used) still lands in the organization's list. Never throws.
 */
const joinByCard = async (user) => {
    try {
        if (!user || user.organizationId) return null;
        const number = String(user.cardNumber || '');
        const card = await Card.findOne({
            organizationId: { $ne: null },
            $or: [{ CardNumber: { $in: [number, normaliseCardNumber(number), normaliseCardNumber(number).replace(/(\d{4})(?=\d)/g, '$1 ')] } }, ...(user.qrNumber ? [{ qrCodeNumber: user.qrNumber }] : [])]
        }).select('organizationId').lean();
        return card ? joinLinkedOrganization(user._id, card) : null;
    } catch (error) {
        console.error('[cards] could not join by card:', error.message);
        return null;
    }
};

module.exports = { findCard, describeCard, joinLinkedOrganization, joinByCard, studentOf };
