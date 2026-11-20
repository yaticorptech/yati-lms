import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { fractionConfig, makeFractionLevel, judgeDuel, judgeOrder, judgeBeat, cmp, gcd } from '../../data/bands/dFraction';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const BOT = 'Fracto-Bot';
const lcm = (a, b) => (a / gcd(a, b)) * b;
const ft = (f) => `${f.n}/${f.d}`;
/** Both fractions over one denominator, for the explanation. */
const overCommon = (a, b) => {
  const L = lcm(a.d, b.d);
  return [`${(a.n * L) / a.d}/${L}`, `${(b.n * L) / b.d}/${L}`];
};
const mixed = (f) => (f.n > f.d && f.d > 1 ? ` (= ${Math.floor(f.n / f.d)} ${f.n % f.d}/${f.d})` : '');

/** A fraction drawn as a card: numerator over denominator. */
function Frac({ f, size = 'lg' }) {
  const big = size === 'lg';
  return (
    <span className={`inline-flex flex-col items-center font-black leading-none ${big ? 'text-3xl sm:text-4xl' : 'text-xl'}`} aria-label={`${f.n} over ${f.d}`}>
      <span className="px-1.5 pb-1">{f.n}</span>
      <span className={`w-full border-t-[3px] border-current ${big ? 'min-w-10' : 'min-w-7'}`} />
      <span className="px-1.5 pt-1">{f.d}</span>
    </span>
  );
}

