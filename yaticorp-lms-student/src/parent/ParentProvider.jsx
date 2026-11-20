/**
 * Loads the parent's children and the chosen child's activity, for every page of the parent dashboard (2026-11-19).
 * The child chosen in the switcher is remembered on this device.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import parentApi from './parentSession';
import { ParentContext, readPicked, savePicked, readSeen, saveSeen } from './parentStore';

const problem = (e, fallback) => e.response?.data?.message || (!e.response ? 'Check your connection and try again.' : fallback);

export default function ParentProvider({ children: page }) {
    const [me, setMe] = useState(null);
    const [meError, setMeError] = useState('');
    const [picked, setPicked] = useState(readPicked);
    // The activity, kept with the child it belongs to: another child's is never shown while the new one loads.
    const [activity, setActivity] = useState(null);       // { id, data } | { id, error }

    const loadMe = useCallback(() => parentApi.get('/me').then((r) => {
        setMe(r.data); setMeError('');
        setPicked((cur) => {
            const ids = r.data.children.map((c) => String(c._id));
            const next = ids.includes(cur) ? cur : ids[0] || '';
            savePicked(next);
            return next;
        });
    }).catch((e) => setMeError(problem(e, 'Could not load your dashboard.'))), []);
    useEffect(() => { loadMe(); }, [loadMe]);

    // Announcements from the children's organizations (2026-11-19): the sidebar counts the new ones.
    const [notices, setNotices] = useState(null);
    // Bumped when the chosen child's announcements are seen, so the count is read again.
    const [seenTick, setSeenTick] = useState(0);
    const loadNotices = useCallback(() => parentApi.get('/announcements').then((r) => setNotices(r.data.announcements)).catch(() => setNotices((n) => n || [])), []);
    useEffect(() => { loadNotices(); }, [loadNotices, me?.children?.length]);
    const markSeen = useCallback(() => {
        const newest = (notices || []).filter((a) => !picked || (a.forIds || []).includes(picked)).reduce((t, a) => Math.max(t, new Date(a.createdAt).getTime() || 0), 0);
        if (newest > readSeen(picked)) { saveSeen(picked, newest); setSeenTick((t) => t + 1); }
    }, [notices, picked]);

    const loadChild = useCallback((id) => {
        if (!id) return;
        parentApi.get(`/children/${id}`)
            .then((r) => setActivity({ id, data: r.data }))
            .catch((e) => setActivity({ id, error: problem(e, 'Could not load this child’s activity.') }));
    }, []);
    useEffect(() => { loadChild(picked); }, [picked, loadChild]);

    const select = useCallback((id) => { savePicked(id); setPicked(String(id)); }, []);
    const added = useCallback((child) => {
        setMe((m) => ({ ...m, children: [...m.children.filter((c) => String(c._id) !== String(child._id)), child] }));
        select(child._id);
    }, [select]);
    // Resolves to '' when removed, else the reason (2026-11-19 QA: a failed removal used to vanish the child anyway).
    const remove = useCallback(async (child) => {
        const id = String(child._id);
        try { await parentApi.delete(`/children/${id}`); }
        catch (e) { return problem(e, 'Could not remove this child. Please try again.'); }
        const left = (me?.children || []).filter((c) => String(c._id) !== id);
        setMe((m) => ({ ...m, children: m.children.filter((c) => String(c._id) !== id) }));
        if (picked === id) select(String(left[0]?._id || ''));
        return '';
    }, [me, picked, select]);

    const value = useMemo(() => {
        const mine = activity && activity.id === picked ? activity : null;
        return {
            me, meError, reloadMe: loadMe,
            children: me?.children || [],
            picked,
            child: (me?.children || []).find((c) => String(c._id) === picked) || null,
            data: mine?.data || null,
            error: mine?.error || '',
            loading: Boolean(picked) && !mine,
            reload: () => loadChild(picked),
            select, added, remove,
            notices, reloadNotices: loadNotices, markSeen,
            // The chosen child's new announcements only (2026-11-19).
            unseen: (notices || []).filter((a) => new Date(a.createdAt).getTime() > readSeen(picked) && (!picked || (a.forIds || []).includes(picked))).length,
            seenTick
        };
    }, [me, meError, loadMe, picked, activity, loadChild, select, added, remove, notices, loadNotices, markSeen, seenTick]);

    return <ParentContext.Provider value={value}>{page}</ParentContext.Provider>;
}
