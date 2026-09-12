import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import BRAIN_WORDS from '../../data/brainWords';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const configFor = (difficulty, levelNo) => ({
  // Longer words as the bands rise.
  minLength: difficulty === 1 ? 0 : difficulty === 2 ? 6 : 8,
  seconds: between(45, 30, levelNo),
  target: between(6, 14, levelNo) + (difficulty - 1) * 2
});

/** ⌨️ Vocabulary: type the word exactly, fast, and learn it on the way. */
export default function TypingSprint({ onExit }) {
  const progress = useGameProgress('typing-sprint');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const pool = BRAIN_WORDS.filter((w) => w.word.length >= config.minLength);
  const words = pool.length ? pool : BRAIN_WORDS;
  const [current, setCurrent] = useState(() => pick(words));
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));
  const inputRef = useRef(null);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  useEffect(() => {
    if (started && !over) inputRef.current?.focus();
  }, [started, over, current]);

  const onChange = (e) => {
    if (over) return;
    const value = e.target.value.toUpperCase();
    setTyped(value);
    if (value === current.word) {
      setScore((s) => s + 1);
      setFlash('right');
      setTyped('');
      setCurrent(pick(words.filter((w) => w.word !== current.word)));
      setTimeout(() => setFlash(null), 220);
    }
  };

  const wrongSoFar = typed && !current.word.startsWith(typed);

  return (
    <GameShell
      title="Typing Sprint"
      blurb={`Type ${config.target} words exactly before the clock runs out.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-pink-700"
      score={score}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `A word appears with its meaning. Type it exactly — it moves on the moment it matches. ${config.target} words before time runs out.`,
              seconds: config.seconds,
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
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${score} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Letters turn red the moment one is wrong</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p
            className={`rounded-2xl px-4 py-4 font-mono text-3xl font-black tracking-[0.18em] ring-1 ring-inset transition-colors ${
              flash === 'right' ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-surface-50 text-ink-900 ring-line-200'
            }`}
          >
            {current.word.split('').map((ch, i) => (
              <span
                key={i}
                className={
                  i < typed.length
                    ? typed[i] === ch
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                    : ''
                }
              >
                {ch}
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm text-ink-500">{current.clue}</p>
          <input
            ref={inputRef}
            value={typed}
            onChange={onChange}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Type the word"
            className={`mt-4 w-full rounded-2xl border-2 bg-surface px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.18em] text-ink-900 uppercase outline-none transition-colors ${
              wrongSoFar ? 'border-rose-400' : 'border-line-200 focus:border-fuchsia-400'
            }`}
          />
        </div>
      )}
    </GameShell>
  );
}
