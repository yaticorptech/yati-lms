import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { bandKey, isYoung, spellingBands } from '../../data/bands/words';

/**
 * ✍️ Vocabulary: exactly one of the options is spelled correctly.
 *
 * Per age band (data/bands/words.js): Foundation picks the right spelling of a picture word from three
 * (🐱 cat / kat / catt); Developing, everyday primary words; Intermediate, the commonly misspelled
 * (separate, definitely); Analytical and Advanced, the generator's harder bands plus commonly confused
 * pairs, where a sentence decides which correctly spelled word belongs.
 * The picture (`picture`) and the reason (`explain`) are drawn by QuizGame.
 */
export default function SpellingFix({ onExit }) {
  const band = bandKey(currentAgeBand());
  const young = isYoung(band);
  const questions = useMemo(() => spellingBands()[band], [band]);

  return (
    <QuizGame
      gameId="spelling-fix"
      title="Spelling Fix"
      tone="bg-gradient-to-br from-rose-500 to-pink-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) =>
        q.kind === 'pair' ? (
          <>
            <p className="text-sm font-bold text-ink-500">Which word fits the sentence?</p>
            <p className="mt-2 text-xl font-black leading-snug text-ink-900 sm:text-2xl">
              <Gap text={q.sentence} />
            </p>
          </>
        ) : (
          <p className={`font-black text-ink-900 ${young ? 'text-2xl' : 'text-lg'}`}>
            {young ? 'Which word is right?' : 'Which one is spelled correctly?'}
          </p>
        )
      }
    />
  );
}

/** A sentence with its "___" drawn as a gap. */
function Gap({ text }) {
  const [before, after] = text.split('___');
  return (
    <>
      {before}
      <span className="mx-1 inline-block min-w-16 border-b-4 border-rose-400 align-baseline" aria-label="blank">&nbsp;</span>
      {after}
    </>
  );
}
