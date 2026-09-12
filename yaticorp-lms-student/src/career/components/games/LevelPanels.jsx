import { useId } from 'react';
import { Star, Play, Target, Timer, Trophy, ChevronRight, RotateCcw, Sparkles, ArrowRight, Gamepad2, Lightbulb, Clock3 } from 'lucide-react';
import { coachFor, quoteFor } from './gameCoach';
import '../artwork.css';

/**
 * The same check useCountUp and the roadmap track make. The global
 * reduced-motion rule collapses every duration but leaves delays alone, so a
 * star told to wait 0.6s before a 0.01ms pop would sit invisible for 0.6s.
 * With the preference set, nothing here waits.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A five-pointed star, outer radius 46, inner 19, point upwards. */
const STAR_D =
  'M0 -46 L11.2 -15.4 L43.8 -14.2 L18.1 5.9 L27 37.2 L0 19 ' +
  'L-27 37.2 L-18.1 5.9 L-43.8 -14.2 L-11.2 -15.4 Z';

/**
 * One star as a solid: a darker copy dropped beneath it for thickness, a
 * gradient across the face, a white crown where the light lands. Built the
 * way the solids in the section's heroes are, so the star handed over here is
 * visibly the same object as the one on the Rewards shelf.
 */
function SolidStar({ lit, size = 64, delay = '0s' }) {
  const gold = `lp-gold-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="-52 -52 104 104"
      width={size}
      height={size}
      aria-hidden
      className={lit ? 'animate-pop-in' : ''}
      style={lit ? { animationDelay: delay } : undefined}
    >
      <defs>
        <linearGradient id={gold} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d={STAR_D} transform="translate(0 7)" fill={lit ? '#c2620a' : '#cbd5e1'} opacity="0.95" />
      <path
        d={STAR_D}
        fill={lit ? `url(#${gold})` : '#eef2f7'}
        stroke={lit ? '#fbbf24' : '#e2e8f0'}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <ellipse cx="-13" cy="-19" rx="10" ry="6.5" fill="#fff" opacity={lit ? 0.6 : 0.5} transform="rotate(-28 -13 -19)" />
    </svg>
  );
}

/** Three stars, filled to `earned`, arriving one after another. */
function Stars({ earned, animate = false, size = 64 }) {
  const still = reducedMotion();
  return (
    <div className="flex items-end justify-center gap-1 sm:justify-start" role="img" aria-label={`${earned} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <SolidStar
          key={n}
          lit={n <= earned}
          size={n === 2 ? size * 1.18 : size}
          delay={still || !animate ? '0s' : `${0.25 + 0.22 * n}s`}
        />
      ))}
    </div>
  );
}

/**
 * The medal, beside the words.
 *
 * A pass gets gold with a halo breathing behind it and rays coming off it; a
 * miss gets the same medal in silver, still and unlit, because the picture
 * has to report the result and not console it. No character anywhere: the
 * medal is the thing that was won.
 */
function ResultArt({ passed }) {
  const still = reducedMotion();
  const gold = passed;
  const uid = useId().replace(/:/g, '');
  const id = (n) => `lp-${n}-${uid}`;
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={id('halo')}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('disc')} x1="0.15" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={gold ? '#fef3c7' : '#f8fafc'} />
          <stop offset="45%" stopColor={gold ? '#fbbf24' : '#cbd5e1'} />
          <stop offset="100%" stopColor={gold ? '#d97706' : '#94a3b8'} />
        </linearGradient>
        <filter id={id('cast')} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor={gold ? '#78350f' : '#1e293b'} floodOpacity="0.22" />
        </filter>
      </defs>

      {gold && <circle className={still ? '' : 'yatiArt-bob'} cx="120" cy="112" r="96" fill={`url(#${id('halo')})`} />}

      {gold &&
        [-150, -120, -90, -60, -30].map((a, i) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              className={still ? '' : 'yatiArt-twinkle'}
              style={{ animationDelay: `${i * 0.45}s` }}
              x1={120 + Math.cos(r) * 78}
              y1={112 + Math.sin(r) * 78}
              x2={120 + Math.cos(r) * 96}
              y2={112 + Math.sin(r) * 96}
              stroke="#fbbf24"
              strokeWidth="6"
              strokeLinecap="round"
            />
          );
        })}

      {/* The ribbon, behind the disc. */}
      <path d="M92 150 L78 226 L120 204 L162 226 L148 150 Z" fill={gold ? '#7c3aed' : '#94a3b8'} />
      <path d="M104 150 L96 214 L120 202 L144 214 L136 150 Z" fill={gold ? '#a78bfa' : '#cbd5e1'} />

      <g className={still ? '' : 'animate-pop-in'} style={still ? undefined : { animationDelay: '0.15s' }} filter={`url(#${id('cast')})`}>
        <circle cx="120" cy="120" r="66" fill={gold ? '#b45309' : '#64748b'} />
        <circle cx="120" cy="112" r="66" fill={`url(#${id('disc')})`} />
        <circle cx="120" cy="112" r="50" fill="none" stroke={gold ? '#fde68a' : '#f1f5f9'} strokeWidth="5" opacity="0.8" />
        <path d={STAR_D} transform="translate(120 114) scale(0.62)" fill={gold ? '#fffbeb' : '#f8fafc'} opacity="0.95" />
        {/* The edge the light actually lands on. */}
        <path d="M70 92 A 56 56 0 0 1 100 58" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.45" />
      </g>
    </svg>
  );
}

