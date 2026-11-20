import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { estimateConfig, makeEstimateRound } from '../../data/bands/masterMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/**
 * 🎯 Estimate It (2026-11-17, Master Minds · Math; Class 11+ the same day). No time to work it out exactly — a sharp
 * estimate. 487 × 2.1, √6,300, 17.5% of 4,280, ₹50,000 at 8% for 9 years, 2^16… A clock bar runs down on every
 * question; the options are far apart, so good number sense always wins.
 */
export default function QuickEstimate({ onExit }) {
  const progress = useGameProgress('quick-estimate', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const KIND_TAG = { mul: '✖️ Multiply', pct: '％ Percent', div: '➗ Divide', root: '√ Square root', grow: '📈 Growth', frac: '🍰 Fraction of', pow: '⚡ Power', mix: '🧮 Mixed' };
const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function Round({ progress, onExit }) {
  const config = estimateConfig(progress.difficulty, progress.levelNo);
  const [qs] = useState(() => makeEstimateRound(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);   // an option, or 'time' when the clock ran out
  const [results, setResults] = useState([]);
  const [left, setLeft] = useState(config.perQuestion * 10); // tenths of a second
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const q = qs[Math.min(idx, qs.length - 1)];
  const correct = results.filter(Boolean).length;
  const over = results.length >= qs.length;
  const stars = over ? starsForFixed(correct, config.pass, qs.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: results.length - correct, hints: 0, score: correct });

  const settle = (opt) => {
    const ok = opt === q.answer;
    setPicked(opt);
    if (ok) sfx.right?.(); else sfx.wrong?.();
    timers.current.push(setTimeout(() => {
      setResults((r) => [...r, ok]);
      setPicked(null);
      setLeft(config.perQuestion * 10);
      if (idx + 1 < qs.length) setIdx((n) => n + 1);
    }, ok ? 1300 : 2600));
  };

  // The clock bar: a tenth of a second at a time while the question is open.
  const open = started && !over && picked === null;
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => { if (left <= 1) settle('time'); else setLeft((n) => n - 1); }, 100);
    return () => clearTimeout(t);
  });

  const choose = (opt) => { if (picked === null) settle(opt); };

  const objective = `Estimate — don’t calculate! Products, square roots, percentages, division${config.kinds.includes('grow') ? ', money growing at interest' : ''}${config.kinds.includes('pow') ? ', powers' : ''}. Round smartly and pick the closest option before the bar runs out (${config.perQuestion} s). ${qs.length} questions — ${config.pass} to clear the level.`;
  const reveal = picked !== null && `${picked === 'time' ? '⏰ Time! ' : ''}Exactly ${q.unit}${fmt(Math.round(q.exact * 100) / 100)}`;
  const share = left / (config.perQuestion * 10);

  return (
    <GameShell
      title="Estimate It"
      blurb="Sharp estimates, against the clock."
      tone="bg-gradient-to-br from-violet-300 to-amber-400"
      score={`${correct}/${qs.length}`}
      scoreLabel="Good guesses"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass, stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared — great number sense!` : 'Close — try again',
        detail: `${correct} of ${qs.length} estimates on target`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-lg select-none">
          <div className="mb-2 flex items-center justify-between text-xs font-black tracking-widest text-violet-700/70 uppercase">
            <span>Question {idx + 1} of {qs.length}</span>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 tracking-normal normal-case text-violet-700">{KIND_TAG[q.kind]}</span>
          </div>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-violet-100">
            <div className={`h-full rounded-full transition-[width] duration-100 ${share < 0.3 ? 'bg-rose-500' : share < 0.6 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${share * 100}%` }} />
          </div>
          <div key={idx} className="gs-pop-in relative mx-auto flex min-h-[9rem] w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-5 text-center text-white shadow-[0_18px_36px_-16px_rgba(109,40,217,0.7)]">
            <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-amber-300/20" />
            <p className="text-xs font-black tracking-[0.2em] text-white/70 uppercase">≈ About how much is</p>
            <p className="mt-2 text-3xl leading-tight font-black sm:text-4xl">{q.show}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {q.options.map((opt) => {
              const show = picked !== null;
              const right = opt === q.answer;
              return (
                <button key={opt} type="button" onClick={() => choose(opt)} disabled={show}
                  className={`rounded-2xl px-4 py-3.5 text-lg font-black shadow-sm ring-2 transition sm:text-xl ${show && right ? 'gs-right bg-emerald-500 text-white ring-emerald-500' : show && opt === picked ? 'gs-wrong bg-rose-500 text-white ring-rose-500' : 'bg-white text-violet-950 ring-violet-100 hover:-translate-y-0.5 hover:ring-violet-300'}`}>
                  ≈ {q.unit}{fmt(opt)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 h-5 text-center text-sm font-bold text-slate-600" role="status">{reveal || ''}</p>
        </div>
      )}
    </GameShell>
  );
}
