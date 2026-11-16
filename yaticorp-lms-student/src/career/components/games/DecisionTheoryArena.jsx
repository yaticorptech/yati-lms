import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { applyReturn, decisionConfig, fmtFrac, makeDecisionLevel, nodeEV, playStage } from '../../data/bands/hDecision';

/**
 * Decision Theory Arena (Master Minds): a run of quarters with one bankroll. Each quarter the whole bankroll goes into
 * one plan, read off a payoff matrix or a decision tree (with chance nodes and, on harder levels, a second decision).
 * Pick the plan with the highest expected return — or, when the quarter says cautious, the best worst case
 * (minimax). Then the outcome is drawn and the bankroll compounds. Scored on decisions, not luck.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function DecisionTheoryArena({ onExit }) {
  const progress = useGameProgress('decision-theory-arena', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const signed = (v) => `${v > 0 ? '+' : ''}${v}%`;

function Round({ progress, onExit }) {
  const config = decisionConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [stages] = useState(() => makeDecisionLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [locked, setLocked] = useState(null);   // { ok, outcome, before, after }
  const [correct, setCorrect] = useState(0);
  const [bank, setBank] = useState(config.bankroll);
  const [history, setHistory] = useState([config.bankroll]);
  const over = index >= stages.length;
  const stage = stages[Math.min(index, stages.length - 1)];
  const stars = over ? starsForFixed(correct, config.pass, stages.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, stages.length) - correct, hints: 0, score: correct });

  const commit = () => {
    if (locked || choice === null) return;
    const ok = choice === stage.answer;
    if (ok) { setCorrect((c) => c + 1); sfx.right?.(); } else sfx.wrong();
    const outcome = playStage(stage, choice);
    const after = applyReturn(bank, outcome.value);
    setLocked({ ok, outcome, before: bank, after });
    setBank(after);
    setHistory((h) => [...h, after]);
  };
  const next = () => { setIndex((i) => i + 1); setChoice(null); setLocked(null); };

  useEffect(() => {
    if (!started || over || locked) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= stage.actions.length) setChoice(n - 1);
      if (e.key === 'Enter') commit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cautious = stage.criterion === 'minimax';

  return (
    <GameShell
      title="Decision Theory Arena"
      blurb={`Commit your bankroll quarter by quarter. ${config.pass} of ${stages.length} best decisions to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-amber-800"
      variant="premium"
      score={`${correct}/${stages.length}`}
      scoreLabel="Best calls"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${stages.length} quarters, starting with ${config.bankroll} credits. Each quarter your whole bankroll goes into one plan from a payoff matrix or a decision tree, so returns compound. Choose the plan with the highest expected return${config.kinds.includes('minimax') ? ' — unless the quarter says cautious: then choose the best worst case (minimax)' : ''}. You are scored on the decision, not on the luck of the draw. Make ${config.pass} best calls to pass.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${correct} of ${stages.length} best decisions · bankroll ${config.bankroll} → ${bank} credits`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Expected return = Σ probability × return. In a tree, work backwards: average at chance nodes, take the best branch at decisions. Keys 1–{stage.actions.length}, Enter commits.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.68rem] font-bold tracking-[0.16em] text-amber-700 uppercase">Quarter {index + 1} of {stages.length}</p>
            <Bankroll history={history} bank={bank} />
          </div>
          <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-bold ${cautious ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>
            {cautious ? 'Cautious quarter: ignore the odds — choose the plan whose worst outcome is best (minimax).' : 'Risk-neutral quarter: choose the plan with the highest expected return.'}
          </p>

          {stage.kind === 'matrix'
            ? <Matrix stage={stage} choice={choice} onPick={(i) => !locked && setChoice(i)} locked={locked} />
            : <Tree stage={stage} choice={choice} onPick={(i) => !locked && setChoice(i)} locked={locked} />}

          {stage.kind !== 'matrix' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {stage.actions.map((a, i) => (
                <button key={a} type="button" disabled={Boolean(locked)} aria-pressed={choice === i} onClick={() => setChoice(i)}
                  className={`fp-press min-h-12 rounded-xl px-3 text-sm font-bold ring-2 ring-inset transition ${verdictTone(stage, i, choice, locked)}`}>
                  <span className="mr-1.5 text-ink-400">{i + 1}</span>{a}
                </button>
              ))}
            </div>
          )}

          {!locked ? (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={commit} disabled={choice === null} className="fp-press min-h-12 rounded-2xl bg-slate-900 px-6 text-base font-black text-white disabled:opacity-40">
                Commit {bank} credits
              </button>
            </div>
          ) : (
            <Verdict stage={stage} res={locked} choice={choice} onNext={next} last={index === stages.length - 1} />
          )}
        </div>
      )}
    </GameShell>
  );
}

const verdictTone = (stage, i, choice, locked) => {
  if (locked) return i === stage.answer ? 'bg-emerald-50 ring-emerald-500 text-ink-900' : i === choice ? 'bg-rose-50 ring-rose-400 text-ink-900' : 'bg-white ring-slate-200 text-ink-700 opacity-70';
  return i === choice ? 'bg-amber-50 ring-amber-500 text-ink-900' : 'bg-white ring-slate-200 text-ink-900 hover:ring-amber-300';
};

function Bankroll({ history, bank }) {
  const W = 90;
  const H = 26;
  const lo = Math.min(...history);
  const hi = Math.max(...history);
  const pts = history.map((v, i) => `${(i / Math.max(1, history.length - 1)) * W},${H - 2 - ((v - lo) / Math.max(1, hi - lo)) * (H - 4)}`).join(' ');
  return (
    <div className="flex items-center gap-2" aria-label={`Bankroll ${bank} credits`}>
      {history.length > 1 && <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-20" aria-hidden="true"><polyline points={pts} fill="none" stroke="#d97706" strokeWidth="2" /></svg>}
      <span className="text-sm font-black text-ink-900 tabular-nums">{bank} credits</span>
    </div>
  );
}

function Verdict({ stage, res, choice, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  const scores = stage.criterion === 'minimax'
    ? stage.worst.map((w, i) => `${stage.actions[i]}: worst ${signed(w)}`)
    : stage.evs.map((v, i) => `${stage.actions[i]}: EV ${signed(Number(fmtFrac(v)))}`);
  return (
    <div role="status" aria-live="polite" className={`mt-4 rounded-2xl p-4 ring-1 ring-inset ${res.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${res.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
        {res.ok ? 'Best decision.' : `Best was: ${stage.actions[stage.answer]}.`}
      </p>
      <p className="mt-1 text-sm text-ink-700">{scores.join(' · ')}</p>
      <p className="mt-2 text-sm font-bold text-ink-900">
        You chose {stage.actions[choice]} → {res.outcome.path.join(' → ')}: {signed(res.outcome.value)}. Bankroll {res.before} → <span className={res.after >= res.before ? 'text-emerald-700' : 'text-rose-700'}>{res.after}</span>.
      </p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">{last ? 'Finish' : 'Next quarter'}</button>
      </div>
    </div>
  );
}

function Matrix({ stage, choice, onPick, locked }) {
  const cautious = stage.criterion === 'minimax';
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[18rem] border-separate sm:min-w-[20rem] border-spacing-1 text-sm">
        <caption className="sr-only">Payoff matrix: % return of each plan in each state</caption>
        <thead>
          <tr>
            <th className="text-left text-xs font-bold text-ink-500">Plan</th>
            {stage.states.map((s) => (
              <th key={s.name} className="rounded-lg bg-slate-100 px-2 py-1.5 text-center text-xs font-black text-ink-800">
                {s.name}{!cautious && <span className="block font-bold text-ink-500 tabular-nums">p = {s.p}%</span>}
              </th>
            ))}
            {locked && <th className="text-center text-xs font-black text-ink-700">{cautious ? 'Worst' : 'EV'}</th>}
          </tr>
        </thead>
        <tbody>
          {stage.actions.map((a, i) => (
            <tr key={a} onClick={() => onPick(i)} className="cursor-pointer">
              <th scope="row" className="p-0 text-left">
                <button type="button" disabled={Boolean(locked)} aria-pressed={choice === i} onClick={(e) => { e.stopPropagation(); onPick(i); }}
                  className={`fp-press min-h-11 w-full rounded-lg px-2 text-left text-sm font-bold ring-2 ring-inset ${verdictTone(stage, i, choice, locked)}`}>
                  <span className="mr-1 text-ink-400">{i + 1}</span>{a}
                </button>
              </th>
              {stage.payoffs[i].map((v, j) => (
                <td key={j} className={`rounded-lg px-2 py-2 text-center font-black tabular-nums ${v >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{signed(v)}</td>
              ))}
              {locked && <td className="text-center font-black text-ink-900 tabular-nums">{cautious ? signed(stage.worst[i]) : signed(Number(fmtFrac(stage.evs[i])))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lay the tree out left to right: depth → column, leaves stacked, parents centred on their children. */
