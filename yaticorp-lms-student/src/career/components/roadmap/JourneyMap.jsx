import { useEffect, useRef, useState } from 'react';
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
 * platform or its card opens the phase in front of the map.
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
 * On a phone the road is straight: each row paints its own stretch as a
 * vertical bar behind its platform, so rows can be as tall as their cards
 * need and the road still meets every platform.
 */
function MobileRoad({ tone, from = 'top', to = 'bottom' }) {
  const bar = tone === 'done' ? 'bg-emerald-200' : tone === 'current' ? 'bg-journey-200' : 'bg-journey-100';
  const dash = tone === 'done' ? 'border-emerald-500' : tone === 'current' ? 'border-journey-500' : 'border-journey-300';
  const span = `${from === 'middle' ? 'top-1/2' : 'top-0'} ${to === 'middle' ? 'bottom-1/2' : 'bottom-0'}`;
  return (
    <span aria-hidden className={`pointer-events-none absolute left-1/2 w-6 -translate-x-1/2 ${span} ${bar} md:hidden`}>
      <span className={`absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-[3px] border-dashed ${dash}`} />
    </span>
  );
}

/** A smooth S-curve between two points on the road. */
const bend = (a, b) => {
  const dy = (b.y - a.y) * 0.5;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
};

/**
 * The colour of a stretch of road: green once walked, the platform's own
 * colour ahead, and the live stretch in violet with its dashes on the move.
 */
const roadTone = (state, palette) =>
  state === 'done'
    ? { road: 'stroke-emerald-200', line: 'stroke-emerald-500', flow: false }
    : state === 'current'
      ? { road: 'stroke-journey-200', line: 'stroke-journey-500', flow: true }
      : { road: palette.road, line: palette.dash, flow: false };

