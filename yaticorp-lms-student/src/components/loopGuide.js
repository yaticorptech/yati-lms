import { useEffect, useRef } from 'react';

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

/**
 * Loop says one line, with no element to point at: what a page or a tab is
 * for, when a student opens it (App.jsx). Dropped when Loop is not on the page
 * yet, is hidden, or a popup is open; the words are all shown at once and go
 * when the student moves (loop-walker.js, say and movedOn). True when it shows.
 */
export function sayLoop(label, text, { emo = 'joy', gesture = 'wave' } = {}) {
  if (!handle?.say) return false;
  handle.hush?.();                                       // whatever it was explaining on the last page ends first
  handle.say(label, text, 1, emo);
  if (gesture) handle.gesture?.(gesture, 1.4);
  return handle.speaking !== false;                      // an older loop-walker.js has no `speaking`: assume it showed
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

// The navigation: the sidebar, the top bar and its menus, the phone's bottom
// bar and slide-out menu (all data-loop-skip), and a page's own section strip
// (Career Path's), which is a <nav> or a tab list.
const NAV = '[data-loop-skip], nav, [role="navigation"], [role="tablist"]';
// How long after a click a new page or tab still counts as opened by it: long
// enough for a redirect (Career Path to its onboarding).
const NAV_WINDOW = 1500;

/**
 * Loop says what a page, or one of its tabs, is for every time the student
 * opens it (asked 2026-10-15: "everytime it should explain ..for few seconds
 * and then the message should disappear"). The words stay a few seconds and
 * go by themselves (loop-walker.js, readTime), or sooner when the student
 * moves on (movedOn).
 * - `pages` maps a path to { label, text }: said when the page is opened from
 *   the navigation, not from a link inside a page or the back button.
 * - `tabs` maps a path to { default: id, <id>: { label, text } }: said when a
 *   click changes the page's ?tab= (Dashboard, My Courses, Jobs, Games &
 *   Competitions all keep their open tab there; the default tab leaves it out).
 * Said a moment after the change, so the page is drawn first; a redirect
 * straight after (a page that sends the student on) is explained instead.
 */
export function useSayPageOnNav(path, tab, pages, tabs) {
  const navAt = useRef(0);
  const clickAt = useRef(0);
  const last = useRef({ path, tab });
  useEffect(() => {
    const onClick = (e) => {
      const hit = e.target.closest?.('a[href], button, [role="tab"]');
      if (!hit) return;
      clickAt.current = Date.now();
      if (hit.closest(NAV)) navAt.current = Date.now();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  useEffect(() => {
    const before = last.current;
    last.current = { path, tab };
    const now = Date.now();
    let line = null;
    if (before.path !== path) {
      if (now - navAt.current > NAV_WINDOW) return undefined;
      line = pages[path];
    } else if (before.tab !== tab) {
      if (now - clickAt.current > NAV_WINDOW || !tabs[path]) return undefined;
      line = tabs[path][tab || tabs[path].default];
    }
    if (!line) return undefined;
    // Tried again for a few seconds when it could not show: a page that loads
    // on first visit (Jobs, Career Path) puts its full-screen loader up first,
    // and Loop says nothing over that. Stops when the page or tab changes.
    let timer;
    const attempt = (n) => {
      if (!sayLoop(line.label, line.text) && n < 10) timer = setTimeout(() => attempt(n + 1), 400);
    };
    timer = setTimeout(() => attempt(0), 450);
    return () => clearTimeout(timer);
  }, [path, tab, pages, tabs]);
}

/**
 * Loop points at `selector`'s element and says its words (its
 * data-explain-label and data-explain-text) the first time the student
 * scrolls near it: its top within the screen's upper 70%. Once per visit to
 * the page (per mount); while `enabled` is false (the page still loading) it
 * waits. The element carries no data-explain, so a cursor passing over it does
 * not set Loop off as well; and Loop waits its turn when it is mid-sentence
 * (api.explain queues). My Progress → Still to do (asked 2026-10-15).
 */
export function usePointLoopWhenNear(selector, enabled) {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver !== 'function') return undefined;
    const el = document.querySelector(selector);
    if (!el) return undefined;
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      pointLoopAt(el);
    }, { rootMargin: '0px 0px -30% 0px' });
    seen.observe(el);
    return () => seen.disconnect();
  }, [selector, enabled]);
}
