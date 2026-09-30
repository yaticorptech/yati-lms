import { useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { achievementsFrom } from './mascotBrain';

const KEY = 'yati.careerMascot.celebrated';
// The server needs a moment to count what was just done.
const SETTLE_MS = 1500;

const read = () => {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
};
const write = (value) => {
    try {
        localStorage.setItem(KEY, value);
    } catch {
        // Storage switched off: achievements are simply not announced.
    }
};

/**
 * Streak, path progress and badges, read from the endpoints the Career Path
 * pages already use (/tasks/history, /roadmap, /badges), and whether today's
 * plan still has an open task (/tasks) — the one fact the mascot needs that
 * the Progress page does not load itself. Each achievement is announced
 * through `emit` once, ever — the keys already celebrated are kept in
 * localStorage — and the very first check announces nothing: what the
 * student held before the mascot arrived is not news.
 *
 * Returns `refresh`, to call after anything that may have earned one.
 */
export default function useMascotProgress(emit, setFact) {
    const emitRef = useRef(emit);
    const factRef = useRef(setFact);
    useEffect(() => {
        emitRef.current = emit;
        factRef.current = setFact;
    });
    const timer = useRef(0);

    const check = useCallback(async () => {
        const [history, roadmap, badges, today] = await Promise.all([
            api.get('/tasks/history').then((res) => (Array.isArray(res.data) ? res.data : []), () => []),
            api.get('/roadmap').then((res) => res.data || null, () => null),
            api.get('/badges').then((res) => (Array.isArray(res.data) ? res.data : []), () => []),
            api.get('/tasks').then((res) => (Array.isArray(res.data) ? res.data : res.data?.tasks || []), () => [])
        ]);
        factRef.current?.('pendingTasks', today.some((t) => t && t.status !== 'Completed'));
        const held = achievementsFrom({ history, roadmap, badges });
        const stored = read();
        let seen;
        try {
            seen = new Set(stored ? JSON.parse(stored) : []);
        } catch {
            seen = new Set();
        }
        const fresh = held.filter((a) => !seen.has(a.key));
        held.forEach((a) => seen.add(a.key));
        write(JSON.stringify([...seen]));
        if (stored === null) return;
        fresh.forEach((a) => emitRef.current?.(a.event));
    }, []);

    useEffect(() => {
        check();
        return () => clearTimeout(timer.current);
    }, [check]);

    return useCallback(() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(check, SETTLE_MS);
    }, [check]);
}
