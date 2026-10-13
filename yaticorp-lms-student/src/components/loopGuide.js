import { useEffect } from 'react';

/**
 * A page asking Loop to walk over to one thing on it and explain it, without
 * the student pausing on it first: Career Path's Overview sends Loop to the
 * quest button, the Roadmap to the phase the student is on, and the Planner
 * to "Generate another task" once the day's tasks are all done.
 *
 * LoopWalker registers the mascot here once it is mounted. A request that
 * arrives earlier (the script is still loading on a fresh visit) waits for
 * it, and is dropped if its element has left the page by then.
 */
let handle = null;
let pending = null;

/** Called by LoopWalker with the mounted mascot, and with null when it goes. */
export function setLoopHandle(next) {
  handle = next;
  if (handle && pending) {
    const el = pending;
    pending = null;
    if (el.isConnected) handle.explain?.(el);
  }
}

/** Sends Loop to `el` now, or as soon as Loop is on the page. */
export function pointLoopAt(el) {
  if (!el) return;
  if (handle?.explain) handle.explain(el);
  else pending = el;
}

// "Already shown today" marks, one per `oncePerDay` key. Browser storage can
// be missing or refuse (private windows), and then Loop simply asks again.
const shownToday = (key) => {
  try { return localStorage.getItem(`loop-pointed:${key}`) === new Date().toDateString(); } catch { return false; }
};
const markShown = (key) => {
  try { localStorage.setItem(`loop-pointed:${key}`, new Date().toDateString()); } catch { /* asks again next visit */ }
};

// On screen with room to spare: below the top bar and above a phone's bottom bar.
const comfortablyInView = (el) => {
  const r = el.getBoundingClientRect();
  return r.top >= window.innerHeight * 0.12 && r.bottom <= window.innerHeight * 0.8;
};
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A popup over the page: a dialog, the day's question, a finished task's
// confetti. The same test the Career Path mascot used (mascotEngine).
const DIALOG = '[role="dialog"][aria-modal="true"], [role="alertdialog"]';
const dialogOpen = () => !!document.querySelector(DIALOG);

/**
 * Once per mount, when `selector` is set: waits `delay` ms for the page to
 * settle (the section's entrance animation moves things), then sends Loop to
 * the first match. Pass null to ask for nothing. With `oncePerDay`, a key,
 * Loop does it on the first visit of the day only: a nudge that comes back
 * on every visit stops being read. Loop says it once and then walks back to
 * its corner (loop-walker.js), out of the way of the thing it pointed at.
 *
 * With `scroll`, a match that is off screen (or half off it) is scrolled to
 * the middle first, and Loop sets off once the scroll and the reveal it sets
 * off have finished: Loop can only point at what the student can see. The
 * Roadmap uses it, where the phase being stood on is often below the fold.
 *
 * While a popup is open over the page, Loop waits for it to close (and a
 * moment more, for it to fade) rather than talking about something behind it:
 * on the first visit of the day the day's question is usually up. The day's
 * mark is only spent once Loop actually sets off.
 */
export function usePointLoopAt(selector, { delay = 900, oncePerDay, scroll = false } = {}) {
  useEffect(() => {
    if (!selector || (oncePerDay && shownToday(oncePerDay))) return undefined;
    let timer;
    const go = (waited) => {
      if (dialogOpen()) { timer = setTimeout(() => go(true), 500); return; }
      if (waited) { timer = setTimeout(() => go(false), 600); return; }
      const el = document.querySelector(selector);
      if (!el) return;
      if (oncePerDay) markShown(oncePerDay);
      if (!scroll || comfortablyInView(el)) { pointLoopAt(el); return; }
      const smooth = !reducedMotion();
      el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
      timer = setTimeout(() => { if (el.isConnected) pointLoopAt(el); }, smooth ? 1100 : 100);
    };
    timer = setTimeout(() => go(false), delay);
    return () => clearTimeout(timer);
  }, [selector, delay, oncePerDay, scroll]);
}
