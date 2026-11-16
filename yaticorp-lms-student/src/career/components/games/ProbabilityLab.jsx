import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { seeded, shuffle } from '../../data/seeded';
import { COLOURS, estimateOk, fmt, fmtMoney, probabilityLevel, toNum } from '../../data/bands/probability';

/**
 * 🎲 Probability Lab (Master Minds, 2026-11-13): judge chances, then commit. Three kinds of round — pick the bag,
 * estimate a probability on a slider, choose the better bet — each followed by the exact answer and why. In the
 * advanced band, once the answer is locked in, the student may "run the experiment": 1000 seeded trials on a live
 * histogram, to see the answer play out (no hints before committing, 2026-11-14).
 */

const TRIALS = 1000;
const PER_TICK = 40;

export default function ProbabilityLab({ onExit }) {
  const progress = useGameProgress('probability-lab');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const pct = (x) => `${Math.round(x * 100)}%`;

function Round({ progress, onExit }) {
  const band = progress.ageBand === 'analytical' ? 'analytical' : 'advanced';
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [rounds] = useState(() => probabilityLevel(seeded(seed), band, progress.difficulty, progress.levelNo));
  const pass = Math.ceil(rounds.length * 0.6);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);       // bag / game index, or slider stop
  const [locked, setLocked] = useState(null);       // { ok } once the answer is in
  const [correct, setCorrect] = useState(0);
  const over = index >= rounds.length;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const stars = over ? starsForFixed(correct, pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, rounds.length) - correct, hints: 0, score: correct, limitMs: rounds.length * 60000 });

  const value = round.kind === 'estimate' ? (choice ?? Math.round(round.den / 2)) : choice;

  const commit = () => {
    if (locked || value === null) return;
    const ok = round.kind === 'estimate' ? estimateOk(round, value) : value === round.answer;
    if (ok) setCorrect((c) => c + 1);
    setLocked({ ok });
  };
  const next = () => {
    setIndex((i) => i + 1);
    setChoice(null);
    setLocked(null);
  };

  return (
    <GameShell
      title="Probability Lab"
      blurb={`Judge the odds, then commit. Get ${pass} of ${rounds.length} right.`}
      tone="bg-gradient-to-br from-slate-800 to-fuchsia-800"
      score={correct}
      scoreLabel="Correct"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: band === 'analytical'
                ? `${rounds.length} rounds. Pick the bag with the best chance, or drag the slider to your estimate of a probability (close counts). After each answer you see the exact fraction and why. Get ${pass} right to pass.`
                : `${rounds.length} rounds: pick the best bag, estimate a probability (no replacement, conditional, combinations) or choose the bet worth more per play. After each answer you see the exact result and why, and can run the experiment — 1000 simulated trials. Get ${pass} right to pass.`,
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
              headline: stars > 0 ? `Level ${progress.level} cleared!` : 'Not this time',
              detail: `${correct} of ${rounds.length} judged right`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Round {Math.min(index + 1, rounds.length)} of {rounds.length} · {pass} correct to pass</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-3 text-center text-base font-bold text-ink-900 sm:text-lg">{round.prompt}</p>
          {round.kind === 'bags' && <BagsPick round={round} choice={choice} onPick={setChoice} locked={locked} />}
          {round.kind === 'estimate' && <Estimate round={round} value={value} onChange={setChoice} locked={locked} />}
          {round.kind === 'bets' && <BetsPick round={round} choice={choice} onPick={setChoice} locked={locked} />}

          {band === 'advanced' && (
            <Experiment key={index} round={round} seed={seed + index * 7919} canStart={Boolean(locked)} />
          )}

          {!locked ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={commit}
                disabled={value === null}
                className="fp-press min-h-12 rounded-2xl bg-slate-900 px-6 text-base font-black text-white shadow-sm disabled:opacity-40"
              >
                Lock in answer
              </button>
            </div>
          ) : (
            <Feedback round={round} value={value} ok={locked.ok} onNext={next} last={index === rounds.length - 1} />
          )}
        </div>
      )}
    </GameShell>
  );
}

/* ------------------------------------------------------------------ feedback */

