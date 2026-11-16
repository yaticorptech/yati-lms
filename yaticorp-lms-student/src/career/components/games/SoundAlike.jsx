import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { SOUND_BANDS, SOUND_MEANING, bandOrDefault } from '../../data/bands/vocab';

const meaning = (word) => SOUND_MEANING[word] || SOUND_MEANING[word.toLowerCase()];

/** “sea” = the big salty water · “see” = to look with your eyes — when every word in the question is known. */
const explainOf = (h) => {
  const words = [h.answer, ...h.wrong];
  if (!words.every(meaning)) return undefined;
  return words.map((w) => `“${w.toLowerCase() === 'i' ? 'I' : w.toLowerCase()}” = ${meaning(w)}`).join(' · ');
};

/**
 * 👂 Grammar: the words sound the same; only one fits the sentence.
 *
 * Banded by age (2026-11-13, data/bands/vocab.js): picture pairs (sea/see,
 * sun/son) in tiny sentences for Classes 1–2, the common ones (their/there,
 * to/two/too) for Classes 3–5, context distinctions for Classes 6–10 and the
 * exam bank for Classes 11–12. After each answer, what each word means.
 */
export default function SoundAlike({ onExit }) {
  const band = bandOrDefault(currentAgeBand());
  const questions = useMemo(
    () =>
      SOUND_BANDS[band].map((h) => ({
        text: h.text,
        answer: h.answer,
        options: [h.answer, ...h.wrong],
        note: h.text.replace('___', h.answer),
        explain: h.explain || explainOf(h),
        picture: h.picture,
        level: h.level
      })),
    [band]
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
