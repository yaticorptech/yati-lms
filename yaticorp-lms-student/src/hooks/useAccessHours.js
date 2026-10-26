/**
 * Access hours: whether the student's organization has YATICORP open now
 * (its Dashboard → Access hours; server: organizations/services/accessSchedule.js).
 *
 * Asks the server once, then re-asks every 20 seconds while the app is in
 * front (an organization changing its hours shuts a student out mid-lesson,
 * the user's ask 2026-10-26), at the next opening or closing time, when the
 * app comes back to the front, and whenever any request is refused
 * with 423 PLATFORM_CLOSED (utils/api.js raises 'yati:platform-closed'). An
 * administrator viewing as the student is never shut out, as the server lets
 * them through. The screen itself is components/PlatformClosed.jsx.
 */
import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { ADMIN_VIEW_KEY } from '../utils/sessionExpiry';

const MAX_TIMER = 2 ** 31 - 1;
const POLL_MS = 20000;
const adminViewing = () => { try { return Boolean(localStorage.getItem(ADMIN_VIEW_KEY)); } catch { return false; } };

export default function useAccessHours(signedIn) {
    const [access, setAccess] = useState(null);       // { applies, open, opensAt, closesAt, hours, organization }

    const check = useCallback(() => {
        if (!signedIn || adminViewing()) return Promise.resolve();
        return api.get('/organizations/student/schedule').then((r) => setAccess(r.data)).catch(() => {});
    }, [signedIn]);

    useEffect(() => { check(); }, [check]);

    // Re-asked at the next change (a second after it), and when the app returns to the front.
    useEffect(() => {
        const at = access?.open ? access?.closesAt : access?.opensAt;
        if (!access?.applies || !at) return undefined;
        const timer = setTimeout(check, Math.min(MAX_TIMER, Math.max(1000, new Date(at) - Date.now() + 1000)));
        return () => clearTimeout(timer);
    }, [access, check]);
    // The organization may change its hours while the student is here.
    useEffect(() => {
        if (!signedIn) return undefined;
        const timer = setInterval(() => { if (document.visibilityState !== 'hidden') check(); }, POLL_MS);
        return () => clearInterval(timer);
    }, [signedIn, check]);
    useEffect(() => {
        const onShow = () => { if (document.visibilityState === 'visible') check(); };
        const onClosed = (e) => setAccess({ applies: true, open: false, ...(e.detail || {}) });
        document.addEventListener('visibilitychange', onShow);
        window.addEventListener('yati:platform-closed', onClosed);
        return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('yati:platform-closed', onClosed); };
    }, [check]);

    return { closed: Boolean(access?.applies && access.open === false && !adminViewing()), access, check };
}
