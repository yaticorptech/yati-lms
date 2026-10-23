import { useCallback, useEffect, useState } from 'react';

export const FOCUS_SECONDS = 25 * 60;

/**
 * A 25-minute focus timer, held by the editor so the timer in its toolbar and
 * the one in focus mode are the same clock.
 */
export default function useFocusTimer(seconds = FOCUS_SECONDS) {
    const [left, setLeft] = useState(seconds);
    const [running, setRunning] = useState(false);
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => setLeft((s) => { if (s <= 1) { setRunning(false); return 0; } return s - 1; }), 1000);
        return () => clearInterval(id);
    }, [running]);
    const toggle = useCallback(() => setRunning((r) => !r), []);
    const reset = useCallback(() => { setRunning(false); setLeft(seconds); }, [seconds]);
    return { left, running, toggle, reset };
}