function Feedback({ round, value, ok, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  let answer;
  if (round.kind === 'estimate') answer = `Exact: ${fmt(round.exact)} ≈ ${pct(toNum(round.exact))}. Yours: ${value}/${round.den} ≈ ${pct(value / round.den)} (within ±${Math.round(round.tol * 100)} points counts).`;
  else if (round.kind === 'bags') answer = `Best: Bag ${'ABC'[round.answer]}.`;
  else answer = `Better: Game ${'AB'[round.answer]} — ₹${fmtMoney(round.games[round.answer].ev)} per play against ₹${fmtMoney(round.games[1 - round.answer].ev)}.`;
  return (
    <div role="status" aria-live="polite" className={`mt-4 rounded-2xl p-4 ring-1 ring-inset ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{ok ? 'Correct.' : 'Not quite.'} <span className="font-bold text-ink-900">{answer}</span></p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{round.explain}</p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
          {last ? 'Finish' : 'Next round'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bags */

const marbleList = (counts, salt) => shuffle(seeded(salt), Object.entries(counts).flatMap(([c, k]) => Array(k).fill(c)));

function BagArt({ counts, salt, label }) {
  const list = marbleList(counts, salt);
  const per = list.length > 12 ? 5 : 4;
  const r = list.length > 12 ? 7 : 8.5;
  const gap = r * 2 + 3;
  const rows = Math.ceil(list.length / per);
  return (
    <svg viewBox="0 0 120 132" className="h-auto w-full max-w-[9rem]" role="img" aria-label={label}>
      <path d="M44 14 h32 l-6 14 c26 6 40 30 40 58 c0 26 -18 40 -50 40 s-50 -14 -50 -40 c0 -28 14 -52 40 -58 z" className="fill-slate-100 stroke-slate-400" strokeWidth="2" />
      <path d="M42 24 h36" className="stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
      {list.map((c, i) => {
        const row = Math.floor(i / per);
        const inRow = row === rows - 1 ? list.length - row * per : per;
        const col = i % per;
        const x = 60 + (col - (inRow - 1) / 2) * gap;
        const y = 112 - (rows - 1 - row) * gap;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={COLOURS[c].fill} />
            <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="white" opacity="0.45" />
          </g>
        );
      })}
    </svg>
  );
}

function BagsPick({ round, choice, onPick, locked }) {
  return (
    <div className={`grid gap-2 ${round.bags.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {round.bags.map((b, i) => {
        const picked = choice === i;
        const verdict = locked ? (i === round.answer ? 'ring-emerald-500 bg-emerald-50' : picked ? 'ring-rose-400 bg-rose-50' : 'ring-line-200 bg-surface') : picked ? 'ring-fuchsia-600 bg-fuchsia-50' : 'ring-line-200 bg-surface hover:ring-fuchsia-300';
        const text = Object.entries(b).map(([c, k]) => `${k} ${c}`).join(' · ');
        return (
          <button
            key={i}
            type="button"
            aria-pressed={picked}
            disabled={Boolean(locked)}
            onClick={() => onPick(i)}
            className={`fp-press flex min-w-0 flex-col items-center rounded-2xl p-2 ring-2 ring-inset transition ${verdict}`}
          >
            <span className="text-sm font-black text-ink-900">Bag {'ABC'[i]}</span>
            <BagArt counts={b} salt={i * 31 + Object.values(b).reduce((s, k) => s * 7 + k, 1)} label={`Bag ${'ABC'[i]}: ${text}`} />
            <span className="mt-1 text-center text-xs font-bold text-ink-600">{text}</span>
            {locked && <span className="text-xs font-black tabular-nums text-ink-900">{fmt(round.probs[i])} ≈ {pct(toNum(round.probs[i]))}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ estimate */

const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };

function Die({ v }) {
  return (
    <svg viewBox="0 0 60 60" className="h-14 w-14" aria-hidden>
      <rect x="3" y="3" width="54" height="54" rx="12" className="fill-white stroke-slate-700" strokeWidth="3" />
      {PIPS[v].map(([cx, cy], i) => <circle key={i} cx={16 + cx * 14} cy={16 + cy * 14} r="5" className="fill-slate-800" />)}
    </svg>
  );
}

function Spinner({ sectors }) {
  const n = sectors.length;
  const pt = (a) => [60 + 52 * Math.sin(a), 60 - 52 * Math.cos(a)];
  return (
    <svg viewBox="0 0 120 124" className="h-32 w-32" aria-hidden>
      {sectors.map((c, i) => {
        const a0 = (i / n) * 2 * Math.PI;
        const a1 = ((i + 1) / n) * 2 * Math.PI;
        const [x0, y0] = pt(a0);
        const [x1, y1] = pt(a1);
        return <path key={i} d={`M60 60 L${x0} ${y0} A52 52 0 0 1 ${x1} ${y1} Z`} fill={COLOURS[c].fill} stroke="white" strokeWidth="2" />;
      })}
      <circle cx="60" cy="60" r="7" className="fill-white stroke-slate-700" strokeWidth="2" />
      <path d="M60 60 L60 22" className="stroke-slate-900" strokeWidth="4" strokeLinecap="round" />
      <path d="M52 2 h16 l-8 12 z" className="fill-slate-900" />
    </svg>
  );
}

function Scene({ scene }) {
  if (scene.type === 'dice') return <div className="flex gap-3">{[5, 2, 6].slice(0, scene.count).map((v, i) => <Die key={i} v={v} />)}</div>;
  if (scene.type === 'coins') {
    return (
      <div className="flex flex-wrap justify-center gap-2" aria-hidden>
        {Array.from({ length: scene.count }, (_, i) => (
          <span key={i} className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-sm font-black text-amber-900 ring-4 ring-amber-500/60 ring-inset">{i % 2 ? 'T' : 'H'}</span>
        ))}
      </div>
    );
  }
  if (scene.type === 'spinner') {
    const counts = {};
    scene.sectors.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    return (
      <div className="flex flex-col items-center">
        <Spinner sectors={scene.sectors} />
        <p className="text-xs font-bold text-ink-600">{scene.sectors.length} equal sectors: {Object.entries(counts).map(([c, k]) => `${k} ${c}`).join(', ')}{scene.spins > 1 ? ` · spun ${scene.spins} times` : ''}</p>
      </div>
    );
  }
  if (scene.type === 'bag') return <div className="w-32"><BagArt counts={scene.counts} salt={7} label="The bag" /></div>;
  return (
    <div className="flex max-w-sm flex-wrap justify-center gap-1.5" aria-hidden>
      {scene.names.map((n) => (
        <span key={n} className={`rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${n === 'Asha' || n === 'Ben' ? 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-300' : 'bg-slate-100 text-slate-700 ring-slate-300'}`}>{n}</span>
      ))}
    </div>
  );
}

function Estimate({ round, value, onChange, locked }) {
  const den = round.den;
  const set = (k) => onChange(Math.max(0, Math.min(den, k)));
  const exactAt = toNum(round.exact) * 100;
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-line-200 ring-inset sm:p-4">
      <div className="mb-3 flex justify-center"><Scene scene={round.scene} /></div>
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-3xl font-black tabular-nums text-ink-900">{value}/{den}</span>
        <span className="text-base font-bold tabular-nums text-ink-500">≈ {pct(value / den)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => set(value - 1)} disabled={Boolean(locked)} aria-label="Lower by one" className="fp-press h-11 w-11 shrink-0 rounded-xl bg-slate-100 text-xl font-black text-slate-800 disabled:opacity-40">−</button>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={den}
            step={1}
            value={value}
            disabled={Boolean(locked)}
            onChange={(e) => set(Number(e.target.value))}
            aria-label="Your estimate of the probability"
            aria-valuetext={`${value} out of ${den}, about ${pct(value / den)}`}
            className="h-11 w-full cursor-pointer accent-fuchsia-700"
          />
          {locked && (
            <span className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-emerald-600" style={{ left: `${exactAt}%` }} aria-hidden />
          )}
        </div>
        <button type="button" onClick={() => set(value + 1)} disabled={Boolean(locked)} aria-label="Raise by one" className="fp-press h-11 w-11 shrink-0 rounded-xl bg-slate-100 text-xl font-black text-slate-800 disabled:opacity-40">+</button>
      </div>
      <div className="flex justify-between text-xs font-bold text-ink-500 sm:text-[11px]"><span>0 · impossible</span><span>1 · certain</span></div>
    </div>
  );
}

/* ------------------------------------------------------------------ bets */

function BetsPick({ round, choice, onPick, locked }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {round.games.map((g, i) => {
        const picked = choice === i;
        const verdict = locked ? (i === round.answer ? 'ring-emerald-500 bg-emerald-50' : picked ? 'ring-rose-400 bg-rose-50' : 'ring-line-200 bg-surface') : picked ? 'ring-fuchsia-600 bg-fuchsia-50' : 'ring-line-200 bg-surface hover:ring-fuchsia-300';
        return (
          <button key={i} type="button" aria-pressed={picked} disabled={Boolean(locked)} onClick={() => onPick(i)} className={`fp-press rounded-2xl p-4 text-left ring-2 ring-inset transition ${verdict}`}>
            <span className="text-xs font-black tracking-wider text-fuchsia-800 uppercase">Game {'AB'[i]}</span>
            <p className="mt-1 text-sm font-bold text-ink-900">{g.text}</p>
            <div className="mt-2 flex gap-2 text-xs font-black">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">Fee ₹{g.fee}</span>
              <span className="rounded-lg bg-amber-100 px-2 py-1 text-amber-800">Prize ₹{g.prize}</span>
            </div>
            {locked && <p className="mt-2 text-xs font-black tabular-nums text-ink-900">P(win) = {fmt(g.p)} · EV ₹{fmtMoney(g.ev)} per play</p>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ experiment */

/** Bars for the live histogram, from the running tallies. */
const barsOf = (round, t) => {
  if (round.kind === 'estimate') {
    const n = t.hit + t.miss;
    return {
      bars: [{ label: 'Happened', value: t.hit, max: Math.max(1, n), tone: 'bg-fuchsia-600' }, { label: 'Did not', value: t.miss, max: Math.max(1, n), tone: 'bg-slate-400' }],
      note: n ? `Observed: ${t.hit} of ${n} counted trials ≈ ${pct(t.hit / n)}${t.skipped ? ` (${t.skipped} trials skipped — the “given” did not happen)` : ''}` : ''
    };
  }
  if (round.kind === 'bags') {
    return {
      bars: round.bags.map((_, i) => ({ label: `Bag ${'ABC'[i]}`, value: t.per[i] || 0, max: Math.max(1, t.done), tone: 'bg-fuchsia-600' })),
      note: t.done ? `Successes out of ${t.done} draws from each bag` : ''
    };
  }
  return {
    bars: round.games.map((_, i) => ({ label: `Game ${'AB'[i]}`, value: t.done ? t.per[i] / t.done : 0, signed: true, tone: 'bg-fuchsia-600' })),
    note: t.done ? `Average net winnings per play over ${t.done} plays of each` : ''
  };
};

function Experiment({ round, seed, canStart }) {
  const sim = useRef(null);
  const [view, setView] = useState(null);   // { done, hit, miss, skipped, per }
  const running = view && view.done < TRIALS;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const s = sim.current;
      for (let k = 0; k < PER_TICK && s.t.done < TRIALS; k++) {
        if (round.kind === 'estimate') {
          // Conditional rounds: a trial where the "given" did not happen is run but not counted.
          const j = round.judge(round.draw(s.rng));
          if (j === null) s.t.skipped += 1;
          else if (j) s.t.hit += 1;
          else s.t.miss += 1;
        } else if (round.kind === 'bags') {
          round.bags.forEach((_, i) => { if (round.judge(round.draw(s.rng, i))) s.t.per[i] += 1; });
        } else {
          round.games.forEach((_, i) => { s.t.per[i] += round.value(i, round.draw(s.rng, i)); });
        }
        s.t.done += 1;
      }
      setView({ ...s.t, per: [...s.t.per] });
    }, 30);
    return () => clearInterval(id);
  }, [running, round]);

  const start = () => {
    sim.current = { rng: seeded(seed), t: { done: 0, hit: 0, miss: 0, skipped: 0, per: [0, 0, 0] } };
    setView({ ...sim.current.t, per: [0, 0, 0] });
  };

  if (!view) {
    if (!canStart) return null;
    return (
      <div className="mt-3 flex flex-col items-center gap-1">
        <button type="button" onClick={start} className="fp-press min-h-11 rounded-xl bg-white px-4 text-sm font-black text-fuchsia-800 ring-2 ring-fuchsia-300 ring-inset hover:bg-fuchsia-50">
          ▶ Run the experiment ({TRIALS} trials)
        </button>
        <span className="text-xs font-bold text-ink-500 sm:text-[11px]">Once per round · see the odds play out</span>
      </div>
    );
  }
  const { bars, note } = barsOf(round, view);
  const span = Math.max(1, ...bars.filter((b) => b.signed).map((b) => Math.abs(b.value)));
  return (
    <div className="mt-3 rounded-2xl bg-slate-900 p-3 text-white" aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-xs font-black">
        <span>Experiment</span>
        <span className="tabular-nums text-slate-300">{view.done} / {TRIALS} trials</span>
      </div>
      <div className="space-y-1.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs font-bold">
            <span className="w-16 shrink-0 text-slate-300">{b.label}</span>
            {b.signed ? (
              <div className="relative h-4 flex-1 rounded bg-white/10">
                <span className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40" />
                <span
                  className={`absolute top-0 bottom-0 rounded ${b.value < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={b.value < 0 ? { right: '50%', width: `${(Math.abs(b.value) / span) * 50}%` } : { left: '50%', width: `${(b.value / span) * 50}%` }}
                />
              </div>
            ) : (
              <div className="h-4 flex-1 rounded bg-white/10">
                <div className={`h-full rounded ${b.tone}`} style={{ width: `${(b.value / b.max) * 100}%` }} />
              </div>
            )}
            <span className="w-14 shrink-0 text-right tabular-nums">{b.signed ? `₹${b.value.toFixed(2)}` : b.value}</span>
          </div>
        ))}
      </div>
      {note && <p className="mt-2 text-xs font-bold text-slate-300 sm:text-[11px]">{note}</p>}
    </div>
  );
}
