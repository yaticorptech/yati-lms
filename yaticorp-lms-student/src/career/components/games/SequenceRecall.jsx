import { useState, useEffect, useRef, useCallback } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';
import { sequenceConfig, sequenceRule, expectedInput, SEQUENCE_RULES } from '../../data/bands/memory';

/**
 * 🧠 Memory & focus: watch the pattern, then play it back.
 *
 * Per age band (data/bands/memory.js): Young Thinkers watch big picture pads (⭐ 🍎 🐶 🚗) light up slowly, short
 * runs; Rising Brains get six or eight pads of mixed symbols and numbers and longer runs; Master Minds get long
 * mixed runs with a rule announced before each one — same order, BACKWARDS, or only the even spots.
 */
export default function SequenceRecall({ onExit, gameId = 'sequence-recall', bands, title = 'Sequence Recall' }) {
  const progress = useGameProgress(gameId, { bands });
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
      title={title}
    />
  );
}

const GRID = { 4: 'max-w-xs grid-cols-2', 6: 'max-w-sm grid-cols-3', 8: 'max-w-md grid-cols-4' };

const objectiveFor = (config) => {
  if (config.young) return `Watch the pictures light up. Then tap them in the same order. Get to ${config.target} in a row!`;
  if (config.rules) {
    return `Repeat a run of ${config.target} to clear this level. Before each run a rule is shown: same order, BACKWARDS (last first)${config.evenRule ? ', or EVEN spots only (2nd, 4th, …)' : ''}.`;
  }
  return `Repeat a run of ${config.target} to clear this level.`;
};

function Round({ progress, onExit, title }) {
  const [started, setStarted] = useState(false);
  const [config] = useState(() => sequenceConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo }));
  const [order, setOrder] = useState([]);
  const [rule, setRule] = useState('forward');
  const [lit, setLit] = useState(null);
  const [showing, setShowing] = useState(true);
  const [step, setStep] = useState(0);
  const [best, setBest] = useState(0);     // the longest run played back in full
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const timers = useRef([]);
  const { busy, showWrong, toneOf } = useAnswerReveal();
  const padCount = config.pads.length;

  const play = useCallback(
    (sequence, delay) => {
      setShowing(true);
      setStep(0);
      const { pace } = config;
      sequence.forEach((pad, i) => {
        timers.current.push(setTimeout(() => setLit(pad), delay + pace * i + 300));
        timers.current.push(setTimeout(() => setLit(null), delay + pace * i + pace * 0.7 + 150));
      });
      timers.current.push(setTimeout(() => setShowing(false), delay + pace * sequence.length + 400));
    },
    [config]
  );

  const extend = useCallback(
    (current) => {
      const add = current.length === 0 ? config.start : 1;
      const next = [...current, ...Array.from({ length: add }, () => Math.floor(Math.random() * padCount))];
      const nextRule = sequenceRule(config, next.length);
      setOrder(next);
      setRule(nextRule);
      // A changed rule gets a moment on screen before the pattern starts, so it is read first.
      play(next, config.rules ? 900 : 0);
    },
    [config, padCount, play]
  );

  useEffect(() => {
    // Nothing plays until Start: the pattern used to flash behind the intro
    // panel, so the level began with the student having already missed it.
    if (!started) return undefined;
    extend([]);
    const list = timers.current;
    return () => list.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const expected = expectedInput(order, rule);
  const passed = best >= config.target;
  const finishedRound = dead || won;
  const stars = finishedRound
    ? config.young ? starsForFixed(best, config.target, config.maxRun) : starsFor(best, config.target, false)
    : 0;
  useRecordStars(progress, finishedRound, stars, { correct: best, wrong: dead ? 1 : 0, score: best });

  const press = (pad) => {
    if (showing || finishedRound || busy) return;

    if (expected[step] !== pad) {
      // The buzz, the pad pressed red and the one that was next green, a pause, then the run ends.
      showWrong(pad, expected[step], () => setDead(true));
      return;
    }

    setLit(pad);
    timers.current.push(setTimeout(() => setLit(null), 180));

    if (step + 1 === expected.length) {
      // The run played back in full. The pads lock at once, so a tap in the
      // gap before the replay cannot count against the next run.
      setShowing(true);
      setBest(order.length);
      if (order.length >= config.maxRun) {
        timers.current.push(setTimeout(() => setWon(true), 450));
      } else {
        timers.current.push(setTimeout(() => extend(order), 600));
      }
    } else {
      setStep(step + 1);
    }
  };

  // Keys 1…8 press the pads, for keyboard play.
  const pressRef = useRef(press);
  useEffect(() => { pressRef.current = press; });
  useEffect(() => {
    if (!started) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= padCount) { e.preventDefault(); pressRef.current(n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, padCount]);

  const locked = showing || finishedRound || busy;
  const ruleTone = rule === 'reverse' ? 'bg-amber-100 text-amber-800 ring-amber-300' : rule === 'even' ? 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-300' : 'bg-indigo-50 text-indigo-700 ring-indigo-200';

  return (
    <GameShell
      title={title}
      blurb={config.young ? `Tap them back in order. Reach ${config.target}!` : `Reach a run of ${config.target} to clear this level.`}
      tone="bg-gradient-to-br from-violet-500 to-indigo-700"
      score={order.length}
      scoreLabel="Run"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: objectiveFor(config),
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
              headline: passed ? `Level ${progress.level} cleared!` : config.young ? 'Good try — play again!' : 'So close',
              detail: `A run of ${best}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          {showing
            ? config.young ? 'Watch…' : 'Watch closely…'
            : config.young ? `Your turn! ${expected.length - step} more` : `Your turn — ${expected.length - step} to go`}
        </p>
      }
    >
      {started && config.rules && (
        <p
          key={`${order.length}-${rule}`}
          className={`gs-pop mx-auto mb-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-sm font-black ring-2 ring-inset ${ruleTone}`}
          role="status"
        >
          {SEQUENCE_RULES[rule].label}: <span className="font-semibold">{SEQUENCE_RULES[rule].hint}</span>
        </p>
      )}

      {started && (
      <div className={`mx-auto grid w-full gap-2 sm:gap-3 ${GRID[padCount] || GRID[4]}`}>
        {config.pads.map((pad) => (
          <button
            key={pad.id}
            type="button"
            onClick={() => press(pad.id)}
            disabled={locked}
            aria-label={`${pad.name} (key ${pad.id + 1})`}
            className={`relative flex aspect-square min-h-14 items-center justify-center rounded-3xl transition-all duration-150 ${
              lit === pad.id ? `${pad.on} scale-105 shadow-lg` : pad.off
            } ${locked ? 'cursor-not-allowed' : 'hover:brightness-110'} ${toneOf(pad.id)}`}
          >
            <span
              aria-hidden
              className={`select-none ${config.young ? 'text-5xl sm:text-6xl' : 'text-3xl font-black text-white drop-shadow sm:text-4xl'} ${
                lit === pad.id ? '' : 'opacity-80'
              }`}
            >
              {pad.label}
            </span>
            {!config.young && (
              <span aria-hidden className="absolute top-1.5 left-2 text-[0.6rem] font-bold text-white/70">{pad.id + 1}</span>
            )}
          </button>
        ))}
      </div>
      )}
    </GameShell>
  );
}
