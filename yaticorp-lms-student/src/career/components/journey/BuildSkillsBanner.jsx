import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, CalendarDays, Star, Zap } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import YatiMascot from '../game/YatiMascot';

/**
 * 🌟 The banner that opens the Skills page.
 *
 * One line of encouragement and three numbers, every one of them real: XP is
 * the user's running total, skills completed counts tracked skills at 100%,
 * and the streak is consecutive days with a finished task, from the same
 * history the Overview reads.
 *
 * The illustration is original inline SVG for the usual reasons — a few
 * kilobytes, no request, sharp at any width, and it takes the banner's own
 * palette rather than being a PNG that stops matching when the theme changes.
 */

const Sparkle = ({ x, y, s = 1, o = 0.8 }) => (
  <path
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill="#a78bfa"
    opacity={o}
  />
);

const FloatCard = ({ x, y, r = 0, w = 64, h = 64, shadow, children }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="14" fill="#ffffff" filter={`url(#${shadow})`} />
    {children}
  </g>
);

/** The things a learner picks up — cards, a note, sparkles — around a gap YATI stands in. */
function BuildSkillsArt() {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `bs-${n}-${uid}`;

  return (
    <svg viewBox="0 0 560 220" className="h-full w-full" aria-hidden preserveAspectRatio="xMaxYMax meet">
      <defs>
        <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6c3bff" floodOpacity="0.14" />
        </filter>
        <linearGradient id={id('bulb')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* soft cloud behind the figure */}
      <ellipse cx="290" cy="150" rx="150" ry="70" fill="#ffffff" opacity="0.55" />
      <ellipse cx="290" cy="215" rx="190" ry="16" fill="#6c3bff" opacity="0.08" />

      {/* dotted orbit */}
      <path
        d="M110 60 C 180 -10, 400 -10, 470 70"
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* sparkles */}
      <Sparkle x={60} y={150} s={1.2} />
      <Sparkle x={150} y={20} s={0.9} />
      <Sparkle x={385} y={22} s={1.3} />
      <Sparkle x={470} y={170} s={0.9} />
      <Sparkle x={520} y={80} s={0.7} o={0.6} />
      <Sparkle x={230} y={35} s={0.7} o={0.6} />

      {/* code card */}
      <FloatCard x={110} y={82} r={-8} w={68} h={68} shadow={id('shadow')}>
        <text
          x="0"
          y="9"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="26"
          fontWeight="700"
          fill="#6c3bff"
        >
          {'</>'}
        </text>
      </FloatCard>

      {/* bar-chart card */}
      <FloatCard x={150} y={160} r={6} w={62} h={62} shadow={id('shadow')}>
        <rect x="-18" y="2" width="8" height="16" rx="2" fill="#93c5fd" />
        <rect x="-5" y="-8" width="8" height="26" rx="2" fill="#60a5fa" />
        <rect x="8" y="-16" width="8" height="34" rx="2" fill="#3b82f6" />
      </FloatCard>

      {/* lightbulb card */}
      <FloatCard x={392} y={72} r={8} w={64} h={64} shadow={id('shadow')}>
        <path d="M-3 12 h6 v5 h-6 z" fill="#94a3b8" />
        <path d="M-5 8 h10 v4 h-10 z" fill="#cbd5e1" />
        <path d="M0 -16 a12 12 0 0 1 6 22 v3 h-12 v-3 a12 12 0 0 1 6 -22 z" fill={`url(#${id('bulb')})`} />
        <path d="M-2 -6 l2 -5 l2 5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </FloatCard>

      {/* growth card */}
      <FloatCard x={406} y={160} r={-5} w={60} h={60} shadow={id('shadow')}>
        <rect x="-18" y="4" width="7" height="12" rx="2" fill="#c4b5fd" />
        <rect x="-6" y="-4" width="7" height="20" rx="2" fill="#a78bfa" />
        <rect x="6" y="-12" width="7" height="28" rx="2" fill="#7c3aed" />
        <path d="M-16 -8 L-4 -14 L6 -18" fill="none" stroke="#6c3bff" strokeWidth="2" strokeLinecap="round" />
      </FloatCard>

      {/* sticky note */}
      <g transform="translate(500 110) rotate(6)">
        <rect x="-48" y="-56" width="96" height="112" rx="8" fill="#f5f3ff" filter={`url(#${id('shadow')})`} />
        <rect x="-48" y="-56" width="96" height="10" rx="4" fill="#ddd6fe" />
        <text
          fontFamily="Inter, ui-sans-serif, system-ui"
          fontSize="13"
          fontWeight="800"
          fill="#1e1b4b"
          textAnchor="middle"
        >
          <tspan x="0" y="-22">Better</tspan>
          <tspan x="0" y="-4">Skills</tspan>
          <tspan x="0" y="14">Brighter</tspan>
          <tspan x="0" y="32">Future</tspan>
        </text>
        <path d="M28 40 c6 -8, 10 -14, 14 -24" fill="none" stroke="#6c3bff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M36 18 l6 -3 l1 7" fill="none" stroke="#6c3bff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* a small podium where YATI stands (drawn as an HTML overlay) */}
      <ellipse cx="290" cy="196" rx="70" ry="9" fill="#6c3bff" opacity="0.10" />
    </svg>
  );
}

