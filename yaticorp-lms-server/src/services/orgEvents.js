/**
 * "This student's organization just changed" (2026-11-16): joined, accepted, rejected, removed, left,
 * or placed in / moved out of a Campus class. Announced from the User and JoinRequest models' own
 * hooks, so every path that changes it is covered; the student's open pages hear it on the live
 * stream (src/live, topic 'organization') and re-read their organization at once, not after a refresh.
 * In-process, like walletEvents: with several server instances, only streams on the same one hear it;
 * the page still re-reads when the student comes back to the tab.
 */
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0);
const pending = new Map();
const SETTLE_MS = 400;

const organizationChanged = (userId) => {
    if (!userId) return;
    const key = String(userId);
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => { pending.delete(key); bus.emit(key); }, SETTLE_MS));
};

const onOrganizationChange = (userId, fn) => {
    const key = String(userId);
    bus.on(key, fn);
    return () => bus.off(key, fn);
};

/** Whether an update (as Mongoose holds it) touches any of `paths` (or below them). */
const touches = (update, paths) => {
    if (!update) return false;
    const keys = [];
    for (const [k, v] of Object.entries(update)) {
        if (k.startsWith('$') && v && typeof v === 'object') keys.push(...Object.keys(v));
        else keys.push(k);
    }
    return keys.some((k) => paths.some((p) => k === p || k.startsWith(`${p}.`)));
};

/** The students an update's filter names by id (`_id`, or `_id: { $in }`); [] when it names none. */
const idsOf = (filter, field = '_id') => {
    const id = filter?.[field];
    if (!id) return [];
    if (Array.isArray(id.$in)) return id.$in;
    if (typeof id === 'string' || id._bsontype || typeof id.toHexString === 'function') return [id];
    return [];
};

/** A schema hook set: announce for the students a query update names when it touches `paths`. */
const watch = (schema, paths, field = '_id') => {
    schema.post(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
        try { if (touches(this.getUpdate(), paths)) idsOf(this.getFilter(), field).forEach(organizationChanged); } catch { /* never in the write's way */ }
    });
    schema.pre('save', function () { this.$locals.orgTouched = this.isNew || paths.some((p) => this.isModified(p)); });
    schema.post('save', function (doc) { if (doc.$locals?.orgTouched) organizationChanged(field === '_id' ? doc._id : doc[field]); });
};

module.exports = { organizationChanged, onOrganizationChange, touches, idsOf, watch };
