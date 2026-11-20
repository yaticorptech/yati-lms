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
const REACH = 11; // how far left/right of the basket's centre still catches, in %
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
      if (y < CATCH_Y + 6 && Math.abs(it.x - basketRef.current) <= REACH) {
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
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="rounded-2xl bg-gradient-to-b from-indigo-600 to-violet-700 px-5 py-2.5 text-center text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.9)]">
              <p className="text-[0.65rem] font-black tracking-[0.16em] text-indigo-200 uppercase">Catch this many</p>
              <p className="flex items-center gap-2 text-3xl font-black tabular-nums sm:text-4xl">
                {round.sum} <span className="text-2xl" aria-hidden>{round.kind.emoji}</span>
              </p>
            </div>
          </div>

          {/* The sky */}
          <div
            ref={fieldRef}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            className="relative h-80 touch-none overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-sky-300 via-sky-100 to-lime-100 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.06)] ring-1 ring-sky-200 sm:h-96"
            aria-label={`Falling things. Catch ${round.kind.many}.`}
          >
            <span aria-hidden className="absolute top-3 left-5 text-3xl opacity-80">☁️</span>
            <span aria-hidden className="absolute top-10 right-8 text-2xl opacity-70">☁️</span>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-lime-300 to-green-500" />

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
                <span className="absolute -top-7 left-1/2 grid h-7 min-w-7 -translate-x-1/2 place-items-center rounded-full bg-white px-2 text-sm font-black text-indigo-700 shadow ring-2 ring-indigo-200 tabular-nums">{caught.length}</span>
                <span className="block h-11 w-24 rounded-b-[1.6rem] rounded-t-md bg-[repeating-linear-gradient(135deg,#d97706_0_6px,#b45309_6px_12px)] shadow-[0_8px_12px_-6px_rgba(120,53,15,0.8)] ring-2 ring-amber-800/40 sm:w-28" />
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
            <button type="button" onClick={() => moveTo(basketRef.current - STEP)} aria-label="Move basket left" className="fp-press grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl font-black text-indigo-700 shadow-sm ring-1 ring-line-200">◀</button>
            <button type="button" onClick={done} disabled={!!verdict}
              className="fp-press min-h-14 flex-1 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-lg font-black text-white shadow-[0_10px_20px_-10px_rgba(5,150,105,0.8)] disabled:opacity-50">
              Done ✓ <span className="text-sm opacity-80">({caught.length} {round.kind.emoji})</span>
            </button>
            <button type="button" onClick={() => moveTo(basketRef.current + STEP)} aria-label="Move basket right" className="fp-press grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl font-black text-indigo-700 shadow-sm ring-1 ring-line-200">▶</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
