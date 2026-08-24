const STEP_LABEL = { video: 'Watch', notes: 'Read', quiz: 'Quiz' };

/**
 * How far into its lesson a task is, small enough to sit on a collapsed row.
 *
 * Without this every task in a list looks identical whether the student
 * watched the video an hour ago or has never opened it — and a half-finished
 * thing you cannot see is a half-finished thing you never come back to. Three
 * filled-in bars and "2 of 3 steps" is the whole pull.
 *
 * Shared by the planner list and the dashboard's focus list deliberately: two
 * copies of this would drift, and the drift would tell a student two different
 * stories about the same task on two different pages.
 *
 * Renders nothing when the task has no lesson yet — there is no progress to
 * report, and an empty rail reads as "you have done none of it" rather than
 * "there is nothing here yet".
 */
export default function LessonProgress({ lesson, className = '' }) {
  if (!lesson?.total) return null;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-1">
        {lesson.steps.map((step) => (
          <span
            key={step.key}
            title={`${STEP_LABEL[step.key]} — ${step.done ? 'done' : 'not yet'}`}
            className={`h-1.5 w-5 rounded-full transition-colors ${
              step.done ? 'bg-emerald-500' : 'bg-surface-200'
            }`}
          />
        ))}
      </span>
      <span className="text-xs font-bold text-ink-500 tabular-nums">
        {lesson.done} of {lesson.total} steps
      </span>
    </span>
  );
}
