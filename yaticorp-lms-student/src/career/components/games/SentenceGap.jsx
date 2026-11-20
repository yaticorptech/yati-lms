import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { GAP_BANDS, bandOrDefault } from '../../data/bands/vocab';

/**
 * 📝 Vocabulary: pick the word that fits the sentence.
 *
 * Banded by age (2026-11-13, data/bands/vocab.js): four-to-six-word picture
 * sentences for Classes 1–2, simple sentences, then grammar in context,
 * complex sentences for Classes 9–10 and the exam bank for Classes 11–12.
 */
export default function SentenceGap({ onExit }) {
  const band = bandOrDefault(currentAgeBand());
  const questions = useMemo(
    () =>
      GAP_BANDS[band].map((q) => ({
        text: q.text,
        answer: q.answer,
        options: [q.answer, ...q.wrong],
        note: q.text.replace('___', q.answer),
        explain: q.explain,
        picture: q.picture,
        level: q.level
      })),
    [band]
  );

  return (
    <QuizGame
      gameId="sentence-gap"
      dark={['intermediate', 'analytical'].includes(currentAgeBand())}
      title="Sentence Gap"
      tone="bg-gradient-to-br from-pink-500 to-rose-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <p className={`leading-relaxed font-bold text-ink-900 ${q.picture ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
          {q.text.split('___')[0]}
          <span className="mx-1 inline-block min-w-16 border-b-4 border-amber-300 align-bottom" />
          {q.text.split('___')[1]}
        </p>
      )}
    />
  );
}
