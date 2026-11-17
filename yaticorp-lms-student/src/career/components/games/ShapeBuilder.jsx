import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { SHAPE_PIECES, fitPiece, makeShapeLevel, pieceCells, shapeConfig } from '../../data/bands/youngA';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1500;

/** Each cell kind as a polygon in a 1×1 square: F full, or a half-square triangle keeping that corner. */
const POLY = { F: '0,0 1,0 1,1 0,1', tl: '0,0 1,0 0,1', tr: '0,0 1,0 1,1', br: '1,0 1,1 0,1', bl: '0,0 1,1 0,1' };
const COLOURS = ['#f97316', '#3b82f6', '#22c55e', '#ec4899', '#a855f7', '#eab308'];

/** 🧩 Logic: fill the grey shape exactly with the coloured pieces. */
export default function ShapeBuilder({ onExit }) {
  const progress = useGameProgress('shape-builder', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function PieceArt({ cells, colour, size = 22 }) {
  const rows = Math.max(...cells.map((x) => x.r)) + 1;
  const cols = Math.max(...cells.map((x) => x.c)) + 1;
  return (
    <svg width={cols * size} height={rows * size} viewBox={`0 0 ${cols} ${rows}`} aria-hidden="true">
      {cells.map((x) => (
        <polygon key={`${x.r},${x.c}`} points={POLY[x.t]} transform={`translate(${x.c} ${x.r})`} fill={colour} stroke="#fff" strokeWidth="0.06" />
      ))}
    </svg>
  );
}

function Round({ progress, onExit }) {
  const config = shapeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [puzzles] = useState(() => makeShapeLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [pIdx, setPIdx] = useState(0);
  const [placed, setPlaced] = useState([]); // [{ id, cells }]
  const [rots, setRots] = useState(() => Object.fromEntries(puzzles[0].tray.map((t) => [t.id, t.rot])));
  const [selected, setSelected] = useState(() => puzzles[0].tray[0].id);
  const [misfits, setMisfits] = useState(0);
  const [good, setGood] = useState(0);
  const [allMisfits, setAllMisfits] = useState(0);
  const [note, setNote] = useState(null);
  const [done, setDone] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = pIdx >= puzzles.length;
  const puzzle = over ? null : puzzles[pIdx];
  const stars = over ? starsForFixed(good, config.pass, puzzles.length) : 0;
  useRecordStars(progress, over, stars, { correct: good, wrong: allMisfits, hints: 0, score: good, limitMs: null });

  const colourOf = (id) => COLOURS[Number(id.slice(1)) % COLOURS.length];
  const filledAt = new Map();
  placed.forEach((p) => p.cells.forEach((x) => filledAt.set(`${x.r},${x.c}`, p.id)));
  const filled = new Set(filledAt.keys());
  const targetSize = puzzle ? Object.keys(puzzle.target).length : 0;
  const trayLeft = puzzle ? puzzle.tray.filter((t) => !placed.some((p) => p.id === t.id)) : [];

  const nextPuzzle = () => {
    const n = pIdx + 1;
    setPIdx(n);
    setPlaced([]);
    setSelected(n < puzzles.length ? puzzles[n].tray[0].id : null);
    setMisfits(0);
    setNote(null);
    setDone(false);
    if (n < puzzles.length) setRots(Object.fromEntries(puzzles[n].tray.map((t) => [t.id, t.rot])));
  };

  const rotate = () => {
    if (!config.rotate || !selected || done) return;
    setRots((r) => ({ ...r, [selected]: (r[selected] + 1) % 4 }));
  };

  const tapCell = (r, c) => {
    if (done) return;
    const k = `${r},${c}`;
    const owner = filledAt.get(k);
    if (owner) {
      // Lift a placed piece back into the tray.
      setPlaced((p) => p.filter((x) => x.id !== owner));
      setSelected(owner);
      setNote({ good: true, text: 'Piece picked up — tap where it should go.' });
      return;
    }
    if (!selected) { setNote({ good: false, text: 'First tap a piece below.' }); return; }
    const piece = puzzle.tray.find((t) => t.id === selected);
    const cells = pieceCells(piece.type, rots[selected]);
    const abs = fitPiece(puzzle.target, filled, cells, r, c);
    if (!abs) {
      sfx.wrong();
      setMisfits((m) => m + 1);
      setAllMisfits((m) => m + 1);
      setNote({ good: false, text: !puzzle.target[k] ? 'That is outside the shape.' : config.rotate ? 'It does not fit there. Try turning it ↻ or another spot.' : 'It does not fit there. Try another spot!' });
      return;
    }
    const nowPlaced = [...placed, { id: selected, cells: abs }];
    setPlaced(nowPlaced);
    const left = puzzle.tray.filter((t) => !nowPlaced.some((p) => p.id === t.id));
    setSelected(left[0]?.id || null);
    const filledNow = nowPlaced.reduce((s, p) => s + p.cells.length, 0);
    if (filledNow === targetSize) {
      sfx.right?.();
      const clean = misfits <= config.slack;
      if (clean) setGood((g) => g + 1);
      setDone(true);
      setNote({ good: true, text: clean ? (young ? 'You built it! 🎉' : 'Built — great fitting!') : 'Built it! Next time try fewer wrong spots.' });
      timers.current.push(setTimeout(nextPuzzle, NEXT_MS));
    } else {
      setNote({ good: true, text: young ? 'It fits! 👍' : 'Fits!' });
    }
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => { if (e.key === 'r' || e.key === 'R') rotate(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = young
    ? `Fill the grey shape with the coloured pieces. Tap a piece, then tap where it goes. Build ${config.pass} of ${puzzles.length} shapes without many wrong spots.`
    : `Fill every grey cell exactly with the pieces — squares, rectangles and triangles. Tap a piece, turn it with ↻ (or R) until it matches, then tap where it goes. Tap a placed piece to pick it up. Build ${config.pass} of ${puzzles.length} with at most ${config.slack} wrong try each.`;

  return (
    <GameShell
      title="Shape Builder"
      blurb={young ? 'Fill the shape with pieces!' : 'Turn and fit pieces to fill the silhouette.'}
      tone="bg-gradient-to-br from-orange-400 to-rose-600"
      score={`${good}/${puzzles.length}`}
      scoreLabel="Built"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: good >= config.pass,
        stars,
        headline: good >= config.pass ? `Level ${progress.level} cleared!` : 'Nice building — try again!',
        detail: `${good} of ${puzzles.length} shapes built neatly`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Shape {Math.min(pIdx + 1, puzzles.length)} of {puzzles.length}{config.rotate ? ' · R turns the piece' : ''}</p>}
    >
      {started && puzzle && (
        <div className="mx-auto w-full max-w-sm">
          <div
            className="mx-auto grid gap-0 overflow-hidden rounded-2xl bg-white p-1.5 shadow-inner ring-1 ring-ink-900/10"
            style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`, maxWidth: `${config.cols * 4.75}rem` }}
          >
            {Array.from({ length: config.rows * config.cols }, (_, i) => {
              const r = Math.floor(i / config.cols);
              const c = i % config.cols;
              const k = `${r},${c}`;
              const t = puzzle.target[k];
              const owner = filledAt.get(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => tapCell(r, c)}
                  aria-label={`Row ${r + 1}, column ${c + 1}${t ? (owner ? ', filled' : ', part of the shape') : ''}`}
                  className="relative aspect-square min-h-14 border border-dashed border-ink-900/10 focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-orange-500"
                >
                  <svg viewBox="0 0 1 1" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    {t && <polygon points={POLY[t]} fill="#cbd5e1" />}
                    {owner && <polygon points={POLY[t]} fill={colourOf(owner)} stroke="#fff" strokeWidth="0.04" className={done ? 'gs-right' : ''} />}
                  </svg>
                </button>
              );
            })}
          </div>

          <p className={`mt-3 mb-2 min-h-6 text-center text-base font-black ${note ? (note.good ? 'text-emerald-600' : 'text-rose-600') : 'text-ink-900'}`} role="status" aria-live="polite">
            {note ? note.text : young ? 'Tap a piece, then tap the grey shape.' : 'Pick a piece and fit it in.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5" aria-label="Pieces">
            {trayLeft.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                aria-pressed={selected === t.id}
                aria-label={`${SHAPE_PIECES[t.type].name}${selected === t.id ? ', chosen' : ''}`}
                className={`fp-press flex min-h-16 min-w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-inset transition-all ${selected === t.id ? 'scale-105 ring-4 ring-orange-400' : 'ring-2 ring-ink-900/10'}`}
              >
                <PieceArt cells={pieceCells(t.type, rots[t.id])} colour={colourOf(t.id)} />
              </button>
            ))}
            {config.rotate && trayLeft.length > 0 && (
              <button
                type="button"
                onClick={rotate}
                disabled={!selected}
                aria-label="Turn the chosen piece"
                className="fp-press min-h-16 min-w-16 rounded-2xl bg-orange-500 px-3 text-2xl font-black text-white shadow-md disabled:opacity-40"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
