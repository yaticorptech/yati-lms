import { useState } from 'react';
import { Check, RotateCcw, Send, Timer, CheckCircle2 } from 'lucide-react';
import RoundFrame from './RoundTable';
import usePhaseClock from './usePhaseClock';

/**
 * Memory Matrix (Group Brain), played in the open (asked 2026-10-28): every
 * player's grid is on every screen, one in each corner, the time left in the
 * middle. The lit cells show on all of them while the server says "show";
 * then each player taps their cells on their own grid — each tap is sent at
 * once (`pick`), so the others watch it happen — and sends them. The reveal
 * marks every grid: right cells green, wrong ones red.
 */
const Face = ({ src, name, color }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ boxShadow: `0 0 0 2.5px ${color}` }} />
        : <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: color }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

/** One player's grid, with their name, points and how far they are. */
const PlayerGrid = ({ view, r, i, picks, onCell, canPick, big }) => {
    const seat = view.seats[i];
    const color = seat.color;
    const you = view.you === i;
    const sentCells = view.answers?.[i]?.cells || null;
    const sent = !!view.answers?.[i];
    const chosenList = sentCells || picks;
    const left = (view.out || []).includes(i);
    const result = view.phase === 'reveal' ? view.results?.[i] : null;
    return (
        <div className={`flex min-w-0 flex-col rounded-3xl bg-white p-3 shadow-sm ring-2 sm:p-4 ${left ? 'opacity-50' : ''}`} style={{ '--tw-ring-color': you ? color : `${color}40` }} data-player-grid={i}>
            <div className="mb-3 flex items-center gap-2.5">
                <Face src={view.avatars?.[i]} name={seat.name} color={color} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{seat.name}{you && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: color }}>YOU</span>}</p>
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        {left ? 'Left the game'
                            : result ? `${result.detail?.hits ?? 0} of ${result.detail?.of ?? r.count} right · ${result.points > 0 ? '+' : ''}${result.points}`
                                : view.phase === 'show' ? 'Watching…'
                                    : sent ? <><CheckCircle2 size={12} className="text-emerald-600" aria-hidden="true" /> Sent</>
                                        : view.phase === 'answer' ? `Picking ${you ? chosenList.length : (r.pickCounts?.[i] ?? chosenList.length)}/${r.count}` : ''}
                    </p>
                </div>
                <span className="shrink-0 rounded-xl px-2.5 py-1 text-center" style={{ background: `${color}14` }}>
                    <span className="block text-base font-black leading-none tabular-nums" style={{ color }}>{view.scores?.[i] ?? 0}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">pts</span>
                </span>
            </div>
            <div className={`mx-auto grid w-full gap-1 sm:gap-1.5 ${big ? 'max-w-sm' : 'max-w-[15rem]'}`} style={{ gridTemplateColumns: `repeat(${r.size}, minmax(0, 1fr))` }} role="grid" aria-label={`${seat.name}'s grid`}>
                {Array.from({ length: r.size * r.size }, (_, c) => {
                    const lit = r.cells?.includes(c);
                    const chosen = chosenList.includes(c);
                    let style;
                    let tone = 'bg-slate-100';
                    if (view.phase === 'show' && lit) tone = 'bg-sky-500 shadow-[0_0_14px_rgba(14,165,233,0.55)]';
                    else if (view.phase === 'answer' && chosen) { tone = ''; style = { background: color }; }
                    else if (view.phase === 'reveal' || view.phase === 'over') tone = lit && chosen ? 'bg-emerald-500' : lit ? 'bg-emerald-200 ring-2 ring-emerald-500' : chosen ? 'bg-rose-400' : 'bg-slate-100';
                    const mine = you && canPick && !sent;
                    return (
                        <button key={c} type="button" onClick={() => mine && onCell(c)} disabled={!mine} data-cell={you ? c : undefined}
                            aria-pressed={chosen} aria-label={`Cell ${Math.floor(c / r.size) + 1}, ${(c % r.size) + 1}`}
                            className={`aspect-square rounded-md transition-colors duration-150 disabled:cursor-default ${mine && !chosen ? 'hover:bg-slate-200' : ''} ${tone}`} style={style}>
                            {(view.phase === 'reveal' && lit && chosen) && <Check size={14} className="mx-auto text-white" aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function MemoryMatrixTable({ view, onAction }) {
    const r = view.round;
    const clock = usePhaseClock(view);
    const seconds = Math.ceil(clock.left / 1000);
    // My taps show at once; the server's copy (r.picks) is what everyone else sees.
    const roundKey = `${view.number}:${view.phase}`;
    const [kept, setKept] = useState({ key: '', value: [] });
    const mine = kept.key === roundKey ? kept.value : (view.you != null ? r?.picks?.[view.you] || [] : []);
    const canPick = view.canAnswer && view.phase === 'answer';

    const toggle = (c) => {
        if (!canPick) return;
        if (!mine.includes(c) && mine.length >= r.count) return;
        setKept({ key: roundKey, value: mine.includes(c) ? mine.filter((x) => x !== c) : [...mine, c] });
        onAction({ type: 'pick', cell: c }).catch(() => setKept({ key: '', value: [] }));
    };
    const clear = () => { setKept({ key: roundKey, value: [] }); onAction({ type: 'clear' }).catch(() => {}); };
    const send = () => onAction({ type: 'answer', cells: mine }).catch(() => {});
    const sent = view.you != null && !!view.answers?.[view.you];

    // Only your own grid (asked 2026-10-29): the others are names and scores on the live board, or the
    // scoreboard row. Someone watching (no seat) sees every grid.
    const order = view.you != null ? [view.you] : view.seats.map((_, i) => i);
    const four = order.length > 2;
    const single = order.length === 1;
    return (
        <RoundFrame view={view} wide={!single} title={r ? `${r.size}×${r.size}, ${r.count} cells` : ''} intro="remember the lit cells"
            detail={(res) => (res.detail ? `${res.detail.hits} of ${res.detail.of}` : '')}>
            {() => r && (
                <div className="space-y-4">
                    <p className="text-center text-sm font-semibold text-slate-600">
                        {view.phase === 'show' ? `Remember these ${r.count} cells…`
                            : view.phase === 'answer' ? (sent ? 'Sent. Waiting for the others…' : `Tap the ${r.count} cells that lit up on your grid (${mine.length}/${r.count}).`)
                                : single ? 'The lit cells, and your picks.' : 'The lit cells, and everyone’s picks.'}
                    </p>
                    {/* Your grid (someone watching: every player's, one in each corner; the time left between them). */}
                    <div className="relative">
                        <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${single ? 'mx-auto max-w-md' : 'sm:grid-cols-2'}`}>
                            {order.map((i) => (
                                <PlayerGrid key={i} view={view} r={r} i={i} picks={i === view.you ? mine : r.picks?.[i] || []} onCell={toggle} canPick={canPick} big={!four} />
                            ))}
                        </div>
                        {view.phase === 'answer' && !single && (
                            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] text-white shadow-xl ring-4 ring-white sm:flex" data-center-timer>
                                <Timer size={14} className="text-white/70" aria-hidden="true" />
                                <span className={`text-2xl font-black tabular-nums ${seconds <= 5 ? 'text-rose-300' : ''}`}>{seconds}s</span>
                            </div>
                        )}
                    </div>
                    {view.phase === 'answer' && !sent && view.you != null && (
                        <div className="flex justify-center gap-2">
                            <button type="button" onClick={clear} disabled={!mine.length} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><RotateCcw size={15} aria-hidden="true" /> Clear</button>
                            <button type="button" onClick={send} disabled={mine.length !== r.count || !canPick} data-send className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"><Send size={15} aria-hidden="true" /> Send</button>
                        </div>
                    )}
                </div>
            )}
        </RoundFrame>
    );
}
