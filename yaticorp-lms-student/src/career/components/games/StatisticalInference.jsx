import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeStatsLevel, statsConfig } from '../../data/bands/hStats';

/**
 * Statistical Inference (Master Minds): read generated data — dot plots, a histogram, a scatter plot — and reason
 * about it: which sample has the greater mean / median / spread, what removing an outlier does, mean against median in
 * skewed data, the sign or size of a correlation, which experiment gives stronger evidence, how a confidence interval
 * changes. Every answer is computed from the data on screen.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function StatisticalInference({ onExit }) {
  const progress = useGameProgress('statistical-inference', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = statsConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeStatsLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const over = index >= rounds.length;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, rounds.length) - correct, hints: 0, score: correct });

  const choose = (id) => {
    if (locked || over) return;
    const ok = id === round.answer;
    if (ok) { setCorrect((c) => c + 1); sfx.right?.(); } else sfx.wrong();
    setLocked({ ok, id });
  };
  const next = () => { setIndex((i) => i + 1); setLocked(null); };

  useEffect(() => {
    if (!started || over || locked) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= round.options.length) choose(round.options[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <GameShell
      title="Statistical Inference"
      blurb={`Read the data, then reason about it. ${config.pass} of ${rounds.length} to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-teal-800"
      variant="premium"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Correct"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${rounds.length} datasets. Each comes as a dot plot, histogram, scatter plot or summary. Judge centres, spread, outliers, skew, correlation${config.kinds.includes('evidence') ? ', strength of evidence and confidence intervals' : ''} — then see the computed statistics. Get ${config.pass} right to pass.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${correct} of ${rounds.length} inferences correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Study the chart, then pick an answer (keys 1–{round.options.length}). Each dot is one value; stacked dots repeat a value.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-1 text-[0.68rem] font-bold tracking-[0.16em] text-teal-700 uppercase">Dataset {index + 1} of {rounds.length}</p>
          <p className="mb-2 text-sm font-bold text-ink-600">{round.title}</p>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset">
            {round.kind === 'compare' && <DotPlots rows={[{ label: 'A', xs: round.samples[0] }, { label: 'B', xs: round.samples[1] }]} />}
            {round.kind === 'outlier' && <DotPlots rows={[{ label: '', xs: round.samples[0] }]} mark={round.outlier} />}
            {round.kind === 'skew' && <Histogram xs={round.samples[0]} />}
            {round.kind === 'scatter' && <Scatter points={round.points} />}
            {round.kind === 'evidence' && round.experiments.map(([c, t], i) => (
              <div key={i} className={i ? 'mt-3' : ''}>
                <p className="text-xs font-black text-ink-700">Experiment {i + 1}</p>
                <DotPlots rows={[{ label: 'Ctrl', xs: c, tone: '#94a3b8' }, { label: 'New', xs: t, tone: '#7c3aed' }]} domain={[0, 30]} />
              </div>
            ))}
            {round.kind === 'ci' && <p className="py-3 text-center font-serif text-lg font-bold text-ink-800">margin of error = z × SD / √n <span className="block text-xs font-sans font-semibold text-ink-500">z = 1.64 (90%), 1.96 (95%), 2.58 (99%)</span></p>}
          </div>

          <p className="mt-3 mb-2 text-base font-bold text-ink-900">{round.prompt}</p>
          <div className={`grid gap-2 ${round.options.length > 3 ? 'grid-cols-2 sm:grid-cols-5' : 'sm:grid-cols-3'}`}>
            {round.options.map((o, i) => {
              const verdict = locked ? (o.id === round.answer ? 'bg-emerald-50 ring-emerald-500' : locked.id === o.id ? 'bg-rose-50 ring-rose-400' : 'bg-white ring-slate-200 opacity-70') : 'bg-white ring-slate-200 hover:ring-teal-400';
              return (
                <button key={o.id} type="button" disabled={Boolean(locked)} onClick={() => choose(o.id)} className={`fp-press min-h-12 rounded-xl px-3 text-sm font-bold text-ink-900 ring-2 ring-inset transition ${verdict}`}>
                  <span className="mr-1.5 text-ink-400 tabular-nums">{i + 1}</span>{o.label}
                </button>
              );
            })}
          </div>

          {locked && <Verdict round={round} ok={locked.ok} onNext={next} last={index === rounds.length - 1} />}
        </div>
      )}
    </GameShell>
  );
}

function Verdict({ round, ok, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div role="status" aria-live="polite" className={`mt-3 rounded-2xl p-4 ring-1 ring-inset ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{ok ? 'Correct.' : 'Not quite.'} <span className="font-semibold text-ink-900">{round.reveal}.</span></p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">{last ? 'Finish' : 'Next dataset'}</button>
      </div>
    </div>
  );
}

/** Stacked dot plots sharing one axis. */
function DotPlots({ rows, mark = null, domain = null }) {
  const all = rows.flatMap((r) => r.xs);
  const lo = domain ? domain[0] : Math.min(...all) - 1;
  const hi = domain ? domain[1] : Math.max(...all) + 1;
  const W = 420;
  const left = 40;
  const x = (v) => left + ((v - lo) / Math.max(1, hi - lo)) * (W - left - 12);
  const r = 4.2;
  const heights = rows.map((row) => {
    const counts = {};
    row.xs.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    return Math.max(...Object.values(counts));
  });
  const rowH = heights.map((h) => Math.max(34, h * (r * 2 + 1) + 14));
  const H = rowH.reduce((s, h) => s + h, 0) + 22;
  const bases = rowH.map((h, k) => rowH.slice(0, k).reduce((s, x) => s + x, 0) + h - 6);
  const ticks = [];
  const step = hi - lo > 20 ? 5 : 2;
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={rows.map((row) => `${row.label || 'Data'}: ${[...row.xs].sort((a, b) => a - b).join(', ')}`).join('. ')}>
      {rows.map((row, k) => {
        const base = bases[k];
        const stack = {};
        return (
          <g key={k}>
            <line x1={left} y1={base + r + 2} x2={W - 8} y2={base + r + 2} stroke="#e2e8f0" />
            {row.label && <text x={4} y={base} fontSize="12" fontWeight="800" fill="#334155">{row.label}</text>}
            {[...row.xs].sort((a, b) => a - b).map((v, i) => {
              stack[v] = (stack[v] || 0) + 1;
              const isMark = mark !== null && v === mark;
              return <circle key={i} cx={x(v)} cy={base - (stack[v] - 1) * (r * 2 + 1)} r={r} fill={isMark ? '#e11d48' : row.tone || '#0d9488'} />;
            })}
          </g>
        );
      })}
      <line x1={left} y1={H - 18} x2={W - 8} y2={H - 18} stroke="#64748b" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={H - 18} x2={x(t)} y2={H - 14} stroke="#64748b" />
          <text x={x(t)} y={H - 4} textAnchor="middle" fontSize="10" fill="#475569">{t}</text>
        </g>
      ))}
    </svg>
  );
}

