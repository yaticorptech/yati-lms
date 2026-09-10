import { useState, useMemo } from 'react';
import useCountUp from '../../hooks/useCountUp';
import { Link } from 'react-router-dom';
import { Route, Clock, ArrowRight, Sparkles, Flag, Zap, Map as MapIcon, CheckCircle2 } from 'lucide-react';
import JourneyTrack from './journey/JourneyTrack';
import Card, { CardHeader } from './ui/Card';
import JourneyMap from './roadmap/JourneyMap';
import { useParallax, useReveal } from './roadmap/useRoadmapMotion';
import { paletteFor } from './roadmap/palettes';
import PhaseDialog from './roadmap/PhaseDialog';
import {
  phaseStates, journeyPercent, phaseTitle, parseChoices, phaseBrief
} from '../utils/roadmap';

export default function RoadmapDisplay({ data, goal, completedPhases = [], onTogglePhase, onShareBadge, badgeBusy, saving }) {
  const phases = useMemo(() => data?.educationRoadmap || [], [data]);
  const states = useMemo(() => phaseStates(phases.length, completedPhases), [phases, completedPhases]);

  // Motion, all of it page-local — see roadmapMotion.css.
  const hero = useParallax(16);
  const mapReveal = useReveal();
  const nextUpReveal = useReveal();
  const currentIndex = states.indexOf('current');
  const percent = journeyPercent(phases.length, completedPhases);
  const shownPercent = useCountUp(percent, 900);

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
  // The phase brought to the front, if any. Opening one used to unroll it
  // inside the list; now the map stays put and the phase opens over it.
  const [openPhase, setOpenPhase] = useState(null);

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
      <section
        {...hero}
        className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-brand-50 shadow-card ring-1 ring-journey-100 ring-inset"
      >
        {/* Two depths, so the background separates from the card as the pointer
            crosses it rather than sliding with it. Both keep the ambient float
            they already had; the parallax only offsets them. */}
        <div
          aria-hidden
          className="fp-float fp-rm-orb pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-journey-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="fp-float-slow fp-rm-orb fp-rm-orb-far pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-pink-200/40 blur-3xl"
        />

        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-stretch">
          {/* ---- Where this road goes, and how far along it is ---- */}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="animate-fade-in-up flex items-center gap-2 text-[0.68rem] font-black tracking-[0.18em] text-journey-600 uppercase">
                  <Flag className="h-3.5 w-3.5" />
                  Your road to
                </p>
                <h2
                  className="animate-fade-in-up mt-1.5 text-2xl leading-tight font-black sm:text-3xl xl:text-4xl"
                  style={{ animationDelay: '0.06s' }}
                >
                  {/* The same live gradient the Planner and Ideas heroes use on
                      their headline. A third stop is what makes it read: the
                      shimmer travels through the middle colour, and across two
                      stops there is nothing to travel through. */}
                  <span className="fp-text-shimmer bg-gradient-to-r from-journey-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
                    {goal?.careerGoal || 'your career goal'}
                  </span>
                </h2>
              </div>
            </div>

            <div className="animate-fade-in-up mt-3 flex flex-wrap items-center gap-2" style={{ animationDelay: '0.12s' }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-black text-ink-700 shadow-card ring-1 ring-line-200/80 ring-inset">
                <MapIcon className="h-3.5 w-3.5 text-journey-500" />
                <span className="tabular-nums">{phases.length}</span> phases
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-black text-ink-700 shadow-card ring-1 ring-line-200/80 ring-inset">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="tabular-nums">{doneCount}</span> complete
              </span>
              {/* Breathing, because of the three chips this is the one a
                  student actually came to check — and it is the only one whose
                  number changes. */}
              <span className="fp-breathe inline-flex items-center gap-1.5 rounded-full bg-journey-600 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-journey-500/25">
                <span className="tabular-nums">{shownPercent}%</span> of the way
              </span>
            </div>

            {/* The timeline is a sentence, not a tag. It used to be a chip that
                truncated at every width, turning the answer to "how long will
                this take me" into a tooltip nobody opens. */}
            {data.timeline && (
              <p className="animate-fade-in-up mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-600" style={{ animationDelay: '0.18s' }}>
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                <span>
                  <span className="font-black text-ink-900">Estimated journey</span> — {data.timeline}
                </span>
              </p>
            )}

            {/* ---- The whole journey, at a glance. One progress device, not
                    three: this replaced a percentage, a bar and a track all
                    stacked in the same panel saying the same number. ---- */}
            <div
              className="animate-fade-in-up mt-5 rounded-2xl bg-surface/70 px-4 py-3.5 ring-1 ring-line-200/70 ring-inset"
              style={{ animationDelay: '0.24s' }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Journey progress"
            >
              <JourneyTrack states={states} tone="light" />
              <div className="mt-2.5 flex items-center justify-between gap-4 text-xs font-bold text-ink-500">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm" aria-hidden>🚀</span> Start
                </span>
                <span className="flex items-center gap-1.5">
                  Goal <span className="text-sm" aria-hidden>🎯</span>
                </span>
              </div>
            </div>
          </div>

          {/* ---- The step being stood on, as its own panel beside the road ---- */}
          <div
            className="animate-fade-in-up fp-attention relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface/90 p-5 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur"
            style={{ animationDelay: '0.3s' }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-journey-500 via-fuchsia-500 to-indigo-500"
            />
            {currentPhase ? (
              <>
                <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.16em] text-journey-600 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  You are here · phase {currentIndex + 1} of {phases.length}
                </p>
                <h3 className="mt-2 text-lg leading-snug font-black text-ink-900 sm:text-xl">
                  {currentChoices ? currentChoices.lead : currentTitle}
                </h3>

                {/* One line on what this phase is for. */}
                {currentBrief && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{currentBrief}</p>
                )}

                <div className="mt-auto pt-4">
                  {/* The map already shouts about where you are — a glow, two
                      pulse rings and a bouncing pin on the platform. What it
                      never said was what to *do*, and this was the only quiet
                      thing on a loud page. The violet glow matches the button's
                      own gradient rather than the warm beacon used on Today's
                      Plan, so the two never compete when both are on screen. */}
                  <Link
                    to="/career/planner"
                    className="fp-sweep fp-press fp-glow-violet fp-rm-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-journey-500/30 transition-all hover:from-journey-700 hover:to-indigo-700"
                  >
                    <Zap className="fp-bolt h-4 w-4 fill-amber-300 text-amber-300" />
                    Work on it today
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <p className="mt-2 text-center text-xs font-semibold text-ink-500">
                    Every finished task moves this phase along.
                  </p>
                </div>
              </>
            ) : (
              <h3 className="text-lg font-black text-ink-900 sm:text-xl">
                Every phase complete 🎉 — time to regenerate your roadmap
              </h3>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          The journey itself.
      --------------------------------------------------------------- */}
      {/* The ref sits on a wrapper because Card is a shared primitive that
          does not forward refs — and a reveal whose ref never lands would
          leave this card hidden for good. */}
      <div ref={mapReveal} className="fp-reveal">
      <Card className="overflow-hidden">
        <CardHeader
          icon={Route}
          title="Your step-by-step path"
          subtitle="Tap any platform to open that phase."
          accent="journey"
        />

        <JourneyMap
          phases={phases}
          states={states}
          startedFrom={startedFrom}
          goal={goal}
          percent={percent}
          onOpen={setOpenPhase}
        />

        {phases.length > 0 && (
          <Link
            ref={nextUpReveal}
            to="/career/planner"
            className="fp-reveal fp-rm-lift group mt-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 transition-colors hover:bg-brand-50"
          >
            <span>
              <span className="block text-sm font-bold text-ink-900">
                Turn this phase into daily tasks
              </span>
              <span className="mt-0.5 block text-sm text-ink-500">
                The planner breaks your roadmap into things you can do today.
              </span>
            </span>
            <ArrowRight className="fp-rm-icon h-5 w-5 shrink-0 text-link transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </Card>
      </div>

      {openPhase !== null && phases[openPhase] && (
        <PhaseDialog
          stage={phases[openPhase]}
          index={openPhase}
          total={phases.length}
          state={states[openPhase]}
          palette={paletteFor(openPhase)}
          onClose={() => setOpenPhase(null)}
          onToggleComplete={() => onTogglePhase?.(openPhase)}
          onShareBadge={() => onShareBadge?.(openPhase)}
          badgeBusy={badgeBusy === openPhase}
          saving={saving}
        />
      )}

      {/* Nothing below the timeline. Colleges, skills, subjects, projects,
          exams and career advice used to stack up under it, which buried the
          path itself under six cards of reference material — none of which is
          something you DO, all of which is something you look up. They live in
          Ideas & Resources now, which is the page for looking things up. */}

    </div>
  );
}
