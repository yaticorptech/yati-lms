import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { chefConfig, cooks, makeChefLevel } from '../../data/bands/chefMemory';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const RESULT_MS = 2600;

/** Merge the pot's taps into runs for display: 🍅 🍅 🧅 → [['🍅', 2], ['🧅', 1]]. */
const runsOf = (pot) => pot.reduce((out, e) => {
  const last = out[out.length - 1];
  if (last && last[0] === e) last[1] += 1; else out.push([e, 1]);
  return out;
}, []);

/** A recipe as chips: 2 🍅 → 1 🧅 → 3 🥕. */
function RecipeLine({ recipe, ordered, size = 'lg' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {recipe.map(([emoji, qty], i) => (
        <span key={`${emoji}${i}`} className="flex items-center gap-1.5">
          {i > 0 && ordered && <span className="text-sm font-black text-amber-700/60" aria-hidden>→</span>}
          <span className={`inline-flex items-center gap-1 rounded-xl bg-white font-black text-slate-800 shadow-sm ring-1 ring-amber-200 ${size === 'lg' ? 'px-2.5 py-1.5 text-lg' : 'px-2 py-0.5 text-sm'}`}>
            {qty}<span className={size === 'lg' ? 'text-2xl leading-none' : 'text-base leading-none'}>{emoji}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * 👨‍🍳 Chef's Memory (2026-11-16, replaces Brain Pairs; same id "pattern-recall" so records are kept). A recipe shows,
 * hides; cook it from memory — the right ingredients, amounts and (later) order. Twist cards change the recipe after
 * it hides. data/bands/chefMemory.js builds the orders.
 */
export default function ChefMemory({ onExit }) {
  const progress = useGameProgress('pattern-recall', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = chefConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [orders] = useState(() => makeChefLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('study'); // study → twist? → cook → result
  const [left, setLeft] = useState(config.study);
  const [pot, setPot] = useState([]);
  const [result, setResult] = useState(null);
  const [correct, setCorrect] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = idx >= orders.length;
  const order = over ? null : orders[idx];
  const stars = over ? starsForFixed(correct, config.pass, orders.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: orders.length - correct, hints: 0, score: correct });

  const afterStudy = () => setPhase(order.twist ? 'twist' : 'cook');

  // The time to memorise (2026-11-18 fix): one interval per recipe — it used to restart on every render, so on a busy
  // screen it never ran out, the recipe never hid and nothing could be added to the pot.
  const afterRef = useRef(afterStudy);
  useEffect(() => { afterRef.current = afterStudy; });
  useEffect(() => {
    if (!started || phase !== 'study' || over) return undefined;
    const end = Date.now() + config.study * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { clearInterval(t); afterRef.current(); }
    }, 250);
    return () => clearInterval(t);
  }, [started, phase, over, idx, config.study]);

  const add = (e) => { if (phase === 'cook') setPot((p) => [...p, e]); };
  const undo = () => setPot((p) => p.slice(0, -1));

  const cook = () => {
    if (phase !== 'cook' || !pot.length) return;
    const ok = cooks(order, pot, config.ordered);
    if (ok) { sfx.right?.(); setCorrect((c) => c + 1); } else sfx.wrong?.();
    setResult(ok);
    setPhase('result');
    timers.current.push(setTimeout(() => {
      setIdx((i) => i + 1);
      setPot([]);
      setResult(null);
      setLeft(config.study);
      setPhase('study');
    }, RESULT_MS));
  };

  const objective = `Each round remembers a different way: a whole recipe card, a cooking show with one ingredient at a time, or two tables ordering at once (then the waiter says whose to cook). It hides — cook it from memory: tap the ingredients into the pot — the right amounts${config.ordered ? ', in the right order' : ''} — then press Cook!${config.twist ? ' Watch for twist cards that change the recipe!' : ''} Cook ${config.pass} of ${orders.length} dishes perfectly.`;

  return (
    <GameShell
      title="Chef's Memory"
      blurb="Remember the recipe, then cook it perfectly!"
      tone="bg-gradient-to-br from-orange-400 to-rose-600"
      score={`${correct}/${orders.length}`}
      scoreLabel="Dishes"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: config.study, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass,
        stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared, Chef!` : 'The kitchen needs more practice',
        detail: `${correct} of ${orders.length} dishes cooked perfectly`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Order {Math.min(idx + 1, orders.length)} of {orders.length}{config.ordered ? ' · order matters' : ' · any order'}</p>}
    >
      {started && order && (
        <div className="mx-auto w-full max-w-2xl select-none">
          {/* Kitchen header: the dish */}
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-white shadow-md">
            <p className="flex items-center gap-2 text-base font-black"><span className="text-2xl" aria-hidden>{order.dish[0]}</span>{order.dish[1]}</p>
            <div className="flex gap-1" aria-hidden>
              {orders.map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < idx ? 'bg-white' : i === idx ? 'bg-amber-200 ring-2 ring-white/60' : 'bg-white/30'}`} />)}
            </div>
          </div>

          {/* The recipe card / twist / result */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-[repeating-linear-gradient(180deg,#fffbeb_0_30px,#fde68a_30px_31px)] p-4 shadow-[0_10px_24px_-14px_rgba(180,83,9,0.6)] ring-1 ring-amber-200">
            <span aria-hidden className="absolute -top-2 left-1/2 h-5 w-20 -translate-x-1/2 rotate-1 rounded-sm bg-rose-300/80" />
            {phase === 'study' && (
              <div className="text-center">
                {order.style === 'tables' ? (
                  <>
                    <p className="mb-2 text-xs font-black tracking-[0.16em] text-amber-800 uppercase">🛎️ Two tables order · remember both!</p>
                    <div className="grid gap-2">
                      {order.tables.map((t, k) => (
                        <div key={k} className="rounded-2xl bg-white/80 p-2 ring-1 ring-amber-200">
                          <p className="mb-1 text-[11px] font-black text-amber-700">TABLE {k + 1}</p>
                          <RecipeLine recipe={t} ordered={config.ordered} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : order.style === 'flash' ? (
                  <>
                    <p className="mb-2 text-xs font-black tracking-[0.16em] text-amber-800 uppercase">📺 Cooking show · one at a time!</p>
                    {(() => {
                      const per = config.study / order.shown.length;
                      const at = Math.min(order.shown.length - 1, Math.floor((config.study - left) / per));
                      const [e, q] = order.shown[at];
                      return (
                        <div className="flex flex-col items-center">
                          <span key={at} className="oo-pop grid h-24 w-28 place-items-center rounded-3xl bg-white text-4xl font-black text-slate-900 shadow-[0_6px_0_rgba(180,83,9,0.2)] ring-2 ring-amber-200">{q} {e}</span>
                          <p className="mt-2 text-xs font-bold text-amber-700">Step {at + 1} of {order.shown.length}{config.ordered ? ' · the order matters' : ''}</p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-xs font-black tracking-[0.16em] text-amber-800 uppercase">📝 Recipe · remember it!</p>
                    <RecipeLine recipe={order.shown} ordered={config.ordered} />
                  </>
                )}
                {/* Time to study, running out; cooking starts when it is empty (2026-11-16, the user). */}
                <div className="mx-auto mt-3 h-2.5 max-w-xs overflow-hidden rounded-full bg-amber-200/70" role="progressbar" aria-label="Time to remember" aria-valuemin={0} aria-valuemax={config.study} aria-valuenow={left}>
                  <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${left <= 2 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{ width: `${(left / config.study) * 100}%` }} />
                </div>
                <button type="button" onClick={afterStudy} className="fp-press mt-3 rounded-full bg-amber-500 px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#b45309]">I've got it — start cooking ({left}s)</button>
              </div>
            )}
            {phase === 'twist' && (
              <div className="gs-rise text-center">
                <p className="text-xs font-black tracking-[0.16em] text-rose-600 uppercase">{order.twist.kind === 'table' ? '🛎️ The waiter says…' : '⚡ Twist! The customer says…'}</p>
                <p className="mt-1.5 text-xl font-black text-slate-900">“{order.twist.text}”</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{order.twist.kind === 'table' ? 'Which order was theirs? Cook it from memory.' : 'Change the recipe in your head.'}</p>
                <button type="button" onClick={() => setPhase('cook')} className="fp-press mt-3 rounded-full bg-rose-500 px-5 py-2 text-sm font-black text-white shadow">OK, Chef!</button>
              </div>
            )}
            {phase === 'cook' && (
              <p className="py-3 text-center text-base font-black text-amber-900">🙈 The recipe is hidden — cook it from memory!</p>
            )}
            {phase === 'result' && (
              <div className="gs-rise text-center" role="status" aria-live="polite">
                <p className={`text-lg font-black ${result ? 'text-emerald-700' : 'text-rose-700'}`}>{result ? `Perfect ${order.dish[1]}! ${order.dish[0]}✨` : 'Oh no — burnt! 💨'}</p>
                {!result && (
                  <>
                    <p className="mt-1 mb-1.5 text-xs font-bold text-slate-500">It should have been:</p>
                    <RecipeLine recipe={order.answer} ordered={config.ordered} size="sm" />
                  </>
                )}
              </div>
            )}
          </div>

          {/* The pot */}
          <div className="mt-4 flex flex-col items-center">
            <div className={`relative w-full max-w-md rounded-b-[3rem] rounded-t-2xl bg-gradient-to-b from-slate-600 to-slate-800 p-2 shadow-[0_14px_24px_-12px_rgba(15,23,42,0.8)] ${phase === 'result' && !result ? 'gs-wrong' : ''}`}>
              <span aria-hidden className="absolute top-3 -left-3 h-4 w-5 rounded-l-full bg-slate-700" />
              <span aria-hidden className="absolute top-3 -right-3 h-4 w-5 rounded-r-full bg-slate-700" />
              {phase === 'result' && <span aria-hidden className="absolute -top-7 left-1/2 -translate-x-1/2 animate-pulse text-2xl">{result ? '♨️' : '💨'}</span>}
              <div className={`flex min-h-16 flex-wrap items-center justify-center gap-1.5 rounded-b-[2.5rem] rounded-t-xl px-3 py-2 ${phase === 'result' ? (result ? 'bg-amber-300' : 'bg-stone-700') : 'bg-orange-200'}`}>
                {pot.length === 0 && <span className="text-sm font-bold text-orange-800/70">{phase === 'cook' ? 'Tap ingredients to add them' : 'The pot is empty'}</span>}
                {runsOf(pot).map(([e, n], i) => (
                  <span key={`${e}${i}`} className="gs-rise inline-flex items-center gap-0.5 rounded-lg bg-white/90 px-1.5 py-0.5 text-sm font-black text-slate-800 shadow-sm">
                    {n}<span className="text-lg leading-none">{e}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* The pantry */}
          <div className="mt-4 rounded-[1.5rem] bg-gradient-to-b from-amber-100 to-orange-100 p-3 ring-1 ring-orange-200">
            <p className="mb-2 text-center text-[0.65rem] font-black tracking-[0.16em] text-orange-700 uppercase">Pantry · tap to add one</p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
              {order.pantry.map((e) => (
                <button key={e} type="button" onClick={() => add(e)} disabled={phase !== 'cook'} aria-label={`Add ${e}`}
                  className="fp-press grid aspect-square place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-orange-200 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-3">
            <button type="button" onClick={undo} disabled={phase !== 'cook' || !pot.length} className="fp-press min-h-12 rounded-full bg-white px-5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40">↩ Undo</button>
            <button type="button" onClick={cook} disabled={phase !== 'cook' || !pot.length}
              className="fp-press min-h-12 rounded-full bg-gradient-to-b from-orange-400 to-rose-500 px-9 text-base font-black text-white shadow-[0_10px_20px_-8px_rgba(225,29,72,0.7)] ring-2 ring-white disabled:opacity-40">
              Cook! 🔥
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
