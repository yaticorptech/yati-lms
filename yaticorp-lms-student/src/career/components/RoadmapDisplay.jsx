import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Route, Clock, ArrowRight } from 'lucide-react';
import Card, { CardHeader } from './ui/Card';
import RoadmapPhase from './roadmap/RoadmapPhase';
import {
  phaseStates, journeyPercent, phaseTitle, parseChoices, phaseBrief
} from '../utils/roadmap';

export default function RoadmapDisplay({ data, completedPhases = [], onTogglePhase, onShareBadge, badgeBusy, saving }) {
  const phases = useMemo(() => data?.educationRoadmap || [], [data]);
  const states = useMemo(() => phaseStates(phases.length, completedPhases), [phases, completedPhases]);
  const currentIndex = states.indexOf('current');
  const percent = journeyPercent(phases.length, completedPhases);

  // Every phase starts closed.
  //
  // The current one used to open itself on arrival, which meant landing on this
  // page with a wall of description, five steps, three milestones and two
  // pitfalls already unrolled — the shape of the whole path was buried under the
  // detail of one phase. Closed, the page opens as a list you can see the end
  // of, and the detail is one click away when it is wanted.
  //
  // Nothing re-opens it automatically either: ticking a phase off no longer
  // unrolls the next one, because that is the same wall arriving uninvited.
  const [expanded, setExpanded] = useState(null);

  if (!data) return null;

  const currentPhase = currentIndex >= 0 ? phases[currentIndex] : null;
  const currentTitle = currentPhase ? phaseTitle(currentPhase) : null;
  const currentChoices = currentTitle ? parseChoices(currentTitle) : null;
  const doneCount = new Set(completedPhases).size;

  const currentBrief = currentPhase ? phaseBrief(currentPhase) : null;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------
          Where you are. This answers "what do I do?" before any scrolling.
      --------------------------------------------------------------- */}
      <section className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-900 p-6 text-white shadow-float sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Route className="h-3.5 w-3.5" />
              Your next move
            </span>
            {data.timeline && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {data.timeline}
              </span>
            )}
          </div>

          {currentPhase ? (
            <>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                {currentChoices ? currentChoices.lead : currentTitle}
              </h2>

              {/* One line on what this phase is for. The description used to sit
                  here clamped to three lines, which explained the phase to a
                  student who had asked what to DO — so the banner promising
                  "your next move" answered with background reading. */}
              {currentBrief && (
                <p className="mt-2 max-w-2xl leading-relaxed text-brand-200">{currentBrief}</p>
              )}

              {/* No step list here. The banner states which phase you are on and
                  what it is for; the steps themselves live in that phase below,
                  where the full set is, rather than being previewed twice. */}
            </>
          ) : (
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
              Every phase complete — time to regenerate your roadmap
            </h2>
          )}

          <div className="mt-6 max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-brand-200">Journey progress</span>
              <span className="font-bold tabular-nums">
                {doneCount} of {phases.length} phases
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-white/15"
            >
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-[width] duration-1000 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          The journey itself.
      --------------------------------------------------------------- */}
      <Card className="animate-fade-in-up">
        <CardHeader icon={Route} title="Your step-by-step path" accent="brand" />

        <ol className="relative space-y-3">
          {/* Spine sits behind the nodes; the nodes are 8×8 at left-2, so its
              centre is left-6. */}
          <span
            aria-hidden="true"
            className="absolute top-4 bottom-4 left-6 w-0.5 -translate-x-1/2 bg-surface-200"
          />
          {phases.map((stage, index) => (
            <RoadmapPhase
              key={index}
              stage={stage}
              index={index}
              state={states[index]}
              expanded={expanded === index}
              onToggleExpand={() => setExpanded(expanded === index ? null : index)}
              onToggleComplete={() => onTogglePhase?.(index)}
              onShareBadge={() => onShareBadge?.(index)}
              badgeBusy={badgeBusy === index}
              saving={saving}
            />
          ))}
        </ol>

        {phases.length > 0 && (
          <Link
            to="/career/planner"
            className="group mt-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 transition-colors hover:bg-brand-50"
          >
            <span>
              <span className="block text-sm font-bold text-ink-900">
                Turn this phase into daily tasks
              </span>
              <span className="mt-0.5 block text-sm text-ink-500">
                The planner breaks your roadmap into things you can do today.
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-link transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </Card>

      {/* Nothing below the timeline. Colleges, skills, subjects, projects,
          exams and career advice used to stack up under it, which buried the
          path itself under six cards of reference material — none of which is
          something you DO, all of which is something you look up. They live in
          Ideas & Resources now, which is the page for looking things up. */}

    </div>
  );
}
