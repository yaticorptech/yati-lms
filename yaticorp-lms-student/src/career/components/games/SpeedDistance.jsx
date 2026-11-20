import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeSpeedLevel, showValue, snap, speedConfig } from '../../data/bands/speedDistance';

/**
 * 🚆 Speed, Time & Distance (2026-11-19, Master Minds · Maths, the user's pick). Read the journey, then DRAG the marker
 * along the timeline — a track in kilometres or a clock line — to your answer and press Check. The vehicles then drive
 * the journey out on the same line, so you see exactly where they get to. data/bands/speedDistance.js.
 */
export default function SpeedDistance({ onExit }) {
  const progress = useGameProgress('speed-distance', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const DRIVE_MS = 1400;

function Round({ progress, onExit }) {
  const cfg = speedConfig(progress.difficulty, progress.levelNo);
  const [qs] = useState(() => makeSpeedLevel(seeded(freshSeed()), cfg));
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(() => qs[0].track.min); // the marker
  const [moved, setMoved] = useState(false);
  const [phase, setPhase] = useState('ask'); // ask → drive → shown
  const [right, setRight] = useState(0);
  const [results, setResults] = useState([]);
  const [started, setStarted] = useState(false);
  const bar = useRef(null);
  const dragging = useRef(false);
  const timers = useRef([]);
  useEffect(() => { const l = timers.current; return () => l.forEach(clearTimeout); }, []);

  const limitMs = cfg.seconds * 1000;
  const allDone = idx >= qs.length;
  const elapsed = useEClock(started && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const left = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
  const stars = over ? starsForFixed(right, cfg.pass, qs.length) : 0;
  useRecordStars(progress, over, stars, { correct: right, wrong: results.length - right, hints: 0, score: right, limitMs });

  const q = qs[Math.min(idx, qs.length - 1)];
  const { min, max, step } = q.track;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const ok = results[idx];

  const setFrom = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    const v = snap(q.track, min + ((clientX - r.left) / r.width) * (max - min));
    if (v !== pos) sfx.tap?.();
    setPos(v); setMoved(true);
  };
  const down = (e) => { if (phase !== 'ask' || over) return; dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); setFrom(e.clientX); };
  const move = (e) => { if (dragging.current) setFrom(e.clientX); };
  const up = () => { dragging.current = false; };
  const nudge = (d) => { if (phase === 'ask') { setPos((p) => Math.min(max, Math.max(min, p + d * step))); setMoved(true); } };

  const check = () => {
    if (phase !== 'ask' || !moved) return;
    const good = pos === q.answer;
    setPhase('drive');
    timers.current.push(setTimeout(() => {
      if (good) { sfx.right?.(); setRight((n) => n + 1); } else sfx.wrong?.();
      setResults((r) => [...r, good]);
      setPhase('shown');
    }, DRIVE_MS));
  };
  const next = () => {
    const n = idx + 1;
    setIdx(n); setPhase('ask'); setMoved(false);
    if (n < qs.length) setPos(qs[n].track.min);
  };

  // Tick labels: about six along the line.
  const span = max - min;
  const tickEvery = q.track.unit === 'time' ? (span > 360 ? 120 : 60) : [25, 50, 100, 200].find((t) => span / t <= 7) || 200;
  const ticks = [];
  for (let v = Math.ceil(min / tickEvery) * tickEvery; v <= max; v += tickEvery) ticks.push(v);

  const objective = `Each journey is answered on a timeline: drag the marker along the track (kilometres) or the clock line (time) to your answer, then press Check — the vehicles drive it out so you can see where they really get to. ${qs.length} journeys in ${Math.round(cfg.seconds / 60)} minutes; get ${cfg.pass} right to clear the level.`;

  return (
    <GameShell
      title="Speed, Time & Distance"
      blurb="Drag along the timeline to the answer."
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={`${right}/${qs.length}`}
      scoreLabel="Correct"
      seconds={left}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: right >= cfg.pass, stars,
        headline: right >= cfg.pass ? `Level ${progress.level} cleared — on time!` : timeUp && !allDone ? 'Time is up' : 'Nearly there — try again',
        detail: `${right} of ${qs.length} journeys right`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Journey {Math.min(idx + 1, qs.length)} of {qs.length}</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-xl select-none flex-col gap-3 max-sm:flex-1">
          {/* The question */}
          <div key={idx} className="vx-card gs-pop-in px-4 py-4">
            <p className="text-[0.65rem] font-black tracking-[0.16em] uppercase opacity-90">Journey {idx + 1} of {qs.length}</p>
            <p className="mt-1.5 text-base leading-snug font-bold sm:text-lg">{q.prompt}</p>
          </div>

          {/* The timeline */}
          <div className="sd-scene relative overflow-hidden rounded-[1.5rem] px-4 pt-14 pb-4">
            <span aria-hidden className="pointer-events-none absolute top-3 left-4 text-xs font-black tracking-wider text-white/70 uppercase">{q.track.unit === 'time' ? '🕒 Clock line' : '🛤️ Track (km)'}</span>
            <div ref={bar} className="relative mx-1 h-16 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={pos} aria-valuetext={showValue(q.track, pos)} tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'ArrowRight') nudge(1); if (e.key === 'ArrowLeft') nudge(-1); if (e.key === 'Enter') check(); }}>
              {/* the road / rail */}
              <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-700 shadow-inner">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" style={{ width: `${pct(pos)}%` }} />
                <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-white/40" />
              </div>
              {/* the vehicles */}
              {q.movers.map((m, i) => {
                const at = phase === 'ask' ? m.from : m.to;
                return (
                  <span key={i} aria-hidden className="absolute -top-9 -translate-x-1/2 text-3xl transition-[left] ease-in-out" style={{ left: `${pct(at)}%`, transitionDuration: phase === 'ask' ? '0ms' : `${DRIVE_MS}ms`, transform: `translateX(-50%) ${m.flip ? 'scaleX(-1)' : ''}` }}>{m.icon}</span>
                );
              })}
              {/* the right answer, once driven */}
              {phase === 'shown' && <span className="absolute top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" style={{ left: `${pct(q.answer)}%` }} aria-hidden />}
              {/* the marker you drag */}
              <span className={`absolute top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white text-sm shadow-lg ${phase === 'shown' ? (ok ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-amber-400'} ${phase === 'ask' ? 'cursor-grab' : ''}`} style={{ left: `${pct(pos)}%` }} aria-hidden>📍</span>
            </div>
            {/* ticks */}
            <div className="relative mx-1 mt-1 h-5 text-[10px] font-bold text-white/70">
              {ticks.map((v) => <span key={v} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(v)}%` }}>{q.track.unit === 'time' ? showValue(q.track, v).replace(':00', '') : v}</span>)}
            </div>
            {q.ends && (
              <div className="mt-1 flex justify-between text-xs font-black text-white"><span>{q.ends[0]}</span><span>{q.ends[1]}</span></div>
            )}
          </div>

          {/* Your answer */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => nudge(-1)} disabled={phase !== 'ask'} className="fp-press grid h-12 w-12 place-items-center rounded-xl bg-white text-xl font-black text-indigo-800 ring-1 ring-indigo-200 disabled:opacity-40" aria-label="Back one step">‹</button>
            <p className={`flex-1 rounded-xl px-3 py-2.5 text-center text-xl font-black tabular-nums ring-1 ${phase === 'shown' ? (ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200') : 'bg-indigo-50 text-indigo-900 ring-indigo-100'}`}>
              {moved ? showValue(q.track, pos) : 'Drag the 📍'}
            </p>
            <button type="button" onClick={() => nudge(1)} disabled={phase !== 'ask'} className="fp-press grid h-12 w-12 place-items-center rounded-xl bg-white text-xl font-black text-indigo-800 ring-1 ring-indigo-200 disabled:opacity-40" aria-label="On one step">›</button>
          </div>

          {phase === 'shown' ? (
            <div className={`gs-rise rounded-2xl p-3 ring-1 ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`} role="status">
              <p className={`text-sm font-black ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{ok ? '✓ Spot on!' : `✕ The answer is ${showValue(q.track, q.answer)}.`}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">{q.note}</p>
              <button type="button" onClick={next} className="vx-cta fp-press mt-3 min-h-12 w-full text-base">{idx + 1 < qs.length ? 'Next journey →' : 'See result →'}</button>
            </div>
          ) : (
            <button type="button" onClick={check} disabled={!moved || phase !== 'ask'} className="vx-cta fp-press min-h-12 w-full text-base disabled:opacity-40">
              {phase === 'drive' ? 'Driving…' : '✓ Check'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
