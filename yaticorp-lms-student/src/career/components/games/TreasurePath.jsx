import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { seeded } from '../../data/seeded';
import { DIRS, makePathMap, mapPoints, pathConfig, runProgram } from '../../data/bands/paths';

/** One step of the walk on screen. */
const STEP_MS = 360;

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** 🗺️ Spatial + logic: program a path of arrow cards to walk the explorer to the treasure. */
export default function TreasurePath({ onExit }) {
  const progress = useGameProgress('treasure-path');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const PAD = [
  { dir: 'up', area: 'u' },
  { dir: 'left', area: 'l' },
  { dir: 'down', area: 'd' },
  { dir: 'right', area: 'r' }
];

function Round({ progress, onExit }) {
  const cfg = pathConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = cfg.band === 'foundation';
  const [maps] = useState(() => {
    const rng = seeded(freshSeed());
    return Array.from({ length: cfg.maps }, () => makePathMap(rng, cfg));
  });
  const [mapIdx, setMapIdx] = useState(0);
  const [program, setProgram] = useState([]);
  const [tries, setTries] = useState(0);
  const [points, setPoints] = useState(0);
  const [reached, setReached] = useState(0);
  const [failedRuns, setFailedRuns] = useState(0);
  const [walk, setWalk] = useState(null);       // { trail, outcome, at, steps }
  const [status, setStatus] = useState(null);   // { kind: 'win'|'bump'|'short'|'lost', text, pts }
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);       // a run is on screen, from Go until its verdict
  const timers = useRef([]);

  const over = mapIdx >= maps.length;
  const map = over ? null : maps[mapIdx];
  const maxPoints = maps.length * 3;
  const passed = points >= maps.length;
  const stars = over ? starsForFixed(points, maps.length, maxPoints) : 0;
  useRecordStars(progress, over, stars, { correct: reached, wrong: failedRuns, hints: 0, score: points, limitMs: null });

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const walking = !!walk && walk.at < walk.trail.length - 1;
  const mapDone = status?.kind === 'win' || status?.kind === 'lost';
  const locked = !started || over || busy || walking || mapDone;
  const stepsInProgram = program.reduce((n, card) => n + card.times, 0);

  const add = (dir) => {
    if (locked) return;
    if (status) setStatus(null);
    if (walk) setWalk(null);
    setProgram((p) => (p.length >= map.slots ? p : [...p, { dir, times: 1 }]));
  };
  const repeatLast = (times) => {
    if (locked || !program.length) return;
    if (walk) setWalk(null);
    setProgram((p) => p.map((card, i) => (i === p.length - 1 ? { ...card, times } : card)));
  };
  const removeAt = (idx) => {
    if (locked) return;
    if (walk) setWalk(null);
    setProgram((p) => p.filter((_, i) => i !== idx));
  };
  const undo = () => removeAt(program.length - 1);
  const clear = () => { if (!locked) { setProgram([]); setWalk(null); setStatus(null); } };

  const go = () => {
    if (locked || !program.length) return;
    const result = runProgram(map, program);
    const triesNow = tries + 1;
    setTries(triesNow);
    setBusy(true);
    setStatus(null);
    setWalk({ ...result, at: 0 });
    const last = result.trail.length - 1;
    for (let i = 1; i <= last; i++) {
      timers.current.push(setTimeout(() => setWalk((w) => (w ? { ...w, at: i } : w)), i * STEP_MS));
    }
    timers.current.push(setTimeout(() => finish(result, triesNow), last * STEP_MS + 250));
  };

  const finish = (result, triesNow) => {
    setBusy(false);
    if (result.outcome === 'win') {
      const pts = mapPoints(true, result.steps, map.optimal, triesNow);
      setPoints((p) => p + pts);
      setReached((n) => n + 1);
      const best = result.steps <= map.optimal;
      setStatus({
        kind: 'win', pts,
        text: young
          ? `You found the treasure! ${best ? 'Shortest way! ' : ''}🎉`
          : `Treasure! ${result.steps} steps${best ? ' — the shortest path' : ` (shortest is ${map.optimal})`}${triesNow === 1 ? ', first run' : ''}.`
      });
      return;
    }
    sfx.wrong();
    setFailedRuns((n) => n + 1);
    if (triesNow >= cfg.tries) {
      setStatus({ kind: 'lost', pts: 0, text: 'Out of runs for this map. The green arrows show one way.' });
      return;
    }
    const runsLeft = cfg.tries - triesNow;
    const why = result.outcome === 'bump'
      ? (young ? 'Bump! Something is in the way.' : `Bumped into ${bumpName(map, result.bumpAt)}.`)
      : (young ? 'Not there yet! Add more cards.' : 'The cards ran out before the treasure.');
    setStatus({ kind: result.outcome, text: `${why} Fix your cards and press Go. ${runsLeft} ${runsLeft === 1 ? 'run' : 'runs'} left.` });
  };

  const nextMap = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMapIdx((i) => i + 1);
    setProgram([]);
    setTries(0);
    setWalk(null);
    setStatus(null);
    setBusy(false);
  };

  // Keyboard: arrows add cards, 2/3 repeat the last, Backspace removes, Enter runs (or moves on).
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (dir) { e.preventDefault(); add(dir); return; }
      if (e.key === 'Backspace') { e.preventDefault(); undo(); return; }
      if (cfg.repeat && (e.key === '2' || e.key === '3')) { repeatLast(Number(e.key)); return; }
      if (e.key === 'Enter' && e.target?.tagName !== 'BUTTON') {
        e.preventDefault();
        if (mapDone) nextMap(); else go();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = young
    ? `Help the explorer get the treasure 💰. Tap arrow cards to make a path, then press Go. Rocks 🪨 are in the way. Fewest steps on the first try gets 3 stars.`
    : cfg.band === 'developing'
      ? `Build a program of arrow cards to walk the explorer to the treasure. Rocks and water block the way, and you may use only a few cards. ${cfg.tries} runs per map; the shortest path on your first run earns the most stars.`
      : `Program the explorer to the treasure. Rocks and water block the way${cfg.keys ? '; a locked door 🔒 opens only once you have walked over the key 🔑' : ''}. Use ×2 / ×3 repeat cards to fit long paths into a few cards. The shortest path (fewest steps) on your first run earns 3 stars. ${cfg.tries} runs per map.`;

  // Where the explorer is, and which cells the walk has covered.
  const pos = walk ? walk.trail[walk.at] : map ? { r: map.start[0], c: map.start[1], hasKey: false } : null;
  const visited = new Set(walk ? walk.trail.slice(0, walk.at + 1).map((p) => `${p.r},${p.c}`) : []);
  const solutionCells = new Map();
  if (status?.kind === 'lost' && map) {
    let [r, c] = map.start;
    for (const d of map.solution) { solutionCells.set(`${r},${c}`, DIRS[d].arrow); r += DIRS[d].dr; c += DIRS[d].dc; }
  }
  const bumped = walk && !walking && walk.outcome === 'bump';

  return (
    <GameShell
      title="Treasure Path"
      blurb={young ? 'Make a path to the treasure!' : `Program a path to the treasure on ${maps.length} maps.`}
      tone="bg-gradient-to-br from-emerald-500 to-teal-700"
      score={points}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Keep exploring',
              detail: `${reached} of ${maps.length} treasures found · ${points} of ${maxPoints} points`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Map {Math.min(mapIdx + 1, maps.length)} of {maps.length} · 1 point for the treasure, +1 shortest path, +1 first run</p>}
    >
      {started && map && (
        <div className="mx-auto w-full max-w-md">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-black text-ink-500">
            <span>Run {Math.min(tries + (walking ? 0 : 1), cfg.tries)} of {cfg.tries}</span>
            <span>Shortest: {map.optimal} steps</span>
            <span className="tabular-nums">{cfg.repeat ? 'Cards' : 'Steps'}: {program.length} / {map.slots}</span>
          </div>

          {map.clue && <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-200">Clue: {map.clue}</p>}

          {/* The map */}
          <div
            className={`relative mx-auto overflow-hidden rounded-2xl bg-lime-100 ring-2 ring-lime-300 ${map.cols <= 4 ? 'max-w-72' : map.cols <= 5 ? 'max-w-80' : 'max-w-md'}`}
            role="img"
            aria-label={`Map ${map.rows} rows by ${map.cols} columns. Explorer at row ${pos.r + 1}, column ${pos.c + 1}. Treasure at row ${map.goal[0] + 1}, column ${map.goal[1] + 1}.`}
          >
            <div className="grid" style={{ gridTemplateColumns: `repeat(${map.cols}, minmax(0, 1fr))` }}>
              {map.grid.flatMap((row, r) =>
                row.map((cell, c) => {
                  const id = `${r},${c}`;
                  const isGoal = r === map.goal[0] && c === map.goal[1];
                  const keyTaken = cell === 'K' && pos.hasKey;
                  const doorOpen = cell === 'D' && pos.hasKey;
                  return (
                    <div
                      key={id}
                      className={`relative grid aspect-square place-items-center border border-lime-200/70 text-[clamp(1rem,6vw,1.75rem)] leading-none ${
                        cell === '~' ? 'bg-sky-300' : cell === '#' ? 'bg-stone-200' : cell === 'D' ? (doorOpen ? 'bg-emerald-200' : 'bg-amber-200') : visited.has(id) ? 'bg-amber-100' : ''
                      }`}
                      aria-hidden="true"
                    >
                      {cell === '#' && '🪨'}
                      {cell === '~' && '🌊'}
                      {cell === 'K' && !keyTaken && '🔑'}
                      {cell === 'D' && (doorOpen ? '🚪' : '🔒')}
                      {isGoal && '💰'}
                      {solutionCells.has(id) && <span className="absolute text-base font-black text-emerald-700">{solutionCells.get(id)}</span>}
                    </div>
                  );
                })
              )}
            </div>
            {/* The explorer */}
            <span
              className={`pointer-events-none absolute grid place-items-center text-[clamp(1.1rem,6.5vw,2rem)] leading-none transition-all ease-in-out motion-reduce:transition-none ${bumped ? 'gs-wrong' : ''}`}
              style={{
                width: `${100 / map.cols}%`,
                height: `${100 / map.rows}%`,
                left: `${(pos.c * 100) / map.cols}%`,
                top: `${(pos.r * 100) / map.rows}%`,
                transitionDuration: `${STEP_MS - 60}ms`
              }}
              aria-hidden="true"
            >
              {status?.kind === 'win' ? '🥳' : '🧒'}
            </span>
          </div>

          <p
            className={`mt-2 min-h-6 text-center text-sm font-black ${status?.kind === 'win' ? 'text-emerald-600' : status ? 'text-rose-600' : 'text-ink-700'}`}
            role="status"
            aria-live="polite"
          >
            {status ? `${status.text}${status.kind === 'win' ? ` +${status.pts} ${status.pts === 1 ? 'point' : 'points'}` : ''}` : walking ? 'Walking…' : young ? 'Tap arrows to make a path. Then press Go!' : 'Add cards, then press Go (keyboard: arrows, Backspace, Enter).'}
          </p>

          {/* The program */}
          <div className="mt-2 flex min-h-14 flex-wrap items-center gap-1.5 rounded-2xl bg-surface p-2 ring-1 ring-line-200" aria-label="Your program">
            {program.length === 0 && <span className="px-1 text-sm font-bold text-ink-400">{young ? 'Your arrows go here' : 'Program is empty'}</span>}
            {program.map((card, i) => (
              <button
                key={i}
                type="button"
                onClick={() => removeAt(i)}
                disabled={locked}
                aria-label={`Card ${i + 1}: ${card.dir}${card.times > 1 ? ` times ${card.times}` : ''}. Tap to remove.`}
                className={`relative grid size-11 place-items-center rounded-xl text-xl font-black text-white shadow-sm ${
                  walk && walking && runningCard(program, walk.at) === i ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-teal-600'
                } disabled:cursor-default`}
              >
                {DIRS[card.dir].arrow}
                {card.times > 1 && <span className="absolute -top-1.5 -right-1.5 rounded-full bg-violet-600 px-1.5 text-[0.7rem] leading-5">×{card.times}</span>}
              </button>
            ))}
          </div>
          {cfg.repeat && <p className="mt-1 text-center text-xs text-ink-500">{stepsInProgram} steps in your program</p>}

          {/* Controls */}
          {mapDone ? (
            <button
              type="button"
              onClick={nextMap}
              className="fp-press mt-3 min-h-12 w-full rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-sm"
            >
              {mapIdx + 1 >= maps.length ? 'See my stars' : 'Next map →'}
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap items-start justify-center gap-3">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3, 3.25rem)', gridTemplateAreas: "'. u .' 'l d r'" }}>
                {PAD.map(({ dir, area }) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => add(dir)}
                    disabled={locked || program.length >= map.slots}
                    aria-label={`Add ${dir}`}
                    style={{ gridArea: area }}
                    className="fp-press grid h-13 place-items-center rounded-xl bg-teal-500 text-2xl font-black text-white shadow-sm disabled:opacity-40"
                  >
                    {DIRS[dir].arrow}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                {cfg.repeat && (
                  <div className="flex gap-1.5">
                    {[2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => repeatLast(n)}
                        disabled={locked || !program.length}
                        aria-label={`Repeat the last card ${n} times`}
                        className="fp-press min-h-11 min-w-14 rounded-xl bg-violet-600 px-2 text-sm font-black text-white disabled:opacity-40"
                      >
                        🔁 ×{n}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <button type="button" onClick={undo} disabled={locked || !program.length} aria-label="Remove the last card" className="fp-press min-h-11 min-w-14 rounded-xl bg-surface px-2 font-black text-ink-700 ring-1 ring-line-200 disabled:opacity-40">⌫</button>
                  <button type="button" onClick={clear} disabled={locked || !program.length} className="fp-press min-h-11 min-w-14 rounded-xl bg-surface px-2 text-sm font-black text-ink-700 ring-1 ring-line-200 disabled:opacity-40">Clear</button>
                </div>
                <button
                  type="button"
                  onClick={go}
                  disabled={locked || !program.length}
                  className="fp-press min-h-12 rounded-xl bg-emerald-600 px-4 text-lg font-black text-white shadow-sm disabled:opacity-40"
                >
                  Go ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** Which card is moving the explorer at step `at` of the walk. */
function runningCard(program, at) {
  let steps = 0;
  for (let i = 0; i < program.length; i++) {
    steps += program[i].times;
    if (at <= steps && at > steps - program[i].times) return i;
  }
  return -1;
}

function bumpName(map, at) {
  if (!at || at.r < 0 || at.c < 0 || at.r >= map.rows || at.c >= map.cols) return 'the edge of the map';
  const cell = map.grid[at.r][at.c];
  return cell === '~' ? 'water' : cell === 'D' ? 'a locked door — get the key first' : 'a rock';
}
