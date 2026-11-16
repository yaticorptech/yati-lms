import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { budgetValue, checkOptim, makeOptimLevel, mixFeasible, mixValue, optimConfig } from '../../data/bands/hOptim';

/**
 * Numerical Optimization (Master Minds): maximise under constraints. Pack a bag (0/1 knapsack, capacity bar and
 * running value), split a budget among options with diminishing — sometimes set-up-cost — returns, or plan a
 * two-product production mix on a lattice under resource limits. The true optimum is computed by DP / brute force;
 * the level asks for it exactly, or within a few per cent on easier levels.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function NumericalOptimization({ onExit }) {
  const progress = useGameProgress('numerical-optimization', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const startAnswer = (r) => (r.kind === 'knapsack' ? [] : r.kind === 'budget' ? r.tables.map(() => 0) : [0, 0]);
const TITLES = { knapsack: 'Pack the bag', budget: 'Split the budget', mix: 'Plan production' };

function Round({ progress, onExit }) {
  const config = optimConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeOptimLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [ans, setAns] = useState(() => startAnswer(rounds[0]));
  const [locked, setLocked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const over = index >= rounds.length;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, rounds.length) - correct, hints: 0, score: correct });

  const live = checkOptim(round, ans);
  const goal = config.tolerance ? `Reach at least ${round.target}` : 'Find the maximum';

  const submit = () => {
    if (locked || !live.feasible) return;
    if (live.ok) { setCorrect((c) => c + 1); sfx.right?.(); } else sfx.wrong();
    setLocked(live);
  };
  const next = () => {
    const i = index + 1;
    setIndex(i);
    setLocked(null);
    if (i < rounds.length) setAns(startAnswer(rounds[i]));
  };

  const objective = `${rounds.length} optimisation problems: pack a bag, split a budget${config.kinds.includes('mix') ? ' or plan a production mix' : ''}. Watch the live totals and limits. ${config.tolerance ? `Your answer must be within ${Math.round(config.tolerance * 100)}% of the true optimum` : 'Only the true optimum counts'}. Get ${config.pass} right to pass.`;

  return (
    <GameShell
      title="Numerical Optimization"
      blurb={`Maximise under constraints. ${config.pass} of ${rounds.length} to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-emerald-800"
      variant="premium"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Optimal"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${correct} of ${rounds.length} problems at the target`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Tap items into the bag, use − / + to move budget, or tap a point on the production grid. Submit when you think it is optimal.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.68rem] font-bold tracking-[0.16em] text-emerald-700 uppercase">Problem {index + 1} of {rounds.length} · {TITLES[round.kind]}</p>
            <p className="text-sm font-bold text-ink-700">{goal}</p>
          </div>

          {round.kind === 'knapsack' && <Knapsack round={round} ans={ans} setAns={setAns} live={live} locked={locked} />}
          {round.kind === 'budget' && <Budget round={round} ans={ans} setAns={setAns} live={live} locked={locked} />}
          {round.kind === 'mix' && <Mix round={round} ans={ans} setAns={setAns} live={live} locked={locked} />}

          {!locked ? (
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => setAns(startAnswer(round))} className="fp-press min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-ink-900 ring-1 ring-line-200 ring-inset">Reset</button>
              <button type="button" onClick={submit} disabled={!live.feasible} className="fp-press min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-black text-white disabled:opacity-40">Submit · value {live.value}</button>
            </div>
          ) : (
            <Verdict round={round} res={locked} onNext={next} last={index === rounds.length - 1} />
          )}
        </div>
      )}
    </GameShell>
  );
}

function Verdict({ round, res, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  let best;
  if (round.kind === 'knapsack') best = round.solution.map((i) => round.items[i].name).join(' + ');
  else if (round.kind === 'budget') best = round.options.map((o, j) => `${o} ${round.solution[j]}`).join(', ');
  else best = `${round.solution[0]} ${round.products[0]} and ${round.solution[1]} ${round.products[1]}`;
  return (
    <div role="status" aria-live="polite" className={`mt-4 rounded-2xl p-4 ring-1 ring-inset ${res.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${res.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
        {res.ok ? (res.value === round.optimum ? 'Optimal.' : 'Within the target.') : 'Below the target.'}{' '}
        <span className="font-bold text-ink-900">Yours {res.value}; best possible {round.optimum}.</span>
      </p>
      <p className="mt-1.5 text-sm text-ink-700">One optimal plan: {best}.</p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">{last ? 'Finish' : 'Next problem'}</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ knapsack */

