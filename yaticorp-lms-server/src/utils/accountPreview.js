/**
 * Who a card belongs to, shown before a password reset link is sent, so the
 * person at the screen can check it is their account and where the link will
 * go: their photo, and only partly the first name with the last name's initial, and the email
 * with the middle of its name and most of its domain hidden
 * ("bh******a20@g****.com"). Enough for the owner to recognise; little for
 * someone trying card numbers to collect.
 */
const maskPart = (s, keep) => (s.length <= keep ? `${s[0] || ''}*` : s.slice(0, keep) + '*'.repeat(Math.min(6, s.length - keep)));

const maskEmail = (email = '') => {
    const [local, domain] = String(email).trim().split('@');
    if (!local || !domain) return '';
    const dot = domain.lastIndexOf('.');
    const host = dot > 0 ? domain.slice(0, dot) : domain;
    const tld = dot > 0 ? domain.slice(dot) : '';
    // The name before the @ keeps its first two and last three letters when it is long enough to hide something between.
    const name = local.length > 6 ? `${local.slice(0, 2)}${'*'.repeat(Math.min(6, local.length - 5))}${local.slice(-3)}` : maskPart(local, 2);
    return `${name}@${maskPart(host, 1)}${tld}`;
};

const shortName = (name = '') => {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    return words.length > 1 ? `${words[0]} ${words[words.length - 1][0].toUpperCase()}.` : words[0];
};

/** The reply for an account, or null when it has no email to send to. */
const accountPreview = (account) => (account?.email
    ? { name: shortName(account.name), email: maskEmail(account.email), photo: account.profilePicture || '' }
    : null);

module.exports = { accountPreview, maskEmail, shortName };
