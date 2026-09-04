import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SYLLOGISMS } from '../../data/brainPuzzles';

/**
 * 🧩 Logic & deduction: does the conclusion actually follow?
 *
 * Validity, not truth. Several conclusions are perfectly believable and still
 * do not follow, which is the trap the game exists to teach.
 */
export default function Deduction({ onExit }) {
  const questions = useMemo(
    () =>
      SYLLOGISMS.map((q) => ({
        premises: q.premises,
        conclusion: q.conclusion,
        answer: q.answer,
        options: ['Follows', 'Does not follow'],
        note: q.why,
        level: q.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="deduction"
      title="Deduction"
      tone="bg-gradient-to-br from-blue-600 to-indigo-800"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <div className="text-left">
          <ul className="space-y-1.5">
            {q.premises.map((line, i) => (
              <li key={i} className="rounded-xl bg-surface-50 px-3 py-2 text-sm font-semibold text-ink-700">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-900">
            Therefore: {q.conclusion}
          </p>
        </div>
      )}
    />
  );
}
