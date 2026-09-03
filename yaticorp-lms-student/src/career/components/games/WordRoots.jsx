import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { WORD_ROOTS } from '../../data/brainPuzzles';

/**
 * 🌱 Vocabulary: what a prefix or root means.
 *
 * Worth more than the twelve words it uses — knowing "bene-" unlocks a hundred
 * words the student has never met.
 */
export default function WordRoots({ onExit }) {
  const questions = useMemo(
    () =>
      WORD_ROOTS.map((q) => ({
        part: q.part,
        answer: q.answer,
        options: [q.answer, ...q.wrong],
        note: `${q.part} means "${q.answer}" — as in ${q.example}.`,
        level: q.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="word-roots"
      title="Word Roots"
      tone="bg-gradient-to-br from-purple-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className="text-4xl font-black tracking-wide text-ink-900">{q.part}</p>
          <p className="mt-2 text-sm font-semibold text-ink-500">What does this part mean?</p>
        </>
      )}
    />
  );
}
