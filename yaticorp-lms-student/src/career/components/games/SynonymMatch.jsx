import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SYNONYMS, ANTONYMS } from '../../data/brainPuzzles';

/**
 * 🔤 Vocabulary: Synonyms & Antonyms, one game taking turns (2026-11-05:
 * "combine them — in each level one synonym, then an antonym"). Antonym
 * Match's wrong options are synonyms of the prompt, so the switch between the
 * two is the test: read the label, then hold the meaning.
 */
export default function SynonymMatch({ onExit }) {
  const questions = useMemo(
    () => [
      ...SYNONYMS.map((s) => ({
        kind: 'synonym',
        word: s.word,
        answer: s.answer,
        options: [s.answer, ...s.wrong],
        note: `${s.word.charAt(0)}${s.word.slice(1).toLowerCase()} means "${s.answer.toLowerCase()}".`,
        level: s.level
      })),
      ...ANTONYMS.map((a) => ({
        kind: 'antonym',
        word: a.word,
        answer: a.answer,
        options: [a.answer, ...a.wrong],
        note: `The opposite of ${a.word.toLowerCase()} is "${a.answer.toLowerCase()}".`,
        level: a.level
      }))
    ],
    []
  );

  return (
    <QuizGame
      gameId="synonym-match"
      title="Synonyms & Antonyms"
      tone="bg-gradient-to-br from-fuchsia-500 to-purple-700"
      questions={questions}
      alternate
      onExit={onExit}
      renderPrompt={(q) => (
        <>
          <p className={`text-[0.7rem] font-black tracking-[0.14em] uppercase ${q.kind === 'antonym' ? 'text-rose-600' : 'text-fuchsia-600'}`}>{q.kind === 'antonym' ? 'Opposite of' : 'Same as'}</p>
          <p className="mt-1 text-3xl font-black tracking-wide text-ink-900 sm:text-4xl">{q.word}</p>
        </>
      )}
    />
  );
}
