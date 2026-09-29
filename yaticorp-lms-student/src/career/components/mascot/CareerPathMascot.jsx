import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MascotStage from './MascotStage';
import mascot from './mascotBus';
import { findTarget, watchTarget } from './mascotTargets';
import { guideDone, markGuideDone } from './mascotMemory';
import { AuthContext } from '../../context/AuthContext';
import { pageFor, stepsFor } from './careerPathPages';
import './mascot.css';

/**
 * 🧭 The Career Path companion: the one thing that decides whether the
 * character is here, what it stands beside, and when it goes.
 *
 * Mounted once, by CareerShell. That placement is the whole answer to "the
 * mascot must exist only inside Career Path": leaving the section unmounts
 * this component, which unmounts the stage, so there is no character to hide
 * anywhere else and no route list to keep in step with the router.
 *
 * Everything it does hangs off one question — is the thing this page is
 * about actually on the screen? — because that is the only honest trigger
 * available:
 *
 *   it is        appear beside it, point, and stay there saying so
 *   it is not    fade out; a guide pointing at something nobody can see is
 *                just a mascot in the way
 *
 * Scroll position is deliberately NOT what drives this. A student on a short
 * page may never scroll at all and a long page may hide the target three
 * screens down; the element's own box answers both without a threshold that
 * has to be tuned per page. It also handles the case a scroll offset cannot:
 * a target that has not loaded yet simply arrives, and the companion sets
 * off when it does.
 *
 * Poses, placement and speech are somebody else's job already; this
 * file deliberately contains none of them.
 */

/**
 * How much of the target has to be on screen, in pixels of clearance.
 *
 * Two numbers, not one. Leaving needs the target almost gone and returning
 * needs it properly visible, so a student resting at the boundary does not
 * get a character flickering in and out of the frame.
 */
const LEAVE_PAD = 24;
const RETURN_PAD = 120;

/** Settling time before acting on a change, so a flick of the wheel is not a decision. */
const VIEW_SETTLE_MS = 160;

/** How long a win is celebrated, and how long sympathy lasts before a nudge. */

