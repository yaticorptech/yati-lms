import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeRaceLevel, raceConfig } from '../../data/bands/youngB';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 900;
const CAR_TONES = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-violet-400', 'bg-orange-400'];

/** 🏎️ Missing Number Race: fill the empty cars of each number train; every train you finish moves your racing car on. */
export default function MissingNumberRace({ onExit }) {
  const progress = useGameProgress('missing-number-race', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const FRESH = { index: 0, filled: [], tried: [], missed: false, solved: false, firstTry: 0, wrong: 0, feedback: null, finishedAtMs: null };

function Round({ progress, onExit }) {
  const config = raceConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [rounds] = useState(() => makeRaceLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [game, setGame] = useState(FRESH);
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef(0);
  const timer = useRef(null);

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  const stars = over ? starsForFixed(game.firstTry, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: game.firstTry, wrong: game.wrong, hints: 0, score: game.firstTry });

  const paceMs = config.paceSec * 1000;
  const paceAt = Math.min(1, elapsed / paceMs);
  const meAt = (game.index + (game.solved ? 1 : 0)) / rounds.length;
  const beatPace = game.finishedAtMs !== null && game.finishedAtMs <= paceMs;

  useEffect(() => () => clearTimeout(timer.current), []);

  // The pace car's clock: only while racing and not paused.
  useEffect(() => {
    if (!started || over || paused) return undefined;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      clock.current += Math.min(500, now - last);
      last = now;
      setElapsed(clock.current);
    }, 150);
    return () => clearInterval(t);
  }, [started, over, paused]);

  const tap = (value, ti) => {
    if (!started || over || paused || game.solved || game.tried.includes(ti)) return;
    const want = round.answers[game.filled.length];
    if (value !== want) {
      sfx.wrong();
      setGame({ ...game, tried: [...game.tried, ti], missed: true, wrong: game.wrong + 1, feedback: 'try' });
      return;
    }
    const filled = [...game.filled, value];
    if (filled.length < round.answers.length) {
      sfx.right?.();
      setGame({ ...game, filled, tried: [...game.tried, ti], feedback: 'one-more' });
      return;
    }
    sfx.right?.();
    const last = game.index === rounds.length - 1;
    setGame({ ...game, filled, tried: [...game.tried, ti], solved: true, firstTry: game.firstTry + (game.missed ? 0 : 1), feedback: game.missed ? 'got-it' : 'yes', finishedAtMs: last ? clock.current : null });
    timer.current = setTimeout(() => {
      setGame((g) => ({ ...g, index: g.index + 1, filled: [], tried: [], missed: false, solved: false, feedback: null }));
    }, NEXT_MS);
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') { setPaused((x) => !x); return; }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= round.tiles.length) tap(round.tiles[n - 1], n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const message = {
    yes: young ? 'Vroom! Right number! 🏎️💨' : `Correct! ${round?.rule}`,
    'got-it': `That's it! ${round?.rule}`,
    try: young ? 'Not that one. Count again! 💪' : 'Not that one — look at the jumps between the cars.',
    'one-more': 'Good! Now fill the next empty car.'
  }[game.feedback] || (round && round.blanks.length > 1 ? 'Two cars are empty. Fill them from left to right!' : 'Which number is missing?');

  const objective = young
    ? `Each train counts up or down by one. Tap the missing number to fill the empty car — every train you finish moves your car on! Get ${config.pass} of ${rounds.length} right first time. Try to beat the slow pace car 🚙.`
    : `Find the rule (skip counts like 2s, 5s, 10s${config.grow ? ', or jumps that grow' : ''}) and fill the empty ${config.blanks > 1 ? 'cars from left to right' : 'car'}. Get ${config.pass} of ${rounds.length} right first time; finish before the pace car for bragging rights.`;

  const nextBlank = round ? round.blanks[game.filled.length] : -1;

  return (
    <GameShell
      title="Missing Number Race"
      blurb={young ? 'Fill the trains, win the race!' : `Fix ${config.pass} of ${rounds.length} number trains.`}
      tone="bg-gradient-to-br from-rose-500 to-orange-500"
      score={`${game.firstTry}/${rounds.length}`}
      scoreLabel="First try"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((x) => !x)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? (beatPace ? 'You won the race! 🏆' : `Level ${progress.level} cleared!`) : 'Nearly there',
        detail: `${game.firstTry} of ${rounds.length} trains right first time · ${beatPace ? 'you beat the pace car' : 'the pace car got there first'}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Train {Math.min(game.index + 1, rounds.length)} of {rounds.length} · keys 1–{round?.tiles.length || config.tiles} pick a tile · P pauses</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-md">
          {/* The race track */}
          <div className="mb-3 rounded-2xl bg-slate-700 p-2 ring-2 ring-slate-800" aria-label={`Race: you are ${Math.round(meAt * 100)}% of the way, the pace car ${Math.round(paceAt * 100)}%`}>
            {[{ at: meAt, car: '🏎️', label: 'You' }, { at: paceAt, car: '🚙', label: 'Pace' }].map((lane) => (
              <div key={lane.label} className="relative my-1 h-9 rounded-lg border-y-2 border-dashed border-white/40 bg-slate-600">
                <span className="absolute top-1/2 left-1 -translate-y-1/2 text-[0.6rem] font-black text-white/70 uppercase">{lane.label}</span>
                <span className="absolute top-0 right-1 text-2xl leading-8" aria-hidden="true">🏁</span>
                <span className="absolute top-0 text-3xl leading-8 transition-[left] duration-500 ease-out" style={{ left: `calc(${lane.at * 82 + 4}%)`, transform: 'scaleX(-1)' }} aria-hidden="true">{lane.car}</span>
              </div>
            ))}
          </div>

          {/* The number train */}
          <div className="mb-3 flex items-end justify-center-safe gap-0.5 overflow-x-auto pb-1 min-[400px]:gap-1" aria-label="Number train">
            <span className="text-2xl leading-none sm:text-3xl" aria-hidden="true">🚂</span>
            {round.seq.map((v, i) => {
              const bi = round.blanks.indexOf(i);
              const isBlank = bi >= 0;
              const shown = isBlank ? game.filled[bi] : v;
              const active = i === nextBlank && !game.solved;
              return (
                <span key={i}
                  className={`flex h-12 min-w-10 shrink-0 items-center justify-center rounded-xl px-1 text-lg font-black ring-2 ring-inset min-[400px]:h-14 min-[400px]:min-w-12 min-[400px]:px-1.5 min-[400px]:text-xl sm:h-16 sm:min-w-14 sm:text-2xl ${
                    isBlank ? (shown !== undefined ? 'gs-right bg-emerald-100 text-emerald-800 ring-emerald-500' : active ? 'animate-pulse bg-yellow-100 text-yellow-700 ring-yellow-400' : 'bg-white text-slate-400 ring-slate-300') : `${CAR_TONES[i % CAR_TONES.length]} text-white ring-black/10`
                  }`}
                  aria-label={isBlank && shown === undefined ? 'empty car' : `car ${shown}`}
                >
                  {shown !== undefined ? shown : '?'}
                </span>
              );
            })}
          </div>

          <p className={`mb-3 min-h-6 text-center text-base font-black ${game.feedback === 'try' ? 'text-rose-600' : game.feedback ? 'text-emerald-600' : 'text-ink-900'}`} role="status" aria-live="polite">{message}</p>

          <div className={`grid gap-2.5 ${round.tiles.length === 3 ? 'grid-cols-3' : round.tiles.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
            {round.tiles.map((v, ti) => {
              const used = game.tried.includes(ti);
              const good = used && game.filled.includes(v);
              return (
                <button key={ti} type="button" onClick={() => tap(v, ti)} disabled={used || game.solved} aria-label={`${ti + 1}: ${v}`}
                  className={`fp-press flex min-h-16 items-center justify-center rounded-2xl text-2xl font-black ring-2 ring-inset transition-all focus-visible:outline-3 focus-visible:outline-indigo-500 ${
                    good ? 'bg-emerald-100 text-emerald-700 ring-emerald-400 opacity-60' : used ? 'gs-wrong bg-rose-100 text-rose-500 opacity-60 ring-rose-300' : 'bg-white text-ink-900 ring-orange-200 hover:bg-orange-50'
                  }`}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
