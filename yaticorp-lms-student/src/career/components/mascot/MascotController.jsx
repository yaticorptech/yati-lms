import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import MascotRenderer from './MascotRenderer';
import { STATES, isState } from './mascotStates';
import mascot, { autoMode, getSnapshot, installBridge, subscribe } from './mascotBus';
import { chooseSlot, slotsVersion, subscribeSlots } from './mascotSlots';
import { bubbleSide, cornerSpot, offStageSpot, overlayOpen, spotInSlot, standBeside } from './mascotPlacement';
import { rectOf } from './mascotTargets';
import { createBody, gaitRate, isTravelling, motionState, step, teleport } from './mascotLocomotion';
// Importing this registers the guidance runner with the bus. It has no other
// export used here, and must not be dropped as an unused import.
import './mascotScript';
import './mascot.css';

/**
 * 🤖 The one mascot, and everything about how it moves.
 *
 * Rendered only by MascotStage, which guarantees there is exactly one. This
 * component owns the character's position and nothing else owns any part of
 * it: no page places it, no page hides it, no page draws a second one.
 *
 * Three modes, one actor, never unmounted:
 *
 *   hidden   off the side of the screen, every animation paused
 *   docked   standing in a declared slot at the size that slot reserved, or
 *            in the corner when no slot is on screen
 *   active   free to walk anywhere, pointing at real elements and speaking
 *
 * Movement is integrated in a requestAnimationFrame loop and written straight
 * to a transform, so crossing the page costs one composited property per frame
 * and no React render. Where it walks to is always measured from a live DOM
 * element, never a stored coordinate: a target that scrolls takes the mascot
 * with it, and a target that is removed cancels the guidance rather than
 * leaving the character pointing at a hole.
 */

/**
 * How long the character waits before believing a page has no slot for it.
 * Long enough to cover a route swap, short enough that leaving still reads as
 * a decision rather than a delay.
 */
