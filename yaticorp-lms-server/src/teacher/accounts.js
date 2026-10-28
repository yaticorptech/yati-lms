/**
 * Making a teacher account from a card — the one path for all four ways in:
 * the teacher registering at sign-up, the admin adding one, an organization
 * adding one, and either of them uploading a spreadsheet of teachers.
 *
 * The rules are the same for all: the card's number, CVV and QR together,
 * a card that is neither used nor inactive, one card one account (student or
 * teacher), one teacher account per email, and a strong password. The card is
 * claimed in one step before the account is written, and given back if the
 * account cannot be made, so two people can never register the same card.
 */
const Card = require('../models/Card');
const Setting = require('../models/Setting');
const { normaliseCardNumber, findUserByCardNumber } = require('../utils/cardNumber');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const { Teacher } = require('./models');
const { NOT_VERIFIED, isVerified, verifiedFields } = require('../services/cardVerification');

const AVAILABLE_CARD = ['unactivated', 'activated'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A refusal the caller turns into a 400 (or a spreadsheet row's error). */
class AccountError extends Error {
    constructor(message, field, code) {
        super(message);
        this.field = field;
        this.code = code;
        this.status = 400;
    }
}

/** The teacher a card number belongs to, matched as digits. */
const findTeacherByCard = (raw) => {
    const digits = normaliseCardNumber(raw);
    if (!digits) return null;
    return Teacher.findOne({ cardNumber: { $in: [digits, digits.replace(/(\d{4})(?=\d)/g, '$1 ')] } });
};

/** Another teacher with this email, whatever its case or stray spaces. */
const emailTaken = (email, exceptId) => Teacher.exists({
    email: new RegExp(`^\\s*${escapeRegExp(email)}\\s*$`, 'i'),
    ...(exceptId ? { _id: { $ne: exceptId } } : {})
});

/** Name, email and phone, checked; throws AccountError on the first mistake. */
const checkDetails = ({ name, email, phone }) => {
    const n = String(name ?? '').trim();
    const e = String(email ?? '').trim().toLowerCase();
    const p = String(phone ?? '').trim();
    if (n.length < 2) throw new AccountError('Please enter the full name.', 'name');
    if (n.length > 80) throw new AccountError('Please keep the name under 80 characters.', 'name');
    if (!e) throw new AccountError('Please enter an email address.', 'email');
    if (!EMAIL_PATTERN.test(e) || e.length > 254) throw new AccountError('Enter a valid email address.', 'email');
    const digits = p.replace(/\D/g, '');
    if (!digits) throw new AccountError('Please enter a phone number.', 'phone');
    if (!/^\+?[\d\s().-]+$/.test(p) || digits.length < 7 || digits.length > 15) throw new AccountError('Please enter a valid phone number (7–15 digits).', 'phone');
    return { name: n, email: e, phone: p };
};

/** Whether teachers who register themselves must wait for an admin. */
const approvalRequired = async () => Boolean((await Setting.findOne().select('teacherApprovalRequired').lean())?.teacherApprovalRequired);

/**
 * The card named by input (CardNumber, CVV, qrCodeNumber), checked as free to
 * give a teacher: it exists, is unused and active, is verified (unless a
 * platform admin is adding, which verifies it), and no student or teacher
 * holds it. Resolves to { card, cardKey }, or throws AccountError.
 */
const freeCard = async (input, adminAdding) => {
    if (!input.CardNumber || !input.CVV || !input.qrCodeNumber) throw new AccountError('The card number, CVV and QR code are all needed.', 'card');
    // The three card values together, as text: an object from a body must
    // never reach the query. CVVs are printed in capitals; either case matches.
    const cvv = String(input.CVV).trim();
    const cardKey = { CardNumber: String(input.CardNumber).trim(), CVV: { $in: [...new Set([cvv, cvv.toUpperCase()])] }, qrCodeNumber: String(input.qrCodeNumber).trim() };
    const card = await Card.findOne(cardKey);
    if (!card) throw new AccountError('Those card details did not match. Check the card number, CVV and QR code.', 'card', 'CARD_INVALID');
    if (card.status === 'used') throw new AccountError('This card already has an account.', 'card', 'CARD_USED');
    if (!AVAILABLE_CARD.includes(card.status)) throw new AccountError('This card is inactive and cannot be used.', 'card', 'CARD_INACTIVE');
    if (!isVerified(card) && !adminAdding) throw new AccountError(NOT_VERIFIED.message, 'card', NOT_VERIFIED.code);
    // Already a student's or a teacher's, whatever the card's status says.
    if (await findUserByCardNumber(cardKey.CardNumber) || await findTeacherByCard(cardKey.CardNumber)) {
        throw new AccountError('This card already has an account.', 'card', 'CARD_USED');
    }
    return { card, cardKey };
};

/**
 * Give an AI card to a teacher who was added without one: the card is
 * claimed, and the teacher has the research tools from now on and signs in
 * with the card (their email no longer does). Resolves to the teacher, or
 * throws AccountError.
 */
const giveCard = async (teacher, input) => {
    if (teacher.cardNumber) throw new AccountError('This teacher already has a card.', 'card', 'HAS_CARD');
    const { card, cardKey } = await freeCard(input, false);
    const claimed = await Card.findOneAndUpdate({ _id: card._id, status: { $in: AVAILABLE_CARD } }, { $set: { status: 'used' } });
    if (!claimed) throw new AccountError('This card already has an account.', 'card', 'CARD_USED');
    try {
        const updated = await Teacher.findOneAndUpdate(
            { _id: teacher._id, cardNumber: { $in: [null, ''] } },
            { $set: { cardNumber: normaliseCardNumber(cardKey.CardNumber) || cardKey.CardNumber } },
            { new: true }
        );
        if (!updated) throw new AccountError('This teacher already has a card.', 'card', 'HAS_CARD');
        return updated;
    } catch (error) {
        await Card.updateOne({ _id: card._id, status: 'used' }, { $set: { status: claimed.status } }).catch(() => {});
        if (error?.code === 11000 && error.keyPattern?.cardNumber) throw new AccountError('This card already has an account.', 'card', 'CARD_USED');
        throw error;
    }
};

/**
 * Make a teacher account. `input` holds name, email, phone, password, the
 * card (CardNumber, CVV, qrCodeNumber) and optionally institution,
 * department and designation. `options.by` is 'self', 'admin' or
 * 'organization'; `options.organizationId` makes them a member at once;
 * `options.status` overrides the starting status; `options.adminId` is the
 * admin adding them. A card a super admin has not verified is refused —
 * unless a platform admin is adding the teacher, which verifies it.
 * Resolves to the teacher, or throws AccountError.
 */
const createTeacher = async (input, options = {}) => {
    const { name, email, phone } = checkDetails(input);
    const password = typeof input.password === 'string' ? input.password : String(input.password ?? '');
    if (!input.CardNumber || !input.CVV || !input.qrCodeNumber) throw new AccountError('The card number, CVV and QR code are all needed.', 'card');
    if (!password) throw new AccountError('Please choose a password.', 'password');
    const weak = validatePasswordStrength(password);
    if (weak) throw new AccountError(weak, 'password');
    const adminAdding = options.by === 'admin';
    const { card, cardKey } = await freeCard(input, adminAdding);
    if (await emailTaken(email)) throw new AccountError('A teacher account already uses this email address.', 'email', 'EMAIL_TAKEN');

    const by = options.by || 'self';
    const status = options.status || (by === 'self' && await approvalRequired() ? 'pending' : 'active');

    // Claim the card first, in one step; put it back if the account fails.
    const claimed = await Card.findOneAndUpdate(
        { _id: card._id, status: { $in: AVAILABLE_CARD } },
        { $set: { status: 'used', ...(adminAdding && !isVerified(card) ? verifiedFields(options.adminId, 'account') : {}) } }
    );
    if (!claimed) throw new AccountError('This card already has an account.', 'card', 'CARD_USED');

    try {
        return await Teacher.create({
            name, email, phone, password, status,
            createdBy: by,
            cardNumber: normaliseCardNumber(cardKey.CardNumber) || cardKey.CardNumber,
            institution: String(input.institution ?? '').trim().slice(0, 200),
            department: String(input.department ?? '').trim().slice(0, 200),
            designation: String(input.designation ?? '').trim().slice(0, 100),
            organizationId: options.organizationId || null,
            organizationJoinedAt: options.organizationId ? new Date() : null,
            ...(by === 'self' && status === 'active' ? { loginCount: 1, lastLoginAt: new Date() } : {})
        });
    } catch (error) {
        await Card.updateOne({ _id: card._id, status: 'used' }, { $set: { status: claimed.status, verified: claimed.verified === true, verifiedAt: claimed.verifiedAt || null, verifiedBy: claimed.verifiedBy || null, verifiedVia: claimed.verifiedVia || null } }).catch(() => {});
        if (error?.code === 11000 && error.keyPattern?.email) throw new AccountError('A teacher account already uses this email address.', 'email', 'EMAIL_TAKEN');
        if (error?.code === 11000 && error.keyPattern?.cardNumber) throw new AccountError('This card already has an account.', 'card', 'CARD_USED');
        throw error;
    }
};

/**
 * The rows of an uploaded spreadsheet, made into accounts one by one. Columns
 * as in the template: Name, Email, Phone, CardNumber, CVV, QRCodeNumber,
 * Password, and optionally Institution, Department, Designation. Resolves to
 * { successCount, failedCount, errors: [{ row, email, message }], created }.
 */
/**
 * A teacher with no AI card, added by their organization to lead its clubs or
 * Scouts & Guides units: email and password to sign in, no research tools.
 * Throws AccountError, as createTeacher does.
 */
const createActivityTeacher = async (input, { organizationId }) => {
    const { name, email, phone } = checkDetails(input);
    const password = typeof input.password === 'string' ? input.password : '';
    if (!password) throw new AccountError('Please choose a password.', 'password');
    const weak = validatePasswordStrength(password);
    if (weak) throw new AccountError(weak, 'password');
    if (await emailTaken(email)) throw new AccountError('A teacher account already uses this email address.', 'email', 'EMAIL_TAKEN');
    try {
        return await Teacher.create({
            name, email, phone, password, status: 'active', createdBy: 'organization',
            organizationId, organizationJoinedAt: new Date(),
            institution: String(input.institution || '').trim(),
            department: String(input.department || '').trim(),
            designation: String(input.designation || '').trim()
        });
    } catch (error) {
        if (error?.code === 11000 && error.keyPattern?.email) throw new AccountError('A teacher account already uses this email address.', 'email', 'EMAIL_TAKEN');
        throw error;
    }
};

const createFromSheet = async (buffer, options) => {
    const XLSX = require('xlsx');
    let rows;
    try {
        const book = XLSX.read(buffer, { type: 'buffer' });
        rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
    } catch {
        throw new AccountError('That file could not be read. Upload the Excel template (.xlsx).', 'file');
    }
    if (!rows.length) throw new AccountError('The spreadsheet has no rows. Fill in the template and upload it again.', 'file');
    if (rows.length > 500) throw new AccountError('Upload up to 500 teachers at a time.', 'file');

    // Headings matched loosely: "Card Number", "cardnumber" and "CardNumber" are one column.
    const pick = (row, ...names) => {
        const keys = Object.keys(row);
        for (const name of names) {
            const key = keys.find((k) => k.replace(/[^a-z]/gi, '').toLowerCase() === name.toLowerCase());
            if (key !== undefined && String(row[key]).trim() !== '') return String(row[key]).trim();
        }
        return '';
    };

    const results = { successCount: 0, failedCount: 0, errors: [], created: [] };
    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const email = pick(row, 'Email');
        try {
            const teacher = await createTeacher({
                name: pick(row, 'Name'), email, phone: pick(row, 'Phone'),
                password: pick(row, 'Password'),
                CardNumber: pick(row, 'CardNumber'), CVV: pick(row, 'CVV'), qrCodeNumber: pick(row, 'QRCodeNumber', 'QRCode', 'QR'),
                institution: pick(row, 'Institution'), department: pick(row, 'Department'), designation: pick(row, 'Designation')
            }, options);
            results.successCount += 1;
            results.created.push({ teacher, password: pick(row, 'Password') });
        } catch (error) {
            if (!(error instanceof AccountError)) console.error('[teacher] sheet row failed:', error.message);
            results.failedCount += 1;
            results.errors.push({ row: i + 2, email: email || 'N/A', message: error instanceof AccountError ? error.message : 'Could not be added just now.' });
        }
    }
    return results;
};

const clean = (s) => String(s ?? '').replace(/[<>&"]/g, '');

/**
 * The welcome email for an account someone else made: how to sign in as a
 * teacher, and the password they were given. Never throws — an account is
 * not undone because a mail server was slow.
 */
const sendWelcome = async (teacher, password, madeBy) => {
    try {
        const url = process.env.FRONTEND_URL || process.env.VITE_STUDENT_URL || 'http://localhost:5173';
        // With a card: the research side. Without: their clubs and units, signed in by email.
        const carded = Boolean(teacher.cardNumber);
        await require('../utils/emailService').sendEmail({
            to: teacher.email,
            toName: teacher.name,
            subject: 'Your YATICORP teacher account',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #059669;">${carded ? 'Welcome to YATICORP Research' : 'Welcome to YATICORP'}</h2>
                    <p>Hi <strong>${clean(teacher.name)}</strong>,</p>
                    <p>${clean(madeBy)} has made a teacher account for you${carded ? ': a step-by-step guide for your research, thesis and publications' : ', to run the clubs and Scouts &amp; Guides units you lead'}.</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>${carded ? 'Card number' : 'Email'}:</strong> ${clean(carded ? teacher.cardNumber : teacher.email)}</p>
                        <p style="margin: 0;"><strong>Password:</strong> ${clean(password)}</p>
                    </div>
                    <p>To sign in, open the link below, choose <strong>Teacher</strong>, and enter your ${carded ? 'card number' : 'email'} and password.</p>
                    <p style="color: #d97706; font-size: 0.9em;"><em>Please change your password after you sign in (Profile → Change password).</em></p>
                    <p style="margin-top: 25px;">
                        <a href="${url}/login?as=teacher" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sign in as a teacher</a>
                    </p>
                </div>`
        });
    } catch (error) {
        console.error('[teacher] welcome email failed:', error.message);
    }
};

module.exports = { AccountError, createTeacher, createActivityTeacher, giveCard, createFromSheet, sendWelcome, findTeacherByCard, checkDetails, emailTaken, approvalRequired, EMAIL_PATTERN, escapeRegExp };
