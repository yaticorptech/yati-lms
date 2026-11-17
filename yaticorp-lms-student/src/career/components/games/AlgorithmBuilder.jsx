import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { seeded } from '../../data/seeded';
import {
  algorithmLevel, blockCount, depths, initialState, isOpener, labelOf, matchingEnd, parse, starsForBlocks, verify
} from '../../data/bands/algorithm';

/**
 * 🧩 Algorithm Builder (Master Minds, 2026-11-13): assemble instruction blocks — tap to add, drag to place, ▲▼ to
 * reorder — then run the program and watch it step by step. A robot collecting gems, a row of cards to sort, or a
 * tiny register machine. Stars for efficiency: 3 at the optimal block count, 2 within two blocks, 1 for any working
 * program. The interpreter is pure (data/bands/algorithm.js); every level's reference solution is tested there.
 */

const RUNS = 5;

export default function AlgorithmBuilder({ onExit }) {
  const progress = useGameProgress('algorithm-builder');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

/* ------------------------------------------------------------------ program edits (pure) */

const unitEnd = (tokens, i) => (isOpener(tokens[i]) ? matchingEnd(tokens, i) : i);
const valid = (tokens) => (parse(tokens).ok ? tokens : null);

const moveUp = (tokens, i) => {
  if (i <= 0) return null;
  const b = unitEnd(tokens, i);
  return valid([...tokens.slice(0, i - 1), ...tokens.slice(i, b + 1), tokens[i - 1], ...tokens.slice(b + 1)]);
};
const moveDown = (tokens, i) => {
  const b = unitEnd(tokens, i);
  if (b >= tokens.length - 1) return null;
  return valid([...tokens.slice(0, i), tokens[b + 1], ...tokens.slice(i, b + 1), ...tokens.slice(b + 2)]);
};
/** Remove a block; a loop or condition is unwrapped (its inside stays). */
const removeAt = (tokens, i) => {
  if (tokens[i].op === 'end') return null;
  const e = isOpener(tokens[i]) ? matchingEnd(tokens, i) : -1;
  return tokens.filter((_, k) => k !== i && k !== e);
};
/** Move the block at `from` (with its inside) so it lands before what is now at `to`. */
const moveTo = (tokens, from, to) => {
  const b = unitEnd(tokens, from);
  if (to >= from && to <= b + 1) return tokens;
  const unit = tokens.slice(from, b + 1);
  const rest = [...tokens.slice(0, from), ...tokens.slice(b + 1)];
  const at = to > b ? to - unit.length : to;
  return valid([...rest.slice(0, at), ...unit, ...rest.slice(at)]);
};

const KIND = (op) => (op === 'repeat' || op === 'repeatR' ? 'loop' : op.startsWith('if') ? 'cond' : op === 'end' ? 'end' : 'act');
const TONE = {
  act: 'bg-sky-50 text-sky-900 ring-sky-200',
  loop: 'bg-amber-50 text-amber-900 ring-amber-300',
  cond: 'bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-300',
  end: 'bg-slate-50 text-slate-500 ring-slate-200'
};

const caseText = (level, input) => {
  if (!input) return '';
  if (level.type === 'cards') return `the deal ${input.join(', ')}`;
  return Object.entries(input).map(([k, v]) => `${k} = ${v}`).join(', ');
};

function Round({ progress, onExit }) {
  const band = progress.ageBand === 'analytical' ? 'analytical' : 'advanced';
  const [level] = useState(() => algorithmLevel(band, progress.difficulty, progress.levelNo, seeded(Math.floor(Math.random() * 2 ** 31))));
  const nextId = useRef(1);
  const [started, setStarted] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [selected, setSelected] = useState(null);     // insert after this row; null = at the end
  const [play, setPlay] = useState(null);             // { result, frames, at, auto }
  const [runsUsed, setRunsUsed] = useState(0);
  const [solved, setSolved] = useState(null);         // { blocks } once a run works
  const [notice, setNotice] = useState('');

  const blocks = blockCount(tokens);
  const finished = Boolean(play) && play.at >= play.frames.length - 1;
  const over = finished && (play.result.ok || runsUsed >= RUNS);
  const stars = over && solved ? starsForBlocks(solved.blocks, level.opt) : 0;
  useRecordStars(progress, over, stars, { correct: solved ? 1 : 0, wrong: runsUsed - (solved ? 1 : 0), hints: 0, score: stars, limitMs: 300000 });

  const editing = !play;
  const commit = (next, select = selected, msg = '') => {
    if (!next) { setNotice('That move would break a block apart.'); return; }
    setTokens(next);
    setSelected(select);
    setNotice(msg);
  };

  const add = (tpl, at = selected === null ? tokens.length : selected + 1) => {
    if (!editing) return;
    if (blocks >= level.maxBlocks) { setNotice(`This level allows at most ${level.maxBlocks} blocks.`); return; }
    const tok = { ...tpl, id: nextId.current++ };
    if (tok.op === 'repeat') tok.n = Math.min(tpl.n || 2, level.maxRepeat);
    const piece = isOpener(tok) ? [tok, { op: 'end', id: nextId.current++ }] : [tok];
    commit([...tokens.slice(0, at), ...piece, ...tokens.slice(at)], at, isOpener(tok) ? 'Added — the next block goes inside it.' : '');
  };

  const setN = (i, d) => {
    const t = tokens[i];
    const n = Math.max(2, Math.min(level.maxRepeat, t.n + d));
    commit(tokens.map((x, k) => (k === i ? { ...x, n } : x)));
  };

  const run = () => {
    if (!tokens.length) return;
    const result = verify(level, tokens, { trace: true });
    setRunsUsed((r) => r + 1);
    if (result.ok) setSolved({ blocks });
    setPlay({ result, frames: result.shown.frames, at: -1, auto: true });
    setNotice('');
  };

  const speed = play ? Math.max(70, Math.min(420, Math.round(9000 / Math.max(1, play.frames.length)))) : 400;
  const auto = Boolean(play?.auto) && !finished;
  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => setPlay((p) => (p && p.at < p.frames.length - 1 ? { ...p, at: p.at + 1 } : p)), speed);
    return () => clearInterval(id);
  }, [auto, speed]);

  const frame = play && play.at >= 0 ? play.frames[play.at] : null;
  const view = frame ? frame.state : initialState(level);
  const activePc = frame ? frame.pc : null;
  const d = depths(tokens);
  const runsLeft = RUNS - runsUsed;

  const failedMsg = () => {
    const r = play.result;
    if (r.shown.ok && r.failed) return `It worked here, but failed on ${caseText(level, r.failed)}: ${r.error}`;
    return r.error;
  };

  const dragStart = (e, payload) => { e.dataTransfer.setData('text/plain', payload); e.dataTransfer.effectAllowed = 'move'; };
  const drop = (e, to) => {
    e.preventDefault();
    if (!editing) return;
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('p:')) add(level.palette[Number(data.slice(2))], to);
    else if (data.startsWith('r:')) {
      const from = Number(data.slice(2));
      commit(moveTo(tokens, from, to), null);
    }
  };

  return (
    <GameShell
      title="Algorithm Builder"
      blurb={`${level.title}: ${level.goalText}`}
      tone="bg-gradient-to-br from-slate-800 to-indigo-900"
      score={blocks}
      scoreLabel="Blocks"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${level.goalText} Tap a block to add it (it goes after the selected line), or drag it into the program; ▲▼ reorder, and blocks inside a Repeat/If sit between it and its “end”. Run to watch it step by step — ${RUNS} runs. Stars: ${level.opt} blocks = 3, ${level.opt + 2} = 2, any working program = 1.${band === 'advanced' ? ` Cap: ${level.maxBlocks} blocks.` : ''}`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: Boolean(solved),
              stars,
              headline: solved ? (solved.blocks <= level.opt ? 'Optimal algorithm!' : `Level ${progress.level} cleared!`) : 'Out of runs',
              detail: solved ? `${solved.blocks} blocks (best possible ${level.opt}) · ${runsUsed} run${runsUsed === 1 ? '' : 's'}` : `No working program in ${RUNS} runs — the best uses ${level.opt} blocks.`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">{level.title} · target {level.opt} blocks · {runsLeft} run{runsLeft === 1 ? '' : 's'} left</p>}
    >
      {started && !over && (
        <div className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-2">
          {/* ---- The machine ---- */}
          <section className="min-w-0 rounded-2xl bg-surface p-3 ring-1 ring-line-200 ring-inset">
            <p className="mb-2 text-sm font-bold text-ink-900">{level.goalText}</p>
            {level.type === 'robot' && <RobotBoard level={level} state={view} />}
            {level.type === 'cards' && <CardsBoard level={level} state={view} />}
            {level.type === 'register' && <RegisterBoard level={level} state={view} />}
            <p className="mt-2 min-h-5 text-center text-xs font-bold text-ink-500" aria-live="polite">
              {frame ? `Step ${play.at + 1} of ${play.frames.length}${frame.note ? ` · ${frame.note}` : ''}` : ''}
            </p>
          </section>

          {/* ---- The program ---- */}
          <section className="min-w-0 rounded-2xl bg-surface p-3 ring-1 ring-line-200 ring-inset">
            <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Blocks you can use">
              {level.palette.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  draggable={editing}
                  onDragStart={(e) => dragStart(e, `p:${i}`)}
                  onClick={() => add(p)}
                  disabled={!editing}
                  className={`fp-press min-h-10 rounded-xl px-2.5 text-xs font-black ring-1 ring-inset disabled:opacity-40 ${TONE[KIND(p.op)]}`}
                >
                  + {p.op === 'repeat' ? 'Repeat n times' : labelOf(p)}
                </button>
              ))}
            </div>

            <ol
              className="min-h-24 space-y-1 rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-200 ring-inset"
              aria-label="Your program"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, tokens.length)}
            >
              {tokens.length === 0 && <li className="p-3 text-center text-xs font-bold text-ink-400">Tap or drag blocks here to build the program.</li>}
              {tokens.map((t, i) => {
                const isSel = selected === i;
                const active = activePc === i;
                return (
                  <li
                    key={t.id}
                    draggable={editing && t.op !== 'end'}
                    onDragStart={(e) => dragStart(e, `r:${i}`)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.stopPropagation(); drop(e, i); }}
                    style={{ marginLeft: `${Math.min(d[i], 4) * 14}px` }}
                    className={`flex items-center gap-1 rounded-lg px-1 py-0.5 ring-1 ring-inset ${TONE[KIND(t.op)]} ${active ? 'outline-2 outline-indigo-600' : ''} ${isSel ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(isSel ? null : i)}
                      disabled={!editing}
                      aria-pressed={isSel}
                      aria-label={`Line ${i + 1}: ${labelOf(t)}${isSel ? ', selected — new blocks go after it' : ''}`}
                      className="min-h-9 min-w-0 flex-1 truncate text-left text-xs font-black"
                    >
                      {t.op === 'end' ? 'end' : labelOf(t)}
                    </button>
                    {t.op === 'repeat' && editing && (
                      <span className="flex items-center">
                        <IconBtn label="Fewer repeats" onClick={() => setN(i, -1)}>−</IconBtn>
                        <IconBtn label="More repeats" onClick={() => setN(i, 1)}>+</IconBtn>
                      </span>
                    )}
                    {editing && (
                      <span className="flex items-center">
                        <IconBtn label={`Move line ${i + 1} up`} onClick={() => commit(moveUp(tokens, i), null)}>▲</IconBtn>
                        <IconBtn label={`Move line ${i + 1} down`} onClick={() => commit(moveDown(tokens, i), null)}>▼</IconBtn>
                        {t.op !== 'end' && <IconBtn label={`Delete line ${i + 1}`} onClick={() => commit(removeAt(tokens, i), null)}>✕</IconBtn>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="mt-1 min-h-4 text-[11px] font-bold text-ink-500" aria-live="polite">{notice || `${blocks} block${blocks === 1 ? '' : 's'}${band === 'advanced' ? ` of ${level.maxBlocks} allowed` : ''} · “end” lines are free`}</p>

            {editing ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={run} disabled={!tokens.length} className="fp-press min-h-11 flex-1 rounded-xl bg-indigo-700 px-4 text-sm font-black text-white disabled:opacity-40">▶ Run</button>
                <button type="button" onClick={() => commit([], null)} disabled={!tokens.length} className="fp-press min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-700 disabled:opacity-40">Clear</button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {!finished ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPlay((p) => ({ ...p, auto: !p.auto }))} className="fp-press min-h-11 flex-1 rounded-xl bg-slate-900 px-3 text-sm font-black text-white">{play.auto ? 'Pause' : 'Play'}</button>
                    <button type="button" onClick={() => setPlay((p) => ({ ...p, auto: false, at: Math.min(p.frames.length - 1, p.at + 1) }))} className="fp-press min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-800">Step</button>
                    <button type="button" onClick={() => setPlay((p) => ({ ...p, at: p.frames.length - 1 }))} className="fp-press min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-800">Skip to end</button>
                  </div>
                ) : (
                  !play.result.ok && (
                    <div role="status" className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200 ring-inset">
                      <p className="text-sm font-black text-rose-700">Not yet. {failedMsg()}</p>
                      <p className="mt-0.5 text-xs font-bold text-ink-600">{runsLeft} run{runsLeft === 1 ? '' : 's'} left. Fix the program and run again.</p>
                      <button type="button" onClick={() => setPlay(null)} className="fp-press mt-2 min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">Edit program</button>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </GameShell>
  );
}

function IconBtn({ label, onClick, children }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="h-9 w-8 shrink-0 rounded-md text-xs font-black text-slate-600 hover:bg-white/80 focus-visible:bg-white">
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ boards */

const ROT = [0, 90, 180, 270];

function RobotBoard({ level, state }) {
  const { map } = level;
  const cells = [];
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const wall = map.walls.has(`${x},${y}`);
      const g = map.gems.findIndex(([gx, gy]) => gx === x && gy === y);
      const here = state.x === x && state.y === y;
      cells.push(
        <div key={`${x},${y}`} className={`relative aspect-square ${wall ? 'bg-slate-700' : 'bg-white'}`}>
          {g >= 0 && (
            <svg viewBox="0 0 20 20" className={`absolute inset-[22%] ${state.got.includes(g) ? 'opacity-20' : ''}`} aria-hidden>
              <path d="M10 1 L18 8 L10 19 L2 8 Z" className="fill-emerald-500" />
              <path d="M10 1 L14 8 L10 19 L6 8 Z" className="fill-emerald-300" />
            </svg>
          )}
          {here && (
            <svg viewBox="0 0 20 20" className="absolute inset-[12%] transition-transform duration-150" style={{ transform: `rotate(${ROT[state.dir]}deg)` }} aria-hidden>
              <rect x="4" y="5" width="12" height="12" rx="3" className="fill-indigo-600" />
              <path d="M10 1 L15 7 H5 Z" className="fill-amber-400" />
              <circle cx="10" cy="11" r="2" className="fill-white" />
            </svg>
          )}
        </div>
      );
    }
  }
  return (
    <div
      className="mx-auto grid gap-px overflow-hidden rounded-xl bg-slate-300 ring-1 ring-slate-300"
      style={{ gridTemplateColumns: `repeat(${map.w}, minmax(0, 1fr))`, width: `min(100%, ${map.w * 46}px)` }}
      role="img"
      aria-label={`Robot at column ${state.x + 1}, row ${state.y + 1}; ${state.got.length} of ${map.gems.length} gems collected`}
    >
      {cells}
    </div>
  );
}

function CardsBoard({ level, state }) {
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Cards: ${state.deck.join(', ')}`}>
      <div className="flex gap-1.5 sm:gap-2">
        {state.deck.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-ink-400">{i + 1}</span>
            <div className="flex h-14 w-9 items-center justify-center rounded-lg bg-white text-xl font-black text-slate-900 shadow-sm ring-2 ring-slate-300 ring-inset min-[400px]:h-16 min-[400px]:w-11 min-[400px]:text-2xl sm:h-20 sm:w-14">{v}</div>
            {level.mode === 'machine' && <span className={`text-sm font-black ${state.cur === i ? 'text-indigo-700' : 'text-transparent'}`} aria-hidden>▲</span>}
          </div>
        ))}
      </div>
      {level.mode === 'machine' && <p className="mt-1 text-[11px] font-bold text-ink-500">▲ the cursor · tested on every deal of {state.deck.length} cards</p>}
    </div>
  );
}

function RegisterBoard({ level, state }) {
  const want = level.goal(level.cases[0]);
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {Object.entries(state).map(([k, v]) => (
          <div key={k} className={`flex min-w-16 flex-col items-center rounded-xl px-3 py-2 ring-2 ring-inset ${k === level.target ? 'bg-indigo-50 ring-indigo-400' : 'bg-white ring-slate-200'}`}>
            <span className="text-xs font-black text-ink-500">{k}</span>
            <span className="text-2xl font-black tabular-nums text-ink-900">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-ink-600">
        Goal here: {level.target} = {want}{level.cases.length > 1 ? ` · also checked on ${level.cases.length - 1} other input${level.cases.length === 2 ? '' : 's'}` : ''}
      </p>
    </div>
  );
}