const HIDE_GRACE_MS = 700;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function MascotController() {
  const live = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Slots live outside React, so the character has to be told when one
  // appears, moves or goes away. The version is kept rather than discarded
  // because it is what re-runs the measuring pass below: without it a slot
  // could mount and the mascot would not notice until something else moved.
  const slotVersion = useSyncExternalStore(subscribeSlots, slotsVersion, slotsVersion);

  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [paused, setPaused] = useState(false);
  const [size, setSize] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 66 : 98));
  const [look, setLook] = useState(0);
  // Bumped by the grace timer below to re-run the visibility decision.
  const [recheck, setRecheck] = useState(0);

  /**
   * What the body is doing, committed to React only when it changes in a way
   * anyone could see. The position itself never comes through here: it is
   * written straight to a transform sixty times a second, and a re-render per
   * frame would be the one thing that made this expensive.
   */
  const [gait, setGait] = useState({ phase: null, rate: 0, facingLeft: false });

  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const targetRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  const reduced = prefersReducedMotion();
  const mode = live.mode || 'hidden';
  const anchor = live.anchor;

  /* ---- Walking ----------------------------------------------------------- */

  const engine = useMemo(() => {
    const self = {
      paint() {
        const b = bodyRef.current;
        if (rootRef.current && b) rootRef.current.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      },
      /** Commit only what a person could notice, so most frames are free. */
      commit(body) {
        const phase = motionState(body);
        // Quantised: a gait that changed by a hundredth is not a new gait.
        const rate = Math.round(gaitRate(body) * 8) / 8;
        setGait((prev) =>
          prev.phase === phase && prev.rate === rate && prev.facingLeft === body.facingLeft
            ? prev
            : { phase, rate, facingLeft: body.facingLeft }
        );
      },
      loop(now) {
        const body = bodyRef.current;
        const target = targetRef.current;
        if (!body || !target) {
          rafRef.current = 0;
          return;
        }
        const dt = Math.min(0.05, (now - (lastRef.current || now)) / 1000);
        lastRef.current = now;

        const next = step(body, target, dt);
        bodyRef.current = next;
        self.paint();
        self.commit(next);

        if (!isTravelling(next)) {
          rafRef.current = 0;
          lastRef.current = 0;
          return;
        }
        rafRef.current = requestAnimationFrame(self.loop);
      }
    };
    return self;
  }, []);

  /** Send the body somewhere. It walks; it does not jump. */
  const travelTo = useCallback(
    (spot, { instant = false } = {}) => {
      if (!spot) return;
      targetRef.current = spot;
      if (!bodyRef.current) bodyRef.current = createBody(spot.x, spot.y, spot.facingLeft ?? false);

      if (instant || reduced) {
        bodyRef.current = teleport(bodyRef.current, spot);
        engine.paint();
        engine.commit(bodyRef.current);
        return;
      }
      if (!rafRef.current) {
        lastRef.current = 0;
        rafRef.current = requestAnimationFrame(engine.loop);
      }
    },
    [engine, reduced]
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ---- Where should it be, right now? ----------------------------------- */

  /**
   * One pass that answers everything: how big, where, and whether the
   * guidance it was running is still valid.
   */
  const resolve = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const phone = window.innerWidth < 768;

    // A modal owns the screen; the mascot sits above nothing and waits.
    if (mode === 'hidden' || overlayOpen()) {
      const s = phone ? 66 : 98;
      // Still report whether anywhere to dock exists, so the pass below can
      // decide to bring it on stage.
      return { size: s, spot: offStageSpot(s), gone: false, slot: chooseSlot(live.slot)?.slot?.name ?? null };
    }

    if (mode === 'active') {
      const roaming = phone ? 66 : 98;

      if (anchor) {
        const rect = rectOf(anchor);
        // The target went away underneath it. Say so; the caller cancels.
        if (!rect) return { size: roaming, spot: cornerSpot(roaming), gone: true, slot: null };
        return { size: roaming, spot: standBeside(rect, roaming), gone: false, targetRect: rect, slot: null };
      }

      /*
       * A reaction with nothing to point at belongs in the space the page
       * reserved for it, not in the corner. A game result card leaves a
       * mascot-shaped gap for the celebration; standing beside the window
       * instead left that gap empty and put the character somewhere the
       * layout knows nothing about.
       */
      const hit = chooseSlot(live.slot);
      if (hit) {
        const s = hit.slot.height || roaming;
        return { size: s, spot: spotInSlot(hit.rect, s), gone: false, slot: hit.slot.name };
      }
      return { size: roaming, spot: cornerSpot(roaming), gone: false, slot: null };
    }

    // Docked: stand in a slot at exactly the size that slot reserved, so the
    // character occupies the space the old inline mascot held.
    const hit = chooseSlot(live.slot);
    if (hit) {
      const s = hit.slot.height || (phone ? 56 : 72);
      return { size: s, spot: spotInSlot(hit.rect, s), gone: false, slot: hit.slot.name };
    }
    const s = phone ? 56 : 72;
    return { size: s, spot: cornerSpot(s), gone: false, slot: null };
  }, [mode, anchor, live.slot]);

  // Start off stage, so the first appearance is an entrance.
  useLayoutEffect(() => {
    if (bodyRef.current) return;
    const start = offStageSpot(98);
    bodyRef.current = createBody(start.x, start.y, false);
    engine.paint();
  }, [engine]);

  /**
   * The single measurement pass. Scroll, resize, a slot appearing, a route
   * change and a new instruction all funnel through here, rAF-throttled, so
   * however much is happening the page is measured once a frame.
   */
  // Which slot it is currently standing in, so scrolling tracks the card
  // exactly instead of the character swimming along behind it.
  const dockedInRef = useRef(null);
  // Which slot a reaction is currently playing in, so the reaction can end
  // when the panel it belonged to does.
  const reactingInRef = useRef(null);
  // When a slot was last on screen, and the pending re-check.
  const slotSeenRef = useRef(0);
  const graceRef = useRef(null);

  useEffect(() => () => clearTimeout(graceRef.current), []);

  const settle = useCallback(() => {
    const next = resolve();
    if (!next) return;
    setSmall(window.innerWidth < 768);
    setSize(next.size);

    /*
     * The two automatic transitions. A page that declares a slot is a reason
     * for the mascot to be present, so it comes on stage; a page with none is
     * not, so it leaves. Both are skipped while it is busy, so guidance is
     * never interrupted by the page it is guiding on.
     */
    const change = autoMode({
      mode,
      busy: !!anchor || !!live.message,
      hasSlot: !!next.slot,
      overlay: overlayOpen()
    });
    if (next.slot) slotSeenRef.current = Date.now();

    /*
     * A reaction belongs to the moment that caused it, and that moment ends
     * with the panel it happened in. Clearing a level celebrates in the result
     * card; pressing Next level replaces that card with the briefing, which
     * asks for a quite different pose. Without this the mascot carried its
     * confetti into the instructions and stood there cheering at nothing.
     */
    if (mode === 'active' && !anchor) {
      if (reactingInRef.current && next.slot !== reactingInRef.current) {
        reactingInRef.current = null;
        mascot.dock();
        return;
      }
      reactingInRef.current = next.slot;
    } else if (mode !== 'active') {
      reactingInRef.current = null;
    }

    if (change === 'dock') {
      mascot.dock();
      return;
    }
    if (change === 'hide') {
      /*
       * Moving between Career Path tabs unregisters the old page's slots a
       * frame or two before the new page's appear. Leaving the instant they
       * vanish means walking off stage and straight back on, which is the
       * dash across the screen a student actually notices. Wait long enough
       * to be sure the new page really has no place for it.
       */
      if (Date.now() - slotSeenRef.current < HIDE_GRACE_MS) {
        clearTimeout(graceRef.current);
        graceRef.current = setTimeout(() => setRecheck((n) => n + 1), HIDE_GRACE_MS);
        return;
      }
      mascot.hide();
      return;
    }
    // Turn the head toward whatever it has been sent to, before it gets there.
    if (next.targetRect && bodyRef.current) {
      const middle = next.targetRect.left + next.targetRect.width / 2;
      const delta = middle - bodyRef.current.x;
      setLook(Math.abs(delta) < 24 ? 0 : Math.sign(delta));
    } else {
      setLook(0);
    }

    if (next.gone) {
      // Graceful cancellation: abandon the script and dock, rather than point
      // at an element that no longer exists.
      mascot.cancelGuide();
      mascot.dock();
      return;
    }
    /*
     * The character walks in exactly one situation: it has been sent to point
     * at something. Everything else places it instantly.
     *
     * Docking, changing pages, following a card as it scrolls, and leaving are
     * all placement, not journeys. Animating them meant that switching Career
     * Path tabs sent the mascot flying across the screen, which is movement
     * nobody asked for and nobody could read.
     */
    const walkThere = mode === 'active' && !!anchor;
    dockedInRef.current = mode === 'docked' ? next.slot : null;
    travelTo(next.spot, { instant: !walkThere });
  }, [resolve, travelTo, mode, anchor, live.message]);

  useEffect(() => {
    let queued = false;
    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        settle();
      });
    };
    request();
    window.addEventListener('scroll', request, true);
    window.addEventListener('resize', request);
    return () => {
      window.removeEventListener('scroll', request, true);
      window.removeEventListener('resize', request);
    };
  }, [settle]);

  // A new instruction, or a slot appearing, re-measures a frame later so the
  // page it applies to has been laid out.
  useEffect(() => {
    const id = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(id);
  }, [live.seq, slotVersion, recheck, settle]);

  /* ---- Costing nothing when unwatched ----------------------------------- */

  useEffect(() => {
    const onVis = () => {
      const hidden = document.hidden;
      setPaused(hidden);
      if (hidden) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      } else if (targetRef.current && bodyRef.current) {
        // Land the journey the student never saw rather than resuming it.
        bodyRef.current = teleport(bodyRef.current, targetRef.current);
        engine.paint();
        engine.commit(bodyRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [engine]);

  /* ---- The page talks to it --------------------------------------------- */

  useEffect(() => installBridge(), []);

  // Anything marked data-mascot-tip explains itself when pointed at.
  useEffect(() => {
    if (small) return undefined;
    let timer = null;
    const over = (e) => {
      const el = e.target.closest?.('[data-mascot-tip]');
      if (!el) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        mascot.goTo(el.dataset.mascotAnchor || null, {
          state: 'pointing',
          message: el.dataset.mascotTip,
          ms: 6000
        });
      }, 420);
    };
    const out = () => clearTimeout(timer);
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, [small]);

  /* ---- Rendering --------------------------------------------------------- */

  const docked = mode === 'docked';
  const offStage = mode === 'hidden';
  const walking = gait.phase === 'walking';
  const facingLeft = gait.facingLeft;

  // While docked the slot decides what the character is doing; while active
  // the instruction does.
  const slotHit = docked ? chooseSlot(live.slot) : null;
  const shownState = docked ? slotHit?.slot?.state || 'idle' : live.state;
  const base = STATES[isState(shownState) ? shownState : 'idle'];
  const pose = walking ? 'walk' : docked ? base.pose : live.pose || base.pose;
  const body = walking ? 'mc-gait' : docked ? base.body : live.body || base.body;

  // Speech belongs to guidance. A docked mascot is quiet.
  const message = docked || offStage ? null : live.message || live.lastMessage;
  const bubbleOut = !live.message && !!live.lastMessage;
  const side = bubbleSide(facingLeft);

  return (
    <div
      ref={rootRef}
      // The only mascot instance in the document. The attribute is what the
      // duplicate test counts.
      data-mascot-instance=""
      className={`mc-actor ${paused || offStage ? 'mc-paused' : ''}`}
      aria-live="polite"
      aria-hidden={offStage}
    >
      <div className="relative" style={{ transform: 'translate(-50%, -100%)' }}>
        {message && (
          <div
            className={`mc-hit absolute bottom-full mb-2 w-max max-w-[16rem] sm:max-w-xs ${
              side === 'right' ? 'right-1/2 translate-x-[15%]' : 'left-1/2 -translate-x-[15%]'
            } ${bubbleOut ? 'mcb-out' : 'mcb-in'}`}
          >
            <div className="rounded-2xl border border-journey-100 bg-surface px-3.5 py-2.5 shadow-card">
              <p className="text-xs leading-relaxed font-semibold text-ink-800">{message}</p>
              {live.cta?.label && (
                <button
                  type="button"
                  onClick={() => {
                    const el = anchor ? document.querySelector(`[data-mascot="${live.cta.anchor || anchor}"]`) : null;
                    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
                    live.cta.onPress?.();
                    mascot.dock();
                  }}
                  className="fp-press mt-2 inline-flex items-center gap-1.5 rounded-lg bg-journey-600 px-2.5 py-1.5 text-[0.68rem] font-black text-white"
                >
                  {live.cta.label}
                </button>
              )}
            </div>
            <span
              aria-hidden
              className={`absolute -bottom-1.5 h-3 w-3 rotate-45 border-r border-b border-journey-100 bg-surface ${
                side === 'right' ? 'right-[18%]' : 'left-[18%]'
              }`}
            />
          </div>
        )}

        <span
          aria-hidden
          className="mc-ground absolute bottom-0 left-1/2 rounded-[50%] bg-journey-900/25 blur-[3px]"
          style={{ width: size * 0.5, height: size * 0.09 }}
        />

        <span className="mc-look block">
          <span className="mc-beat block">
            <button
              type="button"
              onClick={() => !walking && !docked && mascot.react('greeting', { ms: 3600 })}
              aria-label="Your CareerPath guide"
              tabIndex={offStage ? -1 : 0}
              className="mc-hit block cursor-pointer border-0 bg-transparent p-0"
            >
              <MascotRenderer
                state={shownState}
                pose={pose}
                motion={body}
                height={size}
                flip={facingLeft}
                talking={!!message}
                paused={paused || offStage}
                /* The rig plays the walk at the speed the body is really
                   travelling, and turns its head toward what it was sent to. */
                speed={gait.rate}
                look={look}
              />
            </button>
          </span>
        </span>
      </div>
    </div>
  );
}
