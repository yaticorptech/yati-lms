/**
 * @description The rules for a playback save, kept apart from the database so
 * they can be tested without one: what a valid body is, the Mongo update it
 * becomes, and the shape the client gets back.
 */
// Nothing a student watches is two days long. A larger number is a bug or a
// forged request, and is capped rather than stored.
const MAX_SECONDS = 48 * 3600;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const isId = (v) => typeof v === 'string' && OBJECT_ID.test(v);

/**
 * The client's clock reading, as a Date. Anything unreadable, more than five
 * minutes ahead of this server or more than a year behind it is replaced with
 * now: a wrong clock must not pin a stale position as "newest" forever.
 */
const clientTime = (at, now = Date.now()) => {
    const n = Number(at);
    if (!Number.isFinite(n)) return new Date(now);
    if (n > now + 5 * 60 * 1000 || n < now - 366 * 24 * 3600 * 1000) return new Date(now);
    return new Date(n);
};

/**
 * Reads a PUT body. A body may carry a position (`lessonId` + `seconds`),
 * the open lesson (`activeLessonId`), or both; `at` is optional.
 * Returns `{ error }` or `{ lessonId?, seconds?, activeLessonId?, at }`.
 */
const parsePlaybackUpdate = (body = {}, now = Date.now()) => {
    const out = { at: clientTime(body.at, now) };

    if (body.lessonId !== undefined || body.seconds !== undefined) {
        if (!isId(body.lessonId)) return { error: 'lessonId must be a lesson id' };
        const seconds = Number(body.seconds);
        if (!Number.isFinite(seconds) || seconds < 0) return { error: 'seconds must be a number of seconds, 0 or more' };
        out.lessonId = body.lessonId;
        out.seconds = Math.min(seconds, MAX_SECONDS);
    }

    if (body.activeLessonId !== undefined && body.activeLessonId !== null) {
        if (!isId(body.activeLessonId)) return { error: 'activeLessonId must be a lesson id' };
        out.activeLessonId = body.activeLessonId;
    }

    if (out.lessonId === undefined && out.activeLessonId === undefined) return { error: 'nothing to save' };
    return out;
};

/** The Mongo update for a parsed body. A position of 0 removes the entry: the video was finished. */
const updateFor = (parsed) => {
    const $set = {};
    const $unset = {};
    if (parsed.lessonId) {
        if (parsed.seconds > 0) $set[`positions.${parsed.lessonId}`] = { seconds: parsed.seconds, at: parsed.at };
        else $unset[`positions.${parsed.lessonId}`] = 1;
    }
    if (parsed.activeLessonId) {
        $set.activeLessonId = parsed.activeLessonId;
        $set.activeLessonAt = parsed.at;
    }
    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    return update;
};

/** What the client gets: plain objects and millisecond timestamps, never Mongo types. */
const serialize = (doc) => {
    if (!doc) return { activeLessonId: null, activeLessonAt: null, positions: {} };
    const raw = doc.positions instanceof Map ? Object.fromEntries(doc.positions) : (doc.positions || {});
    const positions = {};
    for (const [lessonId, p] of Object.entries(raw)) {
        if (p && Number.isFinite(p.seconds) && p.seconds > 0) {
            positions[lessonId] = { seconds: p.seconds, at: p.at ? new Date(p.at).getTime() : null };
        }
    }
    return {
        activeLessonId: doc.activeLessonId ? String(doc.activeLessonId) : null,
        activeLessonAt: doc.activeLessonAt ? new Date(doc.activeLessonAt).getTime() : null,
        positions
    };
};

module.exports = { parsePlaybackUpdate, updateFor, serialize, clientTime, MAX_SECONDS };
