import { Link } from 'react-router-dom';
import { ArrowRight, Flag, Gift, Mountain, Trophy, Zap } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import BadgeMedallion from '../rewards/BadgeMedallion';
import { BADGE_ICONS, tierFor } from '../rewards/badgeTiers';
import { levelProgress } from '../../utils/progress';
import { progressOf, statusOf } from '../../utils/skills';

/**
 * The rail beside the skill list: four small cards that answer the questions
 * the list itself cannot.
 *
 *   OVERALL   how far along the whole tracker is
 *   XP        what all that work has paid, and what it pays next
 *   BADGES    what has already been earned for it
 *   BANNER    a reason to keep going
 *
 * Every number is real: the ring is the mean skill progress, the XP is the
 * user's running total against the next level from the same ladder the
 * backend uses, and the medallions are badges the server says are unlocked.
 */

function RailCard({ icon: Icon, label, tone, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line-200/80 bg-surface p-5 shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          {label}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Ring({ percent, size = 96, stroke = 10 }) {
  const shown = useCountUp(percent, 1100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-journey-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#6c3bff"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums text-ink-900">
        {shown}%
      </span>
    </div>
  );
}

/** A small summit, drawn inline so it takes the banner's palette. */
function SummitArt() {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMax slice">
      <path d="M0 120 L70 46 L110 84 L150 30 L220 120 Z" fill="#a78bfa" opacity="0.55" />
      <path d="M40 120 L120 40 L200 120 Z" fill="#7c3aed" opacity="0.75" />
      <path d="M120 40 L138 60 L128 60 L112 58 L104 56 Z" fill="#ffffff" opacity="0.9" />
      <path d="M120 40 L120 18" stroke="#fff" strokeWidth="2" />
      <path d="M120 18 L138 24 L120 30 Z" fill="#fb7185" />
      <path
        d="M60 120 C 90 100, 100 110, 112 86 S 128 70, 120 52"
        fill="none"
        stroke="#fde68a"
        strokeWidth="2.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
      <ellipse cx="34" cy="110" rx="26" ry="8" fill="#fff" opacity="0.5" />
      <ellipse cx="190" cy="106" rx="24" ry="7" fill="#fff" opacity="0.45" />
    </svg>
  );
}

export default function SkillRail({ skills = [], user, badges = [] }) {
  const total = skills.length;
  const completed = skills.filter((s) => statusOf(s) === 'completed').length;
  const avg = total ? Math.round(skills.reduce((sum, s) => sum + progressOf(s), 0) / total) : 0;

  const xp = Number(user?.xp) || 0;
  const level = levelProgress(xp, user?.level);
  const shownXp = useCountUp(xp, 1100);
  const xpWidth = useCountUp(level.percent, 1100);

  const earned = badges
    .filter((b) => b.unlocked)
    .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-4">
      {/* ---- OVERALL ---- */}
      <RailCard icon={Flag} label="Overall Progress" tone="bg-journey-50 text-journey-600 ring-journey-100">
        <div className="mt-4 flex items-center gap-4">
          <Ring percent={avg} />
          <div className="min-w-0">
            <p className="text-3xl leading-none font-black tabular-nums text-ink-900">
              {completed}
              <span className="text-lg text-ink-400"> / {total}</span>
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink-600">Skills mastered</p>
            <p className="mt-0.5 text-xs text-ink-400">Average progress across all skills</p>
          </div>
        </div>
        <Link
          to="/career/profile"
          className="fp-press group mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-journey-200 bg-journey-50/60 px-4 py-2.5 text-sm font-black text-journey-700 transition-colors hover:bg-journey-100"
        >
          View my progress
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </RailCard>

      {/* ---- XP ---- */}
      <RailCard
        icon={Zap}
        label="Your Skill XP"
        tone="bg-amber-50 text-amber-600 ring-amber-100"
        action={<Gift className="h-5 w-5 text-pink-500" aria-hidden />}
      >
        <p className="mt-3 text-3xl leading-none font-black tabular-nums text-ink-900">
          {shownXp.toLocaleString()} <span className="text-lg text-ink-500">XP</span>
        </p>
        <span
          role="progressbar"
          aria-valuenow={level.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to the next level"
          className="mt-3 block h-2 overflow-hidden rounded-full bg-surface-100"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-journey-400 to-indigo-600"
            style={{ width: `${xpWidth}%` }}
          />
        </span>
        <p className="mt-2 text-xs font-semibold text-ink-500">
          Level {level.nextLevel} at {level.ceiling.toLocaleString()} XP ·{' '}
          <span className="text-ink-400">{level.remaining.toLocaleString()} to go</span>
        </p>
      </RailCard>

      {/* ---- BADGES ---- */}
      <RailCard
        icon={Trophy}
        label="Recent Achievements"
        tone="bg-pink-50 text-pink-600 ring-pink-100"
        action={
          <Link to="/career/badges" className="text-xs font-bold text-link hover:underline">
            View all
          </Link>
        }
      >
        {earned.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {earned.map((badge, i) => {
              const tier = tierFor(badge.xpRequired);
              return (
                <li key={badge._id} className="flex flex-col items-center text-center">
                  <BadgeMedallion
                    icon={BADGE_ICONS[badge.icon] || Trophy}
                    tier={tier}
                    unlocked
                    size={56}
                    delay={0.08 * i}
                  />
                  <p className="mt-2 line-clamp-2 text-[0.7rem] leading-tight font-bold text-ink-900">
                    {badge.title}
                  </p>
                  {badge.xpRequired > 0 && (
                    <p className={`mt-0.5 rounded-md px-1.5 py-0.5 text-[0.62rem] font-black ${tier.chip}`}>
                      {badge.xpRequired} XP
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl bg-surface-50 px-3 py-2.5 text-xs font-semibold text-ink-500 ring-1 ring-line-100 ring-inset">
            Finish today&apos;s task to earn your first badge.
          </p>
        )}
      </RailCard>

      {/* ---- BANNER ---- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-journey-100 via-journey-50 to-pink-100 p-5 shadow-card ring-1 ring-journey-100 ring-inset">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-90">
          <SummitArt />
        </div>
        <div className="relative pb-16">
          <p className="flex items-center gap-1.5 text-xs font-bold text-journey-700">
            <Mountain className="h-3.5 w-3.5" />
            Small steps…
          </p>
          <p className="mt-1 text-xl leading-tight font-black text-ink-900">Big dreams!</p>
          <p className="mt-2 text-xs font-semibold text-ink-600">
            You&apos;re doing amazing!
            <br />
            Keep going! <span aria-hidden>✨</span>
          </p>
        </div>
      </section>
    </div>
  );
}
