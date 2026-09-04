/**
 * Rewards state for the student panel: the profile summary (streak, XP,
 * rank, badges, wallet), and the celebration queue.
 *
 * Two kinds of feedback, deliberately kept apart so nothing shows twice:
 *  - a small toast for the immediate result of an action ("+10 XP · 🔥 3-day
 *    streak"), built from the `rewards.events` an API response carries;
 *  - a full celebration for milestones, badges, levels and payouts, which the
 *    server queues as events. The app pulls those after every activity and on
 *    load, so a reward paid by a background job (a leaderboard week closing)
 *    is celebrated the next time the student is here.
 */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import api from '../utils/api';
import { RewardToast, CelebrationOverlay } from '../components/rewards/RewardCelebration';

import { RewardsContext } from './useRewards';

export const RewardsProvider = ({ children }) => {
    const { user, isRewardsEnabled } = useContext(AuthContext);
    const [summary, setSummary] = useState(null);
    const [toast, setToast] = useState(null);
    const [queue, setQueue] = useState([]);
    const toastTimer = useRef(null);
    const enabled = !!isRewardsEnabled && !!user;

    const refresh = useCallback(() => {
        if (!enabled) return Promise.resolve(null);
        return api.get('/rewards/summary')
            .then((r) => { setSummary(r.data); return r.data; })
            .catch(() => null);
    }, [enabled]);

    const pullEvents = useCallback(() => {
        if (!enabled) return Promise.resolve();
        return api.get('/rewards/events/unseen')
            .then((r) => {
                const events = Array.isArray(r.data) ? r.data : [];
                if (!events.length) return;
                setQueue((q) => [...q, ...events.filter((e) => !q.some((x) => x._id === e._id))]);
                api.post('/rewards/events/seen', { ids: events.map((e) => e._id) }).catch(() => {});
            })
            .catch(() => { /* the bell still has the notification */ });
    }, [enabled]);

    /** Show the immediate result of an action, then look for anything bigger. */
    const celebrate = useCallback((events = []) => {
        if (!enabled) return;
        const parts = [];
        const xp = events.filter((e) => e.kind === 'xp').reduce((n, e) => n + (e.amount || 0), 0);
        if (xp > 0) parts.push(`+${xp} XP`);
        const streak = events.find((e) => e.kind === 'streak');
        if (streak) parts.push(`🔥 ${streak.current}-day streak`);
        if (parts.length) {
            clearTimeout(toastTimer.current);
            setToast({ text: parts.join(' · '), id: Date.now() });
            toastTimer.current = setTimeout(() => setToast(null), 4500);
        }
        refresh();
        // Give the server a beat to have queued milestone/badge events.
        setTimeout(pullEvents, 400);
    }, [enabled, refresh, pullEvents]);

    useEffect(() => {
        refresh();
        pullEvents();
    }, [refresh, pullEvents, user?._id]);

    // Anything in the app that changed progress or a balance says so on the
    // window, the same way Career Path already tells the sidebar.
    useEffect(() => {
        const onProgress = () => refresh();
        const onRewards = (e) => celebrate(e.detail || []);
        window.addEventListener('yati:progress-changed', onProgress);
        window.addEventListener('yati:rewards', onRewards);
        return () => {
            window.removeEventListener('yati:progress-changed', onProgress);
            window.removeEventListener('yati:rewards', onRewards);
        };
    }, [refresh, celebrate]);

    const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

    return (
        <RewardsContext.Provider value={{ enabled, summary, refresh, celebrate, pullEvents }}>
            {children}
            {enabled && toast && <RewardToast key={toast.id} text={toast.text} onClose={() => setToast(null)} />}
            {enabled && queue[0] && <CelebrationOverlay key={queue[0]._id} event={queue[0]} onClose={dismiss} remaining={queue.length - 1} />}
        </RewardsContext.Provider>
    );
};
