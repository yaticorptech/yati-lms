/**
 * @author Preethesh Kulal
 * @description Auto-refresh hook — calls the provided fetch function on mount
 * and then on a fixed interval. Clears on unmount.
 *
 * Usage:
 *   useAutoRefresh(fetchFn, 30000); // refresh every 30s
 *   const refresh = useAutoRefresh(fetchFn, 30000, [page, search]); // and again whenever these change
 *
 * What it takes care of, so no page has to:
 *   - The interval always calls the newest fetchFn. It used to hold the first
 *     one for the life of the page, which is why pages with filters wrote
 *     their own polling: a tick would quietly reload the unfiltered list.
 *   - Nothing is fetched while the tab is hidden; coming back to it fetches
 *     once, straight away, rather than waiting out the interval.
 *   - A tick is skipped while the previous request is still in flight, so a
 *     slow server is not handed a queue of identical requests.
 *   - Out-of-order answers. fetchFn is called with `{ signal, isCurrent, fresh }`:
 *     `signal` aborts when a newer fetch replaces this one (a dependency
 *     changed) or the page closes, and `isCurrent()` says whether this answer
 *     is still the one wanted — check it before putting a result on screen.
 *     `fresh` is true for the first load, a dependency change and an explicit
 *     refresh(), false for a background tick.
 *
 * Returns refresh(): fetch now, replacing anything in flight.
 */
import { useCallback, useEffect, useRef } from 'react';

const useAutoRefresh = (fetchFn, intervalMs = 30000, deps = []) => {
    const fnRef = useRef(fetchFn);
    useEffect(() => { fnRef.current = fetchFn; });

    const state = useRef({ seq: 0, inFlight: false, controller: null });

    const run = useCallback((fresh) => {
        const s = state.current;
        if (s.inFlight && !fresh) return;   // the last tick has not answered yet
        s.controller?.abort();
        const controller = new AbortController();
        const seq = ++s.seq;
        s.controller = controller;
        s.inFlight = true;
        const isCurrent = () => seq === s.seq && !controller.signal.aborted;
        Promise.resolve()
            .then(() => fnRef.current({ signal: controller.signal, isCurrent, fresh }))
            .catch(() => { /* fetchFn reports its own errors */ })
            .finally(() => { if (seq === s.seq) s.inFlight = false; });
    }, []);

    // The first load, and a fresh one whenever a dependency changes.
    useEffect(() => {
        run(true);
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const s = state.current;
        const tick = () => { if (!document.hidden) run(false); };
        const id = setInterval(tick, intervalMs);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
            // Whatever is still in flight answers to a page that has gone.
            s.controller?.abort();
            s.seq += 1;
            s.inFlight = false;
        };
    }, [intervalMs, run]);

    return useCallback(() => run(true), [run]);
};

export default useAutoRefresh;
