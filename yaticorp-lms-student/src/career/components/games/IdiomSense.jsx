import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { IDIOMS } from '../../data/brainPuzzles';

/**
 * 🔤 Vocabulary: what does the phrase actually mean?
 *
 * Every wrong option is the literal reading, which is the mistake this is
 * meant to train out. A student who translates word by word picks one of them.
 */
export default function IdiomSense({ onExit }) {
  const questions = useMemo(
    () =>
      IDIOMS.map((i) => ({
        phrase: i.phrase,
        answer: i.answer,
        options: [i.answer, ...i.wrong],
        note: `“${i.phrase}” means: ${i.answer.toLowerCase()}.`
      })),
    []
  );

  return (
    <QuizGame
      gameId="idiom-sense"
      title="Idiom Sense"
      tone="bg-gradient-to-br from-pink-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className="text-[0.7rem] font-black tracking-[0.14em] text-pink-600 uppercase">What does this mean?</p>
          <p className="mt-1 text-2xl font-black text-ink-900 sm:text-3xl">“{q.phrase}”</p>
        </>
      )}
    />
  );
}
