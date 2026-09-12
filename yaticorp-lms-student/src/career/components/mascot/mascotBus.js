/**
 * The one place that knows what the mascot is doing.
 *
 * Pages report what happened — `mascot.react('quizPassed')`, `mascot.say(…)`,
 * `mascot.goTo('roadmap')` — and never touch a pose, a class or a keyframe.
 * The controller subscribes to this store and is the only thing that renders
 * a character. That split is the point: a page that wants the mascot to react
 * gains one line and no animation code.
 *
 * A tiny external store rather than context, so anything can drive the
 * character — an effect, a callback, a plain DOM event listener — without a
 * provider having to sit above it.
 */
// Extension spelled out so this module also loads under plain Node, which
// is how its rules are tested (tests/mascot/bus.test.js).
import { REACTIONS, STATES, isReaction, isState } from './mascotStates.js';

/**
 * How firmly a change holds the stage. A celebration should not be shoved
 * aside by an idle nudge that happened to fire half a second later, so a
 * lower-priority call during a higher-priority hold is dropped.
 */
export const PRIORITY = { idle: 0, ambient: 1, guidance: 2, reaction: 3, urgent: 4 };

const BASE = {
  /**
   * Where the character is, in the only three places it can be.
   *
   *   hidden   off stage entirely, paused, costing nothing
   *   docked   small and quiet in a slot, or the corner if no slot is in view
   *   active   large, free to walk anywhere, guiding
   *
   * `visible` is kept as a mirror so nothing that reads it has to change.
   */
  mode: 'hidden',
  visible: false,
  /*
   * Told to go, rather than simply having nowhere to stand.
   *
   * Without this the two are indistinguishable, and the automatic rule below
   * reads "hidden, but a slot exists" as "bring it back" — so a character
   * sent away because the student scrolled past what it was explaining
   * walked straight back on again.
   */
  suppressed: false,
  state: 'idle',
  pose: STATES.idle.pose,
  body: STATES.idle.body,
  message: null,
  // The line just retired, held for as long as its bubble takes to leave.
  // It lives here rather than in the view so the controller can stay a pure
  // function of this store — what is being said is this store's business.
  lastMessage: null,
  cta: null,
  anchor: null,
  // Which side of the anchor the page would rather it stood on.
  prefer: null,
  // A slot the caller would rather dock into, when one is named.
  slot: null,
  // Bumped on every commit so the view can restart one-shot animations.
  seq: 0
};

/** How long a bubble takes to animate out; see `.mcb-out` in mascot.css. */
const FADE_MS = 320;

let snapshot = BASE;
let holdUntil = 0;
let holdPriority = 0;
let timer = null;
let fadeTimer = null;
const listeners = new Set();

const now = () => Date.now();

const emit = () => {
  for (const fn of listeners) fn();
};

const commit = (patch) => {
  const prev = snapshot;
  const next = { ...prev, ...patch, seq: prev.seq + 1 };

  if (patch.message) {
    next.lastMessage = null;
    clearTimeout(fadeTimer);
    fadeTimer = null;
  } else if ('message' in patch && prev.message) {
    // Falling silent: keep the words alive while the bubble leaves.
    next.lastMessage = prev.message;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      snapshot = { ...snapshot, lastMessage: null, seq: snapshot.seq + 1 };
      emit();
    }, FADE_MS);
  }

  snapshot = next;
  emit();
};

const clearTimer = () => {
  if (timer) clearTimeout(timer);
  timer = null;
};

/**
 * Settle: the character stops guiding and docks. Only ever called explicitly,
 * never by a clock deciding the pose has been held long enough.
 */
const rest = () => {
  clearTimer();
  holdUntil = 0;
  holdPriority = 0;
  commit({
    mode: 'docked',
    visible: true,
    state: 'idle',
    pose: STATES.idle.pose,
    body: STATES.idle.body,
    message: null,
    cta: null,
    anchor: null
  });
};

/** How long a line of speech stays up when the caller does not say. */
const SPEAK_MS = 6000;

/**
 * Apply one beat of behaviour. Everything public funnels through here so the
 * hold rules are enforced in exactly one place.
 *
 * The timer this may set retires the WORDS, never the pose. A mascot that
 * changes what it is doing because a clock ran out is the cycling behaviour
 * this system exists to be rid of: the state holds until the application
 * reports something new.
 */
const play = ({ state = 'idle', pose, body, message = null, cta = null, anchor, prefer, ms, priority = PRIORITY.ambient }) => {
  if (priority < holdPriority && now() < holdUntil) return false;

  const base = STATES[isState(state) ? state : 'idle'];
  /*
   * `ms: 0` means the line stands until something replaces it.
   *
   * Page guidance needs this. A student who is being shown where to click
   * has not been given a few seconds to read and then abandoned — the
   * instruction is true for as long as they are looking at the thing it is
   * about, so it is cleared by leaving, not by a clock.
   */
  const persistent = !!message && ms === 0;
  const speakFor = message && !persistent ? (ms ?? SPEAK_MS) : 0;

  clearTimer();
  holdPriority = priority;
  // The priority window lasts as long as the words; after that anything may
  // speak again, while the pose stays exactly where it was left.
  holdUntil = persistent ? Infinity : speakFor ? now() + speakFor : 0;

  commit({
    mode: 'active',
    visible: true,
    state: isState(state) ? state : 'idle',
    pose: pose || base.pose,
    body: body || base.body,
    message,
    cta,
    ...(anchor === undefined ? {} : { anchor }),
    ...(prefer === undefined ? {} : { prefer })
  });

  if (speakFor) {
    timer = setTimeout(() => {
      timer = null;
      holdPriority = 0;
      holdUntil = 0;
      // Words only. The character keeps doing what it was doing.
      commit({ message: null, cta: null });
    }, speakFor);
  }
  return true;
};

