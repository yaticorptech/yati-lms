import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Timer, X, CheckCircle2, Pencil } from 'lucide-react';
import usePhaseClock from './usePhaseClock';

/**
 * Sudoku Challenge (Group Brain): every player solves the same puzzle on
 * their own board. Pick a cell, then a number (the pad, or keys 1–9; arrow
 * keys move). Every number goes to the server, which keeps it if it is right
 * and counts a mistake if not. Notes (small pencil marks) stay in this
 * browser. The others' boards are never sent — only how far along they are.
 */
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function SudokuTable({ view, onAction, busy }) {
    const [sel, setSel] = useState(null);
    const [notes, setNotes] = useState({});
    const [noting, setNoting] = useState(false);
    // The game's clock, on the server's time (the shared phase clock, the whole game one phase).
    const { left } = usePhaseClock({ status: view.status, phaseEndsAt: view.endsAt, phaseStartedAt: view.startedAt, serverNow: view.serverNow });

    const board = view.board || view.puzzle;
    const over = view.status !== 'active';
    const me = view.you != null ? view.players[view.you] : null;
    const value = (i) => board[i] || (over && view.solution ? view.solution[i] : 0);

    const place = (digit) => {
        if (sel == null || !view.canPlay || busy || view.puzzle[sel] || board[sel]) return;
        if (noting) {
            setNotes((n) => { const cur = new Set(n[sel] || []); if (cur.has(digit)) cur.delete(digit); else cur.add(digit); return { ...n, [sel]: [...cur].sort() }; });
            return;
        }
        onAction({ type: 'place', cell: sel, digit }).then(() => setNotes((n) => ({ ...n, [sel]: [] }))).catch(() => {});
    };
    const hint = () => onAction({ type: 'hint', ...(sel != null && !board[sel] ? { cell: sel } : {}) }).catch(() => {});

    const placeRef = useRef(place);
    useEffect(() => { placeRef.current = place; });
    useEffect(() => {
        const onKey = (e) => {
            if (/input|textarea|select/i.test(e.target?.tagName)) return;
            if (/^[1-9]$/.test(e.key)) { placeRef.current(Number(e.key)); return; }
            const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
            if (move) { e.preventDefault(); setSel((s) => (s == null ? 0 : Math.min(80, Math.max(0, s + move)))); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const related = (i) => sel != null && (Math.floor(i / 9) === Math.floor(sel / 9) || i % 9 === sel % 9
        || (Math.floor(i / 27) === Math.floor(sel / 27) && Math.floor((i % 9) / 3) === Math.floor((sel % 9) / 3)));
    const same = sel != null && value(sel) ? value(sel) : null;

    return (
        <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]" data-sudoku>
            <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold capitalize text-indigo-700">{view.difficulty}</span>
                    {!over && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-black tabular-nums ${left < 60000 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`} data-timer><Timer size={14} aria-hidden="true" /> {fmt(left)}</span>}
                    {me && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${me.mistakes ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`} data-mistakes={me.mistakes}><X size={14} aria-hidden="true" /> Mistakes {me.mistakes}/{view.maxMistakes}</span>}
                </div>
                <div className="mx-auto grid aspect-square w-full max-w-[30rem] grid-cols-9 overflow-hidden rounded-xl border-2 border-slate-800" role="grid" aria-label="Sudoku">
                    {Array.from({ length: 81 }, (_, i) => {
                        const given = !!view.puzzle[i];
                        const v = value(i);
                        const fromSolution = over && !board[i] && v;
                        const r = Math.floor(i / 9); const c = i % 9;
                        const bg = sel === i ? 'bg-indigo-200' : same && v === same ? 'bg-indigo-100' : related(i) ? 'bg-slate-100' : 'bg-white';
                        return (
                            <button key={i} type="button" onClick={() => setSel(i)} data-cell={i} aria-label={`Row ${r + 1}, column ${c + 1}${v ? `: ${v}` : ', empty'}`}
                                className={`relative flex items-center justify-center border-slate-300 text-lg font-bold tabular-nums sm:text-2xl ${bg} ${c % 3 === 2 && c < 8 ? 'border-r-2 border-r-slate-800' : c < 8 ? 'border-r' : ''} ${r % 3 === 2 && r < 8 ? 'border-b-2 border-b-slate-800' : r < 8 ? 'border-b' : ''} ${given ? 'text-slate-900' : fromSolution ? 'text-rose-500' : 'text-indigo-600'}`}>
                                {v ? v : notes[i]?.length ? <span className="grid h-full w-full grid-cols-3 p-0.5 text-[8px] font-semibold leading-none text-slate-400 sm:text-[10px]">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <span key={d} className="flex items-center justify-center">{notes[i].includes(d) ? d : ''}</span>)}</span> : ''}
                            </button>
                        );
                    })}
                </div>
                {view.canPlay && (
                    <div className="mx-auto mt-3 max-w-[30rem] space-y-2">
                        <div className="grid grid-cols-9 gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                                const done = board.filter((x) => x === d).length >= 9;
                                return <button key={d} type="button" onClick={() => place(d)} disabled={busy || done} data-digit={d} className="h-11 rounded-xl bg-indigo-50 text-lg font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-30">{d}</button>;
                            })}
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button type="button" onClick={() => setNoting((n) => !n)} aria-pressed={noting} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ring-1 ${noting ? 'bg-slate-900 text-white ring-slate-900' : 'text-slate-600 ring-slate-200 hover:bg-slate-50'}`}><Pencil size={14} aria-hidden="true" /> Notes {noting ? 'on' : 'off'}</button>
                            <button type="button" onClick={hint} disabled={busy || !view.hintsLeft} data-hint className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-40"><Lightbulb size={14} aria-hidden="true" /> Hint ({view.hintsLeft} left, −15)</button>
                        </div>
                    </div>
                )}
                {!view.canPlay && me && !over && <p className="mt-3 text-center text-sm font-bold text-slate-600">{me.finished ? 'You finished! Waiting for the others…' : me.closed ? 'Too many mistakes: your board is closed.' : ''}</p>}
                {over && <p className="mt-3 text-center text-sm text-slate-500">Numbers in red are the solution's, for the cells left empty.</p>}
            </section>
            <aside className="space-y-2" aria-label="Players">
                {view.seats.map((s, i) => {
                    const p = view.players[i];
                    const pct = Math.round((100 * p.filled) / Math.max(1, p.of));
                    return (
                        <div key={i} className={`rounded-2xl border bg-white p-3 shadow-sm ${view.you === i ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'} ${p.left ? 'opacity-50' : ''}`} data-player={i}>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{s.name}{view.you === i ? ' (you)' : ''}</span>
                                <span className="text-lg font-black tabular-nums text-slate-900">{view.scores[i]}</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${pct}%` }} /></div>
                            <p className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <span>{p.finished ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={12} aria-hidden="true" /> Finished</span> : p.closed ? 'Board closed' : p.left ? 'Left' : `${p.filled}/${p.of} cells`}</span>
                                <span>{p.mistakes} mistake{p.mistakes === 1 ? '' : 's'}</span>
                            </p>
                        </div>
                    );
                })}
            </aside>
        </div>
    );
}
