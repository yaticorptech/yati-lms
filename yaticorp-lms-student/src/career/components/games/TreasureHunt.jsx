import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { seeded } from '../../data/seeded';
import { huntConfig, makeHunt } from '../../data/treasureHunt';

/**
 * Treasure Path for Young Thinkers (2026-11-18, the user: "a treasure hunt on an ancient map — the student solves
 * puzzles, answers logically, and the explorer moves"). A dotted trail across an old map, landmark to landmark; at each
 * a riddle on a scroll. Right first time earns a point and the explorer walks on; a wrong answer gives a hint, a second
 * shows the answer and the walk goes on anyway. At the end the ❌ opens into treasure. Puzzles: data/treasureHunt.js.
 */
import { LEGS, MAP_H, MAP_W, NODES, PLACES, chestArt, explorerArt, mapArt } from './treasureMap';

const STEP_MS = 230;
const REVEAL_MS = 2600;
const freshSeed = () => Math.floor(Math.random() * 4294967296);
// The answer buttons, like the picture: orange, purple, green (and blue for a fourth).
const PILLS = [
  'from-orange-400 to-orange-500 shadow-[0_5px_0_#c2410c]',
  'from-violet-500 to-violet-700 shadow-[0_5px_0_#4c1d95]',
  'from-lime-500 to-green-600 shadow-[0_5px_0_#166534]',
  'from-sky-400 to-blue-600 shadow-[0_5px_0_#1e40af]'
];

/** What the puzzle shows: a row of pictures or numbers, a group to count, or a little sum. */
function Show({ show }) {
  if (!show) return null;
  if (show.row) {
    return (
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {show.row.map((x, i) => (
          <span key={i} className={`grid h-11 min-w-11 place-items-center rounded-xl px-1.5 text-2xl font-black ${x === '?' ? 'pp-glow bg-amber-200 text-amber-900 ring-2 ring-amber-500' : 'bg-white/80 text-ink-900 ring-1 ring-amber-200'}`}>{x}</span>
        ))}
      </div>
    );
  }
  if (show.group) {
    return <div className="mx-auto mt-2 flex max-w-xs flex-wrap justify-center gap-1 text-3xl">{show.group.map((e, i) => <span key={i} className="drop-shadow-sm">{e}</span>)}</div>;
  }
  if (show.sum) {
    const { a, b, e, minus } = show.sum;
    return (
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-2xl">
        <span>{Array.from({ length: a }, () => e).join('')}</span>
        <span className="font-black text-amber-800">{minus ? '−' : '+'}</span>
        <span className={minus ? 'opacity-50 line-through decoration-rose-500' : ''}>{Array.from({ length: b }, () => e).join('')}</span>
      </div>
    );
  }
  return null;
}

