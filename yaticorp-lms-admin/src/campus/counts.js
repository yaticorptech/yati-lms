/**
 * The red badges inside Campus (2026-11-16): students asking to join (Students) and online admission
 * applications (Admissions). One shared store, so the sidebar dropdown, the strip on top of Campus
 * pages and the phone's bottom bar show the same numbers. Asked on navigation and whenever a page
 * says something changed ('organization-requests-changed', 'campus-counts'). Silent on failure.
 */
import { useEffect, useSyncExternalStore } from 'react';
import api from '../utils/api';

let state = { requests: 0, applications: 0 };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
let seq = 0;

export const refreshCampusCounts = async () => {
    const mine = ++seq;
    const [r, a] = await Promise.allSettled([
        api.get('/organizations/me/requests/count'),
        api.get('/organizations/me/campus/applications/count')
    ]);
    if (mine !== seq) return;
    state = {
        requests: r.status === 'fulfilled' && typeof r.value.data?.pending === 'number' ? r.value.data.pending : state.requests,
        applications: a.status === 'fulfilled' && typeof a.value.data?.pending === 'number' ? a.value.data.pending : state.applications
    };
    emit();
};

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const get = () => state;

/** { requests, applications }, kept fresh while `enabled`; `key` (e.g. the pathname) asks again when it changes. */
export function useCampusCounts(enabled = true, key = '') {
    const counts = useSyncExternalStore(subscribe, get, get);
    useEffect(() => {
        if (!enabled) return undefined;
        refreshCampusCounts();
        const on = () => refreshCampusCounts();
        window.addEventListener('organization-requests-changed', on);
        window.addEventListener('campus-counts', on);
        return () => { window.removeEventListener('organization-requests-changed', on); window.removeEventListener('campus-counts', on); };
    }, [enabled, key]);
    return counts;
}

/** The badge key on a Campus menu item → its number. */
export const countOf = (counts, badge) => (badge === 'requests' ? counts.requests : badge === 'applications' ? counts.applications : 0);