// One burst of confetti: colour, where it starts across the panel, when.
const CONFETTI = [
  ['#7c3aed', 4, 0], ['#f472b6', 12, 0.12], ['#fbbf24', 20, 0.05], ['#34d399', 28, 0.18],
  ['#60a5fa', 36, 0.08], ['#f97316', 44, 0.22], ['#a78bfa', 52, 0.14], ['#fde68a', 60, 0.3],
  ['#f472b6', 68, 0.34], ['#34d399', 76, 0.26], ['#60a5fa', 84, 0.4], ['#fbbf24', 92, 0.36],
  ['#a78bfa', 8, 0.5], ['#34d399', 24, 0.44], ['#f97316', 40, 0.58], ['#7c3aed', 56, 0.48],
  ['#fde68a', 72, 0.62], ['#60a5fa', 88, 0.54], ['#f472b6', 16, 0.7], ['#fbbf24', 48, 0.66],
  ['#34d399', 64, 0.76], ['#a78bfa', 80, 0.72], ['#f97316', 32, 0.84], ['#60a5fa', 96, 0.8]
];

/**
 * The screen before a level starts.
 *
 * One card, three things: which level, what the bar is, and the button.
 * It used to stack a dark banner, a stars line, a trail of past levels, two
 * rule tiles and a button — a briefing that took longer to read than the
 * level took to play. The mascot stands in for the decoration and points
 * the student at Start.
 */
/**
 * The level, as a scene: a big blue solid with a crown perched on it and a
 * couple of books at its foot, in a soft blue cloud with sparks around it.
 * The reference for this screen draws the level as a prize on a shelf, and
 * this is that shelf. Nothing here is a character.
 */
