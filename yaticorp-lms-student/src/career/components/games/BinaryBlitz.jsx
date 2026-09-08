import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * One question: a binary number to read as decimal, or — from the second
 * band — a decimal to write in binary. Four options, one right, the wrong
 * ones close enough to need real reading rather than a guess at the size.
 */
const makeQuestion = (bits, toBinary) => {
  const value = rnd(1, 2 ** bits - 1);
  const bin = value.toString(2).padStart(bits, '0');
  const wrong = new Set();
  while (wrong.size < 3) {
    const delta = rnd(1, Math.max(2, Math.floor(value / 3) + 2)) * (Math.random() < 0.5 ? -1 : 1);
    const v = value + delta;
    if (v >= 0 && v !== value && v < 2 ** bits) wrong.add(v);
  }
  const format = (v) => (toBinary ? v.toString(2).padStart(bits, '0') : String(v));
  return {
    prompt: toBinary ? String(value) : bin,
    answer: format(value),
    options: shuffle([format(value), ...[...wrong].map(format)]),
    toBinary
  };
};

const configFor = (difficulty, levelNo) => ({
  bits: between(3, 5, levelNo) + (difficulty - 1),
  mixed: difficulty >= 2,
  seconds: between(60, 40, levelNo),
  target: between(6, 14, levelNo) + (difficulty - 1) * 2
});

/** 💻 Math & speed: read binary as fast as you read decimal. */
export default function BinaryBlitz({ onExit }) {
  const progress = useGameProgress('binary-blitz');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const next = () => makeQuestion(config.bits, config.mixed && Math.random() < 0.5);
  const [q, setQ] = useState(next);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (option) => {
    if (over) return;
    if (option === q.answer) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setQ(next());
    setTimeout(() => setFlash(null), 220);
  };

  return (
    <GameShell
      title="Binary Blitz"
      blurb={`Convert ${config.target} numbers before the clock runs out.`}
      tone="bg-gradient-to-br from-emerald-500 to-teal-700"
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
              objective: config.mixed
                ? `Read binary as decimal and write decimal as binary — ${config.target} right before time runs out.`
                : `Read each ${config.bits}-bit binary number as decimal — ${config.target} right before time runs out.`,
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
      footer={<p className="text-center text-sm text-ink-500">Each place doubles: 1, 2, 4, 8, 16…</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md">
          <p className="text-center text-[0.68rem] font-black tracking-[0.16em] text-ink-400 uppercase">
            {q.toBinary ? 'Write in binary' : 'Read as decimal'}
          </p>
          <p
            className={`mt-2 rounded-2xl px-4 py-5 text-center font-mono text-4xl font-black tracking-[0.2em] tabular-nums ring-1 ring-inset ${
              flash === 'right'
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                : flash === 'wrong'
                  ? 'bg-rose-50 text-rose-700 ring-rose-300'
                  : 'bg-surface-50 text-ink-900 ring-line-200'
            }`}
          >
            {q.prompt}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {q.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => choose(option)}
                className="fp-press min-h-14 rounded-2xl bg-surface font-mono text-xl font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset hover:bg-emerald-50 hover:ring-emerald-300"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
