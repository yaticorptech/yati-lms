import { useState } from 'react';
import { Check, RotateCcw, Send, CheckCircle2 } from 'lucide-react';
import RoundFrame from './RoundTable';
import useWrongBuzz from './useWrongBuzz';

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
    const dark = !!view.dark;
    const seat = view.seats[i];
    const color = seat.color;
    const you = view.you === i;
    const sentCells = view.answers?.[i]?.cells || null;
    const sent = !!view.answers?.[i];
    // Only what was sent counts (2026-11-06): once the round is over, picks never sent show as nothing.
    const chosenList = sentCells || (view.phase === 'answer' ? picks : []);
    const left = (view.out || []).includes(i);
    const result = view.phase === 'reveal' ? view.results?.[i] : null;
    return (
        <div className={`flex min-w-0 flex-col rounded-3xl p-3 ring-2 sm:p-4 ${dark ? 'bg-[#141845]/85 shadow-[0_18px_40px_-16px_rgba(0,0,0,.8)]' : 'bg-white shadow-sm'} ${left ? 'opacity-50' : ''}`} style={{ '--tw-ring-color': you ? color : `${color}40` }} data-player-grid={i}>
            <div className="mb-3 flex items-center gap-2.5">
                <Face src={view.avatars?.[i]} name={seat.name} color={color} />
                <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{seat.name}{you && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: color }}>YOU</span>}</p>
                    <p className={`flex items-center gap-1 text-[11px] font-semibold ${dark ? 'text-[#a5a9da]' : 'text-slate-500'}`}>
                        {left ? 'Left the game'
                            : result && !sent ? 'Not sent in time · 0'
                            : result ? `${result.detail?.hits ?? 0} of ${result.detail?.of ?? r.count} right · ${result.points > 0 ? '+' : ''}${result.points}`
                                : view.phase === 'show' ? 'Watching…'
                                    : sent ? <><CheckCircle2 size={12} className="text-emerald-600" aria-hidden="true" /> Sent</>
                                        : view.phase === 'answer' ? `Picking ${you ? chosenList.length : (r.pickCounts?.[i] ?? chosenList.length)}/${r.count}` : ''}
                    </p>
                </div>
                <span className="shrink-0 rounded-xl px-2.5 py-1 text-center" style={{ background: `${color}14` }}>
                    <span className="block text-base font-black leading-none tabular-nums" style={{ color }}>{view.scores?.[i] ?? 0}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${dark ? 'text-white/50' : 'text-slate-500'}`}>pts</span>
                </span>
            </div>
            <div className={`mx-auto grid w-full gap-1 sm:gap-1.5 ${big ? 'max-w-sm' : 'max-w-[15rem]'}`} style={{ gridTemplateColumns: `repeat(${r.size}, minmax(0, 1fr))` }} role="grid" aria-label={`${seat.name}'s grid`}>
                {Array.from({ length: r.size * r.size }, (_, c) => {
                    const lit = r.cells?.includes(c);
                    const chosen = chosenList.includes(c);
                    let style;
                    // The resting cell: pale on the light page, a sunken slab in the dark room.
                    const rest = dark ? 'bg-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,.45)]' : 'bg-slate-100';
                    let tone = rest;
                    if (view.phase === 'show' && lit) tone = 'bg-sky-500 shadow-[0_0_14px_rgba(14,165,233,0.55)]';
                    else if (view.phase === 'answer' && chosen) { tone = ''; style = { background: color }; }
                    else if (view.phase === 'reveal' || view.phase === 'over') tone = lit && chosen ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.5)]' : lit ? (dark ? 'bg-emerald-500/30 ring-2 ring-emerald-400' : 'bg-emerald-200 ring-2 ring-emerald-500') : chosen ? 'bg-rose-400 gs-wrong' : rest;
                    const mine = you && canPick && !sent;
                    return (
                        <button key={c} type="button" onClick={() => mine && onCell(c)} disabled={!mine} data-cell={you ? c : undefined}
                            aria-pressed={chosen} aria-label={`Cell ${Math.floor(c / r.size) + 1}, ${(c % r.size) + 1}`}
                            className={`aspect-square rounded-md transition-colors duration-150 disabled:cursor-default ${mine && !chosen ? (dark ? 'hover:bg-white/20' : 'hover:bg-slate-200') : ''} ${tone}`} style={style}>
                            {(view.phase === 'reveal' && lit && chosen) && <Check size={14} className="mx-auto text-white" aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function MemoryMatrixTable({ view, onAction, busy }) {
    const r = view.round;
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
    // A grid sent with a cell wrong or missing buzzes at the reveal (2026-11-06): the picks red, the lit cells green.
    useWrongBuzz(view.status === 'active' && view.phase === 'reveal' && sent && view.results?.[view.you]?.correct === false ? view.number : null);

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
                    <p className={`text-center text-sm font-semibold ${view.dark ? 'text-[#c7c9e4]' : 'text-slate-600'}`}>
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
                    </div>
                    {view.phase === 'answer' && !sent && view.you != null && (
                        <div className="flex justify-center gap-2">
                            <button type="button" onClick={clear} disabled={!mine.length} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 disabled:opacity-40 ${view.dark ? 'text-white/80 ring-white/20 hover:bg-white/10' : 'text-slate-600 ring-slate-200 hover:bg-slate-50'}`}><RotateCcw size={15} aria-hidden="true" /> Clear</button>
                            <button type="button" onClick={send} disabled={mine.length !== r.count || !canPick || busy} data-send className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"><Send size={15} aria-hidden="true" /> Send</button>
                        </div>
                    )}
                </div>
            )}
        </RoundFrame>
    );
}
