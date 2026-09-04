import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { ODD_ONE_OUT } from '../../data/brainPuzzles';

/** 🧩 Logic & deduction: three of these belong together. One does not. */
export default function OddOneOut({ onExit }) {
  const questions = useMemo(
    () =>
      ODD_ONE_OUT.map((q) => ({
        answer: q.answer,
        options: q.items,
        note: q.why,
        level: q.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="odd-one-out"
      title="Odd One Out"
      tone="bg-gradient-to-br from-cyan-500 to-blue-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={() => (
        <p className="text-lg font-black text-ink-900">Which one does not belong?</p>
      )}
    />
  );
}