/**
 * Guidance sequences live in mascotScript.js. It registers itself here on
 * import, so `mascot.guide(...)` works from anywhere without this module
 * having to import the runner and create a cycle.
 */
let runScript = null;
let cancelScript = null;
export const installScriptRunner = ({ run, cancel }) => {
  runScript = run;
  cancelScript = cancel;
};

/**
 * The two automatic mode changes, as a pure rule so they can be tested.
 *
 * A page that declares a slot is a reason for the mascot to be present; a page
 * with none is not. Neither transition fires while the character is busy, so
 * guidance is never interrupted by the page it is guiding on.
 *
 * Returns 'dock', 'hide', or null for leave it alone.
 */
export const autoMode = ({ mode, busy, hasSlot, overlay, suppressed = false }) => {
  if (busy || overlay) return null;
  // Sent away on purpose: only an explicit enter() brings it back.
  if (mode === 'hidden' && hasSlot && !suppressed) return 'dock';
  if (mode === 'docked' && !hasSlot) return 'hide';
  return null;
};

export const mascot = {
  /** Bring the character on stage, docked unless told otherwise. */
  enter(opts = {}) {
    commit({ mode: 'docked', visible: true, suppressed: false });
    if (opts.message || opts.state) play({ priority: PRIORITY.guidance, ...opts });
    return mascot;
  },

  /** Walk it off stage. The controller plays the exit, then it costs nothing. */
  leave() {
    cancelScript?.();
    clearTimer();
    holdUntil = 0;
    holdPriority = 0;
    commit({ mode: 'hidden', visible: false, suppressed: true, message: null, cta: null, anchor: null, prefer: null });
    return mascot;
  },

  /** Small and quiet, in a slot. `slot` names one to prefer. */
  dock(slot = null) {
    cancelScript?.();
    clearTimer();
    holdUntil = 0;
    holdPriority = 0;
    commit({
      mode: 'docked',
      visible: true,
      suppressed: false,
      state: 'idle',
      pose: STATES.idle.pose,
      body: STATES.idle.body,
      message: null,
      cta: null,
      anchor: null,
      prefer: null,
      slot
    });
    return mascot;
  },

  /** Completely gone. */
  hide() {
    return mascot.leave();
  },

  /**
   * Run a guidance sequence: appear, walk to a real element, point, speak,
   * wait for the student, react, and dock again. Steps are declarative; the
   * page supplies words and target names and nothing else.
   */
  guide(steps, opts) {
    runScript?.(steps, opts);
    return mascot;
  },

  /** Abandon the current sequence and settle. */
  cancelGuide() {
    cancelScript?.();
    return mascot;
  },

  /**
   * Report a moment. The table in mascotStates.js decides the reaction, so
   * the wording and the pose can change without touching the page.
   */
  react(key, opts = {}) {
    if (!isReaction(key)) return mascot;
    play({ ...REACTIONS[key], ...opts, priority: opts.priority ?? PRIORITY.reaction });
    return mascot;
  },

  /** Say something. `cta` adds one button to the bubble. */
  say(message, opts = {}) {
    play({ state: 'talking', priority: PRIORITY.guidance, ...opts, message });
    return mascot;
  },

  /**
   * Walk to a named anchor and, on arrival, point at it. `anchor` matches a
   * `data-mascot="<name>"` or `data-guide="<name>"` attribute on the page.
   */
  goTo(anchor, opts = {}) {
    play({ state: opts.message ? 'pointing' : 'idle', anchor, priority: PRIORITY.guidance, ...opts });
    return mascot;
  },

  /** Drive the state directly, for a page that really does know best. */
  setState(state, opts = {}) {
    play({ state, priority: PRIORITY.ambient, ...opts });
    return mascot;
  },

  /** Let go of the current beat and settle. */
  rest() {
    rest();
    return mascot;
  },

  /** Where the character should stand, without changing what it is doing. */
  anchorTo(anchor) {
    commit({ anchor });
    return mascot;
  }
};

/* ---- React plumbing ---------------------------------------------------- */

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getSnapshot = () => snapshot;

/* ---- The interface already speaks; listen to it ------------------------
 *
 * These CustomEvents were dispatched by the quiz, the games and the planner
 * long before this character existed. Bridging them here means those pages
 * keep their single dispatch line and gain the whole character for free.
 */
const BRIDGE = {
  'mascot:quiz-start': () => mascot.react('quizStart'),
  'mascot:quiz-end': () => mascot.rest(),
  'mascot:quiz-result': (e) => mascot.react(e.detail?.passed ? 'quizPassed' : 'quizFailed'),
  'mascot:task-start': () => mascot.react('taskStart'),
  'mascot:section-complete': () => mascot.react('dayCleared'),
  'mascot:task-complete': () => mascot.react('taskCompleted'),
  'mascot:level-up': () => mascot.react('levelUp'),
  'mascot:badge': () => mascot.react('newBadge')
};

let installed = false;

/** Attach the bridge once, however many controllers mount. */
export const installBridge = () => {
  if (installed || typeof window === 'undefined') return () => {};
  installed = true;
  for (const [name, fn] of Object.entries(BRIDGE)) window.addEventListener(name, fn);
  return () => {
    for (const [name, fn] of Object.entries(BRIDGE)) window.removeEventListener(name, fn);
    installed = false;
  };
};

export default mascot;
