/**
 * One box for signing in (2026-10-30): a card number, a mobile number, or an
 * email (a teacher with no card). What was typed says which; the sign-in then
 * finds the account, student or teacher, and the app lands it on its side.
 *
 * A mobile number matches however it was saved — with or without a country
 * code, spaces or dashes. Several accounts may share one (a parent's phone),
 * so the one whose password matches is the one signed in; when more than one
 * does, the card number is asked for instead.
 */

/** What a typed value is: { kind: 'email'|'card'|'phone'|'card-or-phone'|'empty', value, digits }. */
const kindOf = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return { kind: 'empty' };
    if (s.includes('@')) return { kind: 'email', value: s.toLowerCase() };
    // Letters: a card of another series (test and demo cards), never a phone.
    if (/[a-z]/i.test(s)) return { kind: 'card', value: s };
    const digits = s.replace(/\D/g, '');
    if (s.startsWith('+')) return { kind: 'phone', digits };
    // Twelve digits is a card number — or a mobile number with its country code.
    if (digits.length === 12) return { kind: 'card-or-phone', value: digits, digits };
    if (digits.length >= 7 && digits.length <= 15) return { kind: 'phone', digits };
    return { kind: 'card', value: s };
};

/** A stored phone that is this number, whatever separators, leading 0 or country code it carries. */
const phonePattern = (digits) => {
    const tail = digits.length > 10 ? digits.slice(-10) : digits;
    return new RegExp(`^\\D*(?:\\d{1,3}\\D*)?0?${tail.split('').join('\\D*')}\\D*$`);
};

// More accounts than this on one number: the card is asked for rather than
// trying every password.
const PHONE_CANDIDATES = 50;

/**
 * The account on this phone whose password matches. Resolves
 * { account } | { shared: true } | { tooMany: true } | { wrongPassword: true } | {}.
 */
const byPhone = async (Model, digits, password) => {
    const found = await Model.find({ phone: { $regex: phonePattern(digits) } }).limit(PHONE_CANDIDATES + 1);
    if (found.length > PHONE_CANDIDATES) return { tooMany: true };
    const matches = [];
    for (const a of found) if (await a.matchPassword(password)) matches.push(a);
    if (matches.length === 1) return { account: matches[0] };
    if (matches.length > 1) return { shared: true };
    // A teacher their organization added who has not set a password yet.
    if (found.some((a) => a.passwordPending)) return { pending: true, wrongPassword: found.some((a) => !a.passwordPending) };
    return found.length ? { wrongPassword: true } : {};
};

const SHARED_PHONE = 'More than one account uses this mobile number and password. Sign in with your card number instead.';
const TOO_MANY_ON_PHONE = 'Too many accounts use this mobile number. Sign in with your card number instead.';
const PASSWORD_NOT_SET = 'Your organization added you, but you have not set up your account yet. Open Sign Up, choose Teacher, and verify with this mobile number.';

module.exports = { kindOf, phonePattern, byPhone, SHARED_PHONE, TOO_MANY_ON_PHONE, PASSWORD_NOT_SET };
