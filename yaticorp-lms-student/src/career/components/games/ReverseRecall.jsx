import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

/**
 * 🔢 Memory & focus: hold a number, then say it backwards.
 *
 * The reverse is not a gimmick. Repeating digits forward can be done by
 * echoing sound; reversing them cannot, so it forces the number to actually
 * be held and worked on. Psychologists use exactly this pair for the same
 * reason, which is why it earns a place next to Number Recall rather than
 * duplicating it.
 */
const makeDigits = (length) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

const configFor = (difficulty, levelNo) => ({
  start: between(3, 5, levelNo) + (difficulty - 1),
  showMs: Math.max(900, between(3200, 1900, levelNo) - (difficulty - 1) * 350),
  target: between(4, 8, levelNo) + (difficulty - 1) * 2
});

export default function ReverseRecall({ onExit }) {
  const progress = useGameProgress('reverse-recall');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [digits, setDigits] = useState(() => makeDigits(config.start));
  const [showing, setShowing] = useState(true);
  const [guess, setGuess] = useState('');
  const [dead, setDead] = useState(false);
  const [reveal, setReveal] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!started) return undefined;
    const t = setTimeout(() => {
      setShowing(false);
      inputRef.current?.focus();
    }, config.showMs);
    return () => clearTimeout(t);
  }, [started, reveal, config.showMs]);

  const reached = dead ? digits.length - 1 : digits.length;
  const passed = reached >= config.target;
  const stars = dead ? starsFor(reached, config.target) : 0;
  useRecordStars(progress, dead, stars);

  const backwards = digits.split('').reverse().join('');

  const submit = (event) => {
    event.preventDefault();
    if (showing || dead) return;
    if (guess.trim() === backwards) {
      setDigits(makeDigits(digits.length + 1));
      setGuess('');
      setShowing(true);
      setReveal((n) => n + 1);
    } else {
      setDead(true);
    }
  };

  return (
    <GameShell
      title="Reverse Recall"
      blurb={`Reach ${config.target} digits, backwards.`}
      tone="bg-gradient-to-br from-violet-600 to-indigo-700"
      score={`${digits.length} digits`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Memorise the number, then type it BACKWARDS. Reach ${config.target} digits.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        dead
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Good run',
              detail: `${reached} of ${config.target} digits needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Type the digits in reverse order</p>}
    >
      {started && !dead && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          {showing ? (
            <>
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">Memorise</p>
              <p className="text-5xl font-black tracking-[0.2em] text-ink-900 tabular-nums sm:text-6xl">
                {digits}
              </p>
            </>
          ) : (
            <form onSubmit={submit} className="flex w-full flex-col items-center gap-4">
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">
                Now type it backwards
              </p>
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="off"
                aria-label="The number, in reverse"
                className="w-full rounded-2xl border-2 border-line-200 bg-surface px-4 py-4 text-center text-3xl font-black tracking-[0.2em] text-ink-900 tabular-nums outline-none focus:border-violet-400"
              />
              <button
                type="submit"
                className="fp-press rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-3 text-sm font-black text-white"
              >
                Check
              </button>
            </form>
          )}
        </div>
      )}
    </GameShell>
  );
}
