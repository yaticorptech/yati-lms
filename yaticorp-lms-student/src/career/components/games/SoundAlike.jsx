import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { HOMOPHONES } from '../../data/brainGrammar';

/** 👂 Grammar: the words sound the same; only one fits the sentence. */
export default function SoundAlike({ onExit }) {
  const questions = useMemo(
    () =>
      HOMOPHONES.map((h) => ({
        text: h.text,
        answer: h.answer,
        options: [h.answer, ...h.wrong],
        note: h.text.replace('___', h.answer),
        level: h.level
      })),
    []
  );

  return (
    <QuizGame
      gameId="sound-alike"
      title="Sound Alike"
      tone="bg-gradient-to-br from-purple-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <p className="text-xl leading-snug font-black text-ink-900 sm:text-2xl">
          {q.text.split('___').map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && (
                <span className="mx-1 inline-block min-w-16 rounded-lg border-b-4 border-journey-400 bg-journey-50 px-2 text-journey-500">
                  ?
                </span>
              )}
            </span>
          ))}
        </p>
      )}
    />
  );
}
