import { useEffect, useState } from 'react';

/**
 * Animates a number from 0 up to `target` once, on mount or whenever the
 * target changes. Used so stat tiles land with motion rather than snapping.
 */
export default function useCountUp(target = 0, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    // Nothing to animate: either the number is zero, or the OS has asked for
    // reduced motion and the final value should simply appear.
    //
    // Still handed to a frame rather than set here. Calling setState in the
    // body of an effect makes React render the tile twice on every mount, and
    // a stats band is six or eight of these at once.
    const settleAtOnce =
      end === 0 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let frame;

    if (settleAtOnce) {
      frame = requestAnimationFrame(() => setValue(end));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setValue(Math.round(end * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
