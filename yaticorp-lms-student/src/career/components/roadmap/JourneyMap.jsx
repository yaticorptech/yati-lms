import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Lock, Sparkles, Clock3, ListChecks, Trophy, ChevronRight, MapPin, Flag, FlagTriangleRight, PartyPopper } from 'lucide-react';
import { phaseTitle, parseChoices } from '../../utils/roadmap';
import { paletteFor } from './palettes';

/**
 * The road, drawn as a road.
 *
 * A winding track runs down the middle of the page. Each phase is a coloured
 * platform on it, with its title on a card to one side — left, then right,
 * then left — so the whole journey reads as a path with places on it rather
 * than a list. Finished stretches of road are green, the stretch being walked
 * is violet and moving, and everything ahead is grey and locked. Pressing a
 * platform or its card opens the phase in front of the map, once its turn has
 * come: a locked one stays shut and says which phase to finish first.
 */

const ROW = 184; // height of one phase row
const ROW_SM = 156;
const START_H = 150; // the start platform's row
const END_H = 170; // the destination's row
const TRACK = 220; // width of the road column between the cards
const TRACK_SM = 76;
const SWAY = 74; // how far the road wanders off centre, alternating

const useWide = () => {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => window.matchMedia?.(query).matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
};

/**
 * A row that rises into place the first time it scrolls into view. A map this
 * tall used to animate every row on mount, so anything below the fold had
 * finished moving before it was ever seen.
 */
