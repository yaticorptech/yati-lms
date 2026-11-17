import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { beeAt, makeMazeLevel, mazeConfig, mazeScore, mazeStep } from '../../data/bands/youngA';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1600;
const WALL = '3px solid #334155';
const OPEN = '3px solid transparent';
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** 🐰 Logic: walk the bunny through the maze to the carrot — live, one step at a time. */
export default function MiniMazeMission({ onExit }) {
  const progress = useGameProgress('mini-maze-mission', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = mazeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [mazes] = useState(() => makeMazeLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [mIdx, setMIdx] = useState(0);
  const [pos, setPos] = useState(mazes[0].start);
  const [moves, setMoves] = useState(0);
  const [bumps, setBumps] = useState(0);
  const [collected, setCollected] = useState([]);
  const [tick, setTick] = useState(0);
  const [points, setPoints] = useState(0);
  const [reached, setReached] = useState(0);
  const [totalBumps, setTotalBumps] = useState(0);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState(null);
  const timers = useRef([]);
  const touch = useRef(null);
  const posRef = useRef(mazes[0].start);
  const tickRef = useRef(0);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = mIdx >= mazes.length;
  const maze = over ? null : mazes[mIdx];
  const maxPoints = mazes.reduce((s, m) => s + 4 + m.stars.length, 0);
  const pass = mazes.length * 3;
  const stars = over ? starsForFixed(points, pass, maxPoints) : 0;
  useRecordStars(progress, over, stars, { correct: reached, wrong: totalBumps, hints: 0, score: points, limitMs: null });

  const setAt = (p) => { posRef.current = p; setPos(p); };

  const splash = (why) => {
    sfx.wrong();
    setBumps((b) => b + 1);
    setTotalBumps((b) => b + 1);
    setAt(maze.start);
    setNote({ good: false, text: why });
  };

  // The bee buzzes one step at a time, only while playing and not paused.
  useEffect(() => {
    if (!started || paused || over || done || !maze?.bee.length) return undefined;
    const t = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
      if (same(beeAt(maze, tickRef.current), posRef.current)) {
        splash(young ? 'Bzzz! The bee got you. Back to the start!' : 'The bee buzzed into you — back to the start.');
      }
    }, config.beeMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paused, over, done, mIdx]);

  const nextMaze = () => {
    const n = mIdx + 1;
    setMIdx(n);
    setMoves(0);
    setBumps(0);
    setCollected([]);
    tickRef.current = 0;
    setTick(0);
    setDone(false);
    setNote(null);
    if (n < mazes.length) setAt(mazes[n].start);
  };

  const move = (dir) => {
    if (!started || over || done || paused) return;
    const [r, c] = posRef.current;
    const n = mazeStep(maze, r, c, dir);
    if (!n) {
      sfx.wrong();
      setBumps((b) => b + 1);
      setTotalBumps((b) => b + 1);
      setNote({ good: false, text: young ? 'Bump! A wall. Try another way.' : 'Wall — try another way.' });
      return;
    }
    setMoves((m) => m + 1);
    if (maze.puddles.some((p) => same(p, n))) {
      splash(young ? 'Splash! A puddle. Back to the start!' : 'Splash — puddles send you back to the start.');
      return;
    }
    if (same(beeAt(maze, tickRef.current), n)) {
      splash(young ? 'Bzzz! Watch the bee. Back to the start!' : 'You ran into the bee — back to the start.');
      return;
    }
    setAt(n);
    let got = collected;
    if (maze.stars.some((s) => same(s, n)) && !collected.some((s) => same(s, n))) {
      got = [...collected, n];
      setCollected(got);
      sfx.right?.();
      setNote({ good: true, text: 'You got a star! ⭐' });
    } else {
      setNote(null);
    }
    if (same(n, maze.goal)) {
      const pts = mazeScore(maze, config, { moves: moves + 1, bumps, collected: got });
      setPoints((p) => p + pts);
      setReached((x) => x + 1);
      setDone(true);
      sfx.right?.();
      setNote({ good: true, text: `${young ? 'Yummy carrot! 🥕' : 'Goal!'} +${pts} points` });
      timers.current.push(setTimeout(nextMaze, NEXT_MS));
    }
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = [t.clientX, t.clientY]; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current[0];
    const dy = t.clientY - touch.current[1];
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const hazards = config.puddles > 0 || config.bee;
  const objective = young
    ? `Help the bunny 🐰 get to the carrot 🥕! Use the arrow buttons, swipe, or the arrow keys. Grab the stars ⭐ on the way. Try not to bump into walls.${hazards ? ' Puddles 💦 send you back to the start!' : ''}`
    : `Walk the bunny through ${mazes.length} mazes to the carrot. Collect stars for extra points; fewer bumps and fewer moves earn bonus points.${hazards ? ` Watch out: puddles${config.bee ? ' and a buzzing bee' : ''} send you back to the start.` : ''}`;

  const bee = maze ? beeAt(maze, tick) : null;
  const cellRem = maze ? Math.min(4, 20 / maze.size) : 4;

  return (
    <GameShell
      title="Mini Maze Mission"
      blurb={young ? 'Lead the bunny to the carrot!' : `Clear ${mazes.length} mazes, grab the stars, dodge the hazards.`}
      tone="bg-gradient-to-br from-teal-400 to-cyan-700"
      score={points}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={maze?.bee.length ? () => setPaused((p) => !p) : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: points >= pass,
        stars,
        headline: points >= pass ? `Level ${progress.level} cleared!` : 'All mazes done — try for more points!',
        detail: `${points} of ${maxPoints} points · ${totalBumps} bumps`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Maze {Math.min(mIdx + 1, mazes.length)} of {mazes.length} · moves {moves} · bumps {bumps} · stars {collected.length}/{maze?.stars.length ?? 0}</p>}
    >
      {started && maze && (
        <div className="mx-auto w-full max-w-md">
          <div
            className="mx-auto grid touch-none rounded-xl bg-emerald-50 p-1 ring-2 ring-slate-700 select-none"
            style={{ gridTemplateColumns: `repeat(${maze.size}, minmax(0, 1fr))`, width: `${maze.size * cellRem + 0.5}rem`, maxWidth: '100%' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="img"
            aria-label={`Maze, ${maze.size} by ${maze.size}. Bunny at row ${pos[0] + 1}, column ${pos[1] + 1}; carrot at row ${maze.goal[0] + 1}, column ${maze.goal[1] + 1}.`}
          >
            {maze.walls.flatMap((row, r) => row.map((w, c) => {
              const here = [r, c];
              const isBunny = same(pos, here);
              const content = isBunny ? '🐰'
                : same(bee, here) ? '🐝'
                  : same(maze.goal, here) ? '🥕'
                    : maze.puddles.some((p) => same(p, here)) ? '💦'
                      : maze.stars.some((s) => same(s, here)) && !collected.some((s) => same(s, here)) ? '⭐' : '';
              return (
                <div
                  key={`${r},${c}`}
                  className={`flex aspect-square items-center justify-center ${isBunny && done ? 'gs-right' : ''} ${maze.bee.some((b) => same(b, here)) ? 'bg-amber-100/70' : ''}`}
                  style={{ borderTop: w.n ? WALL : OPEN, borderRight: w.e ? WALL : OPEN, borderBottom: w.s ? WALL : OPEN, borderLeft: w.w ? WALL : OPEN, fontSize: `min(${cellRem * 0.55}rem, ${45 / maze.size}vw)` }}
                >
                  <span aria-hidden="true" className="leading-none">{content}</span>
                </div>
              );
            }))}
          </div>

          <p className={`mt-3 min-h-6 text-center text-base font-black ${note ? (note.good ? 'text-emerald-600' : 'text-rose-600') : 'text-ink-900'}`} role="status" aria-live="polite">
            {note ? note.text : young ? 'Which way? 🐰' : 'Use the arrows, swipe or arrow keys.'}
          </p>

          <div className="mx-auto mt-2 grid w-fit grid-cols-3 gap-2" aria-label="Move the bunny">
            <span />
            <ArrowBtn dir="up" label="⬆️" onMove={move} />
            <span />
            <ArrowBtn dir="left" label="⬅️" onMove={move} />
            <span className="flex h-16 w-16 items-center justify-center text-3xl" aria-hidden="true">🐰</span>
            <ArrowBtn dir="right" label="➡️" onMove={move} />
            <span />
            <ArrowBtn dir="down" label="⬇️" onMove={move} />
            <span />
          </div>
        </div>
      )}
    </GameShell>
  );
}

function ArrowBtn({ dir, label, onMove }) {
  return (
    <button
      type="button"
      onClick={() => onMove(dir)}
      aria-label={`Move ${dir}`}
      className="fp-press flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-md ring-2 ring-teal-200 ring-inset active:bg-teal-50"
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}
