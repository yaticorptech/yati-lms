import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SPELLINGS } from '../../data/brainPuzzles';

/** ✍️ Vocabulary: exactly one of these four is spelled correctly. */
export default function SpellingFix({ onExit }) {
  const questions = useMemo(
    () =>
      SPELLINGS.map((q) => ({
        answer: q.answer,
        options: [q.answer, ...q.wrong],
        note: `"${q.answer}" is the correct spelling.`,
        level: q.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="spelling-fix"
      title="Spelling Fix"
      tone="bg-gradient-to-br from-rose-500 to-pink-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={() => (
        <p className="text-lg font-black text-ink-900">Which one is spelled correctly?</p>
      )}
    />
  );
}
