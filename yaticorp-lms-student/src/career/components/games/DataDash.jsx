import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import ENumPad from './ENumPad';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { dashConfig, makeDashLevel } from '../../data/bands/eSmartMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7'];
const SERIES = ['#4f46e5', '#f97316'];

/** 📊 Data Dash: read a chart or table and answer questions worked out from its numbers. */
export default function DataDash({ onExit }) {
  const progress = useGameProgress('data-dash', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = dashConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [sets] = useState(() => makeDashLevel(seeded(freshSeed()), cfg));
  const [si, setSi] = useState(0);
  const [qi, setQi] = useState(0);
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState(null); // { ok, given }
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const total = sets.length * cfg.perSet;
  const pass = Math.ceil(total * 0.6);
  const limitMs = cfg.seconds * 1000;
  const allDone = si >= sets.length;
  const elapsed = useEClock(started && !paused && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const stars = over ? starsForFixed(correct, pass, total) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs });

  const set = allDone ? null : sets[si];
  const q = set ? set.questions[qi] : null;
  const locked = !started || over || paused || !!answered;
  const asked = si * cfg.perSet + qi + 1;

  const answer = (given) => {
    if (locked) return;
    const ok = q.type === 'num' ? Number(given) === q.answer : given === q.answer;
    if (ok) { sfx.right?.(); setCorrect((n) => n + 1); } else { sfx.wrong(); setWrong((n) => n + 1); }
    setAnswered({ ok, given });
  };

  const next = () => {
    setAnswered(null);
    setInput('');
    if (qi + 1 < set.questions.length) setQi(qi + 1);
    else { setSi(si + 1); setQi(0); }
  };

  const objective = cfg.band === 'intermediate'
    ? `Read bar charts, tables and pie charts. Answer ${total} questions — values, differences, totals, means and percentages. ${cfg.seconds} seconds. Get ${pass} right to clear.`
    : `Compare two data series, spot trends and work with pie charts. ${total} questions in ${cfg.seconds} seconds; every answer comes from the data. Get ${pass} right to clear.`;

  return (
    <GameShell
      title="Data Dash"
      blurb="Read the data, answer fast and right."
      tone="bg-gradient-to-br from-emerald-500 to-sky-700"
      score={`${correct}/${total}`}
      scoreLabel="Correct"
      seconds={Math.ceil(Math.max(0, limitMs - elapsed) / 1000)}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((v) => !v)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= pass,
        stars,
        headline: correct >= pass ? `Level ${progress.level} cleared!` : timeUp && !allDone ? 'Time is up' : 'Nearly there',
        detail: `${correct} of ${total} questions right`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Question {Math.min(asked, total)} of {total} · chart {Math.min(si + 1, sets.length)} of {sets.length}</p>}
    >
      {started && set && q && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100">
            <p className="mb-2 text-center text-sm font-black text-ink-800">{set.title}{set.chart !== 'pie' && set.unit ? ` (${set.unit})` : ''}</p>
            <Chart set={set} />
          </div>

          <p className="text-center text-base font-black text-ink-900">{q.prompt}</p>

          {answered ? (
            <div className="flex flex-col items-center gap-2">
              <p className={`text-center text-sm font-black ${answered.ok ? 'text-emerald-600' : 'text-rose-600'}`} role="status" aria-live="polite">
                {answered.ok ? `Right — ${q.answer}${q.type === 'num' && q.unit === '%' ? '%' : ''}!` : `Not quite: you said ${answered.given}, the answer is ${q.answer}${q.unit === '%' ? '%' : ''}.`}
              </p>
              <button type="button" onClick={next} className="fp-press min-h-12 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white" autoFocus>
                {asked < total ? 'Next question' : 'See result'}
              </button>
            </div>
          ) : q.type === 'num' ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="flex h-12 min-w-28 items-center justify-center rounded-xl bg-white px-4 text-2xl font-black tabular-nums ring-2 ring-emerald-300 ring-inset" aria-live="polite">{input || '…'}</span>
                {q.unit === '%' && <span className="text-xl font-black text-ink-500">%</span>}
              </div>
              <ENumPad value={input} onChange={setInput} onEnter={() => answer(input)} active={!locked} disabled={locked} maxLen={5} enterLabel="Answer" />
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {q.options.map((o) => (
                <button key={o} type="button" onClick={() => answer(o)} disabled={locked} className="fp-press min-h-12 rounded-xl bg-white px-2 text-sm font-black text-ink-900 ring-2 ring-emerald-200 ring-inset hover:bg-emerald-50 disabled:opacity-50">
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

const niceMax = (v) => {
  const step = v <= 20 ? 5 : v <= 60 ? 10 : v <= 150 ? 25 : 50;
  return { top: Math.ceil(v / step) * step, step };
};

/** The data: a bar chart, a grouped bar chart, a line chart, a pie, or a table. */
function Chart({ set }) {
  if (set.chart === 'table') {
    return (
      <table className="mx-auto w-full max-w-sm text-sm">
        <thead><tr className="bg-emerald-50 text-ink-700"><th className="px-3 py-1.5 text-left font-black">Item</th><th className="px-3 py-1.5 text-right font-black">{set.unit}</th></tr></thead>
        <tbody>
          {set.labels.map((l, i) => (
            <tr key={l} className="border-t border-slate-100"><td className="px-3 py-1.5 font-bold">{l}</td><td className="px-3 py-1.5 text-right font-black tabular-nums">{set.values[i]}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (set.chart === 'pie') return <Pie set={set} />;
  const W = 320;
  const H = 190;
  const L = 30;
  const B = 24;
  const T = 18;
  const series = set.series || [{ name: set.title, values: set.values }];
  const { top, step } = niceMax(Math.max(...series.flatMap((s) => s.values)));
  const y = (v) => H - B - ((H - B - T) * v) / top;
  const n = set.labels.length;
  const slot = (W - L - 6) / n;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${set.title}: ${series.map((s) => `${s.name} ${s.values.map((v, i) => `${set.labels[i]} ${v}`).join(', ')}`).join('; ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 4} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={L - 4} y={y(t) + 3} textAnchor="end" fontSize="11" fill="#64748b">{t}</text>
          </g>
        ))}
        {set.labels.map((l, i) => (
          <text key={l} x={L + slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">{l}</text>
        ))}
        {set.chart === 'line'
          ? series.map((s, k) => (
            <g key={s.name}>
              <polyline fill="none" stroke={SERIES[k]} strokeWidth="2.5" points={s.values.map((v, i) => `${L + slot * i + slot / 2},${y(v)}`).join(' ')} />
              {s.values.map((v, i) => (
                <g key={i}>
                  <circle cx={L + slot * i + slot / 2} cy={y(v)} r="3.5" fill={SERIES[k]} />
                  <text x={L + slot * i + slot / 2} y={k === 0 ? y(v) - 7 : y(v) + 13} textAnchor="middle" fontSize="11" fontWeight="800" fill={SERIES[k]}>{v}</text>
                </g>
              ))}
            </g>
          ))
          : series.map((s, k) => {
            const bw = (slot * 0.7) / series.length;
            return s.values.map((v, i) => {
              const x = L + slot * i + slot * 0.15 + bw * k;
              return (
                <g key={`${k}-${i}`}>
                  <rect x={x} y={y(v)} width={bw} height={H - B - y(v)} rx="3" fill={series.length > 1 ? SERIES[k] : COLORS[i % COLORS.length]} />
                  <text x={x + bw / 2} y={y(v) - 3} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e293b">{v}</text>
                </g>
              );
            });
          })}
      </svg>
      {series.length > 1 && (
        <div className="mt-1 flex justify-center gap-4 text-xs font-bold text-ink-700">
          {series.map((s, k) => <span key={s.name} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: SERIES[k] }} />{s.name}</span>)}
        </div>
      )}
    </div>
  );
}

function Pie({ set }) {
  const R = 70;
  const C = 80;
  const starts = set.values.map((_, i) => set.values.slice(0, i).reduce((x, v) => x + v, 0));
  const slices = set.values.map((p, i) => {
    const a0 = (starts[i] / 100) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((starts[i] + p) / 100) * Math.PI * 2 - Math.PI / 2;
    const large = p > 50 ? 1 : 0;
    const d = `M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z`;
    const mid = (a0 + a1) / 2;
    return { d, fill: COLORS[i % COLORS.length], label: `${p}%`, lx: C + R * 0.62 * Math.cos(mid), ly: C + R * 0.62 * Math.sin(mid) + 4 };
  });
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 160 160" className="w-40" role="img" aria-label={`${set.title}: ${set.labels.map((l, i) => `${l} ${set.values[i]}%`).join(', ')}`}>
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.fill} stroke="#fff" strokeWidth="2" />)}
        {slices.map((s, i) => <text key={`t${i}`} x={s.lx} y={s.ly} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{s.label}</text>)}
      </svg>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-bold text-ink-800 sm:grid-cols-1">
        {set.labels.map((l, i) => (
          <li key={l} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{l} — {set.values[i]}%</li>
        ))}
      </ul>
    </div>
  );
}