function Histogram({ xs }) {
  const width = 3;
  const bins = Array(9).fill(0);
  xs.forEach((v) => { bins[Math.min(8, Math.floor(v / width))] += 1; });
  const max = Math.max(...bins);
  const W = 420;
  const H = 180;
  const bw = (W - 50) / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Histogram: ${bins.map((c, i) => `${i * width}–${i * width + width - 1}: ${c}`).join(', ')}`}>
      {bins.map((c, i) => {
        const h = (c / max) * (H - 50);
        return (
          <g key={i}>
            <rect x={40 + i * bw + 1} y={H - 24 - h} width={bw - 2} height={h} rx="3" fill="#14b8a6" />
            {c > 0 && <text x={40 + i * bw + bw / 2} y={H - 28 - h} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{c}</text>}
            <text x={40 + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#475569">{i * width}–{i * width + width - 1}</text>
          </g>
        );
      })}
      <line x1={40} y1={H - 24} x2={W - 8} y2={H - 24} stroke="#64748b" />
    </svg>
  );
}

function Scatter({ points }) {
  const W = 360;
  const H = 260;
  const pad = 30;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const X = (v) => pad + ((v - x0) / Math.max(0.1, x1 - x0)) * (W - pad - 12);
  const Y = (v) => H - pad - ((v - y0) / Math.max(0.1, y1 - y0)) * (H - pad - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label={`Scatter plot of ${points.length} points`}>
      <line x1={pad} y1={H - pad} x2={W - 6} y2={H - pad} stroke="#64748b" />
      <line x1={pad} y1={H - pad} x2={pad} y2={6} stroke="#64748b" />
      <text x={W - 8} y={H - 10} textAnchor="end" fontSize="11" fill="#475569">x →</text>
      <text x={8} y={14} fontSize="11" fill="#475569">y ↑</text>
      {points.map(([px, py], i) => <circle key={i} cx={X(px)} cy={Y(py)} r="4.5" fill="#0d9488" fillOpacity="0.85" />)}
    </svg>
  );
}
