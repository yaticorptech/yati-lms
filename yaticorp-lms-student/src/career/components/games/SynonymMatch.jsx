import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { SYNONYM_BANDS, bandOrDefault } from '../../data/bands/vocab';

const cap = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1).toLowerCase()}`;
const YOUNG = new Set(['foundation', 'developing']);

/**
 * 🔤 Vocabulary: Synonyms & Antonyms, one game taking turns (2026-11-05:
 * "combine them — in each level one synonym, then an antonym"). Antonym
 * Match's wrong options are synonyms of the prompt, so the switch between the
 * two is the test: read the label, then hold the meaning.
 *
 * Banded by age (2026-11-13, data/bands/vocab.js): picture words for Classes
 * 1–2, everyday then school words, advanced words in a sentence for Classes
 * 9–10, and for Classes 11–12 the exam bank plus "which word fits best".
 */
export default function SynonymMatch({ onExit }) {
  const band = bandOrDefault(currentAgeBand());
  const questions = useMemo(
    () =>
      SYNONYM_BANDS[band].map((s) => {
        const base = { kind: s.kind, answer: s.answer, options: [s.answer, ...s.wrong], level: s.level, picture: s.picture };
        if (s.kind === 'fit') return { ...base, text: s.text, note: s.text.replace('___', s.answer), explain: s.explain };
        const note = s.kind === 'antonym'
          ? `The opposite of ${s.word.toLowerCase()} is "${s.answer.toLowerCase()}".`
          : `${cap(s.word)} means "${s.answer.toLowerCase()}".`;
        const friendly = s.kind === 'antonym'
          ? `“${cap(s.word)}” and “${s.answer.toLowerCase()}” are opposites.`
          : `“${cap(s.word)}” and “${s.answer.toLowerCase()}” mean the same.`;
        return { ...base, word: s.word, context: s.context, note, explain: YOUNG.has(band) ? friendly : s.context ? note : undefined };
      }),
    [band]
  );

  return (
    <QuizGame
      gameId="synonym-match"
      dark={['intermediate', 'analytical', 'advanced'].includes(currentAgeBand())}
      title="Synonyms & Antonyms"
      tone="bg-gradient-to-br from-fuchsia-500 to-purple-700"
      questions={questions}
      alternate
      onExit={onExit}
      renderPrompt={(q) =>
        q.kind === 'fit' ? (
          <>
            <p className="text-[0.7rem] font-black tracking-[0.14em] text-purple-600 uppercase">Which word fits best?</p>
            <p className="mt-2 text-xl leading-relaxed font-bold text-ink-900">
              {q.text.split('___')[0]}
              <span className="mx-1 inline-block min-w-16 border-b-4 border-purple-400 align-bottom" />
              {q.text.split('___')[1]}
            </p>
          </>
        ) : (
          <>
            <p className={`text-[0.7rem] font-black tracking-[0.14em] uppercase ${q.kind === 'antonym' ? 'text-rose-600' : 'text-fuchsia-600'}`}>{q.kind === 'antonym' ? 'Opposite of' : 'Same as'}</p>
            <p className="mt-1 text-3xl font-black tracking-wide text-ink-900 sm:text-4xl">{q.word}</p>
            {q.context && <p className="mt-2 text-base text-ink-600 italic">“{q.context}”</p>}
          </>
        )
      }
    />
  );
}
