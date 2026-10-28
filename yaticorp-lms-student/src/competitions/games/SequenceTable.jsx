import { useRef, useState } from 'react';
import { Delete, Zap } from 'lucide-react';
import RoundFrame from './RoundTable';

/**
 * Sequence & Reaction (Group Brain).
 *
 * A sequence round: while the server says "show", the items light one at a
 * time, `stepMs` apart, timed from the show's start on the server's clock;
 * then the player taps them back in order — the answer goes as soon as the
 * last one is tapped.
 *
 * A reaction round: "Wait…" until the show's end, which every browser knows,
 * then "Go!". A tap before Go is a false start; the server times the tap
 * from Go.
 */
const COLOURS = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#facc15', purple: '#a855f7', orange: '#f97316' };

const Item = ({ set, value, big }) => (set === 'colours'
    ? <span className={`block rounded-2xl shadow-inner ${big ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-full w-full'}`} style={{ background: COLOURS[value] }} aria-label={value} />
    : <span className={`font-black ${big ? 'text-6xl sm:text-7xl' : 'text-2xl'}`}>{value}</span>);

/**
 * The pad: the choices in fixed places, the same while the sequence plays and
 * while it is tapped back, so a player follows where each one lights up
 * (`lit`) and taps the same places. The others dim while one is lit.
 */
const Pad = ({ r, lit = null, onTap, disabled }) => (
    <div className={`mx-auto grid gap-3 ${r.items.length <= 4 ? 'max-w-xs grid-cols-2' : 'max-w-md grid-cols-3'}`} data-pad>
        {r.items.map((item, i) => (
            <button key={item} type="button" onClick={onTap ? () => onTap(i) : undefined} disabled={disabled || !onTap} data-item={i} data-lit={lit === i || undefined}
                className={`flex h-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ring-1 transition-all duration-150 disabled:cursor-default sm:h-24 ${lit === i ? 'z-10 scale-110 shadow-[0_0_30px_rgba(244,63,94,0.55)] ring-4 ring-rose-400' : lit != null ? 'opacity-35 ring-slate-200' : 'shadow-sm ring-slate-200 hover:-translate-y-0.5 active:scale-95'}`}>
                <Item set={r.set} value={item} />
            </button>
        ))}
    </div>
);

export default function SequenceTable({ view, onAction, busy }) {
    const r = view.round;
// Starts afresh each round: kept with the round it belongs to.
    const roundKey = `${view.number}:${view.phase}`;
    const [kept, setKept] = useState({ key: roundKey, value: [] });
    const taps = kept.key === roundKey ? kept.value : [];
    const setTaps = (next) => setKept((k) => ({ key: roundKey, value: typeof next === 'function' ? next(k.key === roundKey ? k.value : []) : next }));
    const mine = view.you != null ? view.answers[view.you] : null;
    const sending = useRef(false);
    const [flash, setFlash] = useState(null);       // the place just tapped, lit for a moment

    const tap = (i) => {
        if (!view.canAnswer || busy || sending.current || mine) return;
        const next = [...taps, i];
        setTaps(next);
        if (next.length === r.length) {
            sending.current = true;
            onAction({ type: 'answer', sequence: next }).catch(() => setTaps([])).finally(() => { sending.current = false; });
        }
    };
    const react = () => {
        if (!view.canAnswer || busy || mine) return;
        onAction({ type: 'answer' }).catch(() => {});
    };

    return (
        <RoundFrame view={view} title={r?.kind === 'reaction' ? 'Reaction' : r ? `${r.length} to remember` : ''} intro="watch, then tap it back"
            detail={(res) => (res.detail?.falseStart ? 'false start' : res.detail?.ms != null ? `${res.detail.ms} ms` : res.detail?.missed ? 'no tap' : res.detail ? `${res.detail.right} of ${res.detail.of}` : '')}>
            {(clock) => {
                if (!r) return null;
                if (r.kind === 'reaction') {
                    const go = view.phase !== 'show' || clock.left <= 0;
                    const falseStart = mine?.falseStart;
                    return (
                        <button type="button" onClick={react} disabled={!view.canAnswer || !!mine || view.phase === 'reveal'} data-reaction={go ? 'go' : 'wait'}
                            className={`flex h-56 w-full flex-col items-center justify-center rounded-3xl text-white shadow-lg transition-colors select-none disabled:cursor-default ${falseStart ? 'bg-slate-500' : view.phase === 'reveal' ? 'bg-slate-400' : go ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                            <Zap size={36} aria-hidden="true" />
                            <span className="mt-2 text-4xl font-black">{falseStart ? 'Too soon!' : mine ? 'Tapped!' : view.phase === 'reveal' ? 'Done' : go ? 'GO! Tap!' : 'Wait…'}</span>
                            <span className="mt-1 text-sm text-white/85">{go ? '' : 'Tap the moment it turns green — not before.'}</span>
                        </button>
                    );
                }
                if (view.phase === 'show') {
                    const total = Math.max(1, view.phaseEndsAt - view.phaseStartedAt);
                    const step = Math.floor((total - clock.left) / r.stepMs);
                    // Lit for most of its step, then dark for a moment, so the same place twice reads as two.
                    const into = (total - clock.left) % r.stepMs;
                    const current = r.sequence && step < r.length && into < r.stepMs * 0.75 ? r.sequence[step] : null;
                    return (
                        <div className="space-y-4 py-2" data-showing={step}>
                            <p className="text-center text-sm font-bold text-rose-700" aria-live="polite">{step < r.length ? `Watch: ${Math.min(step + 1, r.length)} of ${r.length}` : 'Now tap it back in the same order!'}</p>
                            <Pad r={r} lit={current} />
                        </div>
                    );
                }
                const shown = mine?.sequence || taps;
                return (
                    <div className="space-y-4">
                        <div className="flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200" aria-label="Your sequence">
                            {Array.from({ length: r.length }, (_, k) => {
                                const v = shown[k];
                                const right = view.phase === 'reveal' && r.sequence ? r.sequence[k] === v : null;
                                return (
                                    <span key={k} className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ${right === true ? 'ring-emerald-500' : right === false ? 'ring-rose-500' : 'ring-slate-200'}`}>
                                        {v != null ? <Item set={r.set} value={r.items[v]} /> : <span className="text-slate-300">{k + 1}</span>}
                                    </span>
                                );
                            })}
                        </div>
                        {view.phase === 'reveal' && r.sequence && (
                            <div className="flex flex-wrap items-center justify-center gap-2" aria-label="The sequence">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">It was</span>
                                {r.sequence.map((v, k) => <span key={k} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"><Item set={r.set} value={r.items[v]} /></span>)}
                            </div>
                        )}
                        {view.phase === 'answer' && !mine && view.you != null && (
                            <>
                                <Pad r={r} lit={flash} onTap={(i) => { tap(i); setFlash(i); setTimeout(() => setFlash(null), 180); }} disabled={!view.canAnswer || busy} />
                                <div className="flex justify-center">
                                    <button type="button" onClick={() => setTaps((t) => t.slice(0, -1))} disabled={!taps.length} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><Delete size={15} aria-hidden="true" /> Undo</button>
                                </div>
                            </>
                        )}
                        {view.phase === 'answer' && mine && <p className="text-center text-sm font-semibold text-slate-600">Sent. Waiting for the others…</p>}
                    </div>
                );
            }}
        </RoundFrame>
    );
}
