import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { MONEY, changeConfig, makeChangeRound } from '../../data/bands/masterMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NOTE = { 10: 'from-amber-200 to-orange-300', 20: 'from-lime-200 to-yellow-300', 50: 'from-cyan-200 to-sky-300', 100: 'from-violet-200 to-purple-300', 200: 'from-amber-300 to-yellow-400', 500: 'from-stone-200 to-slate-300' };

/**
 * 🪙 Change Maker (2026-11-17, Master Minds · Math; Class 11+ the same day). You run the till: a bill of several items,
 * a discount, then GST, rounded to the rupee. The customer pays with notes; hand back the exact change.
 */
export default function ChangeMaker({ onExit }) {
  const progress = useGameProgress('change-maker', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = changeConfig(progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeChangeRound(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [tray, setTray] = useState([]);
  const [state, setState] = useState('play'); // play · right · wrong
  const [results, setResults] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const r = rounds[Math.min(idx, rounds.length - 1)];
  const given = tray.reduce((a, b) => a + b, 0);
  const correct = results.filter(Boolean).length;
  const over = results.length >= rounds.length;
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: results.length - correct, hints: 0, score: correct });

  const hand = () => {
    if (state !== 'play' || !tray.length) return;
    const ok = given === r.change;
    setState(ok ? 'right' : 'wrong');
    if (ok) sfx.right?.(); else sfx.wrong?.();
    timers.current.push(setTimeout(() => {
      setResults((x) => [...x, ok]);
      if (idx + 1 < rounds.length) { setIdx((n) => n + 1); setTray([]); setState('play'); }
    }, ok ? 1500 : 3600));
  };

  const usable = MONEY.filter((m) => m < r.paid);
  const objective = `You run the till. Work out the bill — items × quantity${config.discount ? ', minus the discount' : ''}${config.gst ? ', plus GST on the discounted price, rounded to the rupee' : ''} — then hand back the exact change in notes and coins. Tap the tray to take one back. ${rounds.length} customers; ${config.pass} right clears the level.`;

  return (
    <GameShell
      title="Change Maker"
      blurb="Bill, discount, GST — then the change."
      tone="bg-gradient-to-br from-amber-300 to-emerald-500"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Correct"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass, stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared — happy customers!` : 'A few customers were short-changed — try again',
        detail: `${correct} of ${rounds.length} customers given the right change`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-lg select-none">
          <div key={idx} className="gs-pop-in rounded-[1.75rem] bg-gradient-to-br from-amber-50 to-emerald-50 p-4 shadow-[0_18px_36px_-20px_rgba(5,150,105,0.5)] ring-1 ring-amber-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-widest text-emerald-700/70 uppercase">Customer {idx + 1} of {rounds.length}</p>
                <ul className="mt-1 space-y-0.5 text-sm font-bold text-emerald-950">
                  {r.lines.map((l) => <li key={l.item}>{l.item} <span className="text-emerald-700">₹{l.price} × {l.qty}</span></li>)}
                </ul>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.off > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-700">🏷️ {r.off}% off</span>}
                  {r.gst > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-700">+ {r.gst}% GST</span>}
                  {(r.off > 0 || r.gst > 0) && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">round to ₹1</span>}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500">Paid with</p>
                <Note value={r.paid} big />
              </div>
            </div>
            <button type="button" onClick={() => setTray([])} className={`mt-4 flex min-h-[4.5rem] w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-2 transition ${state === 'right' ? 'border-emerald-400 bg-emerald-50' : state === 'wrong' ? 'gs-wrong border-rose-300 bg-rose-50' : 'border-amber-300 bg-white/70'}`} aria-label="Change tray: tap to empty">
              {tray.length ? tray.map((m, k) => (
                <span key={k} role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); if (state === 'play') setTray(tray.filter((_, j) => j !== k)); }}>
                  {m >= 10 ? <Note value={m} /> : <Coin value={m} />}
                </span>
              )) : <span className="text-sm font-bold text-amber-700/60">Change tray</span>}
            </button>
            <p className="mt-2 text-center text-sm font-black" role="status">
              {state === 'right' ? <span className="text-emerald-600">Perfect change! {tray.length === r.best ? '✨ Fewest coins!' : ''}</span>
                : state === 'wrong' ? <span className="text-rose-600">Bill {r.why} → change ₹{r.change} (you gave ₹{given})</span>
                  : <span className="text-slate-600">In the tray: ₹{given}</span>}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {usable.map((m) => (
              <button key={m} type="button" onClick={() => state === 'play' && setTray([...tray, m])} className="transition hover:-translate-y-0.5 active:translate-y-0" aria-label={`₹${m}`}>
                {m >= 10 ? <Note value={m} /> : <Coin value={m} />}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={hand} disabled={state !== 'play' || !tray.length}
              className="rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3 text-base font-black text-white shadow-[0_10px_20px_-10px_rgba(5,150,105,0.9)] transition hover:brightness-110 disabled:opacity-40">
              Give change
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

function Coin({ value }) {
  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black shadow-[inset_0_-3px_0_rgba(0,0,0,0.15),0_4px_8px_-4px_rgba(0,0,0,0.4)] ring-2 ${value === 5 ? 'bg-gradient-to-br from-yellow-200 to-amber-400 text-amber-900 ring-amber-300' : 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-700 ring-slate-300'}`}>
      ₹{value}
    </span>
  );
}

function Note({ value, big = false }) {
  return (
    <span className={`flex items-center justify-center rounded-lg bg-gradient-to-br font-black text-slate-800 shadow-[0_4px_8px_-4px_rgba(0,0,0,0.4)] ring-1 ring-black/10 ${NOTE[value] || 'from-rose-200 to-pink-300'} ${big ? 'h-12 w-24 text-lg' : 'h-10 w-[4.25rem] text-sm'}`}>
      ₹{value}
    </span>
  );
}
