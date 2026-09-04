import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SENTENCE_GAPS } from '../../data/brainPuzzles';

/** 📝 Vocabulary: pick the word that fits the sentence. */
export default function SentenceGap({ onExit }) {
  const questions = useMemo(
    () =>
      SENTENCE_GAPS.map((q) => ({
        text: q.text,
        answer: q.answer,
        options: [q.answer, ...q.wrong],
        note: q.text.replace('___', q.answer),
        level: q.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="sentence-gap"
      title="Sentence Gap"
      tone="bg-gradient-to-br from-pink-500 to-rose-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <p className="text-xl leading-relaxed font-bold text-ink-900">
          {q.text.split('___')[0]}
          <span className="mx-1 inline-block min-w-16 border-b-4 border-pink-400 align-bottom" />
          {q.text.split('___')[1]}
        </p>
      )}
    />
  );
}
