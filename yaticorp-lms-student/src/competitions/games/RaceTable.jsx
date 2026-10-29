import { useEffect, useRef, useState } from 'react';
import { Timer, Check, RotateCcw, Delete, Sparkles } from 'lucide-react';
import usePhaseClock from './usePhaseClock';
import { GROUP_GAMES } from '../api';

/**
 * The table for the solo games played as races (2026-10-29): Lights Out, Code Breaker, Typing Sprint, Speed
 * Sort, Number Bonds, Math Sprint and Memory Match (server games/race.js). Everyone has the same puzzles and
 * plays them at their own pace; the page draws the others' progress around (PlayersBoard). This draws the
 * clock, how far you are, and your puzzle — each kind its own way. A move names its puzzle (`stage`), so a
 * double tap cannot count twice.
 */
const PEG = { red: '#ef4444', blue: '#0ea5e9', green: '#10b981', yellow: '#f59e0b', purple: '#8b5cf6', orange: '#f97316' };
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-black transition-colors disabled:opacity-50';

function LightsOut({ c, send }) {
    return (
        <div className="mx-auto grid w-full max-w-xs gap-2" style={{ gridTemplateColumns: `repeat(${c.n}, minmax(0, 1fr))` }} data-lights>
            {c.board.map((on, i) => (
                <button key={i} type="button" onClick={() => send({ cell: i })} aria-label={`Light ${i + 1}, ${on ? 'on' : 'off'}`}
                    className={`aspect-square rounded-xl transition-[background-color,box-shadow] duration-150 ${on ? 'bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,.8)]' : 'bg-slate-800'}`} />
            ))}
            <p className="col-span-full mt-1 text-center text-xs font-semibold text-slate-500">Taps: {c.taps}</p>
        </div>
    );
}

function CodeBreaker({ c, send }) {
    const [code, setCode] = useState([]);
    const add = (col) => setCode((x) => (x.length < 4 ? [...x, col] : x));
    return (
        <div className="mx-auto max-w-md space-y-4" data-code>
            <ol className="space-y-1.5">
                {c.guesses.map((g, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="w-5 text-xs font-black text-slate-400">{i + 1}</span>
                        <span className="flex gap-1.5">{g.code.map((p, k) => <span key={k} className="h-6 w-6 rounded-full shadow-inner" style={{ background: PEG[p] }} />)}</span>
                        <span className="ml-auto text-xs font-bold text-slate-600">{g.exact} right place · {g.near} wrong place</span>
                    </li>
                ))}
            </ol>
            <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3].map((k) => <span key={k} className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300" style={code[k] ? { background: PEG[code[k]], borderStyle: 'solid', borderColor: PEG[code[k]] } : undefined} />)}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {c.colours.map((col) => <button key={col} type="button" onClick={() => add(col)} aria-label={col} className="h-10 w-10 rounded-full shadow-md transition-transform hover:scale-110" style={{ background: PEG[col] }} />)}
            </div>
            <div className="flex justify-center gap-2">
                <button type="button" onClick={() => setCode((x) => x.slice(0, -1))} disabled={!code.length} className={`${btn} bg-slate-100 text-slate-700`}><Delete size={16} /> Undo</button>
                <button type="button" onClick={() => { send({ code }); setCode([]); }} disabled={code.length !== 4} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Guess ({c.left} left)</button>
            </div>
        </div>
    );
}

/** A word or a sum, typed; Enter sends. */
function Typed({ big, numeric, send }) {
    const [value, setValue] = useState('');
    const ref = useRef(null);
    useEffect(() => { ref.current?.focus(); }, []);
    return (
        <form className="mx-auto flex max-w-sm flex-col items-center gap-4" onSubmit={(e) => { e.preventDefault(); if (value.trim()) { send({ value }); setValue(''); } }}>
            <p className="rounded-2xl bg-slate-900 px-6 py-3 text-center text-3xl font-black tracking-wide text-white sm:text-4xl" data-prompt>{big}</p>
            <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} inputMode={numeric ? 'numeric' : 'text'} autoComplete="off" autoCapitalize="off" spellCheck="false"
                aria-label={numeric ? 'Your answer' : 'Type the word'} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-center text-2xl font-bold outline-none focus:border-indigo-500" />
            <button type="submit" disabled={!value.trim()} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>Enter</button>
        </form>
    );
}

function SpeedSort({ c, send }) {
    const [order, setOrder] = useState([]);
    const tap = (n) => {
        if (order.includes(n)) return;
        const next = [...order, n];
        setOrder(next);
        if (next.length === c.numbers.length) send({ order: next });
    };
    return (
        <div className="mx-auto max-w-md space-y-4" data-sort>
            <p className="text-center text-sm font-semibold text-slate-600">Tap them from smallest to largest.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
                {c.numbers.map((n) => (
                    <button key={n} type="button" onClick={() => tap(n)} disabled={order.includes(n)}
                        className={`min-w-16 rounded-2xl px-4 py-3 text-2xl font-black shadow-sm transition-transform ${order.includes(n) ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:-translate-y-0.5'}`}>
                        {n}{order.includes(n) && <span className="ml-1 text-xs align-top">{order.indexOf(n) + 1}</span>}
                    </button>
                ))}
            </div>
            <div className="flex justify-center"><button type="button" onClick={() => setOrder([])} disabled={!order.length} className={`${btn} bg-slate-100 text-slate-700`}><RotateCcw size={15} /> Start again</button></div>
        </div>
    );
}

