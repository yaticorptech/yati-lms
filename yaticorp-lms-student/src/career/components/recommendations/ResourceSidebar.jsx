import { useId } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Flag, Quote,
  Award, Flame, CheckCircle, TrendingUp, Target, Zap, Rocket as RocketIcon, Crown
} from 'lucide-react';

/*
 * badge.icon is a lucide component name from the server ("CheckCircle",
 * "TrendingUp"), not an emoji. Rendering it raw printed the string itself into
 * the hexagon, which clipped to "eckCi". Same map the Rewards page uses.
 */
const ICONS = { Award, Flame, CheckCircle, TrendingUp, Target, Zap, Rocket: RocketIcon, Crown };
import { levelProgress } from '../../utils/progress';

/** 🚀 A small rocket for the journey card. Original, drawn from primitives. */
function Rocket({ className = '' }) {
  const uid = useId();
  const body = `rk-${uid}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={body} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      <path d="M32 4 c9 8 13 19 13 30 l-26 0 c0 -11 4 -22 13 -30z" fill={`url(#${body})`} />
      <circle cx="32" cy="24" r="6" fill="#4f46e5" />
      <path d="M19 34 l-8 8 8 0z" fill="#a5b4fc" />
      <path d="M45 34 l8 8 -8 0z" fill="#a5b4fc" />
      <path d="M26 34 l6 14 6 -14z" fill="#fb923c" />
      <path d="M29 38 l3 8 3 -8z" fill="#fde047" />
    </svg>
  );
}

/**
 * Where the student stands, what they have won, and one line worth reading.
 *
 * Every number here is the real one: level and XP come from the same
 * levelProgress() the hero and sidebar use, so this card cannot drift from
 * them, and the badges are whatever /badges says is unlocked.
 */
export default function ResourceSidebar({ user, badges = [] }) {
  // levelProgress returns nextLevel but not level — the current one comes from
  // the profile, and reading progress.level here silently rendered "Level
  // undefined".
  const level = Math.max(1, Number(user?.level) || 1);
  const progress = levelProgress(user?.xp, level);
  const unlocked = badges.filter((b) => b.unlocked);
  const shown = unlocked.slice(0, 3);

  return (
    <aside className="space-y-4">
      {/* ---- Your journey ---------------------------------------------- */}
      <section className="overflow-hidden rounded-3xl border border-line-200 bg-surface p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-black text-ink-900">
          <Flag className="h-4 w-4 text-journey-600" />
          Your journey
        </h2>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black text-ink-900">Level {level}</p>
            <p className="mt-1 text-xs font-bold text-ink-500 tabular-nums">
              {progress.xp} / {progress.ceiling} XP
            </p>
          </div>
          <Rocket className="h-12 w-12 shrink-0" />
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-100">
          <div
            className="fp-journey-gradient h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="mt-4 border-t border-line-100 pt-3">
          <p className="text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
            Next reward
          </p>
          <p className="mt-1 text-sm font-bold text-ink-700">
            Reach Level {progress.nextLevel}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-ink-500 tabular-nums">
            {progress.remaining} XP to go
          </p>
        </div>
      </section>

      {/* ---- Badges earned --------------------------------------------- */}
      <section className="rounded-3xl border border-line-200 bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-ink-900">Badges earned</h2>
          <Link
            to="/career/badges"
            className="group inline-flex items-center gap-1 text-xs font-black text-journey-700 hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {unlocked.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            None yet — finish tasks from your plan and the first one unlocks itself.
          </p>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            {shown.map((badge, i) => {
              const Icon = ICONS[badge.icon] || Award;
              return (
                <span
                  key={i}
                  title={badge.title}
                  className="flex h-14 w-14 shrink-0 items-center justify-center bg-gradient-to-br from-journey-400 to-indigo-600 text-white"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'
                  }}
                >
                  <Icon className="h-6 w-6" />
                </span>
              );
            })}
            {unlocked.length > shown.length && (
              <span className="text-xs font-black text-ink-500 tabular-nums">
                +{unlocked.length - shown.length} more
              </span>
            )}
          </div>
        )}
      </section>

      {/* ---- One line worth keeping ------------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
        <Quote aria-hidden className="absolute -top-1 right-3 h-10 w-10 text-amber-300/60" />
        <p className="relative text-sm leading-relaxed font-black text-ink-900">
          The future depends on what you do today.
        </p>
        <p className="relative mt-2 text-xs font-semibold text-ink-500">— Mahatma Gandhi</p>
      </section>
    </aside>
  );
}