function Reveal({ children, delay = 0, className = '', style }) {
  const ref = useRef(null);
  // Without the observer there is nothing to wait for, so start visible.
  const [inView, setInView] = useState(() => !('IntersectionObserver' in window));
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`fp-reveal ${inView ? 'is-in' : ''} ${className}`}
      style={{ ...style, transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/**
 * Where an element sits inside `box`, from layout offsets rather than the
 * screen: the rows slide in as they are revealed, and a measurement taken
 * mid-slide would bend the road to where a platform was, not where it stays.
 */
const offsetIn = (el, box) => {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== box) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return n === box ? { x, y } : null;
};

/** A smooth S-curve between two points on the road. */
const bend = (a, b) => {
  const dy = (b.y - a.y) * 0.5;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
};

/**
 * The colour of a stretch of road: green once walked, the live stretch in
 * violet with its dashes on the move, and grey into anything still locked
 * (locked phases are black and white, asked 2026-10-15).
 */
const roadTone = (state) =>
  state === 'done'
    ? { road: 'stroke-emerald-200', line: 'stroke-emerald-500', flow: false }
    : state === 'current'
      ? { road: 'stroke-journey-200', line: 'stroke-journey-500', flow: true }
      : { road: 'stroke-slate-200', line: 'stroke-slate-400', flow: false };

function Platform({ palette, state, index, onClick, label, sway, lockedBy, here }) {
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const locked = state === 'upcoming';

  return (
    // Locked: black and white, and it does not rise under the pointer — it
    // cannot be opened (asked 2026-10-15). The grey is on this wrapper, not
    // the button, whose hover filter would paint the colour back in.
    <span data-road-anchor className={`flex h-[76px] w-[76px] origin-bottom items-end justify-center scale-[.62] md:h-auto md:w-auto md:scale-100 ${locked ? 'grayscale' : ''}`}>
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-disabled={locked || undefined}
      data-mascot-target={isCurrent ? 'current-roadmap-position' : undefined}
      // Loop, the site's mascot, tells the student "You are here" on this one
      // (RoadmapDisplay sends it over; `here` is what it says).
      data-explain={isCurrent ? 'roadmap-here' : undefined}
      data-explain-text={here}
      data-mascot-locked={locked ? lockedBy : undefined}
      data-mascot-prerequisite="current-roadmap-position"
      className={`group relative h-[116px] w-[120px] shrink-0 ${locked ? 'cursor-not-allowed' : 'fp-rm-platform'}`}
      style={{ transform: `translateX(${sway}px)` }}
    >
      <span className={`absolute inset-0 block ${locked ? '' : 'fp-platform'}`}>
      {/* A glow and a slow outgoing ring behind the platform being stood on:
          the one place on the map that has to be findable from across the
          room. */}
      {isCurrent && (
        <>
          <span aria-hidden className="fp-halo absolute inset-x-0 bottom-0 h-16 rounded-[50%] bg-journey-400/60 blur-xl" />
          <span aria-hidden className="fp-pulse-ring absolute bottom-1 left-1/2 h-14 w-[120px] rounded-[50%] border-[3px] border-journey-400" />
          <span aria-hidden className="fp-pulse-ring absolute bottom-1 left-1/2 h-14 w-[120px] rounded-[50%] border-[3px] border-journey-400" style={{ animationDelay: '1.1s' }} />
        </>
      )}
      {/* A pin bouncing over the platform being stood on — "you are here",
          readable before a word of the card is. */}
      {isCurrent && (
        <span aria-hidden className="animate-bounce absolute -top-8 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-journey-600 to-fuchsia-600 px-2.5 py-1 text-[0.6rem] font-black tracking-wider text-white uppercase shadow-lg shadow-journey-600/40">
          <MapPin className="h-3 w-3" />
          Here
        </span>
      )}
      {/* Sparkles on ground already covered. */}
      {isDone && (
        <>
          <span aria-hidden className="fp-twinkle absolute top-6 left-1 text-base">✨</span>
          <span aria-hidden className="fp-twinkle absolute top-2 right-8 text-xs" style={{ animationDelay: '-1.3s' }}>✨</span>
        </>
      )}
      {/* The platform: a thick disc — a darker rim for its side, a gradient
          top, a soft highlight — so it reads as something to stand on. */}
      <span aria-hidden className={`absolute bottom-0 left-1/2 h-12 w-[112px] -translate-x-1/2 rounded-[50%] ${palette.side} opacity-90`} />
      <span aria-hidden className={`absolute bottom-3 left-1/2 h-12 w-[112px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b shadow-lg ${palette.top} ${palette.glow}`} />
      <span aria-hidden className="absolute bottom-[26px] left-1/2 h-6 w-[76px] -translate-x-1/2 rounded-[50%] bg-white/35" />

      {/* What happens here, floating above the platform. */}
      <span
        className={`absolute bottom-10 left-1/2 flex h-[60px] w-[60px] -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl ring-2 ring-white/70 ${palette.top} ${palette.glow} ${
          locked ? '' : 'fp-bob-soft'
        }`}
        style={{ animationDelay: `${(index % 4) * -0.6}s` }}
        aria-hidden
      >
        {/* Locked phases keep their icon — the map should still look like a
            journey, not a row of padlocks — with a small lock in the corner
            saying it is out of reach for now. */}
        <palette.icon className="h-8 w-8 drop-shadow" strokeWidth={2.2} />
        {locked && (
          <span className="absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white shadow-md ring-2 ring-white">
            <Lock className="h-3 w-3" strokeWidth={2.6} />
          </span>
        )}
      </span>

      {/* Its number, or the tick once it is behind them. */}
      <span
        aria-hidden
        className={`absolute top-1 right-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white shadow-md ring-2 ring-white ${
          isDone ? 'fp-done-gradient' : isCurrent ? 'bg-gradient-to-br from-journey-500 to-indigo-600' : 'bg-slate-400'
        }`}
      >
        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : index + 1}
      </span>
      </span>
    </button>
    </span>
  );
}

