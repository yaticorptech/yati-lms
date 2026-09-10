/**
 * Finding the real thing on the page that the mascot is talking about.
 *
 * Targets are named, never positioned. A caller says "walk to build-roadmap"
 * and this resolves that name to a live element and measures it. Nothing here
 * caches an element: every measurement re-resolves by name, so a target that
 * was replaced during a re-render, or removed by a route change, is reported
 * as gone rather than measured as a ghost.
 */

/** The attributes a page may use to name something, most specific first. */
const ATTRS = ['data-mascot-target', 'data-mascot', 'data-guide'];

/** The element a name currently refers to, or null. */
export const findTarget = (name) => {
  if (!name || typeof document === 'undefined') return null;
  for (const attr of ATTRS) {
    const el = document.querySelector(`[${attr}="${CSS.escape(name)}"]`);
    // isConnected rules out a node React has already detached.
    if (el && el.isConnected) return el;
  }
  return null;
};

/** Its box right now, or null if it has gone or has no box. */
export const rectOf = (name) => {
  const el = findTarget(name);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return r;
};

export const isOnScreen = (name, margin = 0) => {
  const r = rectOf(name);
  if (!r) return false;
  return (
    r.bottom > -margin && r.top < window.innerHeight + margin && r.right > -margin && r.left < window.innerWidth + margin
  );
};

/**
 * Bring a target into view before walking to it.
 *
 * A mascot that walks to something off screen walks off screen. Resolves when
 * the scroll has settled, or immediately under a reduced-motion preference.
 */
export const bringIntoView = (name) =>
  new Promise((resolve) => {
    const el = findTarget(name);
    if (!el) {
      resolve(false);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (isOnScreen(name, -40)) {
      resolve(true);
      return;
    }
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
    // Smooth scrolling has no completion event; this is the settle time.
    setTimeout(() => resolve(true), reduced ? 0 : 420);
  });

/**
 * Watch a target and report its box whenever it moves, plus the moment it
 * disappears. The caller gets a single unsubscribe.
 *
 * Everything is rAF-throttled onto one measurement pass, so a scroll costs one
 * layout read however many things are watching.
 */
export const watchTarget = (name, onChange) => {
  let queued = false;
  let alive = true;

  const measure = () => {
    if (!alive) return;
    queued = false;
    onChange(rectOf(name));
  };
  const request = () => {
    if (queued || !alive) return;
    queued = true;
    requestAnimationFrame(measure);
  };

  request();
  window.addEventListener('scroll', request, true);
  window.addEventListener('resize', request);

  // A target removed by a re-render fires no scroll and no resize. This is
  // what turns "the mascot is pointing at nothing" into a cancellation.
  const observer =
    typeof MutationObserver !== 'undefined'
      ? new MutationObserver(request)
      : null;
  observer?.observe(document.body, { childList: true, subtree: true });

  return () => {
    alive = false;
    window.removeEventListener('scroll', request, true);
    window.removeEventListener('resize', request);
    observer?.disconnect();
  };
};

/**
 * Wait for the student to do something to a target.
 *
 * Resolves 'done' when they act, 'gone' if the element disappears first, and
 * 'timeout' if they never do. The distinction matters: a vanished target is a
 * cancellation, an ignored prompt is the mascot politely giving up.
 */
export const waitForTarget = (name, { event = 'click', timeout = 45000 } = {}) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (why) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(why);
    };

    const onAct = () => finish('done');

    // Delegated from the document, so the listener survives the target being
    // re-rendered into a new node with the same name.
    const onDocEvent = (e) => {
      const el = findTarget(name);
      if (el && (e.target === el || el.contains(e.target))) onAct();
    };
    document.addEventListener(event, onDocEvent, true);

    const stopWatching = watchTarget(name, (rect) => {
      if (!rect) finish('gone');
    });

    const timer = timeout ? setTimeout(() => finish('timeout'), timeout) : null;

    function cleanup() {
      document.removeEventListener(event, onDocEvent, true);
      stopWatching();
      if (timer) clearTimeout(timer);
    }
  });
