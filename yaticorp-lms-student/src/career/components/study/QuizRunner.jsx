import { useState } from 'react';
import { Check, X, Trophy, RotateCcw, Zap } from 'lucide-react';
import Button from '../ui/Button';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Multiple-choice quiz for one skill.
 *
 * Answers are graded on the server — this component never receives the answer
 * key until it submits, so the correct options are not sitting in the page
 * source for a curious student to read.
 */
/**
 * `requireAllCorrect` only changes what the student is TOLD. The threshold
 * itself lives on the server — a task lesson demands every answer, the
 * skill-level revision quiz still passes at 60%.
 */
export default function QuizRunner({ material, onSubmit, submitting, requireAllCorrect = false }) {
  const questions = material?.quiz || [];
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // Switching skills must not carry the previous quiz's answers over.
  //
  // Adjusted during render against a remembered id rather than reset from an
  // effect. An effect would let one frame paint with the old answers attached
  // to the new quiz's questions, and it costs a second render every time.
  // https://react.dev/learn/you-might-not-need-an-effect
  const [quizId, setQuizId] = useState(material?._id);
  if (material?._id !== quizId) {
    setQuizId(material?._id);
    setAnswers({});
    setResult(null);
  }

  if (!questions.length) return null;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const handleSubmit = async () => {
    const ordered = questions.map((_, i) => (i in answers ? answers[i] : null));
    const data = await onSubmit(ordered);
    if (data) setResult(data);
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="space-y-5">
      {/* How far through the quiz they are, while they are in it.
          A five-question quiz with no visible end looks longer than it is, and
          "3 of 5" a scroll away at the submit button is too late to be the
          thing that keeps someone going. */}
      {!result && (
        <div className="rounded-xl border border-line-200 bg-surface-50/70 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-[0.1em] text-ink-500 uppercase">
              {allAnswered ? 'All answered' : 'Answered'}
            </span>
            <span className="text-xs font-bold text-ink-600 tabular-nums">
              {answeredCount} / {questions.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                allAnswered ? 'bg-emerald-500' : 'bg-brand-500'
              }`}
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Score banner, shown only after grading. */}
      {result && (
        <div
          className={`animate-scale-in rounded-xl border p-5 ${
            result.passed
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  result.passed ? 'bg-solid-emerald text-white' : 'bg-amber-500 text-white'
                }`}
              >
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-ink-900">
                  {result.score} / {result.total} correct
                </p>
                <p className="text-sm text-ink-600">
                  {result.passed
                    ? 'Passed — nice work.'
                    : requireAllCorrect
                      ? `${result.total - result.score} to fix. Every answer must be correct to finish this task.`
                      : 'Not quite yet. Review the notes and try again.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {result.xpAwarded > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-700">
                  <Zap className="h-4 w-4" />+{result.xpAwarded} XP
                </span>
              )}
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleRetry}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {questions.map((question, qi) => {
        const outcome = result?.results?.[qi];

        return (
          <div key={question._id || qi} className="rounded-xl border border-line-200/80 p-4 sm:p-5">
            <p className="mb-3.5 flex gap-2.5 font-semibold text-ink-900">
              <span className="text-ink-400">{qi + 1}.</span>
              <span>{question.question}</span>
            </p>

            <div className="space-y-2">
              {question.options.map((option, oi) => {
                const selected = answers[qi] === oi;
                const isAnswer = outcome && oi === outcome.correctIndex;
                const wrongPick = outcome && selected && !outcome.correct;

                // After grading, colour is meaning: green = the right answer,
                // red = what they picked and got wrong.
                let tone = 'border-line-200 hover:border-brand-300 hover:bg-brand-50/40';
                if (result) {
                  if (isAnswer) tone = 'border-emerald-300 bg-emerald-50';
                  else if (wrongPick) tone = 'border-rose-300 bg-rose-50';
                  else tone = 'border-line-200 opacity-60';
                } else if (selected) {
                  tone = 'border-brand-500 bg-brand-50 ring-1 ring-brand-200';
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={!!result}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-all disabled:cursor-default ${tone}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        isAnswer
                          ? 'bg-solid-emerald text-white'
                          : wrongPick
                            ? 'bg-solid-rose text-white'
                            : selected
                              ? 'bg-brand-600 text-white'
                              : 'bg-surface-100 text-ink-500'
                      }`}
                    >
                      {isAnswer ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : wrongPick ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        LETTERS[oi]
                      )}
                    </span>
                    <span className="text-ink-700">{option}</span>
                  </button>
                );
              })}
            </div>

            {outcome?.explanation && (
              <p className="mt-3 rounded-lg bg-surface-50 p-3 text-sm leading-relaxed text-ink-600">
                <span className="font-semibold text-ink-900">Why: </span>
                {outcome.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!result && (
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            loading={submitting}
            loadingText="Checking…"
            icon={Check}
          >
            Submit answers
          </Button>
          <span className="text-sm text-ink-500">
            {allAnswered
              ? requireAllCorrect
                ? 'All answered — every one must be correct.'
                : 'All questions answered.'
              : `${answeredCount} of ${questions.length} answered`}
          </span>
        </div>
      )}
    </div>
  );
}