function Knapsack({ round, ans, setAns, live, locked }) {
  const toggle = (i) => { if (!locked) setAns(ans.includes(i) ? ans.filter((x) => x !== i) : [...ans, i]); };
  const pct = Math.min(100, (live.weight / round.capacity) * 100);
  const over = live.weight > round.capacity;
  const tile = (i) => {
    const it = round.items[i];
    const inBag = ans.includes(i);
    const best = locked && round.solution.includes(i);
    return (
      <button
        key={i}
        type="button"
        draggable={!locked}
        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
        onClick={() => toggle(i)}
        disabled={Boolean(locked)}
        aria-pressed={inBag}
        aria-label={`${it.name}, ${it.w} kilograms, value ${it.v}${inBag ? ', in the bag' : ''}`}
        className={`fp-press flex min-h-16 flex-col items-start justify-center rounded-xl px-3 py-2 text-left ring-2 ring-inset transition ${inBag ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-ink-900 ring-slate-200 hover:ring-emerald-300'} ${best ? 'outline-2 outline-offset-2 outline-emerald-500 outline-dashed' : ''}`}
      >
        <span className="text-sm font-black">{it.name}</span>
        <span className={`text-xs font-bold tabular-nums ${inBag ? 'text-emerald-50' : 'text-ink-500'}`}>{it.w} kg · value {it.v} · {(it.v / it.w).toFixed(1)}/kg</span>
      </button>
    );
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-xs font-bold tracking-wide text-ink-500 uppercase">Available</p>
        <div className="grid gap-2">{round.items.map((_, i) => i).filter((i) => !ans.includes(i)).map(tile)}</div>
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { const i = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(i) && !ans.includes(i) && !locked) setAns([...ans, i]); }}
        className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset"
      >
        <p className="text-xs font-bold tracking-wide text-ink-500 uppercase">The bag</p>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200" role="meter" aria-label="Weight in the bag" aria-valuemin={0} aria-valuemax={round.capacity} aria-valuenow={live.weight}>
          <div className={`h-full rounded-full transition-[width] ${over ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-1 text-sm font-black tabular-nums ${over ? 'text-rose-600' : 'text-ink-900'}`}>{live.weight} / {round.capacity} kg · value {live.value}</p>
        <div className="mt-2 grid min-h-16 gap-2">{ans.length ? ans.map(tile) : <p className="text-sm text-ink-500">Tap or drag items here.</p>}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ budget */

