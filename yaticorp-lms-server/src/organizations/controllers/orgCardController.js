/**
 * Students → Scan cards: the organization checks each card as it is scanned
 * or typed, then adds the lot (services/cardLink.js says what adding does).
 *
 *   GET    /api/organizations/me/cards              the cards scanned in, each with its student once registered
 *   POST   /api/organizations/me/cards/check   { code }    what adding this card would do
 *   POST   /api/organizations/me/cards         { codes }   add them: link free cards, bring in students
 *   DELETE /api/organizations/me/cards/:id                  unlink a card nobody has registered with yet
 */
const mongoose = require('mongoose');
const { normaliseCardNumber } = require('../../utils/cardNumber');
const Card = require('../../models/Card');
const User = require('../../models/User');
const JoinRequest = require('../models/JoinRequest');
const OrgAuditLog = require('../models/OrgAuditLog');
const { FREE } = require('../../services/cardVerification');
const { findCard, describeCard } = require('../services/cardLink');

const MAX_BATCH = 300;
const MAX_LIST = 500;

/** The organization's scanned cards, newest first: waiting, or with the student who registered. */
const listCards = async (req, res) => {
    try {
        const cards = await Card.find({ organizationId: req.organization._id }).select('CardNumber qrCodeNumber status organizationLinkedAt').sort({ organizationLinkedAt: -1, _id: -1 }).limit(MAX_LIST).lean();
        // Any card may have a student: registered (used), or made by the website's sync.
        const numbers = cards.flatMap((c) => [c.CardNumber, normaliseCardNumber(c.CardNumber)]);
        const qrs = cards.map((c) => c.qrCodeNumber).filter(Boolean);
        const students = cards.length
            ? await User.find({ $or: [{ cardNumber: { $in: numbers } }, { qrNumber: { $in: qrs } }] }).select('name email profilePicture cardNumber qrNumber organizationId createdAt').lean()
            : [];
        const studentFor = (c) => students.find((s) => normaliseCardNumber(s.cardNumber) === normaliseCardNumber(c.CardNumber)) || students.find((s) => s.qrNumber && s.qrNumber === c.qrCodeNumber);
        const rows = cards.map((c) => {
            const s = studentFor(c) || null;
            return {
                _id: c._id,
                cardNumber: normaliseCardNumber(c.CardNumber),
                linkedAt: c.organizationLinkedAt,
                state: s ? 'registered' : c.status === 'used' ? 'used' : c.status === 'inactive' ? 'inactive' : 'waiting',
                student: s ? { _id: s._id, name: s.name, email: s.email, profilePicture: s.profilePicture || '', registeredAt: s.createdAt, member: String(s.organizationId || '') === String(req.organization._id) } : null
            };
        });
        res.json({ cards: rows, waiting: rows.filter((r) => r.state === 'waiting').length, registered: rows.filter((r) => r.state === 'registered').length });
    } catch (error) {
        console.error('[org-cards] list failed:', error.message);
        res.status(500).json({ message: 'The scanned cards could not be loaded.' });
    }
};

/** Unlink a card nobody has registered with: it goes back to being an ordinary card. */
const unlinkCard = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'No such card among yours.' });
        const r = await Card.updateOne({ _id: req.params.id, organizationId: req.organization._id, status: { $ne: 'used' } }, { $set: { organizationId: null, organizationLinkedAt: null } });
        if (!r.modifiedCount) return res.status(404).json({ message: 'That card is not waiting any more: it may have been registered already.' });
        await OrgAuditLog.record({ orgId: req.organization._id, admin: req.admin, action: 'unlink-card', req, details: { cardId: req.params.id } });
        res.json({ message: 'The card is no longer linked to your organization.' });
    } catch (error) {
        console.error('[org-cards] unlink failed:', error.message);
        res.status(500).json({ message: 'The card could not be unlinked just now.' });
    }
};