/** ⚔️ Math: fraction duels against the computer — compare, order and add your way to a best-of win. */
export default function FractionBattle({ onExit }) {
  const progress = useGameProgress('fraction-battle', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const [config] = useState(() => fractionConfig(progress.ageBand, progress.difficulty, progress.levelNo));
  const [rounds] = useState(() => makeFractionLevel(seeded(freshSeed()), config));
  const [log, setLog] = useState([]);      // true = you won that round
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const n = rounds.length;
  const majority = Math.floor(n / 2) + 1;
  const you = log.filter(Boolean).length;
  const bot = log.length - you;
  const over = log.length >= n;
  const passed = you >= majority;
  const stars = over ? starsForFixed(you, majority, n) : 0;
  useRecordStars(progress, over, stars, { correct: you, wrong: bot, hints: 0, score: you });

  const index = log.length;
  const round = over ? null : rounds[index];

  const objective = `Best of ${n} against ${BOT}. Each round is a challenge: say which card is bigger, put cards in order${config.descending ? ' (largest first at the top level)' : ''}, or pick two cards whose ${config.ops.includes('−') ? 'sum or difference' : 'sum'} beats the bot's card and work it out exactly. Right answer wins you the round; a wrong one — or the clock — hands it to the bot. Win ${majority} rounds.`;

  return (
    <GameShell
      title="Fraction Battle"
      blurb={`Out-fraction ${BOT}, best of ${n}.`}
      tone="bg-gradient-to-br from-emerald-500 to-teal-800"
      score={`${you}/${majority}`}
      scoreLabel="Wins"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={started && !over ? () => setPaused((p) => !p) : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed, stars,
        headline: passed ? `You beat ${BOT} ${you}–${bot}!` : `${BOT} wins ${bot}–${you}`,
        detail: passed ? (you === n ? 'A clean sweep — every round yours.' : `Level ${progress.level} cleared.`) : `You need ${majority} round wins. Try again — the bot does not get smarter.`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Round {Math.min(index + 1, n)} of {n} · first to {majority} wins the battle</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-lg">
          {/* Score bar: one segment per round. */}
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs font-black">
              <span className="text-emerald-700">You {you}</span>
              <span className="text-rose-700">{bot} {BOT}</span>
            </div>
            <div className="flex gap-1" aria-label={`You ${you}, ${BOT} ${bot}, ${n - log.length} rounds left`}>
              {rounds.map((_, i) => (
                <span key={i} className={`h-3 flex-1 rounded-full ${i < log.length ? (log[i] ? 'bg-emerald-500' : 'bg-rose-500') : i === index ? 'bg-amber-300' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          <Battle key={index} round={round} config={config} running={started && !paused} onDone={(won) => setLog((l) => [...l, won])} />
        </div>
      )}
    </GameShell>
  );
}

/** One round: its own clock, its own challenge, and the verdict. */
function Battle({ round, config, running, onDone }) {
  const limit = config.seconds[round.kind];
  const [verdict, setVerdict] = useState(null);   // { won, text }
  const { seconds } = useTimedRound(limit, running, Boolean(verdict));
  const timeUp = seconds <= 0 && !verdict;
  const live = running && !verdict && !timeUp;

  const decide = (won, text) => {
    if (!won) sfx.wrong();
    setVerdict({ won, text });
  };

  const done = verdict || (timeUp ? { won: false, text: `Time! ${BOT} takes the round.` } : null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black tracking-wide uppercase">
        <span className="text-teal-800">{round.kind === 'duel' ? 'Duel · which is bigger?' : round.kind === 'order' ? `Order · ${round.descending ? 'largest' : 'smallest'} first` : `Beat it · pick two, ${round.op === '+' ? 'add' : 'subtract'}`}</span>
        <span className={seconds <= 5 && !done ? 'text-rose-600' : 'text-ink-500'}>{seconds}s</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${seconds <= 5 ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${(seconds / limit) * 100}%` }} />
      </div>

      {round.kind === 'duel' && <Duel round={round} live={live} done={done} decide={decide} />}
      {round.kind === 'order' && <Order round={round} live={live} done={done} decide={decide} />}
      {round.kind === 'beat' && <Beat round={round} live={live} done={done} decide={decide} />}

      {done && (
        <div className={`mt-3 rounded-xl p-3 text-sm ring-1 ${done.won ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-rose-200'}`} role="status" aria-live="polite">
          <p className="font-black">{done.won ? '+1 You!' : `+1 ${BOT}`}</p>
          <p className="mt-0.5 font-semibold">{done.text}</p>
          <button type="button" onClick={() => onDone(done.won)} autoFocus className="fp-press mt-2 w-full rounded-xl bg-teal-700 py-2.5 text-sm font-black text-white">Next round →</button>
        </div>
      )}
    </div>
  );
}

function Duel({ round, live, done, decide }) {
  const answer = (choice) => {
    if (!live) return;
    const [a, b] = overCommon(round.mine, round.theirs);
    const c = cmp(round.mine, round.theirs);
    const why = `${ft(round.mine)} = ${a} and ${ft(round.theirs)} = ${b}, so ${c > 0 ? 'yours is bigger' : c < 0 ? `${BOT}'s is bigger` : 'they are equal'}.`;
    decide(judgeDuel(round, choice), why);
  };
  useEffect(() => {
    if (!live) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === '1') answer('mine');
      else if (e.key === '=' || e.key === '2') answer('equal');
      else if (e.key === 'ArrowRight' || e.key === '3') answer('theirs');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-2 ring-emerald-300">
          <span className="text-xs font-black uppercase">Your card</span>
          <Frac f={round.mine} />
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-rose-50 p-4 text-rose-900 ring-2 ring-rose-300">
          <span className="text-xs font-black uppercase">{BOT}</span>
          <Frac f={round.theirs} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['mine', 'Mine is bigger'], ['equal', 'Equal'], ['theirs', 'Bot’s is bigger']].map(([k, label], i) => (
          <button key={k} type="button" onClick={() => answer(k)} disabled={!live} aria-label={`${i + 1}: ${label}`}
            className={`fp-press min-h-12 rounded-xl px-1 text-sm font-black ring-2 ring-inset ${done && round.answer === k ? 'bg-emerald-100 ring-emerald-500' : 'bg-white ring-slate-200'} disabled:opacity-70`}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

function Order({ round, live, done, decide }) {
  const [order, setOrder] = useState(() => round.cards.map((_, i) => i));
  const [dragging, setDragging] = useState(null);
  const drag = useRef(null);

  const moveItem = (from, to) => setOrder((o) => {
    if (to < 0 || to >= o.length || from === to) return o;
    const next = [...o];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    return next;
  });

  const onDown = (e, pos) => {
    if (!live) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pos, y: e.clientY, h: e.currentTarget.getBoundingClientRect().height + 8 };
    setDragging(pos);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const shift = Math.trunc((e.clientY - d.y) / d.h);
    if (!shift) return;
    const to = Math.max(0, Math.min(order.length - 1, d.pos + shift));
    if (to === d.pos) return;
    moveItem(d.pos, to);
    drag.current = { ...d, pos: to, y: d.y + (to - d.pos) * d.h };
    setDragging(to);
  };
  const onUp = () => { drag.current = null; setDragging(null); };

  const lock = () => {
    if (!live) return;
    const cards = order.map((i) => round.cards[i]);
    const ok = judgeOrder(round, cards);
    decide(ok, `${round.descending ? 'Largest' : 'Smallest'} first: ${round.answer.map(ft).join(round.descending ? ' > ' : ' < ')}.`);
  };

  return (
    <>
      <p className="mb-2 text-center text-sm font-bold text-ink-700">Drag the cards (or use the arrows) — {round.descending ? 'largest' : 'smallest'} at the top.</p>
      <ol className="grid gap-2">
        {order.map((ci, pos) => (
          <li key={ci}
            onPointerDown={(e) => onDown(e, pos)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            className={`flex touch-none items-center gap-3 rounded-2xl px-3 py-2 ring-2 select-none ${dragging === pos ? 'z-10 scale-[1.02] bg-amber-50 shadow-lg ring-amber-400' : 'bg-white ring-slate-200'} ${live ? 'cursor-grab' : ''}`}>
            <span className="w-5 text-xs font-black text-ink-500">{pos + 1}</span>
            <span aria-hidden="true" className="text-slate-400">⋮⋮</span>
            <span className="flex-1 text-teal-900"><Frac f={round.cards[ci]} size="sm" /></span>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => live && moveItem(pos, pos - 1)} disabled={!live || pos === 0} aria-label={`Move ${ft(round.cards[ci])} up`} className="fp-press h-10 w-10 rounded-lg bg-slate-100 font-black disabled:opacity-30">▲</button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => live && moveItem(pos, pos + 1)} disabled={!live || pos === order.length - 1} aria-label={`Move ${ft(round.cards[ci])} down`} className="fp-press h-10 w-10 rounded-lg bg-slate-100 font-black disabled:opacity-30">▼</button>
          </li>
        ))}
      </ol>
      {!done && (
        <button type="button" onClick={lock} disabled={!live} className="fp-press mt-3 w-full rounded-xl bg-teal-600 py-3 text-sm font-black text-white disabled:opacity-40">Lock order</button>
      )}
    </>
  );
}

function Beat({ round, live, done, decide }) {
  const [sel, setSel] = useState([]);
  const [num, setNum] = useState('');
  const [den, setDen] = useState('');
  const toggle = (i) => {
    if (!live) return;
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < 2 ? [...s, i] : [s[1], i]));
  };
  const [a, b] = [...sel].sort((x, y) => x - y);
  const pair = sel.length === 2 ? [round.hand[a], round.hand[b]] : null;
  // Difference is bigger minus smaller: show the bigger first.
  const shown = pair && round.op === '−' && cmp(pair[0], pair[1]) < 0 ? [pair[1], pair[0]] : pair;
  const ready = pair && /^\d+$/.test(num) && /^\d+$/.test(den) && Number(den) > 0;

  const play = () => {
    if (!live || !ready) return;
    const res = judgeBeat(round, a, b, Number(num), Number(den));
    const sum = `${ft(shown[0])} ${round.op} ${ft(shown[1])} = ${ft(res.value)}${mixed(res.value)}`;
    const [v, t] = overCommon(res.value, round.theirs);
    const vs = `${v} ${res.beats ? '>' : '≤'} ${t}`;
    const text = res.won
      ? `${sum}. ${vs} — you beat ${ft(round.theirs)}!`
      : !res.correctValue
        ? `${sum}, not ${num}/${den}.${res.beats ? ' That pair would have won.' : ''}`
        : `${sum} is right, but ${vs}: it does not beat ${ft(round.theirs)}.`;
    decide(res.won, text);
  };

  return (
    <>
      <div className="flex items-center justify-center gap-3 rounded-2xl bg-rose-50 p-3 text-rose-900 ring-2 ring-rose-300">
        <span className="text-xs font-black uppercase">{BOT} plays</span>
        <Frac f={round.theirs} />
      </div>
      <p className="mt-3 mb-2 text-center text-sm font-bold text-ink-700">Pick two of your cards whose {round.op === '+' ? 'sum' : 'difference'} is bigger:</p>
      <div className={`grid gap-2 ${round.hand.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {round.hand.map((f, i) => (
          <button key={i} type="button" onClick={() => toggle(i)} disabled={!live} aria-pressed={sel.includes(i)} aria-label={`Card ${ft(f)}`}
            className={`fp-press flex min-h-20 items-center justify-center rounded-2xl ring-2 ${sel.includes(i) ? 'bg-emerald-500 text-white ring-emerald-600' : 'bg-emerald-50 text-emerald-900 ring-emerald-200'}`}>
            <Frac f={f} size="sm" />
          </button>
        ))}
      </div>
      {shown && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xl font-black text-ink-900">
          <Frac f={shown[0]} size="sm" /> <span>{round.op}</span> <Frac f={shown[1]} size="sm" /> <span>=</span>
          <span className="inline-flex flex-col items-center gap-1">
            <input value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={!live} inputMode="numeric" aria-label="Numerator"
              className="w-16 rounded-lg bg-white py-1 text-center text-lg font-black ring-2 ring-slate-300 focus:ring-teal-500 focus:outline-none" />
            <span className="h-[3px] w-16 bg-ink-900" />
            <input value={den} onChange={(e) => setDen(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={!live} inputMode="numeric" aria-label="Denominator"
              onKeyDown={(e) => { if (e.key === 'Enter') play(); }}
              className="w-16 rounded-lg bg-white py-1 text-center text-lg font-black ring-2 ring-slate-300 focus:ring-teal-500 focus:outline-none" />
          </span>
        </div>
      )}
      {!done && (
        <button type="button" onClick={play} disabled={!live || !ready} className="fp-press mt-3 w-full rounded-xl bg-teal-600 py-3 text-sm font-black text-white disabled:opacity-40">
          {pair ? 'Play this pair' : 'Pick two cards'}
        </button>
      )}
    </>
  );
}