function Budget({ round, ans, setAns, live, locked }) {
  const left = round.units - live.used;
  const max = Math.max(...round.tables.map((t) => t[round.units]));
  const step = (j, d) => {
    if (locked) return;
    const k = ans[j] + d;
    if (k < 0 || (d > 0 && left <= 0)) return;
    setAns(ans.map((x, i) => (i === j ? k : x)));
  };
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">
        Budget: <span className="font-black text-ink-900">{round.units} units</span> · left <span className="font-black tabular-nums">{left}</span> · total return <span className="font-black text-emerald-700 tabular-nums">{budgetValue(round.tables, ans)}</span>
      </p>
      <div className="grid gap-2">
        {round.options.map((name, j) => (
          <div key={name} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-black text-ink-900">{name}</span>
              <button type="button" onClick={() => step(j, -1)} disabled={Boolean(locked) || ans[j] === 0} aria-label={`One unit less for ${name}`} className="fp-press h-11 w-11 rounded-lg bg-slate-100 text-lg font-black disabled:opacity-40">−</button>
              <span className="w-8 text-center text-lg font-black tabular-nums" aria-live="polite">{ans[j]}</span>
              <button type="button" onClick={() => step(j, 1)} disabled={Boolean(locked) || left <= 0} aria-label={`One unit more for ${name}`} className="fp-press h-11 w-11 rounded-lg bg-slate-100 text-lg font-black disabled:opacity-40">+</button>
              <span className="w-12 text-right text-sm font-black text-emerald-700 tabular-nums">{round.tables[j][ans[j]]}</span>
            </div>
            {/* The return table as bars: units 1..n, the current choice highlighted. */}
            <div className="mt-2 flex items-end gap-1" aria-label={`${name} returns: ${round.tables[j].slice(1).map((v, k) => `${k + 1} units ${v}`).join(', ')}`} role="img">
              {round.tables[j].slice(1).map((v, k) => (
                <div key={k} className="flex min-w-0 flex-1 flex-col items-center">
                  <span className="text-[0.6rem] font-bold text-ink-500 tabular-nums">{v}</span>
                  <div className={`w-full rounded-t ${k + 1 === ans[j] ? 'bg-emerald-500' : k + 1 < ans[j] ? 'bg-emerald-200' : 'bg-slate-200'} ${locked && k + 1 === round.solution[j] ? 'outline-2 outline-emerald-700 outline-dashed' : ''}`} style={{ height: `${Math.max(3, (v / max) * 48)}px` }} />
                  <span className="text-[0.6rem] text-ink-400">{k + 1}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ mix */

function Mix({ round, ans, setAns, live, locked }) {
  const [x, y] = ans;
  const [px, py] = round.products;
  const W = 300;
  const H = 300;
  const pad = 30;
  const nx = round.xMax + 1;
  const ny = round.yMax + 1;
  const sx = (W - pad - 10) / Math.max(1, nx);
  const sy = (H - pad - 10) / Math.max(1, ny);
  const X = (v) => pad + v * sx;
  const Y = (v) => H - pad - v * sy;
  const set = (a, b) => { if (!locked) setAns([Math.max(0, a), Math.max(0, b)]); };
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-manipulation rounded-2xl bg-slate-50 ring-1 ring-slate-200" role="group" aria-label={`Production grid: ${px} across, ${py} up`}>
        <line x1={pad} y1={H - pad} x2={W - 6} y2={H - pad} stroke="#94a3b8" />
        <line x1={pad} y1={H - pad} x2={pad} y2={6} stroke="#94a3b8" />
        <text x={W - 8} y={H - 10} textAnchor="end" fontSize="11" fontWeight="700" fill="#475569">{px} →</text>
        <text x={6} y={14} fontSize="11" fontWeight="700" fill="#475569">↑ {py}</text>
        {round.limits.map((l, k) => (
          <line key={k} x1={X(0)} y1={Y(l.c / l.b)} x2={X(l.c / l.a)} y2={Y(0)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 4" />
        ))}
        {Array.from({ length: nx }, (_, a) => Array.from({ length: ny }, (_, b) => {
          const ok = mixFeasible(round, a, b);
          const here = a === x && b === y;
          const best = locked && a === round.solution[0] && b === round.solution[1];
          return (
            <g key={`${a}-${b}`} onClick={() => set(a, b)} className="cursor-pointer">
              <circle cx={X(a)} cy={Y(b)} r={Math.min(sx, sy) / 2} fill="transparent" />
              <circle cx={X(a)} cy={Y(b)} r={here ? 6 : ok ? 3.2 : 1.6} fill={here ? (ok ? '#059669' : '#e11d48') : ok ? '#6366f1' : '#cbd5e1'} />
              {best && <circle cx={X(a)} cy={Y(b)} r="9" fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="3 2" />}
            </g>
          );
        }))}
        {Array.from({ length: nx }, (_, a) => (a % 2 === 0 ? <text key={a} x={X(a)} y={H - pad + 14} textAnchor="middle" fontSize="9" fill="#64748b">{a}</text> : null))}
        {Array.from({ length: ny }, (_, b) => (b % 2 === 0 ? <text key={b} x={pad - 6} y={Y(b) + 3} textAnchor="end" fontSize="9" fill="#64748b">{b}</text> : null))}
      </svg>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink-700">Profit: <span className="font-black">{round.p}</span> per {px.replace(/s$/, '')}, <span className="font-black">{round.q}</span> per {py.replace(/s$/, '')}.</p>
        {[[px, x, 0], [py, y, 1]].map(([name, v, k]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-sm font-black text-ink-900 capitalize">{name}</span>
            <button type="button" disabled={Boolean(locked)} onClick={() => set(k ? x : x - 1, k ? y - 1 : y)} aria-label={`Fewer ${name}`} className="fp-press h-11 w-11 rounded-lg bg-slate-100 text-lg font-black disabled:opacity-40">−</button>
            <span className="w-7 text-center text-lg font-black tabular-nums">{v}</span>
            <button type="button" disabled={Boolean(locked)} onClick={() => set(k ? x : Math.min(round.xMax, x + 1), k ? Math.min(round.yMax, y + 1) : y)} aria-label={`More ${name}`} className="fp-press h-11 w-11 rounded-lg bg-slate-100 text-lg font-black disabled:opacity-40">+</button>
          </div>
        ))}
        <ul className="space-y-1">
          {round.limits.map((l) => {
            const used = l.a * x + l.b * y;
            const ok = used <= l.c;
            return (
              <li key={l.name} className={`rounded-lg px-2 py-1 text-xs font-bold ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                {l.name}: {l.a}×{px[0]} + {l.b}×{py[0]} = {used} / {l.c}
              </li>
            );
          })}
        </ul>
        <p className={`text-sm font-black ${live.feasible ? 'text-emerald-700' : 'text-rose-600'}`}>Profit {mixValue(round, x, y)}{live.feasible ? '' : ' — over a limit'}</p>
      </div>
    </div>
  );
}
