import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { buildTenses } from '../../data/genTenses';

/**
 * ⏪ Grammar: the verb is given; pick its past tense.
 *
 * Forty-five verbs per band, their wrong forms generated (genTenses.js)
 * the ways people actually get them wrong.
 */
export default function TensePick({ onExit }) {
  const questions = useMemo(
    () =>
      buildTenses().map((v) => ({
        base: v.base,
        answer: v.answer,
        options: v.options,
        note: `Yesterday, I ${v.answer}. (${v.base} → ${v.answer})`,
        level: v.level,
        tier: v.tier
      })),
    []
  );

  return (
    <QuizGame
      gameId="tense-pick"
      title="Tense Pick"
      tone="bg-gradient-to-br from-fuchsia-500 to-pink-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className="text-sm font-bold text-ink-500">Yesterday, I …</p>
          <p className="mt-1 text-3xl font-black tracking-wide text-ink-900 sm:text-4xl">{q.base}</p>
        </>
      )}
    />
  );
}
