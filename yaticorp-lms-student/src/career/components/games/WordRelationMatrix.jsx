import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { fitsCell, makeMatrixLevel, matrixConfig } from '../../data/bands/gMatrix';
import { Chip, Eyebrow, Panel, Status, btnPrimary } from './GVerbalKit';
import { dropProps, freshSeed } from './gDrag';

const key = (r, c) => `${r}-${c}`;

/** Word Relation Matrix: fill the blanks so that every row follows the relation and every column its category. */
export default function WordRelationMatrix({ onExit }) {
  const progress = useGameProgress('word-relation-matrix', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = matrixConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [grids] = useState(() => makeMatrixLevel(seeded(freshSeed()), config));
  const max = grids.reduce((n, g) => n + g.blanks.length * 2, 0);
  const pass = Math.ceil(max * 0.65);
  const [index, setIndex] = useState(0);
  const [fills, setFills] = useState({});
  const [locked, setLocked] = useState({}); // cell → 'first' | 'second'
  const [flash, setFlash] = useState({}); // cells just rejected
  const [checks, setChecks] = useState(0);
  const [done, setDone] = useState(false);
  const [held, setHeld] = useState(null);
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  const over = index >= grids.length;
  const grid = over ? null : grids[index];
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points });

  const isBlank = (r, c) => grid.blanks.some(([br, bc]) => br === r && bc === c);
  const placed = new Set(Object.values(fills));

  const put = (word, r, c) => {
    const k = key(r, c);
    if (done || !word || locked[k]) return;
    const next = { ...fills };
    const from = Object.keys(next).find((kk) => next[kk] === word);
    if (from) {
      if (locked[from]) return;
      if (next[k]) next[from] = next[k]; else delete next[from];
    }
    next[k] = word;
    setFills(next);
    setHeld(null);
    setFlash({});
  };

  const tapCell = (r, c) => {
    const k = key(r, c);
    if (done || locked[k]) return;
    if (held) { put(held, r, c); return; }
    if (fills[k]) setHeld(fills[k]);
  };

  const unplace = (word) => {
    const from = Object.keys(fills).find((kk) => fills[kk] === word);
    if (!from || locked[from]) return;
    const next = { ...fills };
    delete next[from];
    setFills(next);
    setHeld(null);
  };

  const check = () => {
    const round = checks + 1;
    const nextLocked = { ...locked };
    const rejected = {};
    const nextFills = { ...fills };
    let gained = 0;
    let wrong = 0;
    for (const [r, c] of grid.blanks) {
      const k = key(r, c);
      if (locked[k]) continue;
      if (fills[k] && fitsCell(grid, r, c, fills[k])) {
        nextLocked[k] = round === 1 ? 'first' : 'second';
        gained += round === 1 ? 2 : 1;
      } else {
        wrong += 1;
        rejected[k] = true;
        if (round === 1) delete nextFills[k];
      }
    }
    const finished = wrong === 0 || round >= 2;
    if (wrong === 0) sfx.right(); else sfx.wrong();
    setLocked(nextLocked);
    setFlash(rejected);
    setFills(nextFills);
    setChecks(round);
    setPoints(points + gained);
    setHeld(null);
    if (finished) {
      const right = grid.blanks.filter(([r, c]) => nextLocked[key(r, c)]).length;
      setTally({ correct: tally.correct + right, wrong: tally.wrong + grid.blanks.length - right });
      setDone(true);
    }
  };

  const next = () => {
    setIndex(index + 1);
    setFills({});
    setLocked({});
    setFlash({});
    setChecks(0);
    setDone(false);
    setHeld(null);
  };

  const tray = grid ? grid.pool.filter((w) => !placed.has(w)) : [];
  const full = grid && grid.blanks.every(([r, c]) => fills[key(r, c)]);
  const solvedAll = grid && grid.blanks.every(([r, c]) => locked[key(r, c)]);
  const status = !grid
    ? ''
    : done
      ? solvedAll ? (checks === 1 ? 'Every relation holds — solved on the first check.' : 'Every relation holds now.') : 'The missing words are shown in the red cells.'
      : checks === 1
        ? 'Green cells are locked in. The red ones went back to the pool — one more check (1 point each).'
        : held
          ? `Holding "${held}" — tap an empty cell.`
          : grid.decoys.length
            ? `Drag each word into its cell. ${grid.decoys.length} word${grid.decoys.length > 1 ? 's do' : ' does'} not belong anywhere.`
            : 'Drag each word into its cell (or tap a word, then a cell).';

  return (
    <GameShell
      title="Word Relation Matrix"
      blurb="Complete a grid where every row and column holds."
      tone="bg-gradient-to-br from-emerald-700 to-slate-900"
      variant="premium"
      score={`${points}/${max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Each row of the grid follows one relation (potter : wheel : vase) and each column is one category. Drag words from the pool into the blank cells so that every row and every column holds.${config.decoys ? ' Some pool words are decoys that fit no cell.' : ''} 2 points per cell right on the first check, 1 on the second. ${grids.length} grids; ${pass} of ${max} clears the level.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: points >= pass,
              stars,
              headline: points >= pass ? `Level ${progress.level} cleared` : 'Some relations broke',
              detail: `${points} of ${max} points across ${grids.length} grids`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-slate-500">Grid {Math.min(index + 1, grids.length)} of {grids.length}{grid ? ` · ${grid.theme.title}` : ''}</p>}
    >
      {started && grid && (
        <div className="mx-auto grid w-full max-w-3xl gap-3">
          <Panel label="Matrix">
            <Eyebrow>{grid.theme.title}</Eyebrow>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[18rem] border-separate border-spacing-1 text-sm [overflow-wrap:anywhere] sm:border-spacing-1.5 sm:text-base">
                <thead>
                  <tr>
                    {grid.theme.cols.map((c) => (
                      <th key={c} scope="col" className="rounded-lg bg-[#1b2456] px-1 py-2 text-xs font-bold tracking-normal text-white uppercase sm:px-2 sm:tracking-wider">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((word, c) => {
                        const k = key(r, c);
                        if (!isBlank(r, c)) {
                          return <td key={c} className="rounded-lg bg-[#f7f6fd] px-1 py-2.5 text-center sm:px-2 font-semibold text-[#1b2456] ring-1 ring-[#e4e1f5] ring-inset">{word}</td>;
                        }
                        const fill = fills[k];
                        const lock = locked[k];
                        const reveal = done && !lock;
                        const cls = lock
                          ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400 ring-inset'
                          : reveal
                            ? 'bg-rose-50 text-rose-700 ring-2 ring-rose-300 ring-inset'
                            : flash[k]
                              ? 'gs-wrong border-2 border-dashed border-rose-300 bg-rose-50/50 text-slate-400'
                              : fill
                                ? held === fill ? 'bg-indigo-600 text-white' : 'bg-white text-[#1b2456] ring-2 ring-indigo-300 ring-inset'
                                : held ? 'border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-400' : 'border-2 border-dashed border-[#d9d4f3] bg-white text-slate-300';
                        return (
                          <td key={c} className="p-0">
                            <div
                              {...dropProps((w) => put(w, r, c), () => tapCell(r, c))}
                              role="button"
                              tabIndex={done || lock ? -1 : 0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapCell(r, c); } }}
                              aria-label={`${grid.theme.cols[c]} for row ${r + 1}: ${fill || 'empty'}`}
                              className={`flex min-h-11 items-center justify-center rounded-lg px-1 py-2 text-center font-bold sm:px-2 transition ${cls}`}
                            >
                              {reveal ? word : fill || '?'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {!done && (
            <Panel label="Word pool">
              <Eyebrow>Word pool</Eyebrow>
              <div
                className="flex min-h-12 flex-wrap gap-2"
                {...dropProps((w) => unplace(w), (e) => { if (e.target === e.currentTarget && held) unplace(held); })}
              >
                {tray.map((w) => (
                  <Chip key={w} label={w} dragId={w} held={held === w} onPick={(id) => setHeld(held === id ? null : id)} />
                ))}
                {!tray.length && <span className="self-center text-sm text-slate-400">Pool empty.</span>}
              </div>
              <div className="mt-3 flex justify-center">
                <button type="button" className={btnPrimary} disabled={!full} onClick={check}>{checks === 0 ? 'Check grid' : 'Final check'}</button>
              </div>
            </Panel>
          )}

          <Status tone={done ? (solvedAll ? 'good' : 'bad') : checks ? 'bad' : 'idle'}>{status}</Status>
          {done && (
            <div className="flex justify-center">
              <button type="button" className={btnPrimary} onClick={next} autoFocus>
                {index + 1 >= grids.length ? 'See result' : 'Next grid'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
