/**
 * The student's place on the weekly board, as this browser has seen it, for
 * the climb popup (RankUpWatcher): the place last seen and the best place
 * already celebrated, per student and per week (`rw:rank:<user>:<weekKey>`).
 */

/** What is stored for the week: { last, best } (an older browser kept only the last place, as a number). */
const readPlaces = (raw) => {
    try {
        const v = JSON.parse(raw);
        if (typeof v === 'number' && v > 0) return { last: v, best: v };
        return v && v.last > 0 ? { last: v.last, best: Math.min(v.best || v.last, v.last) } : null;
    } catch { return null; }
};

/**
 * The place last seen this week, swapped for `now`: { from, to } when it is
 * better than the best place already celebrated this week, else null. Places
 * from earlier weeks (and the old per-browser 'rw:rank:weekly' keys) are
 * cleared as a new one is stored.
 */
export const rankUpSince = (userId, periodKey, now) => {
    if (!userId || !periodKey) return null;
    const prefix = `rw:rank:${userId}:${periodKey.split(':')[0]}:`;
    const key = `rw:rank:${userId}:${periodKey}`;
    try {
        const prev = readPlaces(localStorage.getItem(key));
        if (now) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k !== key && (k.startsWith(prefix) || /^rw:rank:(daily|weekly|monthly|all)$/.test(k))) localStorage.removeItem(k);
            }
            localStorage.setItem(key, JSON.stringify({ last: now, best: Math.min(prev?.best || now, now) }));
        }
        return now && prev && now < prev.best ? { from: prev.last, to: now } : null;
    } catch { return null; /* private mode */ }
};

/** Whether `now` is better than the best place already celebrated this week, without storing it. */
export const climbedSince = (userId, periodKey, now) => {
    if (!userId || !periodKey || !now) return false;
    try {
        const prev = readPlaces(localStorage.getItem(`rw:rank:${userId}:${periodKey}`));
        return !!prev && now < prev.best;
    } catch { return false; /* private mode */ }
};
