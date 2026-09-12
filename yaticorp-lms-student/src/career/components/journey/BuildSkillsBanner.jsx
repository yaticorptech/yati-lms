import { useId } from 'react';
import { Award, CalendarDays, Star } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import './skillsHero.css';

/**
 * 🌟 The banner that opens the Skills page.
 *
 * One line of encouragement and three numbers, every one of them real: XP is
 * the user's running total, skills completed counts tracked skills at 100%,
 * and the streak is consecutive days with a finished task, from the same
 * history the Overview reads.
 *
 * The picture says the headline back: three steps climbing to a star, because
 * "Small steps. Big dreams." is the promise and a learner of any subject can
 * see themselves on a staircase. Nothing in it is a person or a character —
 * no figure to be the wrong age, the wrong field or the wrong anybody.
 */

/* ---------------------------------------------------------------------------
 * The scene.
 *
 * Drawn rather than photographed, for the usual reasons — a few kilobytes, no
 * request, sharp at any width, and it takes the page's own palette instead of
 * being a PNG that stops matching when the theme moves.
 *
 * The climb is genuinely three-dimensional: every block is an isometric
 * cuboid with three real faces, not a rounded rectangle with a shadow under
 * it. One light source, up and to the left, so the top face is brightest, the
 * left face is mid and the right face is darkest — held to for every solid
 * here, which is most of what makes a flat drawing read as a solid one.
 * ------------------------------------------------------------------------- */

/** A five-pointed star, outer radius 46, inner 19, point upwards. */
const STAR =
  'M0 -46 L11.2 -15.4 L43.8 -14.2 L18.1 5.9 L27 37.2 L0 19 ' +
  'L-27 37.2 L-18.1 5.9 L-43.8 -14.2 L-11.2 -15.4 Z';

const Sparkle = ({ x, y, s = 1, o = 0.8, fill = '#a78bfa', delay = '0s' }) => (
  <path
    className="sk-twinkle"
    style={{ animationDelay: delay }}
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={fill}
    opacity={o}
  />
);

/**
 * One step of the climb, as a solid.
 *
 * `cx` is the block's centre, `ay` the apex of its top face, `hw` half its
 * width, `d` the depth of the top face and `h` how tall it stands — so it
 * reaches the ground at `ay + d + h`. Each face is stroked in its own fill
 * with a round join, which both softens the corners and closes the hairline
 * seams that otherwise show between abutting faces.
 */
const Block = ({ cx, ay, hw, d, h, top, left, right, shadow, delay }) => {
  const my = ay + d / 2; // the left and right vertices of the top face
  const by = ay + d; // the near vertex, where the two side faces meet
  const face = (pts, fill) => (
    <path
      d={`M${pts.map((pt) => pt.join(' ')).join(' L')} Z`}
      fill={fill}
      stroke={fill}
      strokeWidth="5"
      strokeLinejoin="round"
    />
  );

  return (
    <g className="sk-rise" style={{ animationDelay: delay }} filter={shadow}>
      {face([[cx - hw, my], [cx, by], [cx, by + h], [cx - hw, my + h]], left)}
      {face([[cx + hw, my], [cx, by], [cx, by + h], [cx + hw, my + h]], right)}
      {face([[cx, ay], [cx + hw, my], [cx, by], [cx - hw, my]], top)}
      {/* The edge the light actually lands on. */}
      <path
        d={`M${cx - hw + 6} ${my + 3} L${cx - 5} ${ay + d - 3}`}
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
    </g>
  );
};

/** One of the things a learner picks up, floating beside the climb. */
const Chip = ({ x, y, r = 0, s = 62, face, lip, shadow, delay, children }) => (
  <g className="sk-bob" style={{ animationDelay: delay }}>
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-s / 2} y={-s / 2 + 9} width={s} height={s} rx="17" fill={lip} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx="17" fill={face} filter={shadow} />
      <rect x={-s / 2 + 7} y={-s / 2 + 6} width={s - 14} height="12" rx="6" fill="#fff" opacity="0.5" />
      {children}
    </g>
  </g>
);

