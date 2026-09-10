import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { ANTONYMS } from '../../data/brainPuzzles';

/**
 * 🔤 Vocabulary: pick the word that means the opposite.
 *
 * Harder than the synonym game on purpose. Every wrong option is a synonym of
 * the prompt, so skimming for a familiar-looking word fails and the student
 * has to actually hold the meaning in mind.
 */
export default function AntonymMatch({ onExit }) {
  const questions = useMemo(
    () =>
      ANTONYMS.map((a) => ({
        word: a.word,
        answer: a.answer,
        options: [a.answer, ...a.wrong],
        note: `The opposite of ${a.word.toLowerCase()} is "${a.answer.toLowerCase()}".`
      })),
    []
  );

  return (
    <QuizGame
      gameId="antonym-match"
      title="Antonym Match"
      tone="bg-gradient-to-br from-purple-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className="text-[0.7rem] font-black tracking-[0.14em] text-fuchsia-600 uppercase">Opposite of</p>
          <p className="mt-1 text-3xl font-black tracking-wide text-ink-900 sm:text-4xl">{q.word}</p>
        </>
      )}
    />
  );
}
