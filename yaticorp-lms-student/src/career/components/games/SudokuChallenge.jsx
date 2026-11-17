import MiniSudoku from './MiniSudoku';

/**
 * Sudoku Challenge (2026-11-14, the 84 games): Rising Brains' full 9×9 sudoku, every puzzle with one solution — Mini
 * Sudoku keeps the compact 6×6 grids. Its own card, levels and records.
 */
export default function SudokuChallenge({ onExit }) {
  return <MiniSudoku onExit={onExit} gameId="sudoku-challenge" bands={['advanced']} title="Sudoku Challenge" />;
}
