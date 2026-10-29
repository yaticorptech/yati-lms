import { Timer, Crown } from 'lucide-react';
import usePhaseClock from './usePhaseClock';
import { GROUP_GAMES } from '../api';

/**
 * The table for the group games for two played in turns (2026-10-29): Tic-Tac-Toe and Last Stone (server
 * games/turns.js). Both players across the top with their round wins, whose turn it is and its clock, then
 * the board: the grid, or the pile of stones and the take one / two / three buttons. Best of five rounds.
 */
const MARK = ['✕', '◯'];

export default function TurnTable({ view, onAction, busy }) {
    const info = GROUP_GAMES[view.game] || {};
    const { left, share } = usePhaseClock({ status: view.status, phaseStartedAt: view.turnStartedAt, phaseEndsAt: view.turnStartedAt + view.turnMs, serverNow: view.serverNow });
    const seconds = Math.ceil(left / 1000);
    const active = view.status === 'active';
    const can = view.canMove && !busy;
    const move = (extra) => { if (can) onAction({ type: 'move', ...extra }).catch(() => {}); };
    return (
        <div className="mx-auto w-full max-w-xl space-y-4" data-turn-table={view.game}>
            {/* The two players: round wins, whose turn. */}
            <div className="grid grid-cols-2 gap-3">
                {view.seats.map((s, i) => {
                    const turn = active && view.turn === i;
                    const lead = !active && view.wins[i] > view.wins[1 - i];
                    return (
                        <div key={i} className={`relative rounded-2xl border-2 bg-white p-3 shadow-sm transition-colors ${turn ? '' : 'border-slate-200'}`} style={turn ? { borderColor: s.color, boxShadow: `0 0 0 3px ${s.color}33` } : undefined} data-turn-seat={i}>
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: s.color }}>{lead ? <Crown size={18} /> : view.game === 'tictactoe' ? MARK[i] : (s.name || '?')[0]}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-black text-slate-900">{s.name}{view.you === i && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] text-white" style={{ background: s.color }}>YOU</span>}</span>
                                    <span className="block text-[11px] font-bold text-slate-500">{turn ? 'Their move' : 'Waiting'}</span>
                                </span>
                                <span className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{view.wins[i]}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className={`flex items-center justify-between gap-3 bg-gradient-to-r ${info.tone || 'from-indigo-500 to-violet-600'} px-5 py-3 text-white`}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">Round {view.round} of {view.rounds} · first to {view.toWin}</p>
                    {active && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ${seconds <= 5 ? 'bg-white text-rose-600' : 'bg-white/20'}`}><Timer size={14} /> {seconds}s</span>}
                </div>
                {active && <div className="h-1 bg-slate-100"><div className={`h-full ${share < 0.25 ? 'bg-rose-500' : 'bg-indigo-400'}`} style={{ width: `${share * 100}%` }} /></div>}
                <div className="p-5 sm:p-7">
                    <p className="mb-4 text-center text-sm font-bold text-slate-600" data-turn-status>
                        {!active ? view.message : view.canMove ? 'Your move.' : `${view.seats[view.turn]?.name} is thinking…`}
                    </p>
                    {view.game === 'tictactoe' ? (
                        <div className="mx-auto grid max-w-[18rem] grid-cols-3 gap-2" data-ttt>
                            {view.board.map((x, i) => (
                                <button key={i} type="button" onClick={() => x === null && move({ cell: i })} disabled={!can || x !== null} aria-label={`Square ${i + 1}${x !== null ? `: ${MARK[x]}` : ''}`}
                                    className={`flex aspect-square items-center justify-center rounded-2xl text-5xl font-black transition-colors ${x === null ? `bg-slate-50 ring-1 ring-slate-200 ${can ? 'hover:bg-indigo-50' : ''}` : 'bg-white ring-1 ring-slate-200'}`}
                                    style={x !== null ? { color: view.seats[x].color } : undefined}>
                                    {x !== null && MARK[x]}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-5" data-stones>
                            <div className="flex min-h-24 flex-wrap items-end justify-center gap-1.5">
                                {Array.from({ length: view.board.left }, (_, i) => <span key={i} className="h-8 w-8 rounded-full bg-gradient-to-b from-stone-300 to-stone-500 shadow-[inset_0_-3px_4px_rgba(0,0,0,.25),0_2px_3px_rgba(0,0,0,.2)]" />)}
                                {!view.board.left && <p className="text-sm font-bold text-slate-400">No stones left</p>}
                            </div>
                            <p className="text-center text-sm font-black text-slate-700">{view.board.left} stone{view.board.left === 1 ? '' : 's'} left · take 1, 2 or 3 · the last stone wins</p>
                            <div className="flex justify-center gap-2.5">
                                {[1, 2, 3].map((n) => (
                                    <button key={n} type="button" onClick={() => move({ take: n })} disabled={!can || n > view.board.left}
                                        className="min-w-20 rounded-2xl bg-indigo-600 px-4 py-3 text-lg font-black text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40">Take {n}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