function NumberBonds({ c, send }) {
    const [first, setFirst] = useState(null);
    const tap = (i) => {
        if (first === null) return setFirst(i);
        if (first === i) return setFirst(null);
        send({ a: first, b: i }); setFirst(null);
        return undefined;
    };
    return (
        <div className="mx-auto max-w-md space-y-4" data-bonds>
            <p className="text-center"><span className="text-sm font-semibold text-slate-600">Make</span> <span className="ml-1 rounded-xl bg-slate-900 px-4 py-1.5 text-3xl font-black text-white">{c.target}</span></p>
            <div className="grid grid-cols-3 gap-2.5">
                {c.tiles.map((n, i) => (
                    <button key={i} type="button" onClick={() => tap(i)} className={`rounded-2xl py-4 text-2xl font-black shadow-sm transition-transform hover:-translate-y-0.5 ${first === i ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}>{n}</button>
                ))}
            </div>
        </div>
    );
}

function MemoryMatch({ c, send }) {
    const cols = c.deck.length > 16 ? 5 : 4;
    return (
        <div className="mx-auto grid w-full max-w-sm gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-memory>
            {c.deck.map((face, i) => (
                <button key={i} type="button" onClick={() => face === null && send({ card: i })} disabled={face !== null && !c.open.includes(i)}
                    aria-label={face ? `Card ${i + 1}: ${face}` : `Card ${i + 1}, face down`}
                    className={`flex aspect-square items-center justify-center rounded-xl text-3xl transition-transform ${face ? (c.open.includes(i) ? 'bg-white ring-2 ring-indigo-400' : 'bg-emerald-50 opacity-70 ring-1 ring-emerald-200') : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md hover:-translate-y-0.5'}`}>
                    {face || <Sparkles size={18} className="text-white/60" />}
                </button>
            ))}
        </div>
    );
}

export default function RaceTable({ view, onAction, busy }) {
    const { left, share } = usePhaseClock(view);
    const info = GROUP_GAMES[view.game] || {};
    const c = view.current;
    const me = view.me;
    const seconds = Math.ceil(left / 1000);
    // A wrong try: a red flash for a moment (the clock redraws the table every 100 ms, so it clears itself).
    const mistakes = me?.mistakes || 0;
    // (Timed on the clock: `left` when it happened.)
    const [seen, setSeen] = useState({ mistakes, at: null });
    if (mistakes !== seen.mistakes) setSeen({ mistakes, at: mistakes > seen.mistakes ? left : null });
    const flash = seen.at !== null && seen.at - left < 700;
    const send = (extra) => { if (!busy && c) onAction({ type: ACTION[view.kind], stage: c.index, ...extra }).catch(() => {}); };
    const key = `${c?.index}:${me?.mistakes}`;
    const body = !c ? null
        : view.kind === 'lightsout' ? <LightsOut c={c} send={send} />
            : view.kind === 'codebreaker' ? <CodeBreaker key={c.index} c={c} send={send} />
                : view.kind === 'typingsprint' ? <Typed key={key} big={c.word} send={send} />
                    : view.kind === 'mathsprint' ? <Typed key={key} big={`${c.text} = ?`} numeric send={send} />
                        : view.kind === 'speedsort' ? <SpeedSort key={key} c={c} send={send} />
                            : view.kind === 'numberbonds' ? <NumberBonds key={key} c={c} send={send} />
                                : view.kind === 'memorymatch' ? <MemoryMatch c={c} send={send} /> : null;
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4" data-race-table={view.game} data-phase={view.phase}>
            {view.phase === 'ready' && view.status === 'active' && (
                <section className={`rounded-3xl bg-gradient-to-br ${info.tone || 'from-indigo-500 to-violet-600'} p-8 text-center text-white shadow-lg`} data-ready>
                    <p className="text-5xl">{info.emoji}</p>
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Get ready</p>
                    <p className="mt-1 text-6xl font-black tabular-nums">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-sm text-white/90">{info.blurb} {view.total} to do — everyone gets the same ones.</p>
                </section>
            )}
            {view.phase === 'play' && view.status === 'active' && (
                <section className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-colors ${flash ? 'border-rose-400' : 'border-slate-200'}`} data-race>
                    <div className={`bg-gradient-to-r ${info.tone || 'from-indigo-500 to-violet-600'} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">{me?.done ? 'All done!' : `${view.kind === 'memorymatch' ? 'Pairs' : 'Puzzle'} ${Math.min((me?.stage || 0) + 1, view.total)} of ${view.total}`}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ${seconds <= 10 ? 'bg-white text-rose-600' : 'bg-white/20'}`}><Timer size={14} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-white transition-[width] duration-300" style={{ width: `${(Math.min(me?.stage || 0, view.total) / view.total) * 100}%` }} /></div>
                    </div>
                    <div className="h-1 bg-slate-100"><div className={`h-full ${share < 0.2 ? 'bg-rose-500' : 'bg-indigo-400'}`} style={{ width: `${share * 100}%` }} /></div>
                    <div className="p-5 sm:p-7">
                        {me?.done
                            ? <p className="flex flex-col items-center gap-2 py-6 text-center text-lg font-black text-emerald-700"><Check size={36} className="rounded-full bg-emerald-100 p-1.5" /> Finished! Waiting for the others…</p>
                            : body}
                        {flash && <p className="mt-3 text-center text-sm font-black text-rose-600" role="status">Not quite — try again.</p>}
                    </div>
                </section>
            )}
            {view.status !== 'active' && view.review && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-review>
                    <h3 className="text-base font-black text-slate-900">The answers</h3>
                    <ol className="mt-2 space-y-1 text-sm text-slate-700">{view.review.map((r, i) => <li key={i}><span className="font-bold">{r.title} {i + 1}:</span> {r.solution}</li>)}</ol>
                </section>
            )}
        </div>
    );
}

const ACTION = { lightsout: 'tap', codebreaker: 'guess', typingsprint: 'type', speedsort: 'sort', numberbonds: 'pair', mathsprint: 'answer', memorymatch: 'flip' };
