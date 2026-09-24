import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { levelProgress } from '../career/utils/progress';

/**
 * The level ring: the card's own numbers, drawn rather than described twice.
 *
 * An inline SVG for the same reasons as the summit on the calendar banner:
 * about a kilobyte, no request, sharp at any size, and it inherits the
 * sidebar's own palette instead of being a flat PNG that stops matching the
 * moment the navy behind it changes.
 *
 * The ring replaced a second copy of the CareerPath mascot. That mascot is a
 * single roaming character owned by MascotStage, and a still one pinned up
 * here read as a duplicate of it — two of the same face on screen at once,
 * one of them unable to do any of the things the real one does. This says
 * what the card is actually for instead.
 *
 * Geometry note: the circle is rotated a quarter turn so the arc starts at
 * twelve o'clock rather than three, and the dash offset counts DOWN from the
 * full circumference, so a rising percentage draws clockwise.
 */
const SIZE = 92;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function LevelRing({ level, percent, nextLevel }) {
  // Gradients are referenced by id, and this card renders twice on a phone
  // (the drawer and the rail), so a hardcoded id would have the second copy
  // painting with the first one's fill.
  const gradientId = `${useId()}-ring`;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Level ${level}, ${percent}% to level ${nextLevel}`}
      className="transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {/* The same violet → indigo the XP bar used, so the card keeps its
              colour identity now that the bar itself is gone. */}
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-slate-800"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </g>

      {/* Inside the ring, where the eye lands first: the one number a student
          is tracking. The word sits above it so the digit stays the largest
          thing in the card. */}
      <text
        x="50%"
        y="44%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-400 text-[0.5rem] font-black tracking-[0.18em] uppercase"
      >
        Level
      </text>
      <text
        x="50%"
        y="64%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white text-2xl font-black tabular-nums"
      >
        {level}
      </text>
    </svg>
  );
}

/**
 * Where a student stands, in the sidebar, on every page.
 *
 * The whole card is one link to the badges page and nothing else, so it is a
 * plain <Link> rather than a stretched overlay. The overlay was there to let a
 * "Show me around" button sit on top of it without being nested inside an
 * anchor; the button is gone, and so is the reason for the overlay.
 */
export default function SidebarProgressCard({ user, onNavigate }) {
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const progress = levelProgress(xp, level);
  // The card reads as a total against the next threshold, which is how a level
  // bar is read everywhere else — not as "XP into this level".
  const ceiling = xp + progress.remaining;

  return (
    <Link
      to="/career/badges"
      onClick={onNavigate}
      className="group block rounded-2xl bg-slate-900/70 p-3.5 text-center ring-1 ring-slate-800 transition-colors hover:bg-slate-900 hover:ring-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <div className="flex justify-center">
        <LevelRing level={level} percent={progress.percent} nextLevel={progress.nextLevel} />
      </div>

      <p className="mt-2 text-sm font-bold text-white">Keep going, champ!</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Every step today builds your tomorrow.
      </p>

      {/* The ring says the proportion; this says the actual numbers. The flat
          bar that used to sit here said the proportion a second time. */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-950/70 p-2.5 ring-1 ring-slate-800">
        <span className="text-xs font-semibold text-slate-400 tabular-nums">
          <span className="font-black text-white">{xp}</span> / {ceiling} XP
        </span>
        <Zap className="h-4 w-4 shrink-0 fill-amber-400/30 text-amber-400" />
      </div>
    </Link>
  );
}
