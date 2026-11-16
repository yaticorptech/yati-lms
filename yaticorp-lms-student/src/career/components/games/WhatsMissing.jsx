import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeMissingLevel, missingCheck, missingConfig } from '../../data/bands/youngA';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const COVER_MS = 800;
const REVEAL_MS = 1800;

/** 🙈 Memory: look at the scene, it is covered, something goes — tap what is missing. */
export default function WhatsMissing({ onExit }) {
  const progress = useGameProgress('whats-missing', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = missingConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [rounds] = useState(() => makeMissingLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('look');
  const [lookLeft, setLookLeft] = useState(config.showMs);
  const [found, setFound] = useState([]);
  const [misses, setMisses] = useState([]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [paused, setPaused] = useState(false);
  const leftRef = useRef(config.showMs);
  const timers = useRef([]);

  const over = idx >= rounds.length;
  const round = over ? null : rounds[idx];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const cover = () => {
    setPhase('cover');
    timers.current.push(setTimeout(() => setPhase('find'), COVER_MS));
  };

  // The looking clock: counts down only while playing and not paused.
  useEffect(() => {
    if (!started || paused || over || phase !== 'look') return undefined;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      leftRef.current -= now - last;
      last = now;
      setLookLeft(Math.max(0, leftRef.current));
      if (leftRef.current <= 0) { clearInterval(t); cover(); }
    }, 100);
    return () => clearInterval(t);
  }, [started, paused, over, phase, idx]);

  const nextRound = () => {
    leftRef.current = config.showMs;
    setLookLeft(config.showMs);
    setFound([]);
    setMisses([]);
    setPhase('look');
    setIdx((i) => i + 1);
  };

  const tap = (item) => {
    if (phase !== 'find' || paused || found.includes(item.emoji) || misses.includes(item.emoji)) return;
    if (!missingCheck(round, item.emoji)) {
      sfx.wrong();
      setMisses((m) => [...m, item.emoji]);
      return;
    }
    const nowFound = [...found, item.emoji];
    setFound(nowFound);
    if (nowFound.length < round.missing.length) return;
    sfx.right?.();
    if (misses.length === 0) setCorrect((c) => c + 1); else setWrong((w) => w + 1);
    setPhase('reveal');
    timers.current.push(setTimeout(nextRound, REVEAL_MS));
  };

  // Number keys pick from the tray; Space/Enter ends the looking early.
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (phase === 'look' && (e.key === ' ' || e.key === 'Enter') && e.target?.tagName !== 'BUTTON') { e.preventDefault(); leftRef.current = 0; return; }
      const n = Number(e.key);
      if (phase === 'find' && Number.isInteger(n) && n >= 1 && n <= round.tray.length) tap(round.tray[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const many = config.missing > 1;
  const objective = young
    ? `Look at the pictures and remember them. They hide — then one thing is gone! Tap the thing that is missing. Get ${config.pass} of ${rounds.length} right first time.`
    : `Study the scene for a few seconds. It is covered, then shown again with ${many ? 'two things' : 'one thing'} gone${config.shuffle ? ' — and the rest moved around' : ''}. Tap ${many ? 'both missing things' : 'the missing thing'} in the tray. Get ${config.pass} of ${rounds.length} with no wrong tap.`;

  const shown = phase === 'look' ? round?.scene : phase === 'reveal' ? round?.scene : round?.after;
  const missingSet = new Set(round?.missing.map((m) => m.emoji));
  const message = !round ? '' : {
    look: young ? 'Look carefully! 👀' : `Remember everything — ${Math.ceil(lookLeft / 1000)} s`,
    cover: 'Hiding… 🙈',
    find: misses.length
      ? (young ? 'That one is still there. Try again! 💪' : 'That one is still there (or never was). Look again.')
      : found.length
        ? 'Yes! One more is missing.'
        : (many ? 'Two things are gone. What are they?' : "What's missing? Tap it!"),
    reveal: misses.length ? `There ${many ? 'they are' : 'it is'}! Next one.` : (young ? 'Well done! 🎉' : 'Correct!')
  }[phase];

  return (
    <GameShell
      title="What's Missing?"
      blurb={young ? 'Spot what disappeared!' : `Find what vanished in ${config.pass} of ${rounds.length} scenes.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-violet-700"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Found"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass,
        stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared!` : 'Good looking — try again!',
        detail: `${correct} of ${rounds.length} scenes right first time`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Scene {Math.min(idx + 1, rounds.length)} of {rounds.length}{phase === 'find' ? ` · keys 1–${round?.tray.length} pick` : phase === 'look' ? ' · Space when ready' : ''}</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-md">
          {phase === 'look' && (
            <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Looking time left" aria-valuemin={0} aria-valuemax={config.showMs} aria-valuenow={Math.round(lookLeft)}>
              <div className="h-full rounded-full bg-violet-500 transition-[width] duration-100 ease-linear" style={{ width: `${(lookLeft / config.showMs) * 100}%` }} />
            </div>
          )}
          <div
            className="relative grid gap-2 rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100 p-3 ring-1 ring-orange-200"
            style={{ gridTemplateColumns: `repeat(${config.slotCols}, minmax(0, 1fr))` }}
            role="img"
            aria-label={phase === 'cover' ? 'The scene is covered' : `Scene with ${shown.map((o) => o.name).join(', ')}`}
          >
            {Array.from({ length: config.slots }, (_, slot) => {
              const item = shown.find((o) => o.slot === slot);
              const back = phase === 'reveal' && item && missingSet.has(item.emoji);
              return (
                <div key={slot} className={`flex aspect-square items-center justify-center rounded-2xl ${back ? 'gs-right bg-emerald-100 ring-2 ring-emerald-400' : 'bg-white/60'}`}>
                  {item && <span className="text-4xl leading-none sm:text-5xl" aria-hidden="true">{item.emoji}</span>}
                </div>
              );
            })}
            {phase === 'cover' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-violet-500" aria-hidden="true">
                <span className="text-6xl">🙈</span>
              </div>
            )}
          </div>

          <p className={`mt-3 mb-2 min-h-6 text-center font-black ${young ? 'text-lg' : 'text-base'} ${phase === 'reveal' && !misses.length ? 'text-emerald-600' : phase === 'find' && misses.length ? 'text-rose-600' : 'text-ink-900'}`} role="status" aria-live="polite">
            {message}
          </p>

          {phase === 'look' && (
            <button type="button" onClick={() => { leftRef.current = 0; }} className="fp-press mx-auto block min-h-14 rounded-2xl bg-violet-600 px-6 text-base font-black text-white shadow-md">
              I remember! ✋
            </button>
          )}

          {(phase === 'find' || phase === 'reveal') && (
            <div className={`grid gap-2.5 ${round.tray.length <= 3 ? 'grid-cols-3' : round.tray.length === 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-6'}`} aria-label="Picture tray">
              {round.tray.map((item, i) => {
                const isFound = found.includes(item.emoji) || (phase === 'reveal' && missingSet.has(item.emoji));
                const isMiss = misses.includes(item.emoji);
                return (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => tap(item)}
                    disabled={phase !== 'find' || isFound || isMiss}
                    aria-label={`${i + 1}: ${item.name}`}
                    className={`fp-press flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl p-1.5 ring-2 ring-inset transition-all ${
                      isFound ? 'gs-right bg-emerald-100 ring-emerald-500' : isMiss ? 'gs-wrong bg-rose-100 opacity-60 ring-rose-400' : 'bg-white ring-violet-200 hover:bg-violet-50'
                    }`}
                  >
                    <span className="text-4xl leading-none" aria-hidden="true">{item.emoji}</span>
                    <span className="text-xs font-bold text-ink-700 capitalize">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
