import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { PAST_TENSES } from '../../data/brainGrammar';

/** ⏪ Grammar: the verb is given; pick its past tense. */
export default function TensePick({ onExit }) {
  const questions = useMemo(
    () =>
      PAST_TENSES.map((v) => ({
        base: v.base,
        answer: v.past,
        options: [v.past, ...v.wrong],
        note: `Yesterday, I ${v.past}. (${v.base} → ${v.past})`,
        level: v.level
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
