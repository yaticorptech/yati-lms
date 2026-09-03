import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Route, Clock, ArrowRight, Sparkles, Flag } from 'lucide-react';
import JourneyTrack from './journey/JourneyTrack';
import Card, { CardHeader } from './ui/Card';
import RoadmapPhase from './roadmap/RoadmapPhase';
import {
  phaseStates, journeyPercent, phaseTitle, parseChoices, phaseBrief
} from '../utils/roadmap';

export default function RoadmapDisplay({ data, goal, headerAction, completedPhases = [], onTogglePhase, onShareBadge, badgeBusy, saving }) {
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

  // Where the road begins, in the student's own words from onboarding. Only
  // the field their education level actually uses — a postgraduate can still
  // carry a stale `currentClass` from an earlier answer, and printing it would
  // start their journey at a class they left years ago.
  const startedFrom =
    goal?.educationLevel === 'Working Professional'
      ? goal?.currentJob || 'Working Professional'
      : ['Undergraduate', 'Postgraduate', 'Diploma'].includes(goal?.educationLevel)
        ? [goal?.degree, goal?.currentYear].filter(Boolean).join(' · ') || goal?.educationLevel
        : goal?.currentClass || goal?.educationLevel || null;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------
          The destination header.

          It used to open with "Your next move" and go straight to the phase
          the student is on — correct about what to do, silent about what any
          of it is for. A roadmap that never names the career it leads to is a
          list of school years. The goal comes first now, the whole journey is
          drawn under it, and the current phase sits inside that context
          instead of standing in for it.
      --------------------------------------------------------------- */}
      <section className="fp-journey-gradient animate-fade-in-up relative overflow-hidden rounded-3xl p-6 text-white shadow-float sm:p-8 lg:p-10">
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="fp-float-slow pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[0.68rem] font-black tracking-[0.18em] text-journey-300 uppercase">
                <Flag className="h-3.5 w-3.5" />
                Your road to
              </p>
              <h2 className="mt-1.5 text-3xl leading-[1.05] font-black sm:text-5xl">
                {goal?.careerGoal || 'your career goal'}
              </h2>
              <p className="mt-3 text-sm font-bold text-journey-200 tabular-nums">
                {phases.length} phases · {doneCount} complete · {percent}% of the way
              </p>
            </div>

            {/* Regenerate lives here rather than above the panel. The page used
                to open with "Your path, one step at a time" and a subtitle, and
                then immediately say the same thing again in the header below —
                two competing titles, neither of which named the destination. */}
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>

          {/* ---- The whole journey, at a glance. One progress device, not
                  three: this replaced a percentage, a bar and a track all
                  stacked in the same panel saying the same number. ---- */}
          <div
            className="mt-8"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Journey progress"
          >
            <JourneyTrack states={states} tone="dark" />
            <div className="mt-3 flex items-center justify-between gap-4 text-xs font-bold text-journey-300">
              <span className="flex items-center gap-1.5">
                <span className="text-sm" aria-hidden>🚀</span> Start
              </span>
              <span className="flex items-center gap-1.5">
                Goal <span className="text-sm" aria-hidden>🎯</span>
              </span>
            </div>
          </div>

          {/* ---- The step being stood on ---- */}
          <div className="mt-6 rounded-2xl bg-white/[0.09] p-4 ring-1 ring-white/12 ring-inset sm:p-5">
            {currentPhase ? (
              <>
                <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.16em] text-journey-200 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  You are here · phase {currentIndex + 1} of {phases.length}
                </p>
                <h3 className="mt-2 text-xl leading-snug font-black sm:text-2xl">
                  {currentChoices ? currentChoices.lead : currentTitle}
                </h3>

                {/* One line on what this phase is for. The description used to
                    sit here clamped to three lines, which explained the phase
                    to a student who had asked what to DO — so the banner
                    promising "your next move" answered with background
                    reading. */}
                {currentBrief && (
                  <p className="mt-2 max-w-2xl leading-relaxed text-journey-100">{currentBrief}</p>
                )}
              </>
            ) : (
              <h3 className="text-xl font-black sm:text-2xl">
                Every phase complete 🎉 — time to regenerate your roadmap
              </h3>
            )}

            {/* The timeline is a sentence, not a tag. It used to be a chip that
                truncated at "…+ 1 year transi…" at every width, turning the
                answer to "how long will this take me" into a tooltip nobody
                opens. */}
            {data.timeline && (
              <p className="mt-4 flex items-start gap-2 border-t border-white/10 pt-4 text-sm leading-relaxed text-journey-100">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span>
                  <span className="font-black text-white">Estimated journey</span> — {data.timeline}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          The journey itself.
      --------------------------------------------------------------- */}
      <Card className="animate-fade-in-up">
        <CardHeader icon={Route} title="Your step-by-step path" accent="journey" />

        {/* No single spine behind the list any more. Each phase draws the
            stretch of road below itself, so the line can be green where the
            journey is behind the student and grey where it is still ahead. */}
        <ol className="relative space-y-4">
          {/* ---- Where the road starts ----
              A journey drawn without a beginning starts mid-air. This is the
              stage the student told us they were at in onboarding, nothing
              more. ---- */}
          <li className="relative pl-14">
            <span
              aria-hidden="true"
              className="absolute -bottom-4 top-6 left-6 w-0.5 -translate-x-1/2 rounded-full bg-emerald-400"
            />
            <span
              aria-hidden="true"
              className="absolute top-2 left-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-400 ring-4 ring-emerald-50"
            />
            <p className="pt-0.5 text-[0.68rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
              Start{startedFrom ? ` · ${startedFrom}` : ''}
            </p>
          </li>

          {phases.map((stage, index) => (
            <RoadmapPhase
              key={index}
              stage={stage}
              index={index}
              isLast={false}
              state={states[index]}
              expanded={expanded === index}
              onToggleExpand={() => setExpanded(expanded === index ? null : index)}
              onToggleComplete={() => onTogglePhase?.(index)}
              onShareBadge={() => onShareBadge?.(index)}
              badgeBusy={badgeBusy === index}
              saving={saving}
            />
          ))}

          {/* ---- The destination ----
              The list used to stop on the last phase, which read as running out
              rather than arriving. The goal the student chose closes the road
              they have been looking at. ---- */}
          <li className="relative pl-14">
            <span
              className={`absolute left-1 top-0 flex h-10 w-10 items-center justify-center rounded-full ring-4 ${
                percent === 100
                  ? 'bg-emerald-500 text-white ring-emerald-50'
                  : 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 ring-amber-50'
              }`}
            >
              <Flag className="h-5 w-5" strokeWidth={2.6} />
            </span>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/60 px-4 py-3.5 sm:px-5">
              <p className="text-[0.68rem] font-bold tracking-[0.14em] text-amber-700 uppercase">
                Your destination
              </p>
              <p className="mt-0.5 text-base font-black text-ink-900 sm:text-lg">
                {goal?.careerGoal || 'Your career goal'}
              </p>
            </div>
          </li>
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
