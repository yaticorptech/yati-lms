/**
 * @author Preethesh Kulal
 * @description Auto-refresh hook — calls fetchFn on mount then on a fixed interval.
 * Skips the interval tick if a fetch is already in-flight (avoids pile-up).
 * Pauses when the tab is hidden, resumes when visible again.
 *
 * Usage:
 *   useAutoRefresh(fetchFn);           // default 30s
 *   useAutoRefresh(fetchFn, 60000);    // every 60s
 */
import { useEffect, useRef } from 'react';

const useAutoRefresh = (fetchFn, intervalMs = 30000) => {
    const inFlight = useRef(false);

    useEffect(() => {
        let intervalId = null;

        const run = async () => {
            if (inFlight.current) return;
            inFlight.current = true;
            try { await fetchFn(); } finally { inFlight.current = false; }
        };

        const start = () => {
            run();
            intervalId = setInterval(run, intervalMs);
        };

        const stop = () => clearInterval(intervalId);

        const onVisibility = () => {
            if (document.hidden) stop();
            else start();
        };

        start();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useAutoRefresh;
