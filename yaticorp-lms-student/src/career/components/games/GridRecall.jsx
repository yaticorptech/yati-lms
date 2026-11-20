import { useEffect, useRef, useState } from 'react';
import { sfx } from './gameSfx';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { gridConfig, gridRounds } from '../../data/bands/memory';

/**
 * 🧠 Memory & focus: tiles light up, then go dark. Tap the ones that lit.
 *
 * Per age band (data/bands/memory.js): Young Thinkers see pictures (🍎 ⭐ 🐶) pop up on a small grid — 2–3 on a 3×3
 * for Foundation — and tap where they were; Rising Brains get bigger grids and more lit tiles; Master Minds see two
 * patterns one after the other (violet, then amber) and recall the SECOND first, then the FIRST.
 */
export default function GridRecall({ onExit, gameId = 'grid-recall', bands, title = 'Grid Recall' }) {
  const progress = useGameProgress(gameId, { bands });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} title={title} />;
}

// The pause before the next pattern: long after a miss (2026-11-06), so the student sees which tiles were lit.
const WRONG_PAUSE_MS = 2000;
const GAP_MS = 450;

const objectiveFor = (config) => {
  if (config.twoStage) {
    return `Two patterns of ${config.lit} tiles light up, one after the other. Tap the SECOND pattern first, then the FIRST. Get ${config.target} of ${config.rounds} rounds right.`;
  }
  if (config.place) return `${config.lit} pictures pop up. When they hide, pick each one from the ${config.choices} below and put it back where it was! Get ${config.target} of ${config.rounds} right.`;
  if (config.young) return `${config.lit} pictures pop up. When they hide, tap where they were! Get ${config.target} of ${config.rounds} right.`;
  return `${config.lit} tiles light up for a moment. Tap exactly those tiles once they go dark. Get ${config.target} of ${config.rounds} rounds right.`;
};

/*
 * A round's stages: 'show1' (the first pattern), 'gap', 'show2' (the second, two-stage only), then 'recall' — in a
 * two-stage round the second pattern is recalled first (`part` 0 = second, 1 = first).
 */
