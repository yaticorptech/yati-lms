import { useEffect, useRef, useState } from 'react';
import api from '../career/services/api';

/**
 * Today's Group games time (2026-10-29): 30 minutes a day, apart from the solo games' allowance and counted
 * the same way (Games.jsx usePlayTime). The server keeps the count from a heartbeat every fifteen seconds
 * while `playing` (a group game in play, the tab in view); between beats it ticks down here. Leaving the
 * game pauses it; it carries on from there the next time a game is played. `onTimeUp` fires once when it
 * reaches zero during play.
 */
export default function useGroupTime(playing, onTimeUp) {
    const [left, setLeft] = useState(null);
    const [limit, setLimit] = useState(null);
    const timeUp = useRef(onTimeUp);
    useEffect(() => { timeUp.current = onTimeUp; }, [onTimeUp]);

    const take = (data) => {
        if (!data) return;
        setLimit(data.limitSeconds || null);
        setLeft(data.limitSeconds ? data.remainingSeconds : null);
        if (data.limitSeconds && data.remainingSeconds === 0) timeUp.current?.();
    };

    useEffect(() => {
        api.get('/games/group-time').then(({ data }) => take(data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!playing) return undefined;
        let last = Date.now();
        let pending = 0;
        const send = () => {
            if (pending < 1) return;
            const seconds = Math.round(pending);
            pending = 0;
            api.post('/games/group-time', { seconds }).then(({ data }) => take(data)).catch(() => {});
        };
        const tick = setInterval(() => {
            const now = Date.now();
            // Only time in view counts: a game left open in a background tab is not play.
            if (document.visibilityState === 'visible') {
                pending += (now - last) / 1000;
                setLeft((l) => {
                    if (l === null) return l;
                    if (l === 1) setTimeout(() => { send(); timeUp.current?.(); }, 0);
                    return Math.max(0, l - 1);
                });
            }
            last = now;
        }, 1000);
        const beat = setInterval(send, 15000);
        return () => {
            clearInterval(tick);
            clearInterval(beat);
            send();
        };
    }, [playing]);

    return { left, limit, outOfTime: left === 0 };
}
