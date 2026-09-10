import { useEffect } from 'react';

/**
 * Fires the rig's blink trigger at irregular intervals.
 *
 * This is a timer, and it is worth being precise about what it is not: it
 * never changes the mascot's state or pose. It pulls one trigger on a
 * dedicated state-machine layer that touches only the two eyelid bones, so a
 * blink plays over whatever the body is doing without interrupting it. The
 * pose cycling removed in stage one swapped the whole character on a fixed
 * clock; this cannot, because it has no access to the body layer at all.
 *
 * The interval is deliberately irregular. A blink on an exact metronome is
 * one of the things that makes a character read as a machine.
 */
const MIN_GAP = 2800;
const MAX_GAP = 6600;

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function useBlinkScheduler(fire, active = true) {
  useEffect(() => {
    if (!fire || !active || reducedMotion()) return undefined;

    let timer = null;
    const schedule = () => {
      timer = setTimeout(() => {
        // A blink nobody can see is a wasted frame.
        if (!document.hidden) fire();
        schedule();
      }, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
    };
    schedule();

    // A backgrounded tab stops the whole cycle rather than queueing blinks.
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fire, active]);
}
