import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Compass, Flame } from 'lucide-react';
import CurrentMission from './CurrentMission';
import Mascot from '../mascot/Mascot';
import useMascotCycle, { LIVE_POSES, DONE_POSES } from '../mascot/useMascotCycle';
import { phaseStates, journeyPercent } from '../../utils/roadmap';
import { dailyBoost, DAY_DONE_LINE } from '../../utils/motivation';

/**
 * A greeting, where they are headed, and the one button to press.
 *
 * Deliberately small. It used to be a 470px gradient block carrying the goal,
 * a checkpoint track, a percentage, the streak, the level, the current phase
 * and two buttons — which made the page read as one heavy panel with some
 * cards underneath, rather than the light board of cards it should be.
 *
 * Almost everything it held is stated better below and in more detail:
 *
 *   the track and the current phase → the journey strip, which names them
 *   streak and level               → the momentum card, with the week and ring
 *   the way to the roadmap         → the strip's own "View roadmap"
 *
 * So this keeps only what nothing else says — who is looking, where they are
 * going, and what to do about it today — plus the two things that make a
 * student press the button: a line of encouragement and what the streak
 * stands to gain.
 *
 * Pale rather than dark, to match the Skills and Today's Plan banners; the
 * three pages a student sees most now open the same way.
 */
export default function JourneyHero({
  goal,
  roadmapData,
  completedPhases = [],
  name,
  greeting,
  task,
  completedToday = 0,
  totalToday = 0,
  streak = 0,
  countedToday = false
}) {
  const phases = roadmapData?.educationRoadmap || [];
  const states = phaseStates(phases.length, completedPhases);
  const currentIndex = states.indexOf('current');
  const percent = journeyPercent(phases.length, completedPhases);
  const firstName = name?.split(' ')[0];
  const hasRoadmap = phases.length > 0;
  const dayCleared = totalToday > 0 && completedToday >= totalToday;

  const look = useMascotCycle(dayCleared ? DONE_POSES : LIVE_POSES);

  // The streak, phrased as what today can do for it — never as a warning.
  const streakLine = countedToday
    ? streak > 1
      ? `${streak}-day streak, safe for today`
      : 'Streak started today'
    : streak > 0
      ? `Finish today's quest → ${streak + 1}-day streak`
      : "Finish today's quest → start a streak";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-brand-50 shadow-card ring-1 ring-journey-100 ring-inset">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute right-1/4 -bottom-24 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
      />

      <div className="relative flex items-center gap-6 p-5 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <p className="animate-fade-in-up text-sm font-semibold text-ink-500">
            {greeting}
            {firstName ? (
              <>
                , <span className="font-black text-ink-900">{firstName}</span> 👋
              </>
            ) : (
              ' 👋'
            )}
          </p>

          <h1 className="animate-fade-in-up mt-1 text-2xl leading-tight font-black text-ink-900 sm:text-3xl" style={{ animationDelay: '0.08s' }}>
            {goal?.careerGoal || 'Your career goal'}
          </h1>

          {/* One meta line instead of a track, a percentage and a phase panel.
              The strip below draws all three properly. */}
          <p className="animate-fade-in-up mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink-500" style={{ animationDelay: '0.14s' }}>
            <Compass className="h-3.5 w-3.5 shrink-0 text-journey-500" />
            {hasRoadmap ? (
              <>
                <span className="tabular-nums">
                  {currentIndex >= 0
                    ? `Phase ${currentIndex + 1} of ${phases.length}`
                    : 'Every phase complete 🎉'}
                </span>
                <span aria-hidden className="text-ink-300">·</span>
                <span className="tabular-nums text-journey-700">{percent}% complete</span>
              </>
            ) : (
              <span>Your path hasn&apos;t been mapped yet</span>
            )}
            {goal?.dreamCompany && (
              <span className="ml-1 inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-pink-500" />
                {goal.dreamCompany}
              </span>
            )}
          </p>

          <div className="animate-fade-in-up mt-3 flex flex-wrap items-center gap-2" style={{ animationDelay: '0.2s' }}>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-journey-100/60 px-2.5 py-1 text-xs font-bold text-journey-700">
              <span aria-hidden>{dayCleared ? '🏆' : '💪'}</span>
              {dayCleared ? DAY_DONE_LINE : dailyBoost()}
            </span>
            {totalToday > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-100 ring-inset">
                <Flame className="h-3.5 w-3.5 fill-orange-300 text-orange-500" />
                {streakLine}
              </span>
            )}
          </div>

          {/* The action sits with the words that explain it, not alone across
              the panel: a button in the middle of empty space reads as lost
              rather than as important. */}
          <div className="animate-fade-in-up mt-4 flex flex-wrap items-center gap-2.5" style={{ animationDelay: '0.28s' }}>
            <CurrentMission task={task} completedToday={completedToday} totalToday={totalToday} />

            {/* Only when there is nothing to view yet. Once a roadmap exists
                the strip directly below owns that link, and this became the
                third copy of it on one screen. */}
            {!hasRoadmap && (
              <Link
                to="/career/roadmap"
                data-guide="build-roadmap"
                className="fp-btn fp-btn-soft group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm font-black text-journey-700 ring-1 ring-journey-200 ring-inset"
              >
                Build my roadmap
                <ArrowRight className="fp-btn-arrow h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Today at a glance, beside the mascot: how much of the day is done,
            drawn from the same task list the button reads. */}
        <div className="hidden shrink-0 items-center gap-5 md:flex">
          {totalToday > 0 && (
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface/80 px-4 py-3 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
                  <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" className="stroke-journey-100" />
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    fill="none"
                    stroke={dayCleared ? '#19b96b' : '#6c3bff'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(completedToday / totalToday) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`}
                    className="transition-[stroke-dasharray] duration-700 ease-out"
                  />
                </svg>
                <span className="absolute text-sm font-black tabular-nums text-ink-900">
                  {completedToday}/{totalToday}
                </span>
              </div>
              <span className="text-[0.62rem] font-black tracking-[0.12em] text-ink-400 uppercase">
                Today
              </span>
            </div>
          )}

          {/* The CareerPath mascot, changing pose every few seconds: lively
              while the day is in play, celebrating once it is cleared. */}
          <div className="relative hidden lg:block" aria-hidden>
            <span className="absolute inset-x-4 bottom-2 top-8 rounded-full bg-blue-300/40 blur-2xl" />
            <span className="fp-drift-icon absolute -top-3 -left-4 text-xl" style={{ animationDelay: '0s' }}>🚀</span>
            <span className="fp-drift-icon absolute top-6 -right-5 text-lg" style={{ animationDelay: '-1.7s' }}>⭐</span>
            <span className="fp-drift-icon absolute -bottom-1 -left-6 text-lg" style={{ animationDelay: '-3.2s' }}>💡</span>
            <Mascot key={look.pose} pose={look.pose} height={168} motion={look.motion} className="mc-pop relative" />
          </div>
        </div>
      </div>
    </section>
  );
}
