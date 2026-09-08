import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from './Mascot';
import { contentBounds } from './placement';
import { GUIDE } from './guideSteps';

/**
 * 🤖 The CareerPath tour, on the pages that have one.
 *
 *   First visit to a page: the mascot sits in a bar docked along the bottom
 *   of the page, rings each important element in turn, and says what to
 *   click. Next / Skip / Done. Remembered per page, so it plays once. The bar
 *   never floats over the page: the page is given that much room underneath,
 *   so no words are ever covered. Between tours nothing is shown — the
 *   resting mascot that used to float in the corner, cheer and offer tips is
 *   gone; the seated one in the sidebar replays the page's tour on tap.
 *
 * Positions come from the real elements (`data-guide` attributes), measured
 * on the fly and again on scroll and resize, so the bubble follows what it
 * is talking about. On phones the mascot is smaller and the bubble is laid
 * out to fit the screen width.
 */
const SEEN_KEY = 'career.mascot.seen';
const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
};
const markSeen = (route) => {
  const seen = readSeen();
  seen[route] = true;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage unavailable: the tour simply plays again next time.
  }
};

const useIsSmall = () => {
  const [small, setSmall] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setSmall(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return small;
};

export default function MascotGuide() {
  const { pathname } = useLocation();
  const small = useIsSmall();
  const size = small ? 64 : 96;
  // The guide's dock along the bottom of the page. Measured, so the page can
  // be given exactly that much room underneath and nothing is ever hidden.
  const dockRef = useRef(null);
  const [dockH, setDockH] = useState(0);

  const routeKey = Object.keys(GUIDE).find((k) => (k === '/career' ? pathname === k : pathname.startsWith(k)));
  const steps = useMemo(() => (routeKey ? GUIDE[routeKey] : []), [routeKey]);

  const [mode, setMode] = useState('rest'); // 'tour' | 'rest'
  const [step, setStep] = useState(0);
  const [box, setBox] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const stepRef = useRef(0);

  // Arriving at a page: tour if not seen yet.
  useEffect(() => {
    if (!routeKey || steps.length === 0) {
      setMode('rest');
      return;
    }
    const seen = readSeen();
    setStep(0);
    stepRef.current = 0;
    setMode(!seen[routeKey] ? 'tour' : 'rest');
  }, [routeKey, steps]);

  // The seated mascot in the sidebar replays this page's tour on tap. On a
  // page without one, nothing happens.
  useEffect(() => {
    const ask = () => {
      if (steps.length === 0) return;
      setStep(0);
      stepRef.current = 0;
      setMode('tour');
    };
    window.addEventListener('mascot:ask', ask);
    return () => window.removeEventListener('mascot:ask', ask);
  }, [steps]);

  const current = mode === 'tour' ? steps[step] : null;

  // Find the step's element; skip steps whose element is not on the page.
  const locate = useCallback(() => {
    if (!current) return;
    if (!current.target) {
      setBox(null);
      return;
    }
    const el = document.querySelector(`[data-guide="${current.target}"]`);
    if (!el) {
      if (stepRef.current === step) {
        stepRef.current = step + 1;
        setStep((s) => Math.min(s + 1, steps.length));
      }
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [current, step, steps.length]);

  useEffect(() => {
    if (mode !== 'tour') return undefined;
    if (step >= steps.length) {
      finish();
      return undefined;
    }
    const el = current?.target && document.querySelector(`[data-guide="${current.target}"]`);
    if (el) {
      // Centre it in the part of the page the dock leaves visible.
      const main = document.querySelector('main');
      const r = el.getBoundingClientRect();
      const visibleH = window.innerHeight - dockH;
      const delta = r.top + r.height / 2 - visibleH / 2;
      if (main && main.scrollHeight > main.clientHeight) main.scrollBy({ top: delta, behavior: 'smooth' });
      else window.scrollBy({ top: delta, behavior: 'smooth' });
    }
    const t = setTimeout(locate, el ? 450 : 0);
    window.addEventListener('scroll', locate, true);
    window.addEventListener('resize', locate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', locate, true);
      window.removeEventListener('resize', locate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step, current, locate]);

  // The page keeps exactly the dock's height free at its foot while the
  // tour runs, so the student can always scroll whatever the bar sits over
  // up into view. Removed the moment the tour ends.
  useEffect(() => {
    const main = document.querySelector('main');
    if (mode !== 'tour' || !main) return undefined;
    const measure = () => setDockH(dockRef.current?.offsetHeight || 0);
    measure();
    const ro = 'ResizeObserver' in window && dockRef.current ? new ResizeObserver(measure) : null;
    ro?.observe(dockRef.current);
    return () => ro?.disconnect();
  }, [mode, step, small]);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;
    if (mode === 'tour' && dockH > 0) {
      main.style.paddingBottom = `${dockH + 16}px`;
      return () => {
        main.style.paddingBottom = '';
      };
    }
    return undefined;
  }, [mode, dockH]);

  const finish = () => {
    if (routeKey) markSeen(routeKey);
    setLeaving(true);
    setTimeout(() => {
      setBox(null);
      setLeaving(false);
      setMode('rest');
    }, 380);
  };

  const next = () => {
    stepRef.current = step + 1;
    setStep((s) => s + 1);
  };

  /* ---------------- Tour ---------------- */
  if (mode === 'tour' && current && step < steps.length) {
    // The dock spans the content column only, never the sidebar.
    const c = contentBounds();
    const last = step + 1 >= steps.length;

    return (
      <>
        {box && (
          <div
            aria-hidden
            className="mc-target pointer-events-none fixed z-[60] rounded-2xl ring-4 ring-blue-500/80"
            style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
          />
        )}

        <div
          ref={dockRef}
          data-mascot
          role="dialog"
          aria-label="CareerPath guide"
          className={`fixed bottom-0 z-[70] border-t border-blue-100 bg-white/95 shadow-[0_-14px_40px_-16px_rgba(15,23,42,0.35)] backdrop-blur ${
            leaving ? 'mc-out' : 'mc-bubble'
          }`}
          style={{ left: c.left - 8, right: window.innerWidth - c.right - 8 }}
        >
          <div className="mx-auto flex max-w-5xl items-end gap-3 px-4 pt-2 pb-3 sm:gap-5 sm:px-6">
            <Mascot
              pose={box ? 'guide' : 'hello'}
              height={size}
              motion={box ? 'mc-nod' : 'mc-float'}
              className="mc-pop shrink-0"
            />

            <div key={step} className="min-w-0 flex-1 pb-1">
              <p className="text-[0.66rem] font-black tracking-[0.14em] text-blue-600 uppercase">
                Step {step + 1} of {steps.length}
              </p>
              <p className="mt-1 text-sm leading-relaxed font-semibold text-slate-800 sm:text-[0.95rem]">
                {current.text}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 pb-1">
              <button
                type="button"
                onClick={finish}
                className="text-xs font-bold text-slate-400 transition-colors hover:text-slate-700"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={last ? finish : next}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-blue-500/30 transition-transform active:scale-95"
              >
                {last ? 'Got it!' : 'Next'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Between tours there is nothing to show.
  return null;
}
