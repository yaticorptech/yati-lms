import { Check, MonitorPlay, FileText, HelpCircle, PartyPopper, ArrowRight, Zap } from 'lucide-react';

/**
 * The three gates, made visible — as a journey rather than a status readout.
 *
 * Automatic completion is only reassuring if the student can see what it is
 * waiting on. Without this strip, a task that has not finished itself looks
 * broken rather than incomplete.
 *
 * Drawn as a connected stepper because that is what makes it pull: a rail that
 * is two-thirds full is a thing people want to finish, where three separate
 * chips are just three separate facts. The current step is called out
 * explicitly, so there is never a question of what to do next.
 *
 * A step the lesson does not have (no video resolved, no quiz generated) is
 * omitted entirely rather than shown as permanently unmet.
 */
const STEP_META = {
  video: {
    icon: MonitorPlay,
    label: 'Watch',
    // Spliced into "Next up: …", so these are imperatives.
    action: 'watch the video',
    // Spliced into "once you've …", so these are past participles.
    pending: 'watched the video'
  },
  notes: {
    icon: FileText,
    label: 'Read',
    action: 'read the notes',
    pending: 'read the notes'
  },
  quiz: {
    icon: HelpCircle,
    label: 'Quiz',
    action: 'get every quiz answer right',
    pending: 'answered every quiz question correctly'
  }
};

export default function LessonSteps({ gates, completed }) {
  if (!gates) return null;

  const steps = [
    gates.needsVideo && { key: 'video', done: gates.videoWatched },
    gates.needsNotes && { key: 'notes', done: gates.notesRead },
    gates.needsQuiz && { key: 'quiz', done: gates.quizPassed }
  ].filter(Boolean);

  if (!steps.length) return null;

  const doneCount = steps.filter((s) => s.done).length;
  // The first unfinished step. Highlighting it is the difference between a
  // progress display and an instruction.
  const currentIndex = steps.findIndex((s) => !s.done);
  const remaining = steps.filter((s) => !s.done);

  // Every gate met counts as finished even if the task object in the list has
  // not caught up yet — there is a beat between the last gate landing and the
  // planner learning about it, and during it `currentIndex` is -1. Reading
  // `steps[-1].key` in that beat would blow up the panel at the exact moment
  // the student earned the completion.
  const finished = completed || currentIndex === -1;

  // Rail fill sits at the centre of the last completed circle, so the line
  // stops where the eye expects rather than overshooting into the next step.
  const railPercent = steps.length > 1 ? (doneCount / (steps.length - 1)) * 100 : doneCount * 100;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset transition-colors ${
        finished
          ? 'bg-gradient-to-r from-emerald-50 via-surface to-teal-50 ring-emerald-200'
          : 'bg-gradient-to-r from-journey-50 via-surface to-brand-50 ring-journey-100'
      }`}
    >
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-journey-200/40 blur-3xl"
      />
      <div className="relative mb-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.68rem] font-black tracking-[0.14em] text-journey-600 uppercase">
          <Zap className="h-3.5 w-3.5 fill-amber-200 text-amber-500" />
          {finished ? 'Lesson complete' : 'Your progress'}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums ${
            finished ? 'bg-solid-emerald text-white' : 'bg-surface text-journey-700 ring-1 ring-journey-200 ring-inset'
          }`}
        >
          {doneCount} / {steps.length} steps
        </span>
      </div>

      {/* ---- The stepper ---- */}
      <div className="relative">
        {/* Rail. Inset by half a circle at each end so it runs between the
            circle centres instead of poking out past the first and last. */}
        {steps.length > 1 && (
          <div
            aria-hidden
            className="absolute top-6 right-0 left-0 mx-auto h-1 rounded-full bg-surface-200"
            style={{ width: `calc(100% - ${100 / steps.length}%)` }}
          >
            <div
              className="fp-stripes h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(100, railPercent)}%` }}
            />
          </div>
        )}

        <ol className="relative flex">
          {steps.map(({ key, done }, i) => {
            const { icon: Icon, label } = STEP_META[key];
            const isCurrent = i === currentIndex && !finished;

            return (
              <li key={key} className="flex flex-1 flex-col items-center gap-2 text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                    done
                      ? 'animate-step-land bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                      : isCurrent
                        ? 'fp-glow-violet scale-110 bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-500/40'
                        : 'bg-surface text-ink-400 ring-2 ring-line-200'
                  }`}
                >
                  {done ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.2} />
                  )}
                </span>

                <span
                  className={`text-xs font-black ${
                    done ? 'text-emerald-700' : isCurrent ? 'text-journey-700' : 'text-ink-400'
                  }`}
                >
                  {label}
                  {isCurrent && (
                    <span className="mt-0.5 block text-[0.6rem] font-bold tracking-[0.12em] text-journey-500 uppercase">
                      Now
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ---- What to do about it ---- */}
      <div className="relative mt-5">
        {finished ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-surface/90 px-4 py-3 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 ring-inset">
            <PartyPopper className="h-4 w-4" />
            Done and ticked off — nothing left to submit.
          </p>
        ) : (
          <p className="flex items-start gap-2.5 rounded-xl bg-surface/90 px-4 py-3 text-sm leading-relaxed text-ink-600 ring-1 ring-journey-100 ring-inset">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-journey-600" />
            <span>
            <span className="font-black text-ink-900">
              Next: {STEP_META[steps[currentIndex].key].action}.
            </span>{' '}
            {remaining.length > 1 ? (
              <>
                This task ticks itself off once you&apos;ve{' '}
                {remaining.map((s) => STEP_META[s.key].pending).join(' and ')}.
              </>
            ) : (
              <>That&apos;s the last step — the task completes itself the moment you do.</>
            )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
