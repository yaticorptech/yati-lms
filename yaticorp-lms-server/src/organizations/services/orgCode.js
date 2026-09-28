/**
 * @description The public organization identifier: rules, tidying and lookup.
 *
 * An organization chooses its own ID when it registers (or a superadmin types
 * one when creating it), in the style of an Instagram handle: st_agnes_college,
 * abc.school2026. Nothing is generated. Lowercase letters, numbers, underscores
 * and full stops, 3 to 30 characters, at least one letter; a full stop cannot
 * start or end it, or sit next to another. It is stored lowercase, so however
 * a student types it, it finds the same organization.
 *
 * It is set once and never changed. Renaming an organization does not change
 * it: students may already be holding the old one. The schema marks it
 * immutable for the same reason.
 *
 * Organizations registered before this keep the IDs they were given
 * (ABC-2026-0001). Those are still recognised everywhere a student can type
 * an ID, so nothing that was ever handed out stops working. A new ID can never
 * collide with one of them: they contain hyphens, which a new ID cannot.
 */
const Organization = require('../models/Organization');

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

/** st_agnes_college, abc.school2026 */
const HANDLE_PATTERN = /^[a-z0-9._]+$/;
/** The generated IDs of old: ABC-2026-0001. Recognised, never issued. */
const LEGACY_PATTERN = /^[A-Z]+-\d{4}-\d{3,}$/;

/** IDs that would read as the platform's own. */
const RESERVED = new Set(['admin', 'administrator', 'superadmin', 'support', 'help', 'yaticorp', 'yati', 'organization', 'organizations', 'student', 'students', 'system', 'root', 'null', 'undefined']);

/**
 * Tidy whatever was typed into the stored form before checking or looking it up.
 *
 * People paste IDs with spaces around them, put an @ in front as they would a
 * handle, type in capitals, and copy old IDs out of documents that turn the
 * hyphen into a dash. None of that should read as "no such organization".
 */
const normalizeOrgCode = (input) => {
    const raw = String(input || '').trim().replace(/^@+/, '');
    // An old generated ID keeps its capitals, and forgives stray spaces and
    // dashes inside it (en/em dashes → hyphen), as it always did.
    const legacy = raw.replace(/[‐-―]/g, '-').replace(/\s+/g, '').toUpperCase();
    if (LEGACY_PATTERN.test(legacy)) return legacy;
    // A chosen ID is lowercase. A space inside one is left in, so it is refused
    // rather than quietly turned into a different ID.
    return raw.toLowerCase();
};

/**
 * Why `code` cannot be a new organization's ID, or null if it can.
 * `code` should already be normalized.
 */
const orgCodeProblem = (code) => {
    if (!code) return 'Choose an organization ID.';
    if (code.length < MIN_LENGTH) return `An organization ID needs at least ${MIN_LENGTH} characters.`;
    if (code.length > MAX_LENGTH) return `An organization ID can be at most ${MAX_LENGTH} characters.`;
    if (!HANDLE_PATTERN.test(code)) return 'Use only letters, numbers, underscores (_) and full stops (.).';
    if (!/[a-z]/.test(code)) return 'An organization ID needs at least one letter.';
    if (code.startsWith('.') || code.endsWith('.')) return 'An organization ID cannot start or end with a full stop.';
    if (code.includes('..')) return 'An organization ID cannot have two full stops in a row.';
    if (RESERVED.has(code.replace(/[._]/g, ''))) return 'That organization ID is reserved. Try another.';
    return null;
};

/** True for any ID a student might hold: a chosen one, or an old generated one. */
const isValidOrgCodeFormat = (input) => {
    const code = normalizeOrgCode(input);
    return LEGACY_PATTERN.test(code) || !orgCodeProblem(code);
};

/** True when an organization already has this ID. */
const isOrgCodeTaken = async (code) => Boolean(await Organization.exists({ orgCode: code }));

/**
 * Check an ID offered for a new organization.
 * Resolves to { code, error } — `error` is null when it is free to use.
 */
const checkNewOrgCode = async (input) => {
    const code = normalizeOrgCode(input);
    const problem = orgCodeProblem(code);
    if (problem) return { code, error: problem };
    if (await isOrgCodeTaken(code)) return { code, error: 'That organization ID already exists. Try another.', taken: true };
    return { code, error: null };
};

/** True when a failed insert failed on the organization ID, i.e. someone took it first. */
const isDuplicateOrgCode = (error) => error?.code === 11000
    && Object.keys(error.keyPattern || error.keyValue || {}).includes('orgCode');

module.exports = {
    MIN_LENGTH,
    MAX_LENGTH,
    normalizeOrgCode,
    orgCodeProblem,
    isValidOrgCodeFormat,
    isOrgCodeTaken,
    checkNewOrgCode,
    isDuplicateOrgCode
};