const checkCard = async (req, res) => {
    try {
        const code = String(req.body?.code || '').trim().slice(0, 500);
        if (!code) return res.status(400).json({ message: 'Nothing was read from the card. Try again.' });
        const { student, ...answer } = await describeCard(await findCard(code), req.organization._id);
        res.json({ code, ...answer, ...(student ? { studentName: student.name } : {}) });
    } catch (error) {
        console.error('[org-cards] check failed:', error.message);
        res.status(500).json({ message: 'That card could not be checked just now.' });
    }
};

const linkCards = async (req, res) => {
    try {
        const codes = [...new Set((Array.isArray(req.body?.codes) ? req.body.codes : []).map((c) => String(c || '').trim().slice(0, 500)).filter(Boolean))];
        if (!codes.length) return res.status(400).json({ message: 'Scan or enter at least one card.' });
        if (codes.length > MAX_BATCH) return res.status(400).json({ message: `Add up to ${MAX_BATCH} cards at a time.` });
        const org = req.organization;
        const now = new Date();
        const results = [];
        const seen = new Set();
        for (const code of codes) {
            const card = await findCard(code);
            if (card && seen.has(String(card._id))) continue;      // the same card typed and scanned
            if (card) seen.add(String(card._id));
            const { student, ...answer } = await describeCard(card, org._id);
            if (!answer.addable) { results.push({ code, ...answer, done: false }); continue; }

            if (answer.result === 'ready') {
                // Linked only while it is still free and nobody else's.
                const r = await Card.updateOne({ _id: card._id, status: { $in: FREE }, organizationId: null }, { $set: { organizationId: org._id, organizationLinkedAt: now } });
                results.push(r.modifiedCount
                    ? { code, cardNumber: answer.cardNumber, result: 'linked_now', done: true, message: 'Linked: whoever registers with it joins your organization.' }
                    : { code, cardNumber: answer.cardNumber, result: 'changed', done: false, message: 'This card changed while you were adding it. Scan it again.' });
                continue;
            }

            // A registered student with no organization: they join now.
            const r = await User.updateOne({ _id: student._id, organizationId: null }, { $set: { organizationId: org._id, organizationJoinedAt: now } });
            if (!r.modifiedCount) {
                results.push({ code, cardNumber: answer.cardNumber, result: 'changed', done: false, message: `${student.name} joined another organization meanwhile.` });
                continue;
            }
            await Card.updateOne({ _id: card._id }, { $set: { organizationId: org._id, organizationLinkedAt: now } });
            await JoinRequest.updateMany({ userId: student._id, status: 'pending' }, { $set: { status: 'cancelled', decisionReason: `Added by ${org.name} with their card`, decidedAt: now, decidedBy: req.admin._id } });
            await OrgAuditLog.record({ orgId: org._id, admin: req.admin, action: 'add-student', req, details: { studentId: student._id, studentName: student.name, via: 'card' } });
            results.push({ code, cardNumber: answer.cardNumber, result: 'joined', done: true, studentName: student.name, message: `${student.name} is now in your organization.` });
        }
        const linked = results.filter((r) => r.result === 'linked_now').length;
        const joined = results.filter((r) => r.result === 'joined').length;
        if (linked) await OrgAuditLog.record({ orgId: org._id, admin: req.admin, action: 'link-cards', req, details: { count: linked } });
        const parts = [linked && `${linked} card${linked === 1 ? '' : 's'} linked`, joined && `${joined} student${joined === 1 ? '' : 's'} added`].filter(Boolean);
        res.json({
            results,
            summary: { linked, joined, skipped: results.length - linked - joined },
            message: parts.length ? `${parts.join(' and ')} to your organization.` : 'None of these cards could be added.'
        });
    } catch (error) {
        console.error('[org-cards] link failed:', error.message);
        res.status(500).json({ message: 'The cards could not be added just now. Please try again.' });
    }
};

module.exports = { listCards, checkCard, linkCards, unlinkCard };
