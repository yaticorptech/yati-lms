/**
 * Organization ID rules, as the forms apply them while someone types.
 *
 * The same rules as the server (yaticorp-lms-server/src/organizations/services/
 * orgCode.js), so a typo is caught before a request; the server's check is the
 * one that decides. An ID is chosen, Instagram-handle style: lowercase letters,
 * numbers, underscores and full stops, 3–30 characters, at least one letter,
 * no full stop at either end or two in a row.
 */
export const ORG_CODE_MAX = 30;
const RESERVED = new Set(['admin', 'administrator', 'superadmin', 'support', 'help', 'yaticorp', 'yati', 'organization', 'organizations', 'student', 'students', 'system', 'root', 'null', 'undefined']);

/** What the box holds as someone types: lowercase, no @, spaces as underscores. */
export const tidyOrgCode = (value) => String(value || '')
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/\s/g, '_')
    .slice(0, ORG_CODE_MAX);

/** Why `code` cannot be used, or '' if it can. */
export const orgCodeProblem = (code) => {
    if (!code) return 'Choose an Organization ID.';
    if (code.length < 3) return 'At least 3 characters.';
    if (code.length > ORG_CODE_MAX) return `At most ${ORG_CODE_MAX} characters.`;
    if (!/^[a-z0-9._]+$/.test(code)) return 'Use only letters, numbers, underscores (_) and full stops (.).';
    if (!/[a-z]/.test(code)) return 'Needs at least one letter.';
    if (code.startsWith('.') || code.endsWith('.')) return 'Cannot start or end with a full stop.';
    if (code.includes('..')) return 'Cannot have two full stops in a row.';
    if (RESERVED.has(code.replace(/[._]/g, ''))) return 'That ID is reserved. Try another.';
    return '';
};

/** An ID made from the organization's name: "St. Agnes College" → st_agnes_college. */
export const suggestOrgCode = (name) => String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('_')
    .slice(0, ORG_CODE_MAX)
    .replace(/_+$/, '');
