import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Trophy, RotateCcw, Zap, HelpCircle, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Mascot from '../mascot/Mascot';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// One burst of confetti: colour, where it starts across the panel, when.
const CONFETTI = [
  ['#7c3aed', 6, 0], ['#f472b6', 18, 0.12], ['#fbbf24', 30, 0.05], ['#34d399', 42, 0.18],
  ['#60a5fa', 54, 0.08], ['#f97316', 66, 0.22], ['#a78bfa', 78, 0.14], ['#fde68a', 90, 0.3],
  ['#f472b6', 24, 0.34], ['#34d399', 72, 0.26], ['#60a5fa', 48, 0.4], ['#fbbf24', 84, 0.36]
];

/** A small ring for "how much of the quiz is answered". */
function Ring({ percent, tone = '#6c3bff' }) {
  const size = 40;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-journey-100" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (Math.max(0, Math.min(100, percent)) / 100) * c}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  );
}

// One colour per letter, written out for Tailwind's scanner.
const LETTER_TONES = [
  'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30',
  'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/30',
  'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30',
  'bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-md shadow-pink-500/30',
  'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30',
  'bg-gradient-to-br from-fuchsia-400 to-purple-600 text-white shadow-md shadow-fuchsia-500/30'
];

/** The positions 0..n-1, in place. */
const identity = (n) => Array.from({ length: n }, (_, i) => i);

/** The same positions, shuffled (Fisher–Yates), never the same order twice in a row. */
const shuffled = (n, avoid) => {
  if (n < 2) return identity(n);
  let out;
  do {
    out = identity(n);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  } while (avoid && out.every((v, i) => v === avoid[i]));
  return out;
};

/**
 * Multiple-choice quiz for one skill, one question at a time.
 *
 * Answers are graded on the server — this component never receives the answer
 * key until it submits, so the correct options are not sitting in the page
 * source for a curious student to read. That is why the questions are still
 * graded together at the end: the page cannot mark a single answer on its own.
 *
 * What changed is the presentation. Five questions used to arrive as one
 * long column, which reads as a form; now there is one card, a step counter,
 * and picking an answer opens the way to the next. After grading the same
 * card walks back through the questions, each coloured by how it went.
 *
 * `requireAllCorrect` only changes what the student is TOLD. The threshold
 * itself lives on the server — a task lesson demands every answer, the
 * skill-level revision quiz still passes at 60%.
 */