function Stat({ icon: Icon, tone, value, label }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pr-3 pl-1 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset ${tone}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      <span className="text-[0.8rem] whitespace-nowrap text-ink-600">
        <span className="font-black tabular-nums text-ink-900">{value}</span> {label}
      </span>
    </li>
  );
}

export default function BuildSkillsBanner({ xp = 0, completed = 0, streak = 0 }) {
  const shownXp = useCountUp(xp, 1000);
  const shownDone = useCountUp(completed, 900);
  const shownStreak = useCountUp(streak, 800);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-brand-50 shadow-card ring-1 ring-journey-100 ring-inset">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-journey-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute right-1/3 -bottom-24 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] max-w-[520px] [mask-image:linear-gradient(to_right,transparent,black_18%)] md:block"
      >
        <BuildSkillsArt />
        {/* YATI, in the gap the scene leaves for it. The mascot is its own SVG
            with its own moods, so it is laid over the scene rather than
            redrawn inside it. */}
        <YatiMascot
          mood="pointing"
          float
          className="absolute bottom-1 left-1/2 h-[82%] w-auto -translate-x-[46%] drop-shadow-[0_12px_20px_rgba(108,59,255,0.22)]"
        />
      </div>

      <div className="relative flex items-start gap-5 p-5 sm:p-6 md:min-h-[224px] md:max-w-[58%] lg:pr-0">
        <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-journey-400 to-journey-700 text-white shadow-lg shadow-journey-500/30 sm:flex">
          <Star className="h-7 w-7 fill-white" strokeWidth={1.6} />
        </span>

        <div className="min-w-0">
          <p className="text-[0.68rem] font-black tracking-[0.2em] text-journey-600 uppercase">
            Build your skills
          </p>
          <h1 className="mt-1.5 text-[1.75rem] leading-tight font-black text-ink-900 sm:text-[2rem] lg:whitespace-nowrap xl:text-[2.25rem]">
            Small steps.{' '}
            <span className="bg-gradient-to-r from-journey-600 to-indigo-600 bg-clip-text text-transparent">
              Big dreams.
            </span>
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">
            Gain skills, earn XP and unlock new opportunities in your career journey.
          </p>

          <ul className="mt-4 flex flex-wrap items-center gap-2">
            <Stat
              icon={Star}
              tone="bg-amber-50 text-amber-500 ring-amber-100"
              value={shownXp.toLocaleString()}
              label="XP"
            />
            <Stat
              icon={Award}
              tone="bg-journey-50 text-journey-600 ring-journey-100"
              value={shownDone}
              label={shownDone === 1 ? 'skill done' : 'skills done'}
            />
            <Stat
              icon={CalendarDays}
              tone="bg-pink-50 text-pink-500 ring-pink-100"
              value={shownStreak}
              label="day streak"
            />
          </ul>

          <Link
            to="/career/planner"
            className="fp-press group mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-journey-500/30 transition-all hover:from-journey-700 hover:to-indigo-700"
          >
            <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
            Start today&apos;s task
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
