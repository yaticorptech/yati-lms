import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { beeAt, makeMazeLevel, mazeConfig, mazeScore, mazeStep } from '../../data/bands/youngA';
// The rabbit and the lion from the user's picture (2026-11-18), cut out of its grass.
import rabbitArt from '../../assets/maze/rabbit.png';
import lionArt from '../../assets/maze/lion.png';
import starArt from '../../assets/maze/star.png';
import carrotArt from '../../assets/maze/carrot.png';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1600;
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/**
 * 🐇 Logic: walk the rabbit through the garden maze to the carrot — live, one step at a time. Lions 🦁 (were puddles)
 * send it back to the start (2026-11-18 redesign: bigger mazes, hedges, a wooden frame, big 3D arrow buttons).
 */
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
  const [facing, setFacing] = useState('right'); // the rabbit turns to face the way it hops
  const timers = useRef([]);
  const touch = useRef(null);
  const posRef = useRef(mazes[0].start);
  const tickRef = useRef(0);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Caught by a lion or the bee (2026-11-18, the user): the level is lost and starts again from the first maze.
  const [caught, setCaught] = useState(null);
  const over = mIdx >= mazes.length || !!caught;
  const maze = over ? null : mazes[mIdx];
  const maxPoints = mazes.reduce((s, m) => s + 4 + m.stars.length, 0);
  const pass = mazes.length * 3;
  const stars = over && !caught ? starsForFixed(points, pass, maxPoints) : 0;
  useRecordStars(progress, over, stars, { correct: reached, wrong: totalBumps, hints: 0, score: points, limitMs: null });

  const setAt = (p) => { posRef.current = p; setPos(p); };

  const splash = (why) => {
    sfx.wrong();
    setBumps((b) => b + 1);
    setTotalBumps((b) => b + 1);
    setDone(true); // no more moves: a moment to see what happened, then the level is lost
    setNote({ good: false, text: why });
    timers.current.push(setTimeout(() => setCaught(why), 1300));
  };

  // The bee buzzes one step at a time, only while playing and not paused.
  useEffect(() => {
    if (!started || paused || over || done || !maze?.bee.length) return undefined;
    const t = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
      if (same(beeAt(maze, tickRef.current), posRef.current)) {
        splash('Bzzz! The bee caught the rabbit 🐝');
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
    if (dir === 'left' || dir === 'right') setFacing(dir);
    const n = mazeStep(maze, r, c, dir);
    if (!n) {
      sfx.wrong();
      setBumps((b) => b + 1);
      setTotalBumps((b) => b + 1);
      const rock = maze.rocks?.some((k) => same(k, [r + { up: -1, down: 1, left: 0, right: 0 }[dir], c + { up: 0, down: 0, left: -1, right: 1 }[dir]]));
      setNote({ good: false, text: rock ? 'A big stone 🪨 is in the way — go round it!' : young ? 'Bump! A hedge. Try another way.' : 'Hedge — try another way.' });
      return;
    }
    setMoves((m) => m + 1);
    if (maze.puddles.some((p) => same(p, n))) {
      setAt(n);
      splash('Roar! A lion caught the rabbit 🦁');
      return;
    }
    if (same(beeAt(maze, tickRef.current), n)) {
      setAt(n);
      splash('Bzzz! The bee caught the rabbit 🐝');
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
      setNote({ good: true, text: `Yummy carrot! 🥕 +${pts} points` });
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

  const objective = young
    ? `Help the rabbit 🐰 get to the carrot 🥕! Use the arrow buttons, swipe, or the arrow keys. Grab the stars ⭐ on the way. Keep away from the 2 lions 🦁 and the bee 🐝 — if one catches the rabbit, the level starts again! A stone 🪨 blocks the way, so go round it.`
    : `Walk the rabbit 🐰 through ${mazes.length} mazes to the carrot 🥕. Collect stars for extra points; fewer bumps and fewer moves earn bonus points. Watch out: if a lion 🦁 or the bee 🐝 catches the rabbit, the level starts again. A stone 🪨 blocks the way.`;

  const bee = maze ? beeAt(maze, tick) : null;

  return (
    <GameShell
      title="Mini Maze Mission"
      blurb={young ? 'Lead the rabbit to the carrot!' : `Clear ${mazes.length} mazes, grab the stars, dodge the lions.`}
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
        passed: !caught && points >= pass,
        stars,
        headline: caught ? 'Caught! Play the level again 🔁' : points >= pass ? `Level ${progress.level} cleared!` : 'All mazes done — try for more points!',
        detail: caught ? `${caught} Keep away from the lions and the bee — try again from the first maze.` : `${points} of ${maxPoints} points · ${totalBumps} bumps`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Maze {Math.min(mIdx + 1, mazes.length)} of {mazes.length} · moves {moves} · bumps {bumps} · stars {collected.length}/{maze?.stars.length ?? 0}</p>}
    >
      {started && maze && (
        <div className="mx-auto w-full max-w-2xl">
          {/* The garden board (2026-11-18, the user's picture): an orange frame with leafy corners, lime grass tiles with
              tufts and daisies, thick rounded hedges between the squares, the start square lit. Sized to the screen. */}
          {/* Phones: the full width. Desktop (2026-11-18, the user: "make it big"): up to 40rem. */}
          <div className="mm-frame relative mx-auto w-full max-w-[min(100%,26rem)] rounded-[1.6rem] p-2.5 sm:max-w-[34rem] lg:max-w-[40rem]">
            {[['-top-2 -left-2', 0], ['-top-2 -right-2', 90], ['-bottom-2 -right-2', 180], ['-bottom-2 -left-2', 270]].map(([at, rot]) => (
              <Leaves key={rot} className={`pointer-events-none absolute z-[2] h-12 w-12 ${at}`} rot={rot} />
            ))}
            <div
              className="relative aspect-[5/6] w-full touch-none overflow-hidden rounded-2xl select-none sm:aspect-square"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              role="img"
              aria-label={`Maze, ${maze.size} by ${maze.size}. Rabbit at row ${pos[0] + 1}, column ${pos[1] + 1}; carrot at row ${maze.goal[0] + 1}, column ${maze.goal[1] + 1}.`}
            >
              <MazeArt maze={maze} />
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${maze.size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${maze.size}, minmax(0, 1fr))` }}>
                {maze.walls.flatMap((row, r) => row.map((w, c) => {
                  const here = [r, c];
                  const isBunny = same(pos, here);
                  const isBee = same(bee, here);
                  const isGoal = same(maze.goal, here);
                  const isLion = maze.puddles.some((p) => same(p, here));
                  const isRock = maze.rocks?.some((k) => same(k, here));
                  const isStar = maze.stars.some((s) => same(s, here)) && !collected.some((s) => same(s, here));
                  return (
                    <div key={`${r},${c}`} className="flex items-center justify-center" style={{ fontSize: `min(${(40 / maze.size) * 0.42}rem, ${36 / maze.size}vw)` }}>
                      {isBunny ? (
                        <img src={rabbitArt} alt="" data-piece="rabbit" draggable="false" className={`mm-pop tp-explorer relative z-[1] h-[66%] w-[66%] object-contain ${done ? 'gs-right' : ''}`} style={facing === 'left' ? { transform: 'scaleX(-1)' } : undefined} />
                      ) : isLion ? (
                        <img src={lionArt} alt="" data-piece="lion" draggable="false" className="tp-drop relative z-[1] h-[64%] w-[64%] object-contain" />
                      ) : isGoal ? (
                        <img src={carrotArt} alt="" data-piece="carrot" draggable="false" className="tp-goal relative z-[1] h-[60%] w-[60%] object-contain" />
                      ) : isStar ? (
                        <img src={starArt} alt="" data-piece="star" draggable="false" className="mm-star tp-bob relative z-[1] h-[54%] w-[54%] object-contain" />
                      ) : (
                        <span aria-hidden="true" className={`relative z-[1] leading-none ${isRock ? 'tp-drop' : isBee ? 'tp-bob' : ''}`}>
                          {isBee ? '🐝' : isRock ? '🪨' : ''}
                        </span>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>

          <p className={`mt-3 min-h-6 rounded-2xl px-3 py-1.5 text-center text-sm font-black sm:py-2 sm:text-base ${note ? (note.good ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200') : 'text-ink-900'}`} role="status" aria-live="polite">
            {note ? note.text : young ? 'Which way? 🐰' : 'Use the arrows, swipe or arrow keys.'}
          </p>

          {/* Phones: a smaller pad (2026-11-18, the user), still big enough to tap. */}
          <div className="mx-auto mt-2 grid w-fit grid-cols-3 gap-1.5 sm:gap-2" aria-label="Move the rabbit">
            <span />
            <ArrowBtn dir="up" label="↑" onMove={move} />
            <span />
            <ArrowBtn dir="left" label="←" onMove={move} />
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-lime-100 to-emerald-100 ring-2 ring-emerald-200 sm:h-16 sm:w-16" aria-hidden="true"><img src={rabbitArt} alt="" className="h-9 w-9 object-contain sm:h-12 sm:w-12" /></span>
            <ArrowBtn dir="right" label="→" onMove={move} />
            <span />
            <ArrowBtn dir="down" label="↓" onMove={move} />
            <span />
          </div>
        </div>
      )}
    </GameShell>
  );
}

/**
 * The board's art, drawn once per maze: lime tiles in two shades, grass tufts and daisies scattered (fixed by the
 * cell, so they never jump), the start square lit, and the hedges — thick rounded dark-green lines with a shadow.
 */
function MazeArt({ maze }) {
  const n = maze.size;
  const segs = [];
  maze.walls.forEach((row, r) => row.forEach((w, c) => {
    if (w.e && c < n - 1) segs.push([c + 1, r, c + 1, r + 1]);
    if (w.s && r < n - 1) segs.push([c, r + 1, c + 1, r + 1]);
  }));
  const deco = (r, c) => (r * 31 + c * 17 + n) % 7;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="mm-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9be84f" /><stop offset="1" stopColor="#84d83b" /></linearGradient>
        <linearGradient id="mm-start" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e4fb7a" /><stop offset="1" stopColor="#c9ef4a" /></linearGradient>
      </defs>
      {maze.walls.flatMap((row, r) => row.map((_, c) => (
        <g key={`${r},${c}`}>
          <rect x={c} y={r} width="1" height="1" fill="#6fc72f" />
          <rect x={c + 0.03} y={r + 0.03} width="0.94" height="0.94" rx="0.07" fill={same(maze.start, [r, c]) ? 'url(#mm-start)' : 'url(#mm-tile)'} />
          <rect x={c + 0.03} y={r + 0.03} width="0.94" height="0.94" rx="0.07" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.02" />
          {(deco(r, c) === 1 || deco(r, c) === 3 || deco(r, c) === 5) && (
            <path d={`M${c + 0.2 + deco(r, c) * 0.06} ${r + 0.84} q-0.03 -0.12 -0.08 -0.16 M${c + 0.2 + deco(r, c) * 0.06} ${r + 0.84} q0 -0.13 0.01 -0.2 M${c + 0.2 + deco(r, c) * 0.06} ${r + 0.84} q0.04 -0.11 0.09 -0.15`} fill="none" stroke="#3f9e1c" strokeWidth="0.04" strokeLinecap="round" />
          )}
        </g>
      )))}
      {segs.map(([x1, y1, x2, y2], i) => <line key={`s${i}`} x1={x1} y1={y1 + 0.05} x2={x2} y2={y2 + 0.05} stroke="#0f4d22" strokeWidth="0.3" strokeLinecap="round" />)}
      {segs.map(([x1, y1, x2, y2], i) => <line key={`w${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f7a3a" strokeWidth="0.26" strokeLinecap="round" />)}
      {segs.map(([x1, y1, x2, y2], i) => <line key={`h${i}`} x1={x1 - (x1 === x2 ? 0.03 : 0)} y1={y1 - (y1 === y2 ? 0.03 : 0)} x2={x2 - (x1 === x2 ? 0.03 : 0)} y2={y2 - (y1 === y2 ? 0.03 : 0)} stroke="rgba(255,255,255,0.22)" strokeWidth="0.05" strokeLinecap="round" />)}
    </svg>
  );
}

/** A cluster of three leaves for the frame's corners, like the user's picture. */
function Leaves({ className, rot }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
      {[[14, 22, -35, '#3fae2a'], [24, 12, 10, '#52c234'], [24, 26, -10, '#2f9a22']].map(([x, y, a, fill], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <path d="M0 -11 C8 -7 8 7 0 11 C-8 7 -8 -7 0 -11 Z" fill={fill} stroke="#1f7a1a" strokeWidth="0.8" />
          <path d="M0 -9 L0 9" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function ArrowBtn({ dir, label, onMove }) {
  return (
    <button
      type="button"
      onClick={() => onMove(dir)}
      aria-label={`Move ${dir}`}
      className="fp-press flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 text-2xl font-black text-white shadow-[0_4px_0_#1e40af] active:translate-y-1 active:shadow-[0_1px_0_#1e40af] sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl sm:shadow-[0_5px_0_#1e40af]"
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}
