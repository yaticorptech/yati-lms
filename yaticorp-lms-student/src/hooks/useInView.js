/**
 * True once the element has been scrolled into view, and true for good.
 *
 * Entrance animations run on mount, which means anything below the fold has
 * finished moving before it is ever looked at — a staggered list of ten skills
 * plays its whole sequence to nobody and then sits there, already still. This
 * holds the animation back until the section is actually on screen.
 *
 * One-way on purpose: a row that re-animated every time it scrolled past would
 * be a distraction rather than an arrival. Starts true where there is no
 * observer, so the content is never hidden by a missing API.
 */
import { useEffect, useRef, useState } from 'react';

export default function useInView({ rootMargin = '0px 0px -10% 0px', threshold = 0.1 } = {}) {
    const ref = useRef(null);
    const [inView, setInView] = useState(() => !('IntersectionObserver' in window));

    useEffect(() => {
        const el = ref.current;
        if (!el || !('IntersectionObserver' in window)) return undefined;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setInView(true);
                io.disconnect();
            },
            { rootMargin, threshold }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [rootMargin, threshold]);

    return [ref, inView];
}
