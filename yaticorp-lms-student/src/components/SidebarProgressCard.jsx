import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { levelProgress } from '../career/utils/progress';

/**
 * The astronaut, drawn rather than downloaded.
 *
 * Original artwork and an inline SVG for the same reasons as the summit on the
 * calendar banner: about a kilobyte, no request, sharp at any size, and it
 * inherits the sidebar's own palette instead of being a flat PNG that stops
 * matching the moment the navy behind it changes.
 *
 * Decorative, so it is hidden from assistive technology — every fact on this
 * card is written next to it.
 */
function Astronaut() {
  // Gradient ids must be unique per instance. The desktop sidebar and the
  // mobile drawer both render this card and both stay in the DOM, so two
  // identical `id="sb-suit"` definitions existed at once — `url(#sb-suit)`
  // resolves to whichever the document holds first, and in the drawer that
  // was the hidden desktop copy, which paints nothing. The suit simply
  // vanished and left a helmet floating on its own.
  const uid = useId().replace(/:/g, '');
  const visorId = `sb-visor-${uid}`;
  const suitId = `sb-suit-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className="fp-float-settle h-20 w-20"
    >
      <defs>
        <linearGradient id={visorId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="55%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={suitId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Stars, few and uneven — a regular field reads as a texture, not space */}
      {[
        [16, 22, 1.7], [102, 30, 1.3], [26, 92, 1.4],
        [98, 88, 1.7], [58, 12, 1.2], [10, 60, 1.1]
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#a5b4fc" opacity="0.8" />
      ))}

      {/* Backpack */}
      <rect x="40" y="52" width="40" height="34" rx="12" fill="#94a3b8" />

      {/* Limbs, behind the torso so the joints need no drawing */}
      <rect x="24" y="58" width="20" height="12" rx="6" fill={`url(#${suitId})`} />
      <rect x="76" y="58" width="20" height="12" rx="6" fill={`url(#${suitId})`} />
      <rect x="43" y="84" width="13" height="24" rx="6.5" fill={`url(#${suitId})`} />
      <rect x="64" y="84" width="13" height="24" rx="6.5" fill={`url(#${suitId})`} />

      {/* Torso */}
      <rect x="36" y="50" width="48" height="42" rx="16" fill={`url(#${suitId})`} />
      {/* Chest panel */}
      <rect x="52" y="62" width="16" height="12" rx="3.5" fill="#475569" />
      <circle cx="57" cy="68" r="1.8" fill="#34d399" />
      <circle cx="63" cy="68" r="1.8" fill="#fbbf24" />

      {/* Helmet */}
      <circle cx="60" cy="40" r="26" fill={`url(#${suitId})`} />
      <circle cx="60" cy="40" r="19" fill={`url(#${visorId})`} />
      {/* Visor reflection — one soft sweep, not a shine on every curve */}
      <ellipse cx="53" cy="33" rx="8" ry="5.5" fill="#ffffff" opacity="0.32" transform="rotate(-28 53 33)" />

      {/* Antenna */}
      <line x1="60" y1="14" x2="60" y2="7" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="6" r="3.5" fill="#fbbf24" />
    </svg>
  );
}

/**
 * The sidebar's encouragement, and the one number behind it.
 *
 * Both values are the student's own: `xp` and `level` are written by the server
 * every time a task is completed. The ceiling is derived from the same ladder
 * the rest of the app uses rather than hard-coded, so it stays correct as the
 * thresholds widen.
 *
 * Rendered only when Career Path is switched on for this student — XP and
 * levels are that section's currency, and advertising a locked feature from
 * the sidebar of every page would be worse than showing nothing.
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
      className="group block rounded-2xl bg-slate-900/70 p-3.5 text-center ring-1 ring-slate-800 transition-colors hover:bg-slate-900 hover:ring-slate-700"
    >
      <div className="flex justify-center">
        <Astronaut />
      </div>

      <p className="mt-1 text-sm font-bold text-white">Keep going, champ!</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Every step today builds your tomorrow.
      </p>

      <div className="mt-3 rounded-xl bg-slate-950/70 p-2.5 ring-1 ring-slate-800">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-white">Level {level}</span>
          <Zap className="h-4 w-4 fill-amber-400/30 text-amber-400" />
        </div>

        <p className="mt-1 text-left text-xs font-semibold text-slate-400 tabular-nums">
          {xp} / {ceiling} XP
        </p>

        <div
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level ${level}, ${progress.percent}% to level ${progress.nextLevel}`}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-[width] duration-1000 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