const layoutTree = (root) => {
  const nodes = [];
  const links = [];
  let leaf = 0;
  const visit = (node, depth, top) => {
    const id = nodes.length;
    nodes.push({ node, depth, top, y: 0 });
    if (node.type === 'leaf') nodes[id].y = leaf++;
    else {
      const kids = node.branches.map((b, k) => {
        const child = visit(b.node, depth + 1, depth === 0 ? k : top);
        links.push({ from: id, to: child, label: b.label, p: b.p, top: depth === 0 ? k : top });
        return child;
      });
      nodes[id].y = (nodes[kids[0]].y + nodes[kids[kids.length - 1]].y) / 2;
    }
    return id;
  };
  visit(root, 0, -1);
  return { nodes, links, leaves: leaf, depth: Math.max(...nodes.map((n) => n.depth)) };
};

function Tree({ stage, choice, onPick, locked }) {
  const { nodes, links, leaves, depth } = layoutTree(stage.tree);
  const colW = 128;
  const rowH = 38;
  const W = 40 + depth * colW + 70;
  const H = leaves * rowH + 16;
  const X = (d) => 24 + d * colW;
  const Y = (y) => 22 + y * rowH;
  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-50 ring-1 ring-slate-200 ring-inset">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: `${Math.min(W, 560)}px` }} className="h-auto w-full" role="img"
        aria-label={`Decision tree. ${stage.actions.map((a, i) => `${i + 1}: ${a}`).join('; ')}`}>
        {links.map((l, k) => {
          const a = nodes[l.from];
          const b = nodes[l.to];
          const x1 = X(a.depth) + 10;
          const x2 = X(b.depth) - 10;
          const bend = x2 - 76;
          const hot = l.top === choice;
          const best = locked && l.top === stage.answer;
          return (
            <g key={k} onClick={() => a.depth === 0 && onPick(l.top)} className={a.depth === 0 ? 'cursor-pointer' : ''}>
              <path d={`M${x1} ${Y(a.y)} L${bend} ${Y(b.y)} L${x2} ${Y(b.y)}`} fill="none" stroke={best ? '#059669' : hot ? '#d97706' : '#94a3b8'} strokeWidth={hot || best ? 3 : 1.6} />
              <text x={bend + 2} y={Y(b.y) - 5} fontSize="10.5" fontWeight="700" fill="#334155">
                {l.label}{l.p !== undefined ? ` · ${l.p}%` : ''}
              </text>
            </g>
          );
        })}
        {nodes.map((n, k) => {
          const x = X(n.depth);
          const y = Y(n.y);
          if (n.node.type === 'leaf') {
            const v = n.node.value;
            return <text key={k} x={x - 8} y={y + 4} fontSize="12" fontWeight="900" fill={v >= 0 ? '#047857' : '#be123c'}>{signed(v)}</text>;
          }
          const ev = locked ? fmtFrac(nodeEV(n.node)) : null;
          return (
            <g key={k}>
              {n.node.type === 'decision'
                ? <rect x={x - 9} y={y - 9} width="18" height="18" rx="3" fill="#1e293b" />
                : <circle cx={x} cy={y} r="9" fill="#f59e0b" />}
              {ev !== null && <text x={x} y={y + 22} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#475569">EV {ev}</text>}
            </g>
          );
        })}
      </svg>
      <p className="px-3 pb-2 text-xs font-semibold text-ink-500 sm:text-[0.7rem]">■ decision · ● chance (probabilities on branches) · leaves show % return on the bankroll</p>
    </div>
  );
}