function Platform({ palette, state, index, onClick, label, sway }) {
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const locked = state === 'upcoming';

  return (
    <span className="flex h-[76px] w-[76px] origin-bottom items-end justify-center scale-[.62] md:h-auto md:w-auto md:scale-100">
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-guide={isCurrent ? 'milestone' : undefined}
      className={`fp-rm-platform group relative h-[116px] w-[120px] shrink-0 ${locked ? 'saturate-[.75]' : ''}`}
      style={{ transform: `translateX(${sway}px)` }}
    >
      <span className="fp-platform absolute inset-0 block">
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

function PhaseCard({ stage, index, state, palette, onClick, side }) {
  const title = phaseTitle(stage);
  const choices = parseChoices(title);
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const locked = state === 'upcoming';
  const isObject = typeof stage === 'object' && stage !== null;
  const stepCount = isObject ? stage.actionItems?.length || 0 : 0;
  const milestoneCount = isObject ? stage.milestones?.length || 0 : 0;

  const shell = isCurrent
    ? 'border-journey-300 bg-surface shadow-card-hover ring-2 ring-journey-200'
    : isDone
      ? 'border-emerald-200 bg-surface hover:border-emerald-300'
      : 'border-line-200/80 bg-surface hover:border-journey-200';

  return (
    <button
      type="button"
      onClick={onClick}
      /* Every phase card is content the companion must not stand on. It is
         sent to the platform beside the current one, and on a phone the
         card is the only thing immediately to that platform's right — so
         without this it lands squarely on the phase it is announcing. */
      data-mascot-clear
      aria-label={`Open phase ${index + 1}: ${choices ? choices.lead : title}`}
      className={`group relative w-full max-w-md overflow-hidden rounded-2xl border p-3.5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover md:p-5 ${shell} ${
        side === 'left' ? 'md:ml-auto' : 'md:mr-auto'
      }`}
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
        className={`absolute inset-y-0 w-1.5 bg-gradient-to-b ${palette.stripe} ${side === 'left' ? 'right-0' : 'left-0'} ${
          locked ? 'opacity-40' : ''
        }`}
      />
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${palette.stripe} ${locked ? 'opacity-50' : ''}`} />

      <span className="flex items-start gap-3">
        <span
          className={`mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-md md:flex ${palette.badge} ${
            locked ? 'opacity-70' : ''
          }`}
          aria-hidden
        >
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          {isCurrent && (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-2.5 py-0.5 text-[0.62rem] font-black tracking-wider text-white uppercase shadow-sm shadow-journey-600/30">
              <Sparkles className="h-3 w-3" />
              You are here
            </span>
          )}
          <span className={`block text-base leading-snug font-black ${locked ? 'text-ink-600' : 'text-ink-900'}`}>
            {choices ? choices.lead : title}
          </span>

          {/* Only the facts that fit on a chip. What the phase is for waits
              inside, where there is room to say it properly. */}
          {isObject && (stage.duration || stepCount > 0 || milestoneCount > 0) && (
            <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-semibold text-ink-500">
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

      <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-transform group-hover:translate-x-0.5 ${palette.soft} ${palette.text}`}>
        {isCurrent ? 'See what to do' : locked ? 'Preview this phase' : 'Open'}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
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
    tone: roadTone(
      i < phases.length ? states[i] : percent === 100 ? 'done' : 'upcoming',
      i < phases.length ? paletteFor(i) : paletteFor(5)
    )
  }));

  const cols = wide ? `minmax(0,1fr) ${track}px minmax(0,1fr)` : `${track}px minmax(0,1fr)`;

  return (
    <div className="relative -mx-6 -mb-6 overflow-hidden rounded-b-2xl bg-gradient-to-b from-sky-50 via-journey-50/70 to-pink-50 px-3 pt-4 pb-6 md:px-6">
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

      {/* ---- Start ---- */}
      <Reveal className="relative grid items-center gap-3" style={{ height: wide ? START_H : undefined, minHeight: wide ? undefined : 112, gridTemplateColumns: cols }}>
        {wide && <span />}
        <div className="relative flex flex-col items-center justify-end self-stretch pb-1">
          {!wide && <MobileRoad tone={states[0] === 'done' ? 'done' : states[0] === 'current' ? 'current' : 'upcoming'} from="middle" />}
          <span className="relative h-[92px] w-[112px] origin-bottom scale-[.62] md:scale-100">
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
        <div className={wide ? 'pl-2' : 'pr-1'}>
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/70 px-4 py-3 shadow-card">
            <p className="text-[0.68rem] font-black tracking-[0.14em] text-emerald-700 uppercase">Where you are starting</p>
            <p className="mt-0.5 text-sm font-black text-ink-900">{startedFrom || 'Your current stage'}</p>
          </div>
        </div>
      </Reveal>

      {/* ---- The phases ---- */}
      {phases.map((stage, i) => {
        const palette = paletteFor(i);
        const state = states[i];
        const nodeSway = i % 2 === 0 ? -sway : sway;
        const cardSide = i % 2 === 0 ? 'right' : 'left';
        const title = phaseTitle(stage);
        const card = (
          <PhaseCard
            stage={stage}
            index={i}
            state={state}
            palette={palette}
            side={cardSide}
            onClick={() => onOpen(i)}
          />
        );
        return (
          <Reveal
            key={i}
            delay={0.05}
            className="relative grid items-center gap-3 py-2 md:py-0"
            style={{ height: wide ? row : undefined, gridTemplateColumns: cols }}
          >
            {wide && <div className="flex justify-end pr-2">{cardSide === 'left' ? card : null}</div>}
            <div className="relative flex items-center justify-center self-stretch">
              {!wide && (
                <>
                  <MobileRoad tone={state} to="middle" />
                  <MobileRoad tone={i + 1 < phases.length ? states[i + 1] : percent === 100 ? 'done' : 'upcoming'} from="middle" />
                </>
              )}
              <Platform
                palette={palette}
                state={state}
                index={i}
                sway={nodeSway}
                label={`Open phase ${i + 1}: ${title}`}
                onClick={() => onOpen(i)}
              />
            </div>
            <div className={`flex ${wide ? 'justify-start pl-2' : 'pr-0.5'}`}>
              {wide ? (cardSide === 'right' ? card : null) : card}
            </div>
          </Reveal>
        );
      })}

      {/* ---- The destination ---- */}
      <Reveal className="relative grid items-center gap-3" style={{ height: wide ? END_H : undefined, minHeight: wide ? undefined : 120, gridTemplateColumns: cols }}>
        {wide && <span />}
        <div className="relative flex items-center justify-center self-stretch">
          {!wide && <MobileRoad tone={percent === 100 ? 'done' : 'upcoming'} to="middle" />}
          <span className="fp-platform relative block h-[116px] w-[120px] origin-bottom scale-[.62] md:scale-100">
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
        <div className={wide ? 'pl-2' : 'pr-0.5'}>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 px-4 py-3.5 shadow-card">
            <span aria-hidden className="fp-effort-gradient absolute inset-x-0 top-0 h-1.5" />
            <span aria-hidden className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-orange-300/40 blur-2xl" />
            <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.14em] text-amber-700 uppercase">
              <FlagTriangleRight className="h-3.5 w-3.5" />
              Your destination
            </p>
            <p className="mt-0.5 bg-gradient-to-r from-orange-600 via-pink-600 to-journey-600 bg-clip-text text-base font-black text-transparent sm:text-lg">
              {goal?.careerGoal || 'Your career goal'}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
