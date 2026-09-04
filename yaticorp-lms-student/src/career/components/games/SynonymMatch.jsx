import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SYNONYMS } from '../../data/brainPuzzles';

/** 🔤 Vocabulary: pick the word that means the same. */
export default function SynonymMatch({ onExit }) {
  const questions = useMemo(
    () =>
      SYNONYMS.map((s) => ({
        word: s.word,
        answer: s.answer,
        options: [s.answer, ...s.wrong],
        note: `${s.word.charAt(0)}${s.word.slice(1).toLowerCase()} means "${s.answer.toLowerCase()}".`
      })),
    []
  );

  return (
    <QuizGame
      gameId="synonym-match"
      title="Synonym Match"
      tone="bg-gradient-to-br from-fuchsia-500 to-purple-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <p className="text-3xl font-black tracking-wide text-ink-900 sm:text-4xl">{q.word}</p>
      )}
    />
  );
}
