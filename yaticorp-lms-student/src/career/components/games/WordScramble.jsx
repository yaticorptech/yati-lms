import { useState, useRef } from 'react';
import { Lightbulb, SkipForward } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import BRAIN_WORDS from '../../data/brainWords';

/** Shuffle the letters, and never hand back the word itself. */
const scramble = (word) => {
  const letters = word.split('');
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const out = letters.join('');
    // A word of identical letters can never differ; give up rather than loop.
    if (out !== word) return out;
  }
  return letters.join('');
};

const pick = (exclude, maxLength) => {
  const sized = BRAIN_WORDS.filter((w) => w.word.length <= maxLength && w.word !== exclude);
  const pool = sized.length ? sized : BRAIN_WORDS.filter((w) => w.word !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

const configFor = (difficulty, levelNo) => ({
  maxLength: between(6, 9, levelNo) + (difficulty - 1) * 2,
  seconds: between(90, 60, levelNo),
  target: between(3, 8, levelNo) + (difficulty - 1)
});

/** 🔤 Vocabulary: unscramble the word from its letters and a clue. */
export default function WordScramble({ onExit }) {
  const progress = useGameProgress('word-scramble');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [entry, setEntry] = useState(() => pick(null, config.maxLength));
  const [letters, setLetters] = useState(() => scramble(entry.word));
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);
  const inputRef = useRef(null);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const nextWord = (current) => {
    const chosen = pick(current, config.maxLength);
    setEntry(chosen);
    setLetters(scramble(chosen.word));
    setGuess('');
  };

  const check = (event) => {
    event.preventDefault();
    if (over) return;
    if (guess.trim().toUpperCase() === entry.word) {
      setScore((s) => s + 1);
      setFlash('right');
      nextWord(entry.word);
    } else {
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 450);
    inputRef.current?.focus();
  };

  return (
    <GameShell
      title="Word Scramble"
      blurb={`Solve ${config.target} words before the clock runs out.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-purple-700"
      score={`${score}/${config.target}`}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Unscramble ${config.target} words before the clock runs out.`,
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
              detail: `${score} of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-500">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          {entry.clue}
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <div className="flex flex-wrap justify-center gap-1.5">
            {letters.split('').map((letter, i) => (
              <span
                key={i}
                className={`flex h-11 w-9 items-center justify-center rounded-xl text-xl font-black transition-colors sm:h-12 sm:w-10 ${
                  flash === 'right' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-ink-900'
                }`}
              >
                {letter}
              </span>
            ))}
          </div>

          <form onSubmit={check} className="mt-5 flex flex-wrap justify-center gap-2">
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Your answer"
              aria-label="Your answer"
              autoComplete="off"
              className={`min-h-11 min-w-0 flex-1 basis-48 rounded-xl border bg-surface px-4 text-center text-base font-black tracking-widest text-ink-900 uppercase transition-colors placeholder:font-semibold placeholder:tracking-normal placeholder:normal-case focus:outline-none ${
                flash === 'wrong' ? 'border-rose-400' : 'border-line-200 focus:border-journey-400'
              }`}
            />
            <button
              type="submit"
              className="fp-press min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 text-sm font-black text-white"
            >
              Check
            </button>
            <button
              type="button"
              onClick={() => nextWord(entry.word)}
              className="min-h-11 shrink-0 rounded-xl bg-surface-100 px-4 text-sm font-black text-ink-600"
            >
              <SkipForward className="mr-1 inline h-3.5 w-3.5" />
              Skip
            </button>
          </form>
        </div>
      )}
    </GameShell>
  );
}