export default function CareerPathMascot() {
  const { pathname } = useLocation();
  const page = pageFor(pathname);
  const target = page?.show?.at || null;
  const { user } = useContext(AuthContext);
  const userId = user?._id || user?.id || null;

  /*
   * Whether this page's guidance has already been shown and acted on. It
   * plays until the student clicks the element it points at, or taps the
   * character away, and then not again on this page — see mascotMemory.js.
   * `doneVersion` is bumped when that happens so the answer is re-read.
   */
  const [doneVersion, setDoneVersion] = useState(0);
  const done = useMemo(
    () => !page?.show || guideDone(userId, page.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, userId, doneVersion]
  );

  /*
   * Whether this page's target is on screen — stamped with the page it was
   * measured on. Without that stamp a page change would be read against the
   * previous page's answer for one render, which is long enough to send the
   * companion off to a target that is no longer there.
   */
  const [view, setView] = useState({ key: null, visible: false });
  const inView = !!page && view.key === page.key && view.visible;

  /* ---- Watching the target ----------------------------------------------
     watchTarget re-resolves the element by name on every scroll, resize and
     DOM change, rAF-throttled onto a single measurement pass, and reports
     null the moment it is removed. Re-resolving rather than holding a node
     is what makes this survive the re-renders that replace a card with an
     identical one. */
  useEffect(() => {
    // No target to watch: `inView` is derived against the current page's
    // key, so a page with nothing to point at is already reported as not
    // visible without having to write that down. A page already shown
    // around is not watched either.
    if (!page || !target || done) return undefined;

    let settle = null;
    const stop = watchTarget(target, (rect) => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        setView((prev) => {
          const was = prev.key === page.key && prev.visible;
          const pad = was ? LEAVE_PAD : RETURN_PAD;
          const visible = !!rect && rect.bottom > pad && rect.top < window.innerHeight - pad;
          return was === visible && prev.key === page.key ? prev : { key: page.key, visible };
        });
      }, VIEW_SETTLE_MS);
    });

    return () => {
      clearTimeout(settle);
      stop();
    };
  }, [page, target, done]);

  /* ---- Going, and going away -------------------------------------------- */

  const runTour = useCallback(() => {
    /*
     * A page with nothing to point at has no tour, including when one is
     * asked for. `mascot:ask` below is dispatched by the sidebar card from
     * every page in the app, and the runner calls enter() before it looks at
     * the steps it was given — so handing it an empty sequence summons the
     * character to stand on a page that deliberately has no line for it.
     */
    if (!page?.show) return;
    mascot.guide(stepsFor(page), {
      /*
       * The sequence ends beside the target rather than tidying itself
       * away. What clears it is this component and nothing else: the
       * student acting on the target, the target leaving the screen, or
       * the page changing.
       */
      stay: true,
      // MascotSignals holds its situational briefing until this fires, so
      // the page's own line is never spoken over.
      onEnd: () => window.dispatchEvent(new CustomEvent('mascot:tour-end'))
    });
  }, [page]);

  const guidedFor = useRef(null);

  /*
   * The student has done the thing, or waved the character off: remember
   * it, and send the character away for good on this page. Everything that
   * could bring it back — a reaction to the task starting, the quiz ending,
   * the Overview briefing — is refused while it is away (see play() in
   * mascotBus.js), so from here the page is the student's alone.
   */
  const finish = useCallback(() => {
    if (!page) return;
    markGuideDone(userId, page.key);
    guidedFor.current = null;
    mascot.cancelGuide();
    mascot.leave();
    setDoneVersion((v) => v + 1);
  }, [page, userId]);

  useEffect(() => {
    if (!page) return;
    if (inView && !done) {
      // Once per arrival at a target, not once per scroll event.
      if (guidedFor.current === page.key) return;
      guidedFor.current = page.key;
      runTour();
    } else if (guidedFor.current) {
      /*
       * Scrolled past, or the element has gone. leave() is explicit rather
       * than a side effect of having nowhere to stand — see `suppressed` in
       * mascotBus.js — so the character fades out where it stood and stays
       * gone until the target is worth pointing at again.
       */
      guidedFor.current = null;
      mascot.cancelGuide();
      mascot.leave();
    }
  }, [page, inView, done, runTour]);

  /* While the character is pointing at the target, a click on that target
     is the moment the guidance was for. The listener is on the document, in
     the capture phase, so it survives the target being re-rendered and runs
     even if the click is stopped further down. */
  useEffect(() => {
    if (!page || !target || done || !inView) return undefined;
    const onClick = (e) => {
      const el = findTarget(target);
      if (el && (e.target === el || el.contains(e.target))) finish();
    };
    const onHushed = () => finish();
    document.addEventListener('click', onClick, true);
    window.addEventListener('mascot:hushed', onHushed);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('mascot:hushed', onHushed);
    };
  }, [page, target, done, inView, finish]);

  /* A page already shown around: whatever the character was doing on the
     way in, it is not wanted here. */
  useEffect(() => {
    if (page && done) {
      mascot.cancelGuide();
      mascot.leave();
    }
  }, [page, done]);

  /* The sidebar progress card dispatches this when its mascot is tapped,
     and has done for as long as it has existed; this is what listens. An
     explicit request plays the tour even on a page already shown around. */
  useEffect(() => {
    window.addEventListener('mascot:ask', runTour);
    return () => window.removeEventListener('mascot:ask', runTour);
  }, [runTour]);

  /* Leaving Career Path. The stage unmounts with this component, so this is
     only about leaving the store in a state the next visit can start from. */
  useEffect(
    () => () => {
      mascot.cancelGuide();
      mascot.leave();
    },
    []
  );

  if (!page) return null;

  /*
   * Only the stage. There is deliberately nowhere for the companion to
   * idle: no corner slot, no sidebar dock, nothing it can sit in when it
   * has nothing to say. It exists exactly while this page has an element
   * worth pointing at and that element is on screen, and otherwise it does
   * not exist at all — which is the whole of "no permanent floating
   * mascot", enforced by there being no place to float.
   */
  return <MascotStage />;
}
