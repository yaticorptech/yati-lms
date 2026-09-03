import { useState, useEffect, useRef } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const makeDigits = (length) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

/** Longer strings, shown for less time, as the level rises. */
const configFor = (difficulty, levelNo) => ({
  start: between(3, 6, levelNo) + (difficulty - 1),
  showMs: Math.max(700, between(3000, 1600, levelNo) - (difficulty - 1) * 400),
  target: between(5, 9, levelNo) + (difficulty - 1) * 2
});

/** 🔢 Memory & focus: hold a number in your head, then type it back. */
export default function NumberRecall({ onExit }) {
  const progress = useGameProgress('number-recall');
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
  const [digits, setDigits] = useState(() => makeDigits(config.start));
  const [showing, setShowing] = useState(true);
  const [guess, setGuess] = useState('');
  const [dead, setDead] = useState(false);
  // Bumped to start a fresh reveal. The effect below watches it, so the hide
  // is scheduled by an effect rather than state being set from inside one.
  const [reveal, setReveal] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    // The digits were revealed and hidden again behind the intro panel.
    if (!started) return undefined;
    const t = setTimeout(() => {
      setShowing(false);
      inputRef.current?.focus();
    }, config.showMs);
    return () => clearTimeout(t);
  }, [started, reveal, config.showMs]);

  const reached = dead ? digits.length - 1 : digits.length;
  const passed = reached >= config.target;
  const finishedRound = dead;
  const stars = finishedRound ? starsFor(reached, config.target, false) : 0;
  useRecordStars(progress, finishedRound, stars);

  const submit = (event) => {
    event.preventDefault();
    if (showing || dead) return;

    if (guess.trim() === digits) {
      setDigits(makeDigits(digits.length + 1));
      setGuess('');
      setShowing(true);
      setReveal((r) => r + 1);
    } else {
      setDead(true);
    }
  };

  return (
    <GameShell
      title="Number Recall"
      blurb={`Recall ${config.target} digits to clear this level.`}
      tone="bg-gradient-to-br from-indigo-500 to-violet-700"
      score={`${digits.length}/${config.target}`}
      scoreLabel="Digits"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Recall ${config.target} digits to clear this level.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${reached} digits, of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {showing ? 'Memorise it…' : 'Now type what you saw'}
        </p>
      }
    >
      {started && !dead && (
        <div className="mx-auto max-w-md text-center">
          <div className="flex min-h-20 flex-wrap items-center justify-center gap-2">
            {digits.split('').map((d, i) => (
              <span
                key={i}
                className={`flex h-16 w-12 items-center justify-center rounded-2xl text-3xl font-black tabular-nums ${
                  showing ? 'bg-indigo-50 text-indigo-700' : 'bg-surface-100 text-ink-300'
                }`}
              >
                {showing ? d : '?'}
              </span>
            ))}
          </div>

          {!showing && (
            <form onSubmit={submit} className="mt-5 flex flex-wrap justify-center gap-2">
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="The number"
                aria-label="The number you saw"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 basis-48 rounded-xl border border-line-200 bg-surface px-4 text-center text-lg font-black tracking-widest text-ink-900 focus:border-journey-400 focus:outline-none"
              />
              <button
                type="submit"
                className="fp-press min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-black text-white"
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
