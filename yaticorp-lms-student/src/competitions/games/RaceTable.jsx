import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Delete, Sparkles } from 'lucide-react';
import usePhaseClock from './usePhaseClock';
import useWrongBuzz from './useWrongBuzz';
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

function LightsOut({ c, send, dark }) {
    return (
        <div className="mx-auto grid w-full max-w-xs gap-2" style={{ gridTemplateColumns: `repeat(${c.n}, minmax(0, 1fr))` }} data-lights>
            {c.board.map((on, i) => (
                <button key={i} type="button" onClick={() => send({ cell: i })} aria-label={`Light ${i + 1}, ${on ? 'on' : 'off'}`}
                    className={`aspect-square rounded-xl transition-[background-color,box-shadow] duration-150 ${on ? 'bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,.8)]' : 'bg-slate-800'}`} />
            ))}
            <p className={`col-span-full mt-1 text-center text-xs font-semibold ${dark ? 'text-white/60' : 'text-slate-500'}`}>Taps: {c.taps}</p>
        </div>
    );
}

function CodeBreaker({ c, send, dark }) {
    const [code, setCode] = useState([]);
    const add = (col) => setCode((x) => (x.length < 4 ? [...x, col] : x));
    return (
        <div className="mx-auto max-w-md space-y-4" data-code>
            <ol className="space-y-1.5">
                {c.guesses.map((g, i) => (
                    <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${dark ? 'bg-white/[.06]' : 'bg-slate-50'}`}>
                        <span className={`w-5 text-xs font-black ${dark ? 'text-white/40' : 'text-slate-400'}`}>{i + 1}</span>
                        <span className="flex gap-1.5">{g.code.map((p, k) => <span key={k} className="h-6 w-6 rounded-full shadow-inner" style={{ background: PEG[p] }} />)}</span>
                        <span className={`ml-auto text-xs font-bold ${dark ? 'text-white/70' : 'text-slate-600'}`}>{g.exact} right place · {g.near} wrong place</span>
                    </li>
                ))}
            </ol>
            <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3].map((k) => <span key={k} className={`h-10 w-10 rounded-full border-2 border-dashed ${dark ? 'border-white/30' : 'border-slate-300'}`} style={code[k] ? { background: PEG[code[k]], borderStyle: 'solid', borderColor: PEG[code[k]] } : undefined} />)}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {c.colours.map((col) => <button key={col} type="button" onClick={() => add(col)} aria-label={col} className="h-10 w-10 rounded-full shadow-md transition-transform hover:scale-110" style={{ background: PEG[col] }} />)}
            </div>
            <div className="flex justify-center gap-2">
                <button type="button" onClick={() => setCode((x) => x.slice(0, -1))} disabled={!code.length} className={`${btn} ${dark ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-slate-100 text-slate-700'}`}><Delete size={16} /> Undo</button>
                <button type="button" onClick={() => { send({ code }); setCode([]); }} disabled={code.length !== 4} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Guess ({c.left} left)</button>
            </div>
        </div>
    );
}

/** A word or a sum, typed; Enter sends. */
function Typed({ big, numeric, send, dark, paused }) {
    const [value, setValue] = useState('');
    const ref = useRef(null);
    useEffect(() => { ref.current?.focus(); }, []);
    return (
        <form className="mx-auto flex max-w-sm flex-col items-center gap-4" onSubmit={(e) => { e.preventDefault(); if (value.trim() && !paused) { send({ value }); setValue(''); } }}>
            <p className="rounded-2xl bg-slate-900 px-6 py-3 text-center text-3xl font-black tracking-wide text-white sm:text-4xl" data-prompt>{big}</p>
            <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} inputMode={numeric ? 'numeric' : 'text'} autoComplete="off" autoCapitalize="off" spellCheck="false"
                aria-label={numeric ? 'Your answer' : 'Type the word'} className={`w-full rounded-2xl border-2 px-4 py-3 text-center text-2xl font-bold outline-none focus:border-indigo-500 ${dark ? 'border-white/20 bg-white/10 text-white placeholder:text-white/30' : 'border-slate-200'}`} />
            <button type="submit" disabled={!value.trim() || paused} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>Enter</button>
        </form>
    );
}

function SpeedSort({ c, send, dark }) {
    const [order, setOrder] = useState([]);
    const tap = (n) => {
        if (order.includes(n)) return;
        const next = [...order, n];
        setOrder(next);
        if (next.length === c.numbers.length) send({ order: next });
    };
    return (
        <div className="mx-auto max-w-md space-y-4" data-sort>
            <p className={`text-center text-sm font-semibold ${dark ? 'text-[#c7c9e4]' : 'text-slate-600'}`}>Tap them from smallest to largest.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
                {c.numbers.map((n) => (
                    <button key={n} type="button" onClick={() => tap(n)} disabled={order.includes(n)}
                        className={`min-w-16 rounded-2xl px-4 py-3 text-2xl font-black shadow-sm transition-transform ${order.includes(n) ? 'bg-emerald-100 text-emerald-700' : `bg-gradient-to-b from-white to-slate-200 text-slate-900 ring-1 ring-slate-200 hover:-translate-y-0.5 ${dark ? 'shadow-[0_8px_18px_-8px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.9)]' : ''}`}`}>
                        {n}{order.includes(n) && <span className="ml-1 text-xs align-top">{order.indexOf(n) + 1}</span>}
                    </button>
                ))}
            </div>
            <div className="flex justify-center"><button type="button" onClick={() => setOrder([])} disabled={!order.length} className={`${btn} ${dark ? 'bg-white/10 text-white/80 hover:bg-white/15' : 'bg-slate-100 text-slate-700'}`}><RotateCcw size={15} /> Start again</button></div>
        </div>
    );
}

function NumberBonds({ c, send, dark }) {
    const [first, setFirst] = useState(null);
    const tap = (i) => {
        if (first === null) return setFirst(i);
        if (first === i) return setFirst(null);
        send({ a: first, b: i }); setFirst(null);
        return undefined;
    };
    return (
        <div className="mx-auto max-w-md space-y-4" data-bonds>
            <p className="text-center"><span className={`text-sm font-semibold ${dark ? 'text-[#c7c9e4]' : 'text-slate-600'}`}>Make</span> <span className="ml-1 rounded-xl bg-slate-900 px-4 py-1.5 text-3xl font-black text-white">{c.target}</span></p>
            <div className="grid grid-cols-3 gap-2.5">
                {c.tiles.map((n, i) => (
                    <button key={i} type="button" onClick={() => tap(i)} className={`rounded-2xl py-4 text-2xl font-black shadow-sm transition-transform hover:-translate-y-0.5 ${first === i ? 'bg-indigo-600 text-white shadow-[0_0_18px_rgba(99,102,241,.5)]' : `bg-gradient-to-b from-white to-slate-200 text-slate-900 ring-1 ring-slate-200 ${dark ? 'shadow-[0_8px_18px_-8px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.9)]' : ''}`}`}>{n}</button>
                ))}
            </div>
        </div>
    );
}

function MemoryMatch({ c, send, wrong }) {
    const cols = c.deck.length > 16 ? 5 : 4;
    // A wrong pair turns back as soon as its red flash is over (2026-11-07, as in the solo Memory Match), not at the
    // next tap: the server keeps it open until then, so here it is drawn face down (a tap on it still turns it).
    const turnedBack = !wrong && c.open.length === 2;
    const deck = turnedBack ? c.deck.map((f, i) => (c.open.includes(i) ? null : f)) : c.deck;
    return (
        <div className="mx-auto grid w-full max-w-sm gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-memory>
            {deck.map((face, i) => (
                <button key={i} type="button" onClick={() => face === null && send({ card: i })} disabled={face !== null && !c.open.includes(i)}
                    aria-label={face ? `Card ${i + 1}: ${face}` : `Card ${i + 1}, face down`}
                    className={`flex aspect-square items-center justify-center rounded-xl text-3xl transition-transform ${face ? (c.open.includes(i) ? (wrong ? 'gs-wrong bg-rose-50 ring-2 ring-rose-500' : 'bg-white ring-2 ring-indigo-400') : 'bg-emerald-50 opacity-70 ring-1 ring-emerald-200') : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md hover:-translate-y-0.5'}`}>
                    {face || <Sparkles size={18} className="text-white/60" />}
                </button>
            ))}
        </div>
    );
}

export default function RaceTable({ view, onAction, busy }) {
    // The dark room (2026-11-02): the page sets view.dark for the group games with no design of their own.
    const dark = !!view.dark;
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
    // The wrong answer (2026-11-06): the buzz, the try in red, and a moment's pause before the next. The same
    // puzzle stays open to try again, so the right answer is never shown here (only in the review at the end).
    // Memory Match: no buzz (2026-11-07) — the red flash and the cards turning back are enough.
    useWrongBuzz(flash && view.kind !== 'memorymatch' ? mistakes : null);
    const [lastTry, setLastTry] = useState(null);
    const send = (extra) => {
        if (busy || flash || !c) return;
        setLastTry(extra);
        onAction({ type: ACTION[view.kind], stage: c.index, ...extra }).catch(() => {});
    };
    const triedText = flash && typeof lastTry?.value === 'string' ? lastTry.value.trim() : '';
    const key = `${c?.index}:${me?.mistakes}`;
    const body = !c ? null
        : view.kind === 'lightsout' ? <LightsOut c={c} send={send} dark={dark} />
            : view.kind === 'codebreaker' ? <CodeBreaker key={c.index} c={c} send={send} dark={dark} />
                : view.kind === 'typingsprint' ? <Typed key={key} big={c.word} send={send} dark={dark} paused={flash} />
                    : view.kind === 'mathsprint' ? <Typed key={key} big={`${c.text} = ?`} numeric send={send} dark={dark} paused={flash} />
                        : view.kind === 'speedsort' ? <SpeedSort key={key} c={c} send={send} dark={dark} />
                            : view.kind === 'numberbonds' ? <NumberBonds key={key} c={c} send={send} dark={dark} />
                                : view.kind === 'memorymatch' ? <MemoryMatch c={c} send={send} wrong={flash && c.open?.length === 2} /> : null;
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4" data-race-table={view.game} data-phase={view.phase}>
            {view.phase === 'ready' && view.status === 'active' && (
                <section className={`rounded-3xl bg-gradient-to-br ${info.tone || 'from-indigo-500 to-violet-600'} p-8 text-center text-white ${dark ? 'shadow-[0_30px_60px_-20px_rgba(0,0,0,.9),0_0_50px_rgba(99,102,241,.25),inset_0_1px_0_rgba(255,255,255,.25)]' : 'shadow-lg'}`} data-ready>
                    <p className="text-5xl">{info.emoji}</p>
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Get ready</p>
                    <p className="mt-1 text-6xl font-black tabular-nums">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-sm text-white/90">{info.blurb} {view.total} to do — everyone gets the same ones.</p>
                </section>
            )}
            {view.phase === 'play' && view.status === 'active' && (
                <section className={`overflow-hidden rounded-3xl border-2 transition-colors ${dark ? `bg-[#10142f]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,.85),0_0_40px_rgba(99,102,241,.12)] ${flash ? 'border-rose-400' : 'border-[#4b46b8]/50'}` : `bg-white shadow-sm ${flash ? 'border-rose-400' : 'border-slate-200'}`}`} data-race>
                    <div className={`bg-gradient-to-r ${info.tone || 'from-indigo-500 to-violet-600'} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">{me?.done ? 'All done!' : `${view.kind === 'memorymatch' ? 'Pairs' : 'Puzzle'} ${Math.min((me?.stage || 0) + 1, view.total)} of ${view.total}`}</p>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full bg-white transition-[width] duration-300" style={{ width: `${(Math.min(me?.stage || 0, view.total) / view.total) * 100}%` }} /></div>
                    </div>
                    <div className={`h-1 ${dark ? 'bg-white/10' : 'bg-slate-100'}`}><div className={`h-full ${share < 0.2 ? 'bg-rose-500' : 'bg-indigo-400'}`} style={{ width: `${share * 100}%` }} /></div>
                    <div className="p-5 sm:p-7">
                        {me?.done
                            ? <p className={`flex flex-col items-center gap-2 py-6 text-center text-lg font-black ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}><Check size={36} className={`rounded-full p-1.5 ${dark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`} /> Finished! Waiting for the others…</p>
                            : <div className={flash ? 'pointer-events-none' : ''} aria-busy={flash || undefined}>{body}</div>}
                        {/* Memory Match: the buzz alone (2026-11-07), no words under the cards. */}
                        {flash && view.kind !== 'memorymatch' && <p className={`mt-3 text-center text-sm font-black ${dark ? 'text-rose-300' : 'text-rose-600'}`} role="status">
                            {triedText && <span className="gs-wrong mr-2 inline-block rounded-lg bg-rose-500 px-2.5 py-0.5 text-white line-through decoration-white/70">{triedText}</span>}
                            Not quite — try again.
                        </p>}
                    </div>
                </section>
            )}
            {view.status !== 'active' && view.review && (
                <section className={`rounded-3xl border p-5 shadow-sm ${dark ? 'border-[#4b46b8]/50 bg-[#141845]/85' : 'border-slate-200 bg-white'}`} data-review>
                    <h3 className={`text-base font-black ${dark ? 'text-white' : 'text-slate-900'}`}>The answers</h3>
                    <ol className={`mt-2 space-y-1 text-sm ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{view.review.map((r, i) => <li key={i}><span className="font-bold">{r.title} {i + 1}:</span> {r.solution}</li>)}</ol>
                </section>
            )}
        </div>
    );
}

const ACTION = { lightsout: 'tap', codebreaker: 'guess', typingsprint: 'type', speedsort: 'sort', numberbonds: 'pair', mathsprint: 'answer', memorymatch: 'flip' };
