import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const COLOURS = [
  { key: 'r', class: 'bg-rose-500', name: 'Red' },
  { key: 'b', class: 'bg-sky-500', name: 'Blue' },
  { key: 'g', class: 'bg-emerald-500', name: 'Green' },
  { key: 'y', class: 'bg-amber-400', name: 'Yellow' },
  { key: 'p', class: 'bg-violet-500', name: 'Purple' },
  { key: 'o', class: 'bg-orange-500', name: 'Orange' }
];
const LENGTH = 4;

/**
 * Score a guess the way Mastermind does.
 *
 * Exact matches are counted and removed first; only then are the leftovers
 * checked for right-colour-wrong-place. Counting in one pass would let a
 * single peg be credited twice and tell the player something false.
 */
const scoreGuess = (guess, secret) => {
  const left = [];
  const right = [];
  let exact = 0;

  guess.forEach((g, i) => {
    if (g === secret[i]) exact += 1;
    else {
      left.push(g);
      right.push(secret[i]);
    }
  });

  let partial = 0;
  const pool = [...right];
  left.forEach((g) => {
    const at = pool.indexOf(g);
    if (at !== -1) {
      partial += 1;
      pool.splice(at, 1);
    }
  });

  return { exact, partial };
};

/** More colours to search and fewer attempts to do it in. */
const configFor = (difficulty, levelNo) => ({
  colours: Math.min(6, between(4, 5, levelNo) + (difficulty - 1)),
  tries: Math.max(4, between(10, 7, levelNo) - (difficulty - 1))
});

const makeSecret = (palette) =>
  Array.from({ length: LENGTH }, () => palette[Math.floor(Math.random() * palette.length)].key);

/** 🔍 Logic & deduction: break the colour code from the feedback. */
export default function CodeBreaker({ onExit }) {
  const progress = useGameProgress('code-breaker');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = configFor(progress.difficulty, progress.levelNo);
  const palette = COLOURS.slice(0, config.colours);
  const [secret] = useState(() => makeSecret(palette));
  const [draft, setDraft] = useState([]);
  const [rows, setRows] = useState([]);

  const solved = rows.some((r) => r.exact === LENGTH);
  const over = solved || rows.length >= config.tries;
  const passed = solved;
  // Fewer guesses is better, so the star comparison is inverted.
  const stars = over ? starsFor(rows.length, config.tries, true) : 0;
  useRecordStars(progress, over, stars);

  const submit = () => {
    if (draft.length !== LENGTH || over) return;
    setRows([...rows, { guess: draft, ...scoreGuess(draft, secret) }]);
    setDraft([]);
  };

  return (
    <GameShell
      title="Code Breaker"
      blurb={`${config.colours} colours, ${config.tries} guesses.`}
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={`${rows.length}/${config.tries}`}
      scoreLabel="Guess"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Crack the ${config.colours}-colour code within ${config.tries} guesses.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Out of guesses',
              detail: passed
                ? `Cracked in ${rows.length} of ${config.tries} guesses`
                : `The code was ${secret.map((k) => palette.find((c) => c.key === k).name).join(', ')}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /> right spot ·{' '}
          <Circle className="mr-1 inline h-3 w-3 text-amber-500" /> right colour, wrong spot
        </p>
      }
    >
      {started && (
      <div className="mx-auto max-w-sm">
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-50 px-3 py-2">
              <span className="w-5 shrink-0 text-xs font-black text-ink-400 tabular-nums">{i + 1}</span>
              <span className="flex gap-1.5">
                {row.guess.map((k, n) => (
                  <span key={n} className={`h-7 w-7 rounded-full ${COLOURS.find((c) => c.key === k).class}`} />
                ))}
              </span>
              <span className="ml-auto flex items-center gap-2 text-xs font-black tabular-nums">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  {row.exact}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Circle className="h-3 w-3" />
                  {row.partial}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {!over && (
          <>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {Array.from({ length: LENGTH }).map((_, i) => {
                const k = draft[i];
                return (
                  <span
                    key={i}
                    className={`h-9 w-9 rounded-full ring-2 ring-inset ${
                      k ? `${COLOURS.find((c) => c.key === k).class} ring-white` : 'bg-surface-100 ring-line-200'
                    }`}
                  />
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {palette.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => draft.length < LENGTH && setDraft([...draft, c.key])}
                  aria-label={c.name}
                  className={`fp-press h-10 w-10 rounded-full ring-2 ring-white transition-transform hover:scale-110 ${c.class}`}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(draft.slice(0, -1))}
                disabled={draft.length === 0}
                className="min-h-10 rounded-xl bg-surface-100 px-4 text-sm font-black text-ink-600 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={draft.length !== LENGTH}
                className="fp-press min-h-10 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 text-sm font-black text-white disabled:opacity-40"
              >
                Check
              </button>
            </div>
          </>
        )}
      </div>
      )}
    </GameShell>
  );
}
