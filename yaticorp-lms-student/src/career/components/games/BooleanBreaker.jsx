import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { BINARY, INPUT_NAMES, booleanConfig, checkTask, depths, evaluate, makeBooleanLevel, rowBits } from '../../data/bands/fBoolean';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const TASK_TITLE = { light: 'Light the lamp', table: 'Complete the truth table', missing: 'Identify the hidden gate' };

/** ⚡ Boolean Breaker: reason through logic-gate circuits. */
export default function BooleanBreaker({ onExit }) {
  const progress = useGameProgress('boolean-breaker', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = booleanConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [tasks] = useState(() => makeBooleanLevel(seeded(freshSeed()), cfg));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [bits, setBits] = useState(() => tasks[0].start || []);
  const [tested, setTested] = useState(null); // the bits at the last power-on, while unchanged
  const [testsLeft, setTestsLeft] = useState(cfg.tests);
  const [rows, setRows] = useState(() => Array(2 ** tasks[0].circuit.n).fill(null));
  const [choice, setChoice] = useState(null);
  const [outcome, setOutcome] = useState(null); // null | 'right' | 'wrong'
  const [correct, setCorrect] = useState(0);

  const over = index >= tasks.length;
  const task = over ? null : tasks[index];
  const passed = correct >= cfg.pass;
  const stars = over ? starsForFixed(correct, cfg.pass, tasks.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: index - correct, hints: 0, score: correct });

  const finish = (ok) => {
    if (ok) { sfx.right?.(); setCorrect((c) => c + 1); } else sfx.wrong();
    setOutcome(ok ? 'right' : 'wrong');
  };

  const toggleBit = (k) => {
    if (outcome) return;
    setBits((b) => b.map((v, i) => (i === k ? v ^ 1 : v)));
    setTested(null);
  };

  const powerOn = () => {
    if (outcome || testsLeft <= 0) return;
    setTested(bits);
    const left = testsLeft - 1;
    setTestsLeft(left);
    if (checkTask(task, bits)) finish(true);
    else if (left === 0) finish(false);
    else sfx.wrong();
  };

  const setRow = (r) => {
    if (outcome) return;
    setRows((list) => list.map((v, i) => (i === r ? (v === null ? 1 : v === 1 ? 0 : null) : v)));
  };

  const checkTable = () => {
    if (outcome || rows.some((v) => v === null)) return;
    finish(checkTask(task, rows));
  };

  const pickGate = (op) => {
    if (outcome) return;
    setChoice(op);
    finish(checkTask(task, op));
  };

  const next = () => {
    const i = index + 1;
    setIndex(i);
    if (i < tasks.length) {
      setBits(tasks[i].start || Array(tasks[i].circuit.n).fill(0));
      setRows(Array(2 ** tasks[i].circuit.n).fill(null));
    }
    setTested(null);
    setTestsLeft(cfg.tests);
    setChoice(null);
    setOutcome(null);
  };

  // What the drawing shows: the tested values in a 'light' task (or the answer once over).
  let values = null;
  if (task?.kind === 'light') {
    if (tested) values = evaluate(task.circuit, tested).values;
    else if (outcome) values = evaluate(task.circuit, bits).values;
  }
  const solutionRow = task?.kind === 'light' ? task.table.indexOf(1) : -1;

  const objective = `${tasks.length} circuits built from AND, OR, NOT, XOR and NAND gates. Light the lamp with at most ${cfg.tests} power-on tests, fill a truth table, or name the hidden gate from its truth table. Get ${cfg.pass} of ${tasks.length} right to clear.`;

  return (
    <GameShell
      title="Boolean Breaker"
      blurb="Think in gates: AND, OR, NOT, XOR, NAND."
      tone="bg-gradient-to-br from-amber-700 to-slate-900"
      variant="premium"
      score={`${correct}/${tasks.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? {
        gameId: progress.gameId,
        level: progress.level,
        objective,
        stars: starsOn(progress.gameId, progress.level),
        onStart: () => setStarted(true)
      } : null}
      result={over ? {
        passed,
        stars,
        headline: passed ? `Level ${progress.level} cleared` : 'Short circuit',
        detail: `${correct} of ${tasks.length} circuits solved`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p>Circuit {Math.min(index + 1, tasks.length)} of {tasks.length}. AND: both · OR: either · XOR: exactly one · NAND: not both · NOT: flips.</p>}
    >
      {started && task && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <p className="text-[0.65rem] font-black tracking-[0.18em] text-amber-700 uppercase">{TASK_TITLE[task.kind]}</p>

          <Circuit task={task} values={values} bits={task.kind === 'light' ? bits : null} />

          {task.kind === 'light' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Input switches">
                {bits.map((v, k) => (
                  <button
                    key={k}
                    type="button"
                    role="switch"
                    aria-checked={v === 1}
                    onClick={() => toggleBit(k)}
                    disabled={Boolean(outcome)}
                    className={`flex min-h-12 min-w-[4.5rem] items-center justify-center gap-2 rounded-xl px-3 font-mono text-base font-black ring-1 ring-inset transition ${v ? 'bg-amber-400 text-slate-900 ring-amber-500' : 'bg-slate-800 text-slate-300 ring-slate-700'}`}
                  >
                    {INPUT_NAMES[k]} = {v}
                  </button>
                ))}
              </div>
              {!outcome && (
                <button type="button" onClick={powerOn} className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-900 shadow">
                  Power on · {testsLeft} test{testsLeft === 1 ? '' : 's'} left
                </button>
              )}
              {!outcome && tested && <p className="text-sm font-bold text-rose-600" role="status">Lamp stayed dark. Follow the glowing wires to see why.</p>}
            </div>
          )}

          {task.kind === 'table' && (
            <TruthTable n={task.circuit.n} values={rows} onToggle={setRow} answer={outcome ? task.table : null} />
          )}
          {task.kind === 'table' && !outcome && (
            <button type="button" onClick={checkTable} disabled={rows.some((v) => v === null)} className="self-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-900 shadow disabled:opacity-40">
              Check table
            </button>
          )}

          {task.kind === 'missing' && (
            <>
              <TruthTable n={task.circuit.n} values={task.table} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Which gate is hidden?">
                {BINARY.map((op) => {
                  const isAns = outcome && op === task.circuit.gates[task.hidden].op;
                  const tone = isAns ? 'bg-emerald-100 ring-emerald-500 text-emerald-800' : outcome && op === choice ? 'bg-rose-100 ring-rose-400 text-rose-700' : 'bg-white ring-slate-200 text-[#1b2456] hover:bg-amber-50';
                  return (
                    <button key={op} type="button" onClick={() => pickGate(op)} disabled={Boolean(outcome)} className={`min-h-12 rounded-xl font-mono text-base font-black ring-1 ring-inset transition ${tone}`}>
                      {op}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {outcome && (
            <div className={`flex flex-col items-center gap-2 rounded-2xl p-3 ring-1 ring-inset ${outcome === 'right' ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`} role="status">
              <p className={`text-sm font-bold ${outcome === 'right' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {outcome === 'right' ? 'Correct.' : task.kind === 'light'
                  ? `Out of tests. One way: ${rowBits(task.circuit.n, solutionRow).map((v, k) => `${INPUT_NAMES[k]}=${v}`).join(', ')}.`
                  : task.kind === 'table' ? 'Some rows are wrong — the right column is shown.'
                    : `It was ${task.circuit.gates[task.hidden].op}.`}
              </p>
              <button type="button" onClick={next} autoFocus className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white">
                {index + 1 >= tasks.length ? 'See result' : 'Next circuit'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

function TruthTable({ n, values, onToggle = null, answer = null }) {
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-y-1 text-center font-mono text-sm">
        <thead>
          <tr className="text-[0.65rem] tracking-[0.14em] text-slate-500 uppercase">
            {INPUT_NAMES.slice(0, n).map((x) => <th key={x} className="px-3 font-black">{x}</th>)}
            <th className="px-3 font-black">Lamp</th>
          </tr>
        </thead>
        <tbody>
          {values.map((v, r) => {
            const wrong = answer && v !== answer[r];
            return (
              <tr key={r} className="bg-slate-50">
                {rowBits(n, r).map((b, k) => <td key={k} className="px-3 py-1 font-bold text-slate-600">{b}</td>)}
                <td className="px-2 py-0.5">
                  {onToggle ? (
                    <button
                      type="button"
                      onClick={() => onToggle(r)}
                      disabled={Boolean(answer)}
                      aria-label={`Row ${rowBits(n, r).join('')}: lamp ${v === null ? 'not set' : v}`}
                      className={`h-10 w-14 rounded-lg font-black ring-1 ring-inset ${wrong ? 'bg-rose-100 text-rose-700 ring-rose-400' : answer ? 'bg-emerald-100 text-emerald-700 ring-emerald-400' : v === 1 ? 'bg-amber-400 text-slate-900 ring-amber-500' : v === 0 ? 'bg-slate-800 text-slate-200 ring-slate-700' : 'bg-white text-slate-400 ring-slate-300'}`}
                    >
                      {v === null ? '?' : v}{wrong ? ` → ${answer[r]}` : ''}
                    </button>
                  ) : (
                    <span className={`inline-block w-10 rounded-lg py-1 font-black ${v ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-200'}`}>{v}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── The circuit drawing ─────────────────────────────────────────────────── */

const COL_W = 120;
const ROW_H = 76;
const GATE_W = 56;
const GATE_H = 40;
const PAD_X = 46;

/** Standard gate outlines, drawn from (0,0) to (56,40). */
function GateShape({ op, hidden, fill, stroke }) {
  if (hidden) return <rect x="0" y="0" width={GATE_W} height={GATE_H} rx="8" fill="#fff7ed" stroke="#d97706" strokeWidth="2" strokeDasharray="5 4" />;
  const body = {
    AND: 'M0 0 H28 A20 20 0 0 1 28 40 H0 Z',
    NAND: 'M0 0 H24 A20 20 0 0 1 24 40 H0 Z',
    OR: 'M0 0 Q14 20 0 40 Q34 40 52 20 Q34 0 0 0 Z',
    XOR: 'M6 0 Q20 20 6 40 Q38 40 56 20 Q38 0 6 0 Z',
    NOT: 'M4 2 L44 20 L4 38 Z'
  }[op];
  return (
    <g>
      <path d={body} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      {op === 'XOR' && <path d="M0 0 Q14 20 0 40" fill="none" stroke={stroke} strokeWidth="2" />}
      {(op === 'NAND' || op === 'NOT') && <circle cx={op === 'NOT' ? 49 : 50} cy="20" r="5" fill="#fff" stroke={stroke} strokeWidth="2" />}
    </g>
  );
}

function Circuit({ task, values, bits }) {
  const { circuit } = task;
  const d = depths(circuit);
  const maxD = Math.max(...d);
  const nodes = d.length;
  const columns = Array.from({ length: maxD + 1 }, (_, k) => [...Array(nodes).keys()].filter((i) => d[i] === k));
  const tallest = Math.max(...columns.map((c) => c.length));
  const height = Math.max(2, tallest) * ROW_H;
  const pos = [];
  columns.forEach((col, k) => {
    col.forEach((node, j) => {
      pos[node] = { x: PAD_X + k * COL_W, y: ((j + 0.5) * height) / col.length };
    });
  });
  const lampX = PAD_X + (maxD + 1) * COL_W - 20;
  const width = lampX + 46;
  const out = nodes - 1;
  const outAt = (node) => (node < circuit.n ? { x: pos[node].x + 16, y: pos[node].y } : { x: pos[node].x + GATE_W, y: pos[node].y });
  const wireColour = (node) => (values ? (values[node] ? '#f59e0b' : '#475569') : '#94a3b8');
  const lampOn = values ? values[out] === 1 : false;
  const wire = (from, to, node, key) => {
    const a = outAt(from);
    const mx = (a.x + to.x) / 2;
    return <path key={key} d={`M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${to.y} ${to.x} ${to.y}`} fill="none" stroke={wireColour(node)} strokeWidth={values && values[node] ? 3.5 : 2.5} strokeLinecap="round" />;
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-slate-50 ring-1 ring-slate-200 ring-inset">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="mx-auto block h-auto w-full min-w-[280px] sm:min-w-[320px]" style={{ maxHeight: 340 }} role="img" aria-label={describe(circuit, task.hidden)}>
        <g transform="translate(0 10)">
          {circuit.gates.map((g, i) => {
            const node = circuit.n + i;
            const p = pos[node];
            if (g.op === 'NOT') return wire(g.a, { x: p.x + 4, y: p.y }, g.a, `w${i}a`);
            return [wire(g.a, { x: p.x + 3, y: p.y - 10 }, g.a, `w${i}a`), wire(g.b, { x: p.x + 3, y: p.y + 10 }, g.b, `w${i}b`)];
          })}
          {wire(out, { x: lampX - 16, y: pos[out].y }, out, 'wout')}

          {[...Array(circuit.n).keys()].map((k) => {
            const p = pos[k];
            const on = bits ? bits[k] === 1 : values ? values[k] === 1 : false;
            return (
              <g key={`in${k}`}>
                <circle cx={p.x} cy={p.y} r="16" fill={on ? '#fbbf24' : '#1e293b'} stroke={on ? '#d97706' : '#0f172a'} strokeWidth="2" />
                <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={on ? '#0f172a' : '#e2e8f0'} fontFamily="ui-monospace, monospace">{INPUT_NAMES[k]}</text>
              </g>
            );
          })}

          {circuit.gates.map((g, i) => {
            const node = circuit.n + i;
            const p = pos[node];
            const hidden = task.kind === 'missing' && task.hidden === i;
            const lit = values ? values[node] === 1 : false;
            return (
              <g key={`g${i}`} transform={`translate(${p.x} ${p.y - GATE_H / 2})`}>
                <GateShape op={g.op} hidden={hidden} fill={lit ? '#fef3c7' : '#ffffff'} stroke={lit ? '#d97706' : '#334155'} />
                <text x={hidden ? GATE_W / 2 : 20} y={hidden ? 26 : 24} textAnchor="middle" fontSize={hidden ? 18 : 9} fontWeight="800" fill={hidden ? '#b45309' : '#334155'} fontFamily="ui-sans-serif, system-ui">
                  {hidden ? '?' : g.op}
                </text>
              </g>
            );
          })}

          <g>
            <circle cx={lampX} cy={pos[out].y} r="18" fill={lampOn ? '#fde047' : '#334155'} stroke={lampOn ? '#ca8a04' : '#1e293b'} strokeWidth="2.5" />
            {lampOn && <circle cx={lampX} cy={pos[out].y} r="26" fill="none" stroke="#fde047" strokeWidth="3" opacity="0.6" />}
            <text x={lampX} y={pos[out].y + 36} textAnchor="middle" fontSize="10" fontWeight="800" fill="#64748b" fontFamily="ui-sans-serif, system-ui">LAMP</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/** The circuit as a formula, for screen readers: e.g. "Lamp = (A AND B) XOR (NOT C)". */
function describe(circuit, hidden) {
  const name = (node) => {
    if (node < circuit.n) return INPUT_NAMES[node];
    const i = node - circuit.n;
    const g = circuit.gates[i];
    const op = i === hidden ? 'unknown gate' : g.op;
    return g.op === 'NOT' ? `(NOT ${name(g.a)})` : `(${name(g.a)} ${op} ${name(g.b)})`;
  };
  return `Circuit: lamp = ${name(circuit.n + circuit.gates.length - 1)}`;
}
