import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { buildSpellings } from '../../data/genSpellings';

/**
 * ✍️ Vocabulary: exactly one of these four is spelled correctly.
 *
 * Sixty words per band, their misspellings generated (genSpellings.js) from
 * the mistakes people actually make, so the pool no longer wraps by level
 * four.
 */
export default function SpellingFix({ onExit }) {
  const questions = useMemo(
    () =>
      buildSpellings().map((q) => ({
        answer: q.answer,
        options: q.options,
        note: `"${q.answer}" is the correct spelling.`,
        level: q.level,
        tier: q.tier
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
