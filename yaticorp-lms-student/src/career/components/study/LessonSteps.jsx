import { Check, MonitorPlay, FileText, HelpCircle, PartyPopper } from 'lucide-react';

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
      className={`rounded-xl border p-5 transition-colors ${
        finished ? 'border-emerald-200 bg-emerald-50/70' : 'border-line-200 bg-surface-50/70'
      }`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          {finished ? 'Lesson complete' : 'Your progress'}
        </p>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
            finished ? 'bg-solid-emerald text-white' : 'bg-surface text-ink-600 ring-1 ring-line-200 ring-inset'
          }`}
        >
          {doneCount} / {steps.length}
        </span>
      </div>

      {/* ---- The stepper ---- */}
      <div className="relative">
        {/* Rail. Inset by half a circle at each end so it runs between the
            circle centres instead of poking out past the first and last. */}
        {steps.length > 1 && (
          <div
            aria-hidden
            className="absolute top-5 right-0 left-0 mx-auto h-[3px] rounded-full bg-surface-200"
            style={{ width: `calc(100% - ${100 / steps.length}%)` }}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    done
                      ? 'animate-step-land bg-emerald-500 text-white'
                      : isCurrent
                        ? 'animate-attention bg-surface text-link ring-2 ring-brand-500'
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
                  className={`text-xs font-bold ${
                    done ? 'text-emerald-700' : isCurrent ? 'text-link-strong' : 'text-ink-400'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ---- What to do about it ---- */}
      <div className="mt-5 border-t border-line-200/80 pt-4">
        {finished ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
            <PartyPopper className="h-4 w-4" />
            Done and ticked off — nothing left to submit.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-600">
            <span className="font-bold text-ink-900">
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
          </p>
        )}
      </div>
    </div>
  );
}
