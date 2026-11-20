import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { bandKey, isYoung } from '../../data/bands/words';
import { tenseBands } from '../../data/bands/tenses';

/**
 * ⏪ Grammar: a sentence with a gap; pick the verb form that fits.
 *
 * Per age band (data/bands/tenses.js): Foundation, past against present with a picture ("Yesterday I ___
 * football. (play)"); Developing, present, past and future simple; Intermediate, mixed tenses with the
 * continuous; Analytical, the perfect tenses and irregular participles; Advanced, conditionals, reported
 * speech and the perfect continuous. Exactly one option is grammatical in each sentence.
 * The picture (`picture`) and the reason (`explain`) are drawn by QuizGame.
 */
export default function TensePick({ onExit }) {
  const band = bandKey(currentAgeBand());
  const young = isYoung(band);
  const questions = useMemo(() => tenseBands()[band], [band]);

  return (
    <QuizGame
      gameId="tense-pick"
      dark={['intermediate', 'analytical'].includes(currentAgeBand())}
      title="Tense Pick"
      tone="bg-gradient-to-br from-fuchsia-500 to-pink-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => {
        const [before, after] = q.sentence.split('___');
        return (
          <>
            <p className="text-sm font-bold text-ink-500">{young ? 'Pick the word that fits.' : 'Choose the correct form.'}</p>
            <p className={`mt-2 font-black leading-snug text-ink-900 ${young ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
              {before}
              <span className="mx-1 inline-block min-w-16 border-b-4 border-amber-300 align-baseline" aria-label="blank">&nbsp;</span>
              {after}
            </p>
            <p className="mt-2 text-base font-bold text-fuchsia-700">({q.verb})</p>
          </>
        );
      }}
    />
  );
}
