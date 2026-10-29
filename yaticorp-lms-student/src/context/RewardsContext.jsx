/**
 * Rewards state for the student panel: the profile summary (streak, XP,
 * badges, wallet), and the celebration queue.
 *
 * Two kinds of feedback, deliberately kept apart so nothing shows twice:
 *  - a small toast for the immediate result of an action ("+10 XP · 🔥 3-day
 *    streak"), built from the `rewards.events` an API response carries;
 *  - a full celebration for milestones, badges, levels and payouts, which the
 *    server queues as events. The app pulls those after every activity, after
 *    anything that says progress changed (Career Path, the Global Quiz, an
 *    interview), and on load, so a reward paid by a background job (a
 *    leaderboard week closing) is celebrated the next time the student is here.
 */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import api from '../utils/api';
import useLive from '../live/useLive';
import { RewardToast, CelebrationOverlay } from '../components/rewards/RewardCelebration';

import { RewardsContext } from './useRewards';

// Two awards this close together are one moment: a lesson's quiz pays and
// then the lesson does, and the second toast used to replace the first, so
// "+50 XP" flashed and became "+10 XP".
const MERGE_MS = 2000;
// The server needs a beat after an activity to have queued its events.
const PULL_DELAY_MS = 400;
// How long "that kind was seen elsewhere" filters pulls: long enough for a
// pull already in flight to come back, short enough that a later level-up of
// the same kind is still celebrated.
const SEEN_RULE_MS = 60 * 1000;

