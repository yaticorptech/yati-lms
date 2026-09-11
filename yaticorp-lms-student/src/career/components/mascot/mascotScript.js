/**
 * Guidance sequences: the difference between a mascot that reacts and one
 * that guides.
 *
 * A script is a list of declarative steps. A page says what it wants the
 * student to understand and which element it is about; it holds no timers, no
 * poses and no coordinates.
 *
 *   mascot.guide([
 *     { say: "Let's start here!" },
 *     { walkTo: 'lesson-1' },
 *     { point: 'lesson-1', say: 'Click here to begin.' },
 *     { waitFor: { target: 'lesson-1', event: 'click' } },
 *     { react: 'taskStart' },
 *     { dock: true }
 *   ]);
 *
 * Cancellation is the important part. A script is abandoned the moment its
 * target leaves the page, the student navigates away, or anything else asks
 * the mascot to do something. It never leaves the character pointing at a
 * node that no longer exists.
 */
import mascot, { PRIORITY, installScriptRunner } from './mascotBus.js';
import { bringIntoView, findTarget, waitForTarget } from './mascotTargets.js';

let running = null;

const sleep = (ms, token) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    token.onCancel(() => {
      clearTimeout(t);
      resolve();
    });
  });

/** How long a line of narration stays up when a step does not say. */
const READ_MS = 2600;

const makeToken = () => {
  const callbacks = new Set();
  return {
    cancelled: false,
    onCancel(fn) {
      callbacks.add(fn);
    },
    cancel() {
      this.cancelled = true;
      for (const fn of callbacks) fn();
      callbacks.clear();
    }
  };
};

/**
 * Play one step. Returns false to abandon the rest of the script, which is
 * what a vanished target or a cancellation does.
 */
const playStep = async (step, token) => {
  if (token.cancelled) return false;

  // Walk to a real element, scrolling it into view first so the character
  // does not walk off the screen after it.
  if (step.walkTo) {
    const ok = await bringIntoView(step.walkTo);
    if (token.cancelled) return false;
    // `optional` is for an element a page only sometimes has — an empty
    // planner has no task list. Skipping the step keeps the rest of the
    // sequence; treating it as a vanished target would abandon it.
    if (!ok || !findTarget(step.walkTo)) return !!step.optional;
    mascot.goTo(step.walkTo, { state: 'walking', priority: PRIORITY.guidance });
    await sleep(step.hold ?? step.ms ?? 900, token);
    return !token.cancelled;
  }

  // Arrive, face it, point at it, and say why.
  if (step.point) {
    if (!findTarget(step.point)) return !!step.optional;
    mascot.goTo(step.point, {
      state: step.state ?? 'pointing',
      prefer: step.prefer ?? null,
      message: step.say ?? null,
      ms: step.ms,
      priority: PRIORITY.guidance
    });
    /*
     * `ms` is how long the words stay up; `hold` is how long this step blocks.
     * They are separate on purpose. A step that spoke used to advance the
     * instant it had spoken, so a script ending "point, then dock" docked
     * before the student could read anything.
     */
    await sleep(step.hold ?? (step.say ? 900 : 700), token);
    return !token.cancelled;
  }

  // Hold, pointing, until the student actually does the thing.
  if (step.waitFor) {
    const { target, event = 'click', timeout = 45000 } = step.waitFor;
    const why = await waitForTarget(target, { event, timeout });
    if (token.cancelled) return false;
    // A target that disappeared is a cancellation, not a completed step.
    return why !== 'gone';
  }

  if (step.react) {
    mascot.react(step.react, { priority: PRIORITY.reaction });
    await sleep(step.hold ?? 1600, token);
    return !token.cancelled;
  }

  if (step.say) {
    mascot.say(step.say, {
      ms: step.ms ?? 4200,
      priority: PRIORITY.guidance,
      anchor: step.at ?? null,
      ...(step.state ? { state: step.state } : {})
    });
    await sleep(step.hold ?? READ_MS, token);
    return !token.cancelled;
  }

  if (step.pause) {
    await sleep(step.pause, token);
    return !token.cancelled;
  }

  if (step.dock) {
    mascot.dock(typeof step.dock === 'string' ? step.dock : null);
    return !token.cancelled;
  }

  if (step.hide) {
    mascot.hide();
    return false;
  }

  return !token.cancelled;
};

/** Start a sequence, abandoning any sequence already in flight. */
const run = async (steps, { onEnd, stay = false } = {}) => {
  cancel();
  const token = makeToken();
  running = token;

  mascot.enter();
  for (const step of steps || []) {
    const carryOn = await playStep(step, token);
    if (!carryOn) break;
  }

  if (running === token) {
    running = null;
    /*
     * However a script ends — finished, target gone, student ignored it —
     * the character returns to a resting place rather than freezing.
     *
     * Unless it was sent somewhere to stay. Page guidance ends standing
     * beside the thing it is pointing at and belongs there until the
     * student scrolls past it or leaves the page; walking home the moment
     * it had finished its sentence was the behaviour that made the guidance
     * useless, because the answer left before the question was read.
     */
    if (!token.cancelled && !stay) mascot.dock();
    onEnd?.(token.cancelled ? 'cancelled' : 'finished');
  }
};

const cancel = () => {
  if (!running) return;
  const token = running;
  running = null;
  token.cancel();
};

export const isGuiding = () => running !== null;

installScriptRunner({ run, cancel });

export { run as guide, cancel as cancelGuide };
