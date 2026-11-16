import { useEffect, useMemo, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SHAPES, boxOf, clashes, isSolvedGrid, makeSudoku, peersOf, sudokuConfig } from '../../data/bands/sudoku';

const FRUITS = ['🍎', '🍌', '🍇', '🍓'];

/**
 * 🧩 Logic: sudoku sized to the age band (data/bands/sudoku.js) — 4×4 fruit for Classes 1–2, 4×4 numbers for 3–5,
 * 6×6 for 6–8, harder 6×6 then easy 9×9 for 9–10, and 9×9 for 11–12. Every puzzle has
 * exactly one solution; a full grid is still judged by the rules.
 */
export default function MiniSudoku({ onExit, gameId = 'mini-sudoku', bands, title = 'Mini Sudoku' }) {
  const progress = useGameProgress(gameId, { bands });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} title={title} />;
}

function Round({ progress, onExit, title }) {
  const band = progress.ageBand || 'analytical';
  const config = useMemo(() => sudokuConfig(band, progress.difficulty, progress.levelNo), [band, progress.difficulty, progress.levelNo]);
  const { size } = config;
  const [br, bc] = SHAPES[size];
  const limit = Math.round(20 + config.blanks * config.perBlank * config.puzzles);
  const [puzzle, setPuzzle] = useState(() => makeSudoku(size, config.blanks));
  const [grid, setGrid] = useState(() => [...puzzle.given]);
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [tip, setTip] = useState(null);
  const [started, setStarted] = useState(false);
  const complete = solved >= config.puzzles;
  const { seconds, over: timedOut } = useTimedRound(limit, started, complete);

  const over = started && (timedOut || complete);
  const passed = complete;
  const stars = over ? (passed ? Math.max(1, starsFor(seconds + 1, Math.max(1, Math.round(limit * 0.15)))) : 0) : 0;
  useRecordStars(progress, over, stars, { correct: solved, wrong: mistakes, score: solved, limitMs: limit * 1000 });

  const bad = useMemo(() => clashes(grid, size), [grid, size]);
  const peers = peersOf(size);
  const label = (v) => (config.symbols ? FRUITS[v - 1] : String(v));

  const place = (value) => {
    if (over || selected === null || puzzle.given[selected]) return;
    const next = [...grid];
    next[selected] = value;
    setGrid(next);
    setTip(null);
    if (value) {
      const r = Math.floor(selected / size);
      const c = selected % size;
      const same = peers[selected].filter((p) => next[p] === value);
      if (same.length) {
        sfx.wrong();
        setMistakes((m) => m + 1);
        const p = same[0];
        const where = Math.floor(p / size) === r ? 'row' : p % size === c ? 'column' : 'box';
        setTip(`${label(value)} is already in this ${where}.`);
      }
    }
    if (isSolvedGrid(next, size)) {
      const count = solved + 1;
      setSolved(count);
      if (count < config.puzzles) {
        const fresh = makeSudoku(size, config.blanks);
        setPuzzle(fresh);
        setGrid([...fresh.given]);
        setSelected(null);
        setTip('Solved! Here is the next one.');
      }
    }
  };

  // Keyboard: arrows move, digits place, Backspace/Delete/0 clear.
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const moves = { ArrowUp: -size, ArrowDown: size, ArrowLeft: -1, ArrowRight: 1 };
      if (moves[e.key] !== undefined) {
        e.preventDefault();
        setSelected((s) => {
          const at = s === null ? 0 : s + moves[e.key];
          return at >= 0 && at < size * size ? at : s;
        });
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= size) place(n);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const values = Array.from({ length: size }, (_, i) => i + 1);
  const width = size === 4 ? 'max-w-[300px]' : size === 6 ? 'max-w-[330px]' : 'max-w-[360px]';
  const text = size === 4 ? 'text-3xl' : size === 6 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg';
  const ruleName = size === 4 ? '2×2 box' : size === 6 ? '2×3 box' : '3×3 box';
  const objective = config.symbols
    ? `Fill the grid with fruit. Each row, each column and each 2×2 box needs ${FRUITS.join(' ')} — one of each. Tap a square, then a fruit. Solve ${config.puzzles} grids.`
    : `Every row, column and ${ruleName} must hold 1 to ${size} once each. Tap a blank cell, then a number (or type it). Solve ${config.puzzles} grid${config.puzzles === 1 ? '' : 's'} in time. Each puzzle has one answer.`;

  return (
    <GameShell
      title={title}
      blurb={`Solve ${config.puzzles} ${size}×${size} grid${config.puzzles === 1 ? '' : 's'} before the clock runs out.`}
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
              objective,
              seconds: limit,
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
      footer={
        <p className={`text-center text-sm ${tip ? 'font-bold text-indigo-700' : 'text-ink-500'}`} role="status" aria-live="polite">
          {tip || 'A red cell clashes with its row, column or box'}
        </p>
      }
    >
      {started && !over && (
        <div className={`mx-auto w-full ${width}`}>
          <div
            className="grid overflow-hidden rounded-2xl border-2 border-ink-700 bg-line-200"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            role="grid"
            aria-label={`${size} by ${size} sudoku`}
          >
            {grid.map((v, i) => {
              const r = Math.floor(i / size);
              const c = i % size;
              const given = !!puzzle.given[i];
              const isSel = selected === i;
              const clash = bad.has(i) && !given;
              const sameBoxTint = size === 9 && boxOf(size, i) % 2 === 1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Row ${r + 1} column ${c + 1}${v ? `, ${config.symbols ? ['apple', 'banana', 'grapes', 'strawberry'][v - 1] : v}` : ', empty'}${given ? ', given' : ''}`}
                  aria-selected={isSel}
                  className={`flex aspect-square items-center justify-center font-black transition-colors ${text} ${
                    isSel
                      ? 'bg-blue-600 text-white'
                      : clash
                        ? 'bg-rose-100 text-rose-700'
                        : given
                          ? `${sameBoxTint ? 'bg-surface-200' : 'bg-surface-100'} text-ink-700`
                          : `${sameBoxTint ? 'bg-surface-100' : 'bg-surface'} text-blue-700 hover:bg-blue-50`
                  }`}
                  style={{
                    borderRight: c < size - 1 ? `${(c + 1) % bc === 0 ? 2 : 1}px solid ${(c + 1) % bc === 0 ? 'var(--color-ink-700, #334155)' : 'var(--color-line-200, #e2e8f0)'}` : undefined,
                    borderBottom: r < size - 1 ? `${(r + 1) % br === 0 ? 2 : 1}px solid ${(r + 1) % br === 0 ? 'var(--color-ink-700, #334155)' : 'var(--color-line-200, #e2e8f0)'}` : undefined
                  }}
                >
                  {v ? label(v) : ''}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(size + 1, 5)}, minmax(0, 1fr))` }}>
            {values.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => place(d)}
                aria-label={config.symbols ? `Place ${['apple', 'banana', 'grapes', 'strawberry'][d - 1]}` : `Place ${d}`}
                className={`fp-press min-h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black text-white shadow-md shadow-blue-500/30 ${config.symbols ? 'text-3xl' : ''}`}
              >
                {label(d)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => place(0)}
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
