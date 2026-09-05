import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import '../career/components/mascot/mascot.css';
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
      {/* The CareerPath mascot, seated. Tapping it asks the guide for help
          rather than following the card's link. */}
      <div id="mascot-home" className="flex min-h-[4.5rem] items-end justify-center">
        <span
          role="button"
          tabIndex={0}
          aria-label="CareerPath guide — need help?"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('mascot:ask'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('mascot:ask'));
            }
          }}
          className="mc-idle group relative inline-block cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span aria-hidden className="mc-glow absolute inset-x-2 bottom-0 h-4 rounded-full bg-blue-400/40 blur-lg" />
          <img
            src="/mascot/sit.png"
            alt=""
            draggable={false}
            className="relative h-[4.5rem] w-auto object-contain transition-transform group-hover:scale-110 select-none"
            style={{ filter: 'drop-shadow(0 10px 14px rgba(28, 95, 214, 0.35))' }}
          />
        </span>
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
