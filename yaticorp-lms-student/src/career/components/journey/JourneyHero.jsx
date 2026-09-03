import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Compass } from 'lucide-react';
import CurrentMission from './CurrentMission';
import YatiMascot from '../game/YatiMascot';
import { phaseStates, journeyPercent } from '../../utils/roadmap';

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
 * going, and what to do about it today.
 *
 * Text left, action right, YATI beside the action. The mascot used to be
 * absolutely positioned in the corner, which left a wide dead gap between the
 * goal and the edge; laying it in the same row closes that gap and puts the
 * character next to the thing it is pointing at.
 */
export default function JourneyHero({
  goal,
  roadmapData,
  completedPhases = [],
  name,
  greeting,
  task,
  completedToday = 0,
  totalToday = 0
}) {
  const phases = roadmapData?.educationRoadmap || [];
  const states = phaseStates(phases.length, completedPhases);
  const currentIndex = states.indexOf('current');
  const percent = journeyPercent(phases.length, completedPhases);
  const firstName = name?.split(' ')[0];
  const hasRoadmap = phases.length > 0;

  return (
    <section className="fp-journey-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-float sm:p-6">
      <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between xl:gap-10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-journey-200">
            {greeting}
            {firstName ? (
              <>
                , <span className="font-black text-white">{firstName}</span> 👋
              </>
            ) : (
              ' 👋'
            )}
          </p>

          <h1 className="mt-1 text-2xl leading-tight font-black sm:text-3xl">
            {goal?.careerGoal || 'Your career goal'}
          </h1>

          {/* One meta line instead of a track, a percentage and a phase panel.
              The strip below draws all three properly. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-journey-100">
            <Compass className="h-3.5 w-3.5 shrink-0" />
            {hasRoadmap ? (
              <>
                <span className="tabular-nums">
                  {currentIndex >= 0
                    ? `Phase ${currentIndex + 1} of ${phases.length}`
                    : 'Every phase complete 🎉'}
                </span>
                <span aria-hidden className="text-journey-300">·</span>
                <span className="tabular-nums">{percent}% complete</span>
              </>
            ) : (
              <span>Your path hasn&apos;t been mapped yet</span>
            )}
            {goal?.dreamCompany && (
              <span className="ml-1 inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-fuchsia-300" />
                {goal.dreamCompany}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <CurrentMission task={task} completedToday={completedToday} totalToday={totalToday} />

            {/* Only when there is nothing to view yet. Once a roadmap exists
                the strip directly below owns that link, and this became the
                third copy of it on one screen. */}
            {!hasRoadmap && (
              <Link
                to="/career/roadmap"
                className="fp-press group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/25"
              >
                Build my roadmap
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          <div aria-hidden className="hidden w-28 shrink-0 lg:block">
            <YatiMascot mood={task ? 'pointing' : 'happy'} float />
          </div>
        </div>
      </div>
    </section>
  );
}