export default function QuizRunner({ material, onSubmit, submitting, requireAllCorrect = false }) {
  const questions = material?.quiz || [];
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [index, setIndex] = useState(0);
  // Which way the card is travelling, so it can slide in from that side.
  const [dir, setDir] = useState('right');
  // Per question, the order its options are shown in, as original positions.
  // The first attempt keeps the author's order; every retry shuffles, so a
  // second pass cannot be answered from memory of "it was B".
  //
  // Answers are always stored and submitted as ORIGINAL positions — the
  // server grades by those and knows nothing about the shuffle.
  const [order, setOrder] = useState(() => (material?.quiz || []).map((q) => identity(q.options.length)));

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
    setIndex(0);
    setOrder((material?.quiz || []).map((q) => identity(q.options.length)));
  }

  // Tell the mascot: a quiz has begun (it wishes luck, then thinks beside
  // it), and how it ended (it dances or droops-then-encourages).
  useEffect(() => {
    if (!questions.length) return undefined;
    window.dispatchEvent(new CustomEvent('mascot:quiz-start'));
    return () => window.dispatchEvent(new CustomEvent('mascot:quiz-end'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?._id]);
  useEffect(() => {
    if (result) window.dispatchEvent(new CustomEvent('mascot:quiz-result', { detail: { passed: result.passed } }));
  }, [result]);

  if (!questions.length) return null;

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;
  const isLast = index === total - 1;
  const question = questions[index];
  const picked = answers[index];
  const outcome = result?.results?.[index];

  const go = (next) => {
    setDir(next > index ? 'right' : 'left');
    setIndex(Math.max(0, Math.min(total - 1, next)));
  };

  const handleSubmit = async () => {
    const ordered = questions.map((_, i) => (i in answers ? answers[i] : null));
    const data = await onSubmit(ordered);
    if (data) {
      setResult(data);
      setDir('left');
      setIndex(0);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setDir('left');
    setIndex(0);
    setOrder((prev) => questions.map((q, i) => shuffled(q.options.length, prev[i])));
  };

  const shownOrder = order[index] || identity(question.options.length);

  const answeredPct = Math.round((answeredCount / total) * 100);
  const scorePct = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div data-guide="quiz" className="relative space-y-4 overflow-hidden rounded-3xl bg-gradient-to-br from-journey-50 via-surface to-pink-50 p-4 ring-1 ring-journey-100 ring-inset sm:p-5">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
      />

      {/* ---- Where they are in the quiz ---- */}
      <div className="relative rounded-2xl bg-surface/90 px-4 py-3 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <Ring percent={result ? scorePct : answeredPct} tone={result ? (result.passed ? '#19b96b' : '#f59e0b') : '#6c3bff'} />
            <span>
              <span className="block text-[0.68rem] font-black tracking-[0.14em] text-journey-600 uppercase">
                {result ? 'Reviewing' : 'Question'} {index + 1} of {total}
              </span>
              <span className="block text-xs font-semibold text-ink-500 tabular-nums">
                {result ? `${result.score} / ${result.total} correct` : `${answeredCount} answered · ${total - answeredCount} to go`}
              </span>
            </span>
          </span>
          {!result && (
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-black text-amber-700 ring-1 ring-amber-100 ring-inset sm:inline-flex">
              <Zap className="h-3 w-3" />
              Pass to finish the task
            </span>
          )}
        </div>
        {/* One segment per question: filled once answered; after grading,
            green or red by how it went. The current one is outlined. */}
        <div className="flex gap-1">
          {questions.map((_, i) => {
            const r = result?.results?.[i];
            const tone = r
              ? r.correct
                ? 'bg-emerald-500'
                : 'bg-rose-400'
              : i in answers
                ? 'bg-brand-500'
                : 'bg-surface-200';
            return (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}`}
                className={`h-1.5 flex-1 rounded-full transition-all ${tone} ${
                  i === index ? 'ring-2 ring-journey-300 ring-offset-1' : ''
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ---- Score banner, after grading ---- */}
      {result && (
        <div
          className={`animate-scale-in relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
            result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          {result.passed &&
            CONFETTI.map(([color, left, delay], i) => (
              <span
                key={i}
                aria-hidden
                className="fp-confetti"
                style={{ left: `${left}%`, background: color, animationDelay: `${delay}s` }}
              />
            ))}
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mascot
                pose={result.passed ? 'star' : 'flex'}
                height={72}
                motion={result.passed ? 'mc-dance' : 'mc-encourage'}
                className="shrink-0"
              />
              <div>
                <p className="text-lg font-black text-ink-900">
                  {result.passed ? 'You passed!' : 'Almost there'}{' '}
                  <span className="text-sm font-bold text-ink-500 tabular-nums">
                    {result.score} / {result.total} correct
                  </span>
                </p>
                <p className="text-sm text-ink-600">
                  {result.passed
                    ? 'Passed — nice work. Step through to see each answer.'
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

      {/* ---- The one question on screen ---- */}
      <div
        key={`${result ? 'r' : 'q'}-${index}`}
        className={`relative overflow-hidden rounded-2xl border border-line-200/80 bg-surface p-4 shadow-card sm:p-5 ${
          dir === 'right' ? 'fp-page-in-right' : 'fp-page-in-left'
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1.5 ${
            outcome
              ? outcome.correct
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : 'bg-gradient-to-r from-rose-400 to-pink-500'
              : 'bg-gradient-to-r from-journey-500 via-fuchsia-500 to-indigo-500'
          }`}
        />
        <div className="mb-4 flex gap-3.5 pt-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-md shadow-journey-500/30">
            <HelpCircle className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.66rem] font-black tracking-[0.14em] text-journey-600 uppercase">
              Question {index + 1}
            </p>
            <p className="mt-0.5 text-base leading-snug font-black text-ink-900 sm:text-lg">{question.question}</p>
          </div>
        </div>

        <div className="space-y-2">
          {shownOrder.map((oi, pos) => {
            const option = question.options[oi];
            const selected = picked === oi;
            const isAnswer = outcome && oi === outcome.correctIndex;
            const wrongPick = outcome && selected && !outcome.correct;

            // After grading, colour is meaning: green = the right answer,
            // red = what they picked and got wrong.
            let tone = 'border-line-200 bg-surface hover:-translate-y-0.5 hover:border-journey-300 hover:bg-journey-50/40 hover:shadow-md';
            if (result) {
              if (isAnswer) tone = 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200';
              else if (wrongPick) tone = 'border-rose-300 bg-rose-50';
              else tone = 'border-line-200 bg-surface opacity-60';
            } else if (selected) {
              tone = 'animate-pop-in border-journey-500 bg-journey-50 ring-2 ring-journey-200 shadow-md shadow-journey-500/15';
            }

            return (
              <button
                key={oi}
                type="button"
                disabled={!!result}
                onClick={() => setAnswers((prev) => ({ ...prev, [index]: oi }))}
                style={{ animationDelay: `${0.05 + pos * 0.05}s` }}
                className={`animate-fade-in-up flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all disabled:cursor-default ${tone}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
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
                    <Check className="animate-badge-burst h-3.5 w-3.5" strokeWidth={3} />
                  ) : wrongPick ? (
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : selected ? (
                    <Check className="animate-pop-in h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    LETTERS[pos]
                  )}
                </span>
                <span className={`pt-0.5 ${selected && !result ? 'font-bold text-ink-900' : 'text-ink-700'}`}>{option}</span>
                {selected && !result && (
                  <Sparkles className="ml-auto h-4 w-4 shrink-0 self-center text-journey-500" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {outcome?.explanation && (
          <p className="animate-fade-in-up mt-3 rounded-lg bg-surface-50 p-3 text-sm leading-relaxed text-ink-600">
            <span className="font-semibold text-ink-900">Why: </span>
            {outcome.explanation}
          </p>
        )}

        {/* ---- Back / next / submit ---- */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-100 pt-4">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            Back
          </Button>

          {result ? (
            !isLast ? (
              <Button size="sm" variant="secondary" onClick={() => go(index + 1)}>
                Next answer
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <span className="text-sm text-ink-500">That was the last one.</span>
            )
          ) : !isLast ? (
            <Button
              size="sm"
              disabled={picked === undefined}
              onClick={() => go(index + 1)}
              className={picked !== undefined ? 'fp-btn fp-btn-primary' : ''}
            >
              Next question
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered}
                loading={submitting}
                loadingText="Checking…"
                icon={Check}
                className={allAnswered ? 'fp-btn fp-btn-primary fp-glow-violet' : ''}
              >
                Submit answers
              </Button>
            </div>
          )}
        </div>
      </div>

      {!result && requireAllCorrect && (
        <p className="relative text-center text-xs font-semibold text-ink-500">
          Every answer must be correct to finish this task — take your time, there is no timer.
        </p>
      )}
    </div>
  );
}