export const RewardsProvider = ({ children }) => {
    const { user, isRewardsEnabled } = useContext(AuthContext);
    const [summary, setSummary] = useState(null);
    const [toast, setToast] = useState(null);
    const [queue, setQueue] = useState([]);
    const toastTimer = useRef(null);
    const pullTimer = useRef(null);
    // What the toast on screen adds up to, for the next award to add to.
    const shown = useRef({ xp: 0, streak: null, at: 0, id: 0 });
    // Events this tab has dismissed, or been told were seen elsewhere. A pull
    // already on its way back can still carry one; it must not reappear.
    const dismissed = useRef(new Set());
    const seenRules = useRef([]);
    const queueRef = useRef(queue);
    useEffect(() => { queueRef.current = queue; });
    // True while celebrate() itself announces 'yati:progress-changed', so this
    // provider's own listener does not refresh a second time (celebrate has
    // already asked) — and so the two can never set each other off.
    const announcing = useRef(false);
    const enabled = !!isRewardsEnabled && !!user;

    const refresh = useCallback(() => {
        if (!enabled) return Promise.resolve(null);
        return api.get('/rewards/summary')
            .then((r) => { setSummary(r.data); return r.data; })
            .catch(() => null);
    }, [enabled]);

    // Queued here, and only marked seen on the server once the student has
    // dismissed each one: marked as soon as it was fetched, a reload (or a
    // closed tab) with three celebrations still waiting lost all three.
    const pullEvents = useCallback(() => {
        if (!enabled) return Promise.resolve();
        return api.get('/rewards/events/unseen')
            .then((r) => {
                const now = Date.now();
                seenRules.current = seenRules.current.filter((rule) => rule.until > now);
                const ruledOut = (e) => dismissed.current.has(e._id)
                    || seenRules.current.some((rule) => e.kind === rule.kind && (rule.level == null || Number(e.payload?.level) === Number(rule.level)));
                const events = (Array.isArray(r.data) ? r.data : []).filter((e) => e?._id && !ruledOut(e));
                if (!events.length) return;
                setQueue((q) => [...q, ...events.filter((e) => !q.some((x) => x._id === e._id))]);
            })
            .catch(() => { /* the bell still has the notification */ });
    }, [enabled]);

    const pullSoon = useCallback(() => {
        clearTimeout(pullTimer.current);
        pullTimer.current = setTimeout(pullEvents, PULL_DELAY_MS);
    }, [pullEvents]);

    /**
     * Tell the server some events were celebrated already, and drop them from
     * the queue here. For a screen with a celebration of its own (Career Path
     * shows its own level-up): { ids } for particular events, or { kind,
     * level } for "the level-up to 4", whichever it knows.
     */
    const markEventsSeen = useCallback(({ ids = null, kind = null, level = null } = {}) => {
        if (!enabled) return Promise.resolve();
        const list = Array.isArray(ids) ? ids.map(String) : null;
        if (!list && !kind) return Promise.resolve();
        if (list) list.forEach((id) => dismissed.current.add(id));
        else seenRules.current.push({ kind, level, until: Date.now() + SEEN_RULE_MS });
        const matches = (e) => (list ? list.includes(e._id) : e.kind === kind && (level == null || Number(e.payload?.level) === Number(level)));
        queueRef.current.filter(matches).forEach((e) => dismissed.current.add(e._id));
        setQueue((q) => q.filter((e) => !matches(e)));
        return api.post('/rewards/events/seen', list ? { ids: list } : { kind, ...(level != null ? { level } : {}) }).catch(() => {});
    }, [enabled]);

    /** Show the immediate result of an action, then look for anything bigger. */
    const celebrate = useCallback((events = []) => {
        if (!enabled) return;
        const list = Array.isArray(events) ? events : [];
        const xp = list.filter((e) => e.kind === 'xp').reduce((n, e) => n + (e.amount || 0), 0);
        const streak = list.find((e) => e.kind === 'streak');
        if (xp > 0 || streak) {
            const now = Date.now();
            const prev = now - shown.current.at < MERGE_MS ? shown.current : { xp: 0, streak: null, id: now };
            const next = { xp: prev.xp + xp, streak: streak || prev.streak, at: now, id: prev.id };
            shown.current = next;
            const parts = [];
            if (next.xp > 0) parts.push(`+${next.xp} XP`);
            if (next.streak) parts.push(`🔥 ${next.streak.current}-day streak`);
            clearTimeout(toastTimer.current);
            // The same id while merging: the toast updates in place rather
            // than leaving and arriving again.
            setToast({ text: parts.join(' · '), id: next.id });
            toastTimer.current = setTimeout(() => setToast(null), 4500);
        }
        refresh();
        // Course XP never told the rest of the app: the sidebar card, the
        // header and the wallet stayed on the old figures until a reload.
        if (list.length) {
            announcing.current = true;
            try { window.dispatchEvent(new CustomEvent('yati:progress-changed')); } finally { announcing.current = false; }
        }
        pullSoon();
    }, [enabled, refresh, pullSoon]);

    useEffect(() => {
        refresh();
        pullEvents();
    }, [refresh, pullEvents, user?._id]);

    // Anything in the app that changed progress or a balance says so on the
    // window, the same way Career Path already tells the sidebar. A level-up,
    // badge or streak milestone earned there is queued on the server, so it is
    // looked for here too — it used to wait for the next page load.
    useEffect(() => {
        const onProgress = () => {
            if (announcing.current) return;
            refresh();
            pullSoon();
        };
        const onRewards = (e) => celebrate(e.detail || []);
        window.addEventListener('yati:progress-changed', onProgress);
        window.addEventListener('yati:rewards', onRewards);
        return () => {
            window.removeEventListener('yati:progress-changed', onProgress);
            window.removeEventListener('yati:rewards', onRewards);
        };
    }, [refresh, celebrate, pullSoon]);

    // Live wallet: the app's one live stream (useLive) says "your wallet
    // changed" (an admin credit, a payment, a charge) the moment it happens.
    // The balance is re-read, every wallet on screen is told, and the "added to
    // your wallet" celebration is pulled — no reload.
    const onWalletChange = useCallback(() => {
        refresh();
        announcing.current = true;
        try { window.dispatchEvent(new CustomEvent('yati:progress-changed')); } finally { announcing.current = false; }
        pullSoon();
    }, [refresh, pullSoon]);
    useLive('wallet', onWalletChange, { enabled });

    useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(pullTimer.current); }, []);

    const current = queue[0] || null;
    const dismiss = useCallback((event) => {
        if (!event?._id) return;
        dismissed.current.add(event._id);
        setQueue((q) => q.filter((e) => e._id !== event._id));
        api.post('/rewards/events/seen', { ids: [event._id] }).catch(() => {});
    }, []);
    const closeToast = useCallback(() => {
        shown.current = { xp: 0, streak: null, at: 0, id: 0 };
        setToast(null);
    }, []);

    return (
        <RewardsContext.Provider value={{ enabled, summary, refresh, celebrate, pullEvents, markEventsSeen }}>
            {children}
            {enabled && toast && <RewardToast key={toast.id} text={toast.text} onClose={closeToast} />}
            {enabled && current && <CelebrationOverlay key={current._id} event={current} onClose={() => dismiss(current)} remaining={queue.length - 1} />}
        </RewardsContext.Provider>
    );
};
