/**
 * Holding the big reward popups (achievements, level-ups, badges) while the
 * student is in the middle of something, so they come after it instead of
 * on top of it (2026-11-16: Multilingo's achievement popup appeared during a
 * lesson; it should come once that lesson is finished).
 *
 * holdCelebrations() returns a release function; while any hold is on,
 * RewardsContext keeps the popups queued. The small "+XP" toast is not held.
 */
import { useSyncExternalStore } from 'react';

const holds = new Set();
const listeners = new Set();
const tell = () => listeners.forEach((fn) => fn());

export const holdCelebrations = () => {
    const token = Symbol('hold');
    holds.add(token);
    tell();
    return () => { if (holds.delete(token)) tell(); };
};

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => holds.size > 0;
export const useCelebrationsHeld = () => useSyncExternalStore(subscribe, snapshot, snapshot);
