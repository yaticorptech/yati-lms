import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { SEQUENCES } from '../../data/brainPuzzles';
import { buildSequences } from '../../data/genSequences';
import { seeded, numberDistractors } from '../../data/seeded';

/**
 * 🧩 Logic & deduction: spot the rule, then continue the run.
 *
 * The pool is sixty generated runs per band (genSequences.js) plus the
 * hand-written ones. The wrong options used to come from Math.random on
 * every mount, which gave the same run a different set of options each
 * visit — and since the question memory hashes options too, it never
 * recognised a run it had already asked and repeats went unchecked. Both
 * sources now build their options from a seeded generator, so a run's
 * options are the same every time and the memory can do its job.
 */
export default function NextInSequence({ onExit }) {
  const questions = useMemo(() => {
    const rng = seeded(7150);
    const generated = buildSequences().map((s) => ({
      run: s.run,
      answer: s.answer,
      options: s.options,
      note: s.rule,
      level: s.level,
      tier: s.tier
    }));
    const seen = new Set(generated.map((q) => q.run.join(',')));
    const written = SEQUENCES.filter((s) => !seen.has(s.run.join(','))).map((s) => ({
      run: s.run,
      answer: s.answer,
      options: [s.answer, ...numberDistractors(rng, s.answer, 3, s.run)],
      note: s.rule,
      level: s.level
    }));
    return [...generated, ...written];
  }, []);

  return (
    <QuizGame
      gameId="next-in-sequence"
      title="Next in Sequence"
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {q.run.map((n, i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 text-lg font-black text-ink-900 tabular-nums"
            >
              {n}
            </span>
          ))}
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg font-black text-sky-700">
            ?
          </span>
        </div>
      )}
    />
  );
}
