import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import ENumPad from './ENumPad';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkMatrixQuery, makeMatrixLevel, matrixConfig } from '../../data/bands/eMasterMemory';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NUMERIC = ['cell', 'rowsum', 'colsum', 'count'];

/** Matrix Recall: study a matrix of digits, then rebuild it from memory — cells, positions and line totals. */
export default function MatrixRecall({ onExit }) {
  const progress = useGameProgress('matrix-recall', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = matrixConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [mats] = useState(() => makeMatrixLevel(seeded(freshSeed()), cfg));
  const [mi, setMi] = useState(0);
  const [qi, setQi] = useState(0);
  const [showFrom, setShowFrom] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [input, setInput] = useState('');
  const [fill, setFill] = useState({});
  const [focusPick, setFocus] = useState(null);
  const [answered, setAnswered] = useState(null); // { ok, given }
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const showMs = cfg.showSeconds * 1000;
  const over = mi >= mats.length;
  const elapsed = useEClock(started && !paused && !over && !skipped, showFrom + showMs);
  const showing = started && !over && !skipped && elapsed < showFrom + showMs;
  const total = mats.length * cfg.queries;
  const pass = Math.ceil(total * 0.6);
  const stars = over ? starsForFixed(correct, pass, total) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  const m = over ? null : mats[mi];
  const q = m && !showing ? m.queries[qi] : null;
  const locked = !started || over || paused || showing || !!answered;
  const lastQuery = m && qi === m.queries.length - 1;
  /** The fill cell being typed into: the one tapped, else the first. */
  const focus = q?.kind === 'fill' ? (q.cells.includes(focusPick) ? focusPick : q.cells[0]) : null;

  const submit = (given) => {
    if (locked) return;
    const ok = checkMatrixQuery(q, given);
    if (ok) { sfx.right?.(); setCorrect((n) => n + 1); } else { sfx.wrong(); setWrong((n) => n + 1); }
    setAnswered({ ok, given });
  };

  const next = () => {
    setAnswered(null);
    setInput('');
    setFill({});
    setFocus(null);
    if (!lastQuery) { setQi(qi + 1); return; }
    setMi(mi + 1);
    setQi(0);
    setSkipped(false);
    setShowFrom(elapsed);
  };

  const tapCell = (id) => {
    if (locked) return;
    if (q.kind === 'where') submit(id);
    else if (q.kind === 'fill' && q.cells.includes(id)) setFocus(id);
  };

  const fillEnter = () => {
    if (locked) return;
    const empty = q.cells.filter((id) => !fill[id]);
    if (!empty.length) submit(fill);
    else setFocus(empty.find((id) => q.cells.indexOf(id) > q.cells.indexOf(focus)) || empty[0]);
  };

  const objective = `${mats.length} matrices of ${cfg.size}×${cfg.size} digits, each shown for ${cfg.showSeconds} seconds. Then the matrix goes blank and you answer ${cfg.queries} questions about it: the digit in a cell, where a digit was, a row or column total${cfg.kinds.includes('fill') ? ', or several cells to fill in' : ''}. Get ${pass} of ${total} right to clear.`;
  const showLeft = Math.max(0, showFrom + showMs - elapsed);

  return (
    <GameShell
      variant="premium"
      title="Matrix Recall"
      blurb="Hold the whole matrix — values and places."
      tone="bg-gradient-to-br from-violet-600 to-indigo-900"
      score={`${correct}/${total}`}
      scoreLabel="Recalled"
      seconds={showing ? Math.ceil(showLeft / 1000) : undefined}
      totalSeconds={showing ? cfg.showSeconds : undefined}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={showing ? () => setPaused((v) => !v) : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.showSeconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= pass,
        stars,
        headline: correct >= pass ? `Level ${progress.level} cleared` : 'Not this time',
        detail: `${correct} of ${total} recalled correctly`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-slate-500">Matrix {Math.min(mi + 1, mats.length)} of {mats.length}{q ? ` · question ${qi + 1} of ${m.queries.length}` : ''}</p>}
    >
      {started && m && (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          {showing ? (
            <>
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Study time left" aria-valuemin={0} aria-valuemax={cfg.showSeconds} aria-valuenow={Math.ceil(showLeft / 1000)}>
                <div className="h-full rounded-full bg-violet-500 transition-[width] duration-100 ease-linear" style={{ width: `${(showLeft / showMs) * 100}%` }} />
              </div>
              <p className="text-sm font-bold tracking-wide text-slate-600">Memorise the matrix</p>
            </>
          ) : (
            <p className="min-h-6 text-center text-base font-extrabold text-[#1b2456]">{q?.prompt}</p>
          )}

          <Grid m={m} q={q} showing={showing} answered={answered} fill={fill} focus={focus} reveal={!!answered && lastQuery} onTap={tapCell} />

          {showing ? (
            <button type="button" onClick={() => setSkipped(true)} className="fp-press min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-violet-700 ring-1 ring-violet-200 ring-inset">I have it — ask me</button>
          ) : answered ? (
            <div className="flex flex-col items-center gap-2">
              <p className={`text-center text-sm font-extrabold ${answered.ok ? 'text-emerald-600' : 'text-rose-600'}`} role="status" aria-live="polite">
                {answered.ok ? 'Correct.' : q.kind === 'where' ? 'Not there — the right cell is outlined.' : q.kind === 'fill' ? 'Not all right — the true digits are shown.' : `The answer was ${q.answer}.`}
              </p>
              <button type="button" onClick={next} className="fp-press min-h-11 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white" autoFocus>
                {!lastQuery ? 'Next question' : mi + 1 < mats.length ? 'Next matrix' : 'See result'}
              </button>
            </div>
          ) : q && NUMERIC.includes(q.kind) ? (
            <>
              <span className="flex h-12 min-w-24 items-center justify-center rounded-xl bg-white px-4 text-2xl font-extrabold text-[#1b2456] tabular-nums ring-1 ring-[#e4e1f5] ring-inset" aria-live="polite">{input || '…'}</span>
              <ENumPad premium value={input} onChange={setInput} onEnter={() => submit(input)} active={!locked} disabled={locked} maxLen={q.kind === 'cell' ? 1 : 2} enterLabel="Answer" />
            </>
          ) : q && q.kind === 'fill' ? (
            <>
              <ENumPad premium value={fill[focus] || ''} onChange={(v) => !locked && focus && setFill((f) => ({ ...f, [focus]: v.slice(-1) }))} onEnter={fillEnter} active={!locked} disabled={locked} maxLen={2} enterLabel="Next" />
              <button type="button" onClick={() => submit(fill)} disabled={locked || q.cells.some((id) => !fill[id])} className="fp-press min-h-11 w-full max-w-xs rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-40">Check cells</button>
            </>
          ) : (
            <p className="text-sm text-slate-500">Tap the cell on the grid.</p>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** The matrix: digits while studying; blank afterwards, with the question's cells or line picked out. */
function Grid({ m, q, showing, answered, fill, focus, reveal, onTap }) {
  const n = m.grid.length;
  const inLine = (r, c) => q?.line && (q.line.row === r || q.line.col === c);
  return (
    <div className="grid w-full max-w-xs gap-1.5 rounded-2xl bg-white p-2 shadow-[0_6px_24px_-12px_rgba(27,36,86,0.35)] ring-1 ring-[#e4e1f5]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} role="grid" aria-label={showing ? 'Matrix to memorise' : 'Blank matrix'}>
      {m.grid.map((row, r) => row.map((v, c) => {
        const id = `${r}-${c}`;
        const asked = q && (q.cells?.includes(id) || inLine(r, c));
        const isAnswerCell = q?.kind === 'where' && answered && q.answer === id;
        const tappedWrong = q?.kind === 'where' && answered && !answered.ok && answered.given === id;
        let text = '';
        if (showing || reveal) text = v;
        else if (q?.kind === 'fill' && q.cells.includes(id)) text = answered && !answered.ok ? v : fill[id] || '';
        else if (answered && (asked || isAnswerCell)) text = v;
        const tone = isAnswerCell ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
          : tappedWrong ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
            : q?.kind === 'fill' && q.cells.includes(id) ? (focus === id && !answered ? 'bg-violet-100 text-violet-800 ring-2 ring-violet-500' : 'bg-violet-50 text-violet-800 ring-2 ring-violet-300')
              : asked ? 'bg-amber-50 text-amber-800 ring-2 ring-amber-300'
                : showing ? 'bg-slate-50 text-[#1b2456]' : 'bg-slate-100 text-slate-500';
        return (
          <button
            key={id}
            type="button"
            role="gridcell"
            onClick={() => onTap(id)}
            disabled={showing || !q || !!answered || !(q.kind === 'where' || (q.kind === 'fill' && q.cells.includes(id)))}
            aria-label={`Row ${r + 1}, column ${c + 1}${text !== '' ? `: ${text}` : ''}`}
            className={`flex aspect-square items-center justify-center rounded-lg text-lg font-extrabold tabular-nums transition sm:text-xl ${tone} ${q?.kind === 'where' && !answered ? 'hover:bg-violet-100' : ''}`}
          >
            {text}
          </button>
        );
      }))}
    </div>
  );
}
