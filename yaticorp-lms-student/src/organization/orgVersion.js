/**
 * A number that goes up whenever the student's organization changes (2026-11-16): accepted, rejected,
 * removed, left, placed in a Campus class. The server says so on the live stream (topic 'organization',
 * server services/orgEvents.js); StudentLayout bumps this, and every hook that reads the organization
 * has it in its dependencies, so the dashboard follows at once instead of after a refresh.
 */
import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set();
export const bumpOrgVersion = () => {
    version += 1;
    listeners.forEach((fn) => fn());
    try { window.dispatchEvent(new Event('yati:organization-changed')); } catch { /* no window */ }
};
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const get = () => version;
export const useOrgVersion = () => useSyncExternalStore(subscribe, get, get);
