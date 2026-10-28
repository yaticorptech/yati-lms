import { useEffect, useRef, useState } from 'react';

/** Milliseconds left in the current phase, ticking, on the server's clock. */
const usePhaseClock = (view) => {
    const skew = useRef(0);
    const [now, setNow] = useState(() => Date.now());
    // The server's time when it made this view, against ours on arrival.
    useEffect(() => { if (view.serverNow) skew.current = view.serverNow - Date.now(); }, [view.serverNow]);
    const running = view.status === 'active' && view.phaseEndsAt;
    useEffect(() => {
        if (!running) return undefined;
        const t = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(t);
    }, [running]);
    if (!running) return { left: 0, share: 0 };
    const total = Math.max(1, view.phaseEndsAt - view.phaseStartedAt);
    const left = Math.max(0, view.phaseEndsAt - (now + skew.current));
    return { left, share: left / total };
};

export default usePhaseClock;
