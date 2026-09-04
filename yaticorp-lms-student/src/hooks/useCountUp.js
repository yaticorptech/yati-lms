/**
 * 0 → value over ~900ms, eased. Re-runs when the value changes; jumps
 * straight to the value when the user prefers reduced motion.
 */
import { useEffect, useRef, useState } from 'react';

export default function useCountUp(value, ms = 900) {
    const [n, setN] = useState(0);
    const raf = useRef(null);
    useEffect(() => {
        const target = Number(value) || 0;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const t0 = performance.now();
        const tick = (t) => {
            if (reduce) { setN(target); return; }
            const p = Math.min(1, (t - t0) / ms);
            const eased = 1 - (1 - p) ** 3;
            setN(Math.round(target * eased));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [value, ms]);
    return n;
}
