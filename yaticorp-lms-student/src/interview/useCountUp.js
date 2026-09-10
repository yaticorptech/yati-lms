/** Counts from 0 to `value` with an ease-out, once per value. Its own file so ui.jsx exports only components. */
import { useEffect, useState } from 'react';
export const useCountUp = (value, ms = 900) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        const target = Number(value) || 0; let raf; let t0 = null;
        // Frames drive the animation; the timeout guarantees the final number even when no frame ever runs (hidden tab, reduced motion, headless).
        const step = (t) => { if (t0 === null) t0 = t; const p = Math.min(1, Math.max(0, (t - t0) / ms)); const e = 1 - Math.pow(1 - p, 3); setN(Math.round(target * e)); if (p < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
        const settle = setTimeout(() => { cancelAnimationFrame(raf); setN(target); }, ms + 80);
        return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
    }, [value, ms]);
    return n;
};
