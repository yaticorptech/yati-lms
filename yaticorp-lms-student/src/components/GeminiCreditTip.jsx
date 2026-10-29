import { useEffect, useId, useRef, useState } from 'react';
import { Info, Sparkles } from 'lucide-react';

// The note's own rhythm: it shows itself on a timer, not only when asked.
const FIRST_DELAY = [800, 2400];  // ms before the first appearance (random in this range, so badges on one page stagger)
const SHOW_FOR = 3200;            // ms the note stays out
const EVERY = 11000;              // ms between appearances
const SLIDE = 450;                // ms of each slide

/**
 * A small "i" beside anything that calls Gemini. Every few seconds a highlighted note grows out
 * of it — Gemini AI credits are used here — holds, and draws back into the icon; hovering,
 * focusing or tapping the icon brings it out and keeps it out. With the student's own key
 * (Profile → AI key) those are their credits, so they see it before they press.
 *
 * `side` picks which way the note opens ('right' by default, 'left' near a right edge).
 */
export default function GeminiCreditTip({ side = 'right', className = '', label = 'Gemini AI credits are used here' }) {
  // hidden → in (grows out of the icon) → out (draws back into it) → hidden
  const [phase, setPhase] = useState('hidden');
  const [held, setHeld] = useState(false);   // hovered, focused or tapped: stays in
  const id = useId();
  const ref = useRef(null);
  const reduced = useRef(typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  // The timer: in, hold, out, rest — paused while the student holds it open or the tab is hidden.
  useEffect(() => {
    if (held) { setPhase('in'); return undefined; }
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const cycle = (wait) => at(wait, () => {
      if (document.hidden) { cycle(EVERY); return; }
      setPhase('in');
      at(SHOW_FOR, () => {
        setPhase('out');
        at(SLIDE, () => { setPhase('hidden'); cycle(EVERY); });
      });
    });
    setPhase((p) => (p === 'in' ? 'out' : p));
    at(SLIDE, () => setPhase((p) => (p === 'out' ? 'hidden' : p)));
    cycle(FIRST_DELAY[0] + Math.random() * (FIRST_DELAY[1] - FIRST_DELAY[0]));
    return () => timers.forEach(clearTimeout);
  }, [held]);

  // A tap holds it on touch screens; a tap anywhere else lets it go.
  useEffect(() => {
    if (!held) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setHeld(false); };
    const esc = (e) => { if (e.key === 'Escape') setHeld(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [held]);

  const open = phase === 'in';
  const right = side !== 'left';
  // Grows out of the icon and shrinks back into it: unrolled from the icon's edge (clip), drawn
  // towards it as it goes. Going out is the way it came in, reversed.
  const motion = reduced.current
    ? (open ? 'opacity-100' : 'opacity-0')
    : open
      ? 'translate-x-0 scale-100 opacity-100 [clip-path:inset(0_0_0_0_round_9999px)]'
      : `${right ? '-translate-x-2 [clip-path:inset(0_100%_0_0_round_9999px)]' : 'translate-x-2 [clip-path:inset(0_0_0_100%_round_9999px)]'} scale-90 opacity-0`;

  return (
    <span ref={ref} className={`relative inline-flex shrink-0 items-center align-middle ${className}`}
      onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHeld((h) => !h); }}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          open ? 'scale-110 bg-amber-400 text-amber-950 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-200'}`}
      >
        <Info className="h-3 w-3" strokeWidth={2.8} />
      </button>
      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={`pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 ${right ? 'left-full ml-1.5' : 'right-full mr-1.5'}`}
      >
        <span
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-3 py-1 text-[11px] font-black text-amber-950 shadow-[0_8px_22px_-8px_rgba(217,119,6,0.7)] ring-1 ring-amber-200 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${right ? 'origin-left' : 'origin-right'} ${motion}`}
          style={{ transitionDuration: `${SLIDE}ms` }}
        >
          <Sparkles className="h-3 w-3" strokeWidth={2.6} />
          {label}
        </span>
      </span>
    </span>
  );
}
