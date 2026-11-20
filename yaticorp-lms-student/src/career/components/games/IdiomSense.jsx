import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { IDIOM_BANDS, bandOrDefault } from '../../data/bands/vocab';

/**
 * 🔤 Vocabulary: what does the phrase actually mean?
 *
 * Every wrong option is the literal reading, which is the mistake this is
 * meant to train out. A student who translates word by word picks one of them.
 *
 * Banded by age (2026-11-13, data/bands/vocab.js): Classes 1–2 get no idioms,
 * only everyday expressions with a picture; Classes 3–5 a few very common
 * expressions; Classes 6–10 idioms inside a sentence; Classes 11–12 the full
 * bank plus allusive idioms read in context.
 */
export default function IdiomSense({ onExit }) {
  const band = bandOrDefault(currentAgeBand());
  const questions = useMemo(
    () =>
      IDIOM_BANDS[band].map((i) => ({
        phrase: i.phrase,
        context: i.context,
        answer: i.answer,
        options: [i.answer, ...i.wrong],
        note: `“${i.phrase}” means: ${i.answer.toLowerCase()}.`,
        explain: i.context || band === 'foundation' || band === 'developing' ? `“${i.phrase}” means: ${i.answer.charAt(0).toLowerCase()}${i.answer.slice(1)}.` : undefined,
        picture: i.picture,
        level: i.level
      })),
    [band]
  );

  return (
    <QuizGame
      gameId="idiom-sense"
      dark={['intermediate', 'analytical', 'advanced'].includes(currentAgeBand())}
      title="Idiom Sense"
      tone="bg-gradient-to-br from-pink-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className="text-[0.7rem] font-black tracking-[0.14em] text-pink-600 uppercase">What does this mean?</p>
          <p className="mt-1 text-2xl font-black text-ink-900 sm:text-3xl">“{q.phrase}”</p>
          {q.context && <p className="mt-2 text-base text-ink-600 italic">{q.context}</p>}
        </>
      )}
    />
  );
}
