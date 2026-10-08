/**
 * Request bodies that are handed to a Mongoose update.
 *
 * Mongoose reads a top-level `$set` / `$unset` / `$push` … key in an update
 * object as an operator, so a body spread into `findByIdAndUpdate` could send
 * `{ "$unset": { "organizationId": 1 } }` and walk straight past every check
 * made on the plain fields. A key with a dot reaches into a nested path the
 * same way. Neither is ever sent by the admin app, so both are dropped, at any
 * depth, before a body is used.
 */
const unsafeKey = (key) => key.startsWith('$') || key.includes('.');

/** A copy of `value` with every `$…` or dotted key removed, at any depth. */
const stripOperators = (value) => {
    if (Array.isArray(value)) return value.map(stripOperators);
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const clean = {};
    for (const [key, v] of Object.entries(value)) {
        if (!unsafeKey(key)) clean[key] = stripOperators(v);
    }
    return clean;
};

/** Only the listed keys of `body`, and only those actually sent. */
const pick = (body, keys) => {
    const out = {};
    for (const key of keys) if (body && body[key] !== undefined) out[key] = body[key];
    return out;
};

/** Middleware form: cleans req.body in place, so later guards see what the update will. */
const cleanBody = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') req.body = stripOperators(req.body);
    next();
};

module.exports = { stripOperators, pick, cleanBody };
