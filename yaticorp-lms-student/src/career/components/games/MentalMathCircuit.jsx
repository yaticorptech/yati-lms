import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import ENumPad from './ENumPad';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { circuitConfig, makeCircuitLevel, runCircuit } from '../../data/bands/eSmartMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** ⚡ Mental Math Circuit: set the switches so the number flowing from IN arrives at OUT as the target. */
export default function MentalMathCircuit({ onExit }) {
  const progress = useGameProgress('mental-math-circuit', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = circuitConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [circuits] = useState(() => makeCircuitLevel(seeded(freshSeed()), cfg));
  const [ci, setCi] = useState(0);
  const [choice, setChoice] = useState(() => circuits[0].layers.map(() => 0));
  const [runs, setRuns] = useState([]);          // trails of the runs made on this circuit
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null);    // null | 'solved' | 'failed'
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const max = circuits.length * 2;
  const pass = Math.ceil(max * 0.6);
  const limitMs = cfg.seconds * 1000;
  const allDone = ci >= circuits.length;
  const elapsed = useEClock(started && !paused && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points, limitMs });

  const c = allDone ? null : circuits[ci];
  const trace = c?.mode === 'trace';
  const locked = !started || over || paused || status !== null;
  const lastRun = runs[runs.length - 1] || null;
  const shown = status === 'failed' ? runCircuit(c, c.solution) : lastRun;

  const flip = (layer, k) => {
    if (locked || trace) return;
    setChoice((ch) => ch.map((v, i) => (i === layer ? k : v)));
  };

  const run = () => {
    if (locked) return;
    const trail = runCircuit(c, choice);
    const out = trail[trail.length - 1];
    const tries = runs.length + 1;
    setRuns((r) => [...r, trail]);
    if (out === c.target) {
      sfx.right?.();
      setPoints((n) => n + (tries === 1 ? 2 : 1));
      setTally((t) => ({ ...t, correct: t.correct + 1 }));
      setStatus('solved');
      return;
    }
    sfx.wrong();
    if (tries >= cfg.runs) {
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }));
      setStatus('failed');
    }
  };

  const answerTrace = () => {
    if (locked || !input) return;
    const ok = Number(input) === c.target;
    if (ok) { sfx.right?.(); setPoints((n) => n + 2); setTally((t) => ({ ...t, correct: t.correct + 1 })); setStatus('solved'); }
    else { sfx.wrong(); setTally((t) => ({ ...t, wrong: t.wrong + 1 })); setStatus('failed'); }
    setRuns([runCircuit(c, c.solution)]);
  };

  const next = () => {
    const n = ci + 1;
    setCi(n);
    setChoice(n < circuits.length ? circuits[n].layers.map(() => 0) : []);
    setRuns([]);
    setInput('');
    setStatus(null);
  };

  const objective = `${circuits.length} circuits. A number enters at IN and passes through one operation at every junction. ${cfg.trace > 0 ? 'Some circuits have a fixed path: work out what reaches OUT. ' : ''}On the others, tap a switch at each junction so OUT equals the target — you get ${cfg.runs} test runs, 2 points on the first, 1 after. A node that would leave a remainder or go below zero shorts the circuit. ${cfg.seconds} seconds. Score ${pass} of ${max} to clear.`;

  const out = shown ? shown[shown.length - 1] : null;
  const message = status === 'solved'
    ? (trace ? `Correct — OUT is ${c.target}. +2` : runs.length === 1 ? `Circuit live! OUT = ${c.target} on the first run. +2` : `Circuit live! OUT = ${c.target}. +1`)
    : status === 'failed'
      ? (trace ? `OUT was ${c.target}. Follow the values down the circuit.` : 'Out of runs — this is the route that works.')
      : trace ? 'Follow the number down the wires. What comes out?'
        : lastRun ? (out === null ? 'Short circuit! A node hit a remainder or went below zero.' : `OUT = ${out}, not ${c.target}. ${cfg.runs - runs.length} run${cfg.runs - runs.length === 1 ? '' : 's'} left.`)
          : `Set the switches so OUT = ${c.target}, then Run.`;

  return (
    <GameShell
      title="Mental Math Circuit"
      blurb="Route the current so OUT hits the target."
      tone="bg-gradient-to-br from-slate-800 to-cyan-700"
      score={`${points}/${max}`}
      scoreLabel="Points"
      seconds={Math.ceil(Math.max(0, limitMs - elapsed) / 1000)}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((v) => !v)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: points >= pass,
        stars,
        headline: points >= pass ? `Level ${progress.level} cleared!` : timeUp && !allDone ? 'Time is up' : 'Nearly there',
        detail: `${points} of ${max} points · ${tally.correct} of ${circuits.length} circuits completed`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Circuit {Math.min(ci + 1, circuits.length)} of {circuits.length} · {trace ? 'type OUT and press Enter' : 'tap a switch at each junction, then Run'}</p>}
    >
      {started && c && (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2">
          <Node label="IN" value={c.input} tone="bg-cyan-600 text-white" />
          {c.layers.map((opts, i) => (
            <div key={i} className="flex w-full flex-col items-center">
              <Wire live={!!shown} />
              <div className="flex w-full flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label={`Junction ${i + 1}`}>
                {opts.map((op, k) => {
                  const on = trace || (status === 'failed' ? c.solution[i] === k : choice[i] === k);
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => flip(i, k)}
                      disabled={locked || trace}
                      className={`fp-press flex min-h-12 min-w-16 items-center justify-center rounded-xl px-3 font-mono text-lg font-black transition ${
                        on ? 'bg-amber-300 text-slate-900 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 ring-inset'
                      }`}
                    >
                      {op.label}
                    </button>
                  );
                })}
                {shown && (
                  <span className={`ml-1 min-w-10 text-sm font-black tabular-nums ${shown[i] === null ? 'text-rose-600' : 'text-cyan-700'}`} aria-label={`Value after junction ${i + 1}`}>
                    {shown[i] === null ? '⚡ short' : `= ${shown[i]}`}
                  </span>
                )}
              </div>
            </div>
          ))}
          <Wire live={!!shown} />
          <Node label={trace ? 'OUT' : 'TARGET'} value={trace ? (status ? c.target : input || '?') : c.target} tone={status === 'solved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-amber-300'} />

          <p className={`mt-1 min-h-6 text-center text-sm font-black ${status === 'solved' ? 'text-emerald-600' : status === 'failed' || (lastRun && !trace) ? 'text-rose-600' : 'text-ink-700'}`} role="status" aria-live="polite">{message}</p>

          {status ? (
            <button type="button" onClick={next} className="fp-press min-h-12 rounded-xl bg-cyan-700 px-6 text-sm font-black text-white" autoFocus>
              {ci + 1 < circuits.length ? 'Next circuit' : 'See result'}
            </button>
          ) : trace ? (
            <ENumPad value={input} onChange={setInput} onEnter={answerTrace} active={!locked} disabled={locked} maxLen={4} enterLabel="OUT" />
          ) : (
            <button type="button" onClick={run} disabled={locked} className="fp-press min-h-12 w-full max-w-xs rounded-xl bg-amber-400 text-base font-black text-slate-900 disabled:opacity-40">
              Run ({cfg.runs - runs.length} left)
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}

function Node({ label, value, tone }) {
  return (
    <div className={`flex min-w-32 items-center justify-between gap-3 rounded-2xl px-4 py-2 ${tone}`}>
      <span className="text-xs font-black tracking-[0.16em] uppercase opacity-80">{label}</span>
      <span className="text-2xl font-black tabular-nums">{value}</span>
    </div>
  );
}

function Wire({ live }) {
  return <span className={`block h-4 w-1 rounded-full ${live ? 'bg-amber-400' : 'bg-slate-300'}`} aria-hidden="true" />;
}
