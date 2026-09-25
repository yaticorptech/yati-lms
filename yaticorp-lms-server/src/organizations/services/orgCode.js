/**
 * @description Minting and reading the public organization identifier.
 *
 * Shape: <NAME>-<year>-<four digits>, e.g. ABC-2026-0001 for "ABC College".
 * The prefix is the organization's own first word, so a student reading the ID
 * off a handout can tell at a glance whose it is — which a fixed "ORG" on every
 * organization could not.
 *
 * It is generated once at registration and never regenerated. Renaming an
 * organization does not change it: students may already be holding the old one,
 * and a code that quietly stopped working would be worse than one that no longer
 * matches the name. The schema marks it immutable for the same reason.
 *
 * Organizations created before this shape keep their ORG-… codes. They are still
 * valid: the pattern below accepts any letter prefix, so nothing that was ever
 * issued stops being recognised.
 */
const Counter = require('../models/Counter');
const Organization = require('../models/Organization');

const PAD = 4;
/** Long enough to be recognisable, short enough to read out. */
const MAX_PREFIX = 12;
/** When a name yields no letters at all. */
const FALLBACK_PREFIX = 'ORG';

/** ABC-2026-0001 → matches. Also accepts lowercase and stray spaces. */
const CODE_PATTERN = /^[A-Z]+-\d{4}-\d{3,}$/;

/**
 * The letters an organization's ID starts with: its first word, uppercased.
 *
 * The first word that contains any letters, rather than strictly the first: a
 * name like "123 Training Centre" starts with a word that has none, and would
 * otherwise yield an empty prefix. Punctuation is dropped on the way, so
 * "St. Mary's School" gives ST and "ABC College" gives ABC.
 *
 * Two organizations whose names start with the same word share a prefix, which
 * is fine: the year and the running number keep the whole code unique, and the
 * unique index is what actually guarantees it.
 */
const prefixFromName = (name) => {
    const words = String(name || '').trim().split(/\s+/);
    for (const word of words) {
        const letters = word.replace(/[^A-Za-z]/g, '').toUpperCase();
        if (letters) return letters.slice(0, MAX_PREFIX);
    }
    return FALLBACK_PREFIX;
};

/**
 * Tidy whatever the student typed into the canonical form before looking it up.
 *
 * People paste codes with trailing spaces, type them in lower case, and copy
 * them out of documents that turn the hyphen into an en dash. None of that
 * should read as "no such organization".
 */
const normalizeOrgCode = (input) => String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[‐-―]/g, '-')   // en/em dashes → hyphen
    .replace(/\s+/g, '');

const isValidOrgCodeFormat = (input) => CODE_PATTERN.test(normalizeOrgCode(input));

/**
 * The next unused code for this organization, in this year.
 *
 * The running number is shared across every organization in the year rather than
 * kept per prefix. One counter is one atomic increment; a counter per prefix
 * would be a second document to keep in step for no gain, since the number only
 * has to make the code unique, not count anything.
 *
 * The counter can still fall behind the collection — a database restored without
 * `org_counters` brings organizations without their counter — so the caller
 * retries, and each retry asks for the next number rather than the same one.
 */
const nextOrgCode = async (name, year = new Date().getFullYear()) => {
    const counter = await Counter.findOneAndUpdate(
        { _id: `org-${year}` },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return `${prefixFromName(name)}-${year}-${String(counter.seq).padStart(PAD, '0')}`;
};

/**
 * Run `create` with a freshly minted code, retrying on the duplicate-key error
 * that a counter out of step with the collection produces.
 *
 * Retries are bounded: a genuine duplicate on some other unique field (the
 * organization's email) must surface as itself, not spin here.
 */
const createWithOrgCode = async (name, create, attempts = 5) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        const orgCode = await nextOrgCode(name);
        try {
            return await create(orgCode);
        } catch (error) {
            const duplicateOrgCode = error?.code === 11000
                && Object.keys(error.keyPattern || error.keyValue || {}).includes('orgCode');
            if (!duplicateOrgCode) throw error;
            lastError = error;
        }
    }
    throw lastError;
};

/**
 * Bring the counter up to at least the highest number already issued this year.
 *
 * Called once at startup. Without it, a database restored without its
 * `org_counters` collection would reissue 0001 and lean on the retry loop for
 * every registration until the counter caught up.
 *
 * The highest number is computed rather than sorted for: codes now start with
 * different words, so sorting by `orgCode` would order them alphabetically and
 * hand back whichever organization's name happens to sort last.
 */
const syncCounterFromExisting = async (year = new Date().getFullYear()) => {
    const thisYear = await Organization
        .find({ orgCode: new RegExp(`-${year}-\\d+$`) })
        .select('orgCode')
        .lean();
    if (!thisYear.length) return;

    const numbers = thisYear
        .map((o) => Number(String(o.orgCode).split('-').pop()))
        .filter(Number.isFinite);
    if (!numbers.length) return;

    const highest = Math.max(...numbers);
    const counter = await Counter.findById(`org-${year}`).lean();
    if ((counter?.seq ?? 0) >= highest) return;

    await Counter.updateOne({ _id: `org-${year}` }, { $set: { seq: highest } }, { upsert: true });
};

module.exports = {
    prefixFromName,
    nextOrgCode,
    createWithOrgCode,
    normalizeOrgCode,
    isValidOrgCodeFormat,
    syncCounterFromExisting
};
