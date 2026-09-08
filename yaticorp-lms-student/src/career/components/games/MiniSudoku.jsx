import { useMemo, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A 4×4 sudoku: every row, column and 2×2 box holds 1 to 4 once. Built by
 * relabelling the digits of one valid grid and shuffling rows and columns
 * within their bands, which keeps it valid, then hiding cells.
 */
const BASE = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

const makePuzzle = (hidden) => {
  const digits = shuffle([1, 2, 3, 4]);
  const rowOrder = [...shuffle([0, 1]), ...shuffle([2, 3])];
  const colOrder = [...shuffle([0, 1]), ...shuffle([2, 3])];
  const solution = rowOrder.map((r) => colOrder.map((c) => digits[BASE[r][c] - 1]));
  const blanks = new Set(shuffle([...Array(16).keys()]).slice(0, hidden));
  const given = solution.map((row, r) => row.map((v, c) => (blanks.has(r * 4 + c) ? null : v)));
  return { solution, given };
};

const configFor = (difficulty, levelNo) => ({
  hidden: between(5, 8, levelNo) + (difficulty - 1) * 2,
  puzzles: between(2, 4, levelNo),
  seconds: between(120, 80, levelNo) + (difficulty - 1) * 20
});

/** 🧩 Logic: a four-by-four sudoku, solved against the clock. */
export default function MiniSudoku({ onExit }) {
  const progress = useGameProgress('mini-sudoku');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const hidden = Math.min(config.hidden, 12);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(hidden));
  const [grid, setGrid] = useState(() => puzzle.given.map((row) => [...row]));
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(0);
  const [started, setStarted] = useState(false);
  const { seconds, over: timedOut } = useTimedRound(config.seconds, started);

  const complete = solved >= config.puzzles;
  const over = started && (timedOut || complete);
  const passed = complete;
  // Stars by time left, so a fast solve is worth more than a scrape.
  const stars = over ? (passed ? starsFor(seconds + 1, Math.max(1, Math.round(config.seconds * 0.15))) : 0) : 0;
  useRecordStars(progress, over, stars);

  const conflicts = useMemo(() => {
    const bad = new Set();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = grid[r][c];
        if (!v) continue;
        for (let k = 0; k < 4; k++) {
          if (k !== c && grid[r][k] === v) bad.add(r * 4 + c);
          if (k !== r && grid[k][c] === v) bad.add(r * 4 + c);
        }
        const br = Math.floor(r / 2) * 2;
        const bc = Math.floor(c / 2) * 2;
        for (let i = br; i < br + 2; i++) {
          for (let j = bc; j < bc + 2; j++) {
            if ((i !== r || j !== c) && grid[i][j] === v) bad.add(r * 4 + c);
          }
        }
      }
    }
    return bad;
  }, [grid]);

  const place = (digit) => {
    if (over || selected === null) return;
    const [r, c] = selected;
    if (puzzle.given[r][c]) return;
    const next = grid.map((row) => [...row]);
    next[r][c] = digit;
    setGrid(next);
    const done = next.every((row, i) => row.every((v, j) => v === puzzle.solution[i][j]));
    if (done) {
      const count = solved + 1;
      setSolved(count);
      if (count < config.puzzles) {
        const fresh = makePuzzle(hidden);
        setPuzzle(fresh);
        setGrid(fresh.given.map((row) => [...row]));
        setSelected(null);
      }
    }
  };

  return (
    <GameShell
      title="Mini Sudoku"
      blurb={`Solve ${config.puzzles} grids before the clock runs out.`}
      tone="bg-gradient-to-br from-blue-500 to-indigo-700"
      score={`${solved}/${config.puzzles}`}
      scoreLabel="Solved"
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Every row, column and 2×2 box must hold 1, 2, 3 and 4 once each. Tap a blank cell, then a digit. Solve ${config.puzzles} grids in time.`,
              seconds: config.seconds,
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
              headline: passed ? `Level ${progress.level} cleared!` : 'Out of time',
              detail: passed ? `All ${config.puzzles} solved with ${seconds}s to spare` : `${solved} of ${config.puzzles} solved`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">A red cell clashes with its row, column or box</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-[280px]">
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-line-200 p-1.5">
            {grid.map((row, r) =>
              row.map((v, c) => {
                const given = !!puzzle.given[r][c];
                const isSel = selected && selected[0] === r && selected[1] === c;
                const clash = conflicts.has(r * 4 + c);
                const thickR = r === 1 ? 'mb-1' : '';
                const thickC = c === 1 ? 'mr-1' : '';
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => !given && setSelected([r, c])}
                    aria-label={`Row ${r + 1} column ${c + 1}${v ? `, ${v}` : ', empty'}`}
                    className={`flex aspect-square items-center justify-center rounded-xl text-2xl font-black transition-all ${thickR} ${thickC} ${
                      given
                        ? 'bg-surface-100 text-ink-500'
                        : clash
                          ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300'
                          : isSel
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40'
                            : 'bg-surface text-ink-900 hover:bg-blue-50'
                    }`}
                  >
                    {v || ''}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => place(d)}
                className="fp-press min-h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black text-white shadow-md shadow-blue-500/30"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => place(null)}
              aria-label="Clear cell"
              className="fp-press min-h-12 rounded-xl bg-surface text-sm font-black text-ink-500 ring-1 ring-line-200 ring-inset hover:bg-rose-50 hover:text-rose-600"
            >
              ⌫
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