function LevelBadgeArt({ level, still }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `lb-${n}-${uid}`;
  return (
    <svg viewBox="0 0 260 260" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={id('face')} x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#7cb8fb" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id={id('cast')} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#1e3a8a" floodOpacity="0.28" />
        </filter>
      </defs>
      {/* the cloud it sits in */}
      <ellipse cx="128" cy="150" rx="118" ry="96" fill="#dbeafe" opacity="0.9" />
      <ellipse cx="60" cy="110" rx="52" ry="44" fill="#e0e7ff" opacity="0.9" />

      {[[236, 96, 1.2, '0s'], [24, 166, 0.9, '0.8s'], [230, 190, 0.8, '1.5s']].map(([x, y, sc, delay]) => (
        <path
          key={`${x}${y}`}
          className={still ? '' : 'yatiArt-twinkle'}
          style={{ animationDelay: delay }}
          d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
          transform={`translate(${x} ${y}) scale(${sc})`}
          fill="#fbbf24"
        />
      ))}

      {/* the level: a darker slab beneath for thickness, the face, the crown of light */}
      <g transform="rotate(-7 140 138)" filter={`url(#${id('cast')})`}>
        <rect x="68" y="76" width="150" height="150" rx="30" fill="#1e40af" />
        <rect x="68" y="64" width="150" height="150" rx="30" fill={`url(#${id('face')})`} />
        <rect x="84" y="74" width="118" height="22" rx="11" fill="#fff" opacity="0.28" />
        <text x="143" y="122" textAnchor="middle" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="17" fontWeight="900" letterSpacing="5" fill="#fff" opacity="0.9">LEVEL</text>
        <text x="143" y="196" textAnchor="middle" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="82" fontWeight="900" fill="#fff">{level}</text>
      </g>

      {/* the crown, perched on the corner */}
      <g className={still ? '' : 'fp-bob-soft'}>
        <g transform="translate(66 52) rotate(-14)">
          <path d="M-22 14 L-26 -16 L-10 -2 L0 -22 L10 -2 L26 -16 L22 14 Z" fill={`url(#${id('gold')})`} stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
          <rect x="-22" y="12" width="44" height="9" rx="3" fill="#f59e0b" />
          <circle cx="-13" cy="4" r="3" fill="#f43f5e" />
          <circle cx="0" cy="-2" r="3.2" fill="#3b82f6" />
          <circle cx="13" cy="4" r="3" fill="#22c55e" />
        </g>
      </g>

      {/* the books at its foot */}
      <g transform="translate(20 194)">
        <rect x="6" y="18" width="88" height="22" rx="6" fill="#6d28d9" />
        <rect x="0" y="14" width="88" height="22" rx="6" fill="#8b5cf6" />
        <rect x="0" y="14" width="10" height="22" rx="4" fill="#5b21b6" />
        <rect x="12" y="-2" width="82" height="22" rx="6" fill="#1d4ed8" />
        <rect x="6" y="-6" width="82" height="22" rx="6" fill="#3b82f6" />
        <rect x="6" y="-6" width="10" height="22" rx="4" fill="#1e40af" />
        <rect x="22" y="0" width="52" height="4" rx="2" fill="#fff" opacity="0.7" />
      </g>
    </svg>
  );
}

/** The three violet petals the reference tucks into a corner. */
const Leaves = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" className={className} aria-hidden>
    {[[-28, '#7c3aed'], [0, '#a78bfa'], [28, '#c4b5fd']].map(([r, fill]) => (
      <path key={r} d="M0 0 C -14 -22, -6 -50, 0 -56 C 6 -50, 14 -22, 0 0 Z" transform={`translate(52 70) rotate(${r})`} fill={fill} />
    ))}
  </svg>
);

const STEP_TONES = ['from-pink-500 to-rose-500', 'from-sky-500 to-blue-600', 'from-emerald-400 to-green-600'];

