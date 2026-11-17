import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { basketMatches, basketTotal, changeCoins, makeShopLevel, shopConfig } from '../../data/bands/youngB';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const COIN_STYLE = (v) => (v >= 10 ? 'bg-emerald-200 text-emerald-900 ring-emerald-400 rounded-xl' : 'bg-amber-200 text-amber-900 ring-amber-400 rounded-full');

/** 🛒 Fruit Shop Challenge: put the shopping list in the basket, work out the bill, and give the right change. */
export default function FruitShop({ onExit }) {
  const progress = useGameProgress('fruit-shop', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const FRESH_TASK = { stage: 'basket', basket: {}, entry: '', coins: [], slips: 0, feedback: null };

function Round({ progress, onExit }) {
  const config = shopConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [tasks] = useState(() => makeShopLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [s, setS] = useState(FRESH_TASK);

  const over = index >= tasks.length;
  const task = over ? null : tasks[index];
  const stars = over ? starsForFixed(score.correct, config.pass, tasks.length) : 0;
  useRecordStars(progress, over, stars, { correct: score.correct, wrong: score.wrong, hints: 0, score: score.correct });

  const slip = (feedback) => {
    sfx.wrong();
    setScore((x) => ({ ...x, wrong: x.wrong + 1 }));
    setS((x) => ({ ...x, slips: x.slips + 1, feedback }));
  };
  const finish = () => {
    sfx.right?.();
    if (s.slips === 0) setScore((x) => ({ ...x, correct: x.correct + 1 }));
    setS((x) => ({ ...x, stage: 'done', feedback: x.slips === 0 ? 'perfect' : 'done' }));
  };
  const nextTask = () => { setIndex((i) => i + 1); setS(FRESH_TASK); };

  const add = (name) => { if (s.stage === 'basket') setS({ ...s, basket: { ...s.basket, [name]: (s.basket[name] || 0) + 1 }, feedback: null }); };
  const remove = (name) => {
    if (s.stage !== 'basket') return;
    const b = { ...s.basket, [name]: s.basket[name] - 1 };
    if (b[name] <= 0) delete b[name];
    setS({ ...s, basket: b, feedback: null });
  };

  const checkBasket = () => {
    if (basketMatches(task, s.basket)) { setS({ ...s, stage: 'total', feedback: 'basket-ok' }); return; }
    slip('basket');
  };
  const checkTotal = () => {
    if (s.entry === '') return;
    if (Number(s.entry) === task.total) {
      if (config.change) { setS({ ...s, stage: 'change', feedback: 'total-ok' }); return; }
      finish();
      return;
    }
    setS((x) => ({ ...x, entry: '' }));
    slip('total');
  };
  const coinsSum = s.coins.reduce((a, b) => a + b, 0);
  const checkChange = () => {
    if (!s.coins.length) return;
    if (coinsSum === task.change) { finish(); return; }
    slip(coinsSum > task.change ? 'change-high' : 'change-low');
  };

  const press = (k) => {
    if (s.stage !== 'total') return;
    if (k === 'del') setS({ ...s, entry: s.entry.slice(0, -1) });
    else if (k === 'ok') checkTotal();
    else if (s.entry.length < 3) setS({ ...s, entry: (s.entry + k).replace(/^0+(?=\d)/, '') });
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter' && s.stage === 'total') press('ok');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const nameOf = (it) => {
    const f = task.shelf.find((x) => x.name === it.name);
    return `${it.qty} ${it.qty === 1 ? f.name : f.plural}`;
  };
  const listText = task ? task.list.map(nameOf).join(' and ') : '';
  const sums = task ? task.list.map((it) => `${it.qty} × ₹${task.shelf.find((f) => f.name === it.name).price}`).join(' + ') : '';

  const fb = s.feedback;
  const message = {
    basket: young ? 'Hmm, the basket does not match the list. Look again! 💪' : 'The basket does not match the list — check each fruit.',
    'basket-ok': 'Basket is right! Now, how much is the bill?',
    total: s.slips >= 2 ? `Try adding: ${sums}` : 'Not quite. Add up the prices again!',
    'total-ok': `Yes, ₹${task?.total}! You pay with a ₹${task?.paid} note. Tap coins to give the change.`,
    'change-high': 'That is too much change. Take some coins back.',
    'change-low': 'That is not enough change yet.',
    perfect: 'Perfect shopping! 🎉',
    done: 'Well done — all paid! 🎉'
  }[fb] || (s.stage === 'basket' ? `Put ${listText} in the basket.` : s.stage === 'total' ? 'How much is the bill? Type it in.' : s.stage === 'change' ? `₹${task?.paid} − ₹${task?.total}: give the change.` : '');
  const happy = ['basket-ok', 'total-ok', 'perfect', 'done'].includes(fb);

  const objective = young
    ? `Read the shopping list. Tap fruits to put them in the basket, then type how much it costs. Get ${config.pass} of ${tasks.length} lists right first time.`
    : `Fill the basket from the list, work out the bill, then you pay with a note — tap coins to give back the right change. Get ${config.pass} of ${tasks.length} lists right with no slips.`;

  const inBasket = task ? Object.entries(s.basket).filter(([, n]) => n > 0) : [];

  return (
    <GameShell
      title="Fruit Shop Challenge"
      blurb={young ? 'Shop for fruit and pay!' : `Shop and give change: ${config.pass} of ${tasks.length}.`}
      tone="bg-gradient-to-br from-lime-500 to-emerald-700"
      score={`${score.correct}/${tasks.length}`}
      scoreLabel="Perfect"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared!` : 'Nearly there',
        detail: `${score.correct} of ${tasks.length} shopping lists done with no slips`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Customer {Math.min(index + 1, tasks.length)} of {tasks.length} · type numbers on the keyboard too</p>}
    >
      {started && task && (
        <div className="mx-auto w-full max-w-2xl">
          {/* The scene: a sunny street, the stall on the left, the customer on the right. */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-sky-100 to-amber-50 shadow-[0_20px_40px_-24px_rgba(14,116,144,0.6)] ring-1 ring-sky-200">
            <span aria-hidden className="absolute top-3 right-5 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400 shadow-[0_0_30px_10px_rgba(253,224,71,0.55)]" />
            <span aria-hidden className="absolute top-5 left-[38%] text-2xl opacity-80">☁️</span>
            <span aria-hidden className="absolute top-10 left-[62%] text-xl opacity-70">☁️</span>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-lime-300 to-green-400" />

            <div className="relative flex flex-col gap-3 p-3 pt-6 sm:flex-row sm:items-end sm:gap-4 sm:p-5 sm:pt-8">
              {/* ---- The stall ---- */}
              <div className="relative min-w-0 flex-1">
                {/* Canopy */}
                <div aria-hidden className="relative z-10 mx-1 flex overflow-hidden rounded-t-2xl shadow-md">
                  {CANOPY.map((c, k) => <span key={k} className={`h-7 flex-1 ${c}`} />)}
                </div>
                <div aria-hidden className="relative z-10 mx-1 flex">
                  {CANOPY.map((c, k) => <span key={k} className={`h-3.5 flex-1 rounded-b-full ${c} shadow-sm`} />)}
                </div>
                <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 px-4 py-1 text-xs font-black tracking-wider whitespace-nowrap text-amber-50 shadow-md ring-2 ring-amber-300 sm:text-sm">
                  🍉 FRESH FRUITS 🍇
                </div>

                {/* Back wall with the shopkeeper and what they say */}
                <div className="relative mx-3 -mt-3 flex items-end gap-2 rounded-b-none bg-gradient-to-b from-orange-50 to-amber-100 px-3 pt-6 pb-0 ring-1 ring-amber-200 sm:px-4">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-amber-600 to-amber-800" />
                  <span aria-hidden className="absolute inset-y-0 right-0 w-2 bg-gradient-to-b from-amber-600 to-amber-800" />
                  <span className="text-6xl leading-none drop-shadow-[0_4px_3px_rgba(0,0,0,0.2)] sm:text-7xl" aria-hidden>🧑‍🌾</span>
                  <p className={`relative mb-6 rounded-2xl rounded-bl-sm px-3 py-2 text-sm font-black shadow-sm ring-2 sm:text-[0.95rem] ${happy ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : ['basket', 'total', 'change-high', 'change-low'].includes(fb) ? 'bg-rose-50 text-rose-700 ring-rose-300' : 'bg-white text-slate-800 ring-amber-200'}`} role="status" aria-live="polite">
                    {message}
                  </p>
                </div>

                {/* The counter, with the fruit crates on it */}
                <div className="relative mx-1 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 px-2 pt-2 pb-5 shadow-[0_10px_16px_-8px_rgba(120,53,15,0.7)] sm:px-3" aria-label="Fruit shelf">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-2 rounded-t-xl bg-amber-300/70" />
                  <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2.5">
                    {task.shelf.map((f) => (
                      <button key={f.name} type="button" onClick={() => add(f.name)} disabled={s.stage !== 'basket'} aria-label={`Add one ${f.name}, ₹${f.price} each`}
                        className="fp-press group relative flex flex-col items-center disabled:opacity-70">
                        <span className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-lg bg-[repeating-linear-gradient(180deg,#fde68a_0_9px,#fbbf24_9px_11px)] pb-0.5 shadow-inner ring-2 ring-amber-800/40 transition group-hover:-translate-y-0.5 sm:h-16">
                          <span className="mb-1 text-4xl leading-none drop-shadow-[0_3px_2px_rgba(0,0,0,0.25)] transition-transform group-active:scale-90 sm:text-[2.6rem]" aria-hidden="true">{f.emoji}</span>
                        </span>
                        <span className="absolute -bottom-4 z-10 rotate-[-5deg] rounded-md bg-white px-1.5 py-px text-xs font-black text-rose-600 shadow ring-2 ring-rose-400 sm:text-sm">₹{f.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div aria-hidden className="mx-6 flex justify-between"><span className="h-5 w-2.5 rounded-b bg-amber-900" /><span className="h-5 w-2.5 rounded-b bg-amber-900" /></div>
              </div>

              {/* ---- The customer ---- */}
              <div className="relative flex shrink-0 flex-row items-end gap-2 sm:w-52 sm:flex-col sm:items-stretch">
                <div className="relative order-2 min-w-0 flex-1 rounded-2xl rounded-br-sm bg-white px-3 py-2 shadow-md ring-2 ring-pink-200 sm:order-1 sm:rounded-br-2xl sm:rounded-bl-sm">
                  <p className="text-[0.65rem] font-black tracking-wider text-pink-500 uppercase">Can I have…</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {task.list.map((it) => {
                      const f = task.shelf.find((x) => x.name === it.name);
                      const got = (s.basket[it.name] || 0) === it.qty;
                      return (
                        <li key={it.name} className={`flex items-center gap-1.5 text-sm font-black ${got ? 'text-emerald-600' : 'text-slate-800'}`}>
                          <span aria-hidden="true">{f.emoji}</span>{nameOf(it)}{got && <span aria-hidden className="ml-auto">✅</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="order-1 flex flex-col items-center sm:order-2">
                  <span className={`relative inline-block text-6xl leading-none drop-shadow-[0_4px_3px_rgba(0,0,0,0.2)] sm:text-7xl ${happy ? 'gs-right' : ''}`} aria-hidden>
                    {CUSTOMERS[index % CUSTOMERS.length]}
                    {/* Happy: the same customer, a little bounce — no extra emoji (2026-11-16, the user). */}
                  </span>
                  <span className="mt-1 rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem] font-black text-slate-600 ring-1 ring-slate-200">Customer {Math.min(index + 1, tasks.length)}/{tasks.length}</span>
                </div>
              </div>
            </div>

            {/* The customer's basket */}
            <div className="relative mx-3 mb-3 sm:mx-5 sm:mb-4" aria-label="Basket">
              <div className="rounded-b-[1.5rem] rounded-t-xl bg-[repeating-linear-gradient(135deg,#d97706_0_6px,#b45309_6px_12px)] p-1 shadow-[0_10px_16px_-10px_rgba(120,53,15,0.8)]">
                <div className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-b-[1.25rem] rounded-t-lg bg-amber-50 px-2.5 py-1.5">
                  <span className="text-2xl" aria-hidden>🧺</span>
                  {inBasket.length === 0 && <span className="text-sm font-bold text-amber-800/70">Tap a crate to put fruit in the basket</span>}
                  {inBasket.map(([name, n]) => {
                    const f = task.shelf.find((x) => x.name === name);
                    return (
                      <button key={name} type="button" onClick={() => remove(name)} disabled={s.stage !== 'basket'} aria-label={`${n} ${n === 1 ? f.name : f.plural}. Tap to take one out.`}
                        className="fp-press gs-rise inline-flex items-center gap-1 rounded-full bg-white py-0.5 pr-1 pl-2 shadow-sm ring-2 ring-amber-300">
                        <span className="text-xl leading-none" aria-hidden="true">{Array.from({ length: Math.min(n, 3) }, () => f.emoji).join('')}</span>
                        <span className="rounded-full bg-amber-400 px-1.5 text-xs font-black text-amber-950">×{n}</span>
                      </button>
                    );
                  })}
                  {s.stage === 'basket' && inBasket.length > 0 && <span className="text-[0.65rem] font-bold text-amber-700">tap to take one out</span>}
                  {(s.stage === 'change' || s.stage === 'done') && (
                    <span className="ml-auto rounded-full bg-amber-700 px-3 py-0.5 text-sm font-black text-amber-50">Bill ₹{basketTotal(task, s.basket)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-4" />
          {s.stage === 'basket' && (
            <div className="flex justify-center">
              <button type="button" onClick={checkBasket} disabled={!inBasket.length} className={PRIMARY}>Basket ready</button>
            </div>
          )}

          {s.stage === 'total' && (
            <div>
              <div className="mx-auto mb-3 w-48 rounded-2xl bg-slate-900 px-5 py-2.5 text-right shadow-inner ring-1 ring-slate-700">
                <p className="text-[0.6rem] font-bold tracking-[0.14em] text-slate-400 uppercase">Total</p>
                <p className="font-mono text-3xl font-black text-white tabular-nums" aria-label={`Your answer: ${s.entry || 'empty'}`}>₹{s.entry || <span className="text-slate-600">0</span>}</p>
              </div>
              <NumberPad onPress={press} />
            </div>
          )}

          {s.stage === 'change' && (
            <div>
              <div className="mb-3 flex items-center justify-center gap-2 text-sm">
                <span className="rounded-xl bg-emerald-50 px-3 py-1.5 font-black text-emerald-800 ring-1 ring-emerald-200">Paid ₹{task.paid}</span>
                <span className="text-slate-300">·</span>
                <span className="rounded-xl bg-slate-50 px-3 py-1.5 font-black text-slate-700 ring-1 ring-slate-200">Bill ₹{task.total}</span>
              </div>
              <div className="mb-3 min-h-14 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200" aria-label="Change you are giving">
                <p className="text-[0.68rem] font-black tracking-[0.14em] text-slate-500 uppercase">Change {config.showSum && `· ₹${coinsSum}`} {s.coins.length > 0 && '· tap a coin to take it back'}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.coins.map((c, i) => (
                    <button key={i} type="button" onClick={() => setS({ ...s, coins: s.coins.filter((_, j) => j !== i), feedback: null })} aria-label={`₹${c}, tap to take back`}
                      className={`fp-press flex h-12 min-w-12 items-center justify-center px-2 text-sm font-black ring-2 ring-inset ${COIN_STYLE(c)}`}>₹{c}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap justify-center gap-2">
                {changeCoins(task).map((c) => (
                  <button key={c} type="button" onClick={() => setS({ ...s, coins: [...s.coins, c].sort((a, b) => b - a), feedback: null })} aria-label={`Give ₹${c}`}
                    className={`fp-press flex h-14 min-w-14 items-center justify-center px-2 text-base font-black shadow-sm ring-2 ring-inset ${COIN_STYLE(c)}`}>₹{c}</button>
                ))}
              </div>
              <div className="flex justify-center">
                <button type="button" onClick={checkChange} disabled={!s.coins.length} className={PRIMARY}>Give change</button>
              </div>
            </div>
          )}

          {s.stage === 'done' && (
            <div className="flex justify-center">
              <button type="button" onClick={nextTask} autoFocus className="fp-press inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-8 text-base font-black text-white shadow-[0_10px_22px_-8px_rgba(139,92,246,0.8)] ring-2 ring-white transition hover:brightness-105">Next customer <span aria-hidden>→</span></button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** Premium look (2026-11-16): soft tints behind the fruits, one primary button style, a quiet number pad. */
const PRIMARY = 'fp-press min-h-12 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 text-base font-black text-white shadow-[0_10px_20px_-10px_rgba(5,150,105,0.8)] ring-2 ring-white transition hover:brightness-105 disabled:opacity-40 disabled:shadow-none';
const CANOPY = ['bg-rose-400', 'bg-amber-300', 'bg-teal-400', 'bg-orange-400', 'bg-pink-400', 'bg-lime-400', 'bg-sky-400', 'bg-rose-400', 'bg-amber-300', 'bg-teal-400'];
const CUSTOMERS = ['👧', '👦', '👵', '🧒', '👴', '👩', '🧑'];

function NumberPad({ onPress }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  return (
    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
      {keys.map((k) => (
        <button key={k} type="button" onClick={() => onPress(k)} aria-label={k === 'del' ? 'Delete' : k === 'ok' ? 'Check answer' : k}
          className={`fp-press min-h-14 rounded-2xl text-2xl font-black shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 transition ${k === 'ok' ? 'bg-emerald-600 text-white ring-emerald-700 hover:bg-emerald-700' : k === 'del' ? 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100' : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'}`}>
          {k === 'del' ? '⌫' : k === 'ok' ? '✓' : k}
        </button>
      ))}
    </div>
  );
}
