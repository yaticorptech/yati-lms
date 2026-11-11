import { useMemo } from 'react';
import { Sparkles, Eye, Hand, Trophy } from 'lucide-react';
import { Scoreboard } from './QuizTable';
import usePhaseClock from './usePhaseClock';

/**
 * What the round-based Group Brain games share (the server's
 * competitions/games/roundCore.js): Memory Matrix and Sequence & Reaction. This draws the scores, the countdown before round 1, the
 * round's header with its phase and clock, and after each round every
 * player's points; the game's own board goes inside, given the time left.
 *
 * Everything comes from `view`. While a round is open it carries only what
 * a player may see (the cells while they show, never another player's
 * answer); the reveal brings the answers and `results`.
 */

const ROUND_THEMES = {
    memorymatrix: { from: 'from-sky-600', to: 'to-indigo-600', ring: 'ring-sky-200', text: 'text-sky-700', soft: 'bg-sky-50', bar: 'bg-sky-500' },
    sequence: { from: 'from-pink-600', to: 'to-rose-600', ring: 'ring-rose-200', text: 'text-rose-700', soft: 'bg-rose-50', bar: 'bg-rose-500' }
};

const PHASE = {
    show: { label: 'Watch', icon: Eye },
    answer: { label: 'Your turn', icon: Hand },
    reveal: { label: 'Results', icon: Trophy }
};

/**
 * The frame. `children(clock)` draws the board, with `clock` the ms left in
 * this phase and its share of the phase. `detail(result, i)` says in a few
 * words what a player's round was ("4 of 5 cells").
 */
export default function RoundFrame({ view, title, intro, children, detail, wide = false }) {
    const theme = ROUND_THEMES[view.game] || ROUND_THEMES.memorymatrix;
    // The dark room (2026-11-02): the page sets view.dark for the group games with no design of their own.
    const dark = !!view.dark;
    const clock = usePhaseClock(view);
    const seconds = Math.ceil(clock.left / 1000);
    const segments = useMemo(() => Array.from({ length: view.total || 0 }, (_, i) => i), [view.total]);
    const phase = PHASE[view.phase];
    const Icon = phase?.icon;

    return (
        // `wide`: every player's board is drawn inside (Memory Matrix), each with its points, so no scoreboard row.
        <div className={`mx-auto w-full space-y-4 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`} data-round-table={view.game} data-phase={view.phase}>
            {!wide && !(view.liveBoard && view.status === 'active') && <Scoreboard view={view} theme={theme} dark={dark} />}

            {view.phase === 'ready' && view.status === 'active' && (
                <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-8 text-center text-white ${dark ? 'shadow-[0_30px_60px_-20px_rgba(0,0,0,.9),0_0_50px_rgba(99,102,241,.25),inset_0_1px_0_rgba(255,255,255,.25)]' : 'shadow-lg'}`} data-ready>
                    <Sparkles size={28} className="mx-auto opacity-80" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Get ready</p>
                    <p className="mt-1 text-7xl font-black tabular-nums" aria-live="polite">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-sm text-white/85">{view.total} rounds{intro ? ` · ${intro}` : ''}</p>
                </section>
            )}

            {view.round && (
                <section className={dark ? 'overflow-hidden rounded-3xl border border-[#4b46b8]/50 bg-[#10142f]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,.85),0_0_40px_rgba(99,102,241,.12)]' : 'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'} data-round={view.number}>
                    <div className={`bg-gradient-to-r ${theme.from} ${theme.to} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">Round {view.number} of {view.total}{title ? ` · ${title}` : ''}</p>
                            <span className="inline-flex items-center gap-1.5">
                                {phase && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold"><Icon size={13} aria-hidden="true" /> {phase.label}</span>}
                            </span>
                        </div>
                        <div className="mt-2.5 flex gap-1" aria-hidden="true">
                            {segments.map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < view.number - 1 ? 'bg-white' : i === view.number - 1 ? 'bg-white/70' : 'bg-white/25'}`} />)}
                        </div>
                    </div>
                    {view.phase === 'answer' && (
                        <div className={`h-1.5 ${dark ? 'bg-white/10' : 'bg-slate-100'}`} aria-hidden="true">
                            <div className={`h-full ${clock.share < 0.25 ? 'bg-rose-500' : theme.bar} transition-[width] duration-100 ease-linear`} style={{ width: `${clock.share * 100}%` }} />
                        </div>
                    )}
                    <div className="space-y-4 p-4 sm:p-6">
                        {children(clock, theme)}
                        {view.phase === 'reveal' && view.results && (
                            // On a phone the live scoreboard above already lists everyone (2026-11-06): this second list only on wider screens.
                            <ul className="hidden gap-2 sm:grid sm:grid-cols-2" data-round-results>
                                {view.seats.map((s, i) => {
                                    const r = view.results[i];
                                    if (!r) return null;
                                    return (
                                        <li key={i} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 ${r.correct ? (dark ? 'bg-emerald-500/15 ring-emerald-400/40' : 'bg-emerald-50 ring-emerald-200') : dark ? 'bg-white/[.05] ring-white/10' : 'bg-slate-50 ring-slate-200'}`}>
                                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                                            <span className={`min-w-0 flex-1 truncate font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{s.name}{view.you === i ? ' (you)' : ''}</span>
                                            <span className={`text-xs ${dark ? 'text-[#a5a9da]' : 'text-slate-500'}`}>{detail ? detail(r, i) : ''}</span>
                                            <span className={`w-12 text-right font-black tabular-nums ${r.points > 0 ? (dark ? 'text-emerald-300' : 'text-emerald-700') : r.points < 0 ? (dark ? 'text-rose-300' : 'text-rose-700') : dark ? 'text-white/40' : 'text-slate-400'}`}>{r.points > 0 ? `+${r.points}` : r.points}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {view.message && <p className={`text-center text-sm font-semibold ${dark ? 'text-[#c7c9e4]' : 'text-slate-600'}`} aria-live="polite">{view.message}</p>}
                    </div>
                </section>
            )}
        </div>
    );
}
