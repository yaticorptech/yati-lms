import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { bandWithin, currentAgeBand } from './levels';
import { SEQUENCES } from '../../data/brainPuzzles';
import { buildSequences } from '../../data/genSequences';
import { seeded, numberDistractors } from '../../data/seeded';
import { GAP, buildBandSequences, sequenceBand } from '../../data/bands/sequences';

/**
 * 🧩 Logic & deduction: spot the rule, then continue the run — or fill the gap.
 *
 * By age band (data/bands/sequences.js): colour, shape and picture patterns and tiny counting runs for Classes 1–2
 * (three options), longer patterns, turning arrows, growing dots and skip counting for 3–5, arithmetic and geometric
 * runs with a missing middle term for 6–8, alternating and woven rules for 9–10, several hidden rules at once for 11–12.
 * Every pool is seeded, so a run's options are the same on each visit and the question memory can track repeats.
 *
 * Classes 9–10 (and a student whose band is not known) also keep the number runs this game always had.
 */
const legacyPool = () => {
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
};

export default function NextInSequence({ onExit, gameId = 'next-in-sequence', bands, title = 'Next in Sequence' }) {
  const band = sequenceBand(bandWithin(currentAgeBand(), bands));
  const questions = useMemo(() => {
    const own = buildBandSequences(band);
    return band === 'analytical' ? [...own, ...legacyPool()] : own;
  }, [band]);
  const young = band === 'foundation' || band === 'developing';

  return (
    <QuizGame
      gameId={gameId}
      bands={bands}
      title={title}
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      questions={questions}
      onExit={onExit}
      renderPrompt={(q) => {
        const picture = q.kind === 'picture' || q.kind === 'dots';
        const box = picture
          ? `${young ? 'min-h-14 min-w-14' : 'min-h-11 min-w-11 sm:min-h-12 sm:min-w-12'} px-1.5 text-2xl`
          : 'min-h-11 min-w-11 px-2 text-lg tabular-nums sm:min-h-12 sm:min-w-12';
        const cells = q.run.includes(GAP) ? q.run : [...q.run, GAP];
        return (
          <div>
            <p className="mb-3 text-sm font-bold text-ink-500">
              {q.run.includes(GAP) ? 'Which one fills the gap?' : picture ? 'What comes next?' : 'Which number comes next?'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" aria-label={`Sequence: ${cells.join(', ')}`}>
              {cells.map((n, i) => (
                <span
                  key={i}
                  className={`flex items-center justify-center rounded-2xl font-black ${box} ${
                    n === GAP ? 'border-2 border-dashed border-sky-300 bg-sky-100 text-sky-700' : 'bg-surface-100 text-ink-900'
                  } ${q.kind === 'dots' && n !== GAP ? 'text-base tracking-tighter text-emerald-600' : ''}`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
