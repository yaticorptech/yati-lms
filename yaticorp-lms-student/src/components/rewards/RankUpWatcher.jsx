/**
 * The leaderboard climb, on whatever page the student is on (asked
 * 2026-10-15: "when user get rank up...popup the leaderboard in users current
 * page and show moving down to upwards of particular card"). Mounted once in
 * StudentLayout.
 *
 * It looks at the student's place on this week's board when the app opens,
 * whenever XP changes anywhere ('yati:progress-changed': a lesson, a quiz, a
 * Career Path task, a game), and when the app comes back to the front (at
 * most once a minute). The place last seen is kept per student and per week
 * (`rw:rank:<user>:<weekKey>`). When the new place is higher, the climb plays
 * (LeaderboardRankUp): the student's card rising from the old place past the
 * students it has overtaken.
 *
 * It never interrupts: it waits while the student is learning (a lesson, a
 * quiz, a game, the mock interview — every screen that hides Yati), while
 * another popup is open (a level-up celebration first), while they type, and
 * on the busy pages, then shows on the page they are on by then.
 */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useRewards } from '../../context/useRewards';
import { useLoopHidden } from '../loopVisibility';
import LeaderboardRankUp from './LeaderboardRankUp';

const PERIOD = 'weekly';
const BUSY_ROUTES = /^\/(learn\/|interview\/mock\/|competitions\/play\/|career\/onboarding)/;
const RESUME_GAP = 60000;

/**
 * The place last seen this week, swapped for `now`: { from, to } when it has
 * gone up, else null. Places from earlier weeks (and the old per-browser
 * 'rw:rank:weekly' keys) are cleared as a new one is stored.
 */
const rankUpSince = (userId, periodKey, now) => {
    if (!userId || !periodKey) return null;
    const prefix = `rw:rank:${userId}:${periodKey.split(':')[0]}:`;
    const key = `rw:rank:${userId}:${periodKey}`;
    try {
        const prev = Number(localStorage.getItem(key));
        if (now) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k !== key && (k.startsWith(prefix) || /^rw:rank:(daily|weekly|monthly|all)$/.test(k))) localStorage.removeItem(k);
            }
            localStorage.setItem(key, String(now));
        }
        return now && prev && now < prev ? { from: prev, to: now } : null;
    } catch { return null; /* private mode */ }
};

const busyNow = (learning) => learning
    || document.visibilityState !== 'visible'
    || BUSY_ROUTES.test(window.location.pathname)
    || !!document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"], [data-game-celebration]')
    || !!document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');

export default function RankUpWatcher() {
    const auth = useContext(AuthContext);
    const userId = auth?.user?._id || auth?.user?.id || null;
    const { enabled } = useRewards();
    const learning = useLoopHidden();
    const learningRef = useRef(learning);
    useEffect(() => { learningRef.current = learning; }, [learning]);

    const [climb, setClimb] = useState(null);
    const [shown, setShown] = useState(false);
    const lastCheck = useRef(0);
    const inFlight = useRef(false);

    const check = useCallback(() => {
        if (!userId || !enabled || inFlight.current) return;
        inFlight.current = true;
        lastCheck.current = Date.now();
        api.get('/rewards/leaderboard', { params: { period: PERIOD, scope: 'global', limit: 500 } })
            .then(({ data }) => {
                const move = rankUpSince(userId, data?.periodKey, data?.me?.rank);
                if (move) { setClimb({ ...move, entries: data.entries }); setShown(false); }
            })
            .catch(() => { /* no board just now: the next change looks again */ })
            .finally(() => { inFlight.current = false; });
    }, [userId, enabled]);

    // On opening, and each time XP moves (a moment later, so the server has
    // the new total), and on coming back to the app.
    useEffect(() => {
        if (!userId || !enabled) return undefined;
        let soon = 0;
        const later = () => { clearTimeout(soon); soon = setTimeout(check, 1500); };
        const back = () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > RESUME_GAP) check(); };
        const first = setTimeout(check, 2500);
        window.addEventListener('yati:progress-changed', later);
        window.addEventListener('app:resume', back);
        document.addEventListener('visibilitychange', back);
        return () => {
            clearTimeout(first); clearTimeout(soon);
            window.removeEventListener('yati:progress-changed', later);
            window.removeEventListener('app:resume', back);
            document.removeEventListener('visibilitychange', back);
        };
    }, [userId, enabled, check]);

    // Shown once the student is free.
    useEffect(() => {
        if (!climb || shown) return undefined;
        const timer = setInterval(() => { if (!busyNow(learningRef.current)) { clearInterval(timer); setShown(true); } }, 600);
        return () => clearInterval(timer);
    }, [climb, shown]);

    const close = useCallback(() => { setClimb(null); setShown(false); }, []);
    if (!climb || !shown) return null;
    return <LeaderboardRankUp from={climb.from} to={climb.to} entries={climb.entries} period={PERIOD} onClose={close} />;
}