/** Small steps, and the big dream at the top of them. */
function BuildSkillsArt() {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `bs-${n}-${uid}`;
  const url = (n) => `url(#${id(n)})`;

  // Where every solid rests.
  const GROUND = 248;
  const D = 48; // the depth of every top face, so they all sit on one plane

  return (
    /* 1.73:1, which is the proportion of the frame this is given, not of the
       scene. `meet` fits the whole viewBox inside the frame, so a viewBox
       squarer than its frame scales to the frame's HEIGHT and leaves a band of
       nothing down one side. The frame is a little over half of a banner that
       shares its row with a 296px sidebar — both numbers move together, and
       widening one without the other either re-opens that gap or walks the
       picture into the text. */
    <svg
      viewBox="0 0 560 300"
      className="sk-art h-full w-full"
      aria-hidden
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <filter id={id('cast')} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#3b1a8f" floodOpacity="0.22" />
        </filter>
        <filter id={id('lift')} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#4c1d95" floodOpacity="0.16" />
        </filter>

        <linearGradient id={id('white')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        {/* A wash of colour behind the climb, so the scene sits in light
            rather than on white. */}
        <radialGradient id={id('wash')}>
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="320" cy="170" rx="244" ry="150" fill={url('wash')} />

      {/* The floor: no edge, just the ground going pale. */}
      <ellipse cx="300" cy={GROUND + 20} rx="244" ry="24" fill="#6c3bff" opacity="0.09" />

      {/* The route up, drawn before the solids so it passes behind them. */}
      <path
        className="sk-route"
        d="M26 256 C 110 248, 150 204, 232 168 C 306 132, 358 100, 392 74"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="3.5"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />

      <Sparkle x={140} y={74} s={1.25} delay="0s" />
      <Sparkle x={274} y={40} s={0.9} delay="1.4s" />
      <Sparkle x={486} y={44} s={1.2} fill="#fbbf24" delay="0.7s" />
      <Sparkle x={540} y={172} s={0.85} delay="2.1s" />
      <Sparkle x={176} y={214} s={0.8} o={0.6} delay="2.8s" />

      {/* ---- The dream, and the light coming off it ---- */}
      <circle className="sk-glow" cx="414" cy="50" r="76" fill={url('halo')} />
      <g className="sk-pop">
        <g transform="translate(414 50) scale(0.95)">
          <path d={STAR} transform="translate(0 9)" fill="#c2620a" opacity="0.95" />
          <path
            d={STAR}
            fill={url('gold')}
            stroke={url('gold')}
            strokeWidth="7"
            strokeLinejoin="round"
            filter={url('lift')}
          />
          <ellipse cx="-13" cy="-19" rx="10" ry="6.5" fill="#fff" opacity="0.6" transform="rotate(-28 -13 -19)" />
        </g>
      </g>

      {/* ---- Small steps ---- */}
      <ellipse cx="206" cy={GROUND + 8} rx="58" ry="10" fill="#1e1b4b" opacity="0.12" />
      <ellipse cx="310" cy={GROUND + 8} rx="58" ry="10" fill="#1e1b4b" opacity="0.12" />
      <ellipse cx="414" cy={GROUND + 8} rx="58" ry="10" fill="#1e1b4b" opacity="0.12" />

      {/* Wider than they are tall, and only half again as tall each time.
          Taller and narrower they stopped reading as steps and started
          reading as a bar chart. */}
      <Block cx={206} ay={170} hw={54} d={D} h={30} delay="0.06s" shadow={url('cast')}
        top="#bfdbfe" left="#60a5fa" right="#2563eb" />
      <Block cx={310} ay={136} hw={54} d={D} h={64} delay="0.2s" shadow={url('cast')}
        top="#fde68a" left="#fbbf24" right="#d97706" />
      <Block cx={414} ay={100} hw={54} d={D} h={100} delay="0.34s" shadow={url('cast')}
        top="#ddd6fe" left="#a78bfa" right="#7c3aed" />

      {/* ---- What gets picked up on the way ----
              Held to the right of the frame: this banner shares its row with a
              sidebar, so the words to its left run further across it than they
              would on a full-width hero, and a tile any further in surfaces
              from behind the stat pills. */}
      <Chip x={86} y={182} r={-9} s={58} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="0s">
        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="21"
          fontWeight="700"
          fill="#6c3bff"
        >
          {'</>'}
        </text>
      </Chip>

      <Chip x={508} y={96} r={9} s={60} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="1.6s">
        <path d="M-3 13 h6 v4 h-6 z" fill="#94a3b8" />
        <path d="M-5.5 9 h11 v4 h-11 z" fill="#cbd5e1" />
        <path d="M0 -15 a11.5 11.5 0 0 1 5.5 21 v3 h-11 v-3 a11.5 11.5 0 0 1 5.5 -21 z" fill="#fbbf24" />
        <path d="M-2 -5 l2 -5 l2 5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      </Chip>

      <Chip x={502} y={212} r={-7} s={58} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="3.2s">
        <circle cx="0" cy="0" r="14" fill="#34d399" />
        <circle cx="0" cy="-2.5" r="14" fill="#6ee7b7" opacity="0.55" />
        <path d="M-6 0.5 l4.2 4.2 l8 -8.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </Chip>
    </svg>
  );
}

function Stat({ icon: Icon, tone, value, label }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pr-2.5 pl-1 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset ${tone}`}>
        <Icon className="h-3 w-3" strokeWidth={2.4} />
      </span>
      <span className="text-[0.74rem] whitespace-nowrap text-ink-600">
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
      {/* `data-mascot-clear` so the companion treats the scene as something
          being looked at and walks around it. It is not banned from the page —
          it still has the task button to point at — but the art is the reason
          this banner is here, and a character standing on the star is the one
          place it must not stop. */}
      <div
        aria-hidden
        data-mascot-clear
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] max-w-[470px] [mask-image:linear-gradient(to_right,transparent,black_10%)] md:block"
      >
        <BuildSkillsArt />
      </div>

      <div className="relative flex items-start gap-5 p-5 sm:p-6 md:min-h-[236px] md:max-w-[50%] md:items-center lg:pr-0">
        {/* Top of the words, not the middle of them: the row as a whole is
              centred in the banner, and without this the badge centres again
              inside that and drifts down past the eyebrow it belongs to. */}
        <span className="hidden h-14 w-14 shrink-0 items-center justify-center self-start rounded-2xl bg-gradient-to-br from-journey-400 to-journey-700 text-white shadow-lg shadow-journey-500/30 sm:flex">
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
        </div>
      </div>
    </section>
  );
}
