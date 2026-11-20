import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { countConfig, makeCountLevel } from '../../data/bands/countCatch';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 2000;
const CATCH_Y = 84; // the basket's rim, in % of the sky's height
const REACH = 11; // the fallback catch reach, in % — the live one is measured from the basket as drawn
const STEP = 9; // arrow keys / buttons move the basket this far

/**
 * 🧺 Count & Catch (2026-11-16, the user's design). Work out the sum (3 + 2, 3 × 2, 12 ÷ 3), then move the basket to
 * catch exactly that many of the right thing as things fall — and press Done. Other things fall too: leave them.
 * data/bands/countCatch.js builds the rounds; a round is right when the basket holds the answer.
 */
export default function CountAndCatch({ onExit }) {
  const progress = useGameProgress('count-and-catch', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = countConfig(progress.ageBand, progress.levelNo);
  const [rounds] = useState(() => makeCountLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [basketX, setBasketX] = useState(50);
  const [caught, setCaught] = useState([]); // ids of the right thing caught
  const [oops, setOops] = useState(null); // the emoji of a wrong catch, briefly
  const [gone, setGone] = useState([]); // ids caught or fallen past
  const [verdict, setVerdict] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const fieldRef = useRef(null);
  const basketRef = useRef(50);
  // What lands on the basket is caught (2026-11-18 glitch fix): the reach is half the basket's drawn width (plus a
  // little of the falling picture), measured, so the wider basket of the redesign catches what visibly lands on it.
  const basketEl = useRef(null);
  const reach = () => {
    const f = fieldRef.current?.getBoundingClientRect();
    const b = basketEl.current?.getBoundingClientRect();
    return f?.width && b?.width ? ((b.width / 2 + 14) / f.width) * 100 : REACH;
  };
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = idx >= rounds.length;
  const round = over ? null : rounds[idx];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  // The falling clock: runs only while a round is live and not paused.
  const live = started && !paused && !verdict && !over;
  useEffect(() => {
    if (!live) return undefined;
    let raf;
    let last = performance.now();
    const loop = (now) => {
      setElapsed((e) => e + Math.min(64, now - last));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  // Catches: anything reaching the basket's rim within reach goes in; the rest falls past.
  useEffect(() => {
    if (!round || verdict) return;
    const newlyGone = [];
    const newlyCaught = [];
    let wrongCatch = null;
    for (const it of round.stream) {
      if (gone.includes(it.id)) continue;
      const y = ((elapsed - it.t0) / config.fallMs) * 100 - 8;
      if (y < CATCH_Y) continue;
      if (y < CATCH_Y + 6 && Math.abs(it.x - basketRef.current) <= reach()) {
        newlyGone.push(it.id);
        if (it.target) newlyCaught.push(it.id); else wrongCatch = it.emoji;
      } else if (y >= CATCH_Y + 6) newlyGone.push(it.id);
    }
    if (!newlyGone.length) return;
    // A real event (things landing), not a render-time loop: state follows the clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGone((g) => [...g, ...newlyGone]);
    if (newlyCaught.length) { setCaught((c) => [...c, ...newlyCaught]); sfx.tap?.(); }
    if (wrongCatch) { setOops(wrongCatch); sfx.wrong?.(); }
  }, [elapsed, round, gone, verdict, config.fallMs]);

  useEffect(() => {
    if (!oops) return undefined;
    const t = setTimeout(() => setOops(null), 900);
    return () => clearTimeout(t);
  }, [oops]);

  const moveTo = (x) => {
    const v = Math.max(8, Math.min(92, x));
    basketRef.current = v;
    setBasketX(v);
  };
  const onPointer = (e) => {
    const box = fieldRef.current?.getBoundingClientRect();
    if (!box || verdict) return;
    moveTo(((e.clientX - box.left) / box.width) * 100);
  };

  useEffect(() => {
    if (!started || over || paused) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveTo(basketRef.current - STEP); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveTo(basketRef.current + STEP); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, over, paused]);

  const done = () => {
    if (verdict || !round) return;
    const ok = caught.length === round.answer;
    if (ok) { sfx.right?.(); setCorrect((c) => c + 1); } else { sfx.wrong?.(); setWrong((w) => w + 1); }
    setVerdict({
      ok,
      text: ok
        ? `Yes! ${round.sum} = ${round.answer}. You caught ${round.answer} ${round.kind.many}! 🎉`
        : `You caught ${caught.length}. ${round.sum} = ${round.answer}, so you needed ${round.answer}.`
    });
    timers.current.push(setTimeout(() => {
      setIdx((i) => i + 1);
      setElapsed(0);
      setCaught([]);
      setGone([]);
      setVerdict(null);
    }, NEXT_MS));
  };

  const allFallen = round ? elapsed > round.endMs : false;
  const falling = round ? round.stream.filter((it) => !gone.includes(it.id) && elapsed >= it.t0) : [];
  const objective = `Work out the sum at the top — like 3 + 2. Then move the basket to catch exactly that many of the right fruit as they fall, and press Done. Leave the other things! Get ${config.pass} of ${rounds.length} right.`;

  return (
    <GameShell
      title="Count & Catch"
      blurb="Work out the sum, then catch that many!"
      tone="bg-gradient-to-br from-sky-400 to-indigo-600"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Right"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass,
        stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared!` : 'Good catching — try again!',
        detail: `${correct} of ${rounds.length} baskets exactly right`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Round {Math.min(idx + 1, rounds.length)} of {rounds.length} · move the basket with your finger, the mouse or ← →</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-xl select-none">
          {/* The sum */}
          {/* A scoreboard (2026-11-18 redesign): the sum to catch, and how many are in the basket. */}
          <div className="mb-3 grid grid-cols-[1fr_auto] items-stretch gap-2">
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-white shadow-[0_10px_22px_-10px_rgba(109,40,217,0.9)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 text-3xl ring-1 ring-white/25" aria-hidden>{round.kind.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[0.62rem] font-black tracking-[0.16em] text-indigo-100 uppercase">Catch this many</span>
                <span className="block text-3xl font-black tabular-nums sm:text-4xl">{round.sum}</span>
              </span>
            </div>
            <div className="grid min-w-20 place-items-center rounded-2xl bg-white px-3 py-2 text-center shadow-[0_6px_16px_-10px_rgba(30,41,59,0.5)] ring-1 ring-slate-200">
              <span className="text-[0.62rem] font-black tracking-[0.16em] text-slate-400 uppercase">In basket</span>
              <span className="text-3xl font-black text-indigo-700 tabular-nums">{caught.length}</span>
            </div>
          </div>

          {/* The sky */}
          <div
            ref={fieldRef}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            className="cc-sky relative h-96 touch-none overflow-hidden rounded-[1.75rem] shadow-[0_14px_30px_-16px_rgba(14,116,144,0.6)] ring-4 ring-white sm:h-[26rem]"
            aria-label={`Falling things. Catch ${round.kind.many}.`}
          >
            {/* Sun, drifting clouds, far hills, the meadow. */}
            <span aria-hidden className="absolute top-5 right-6 size-14 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400 shadow-[0_0_40px_12px_rgba(253,224,71,0.55)]" />
            <span aria-hidden className="cc-cloud absolute top-6 left-4 h-7 w-20 rounded-full bg-white/95 shadow-[14px_-8px_0_-2px_rgba(255,255,255,0.95),30px_0_0_-4px_rgba(255,255,255,0.9)]" />
            <span aria-hidden className="cc-cloud absolute top-20 right-16 h-5 w-14 rounded-full bg-white/80 shadow-[10px_-6px_0_-2px_rgba(255,255,255,0.8)]" style={{ animationDelay: '-6s' }} />
            <svg aria-hidden className="absolute inset-x-0 bottom-0 h-28 w-full" viewBox="0 0 400 112" preserveAspectRatio="none">
              <path d="M0 60 C 70 30, 130 40, 200 58 S 330 30, 400 52 L400 112 L0 112 Z" fill="#a7e08a" />
              <path d="M0 82 C 90 62, 170 70, 240 84 S 360 66, 400 78 L400 112 L0 112 Z" fill="#6cc04a" />
              {[[40, 90], [120, 98], [300, 92], [360, 100]].map(([x, y]) => <g key={x} transform={`translate(${x} ${y})`}><circle r="4" fill="#fff" /><circle r="1.8" fill="#facc15" /></g>)}
            </svg>

            {falling.map((it) => {
              const y = ((elapsed - it.t0) / config.fallMs) * 100 - 8;
              return (
                <span key={it.id} aria-hidden className="pointer-events-none absolute -translate-x-1/2 text-4xl drop-shadow-[0_3px_2px_rgba(0,0,0,0.2)] sm:text-5xl" style={{ left: `${it.x}%`, top: `${y}%` }}>
                  {it.emoji}
                </span>
              );
            })}

            {/* The basket */}
            <div className="pointer-events-none absolute -translate-x-1/2 transition-[left] duration-75 ease-out" style={{ left: `${basketX}%`, top: `${CATCH_Y}%` }}>
              <div className="relative">
                <span className="absolute -top-8 left-1/2 grid h-8 min-w-8 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-b from-indigo-500 to-violet-600 px-2 text-sm font-black text-white shadow-md ring-2 ring-white tabular-nums">{caught.length}</span>
                <svg ref={basketEl} viewBox="0 0 112 64" className="block h-14 w-28 drop-shadow-[0_8px_8px_rgba(120,53,15,0.45)] sm:w-32" aria-hidden>
                  <path d="M22 18 C 22 -6, 90 -6, 90 18" fill="none" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
                  <path d="M8 22 L104 22 L94 58 Q 92 62 86 62 L26 62 Q 20 62 18 58 Z" fill="#d97706" />
                  {[0, 1, 2, 3].map((k) => <path key={k} d={`M10 ${30 + k * 8} L102 ${30 + k * 8}`} stroke="#b45309" strokeWidth="2.4" />)}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => <path key={`v${k}`} d={`M${8 + k * 10.6} 22 L${12 + k * 9.6} 62`} stroke="#fbbf24" strokeWidth="1.6" opacity=".55" />)}
                  <rect x="4" y="16" width="104" height="9" rx="4.5" fill="#b45309" />
                  <rect x="4" y="16" width="104" height="3" rx="1.5" fill="#fbbf24" opacity=".6" />
                </svg>
              </div>
            </div>

            {oops && (
              <p className="gs-rise absolute inset-x-0 top-1/3 text-center">
                <span className="rounded-full bg-rose-500 px-4 py-1.5 text-base font-black text-white shadow-lg">Oops! Not a {round.kind.one} {oops}</span>
              </p>
            )}
            {verdict && (
              <div className={`gs-rise absolute inset-x-4 top-1/3 rounded-2xl p-3 text-center text-base font-black shadow-lg ${verdict.ok ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300' : 'bg-rose-50 text-rose-700 ring-2 ring-rose-300'}`} role="status" aria-live="polite">
                {verdict.text}
              </div>
            )}
            {allFallen && !verdict && (
              <p className="absolute inset-x-0 top-1/3 text-center text-base font-black text-indigo-900">All fallen — press Done!</p>
            )}
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveTo(basketRef.current - STEP)} aria-label="Move basket left" className="fp-press grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 text-2xl font-black text-white shadow-[0_5px_0_#1e40af] active:translate-y-1 active:shadow-[0_1px_0_#1e40af]">◀</button>
            <button type="button" onClick={done} disabled={!!verdict}
              className="fp-press min-h-14 flex-1 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-lg font-black text-white shadow-[0_5px_0_#047857] active:translate-y-1 active:shadow-[0_1px_0_#047857] disabled:opacity-50">
              Done ✓ <span className="text-sm opacity-80">({caught.length} {round.kind.emoji})</span>
            </button>
            <button type="button" onClick={() => moveTo(basketRef.current + STEP)} aria-label="Move basket right" className="fp-press grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 text-2xl font-black text-white shadow-[0_5px_0_#1e40af] active:translate-y-1 active:shadow-[0_1px_0_#1e40af]">▶</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