function Round({ progress, onExit, title }) {
  const [config] = useState(() => gridConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo }));
  const cells = config.size * config.size;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  // Every round's patterns, drawn once up front, so a round is a lookup.
  const [sets] = useState(() => gridRounds(config));
  const [stage, setStage] = useState('show1');
  const [part, setPart] = useState(0);
  const [picked, setPicked] = useState([]);
  const [verdict, setVerdict] = useState(null); // 'right' | 'wrong' | 'half' while shown
  const [hits, setHits] = useState(0);
  // Place mode (2026-11-18): the picture in hand, the ones put back right ({ cell: picture }), and a wrong drop.
  const [holding, setHolding] = useState(null);
  const [placed, setPlaced] = useState({});
  const [wrongCell, setWrongCell] = useState(null);

  const over = started && round >= config.rounds;
  const current = sets[Math.min(round, config.rounds - 1)];
  // What is being recalled now: in a two-stage round the second pattern, then the first.
  const target = config.twoStage && part === 0 ? current.second : current.first;
  const passed = hits >= config.target;
  // Five rounds whatever the level, so graded on the rounds.
  const stars = over ? starsForFixed(hits, config.target, config.rounds) : 0;
  useRecordStars(progress, over, stars, { correct: hits, wrong: Math.max(0, round - hits), score: hits });

  // Each round shows its pattern(s) for a moment, then hides them.
  useEffect(() => {
    if (!started || over) return undefined;
    let t;
    if (stage === 'show1') t = setTimeout(() => setStage(config.twoStage ? 'gap' : 'recall'), config.showMs);
    else if (stage === 'gap') t = setTimeout(() => setStage('show2'), GAP_MS);
    else if (stage === 'show2') t = setTimeout(() => setStage('recall'), config.showMs);
    return () => clearTimeout(t);
  }, [started, round, over, stage, config.showMs, config.twoStage]);

  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);

  const nextRound = () => {
    setRound((r) => r + 1);
    setPicked([]);
    setVerdict(null);
    setHolding(null);
    setPlaced({});
    setWrongCell(null);
    setPart(0);
    setStage('show1');
  };

  // Put the picture in hand on cell i: right if that picture was there, else the round is lost.
  const place = (i) => {
    if (!holding || placed[i]) return;
    if (current.pictures[i] !== holding) {
      setWrongCell(i);
      setHolding(null);
      setVerdict('wrong');
      sfx.wrong();
      pending.current = setTimeout(nextRound, WRONG_PAUSE_MS + 500);
      return;
    }
    const next = { ...placed, [i]: holding };
    setPlaced(next);
    setHolding(null);
    if (Object.keys(next).length === current.first.length) {
      setVerdict('right');
      sfx.right();
      setHits((h) => h + 1);
      pending.current = setTimeout(nextRound, 900);
    }
  };

  const tap = (i) => {
    if (stage !== 'recall' || verdict) return;
    if (config.place) { place(i); return; }
    if (picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (!target.includes(i)) {
      setVerdict('wrong');
      sfx.wrong();
      pending.current = setTimeout(nextRound, WRONG_PAUSE_MS);
      return;
    }
    if (next.length === target.length) {
      if (config.twoStage && part === 0) {
        // The second pattern is done: a short tick, then the first.
        setVerdict('half');
        pending.current = setTimeout(() => {
          setPart(1);
          setPicked([]);
          setVerdict(null);
        }, 600);
        return;
      }
      setVerdict('right');
      setHits((h) => h + 1);
      pending.current = setTimeout(nextRound, 700);
    }
  };

  const showing = stage !== 'recall';
  const prompt = showing
    ? stage === 'show2' ? 'Watch the SECOND pattern…' : stage === 'gap' ? 'Get ready…' : config.twoStage ? 'Watch the FIRST pattern…' : config.young ? 'Look!' : 'Watch…'
    : config.twoStage
      ? part === 0 ? 'Tap the SECOND pattern (amber)' : 'Now tap the FIRST pattern (violet)'
      : config.place ? (holding ? `Now tap where ${holding} was` : 'Pick a picture below') : config.young ? 'Tap where they were' : 'Tap the tiles that were lit';

  const tileClass = (i) => {
    const isPicked = picked.includes(i);
    if (stage === 'show1') {
      if (!current.first.includes(i)) return 'bg-surface-100';
      return config.pictures ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/40';
    }
    if (stage === 'show2') {
      return current.second.includes(i) ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/40' : 'bg-surface-100';
    }
    if (stage === 'gap') return 'bg-surface-100';
    if (config.place) {
      if (wrongCell === i) return 'bg-rose-100 ring-2 ring-rose-400';
      if (placed[i]) return 'bg-emerald-50 ring-2 ring-emerald-400';
      if (verdict === 'wrong' && current.first.includes(i)) return 'bg-amber-50 ring-2 ring-amber-300';
      return holding ? 'bg-surface-100 hover:bg-violet-100 ring-2 ring-violet-200' : 'bg-surface-100';
    }
    if (verdict === 'wrong' && isPicked && !target.includes(i)) return 'bg-rose-400';
    if (isPicked) return 'bg-emerald-400';
    if (verdict === 'wrong' && target.includes(i)) return config.twoStage && part === 0 ? 'bg-amber-200' : 'bg-violet-200';
    return 'bg-surface-100 hover:bg-violet-50';
  };

  // A picture shows on its cell while on show, and again where it was rightly tapped (or missed, after a slip).
  const pictureAt = (i) => {
    if (!config.pictures || !current.pictures[i]) return null;
    if (stage === 'show1' || picked.includes(i) || verdict === 'wrong') return current.pictures[i];
    if (config.place && placed[i]) return placed[i];
    return null;
  };

  return (
    <GameShell
      title={title}
      blurb={config.twoStage ? `Two patterns on a ${config.size}×${config.size} grid — second first.` : `Remember ${config.lit} ${config.young ? 'pictures' : 'tiles'} on a ${config.size}×${config.size} grid.`}
      tone="bg-gradient-to-br from-violet-500 to-purple-700"
      score={hits}
      scoreLabel="Rounds"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: objectiveFor(config),
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
              headline: passed ? `Level ${progress.level} cleared!` : config.young ? 'Good try — play again!' : 'So close',
              detail: `${hits} of ${config.rounds} rounds right`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          Round {Math.min(round + 1, config.rounds)} of {config.rounds} · <span className="font-bold">{prompt}</span>
        </p>
      }
    >
      {started && !over && (
        <div
          className="mx-auto grid w-full gap-2 sm:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`, maxWidth: config.young ? config.size * 96 : `min(100%, ${config.size * 88}px)` }}
        >
          {[...Array(cells).keys()].map((i) => {
            const pic = pictureAt(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-label={`Tile ${i + 1}${pic && showing ? `: ${pic}` : ''}`}
                className={`flex aspect-square min-h-11 items-center justify-center rounded-xl ring-1 ring-line-200 transition-all ring-inset ${tileClass(i)}`}
              >
                {pic && <span aria-hidden className="gs-pop text-4xl select-none sm:text-5xl">{pic}</span>}
              </button>
            );
          })}
        </div>
      )}
      {/* Place mode: the 4 choices under the grid — pick one, then tap its square. */}
      {started && !over && config.place && stage === 'recall' && (
        <div className="mx-auto mt-4 max-w-sm">
          <p className="mb-2 text-center text-sm font-black text-ink-900">{holding ? `Where was ${holding}? Tap its square.` : 'Pick a picture, then tap where it was'}</p>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Pictures to place">
            {current.choices.map((pic) => {
              const used = Object.values(placed).includes(pic);
              const inHand = holding === pic;
              return (
                <button
                  key={pic}
                  type="button"
                  disabled={used || !!verdict}
                  onClick={() => setHolding(inHand ? null : pic)}
                  aria-pressed={inHand}
                  aria-label={`Picture ${pic}${used ? ', placed' : ''}`}
                  className={`flex aspect-square min-h-14 items-center justify-center rounded-2xl text-4xl transition-all select-none ${
                    used ? 'bg-surface-100 opacity-30' : inHand ? 'scale-105 bg-violet-100 shadow-md ring-3 ring-violet-500' : 'bg-white shadow-sm ring-2 ring-line-200 hover:ring-violet-300'
                  }`}
                >
                  {pic}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {started && !over && verdict === 'wrong' && (
        <p className="mt-4 text-center text-sm font-bold text-rose-600" role="alert">
          {config.place ? 'Oops! That picture was not there. Here is where they were.' : config.young ? 'Oops! Here is where they were.' : 'Oops, wrong tile — the tiles you needed are shown faintly.'}
        </p>
      )}
      {started && !over && verdict === 'right' && config.young && (
        <p className="mt-4 text-center text-sm font-bold text-emerald-600" role="status">Well done!</p>
      )}
    </GameShell>
  );
}
