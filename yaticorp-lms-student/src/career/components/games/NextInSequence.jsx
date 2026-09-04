import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SEQUENCES } from '../../data/brainPuzzles';

/** Three plausible wrong numbers around the true one. */
const distractors = (answer) => {
  const out = new Set();
  const drifts = [1, 2, 3, 4, 5, 6, 10];
  while (out.size < 3) {
    const d = drifts[Math.floor(Math.random() * drifts.length)];
    const candidate = answer + (Math.random() < 0.5 ? -d : d);
    if (candidate > 0 && candidate !== answer) out.add(candidate);
  }
  return [...out];
};

/** 🧩 Logic & deduction: spot the rule, then continue the run. */
export default function NextInSequence({ onExit }) {
  const questions = useMemo(
    () =>
      SEQUENCES.map((s) => ({
        run: s.run,
        answer: s.answer,
        options: [s.answer, ...distractors(s.answer)],
        note: s.rule
      })),
    []
  );

  return (
    <QuizGame
      gameId="next-in-sequence"
      title="Next in Sequence"
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {q.run.map((n, i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 text-lg font-black text-ink-900 tabular-nums"
            >
              {n}
            </span>
          ))}
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg font-black text-sky-700">
            ?
          </span>
        </div>
      )}
    />
  );
}
