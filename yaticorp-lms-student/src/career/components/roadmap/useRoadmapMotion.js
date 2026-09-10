/**
 * The behaviour behind roadmapMotion.css — reveal on scroll and pointer
 * parallax.
 *
 * Both ask the same question first: has this student asked their system to
 * reduce motion? If so each hands back its finished state immediately —
 * revealed, still — rather than a degraded animation.
 *
 * Counting the progress number is deliberately not here: career/hooks/useCountUp
 * already does it and the hero already used it.
 */
import { useCallback, useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveal an element the first time it comes into view.
 *
 * Drives the section's existing `.fp-reveal` class — which starts hidden and
 * animates in on `.is-in` — rather than introducing a second reveal system;
 * JourneyMap already uses it for the phase rows.
 *
 * Because `.fp-reveal` starts hidden, every path that cannot observe has to
 * reveal immediately: no IntersectionObserver, reduced motion, or an element
 * already on screen at first paint. Getting that wrong leaves a student
 * looking at a blank card, which is a far worse failure than no animation.
 *
 * Reveals once, then stops observing: content that fades away again as you
 * scroll back up is a distraction, not an effect.
 */
export const useReveal = ({ threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = {}) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add('is-in');

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      show();
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Already in view at first paint: reveal on the next frame so the
      // transition still runs, but nothing is ever left waiting for a scroll
      // that will not come.
      const frame = requestAnimationFrame(show);
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
};

/**
 * Pointer parallax, written to CSS custom properties on one element.
 *
 * Deliberately not React state: this fires on every pointer move, and a
 * setState per frame would re-render the whole roadmap to move two blurred
 * circles. Writing a custom property touches only the compositor.
 *
 * Skipped entirely for coarse pointers — on a phone there is no hover, the
 * effect would never be seen, and the listener would cost battery for nothing.
 */
export const useParallax = (strength = 14) => {
  const ref = useRef(null);

  const onPointerMove = useCallback(
    (event) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // -1 … 1 from the centre of the element.
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--fp-rm-px', (x * strength).toFixed(2));
      el.style.setProperty('--fp-rm-py', (y * strength).toFixed(2));
    },
    [strength]
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--fp-rm-px', '0');
    el.style.setProperty('--fp-rm-py', '0');
  }, []);

  const enabled =
    typeof window !== 'undefined' &&
    !prefersReducedMotion() &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return enabled
    ? { ref, onPointerMove, onPointerLeave }
    : { ref };
};
