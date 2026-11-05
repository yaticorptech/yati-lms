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
 * `side` picks which way the note opens ('right' by default, 'left' near a right edge). When it
 * opens it checks the room it has (2026-11-02): no room on that side (a phone), it opens below
 * the icon instead, so it never runs off the screen or covers the button beside it.
 */
const NOTE_ROOM = 240;            // px the note needs beside the icon
export default function GeminiCreditTip({ side = 'right', className = '', label = 'Gemini AI credits are used here' }) {
  // hidden → in (grows out of the icon) → out (draws back into it) → hidden
  const [phase, setPhase] = useState('hidden');
  const [held, setHeld] = useState(false);   // hovered, focused or tapped: stays in
  const id = useId();
  const ref = useRef(null);
  const [reduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  // Where it opens: the side asked for if the note fits there, else below.
  // Worked out each time it is about to open (a hover, a tap, its timer).
  const [place, setPlace] = useState(side === 'left' ? 'left' : 'right');
  // Below: as wide as the screen allows (up to 18rem), slid sideways so it stays on screen, and
  // free to wrap — a long note ("…used to read your resume") ran off the left edge (2026-11-02).
  const [belowBox, setBelowBox] = useState({ left: 0, width: 0 });
  const placeNow = () => {
    if (!ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const width = window.innerWidth || document.documentElement.clientWidth;
    const fitsRight = box.right + NOTE_ROOM <= width;
    const fitsLeft = box.left - NOTE_ROOM >= 0;
    // Not the other side: that is usually where the thing it describes is, and it would cover it.
    const next = side === 'left' ? (fitsLeft ? 'left' : 'below') : (fitsRight ? 'right' : 'below');
    if (next === 'below') {
      const noteWidth = Math.min(width - 24, 288);
      const leftOnScreen = Math.min(Math.max(12, box.right - noteWidth), width - noteWidth - 12);
      setBelowBox({ left: Math.round(leftOnScreen - box.left), width: noteWidth });
    }
    setPlace(next);
  };
  const hold = () => { placeNow(); setHeld(true); };

  // The timer: in, hold, out, rest — paused while the student holds it open or the tab is hidden.
  useEffect(() => {
    if (held) return undefined;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const cycle = (wait) => at(wait, () => {
      if (document.hidden) { cycle(EVERY); return; }
      placeNow();
      setPhase('in');
      at(SHOW_FOR, () => {
        setPhase('out');
        at(SLIDE, () => { setPhase('hidden'); cycle(EVERY); });
      });
    });
    at(0, () => setPhase((p) => (p === 'in' ? 'out' : p)));
    at(SLIDE, () => setPhase((p) => (p === 'out' ? 'hidden' : p)));
    cycle(FIRST_DELAY[0] + Math.random() * (FIRST_DELAY[1] - FIRST_DELAY[0]));
    return () => timers.forEach(clearTimeout);
  }, [held]); // eslint-disable-line react-hooks/exhaustive-deps

  // A tap holds it on touch screens; a tap anywhere else lets it go.
  useEffect(() => {
    if (!held) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setHeld(false); };
    const esc = (e) => { if (e.key === 'Escape') setHeld(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [held]);

  const open = held || phase === 'in';
  const right = place === 'right';
  const below = place === 'below';
  // Grows out of the icon and shrinks back into it: unrolled from the icon's edge (clip), drawn
  // towards it as it goes. Going out is the way it came in, reversed.
  const motion = reduced
    ? (open ? 'opacity-100' : 'opacity-0')
    : open
      ? 'animate-pop-in translate-x-0 translate-y-0 scale-100 opacity-100 [clip-path:inset(0_0_0_0_round_9999px)]'
      : below
        ? '-translate-y-1 scale-90 opacity-0'
        : `${right ? '-translate-x-2 [clip-path:inset(0_100%_0_0_round_9999px)]' : 'translate-x-2 [clip-path:inset(0_0_0_100%_round_9999px)]'} scale-90 opacity-0`;

  return (
    <span ref={ref} className={`relative inline-flex shrink-0 items-center align-middle ${className}`}
      onMouseEnter={hold} onMouseLeave={() => setHeld(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); hold(); }}
        onFocus={hold}
        onBlur={() => setHeld(false)}
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          open ? 'scale-110 bg-amber-400 text-amber-950 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-200'}`}
      >
        <Info className="h-3 w-3" strokeWidth={2.8} />
      </button>
      {/* What the icon means, for a screen reader, always there. */}
      <span id={id} className="sr-only">{label}</span>
      {/* The note itself only while it shows (2026-11-02): kept on the page hidden, it stuck out past
          the icon and could make a phone page slide sideways. */}
      {(held || phase !== 'hidden') && <span
        role="tooltip"
        aria-hidden="true"
        className={`pointer-events-none absolute z-50 ${below ? 'top-full mt-2 flex justify-end' : `top-1/2 -translate-y-1/2 ${right ? 'left-full ml-1.5' : 'right-full mr-1.5'}`}`}
        style={below ? { left: belowBox.left, width: belowBox.width } : undefined}
      >
        <span
          className={`flex items-center gap-1.5 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-3 py-1 text-[11px] font-black text-amber-950 shadow-[0_8px_22px_-8px_rgba(217,119,6,0.7)] ring-1 ring-amber-200 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${below ? 'max-w-full rounded-2xl py-1.5 leading-snug origin-top-right' : `whitespace-nowrap rounded-full ${right ? 'origin-left' : 'origin-right'}`} ${motion}`}
          style={{ transitionDuration: `${SLIDE}ms` }}
        >
          <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2.6} />
          {label}
        </span>
      </span>}
    </span>
  );
}
