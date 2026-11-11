/**
 * "Notify me for live competitions" (2026-11-04): a student who asks for it gets a notification from the browser
 * whenever a competition or a Quiz Arena they can see goes live, while the app is open in any tab. The choice is
 * kept in this browser; the ones already announced are remembered so each is announced once.
 * CompetitionAlerts.jsx asks checkLive() once a minute.
 */
import { competitionsApi } from './api';
import { arenaApi } from './arena/api';

const KEY = 'notify-live-competitions';
const SEEN = 'notify-live-announced';
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')); } catch { return new Set(); } };
const keepSeen = (set) => { try { localStorage.setItem(SEEN, JSON.stringify([...set].slice(-200))); } catch { /* private mode */ } };

export const isWatching = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** The ones live right now: [{ id, title, to }]. */
const liveNow = async () => {
    const [list, arenas] = await Promise.all([competitionsApi.list().catch(() => ({ competitions: [] })), arenaApi.list().catch(() => [])]);
    return [
        ...(list.competitions || []).filter((c) => c.status === 'live').map((c) => ({ id: `c-${c.id}`, title: c.name, to: `/competitions/${c.id}` })),
        ...(arenas || []).filter((a) => a.state === 'live').map((a) => ({ id: `a-${a.id}`, title: a.title, to: `/competitions/arena/${a.id}` }))
    ];
};

/**
 * Switch it on (asking the browser's leave to notify) or off. On: those live already count as announced, so only
 * the next ones notify. Resolves to { on, allowed } — `allowed` false when the browser said no.
 */
export const setWatching = async (on) => {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode */ }
    if (!on) return { on: false, allowed: true };
    let allowed = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') allowed = (await Notification.requestPermission()) === 'granted';
    const seen = readSeen();
    for (const c of await liveNow()) seen.add(c.id);
    keepSeen(seen);
    return { on: true, allowed };
};

/** Announce what has gone live since the last look. */
export const checkLive = async () => {
    if (!isWatching() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const seen = readSeen();
    const fresh = (await liveNow()).filter((c) => !seen.has(c.id));
    for (const c of fresh) {
        seen.add(c.id);
        try {
            const n = new Notification(`${c.title} is live now`, { body: 'Open Competitions → Live now to view and play.', tag: c.id });
            n.onclick = () => { window.focus(); window.location.assign(c.to); };
        } catch { /* not supported here */ }
    }
    if (fresh.length) keepSeen(seen);
};
