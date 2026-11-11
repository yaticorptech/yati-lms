import { useCallback, useEffect, useState } from 'react';
import useLive from '../../live/useLive';

/**
 * Load on mount; `reload` to fetch again. Live: loaded again whenever the
 * server says competitions, Quiz Arena or the leaderboard changed (useLive),
 * keeping what is on screen until the new figures arrive.
 */
const LIVE_TOPICS = ['competitions', 'arena', 'leaderboard'];
const useLoad = (fn) => {
    const [state, setState] = useState({ data: null, error: '' });
    const [n, setN] = useState(0);
    useEffect(() => {
        let alive = true;
        fn().then((data) => { if (alive) setState({ data, error: '' }); })
            .catch((e) => { if (alive) setState((s) => (s.data ? s : { data: null, error: e.message })); });
        return () => { alive = false; };
    }, [fn, n]);
    const reload = useCallback(() => setN((x) => x + 1), []);
    useLive(LIVE_TOPICS, reload);
    // Time moves competitions on too (registration opening or closing, a start) with nothing sent by the server:
    // asked again every 30 s while the page is in view, and on coming back to it (2026-11-06).
    useEffect(() => {
        const tick = () => { if (document.visibilityState === 'visible') reload(); };
        const timer = setInterval(tick, 30000);
        document.addEventListener('visibilitychange', tick);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
    }, [reload]);
    return { ...state, reload };
};

export default useLoad;