export default function TreasureHunt({ progress, onExit }) {
  const cfg = huntConfig(progress.ageBand, progress.levelNo);
  const [hunt] = useState(() => makeHunt(seeded(freshSeed()), cfg));
  const [started, setStarted] = useState(false);
  const [at, setAt] = useState(0);            // which place the explorer stands on
  const [spot, setSpot] = useState(NODES[0]); // where the explorer is drawn (it walks the path between places)
  const [tries, setTries] = useState(0);      // wrong answers on this puzzle
  const [picked, setPicked] = useState(null); // { i, right }
  const [walking, setWalking] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAll, setWrongAll] = useState(0);
  const [finished, setFinished] = useState(false);
  const timers = useRef([]);
  useEffect(() => { const list = timers.current; return () => list.forEach(clearTimeout); }, []);

  const over = finished;
  const passed = score >= cfg.pass;
  const stars = over ? starsForFixed(score, cfg.pass, cfg.stops) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong: wrongAll, hints: 0, score, limitMs: null });

  const puzzle = hunt.puzzles[Math.min(at, cfg.stops - 1)];
  const longest = Math.max(...puzzle.options.map((o) => (o.t || '').length));
  const atTreasure = at >= cfg.stops;
  const here = atTreasure ? null : PLACES[at];

  const walkOn = () => {
    setWalking(true);
    const from = at;
    const points = [...LEGS[from], NODES[from + 1]];
    points.forEach((p, i) => timers.current.push(setTimeout(() => setSpot(p), i * STEP_MS)));
    timers.current.push(setTimeout(() => {
      setAt(from + 1);
      setWalking(false);
      setPicked(null);
      setTries(0);
    }, points.length * STEP_MS + 150));
  };

  // At the treasure: a moment to see the chest open, then the result.
  useEffect(() => {
    if (!atTreasure || finished) return undefined;
    sfx.right?.();
    const t = setTimeout(() => setFinished(true), 2200);
    return () => clearTimeout(t);
  }, [atTreasure, finished]);

  const answer = (i) => {
    if (walking || picked?.right || atTreasure || (picked && tries >= 2)) return;
    if (i === puzzle.answer) {
      sfx.right?.();
      if (tries === 0) setScore((s) => s + 1);
      setPicked({ i, right: true });
      timers.current.push(setTimeout(walkOn, 900));
      return;
    }
    sfx.wrong();
    setWrongAll((w) => w + 1);
    const n = tries + 1;
    setTries(n);
    setPicked({ i, right: false });
    if (n >= 2) timers.current.push(setTimeout(walkOn, REVEAL_MS));
  };


  return (
    <GameShell
      title="Treasure Path"
      blurb="Solve the riddles to follow the ancient map to the treasure!"
      tone="bg-gradient-to-br from-amber-500 to-orange-700"
      score={`${score}/${cfg.stops}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective: `Follow the ancient map to the treasure! At each place a riddle waits — answer it and the explorer walks on. Right first time earns a star point. Get ${cfg.pass} of ${cfg.stops} right first time to clear the level.`, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? { passed, stars, headline: passed ? `Level ${progress.level} cleared — treasure found!` : 'Treasure found — try for more right first time!', detail: `${score} of ${cfg.stops} riddles right first time`, atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry } : null}
      footer={<p className="text-center text-sm text-ink-500">Stop {Math.min(at + 1, cfg.stops)} of {cfg.stops} · answer the riddle to walk on</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-lg">
          {/* The ancient map — the user's picture. The explorer token walks the dashed path; places passed get a tick. */}
          {/* Phones (2026-11-18, the user: "the map is not clearly visible — bigger"): edge to edge of the card. */}
          <div className="relative -mx-3 w-[calc(100%+1.5rem)] overflow-hidden rounded-2xl drop-shadow-[0_14px_20px_rgba(120,53,15,0.35)] sm:mx-0 sm:w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
            role="img" aria-label={`Ancient map. The explorer is ${atTreasure ? 'at the treasure' : at === 0 ? 'at the camp' : `at the ${PLACES[at - 1].name}`}.`}>
            <img src={mapArt} alt="" draggable="false" decoding="async" className="absolute inset-0 h-full w-full select-none [image-rendering:auto]" />
            {/* The camp once the explorer has left it: a plain medallion over the picture's own explorer. */}
            {(at > 0 || walking) && <span className="th-medal absolute aspect-square w-[15.6%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${NODES[0][0]}%`, top: `${NODES[0][1]}%` }} aria-hidden><span className="grid h-full w-full place-items-center text-[clamp(1rem,4.5vw,2rem)]">⛺</span></span>}
            {NODES.slice(1).map(([x, y], i) => i + 1 <= at && (
              <span key={i} aria-hidden className="oo-pop absolute z-[2] grid size-[6%] min-h-5 min-w-5 place-items-center rounded-full bg-emerald-500 text-[clamp(0.6rem,2vw,1rem)] font-black text-white shadow ring-2 ring-white" style={{ left: `${x + 4.5}%`, top: `${y - 7}%` }}>✓</span>
            ))}
            {atTreasure && <span aria-hidden className="tp-goal pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 text-[clamp(1.5rem,7vw,3.5rem)]" style={{ left: `${NODES[4][0]}%`, top: `${NODES[4][1] - 2}%` }}>✨</span>}
            <img src={explorerArt} alt="" draggable="false"
              className={`absolute z-[3] aspect-square w-[15.6%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ease-linear ${walking ? 'tp-walking' : ''} ${atTreasure ? 'gs-right' : ''}`}
              style={{ left: `${spot[0]}%`, top: `${spot[1]}%`, transitionDuration: `${STEP_MS}ms`, filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' }} />
          </div>

          {/* The riddle card, like the picture: parchment, a wooden banner with the place's medallion on each side,
              the question large, and bright 3D answer buttons. */}
          <div className="mt-8 min-h-[12rem]">
            {atTreasure ? (
              <div className="th-card oo-pop relative rounded-[1.8rem] px-5 pt-8 pb-5 text-center">
                <span className="th-banner absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-1.5 text-base font-black whitespace-nowrap text-amber-50"><img src={chestArt} alt="" className="h-7 w-7" />Treasure found!<img src={chestArt} alt="" className="h-7 w-7" /></span>
                <p className="text-4xl">💰🎉👑</p>
                <p className="mt-1 text-xl font-black text-[#1e2a5a]">You opened the treasure chest!</p>
              </div>
            ) : (
              <div key={at} className="th-card oo-pop relative rounded-[1.8rem] px-4 pt-8 pb-4 sm:px-6">
                <span className="th-banner absolute -top-5 left-1/2 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black whitespace-nowrap text-amber-50 sm:text-base">
                  <img src={here.art} alt="" className="h-7 w-7 shrink-0" />
                  <span className="truncate">Riddle of the {here.name}</span>
                  <img src={here.art} alt="" className="h-7 w-7 shrink-0" />
                </span>
                <p className="text-center text-xl font-black text-[#1e2a5a] sm:text-2xl">{puzzle.ask}</p>
                <Show show={puzzle.show} />
                <div className={`mt-4 grid gap-3 ${longest > 5 ? 'grid-cols-1 sm:grid-cols-3' : puzzle.options.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`} role="group" aria-label="Answers">
                  {puzzle.options.map((o, i) => {
                    const isAns = i === puzzle.answer;
                    const showAns = picked?.right ? isAns : tries >= 2 && isAns;
                    const miss = picked && !picked.right && picked.i === i;
                    return (
                      <button key={i} type="button" onClick={() => answer(i)} disabled={walking || !!picked?.right || tries >= 2}
                        className={`fp-press relative grid min-h-14 min-w-0 place-items-center rounded-full bg-gradient-to-b px-3 py-2 leading-tight font-black break-words text-white transition-all [text-shadow:0_2px_0_rgba(0,0,0,0.25)] active:translate-y-1 ${o.e ? 'text-3xl' : 'text-lg sm:text-xl'} ${PILLS[i % PILLS.length]} ${
                          showAns ? 'oo-win ring-4 ring-emerald-300' : miss ? 'gs-wrong opacity-60' : (picked?.right || tries >= 2) ? 'opacity-50' : 'hover:-translate-y-0.5'}`}>
                        {o.e || o.t}
                        {showAns && <span className="absolute -top-2 -right-1 grid size-7 place-items-center rounded-full bg-emerald-500 text-sm text-white ring-2 ring-white">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-4 flex min-h-6 items-center justify-center gap-1.5 text-center text-base font-black ${picked?.right ? 'text-emerald-700' : picked ? 'text-rose-700' : 'text-[#7c3f12]'}`} aria-live="polite">
                  <span aria-hidden>💡</span>
                  {picked?.right ? `Correct! ${puzzle.why} Walk on!` : tries >= 2 ? `The answer: ${puzzle.why}` : picked ? `Not quite — ${puzzle.hint}` : 'Answer to walk on!'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
