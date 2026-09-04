import { useState, useEffect, useRef, useCallback } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const PADS = [
  { id: 0, on: 'bg-rose-400', off: 'bg-rose-500/30' },
  { id: 1, on: 'bg-sky-400', off: 'bg-sky-500/30' },
  { id: 2, on: 'bg-emerald-400', off: 'bg-emerald-500/30' },
  { id: 3, on: 'bg-amber-300', off: 'bg-amber-500/30' }
];

/** Longer target sequences, played back faster, as the level rises. */
const configFor = (difficulty, levelNo) => ({
  pace: between(640, 380, levelNo) - (difficulty - 1) * 70,
  target: between(4, 9, levelNo) + (difficulty - 1) * 2
});

/** 🧠 Memory & focus: watch the pattern, then play it back. */
export default function SequenceRecall({ onExit }) {
  const progress = useGameProgress('sequence-recall');
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
  const [order, setOrder] = useState([]);
  const [lit, setLit] = useState(null);
  const [showing, setShowing] = useState(true);
  const [step, setStep] = useState(0);
  const [dead, setDead] = useState(false);
  const timers = useRef([]);

  const pace = Math.max(220, config.pace);

  const play = useCallback(
    (sequence) => {
      setShowing(true);
      setStep(0);
      sequence.forEach((pad, i) => {
        timers.current.push(setTimeout(() => setLit(pad), pace * i + 300));
        timers.current.push(setTimeout(() => setLit(null), pace * i + pace * 0.7 + 150));
      });
      timers.current.push(setTimeout(() => setShowing(false), pace * sequence.length + 400));
    },
    [pace]
  );

  const extend = useCallback(
    (current) => {
      const next = [...current, Math.floor(Math.random() * 4)];
      setOrder(next);
      play(next);
    },
    [play]
  );

  // The first round starts itself, so the game needs no start button.
  useEffect(() => {
    // Nothing plays until Start: the pattern used to flash behind the intro
    // panel, so the level began with the student having already missed it.
    if (!started) return undefined;
    extend([]);
    const list = timers.current;
    return () => list.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const reached = dead ? order.length - 1 : order.length;
  const passed = reached >= config.target;
  const finishedRound = dead;
  const stars = finishedRound ? starsFor(reached, config.target, false) : 0;
  useRecordStars(progress, finishedRound, stars);
  const finished = dead || (passed && !showing && step === 0 && order.length > config.target);

  const press = (pad) => {
    if (showing || dead) return;

    if (order[step] !== pad) {
      setDead(true);
      return;
    }

    setLit(pad);
    timers.current.push(setTimeout(() => setLit(null), 180));

    if (step + 1 === order.length) {
      timers.current.push(setTimeout(() => extend(order), 600));
    } else {
      setStep(step + 1);
    }
  };

  return (
    <GameShell
      title="Sequence Recall"
      blurb={`Reach a run of ${config.target} to clear this level.`}
      tone="bg-gradient-to-br from-violet-500 to-indigo-700"
      score={`${order.length}/${config.target}`}
      scoreLabel="Run"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Repeat a run of ${config.target} to clear this level.`,
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
              detail: `A run of ${reached}, of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {showing ? 'Watch closely…' : `Your turn — ${order.length - step} to go`}
        </p>
      }
    >
      {started && (
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
        {PADS.map((pad) => (
          <button
            key={pad.id}
            type="button"
            onClick={() => press(pad.id)}
            disabled={showing || finished}
            aria-label={`Pad ${pad.id + 1}`}
            className={`aspect-square rounded-3xl transition-all duration-150 ${
              lit === pad.id ? `${pad.on} scale-105 shadow-lg` : pad.off
            } ${showing || dead ? 'cursor-not-allowed' : 'hover:brightness-110'}`}
          />
        ))}
      </div>
      )}
    </GameShell>
  );
}
