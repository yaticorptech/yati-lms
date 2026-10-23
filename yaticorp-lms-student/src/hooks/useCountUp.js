/**
 * 0 → value over ~900ms, eased. Re-runs when the value changes; jumps
 * straight to the value when the user prefers reduced motion.
 *
 * Timed from its own first frame and clamped: a frame's timestamp can be
 * older than the moment the effect ran, and timing from performance.now()
 * read there counted below zero — the Global Quiz showed "-2%" and
 * "Questions -114". A timeout lands on the value whatever the frames do (a
 * hidden tab, a paused web view, headless), as src/interview/useCountUp.js does.
 */
import { useEffect, useRef, useState } from 'react';

export default function useCountUp(value, ms = 900) {
    const [n, setN] = useState(0);
    const raf = useRef(null);
    useEffect(() => {
        const target = Number(value) || 0;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let t0 = null;
        const tick = (t) => {
            if (reduce) { setN(target); return; }
            if (t0 === null) t0 = t;
            const p = Math.min(1, Math.max(0, (t - t0) / ms));
            const eased = 1 - (1 - p) ** 3;
            setN(Math.round(target * eased));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        const settle = setTimeout(() => { cancelAnimationFrame(raf.current); setN(target); }, ms + 80);
        return () => { cancelAnimationFrame(raf.current); clearTimeout(settle); };
    }, [value, ms]);
    return n;
}
