import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsCap, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { canMake, nextTarget, popConfig, refillBubbles } from '../../data/bands/masterMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const BUBBLE = ['#f9a8d4', '#93c5fd', '#fcd34d', '#86efac', '#c4b5fd', '#fdba74', '#67e8f9', '#fda4af', '#a5b4fc'];

/**
 * 🫧 Sum Pop (2026-11-17, Master Minds · Math; made harder the same day for Class 11+). Bubbles float with numbers —
 * negatives too; tap two or three that add up to the target (or, on later levels, two that multiply to it) and they
 * pop. Every pop brings a new target, always one that the board can make.
 */
export default function SumPop({ onExit }) {
  const progress = useGameProgress('sum-pop', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = popConfig(progress.difficulty, progress.levelNo);
  const [rng] = useState(() => seeded(freshSeed()));
  const [nums, setNums] = useState(() => refillBubbles(rng, Array(config.bubbles).fill(null), config));
  const [target, setTarget] = useState(() => nextTarget(rng, nums, config, 0));
  const [burst, setBurst] = useState(null); // the last pop, shown as a little "+1 · −12 + 35 = 23" ribbon
  const [gen, setGen] = useState(() => Array(config.bubbles).fill(0)); // bumps a slot's key so a new bubble pops in
  const [sel, setSel] = useState([]);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const cap = starsCap(config.goal);
  const { seconds, over: timeUp } = useTimedRound(config.seconds, started, score >= cap);
  const over = started && (timeUp || score >= cap);
  const stars = over ? starsFor(score, config.goal) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong: 0, hints: 0, score });

  const product = target.mode === 'product';
  const sum = product ? sel.reduce((a, i) => a * nums[i], 1) : sel.reduce((a, i) => a + nums[i], 0);
  const tap = (i) => {
    if (!started || over) return;
    if (sel.includes(i)) { setSel(sel.filter((x) => x !== i)); return; }
    const next = [...sel, i];
    const s = product ? sum * nums[i] : sum + nums[i];
    if (s === target.value && next.length >= 2) {
      sfx.right?.();
      setScore((n) => n + 1);
      setBurst(`${next.map((k) => (nums[k] < 0 ? `(${nums[k]})` : nums[k])).join(product ? ' × ' : ' + ')} = ${target.value}`);
      const cleared = nums.map((n, k) => (next.includes(k) ? null : n));
      let fresh = refillBubbles(rng, cleared, config);
      let t = nextTarget(rng, fresh, config, score + 1);
      if (!canMake(fresh, t)) { fresh = refillBubbles(rng, cleared, config); t = nextTarget(rng, fresh, config, score + 1); }
      setNums(fresh);
      setTarget(t);
      setGen((g) => g.map((v, k) => (next.includes(k) ? v + 1 : v)));
      setSel([]);
    } else if (next.length >= (product ? 2 : 3)) {
      sfx.wrong?.();
      setMiss(true);
      setSel([]);
      timers.current.push(setTimeout(() => setMiss(false), 400));
    } else setSel(next);
  };

  const objective = `Tap two or three bubbles that add up to the target — watch the negatives!${config.products ? ' On ✖️ targets, tap two bubbles that multiply to it.' : ''} Each pop brings a new target. Pop ${config.goal} in ${config.seconds} seconds.`;

  return (
    <GameShell
      title="Sum Pop"
      blurb="Pop bubbles that make the target."
      tone="bg-gradient-to-br from-sky-300 to-pink-400"
      score={score}
      scoreLabel="Pops"
      seconds={started ? seconds : undefined}
      totalSeconds={config.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared — pop pop pop!` : `So close — aim for ${config.goal} pops`,
        detail: `${score} targets popped`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-md select-none">
          <style>{'@keyframes sp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}'}</style>
          <div className="mb-3 flex items-center justify-center gap-3">
            <span key={`${target.mode}${target.value}${score}`} className={`gs-pop-in rounded-2xl px-4 py-1.5 text-sm font-black text-white shadow-md ${product ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-gradient-to-r from-sky-500 to-pink-500'}`}>
              {product ? '✖️ Multiply to' : '➕ Add to'} <span className="text-2xl tabular-nums">{target.value}</span>
            </span>
            <span className={`rounded-full px-4 py-1.5 text-sm font-black shadow-sm ring-1 ${miss ? 'gs-wrong bg-rose-50 text-rose-600 ring-rose-200' : 'bg-white text-sky-900 ring-sky-100'}`}>
              {product ? 'Product' : 'Sum'} <span className="text-xl tabular-nums">{sel.length ? sum : '—'}</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 rounded-[2rem] bg-gradient-to-b from-sky-100 via-cyan-50 to-pink-50 p-4 shadow-[0_18px_36px_-20px_rgba(14,165,233,0.6)] ring-1 ring-sky-100">
            {nums.map((n, i) => (
              <button key={`${i}-${gen[i]}`} type="button" onClick={() => tap(i)} aria-label={`Bubble ${n}${sel.includes(i) ? ', selected' : ''}`}
                className="gs-pop-in aspect-square" style={{ animation: `sp-bob ${2.4 + (i % 4) * 0.35}s ease-in-out ${(i % 5) * 0.3}s infinite` }}>
                <span className={`relative flex h-full w-full items-center justify-center rounded-full text-xl font-black text-slate-800 tabular-nums sm:text-2xl transition-transform duration-150 ${sel.includes(i) ? 'scale-110 ring-4 ring-pink-500' : 'ring-2 ring-white/80'}`}
                  style={{ background: `radial-gradient(circle at 32% 28%, #ffffff 0 12%, ${BUBBLE[Math.abs(n) % BUBBLE.length]} 45%, ${BUBBLE[Math.abs(n) % BUBBLE.length]})`, boxShadow: '0 8px 18px -10px rgba(15,23,42,0.45)' }}>
                  {n}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 h-5 text-center text-sm font-black text-emerald-600" role="status">{burst ? `✨ ${burst}` : ''}</p>
          <p className="text-center text-xs font-bold text-slate-500">Goal: {config.goal} pops</p>
        </div>
      )}
    </GameShell>
  );
}