function PhaseCard({ stage, index, state, palette, onClick, side, lockedBy, unlockAfter, nope }) {
  const title = phaseTitle(stage);
  const choices = parseChoices(title);
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const locked = state === 'upcoming';
  const isObject = typeof stage === 'object' && stage !== null;
  const stepCount = isObject ? stage.actionItems?.length || 0 : 0;
  const milestoneCount = isObject ? stage.milestones?.length || 0 : 0;

  // A locked phase stays shut (asked 2026-10-15: only a phase whose turn has
  // come opens). Pressed, its card gives a short shake and its tag says which
  // phase to finish first; `nope` changes on every press, so each one shakes.
  const ref = useRef(null);
  useEffect(() => {
    if (!nope || !ref.current?.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    ref.current.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }],
      { duration: 420, easing: 'ease-in-out' }
    );
  }, [nope]);
  const waitFor = `Finish phase ${unlockAfter} first`;

  const shell = isCurrent
    ? 'border-journey-300 bg-surface shadow-card-hover ring-2 ring-journey-200'
    : isDone
      ? 'border-emerald-200 bg-surface hover:border-emerald-300'
      : 'border-line-200/80 bg-surface hover:border-journey-200';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={locked ? `Phase ${index + 1}: ${choices ? choices.lead : title}. Locked. ${waitFor}.` : `Open phase ${index + 1}: ${choices ? choices.lead : title}`}
      aria-disabled={locked || undefined}
      data-mascot-look
      data-mascot-locked={locked ? lockedBy : undefined}
      data-mascot-prerequisite="current-roadmap-position"
      className={`group relative top-6 w-full max-w-[12.5rem] overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-card transition-all duration-300 md:top-0 md:max-w-md md:rounded-2xl md:p-5 ${
        locked ? 'cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-card-hover'
      } ${shell} ${
        isCurrent ? 'fp-rm-now' : ''
      } ${side === 'left' ? 'md:ml-auto' : 'md:mr-auto'}`}
    >
      {/* A wash of the platform's colour in one corner, and its colour down
          the leading edge — enough to tie the card to its platform across
          the road without turning six cards into six coloured boxes. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl transition-opacity duration-300 group-hover:opacity-50 ${palette.top} ${
          side === 'left' ? '-left-10' : '-right-10'
        } ${locked ? 'opacity-15' : 'opacity-30'}`}
      />
      <span
        aria-hidden
        className={`absolute inset-y-0 w-1 bg-gradient-to-b md:w-1.5 ${palette.stripe} ${side === 'left' ? 'right-0' : 'left-0'} ${
          locked ? 'opacity-40' : ''
        }`}
      />
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r md:h-1.5 ${palette.stripe} ${locked ? 'opacity-50' : ''}`} />

      <span className="flex items-start gap-2 md:gap-3">
        <span
          className={`mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-md md:flex ${palette.badge} ${
            locked ? 'opacity-70' : ''
          }`}
          aria-hidden
        >
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          {/* On a phone (asked 2026-10-15, "make it better"): which phase and
              where it stands, in one small line over the title. */}
          <span className="mb-0.5 flex items-center gap-1.5 md:hidden">
            <span className={`text-[0.58rem] font-black tracking-[0.12em] uppercase ${locked ? 'text-ink-400' : palette.text}`}>Phase {index + 1}</span>
            {isDone && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[0.56rem] font-black text-emerald-700 ring-1 ring-emerald-100 ring-inset">
                <Check className="h-2.5 w-2.5" strokeWidth={3} /> Done
              </span>
            )}
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-1.5 py-px text-[0.54rem] font-black tracking-wide text-white uppercase shadow-sm shadow-journey-600/30">
                <Sparkles className="h-2.5 w-2.5" /> You are here
              </span>
            )}
            {locked && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-100 px-1.5 py-px text-[0.56rem] font-black text-ink-500 ring-1 ring-line-200 ring-inset">
                <Lock className="h-2.5 w-2.5" strokeWidth={2.6} /> {nope ? waitFor : 'Locked'}
              </span>
            )}
          </span>
          {isCurrent && (
            <span className="mb-1.5 hidden items-center gap-1 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-2.5 py-0.5 text-[0.62rem] font-black tracking-wider text-white uppercase shadow-sm shadow-journey-600/30 md:inline-flex">
              <Sparkles className="h-3 w-3" />
              You are here
            </span>
          )}
          {/* Held to two lines on a phone. A stream name in brackets runs a
              title to four of them, which pushes the row's own facts off the
              bottom of the card and puts every row out of rhythm with its
              neighbours. The whole title is in the aria-label above and at
              the head of the dialog this opens, so nothing is lost. */}
          <span
            className={`line-clamp-2 text-[0.85rem] leading-snug font-black md:line-clamp-none md:text-base ${locked ? 'text-ink-600' : 'text-ink-900'}`}
          >
            {choices ? choices.lead : title}
          </span>

          {/* Only the facts that fit on a chip. What the phase is for waits
              inside, where there is room to say it properly. Not on a phone
              (asked 2026-10-15): the phase opens with them all. */}
          {isObject && (stage.duration || stepCount > 0 || milestoneCount > 0) && (
            <span className="mt-2.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-semibold text-ink-500 sidebar:flex">
              {stage.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5 text-ink-400" />
                  {stage.duration}
                </span>
              )}
              {stepCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3.5 w-3.5 text-ink-400" />
                  {stepCount} steps
                </span>
              )}
              {milestoneCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-ink-400" />
                  {milestoneCount} {milestoneCount === 1 ? 'milestone' : 'milestones'}
                </span>
              )}
            </span>
          )}
        </span>

        {/* On a phone, done and locked phases open from a round arrow beside
            the title instead of a pill under it: shorter, tidier cards. */}
        {!isCurrent && !locked && (
          <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full transition-transform group-hover:translate-x-0.5 md:hidden ${palette.soft} ${palette.text}`}>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.6} />
          </span>
        )}

        {/* Where it stands, in one glyph: a tick, a live ring, or a lock.
            The platform says the same on a phone, so it steps aside there. */}
        <span className="hidden shrink-0 md:block" aria-hidden>
          {isDone ? (
            <span className="fp-done-gradient flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm shadow-emerald-500/40">
              <Check className="h-4 w-4" strokeWidth={3.5} />
            </span>
          ) : isCurrent ? (
            <span className="fp-glow-violet flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-journey-500 bg-surface">
              <span className="fp-blink h-2.5 w-2.5 rounded-full bg-journey-500" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-line-300 bg-surface text-ink-400">
              <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          )}
        </span>
      </span>

      {locked ? (
        <span className="mt-3 hidden items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-black text-ink-500 md:inline-flex">
          <Lock className="h-3.5 w-3.5" />
          {waitFor}
        </span>
      ) : (
        <span className={`mt-3 hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-transform group-hover:translate-x-0.5 md:inline-flex ${palette.soft} ${palette.text}`}>
          {isCurrent ? 'See what to do' : 'Open'}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      )}
      {isCurrent && (
        <span className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-journey-600 to-indigo-600 py-1.5 text-[0.72rem] font-black text-white shadow-md shadow-journey-600/30 md:hidden">
          See what to do
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
        </span>
      )}
    </button>
  );
}

export default function JourneyMap({ phases, states, startedFrom, goal, percent, onOpen }) {
  const wide = useWide();
  const row = wide ? ROW : ROW_SM;
  const track = wide ? TRACK : TRACK_SM;
  const sway = wide ? SWAY : 0;
  const cx = track / 2;

  // Where the road touches each platform: the start, every phase, the goal.
  const points = [
    { x: cx, y: START_H - 44 },
    ...phases.map((_, i) => ({
      x: cx + (i % 2 === 0 ? -sway : sway),
      y: START_H + row * i + row / 2 + 34
    })),
    { x: cx, y: START_H + row * phases.length + END_H - 60 }
  ];
  const height = START_H + row * phases.length + END_H;

  // Each stretch of road takes the state of the platform it arrives at.
  const segments = points.slice(1).map((p, i) => ({
    d: bend(points[i], p),
    tone: roadTone(i < phases.length ? states[i] : percent === 100 ? 'done' : 'upcoming')
  }));

  const cols = wide ? `minmax(0,1fr) ${track}px minmax(0,1fr)` : `${track}px minmax(0,1fr)`;

  /* On a phone the road snakes (asked 2026-10-15, "make road like a snake
     structure"): the platforms take turns on the left and the right — the
     start on the left, phase 1 on the right, phase 2 on the left… — each card
     on the other side of its own, and one smooth S-curve runs from platform to
     platform, crossing the map between the rows. The rows are spaced well
     apart (py-12, asked 2026-10-15: "it should not touch the road") and each
     card keeps to the outer edge, level with its platform's base, so the
     curve crosses in the open between two cards, never over one. They have no
     fixed height on a phone, so the road is drawn from where the platforms
     really are, measured after layout and again whenever the map changes
     size. */
  const sideOnPhone = (k) => (k % 2 === 0 ? 'right' : 'left');   // phase k; the start is on the left
  const colsOnPhone = (side) => (side === 'right' ? `minmax(0,1fr) ${track}px` : `${track}px minmax(0,1fr)`);
  const mapRef = useRef(null);
  const [snake, setSnake] = useState(null);
  useLayoutEffect(() => {
    const box = mapRef.current;
    if (wide || !box) return undefined;
    const measure = () => {
      const points = [...box.querySelectorAll('[data-road-anchor]')].map((el) => {
        const at = offsetIn(el, box);
        // The middle of the platform's disc: its layout box sits on the
        // row, and the disc is the bottom of it.
        return at ? { x: at.x + el.offsetWidth / 2, y: at.y + el.offsetHeight - 14 } : null;
      }).filter(Boolean);
      setSnake({ width: box.offsetWidth, height: box.offsetHeight, points });
    };
    measure();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    watch?.observe(box);
    return () => watch?.disconnect();
  }, [wide, phases.length]);
  // Each stretch of the snake takes the state of the platform it arrives at.
  const snakeSegments = !wide && snake?.points?.length > 1
    ? snake.points.slice(1).map((p, i) => ({
        d: bend(snake.points[i], p),
        tone: roadTone(i < phases.length ? states[i] : percent === 100 ? 'done' : 'upcoming')
      }))
    : [];

  // Only a phase whose turn has come opens: done ones, and the one being
  // walked. A locked one shakes its card and names the phase to finish first
  // (asked 2026-10-15).
  const currentAt = states.indexOf('current');
  const [nope, setNope] = useState(null);
  useEffect(() => {
    if (!nope) return undefined;
    const t = setTimeout(() => setNope(null), 2400);
    return () => clearTimeout(t);
  }, [nope]);
  const tryOpen = (i) => (states[i] === 'upcoming' ? setNope((n) => ({ i, at: (n?.at || 0) + 1 })) : onOpen(i));

  // On a phone the card opens straight onto the map (its "Your step-by-step
  // path" header is for the wide layout only, asked 2026-10-15), so the map
  // reaches the card's top edge too, and how to use it is a small chip in a
  // strip of sky above the start, fading after a few seconds or at the first
  // touch.
  const [hint, setHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={mapRef} onPointerDown={() => setHint(false)} className="relative -mx-6 -mt-6 -mb-6 overflow-hidden rounded-b-2xl bg-gradient-to-b from-sky-50 via-journey-50/70 to-pink-50 px-2 pt-12 pb-6 sidebar:mt-0 sidebar:pt-4 md:px-6">
      <span
        aria-hidden
        className={`pointer-events-none absolute top-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap text-journey-700 shadow-md ring-1 ring-journey-100 transition-opacity duration-700 sidebar:hidden ${hint ? 'opacity-100' : 'opacity-0'}`}
      >
        <MapPin className="h-3.5 w-3.5" /> Tap a platform to open it
      </span>
      {/* The sky: a fine dot grid and three soft colour orbs that drift. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgb(125 79 255 / 0.16) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />
      <span aria-hidden className="fp-float pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <span aria-hidden className="fp-float-slow pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-pink-300/40 blur-3xl" />
      <span aria-hidden className="fp-float-settle pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />

      {/* Scenery. Painted once, drifting slowly, never in the way. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
        <span className="fp-drift-icon absolute top-[5%] left-[8%] text-4xl opacity-80" style={{ animationDelay: '-1s' }}>☁️</span>
        <span className="fp-drift-icon absolute top-[30%] right-[5%] text-3xl opacity-80" style={{ animationDelay: '-3s' }}>☁️</span>
        <span className="fp-drift-icon absolute top-[62%] left-[5%] text-3xl opacity-70" style={{ animationDelay: '-5s' }}>☁️</span>
        <span className="fp-drift-icon absolute top-[12%] right-[22%] text-2xl" style={{ animationDelay: '-2s' }}>🌈</span>
        <span className="fp-drift-icon absolute top-[20%] left-[26%] text-xl" style={{ animationDelay: '-2.5s' }}>🎈</span>
        <span className="fp-drift-icon absolute top-[44%] right-[28%] text-xl" style={{ animationDelay: '-4s' }}>🌟</span>
        <span className="fp-drift-icon absolute top-[54%] left-[22%] text-lg" style={{ animationDelay: '-1.5s' }}>✨</span>
        <span className="fp-drift-icon absolute top-[70%] right-[8%] text-xl" style={{ animationDelay: '-0.5s' }}>🎈</span>
        <span className="fp-drift-icon absolute top-[82%] left-[28%] text-lg" style={{ animationDelay: '-3.5s' }}>⭐</span>
        <span className="fp-drift-icon absolute top-[88%] right-[24%] text-lg" style={{ animationDelay: '-2.2s' }}>✨</span>
        <span className="absolute bottom-[8%] left-[6%] text-4xl opacity-90">🌿</span>
        <span className="absolute top-[40%] left-[3%] text-3xl opacity-80">🌱</span>
        <span className="absolute bottom-[26%] right-[4%] text-3xl opacity-80">🌸</span>
        <span className="absolute top-[58%] right-[3%] text-2xl opacity-80">🌼</span>
      </div>

      {/* The road, underneath everything — the winding one on wide screens
          only; on a phone each row paints its own straight stretch. */}
      {wide && (
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 overflow-visible"
        style={{ left: `calc(50% - ${track / 2}px)`, width: track, height }}
        viewBox={`0 0 ${track} ${height}`}
      >
        {segments.map((seg, i) => (
          <g key={i}>
            <path
              d={seg.d}
              pathLength={1}
              fill="none"
              strokeWidth={30}
              strokeLinecap="round"
              className={`fp-road-draw ${seg.tone.road}`}
              style={{ animationDelay: `${0.15 + i * 0.22}s` }}
            />
            <path
              d={seg.d}
              fill="none"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="10 12"
              className={`${seg.tone.line} ${seg.tone.flow ? 'fp-road-flow' : ''}`}
            />
          </g>
        ))}
      </svg>
      )}

      {/* The snake, on a phone (see sideOnPhone). */}
      {!wide && snake && snakeSegments.length > 0 && (
        <svg aria-hidden className="pointer-events-none absolute top-0 left-0 overflow-visible" width={snake.width} height={snake.height} viewBox={`0 0 ${snake.width} ${snake.height}`}>
          {snakeSegments.map((seg, i) => (
            <g key={i}>
              <path d={seg.d} pathLength={1} fill="none" strokeWidth={22} strokeLinecap="round" className={`fp-road-draw ${seg.tone.road}`} style={{ animationDelay: `${0.15 + i * 0.18}s` }} />
              <path d={seg.d} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="8 10" className={`${seg.tone.line} ${seg.tone.flow ? 'fp-road-flow' : ''}`} />
            </g>
          ))}
        </svg>
      )}

      {/* ---- Start ---- */}
      <Reveal className="relative grid items-center gap-3 pb-3 md:pb-0" style={{ height: wide ? START_H : undefined, minHeight: wide ? undefined : 112, gridTemplateColumns: cols }}>
        {wide && <span />}
        <div className="relative flex flex-col items-center justify-end self-stretch pb-1">
          <span data-road-anchor className="relative h-[92px] w-[112px] origin-bottom scale-[.62] md:scale-100">
            <span aria-hidden className="absolute bottom-0 left-1/2 h-10 w-[100px] -translate-x-1/2 rounded-[50%] bg-emerald-700/90" />
            <span aria-hidden className="absolute bottom-2.5 left-1/2 h-10 w-[100px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-lg shadow-emerald-500/40" />
            <span aria-hidden className="fp-bob-soft absolute bottom-8 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-white/70">
              <Flag className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <span className="absolute bottom-[14px] left-1/2 -translate-x-1/2 text-[0.6rem] font-black tracking-[0.2em] text-emerald-950/80 uppercase">
              Start
            </span>
          </span>
        </div>
        <div className={wide ? 'pl-2' : 'flex justify-end pr-1'}>
          <div className="relative top-6 w-full max-w-[12.5rem] rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/70 px-2.5 py-2 shadow-card md:top-0 md:max-w-md md:rounded-2xl md:px-4 md:py-3">
            <p className="text-[0.58rem] font-black tracking-[0.12em] text-emerald-700 uppercase md:text-[0.68rem] md:tracking-[0.14em]">Where you are starting</p>
            <p className="mt-0.5 text-[0.85rem] font-black text-ink-900 md:text-sm">{startedFrom || 'Your current stage'}</p>
          </div>
        </div>
      </Reveal>

      {/* ---- The phases ---- */}
      {phases.map((stage, i) => {
        const palette = paletteFor(i);
        const state = states[i];
        const nodeSway = i % 2 === 0 ? -sway : sway;
        const phoneSide = sideOnPhone(i);   // where the platform sits on a phone
        const cardSide = wide ? (i % 2 === 0 ? 'right' : 'left') : (phoneSide === 'right' ? 'left' : 'right');
        const title = phaseTitle(stage);
        // What Loop, the site's mascot, says on the phase being stood on: where
        // the student is, and nothing they have to do about it.
        const here = state === 'current' ? `You are here! This is phase ${i + 1} of ${phases.length}: ${parseChoices(title)?.lead || title}.` : undefined;
        // What the guide tells someone hovering a locked phase to finish first.
        const before = i > 0 ? phaseTitle(phases[i - 1]) : null;
        const lockedBy = before ? parseChoices(before)?.lead || before : undefined;
        const card = (
          <PhaseCard
            stage={stage}
            index={i}
            state={state}
            palette={palette}
            side={cardSide}
            lockedBy={lockedBy}
            unlockAfter={currentAt + 1}
            nope={nope?.i === i ? nope.at : 0}
            onClick={() => tryOpen(i)}
          />
        );
        return (
          <Reveal
            key={i}
            delay={0.05}
            className="relative grid items-center gap-2 py-12 md:gap-3 md:py-0"
            style={{ height: wide ? row : undefined, gridTemplateColumns: wide ? cols : colsOnPhone(phoneSide) }}
          >
            {wide && <div className="flex justify-end pr-2">{cardSide === 'left' ? card : null}</div>}
            <div className={`relative flex items-center justify-center self-stretch ${!wide && phoneSide === 'right' ? 'order-2' : ''}`}>
              <Platform
                palette={palette}
                state={state}
                index={i}
                sway={nodeSway}
                label={state === 'upcoming' ? `Phase ${i + 1}: ${title}. Locked. Finish phase ${currentAt + 1} first.` : `Open phase ${i + 1}: ${title}`}
                lockedBy={lockedBy}
                here={here}
                onClick={() => tryOpen(i)}
              />
            </div>
            {/* On a phone the card keeps to the outer edge, away from its
                platform, and sits level with the platform's base: the S-curve leaves a platform straight down and only
                swings across between the rows, so a card there stays clear
                of it (asked 2026-10-15: "it should not touch the road"). */}
            <div className={`flex ${wide ? 'justify-start pl-2' : phoneSide === 'right' ? 'order-1 justify-start pl-0.5' : 'justify-end pr-0.5'}`}>
              {wide ? (cardSide === 'right' ? card : null) : card}
            </div>
          </Reveal>
        );
      })}

      {/* ---- The destination ---- */}
      <Reveal className="relative grid items-center gap-3 pt-12 md:pt-0" style={{ height: wide ? END_H : undefined, minHeight: wide ? undefined : 120, gridTemplateColumns: wide ? cols : colsOnPhone(sideOnPhone(phases.length)) }}>
        {wide && <span />}
        <div className={`relative flex items-center justify-center self-stretch ${!wide && sideOnPhone(phases.length) === 'right' ? 'order-2' : ''}`}>
          <span data-road-anchor className="fp-platform relative block h-[116px] w-[120px] origin-bottom scale-[.62] md:scale-100">
            {percent === 100 && (
              <span aria-hidden className="fp-halo absolute inset-x-0 bottom-0 h-16 rounded-[50%] bg-emerald-400/60 blur-xl" />
            )}
            <span aria-hidden className="absolute bottom-0 left-1/2 h-12 w-[112px] -translate-x-1/2 rounded-[50%] bg-indigo-800/90" />
            <span aria-hidden className="absolute bottom-3 left-1/2 h-12 w-[112px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-violet-300 to-journey-600 shadow-lg shadow-journey-500/40" />
            <span aria-hidden className="absolute bottom-[26px] left-1/2 h-6 w-[76px] -translate-x-1/2 rounded-[50%] bg-white/30" />
            <span
              aria-hidden
              className={`fp-bob-soft absolute bottom-10 left-1/2 flex h-[60px] w-[60px] -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl ring-2 ring-white/70 ${
                percent === 100 ? 'from-emerald-400 to-teal-600 shadow-emerald-500/40' : 'from-violet-400 to-journey-600 shadow-journey-500/40'
              }`}
            >
              {percent === 100 ? <PartyPopper className="h-8 w-8" strokeWidth={2.2} /> : <FlagTriangleRight className="h-8 w-8" strokeWidth={2.2} />}
            </span>
          </span>
        </div>
        <div className={wide ? 'pl-2' : sideOnPhone(phases.length) === 'right' ? 'order-1 flex justify-start pl-0.5' : 'flex justify-end pr-0.5'}>
          <div className="relative top-6 w-full max-w-[12.5rem] overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 px-2.5 py-2 shadow-card md:top-0 md:max-w-md md:rounded-2xl md:px-4 md:py-3.5">
            <span aria-hidden className="fp-effort-gradient absolute inset-x-0 top-0 h-1 md:h-1.5" />
            <span aria-hidden className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-orange-300/40 blur-2xl" />
            <p className="flex items-center gap-1 text-[0.58rem] font-black tracking-[0.12em] text-amber-700 uppercase md:gap-1.5 md:text-[0.68rem] md:tracking-[0.14em]">
              <FlagTriangleRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
              Your destination
            </p>
            <p className="mt-0.5 bg-gradient-to-r from-orange-600 via-pink-600 to-journey-600 bg-clip-text text-[0.92rem] leading-snug font-black text-transparent sm:text-lg">
              {goal?.careerGoal || 'Your career goal'}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
