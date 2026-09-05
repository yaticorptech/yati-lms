import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Mascot from './Mascot';
import { occupancy, contentBounds, overlaps } from './placement';
import MascotPet from './MascotPet';
import { AuthContext } from '../../context/AuthContext';
import { GUIDE, CHEERS } from './guideSteps';

/**
 * 🤖 The interactive CareerPath guide, on every CareerPath page.
 *
 *   TOUR    first visit to a page: the mascot glides beside each important
 *           element, rings it, and says what to click. Next / Skip / Done.
 *           Remembered per page, so it plays once.
 *   REST    afterwards it floats near the bottom-left, offers a tip now and
 *           then, and opens a help menu when clicked.
 *   CHEER   when a task is completed it bounces and says "Great job!".
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

const GAP = 14;
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
  const navigate = useNavigate();
  const small = useIsSmall();
  const size = small ? 72 : 116;
  const bubbleW = small ? Math.min(260, window.innerWidth - 32) : 280;

  const routeKey = Object.keys(GUIDE).find((k) => (k === '/career' ? pathname === k : pathname.startsWith(k)));
  const steps = useMemo(() => (routeKey ? GUIDE[routeKey] : []), [routeKey]);

  const [mode, setMode] = useState('rest'); // 'tour' | 'rest' | 'hidden'
  const [step, setStep] = useState(0);
  const [box, setBox] = useState(null);
  const [menu, setMenu] = useState(false);
  const [cheer, setCheer] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const stepRef = useRef(0);
  const pendingTour = useRef(false);

  // Arriving at a page: tour if not seen yet (or if the help menu asked).
  useEffect(() => {
    setMenu(false);
    if (!routeKey || steps.length === 0) {
      setMode('rest');
      return;
    }
    const seen = readSeen();
    setStep(0);
    stepRef.current = 0;
    setMode(!seen[routeKey] || pendingTour.current ? 'tour' : 'rest');
    pendingTour.current = false;
  }, [routeKey, steps]);

  // Positive feedback only when XP actually went up — a task, quiz or
  // activity was finished. (The generic "progress changed" event also fires
  // on page changes, which is why it is not used here.)
  const { user } = useContext(AuthContext);
  const xp = Number(user?.xp) || 0;
  const lastXp = useRef(null);
  useEffect(() => {
    if (lastXp.current === null) {
      lastXp.current = xp;
      return undefined;
    }
    if (xp > lastXp.current) {
      setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
      const t = setTimeout(() => setCheer(null), 4500);
      lastXp.current = xp;
      return () => clearTimeout(t);
    }
    lastXp.current = xp;
    return undefined;
  }, [xp]);

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
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  const finish = () => {
    if (routeKey) markSeen(routeKey);
    setLeaving(true);
    setTimeout(() => {
      setBox(null);
      setLeaving(false);
      setMode('rest');
    }, 380);
  };

  const startTour = () => {
    setMenu(false);
    if (steps.length === 0) return;
    setStep(0);
    stepRef.current = 0;
    setMode('tour');
  };

  const go = (option) => {
    setMenu(false);
    if (option.tour) pendingTour.current = true;
    navigate(option.to);
  };

  const next = () => {
    stepRef.current = step + 1;
    setStep((s) => s + 1);
  };

  if (mode === 'hidden') return null;

  /* ---------------- Tour ---------------- */
  if (mode === 'tour' && current && step < steps.length) {
    const vh = window.innerHeight;
    let style;
    let stacked = false; // bubble under the mascot (phones / no room beside)

    if (box && !small) {
      // The block is the mascot with the bubble beside it. Try it on every
      // side of the highlighted element at a few alignments, inside the
      // content column, and take the spot that hides the least of the page:
      // a tour that parks itself over the words it is describing is no help.
      const mascotW = Math.round(size * 1.2 * 0.86);
      const mascotH = Math.round(size * 1.2);
      const blockW = mascotW + 8 + bubbleW;
      const blockH = Math.max(mascotH, 150);
      const c = contentBounds(blockW);
      const target = { left: box.left, right: box.left + box.width, top: box.top, bottom: box.top + box.height };
      const clampXY = (x, y) => ({
        x: Math.max(c.left, Math.min(c.right - blockW, x)),
        y: Math.max(72, Math.min(vh - blockH - 16, y))
      });
      const cy = box.top + box.height / 2 - blockH / 2;
      const cx = box.left + box.width / 2 - blockW / 2;
      const candidates = [
        [target.right + GAP, cy],
        [target.right + GAP, box.top],
        [target.right + GAP, target.bottom - blockH],
        [target.left - blockW - GAP, cy],
        [target.left - blockW - GAP, box.top],
        [target.left - blockW - GAP, target.bottom - blockH],
        [box.left, target.bottom + GAP],
        [target.right - blockW, target.bottom + GAP],
        [cx, target.bottom + GAP],
        [box.left, box.top - blockH - GAP],
        [target.right - blockW, box.top - blockH - GAP],
        [cx, box.top - blockH - GAP]
      ].map(([x, y]) => clampXY(x, y));
      let best = candidates[0];
      let bestScore = Infinity;
      candidates.forEach((p) => {
        const block = { left: p.x, right: p.x + blockW, top: p.y, bottom: p.y + blockH };
        if (overlaps(block, target, 4)) return;
        const mascot = { left: p.x + mascotW * 0.15, right: p.x + mascotW * 0.85, top: p.y + mascotH * 0.1, bottom: p.y + mascotH };
        const bubble = { left: p.x + mascotW + 8, right: p.x + blockW, top: p.y + 8, bottom: p.y + 150 };
        const score = occupancy(mascot) + occupancy(bubble, 5, 4);
        if (score < bestScore - 0.02) {
          best = p;
          bestScore = score;
        }
      });
      style = { top: best.y, left: best.x };
    } else if (box && small) {
      stacked = true;
      const below = box.top + box.height + GAP;
      style = below + 220 < vh ? { top: below, left: 12, right: 12 } : { bottom: 96, left: 12, right: 12 };
    } else {
      stacked = small;
      style = small ? { bottom: 96, left: 12, right: 12 } : { left: '50%', top: '28%', transform: 'translateX(-50%)' };
    }

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
          data-mascot
          className={`mc-glide fixed z-[70] ${stacked ? 'flex flex-col items-start gap-1' : 'flex items-start gap-2'} ${leaving ? 'mc-out' : ''}`}
          style={style}
          role="dialog"
          aria-label="CareerPath guide"
        >
          <Mascot pose={box ? 'guide' : 'hello'} height={size * 1.2} motion={box ? 'mc-nod' : 'mc-float'} className="mc-pop shrink-0" />

          <div
            key={step}
            className="mc-bubble relative mt-2 rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl"
            style={{ width: stacked ? 'auto' : bubbleW, maxWidth: 'calc(100vw - 24px)' }}
          >
            <span
              aria-hidden
              className={`absolute h-4 w-4 rotate-45 border-blue-100 bg-white ${
                stacked ? 'top-0 left-6 -translate-y-1/2 border-t border-l' : 'top-8 -left-2 border-b border-l'
              }`}
            />
            <p className="text-[0.68rem] font-black tracking-[0.14em] text-blue-600 uppercase">
              Step {step + 1} of {steps.length}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed font-semibold text-slate-800">{current.text}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={finish} className="text-xs font-bold text-slate-400 hover:text-slate-700">
                Skip
              </button>
              <button
                type="button"
                onClick={step + 1 >= steps.length ? finish : next}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-blue-500/30 transition-transform active:scale-95"
              >
                {step + 1 >= steps.length ? 'Got it!' : 'Next'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- Rest: the pet ---------------- */
  return (
    <MascotPet
      small={small}
      cheer={cheer}
      pathname={pathname}
      menu={menu}
      setMenu={setMenu}
      steps={steps}
      onStartTour={startTour}
      onGo={go}
      onHide={() => setMode('hidden')}
    />
  );
}