export function LevelIntro({ gameId, level, objective, seconds, stars, onStart }) {
  const coach = coachFor(gameId);
  const quote = quoteFor(gameId, level);
  const still = reducedMotion();
  const at = (sec) => (still ? undefined : { animationDelay: `${sec}s` });
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-sky-100 ring-inset">
      {/* ---- The ground: soft organic colour, drifting, with a dotted patch
              and petals in a corner, so the screen reads as a place. ---- */}
      <span aria-hidden className="fp-float pointer-events-none absolute -bottom-24 -left-20 h-72 w-96 rounded-[50%] bg-amber-200/80 blur-2xl" />
      <span aria-hidden className="fp-float-slow pointer-events-none absolute -bottom-28 right-[10%] h-64 w-[26rem] rounded-[50%] bg-sky-200/80 blur-2xl" />
      <span aria-hidden className="fp-float-settle pointer-events-none absolute -top-16 left-[30%] h-40 w-72 rounded-[50%] bg-indigo-100/80 blur-2xl" />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-6 left-[46%] h-14 w-48 rounded-full opacity-60"
        style={{ backgroundImage: 'radial-gradient(#60a5fa 1.6px, transparent 1.6px)', backgroundSize: '11px 11px' }}
      />
      <Leaves className="pointer-events-none absolute -top-1 -right-1 h-16 w-16 opacity-90 sm:h-24 sm:w-24" />

      {/* Phones get a compact version of the same layout: the badge, type and
          card all shrink so the briefing is one comfortable screen rather
          than three. */}
      <div className="relative grid items-center gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[16rem_minmax(0,1fr)_19rem] lg:gap-8 lg:p-8">
        {/* ---- The level ---- */}
        <div className="animate-pop-in mx-auto h-36 w-36 sm:h-60 sm:w-60 lg:h-64 lg:w-64" style={at(0)}>
          <LevelBadgeArt level={level} still={still} />
        </div>

        {/* ---- The words ---- */}
        <div className="min-w-0 text-center lg:text-left">
          <p className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[0.68rem] font-black tracking-[0.16em] text-violet-700 uppercase" style={at(0.08)}>
            <Star className="h-3 w-3 fill-current" />
            {stars > 0 ? 'Back for more?' : 'Ready?'}
          </p>
          <h3 className="animate-fade-in-up mt-2 text-2xl leading-[1.05] font-black text-[#1b2456] sm:mt-3 sm:text-4xl lg:text-[2.6rem]" style={at(0.14)}>
            {quote.lead}{' '}
            <span className="fp-text-shimmer bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              {quote.hot}
            </span>
            <span className="block">{quote.rest}</span>
          </h3>
          <p className="animate-fade-in-up mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 sm:mt-3 sm:text-[0.95rem] lg:mx-0" style={at(0.2)}>
            {quote.line}
          </p>

          <div className="animate-fade-in-up mt-3 flex items-center justify-center gap-2 sm:mt-4 lg:justify-start" style={at(0.26)}>
            <Sparkles aria-hidden className="yatiArt-twinkle hidden h-4 w-4 text-amber-400 sm:block" />
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 py-1.5 pr-3.5 pl-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200/80 ring-inset sm:py-2 sm:pr-4 sm:pl-2 sm:text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm sm:h-7 sm:w-7">
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              {quote.cheer}
            </span>
            <Sparkles aria-hidden className="yatiArt-twinkle hidden h-4 w-4 text-amber-400 sm:block" style={{ animationDelay: '1.1s' }} />
          </div>

          {/* The objective and the clock, so the words above never replace
              the one thing the student has to know. */}
          <p className="animate-fade-in-up mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500 sm:mt-4 lg:justify-start" style={at(0.3)}>
            <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-violet-500" />{objective}</span>
            {seconds !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-slate-200 ring-inset tabular-nums"><Timer className="h-3.5 w-3.5 text-orange-500" />{seconds}s</span>
            )}
            {stars > 0 && (
              /* The best run so far, as a pill like the clock beside it. Plain
                 SolidStars rather than <Stars>: that one is a block and would
                 push its caption onto a line of its own. */
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 py-1 pr-2.5 pl-1.5 text-amber-800 ring-1 ring-amber-200/80 ring-inset"
                role="img"
                aria-label={`best ${stars} of 3 stars`}
              >
                {[1, 2, 3].map((n) => (
                  <SolidStar key={n} lit={n <= stars} size={15} />
                ))}
                <span className="ml-0.5">best {stars} of 3</span>
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={onStart}
            autoFocus
            className="fp-btn fp-btn-primary fp-beacon fp-sweep animate-fade-in-up mt-4 inline-flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-base font-black text-white shadow-lg shadow-violet-600/30 sm:mt-5 sm:min-h-14 sm:w-auto sm:text-lg lg:min-h-16 lg:px-12"
            style={at(0.36)}
          >
            <Play className="h-5 w-5 fill-current" />
            Start level {level}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* ---- How to play ---- */}
        <div className="animate-fade-in-up rounded-2xl bg-white/90 p-4 shadow-xl shadow-indigo-900/10 ring-1 ring-slate-100 ring-inset backdrop-blur sm:rounded-3xl sm:p-5" style={at(0.4)}>
          <p className="flex items-center gap-3 text-[0.72rem] font-black tracking-[0.18em] text-violet-700 uppercase">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-600/30 sm:h-9 sm:w-9">
              <Gamepad2 className="h-4 w-4" />
            </span>
            How to play
          </p>
          <ol className="mt-1 divide-y divide-slate-100 sm:mt-2">
            {coach.steps.map((step, i) => (
              <li key={i} className="animate-fade-in-up flex items-center gap-3 py-2 text-sm font-semibold text-slate-700 sm:py-3 sm:text-[0.9rem]" style={at(0.46 + i * 0.08)}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white shadow-md sm:h-8 sm:w-8 sm:text-sm ${STEP_TONES[i % STEP_TONES.length]}`}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-1.5 flex items-center gap-2.5 rounded-2xl bg-violet-100/80 px-3 py-2 text-xs font-bold text-violet-800 ring-1 ring-violet-200/70 ring-inset sm:mt-2 sm:py-2.5 sm:text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
              <Clock3 className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">{coach.tip}</span>
            <Sparkles aria-hidden className="yatiArt-twinkle h-4 w-4 shrink-0 text-violet-500" />
          </p>
        </div>
      </div>
    </div>
  );
}

export function LevelResult({ passed, stars, headline, detail, atEnd, onNext, onRetry, tone }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div
        className={`relative overflow-hidden rounded-3xl p-5 ring-1 ring-inset sm:p-7 ${
          passed
            ? 'bg-gradient-to-br from-emerald-50 via-surface to-amber-50 ring-emerald-200/80'
            : 'bg-gradient-to-br from-journey-50 via-surface to-pink-50 ring-journey-100'
        }`}
      >
        {/* The panel's own light: a warm bloom behind the medal on a pass, a
            cool one on a miss, so the whole card reads as one lit scene rather
            than words beside a picture. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full blur-3xl ${
            passed ? 'bg-amber-200/60' : 'bg-journey-200/50'
          }`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl ${
            passed ? 'bg-emerald-200/50' : 'bg-pink-200/40'
          }`}
        />

        {passed &&
          CONFETTI.map(([color, left, delay], i) => (
            <span
              key={i}
              aria-hidden
              className="fp-confetti"
              style={{ left: `${left}%`, background: color, animationDelay: `${delay}s` }}
            />
          ))}

        <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-w-0 text-center sm:text-left">
            <p
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-black tracking-[0.2em] uppercase ring-1 ring-inset ${
                passed
                  ? 'bg-emerald-100/80 text-emerald-700 ring-emerald-200'
                  : 'bg-journey-100/80 text-journey-700 ring-journey-200'
              }`}
            >
              {passed ? <Trophy className="h-3 w-3" /> : <Target className="h-3 w-3" />}
              {passed ? 'Level complete' : 'Not quite'}
            </p>

            <div className="mt-4">
              <Stars earned={stars} animate={passed} />
            </div>

            <p className="mt-3 text-3xl leading-tight font-black text-ink-900 sm:text-4xl">{headline}</p>
            {detail && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-sm font-bold text-ink-600 ring-1 ring-line-200 ring-inset tabular-nums">
                {detail}
              </p>
            )}
            <p className={`mt-3 text-sm font-bold ${passed ? 'text-emerald-700' : 'text-journey-700'}`}>
              {passed ? 'Brilliant! On to the next one?' : "Almost there — don't give up. Try again!"}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 sm:justify-start">
              {passed && !atEnd && (
                /* The beacon: the one button on this screen that must be
                   found, pulsing for as long as the next level is waiting. */
                <button
                  type="button"
                  onClick={onNext}
                  autoFocus
                  className={`fp-btn fp-btn-primary fp-beacon fp-sweep inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r px-6 text-base font-black text-white shadow-lg shadow-journey-600/30 ${tone}`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Next level
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              {passed && atEnd && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <Trophy className="h-4 w-4" />
                  Every level cleared!
                </span>
              )}
              <button
                type="button"
                onClick={onRetry}
                autoFocus={!passed}
                className={`fp-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black ${
                  passed
                    ? 'fp-btn-soft bg-surface text-ink-700 ring-1 ring-line-200 ring-inset'
                    : 'fp-btn-primary fp-beacon bg-gradient-to-r from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-600/30'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                {passed ? 'Play again' : 'Try again'}
              </button>
              {!passed && (
                <span className="inline-flex items-center gap-1.5 self-center text-xs font-semibold text-ink-400">
                  <Sparkles className="h-3.5 w-3.5 text-journey-400" />
                  Every try makes you quicker.
                </span>
              )}
            </div>
          </div>

          {/* The medal. Hidden on a phone, where the column would push the
              buttons below the fold; the stars above carry the result there. */}
          <div aria-hidden className="hidden h-52 w-52 justify-self-center sm:block">
            <ResultArt passed={passed} />
          </div>
        </div>
      </div>
    </div>
  );
}
