import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkNetwork, edgeBetween, makeNetworkLevel, networkConfig, treeInfo, walkCost } from '../../data/bands/hNetwork';

/**
 * Network Logic (Master Minds): a weighted network drawn in SVG. Build the cheapest route between two hubs, a route
 * through required hubs under a cost cap, or the cheapest set of links that connects every hub (a minimum spanning
 * tree). Answers are verified against Dijkstra / Kruskal, and any optimal answer counts.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function NetworkLogic({ onExit }) {
  const progress = useGameProgress('network-logic', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const TASK_TITLE = { path: 'Shortest route', tour: 'Route with required stops', mst: 'Cheapest connection' };

function Round({ progress, onExit }) {
  const config = networkConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeNetworkLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [walk, setWalk] = useState(() => (rounds[0].kind === 'mst' ? [] : [rounds[0].from]));
  const [edges, setEdges] = useState([]);
  const [locked, setLocked] = useState(null);
  const [hint, setHint] = useState('');
  const [correct, setCorrect] = useState(0);
  const over = index >= rounds.length;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, rounds.length) - correct, hints: 0, score: correct });

  const g = round.graph;
  const isRoute = round.kind !== 'mst';
  const cost = isRoute ? walkCost(g, walk) ?? 0 : treeInfo(g, edges).weight;
  const info = isRoute ? null : treeInfo(g, edges);
  const ready = isRoute ? walk[walk.length - 1] === round.to && walk.length > 1 : edges.length === g.nodes.length - 1;

  const tapNode = (v) => {
    if (!started || locked || !isRoute) return;
    const last = walk[walk.length - 1];
    if (v === last && walk.length > 1) { setWalk(walk.slice(0, -1)); setHint(''); return; }
    if (edgeBetween(g, last, v)) { setWalk([...walk, v]); setHint(''); return; }
    setHint(`${g.nodes[v].label} is not linked to ${g.nodes[last].label}. Pick a hub joined to the end of your route.`);
  };

  const tapEdge = (e) => {
    if (!started || locked) return;
    if (isRoute) {
      const last = walk[walk.length - 1];
      if (e.a === last || e.b === last) tapNode(e.a === last ? e.b : e.a);
      else setHint(`Extend the route from ${g.nodes[last].label}: tap a link touching it.`);
      return;
    }
    setEdges(edges.includes(e.id) ? edges.filter((x) => x !== e.id) : [...edges, e.id]);
    setHint('');
  };

  const submit = () => {
    if (locked || !ready) return;
    const res = checkNetwork(round, isRoute ? walk : edges);
    if (res.ok) { setCorrect((c) => c + 1); sfx.right?.(); } else sfx.wrong();
    setLocked(res);
  };

  const next = () => {
    const i = index + 1;
    setIndex(i);
    setLocked(null);
    setHint('');
    setEdges([]);
    if (i < rounds.length) setWalk(rounds[i].kind === 'mst' ? [] : [rounds[i].from]);
  };

  const reset = () => { if (!locked) { setWalk(isRoute ? [round.from] : []); setEdges([]); setHint(''); } };
  const undo = () => {
    if (locked) return;
    if (isRoute) setWalk((w) => (w.length > 1 ? w.slice(0, -1) : w));
    else setEdges((es) => es.slice(0, -1));
  };

  // Keys: a hub's letter extends the route, Backspace undoes, Enter submits.
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Backspace') { e.preventDefault(); undo(); return; }
      if (e.key === 'Enter' && !locked) { e.preventDefault(); submit(); return; }
      const node = g.nodes.find((n) => n.label === e.key.toUpperCase());
      if (node && isRoute) tapNode(node.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = (id) => g.nodes[id].label;
  let task;
  if (round.kind === 'path') task = `Build the cheapest route from ${label(round.from)} to ${label(round.to)}.`;
  else if (round.kind === 'tour') task = `Go from ${label(round.from)} to ${label(round.to)}, passing through ${round.required.map(label).join(' and ')}, for a total cost of at most ${round.cap}.`;
  else task = 'Choose links so every hub is connected, at the lowest possible total cost.';

  const objective = `${rounds.length} networks. Tap hubs (or links) to build routes; on a "cheapest connection" task tap links to switch them on. Shortest routes and connections must be optimal — any optimal answer counts. Get ${config.pass} right to pass.`;

  return (
    <GameShell
      title="Network Logic"
      blurb={`Route, tour and connect weighted networks. ${config.pass} of ${rounds.length} to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-indigo-800"
      variant="premium"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${correct} of ${rounds.length} networks solved optimally`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Tap hubs in order to build a route (tap the last hub again to step back). Keys: hub letters, Backspace, Enter.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.68rem] font-bold tracking-[0.16em] text-indigo-600 uppercase">
              Network {index + 1} of {rounds.length} · {TASK_TITLE[round.kind]}
            </p>
            <p className="text-sm font-black text-ink-900 tabular-nums" aria-live="polite">
              {isRoute ? `Cost ${cost}` : `Weight ${cost}`}
              {round.kind === 'tour' && <span className={cost > round.cap ? 'text-rose-600' : 'text-ink-500'}> / cap {round.cap}</span>}
            </p>
          </div>
          <p className="mb-3 text-base font-bold text-ink-900">{task}</p>

          <Board round={round} walk={walk} edges={edges} locked={locked} onNode={tapNode} onEdge={tapEdge} />

          <div className="mt-2 min-h-6 text-sm font-semibold text-ink-700" role="status" aria-live="polite">
            {hint || (isRoute
              ? `Route: ${walk.map(label).join(' → ')}${round.kind === 'tour' ? ` · stops ${round.required.map((r) => `${label(r)} ${walk.includes(r) ? '✓' : '·'}`).join('  ')}` : ''}`
              : `${edges.length} of ${g.nodes.length - 1} links · ${info.cycle ? 'contains a loop — a loop is never needed' : `${info.parts} separate group${info.parts === 1 ? '' : 's'}`}`)}
          </div>

          {!locked ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={undo} className="fp-press min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-ink-900 ring-1 ring-line-200 ring-inset">Undo</button>
              <button type="button" onClick={reset} className="fp-press min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-ink-900 ring-1 ring-line-200 ring-inset">Clear</button>
              <button type="button" onClick={submit} disabled={!ready} className="fp-press min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-black text-white disabled:opacity-40">
                Submit
              </button>
            </div>
          ) : (
            <Verdict round={round} res={locked} onNext={next} last={index === rounds.length - 1} />
          )}
        </div>
      )}
    </GameShell>
  );
}

function Verdict({ round, res, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  const best = round.kind === 'tour' ? `The cheapest such route costs ${round.optimum}${round.cap > round.optimum ? ` (cap ${round.cap})` : ''}.` : `The optimum is ${round.optimum}.`;
  const why = {
    cycle: 'Your links contain a loop, so one of them is wasted.',
    disconnected: 'Some hubs are still cut off from the rest.',
    missing: 'Your route skipped a required stop.',
    costly: `Yours costs ${res.cost}.`,
    broken: 'The route is broken.',
    unfinished: 'The route does not reach the destination.'
  }[res.reason];
  return (
    <div role="status" aria-live="polite" className={`mt-3 rounded-2xl p-4 ring-1 ring-inset ${res.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${res.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
        {res.ok ? `Optimal — ${res.cost}.` : 'Not optimal.'} <span className="font-semibold text-ink-900">{res.ok ? '' : `${why} ${best} The green dashed lines show one best answer.`}</span>
      </p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
          {last ? 'Finish' : 'Next network'}
        </button>
      </div>
    </div>
  );
}

function Board({ round, walk, edges, locked, onNode, onEdge }) {
  const g = round.graph;
  const isRoute = round.kind !== 'mst';
  const height = Math.max(...g.nodes.map((n) => n.y)) + 40;
  const used = useMemo(() => {
    const ids = new Set();
    if (isRoute) for (let i = 0; i + 1 < walk.length; i++) { const e = edgeBetween(g, walk[i], walk[i + 1]); if (e) ids.add(e.id); }
    else edges.forEach((id) => ids.add(id));
    return ids;
  }, [g, walk, edges, isRoute]);
  const solution = useMemo(() => {
    const ids = new Set();
    if (!locked || locked.ok) return ids;
    if (isRoute) for (let i = 0; i + 1 < round.solution.length; i++) ids.add(edgeBetween(g, round.solution[i], round.solution[i + 1]).id);
    else round.solution.forEach((id) => ids.add(id));
    return ids;
  }, [locked, isRoute, round, g]);
  const end = isRoute ? walk[walk.length - 1] : null;

  return (
    <svg viewBox={`0 0 400 ${height}`} className="h-auto w-full touch-manipulation rounded-2xl bg-slate-50 ring-1 ring-slate-200" role="group" aria-label="Network board">
      {g.edges.map((e) => {
        const a = g.nodes[e.a];
        const b = g.nodes[e.b];
        const on = used.has(e.id);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={e.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? '#4f46e5' : '#cbd5e1'} strokeWidth={on ? 5 : 2.5} strokeLinecap="round" />
            {solution.has(e.id) && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#10b981" strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="18"
              className="cursor-pointer" onClick={() => onEdge(e)}
              role="button" aria-label={`Link ${a.label}–${b.label}, cost ${e.w}${on ? ', in use' : ''}`}
              tabIndex={-1}
            />
            <g pointerEvents="none">
              <circle cx={mx} cy={my} r="10" fill="white" stroke={on ? '#4f46e5' : '#e2e8f0'} />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e293b">{e.w}</text>
            </g>
          </g>
        );
      })}
      {g.nodes.map((n) => {
        const isFrom = isRoute && n.id === round.from;
        const isTo = isRoute && n.id === round.to;
        const req = round.kind === 'tour' && round.required.includes(n.id);
        const inWalk = isRoute && walk.includes(n.id);
        const fill = isFrom ? '#4f46e5' : isTo ? '#0f766e' : inWalk ? '#e0e7ff' : '#ffffff';
        const ink = isFrom || isTo ? '#ffffff' : '#1e293b';
        return (
          <g
            key={n.id}
            onClick={() => onNode(n.id)}
            className={isRoute ? 'cursor-pointer' : ''}
            role={isRoute ? 'button' : undefined}
            tabIndex={isRoute && !locked ? 0 : undefined}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); onNode(n.id); } }}
            aria-label={`Hub ${n.label}${isFrom ? ', start' : ''}${isTo ? ', destination' : ''}${req ? ', required stop' : ''}`}
          >
            {n.id === end && !locked && <circle cx={n.x} cy={n.y} r="21" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" />}
            <circle cx={n.x} cy={n.y} r="24" fill="transparent" />
            {req && <circle cx={n.x} cy={n.y} r="19" fill="none" stroke="#f59e0b" strokeWidth="3" />}
            <circle cx={n.x} cy={n.y} r="15" fill={fill} stroke="#334155" strokeWidth="1.5" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={ink} pointerEvents="none">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
