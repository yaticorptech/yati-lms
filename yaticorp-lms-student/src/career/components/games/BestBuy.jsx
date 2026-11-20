import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { buyConfig, makeBuyQuestion } from '../../data/bands/masterMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const CARD = ['from-sky-50 to-blue-100 ring-sky-200', 'from-rose-50 to-pink-100 ring-pink-200', 'from-lime-50 to-emerald-100 ring-emerald-200'];

/**
 * 🛒 Best Buy (2026-11-17, Master Minds · Math; Class 11+ the same day). Three offers — which is really the best?
 * Unit prices in g and ml, stacked discounts, "buy 2 get 1" deals, EMIs and interest: the maths behind real money.
 */
export default function BestBuy({ onExit }) {
  const progress = useGameProgress('best-buy', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = buyConfig(progress.difficulty, progress.levelNo);
  const [qs] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.questions }, () => makeBuyQuestion(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const q = qs[Math.min(idx, qs.length - 1)];
  const correct = results.filter(Boolean).length;
  const over = results.length >= qs.length;
  const stars = over ? starsForFixed(correct, config.pass, qs.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: results.length - correct, hints: 0, score: correct });

  const choose = (i) => {
    if (picked !== null) return;
    const ok = i === q.best;
    setPicked(i);
    if (ok) sfx.right?.(); else sfx.wrong?.();
    timers.current.push(setTimeout(() => {
      setResults((r) => [...r, ok]);
      setPicked(null);
      if (idx + 1 < qs.length) setIdx((n) => n + 1);
    }, ok ? 1800 : 3600));
  };

  const objective = `Real money decisions: compare price per kg or litre, see that 20% + 10% is not 30%, turn "buy 2 get 1" into a percentage${config.kinds.includes('emi') ? ', add up EMIs' : ''}${config.kinds.includes('interest') ? ', and compare simple with compound interest' : ''}. Tap the best offer. ${qs.length} questions — ${config.pass} right clears the level.`;

  return (
    <GameShell
      title="Best Buy"
      blurb="Find the real best deal."
      tone="bg-gradient-to-br from-emerald-300 to-sky-500"
      score={`${correct}/${qs.length}`}
      scoreLabel="Smart buys"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass, stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared — a savvy shopper!` : 'A few deals slipped by — try again',
        detail: `${correct} of ${qs.length} best buys spotted`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-xl select-none">
          <p className="mb-1 text-center text-xs font-black tracking-widest text-emerald-700/70 uppercase">Shelf {idx + 1} of {qs.length}</p>
          <p className="mb-4 text-center text-lg font-black text-emerald-950">{q.prompt}</p>
          <div key={idx} className={`grid gap-3 ${q.offers.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
            {q.offers.map((o, i) => {
              const show = picked !== null;
              const best = i === q.best;
              return (
                <button key={i} type="button" onClick={() => choose(i)} disabled={show}
                  className={`gs-pop-in relative flex min-h-[7rem] flex-col items-center justify-center rounded-[1.5rem] bg-gradient-to-br p-4 text-center shadow-[0_14px_28px_-18px_rgba(15,23,42,0.5)] ring-2 transition hover:-translate-y-1 ${CARD[i]} ${show && best ? 'gs-right !ring-emerald-500' : show && i === picked ? 'gs-wrong !ring-rose-500' : ''}`}>
                  <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Offer {String.fromCharCode(65 + i)}</span>
                  <span className="mt-1 text-base leading-snug font-black text-slate-900 sm:text-lg">{o.label}</span>
                  {show && best && <span className="absolute -top-3 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-black text-white shadow">Best buy ✓</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-4 min-h-10 text-center text-sm font-bold text-slate-600" role="status">{picked !== null ? q.why : ''}</p>
        </div>
      )}
    </GameShell>
  );
}
