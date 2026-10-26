/**
 * Demo: a Quiz Arena played through as a student sees it — each round's
 * card, then one question at a time with its picture, the four options and
 * the clock running down, on to the next when time is up. Choosing an option
 * only says "Answer saved", as for students: never right or wrong. For the
 * admin, or a hosting college, to check their questions before the day.
 */
import { useEffect, useMemo, useState } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Loader2, Timer, CheckCircle2, Eye } from 'lucide-react';
import api from '../utils/api';
import { errorOf } from '../competitions/constants';
import { arenaApi, ROUND_NAMES, LETTERS } from './shared';

const INTRO_MS = 2500;

export default function StudentPreview({ id, onClose }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [i, setI] = useState(0);
    const [intro, setIntro] = useState(true);
    const [left, setLeft] = useState(0);
    const [paused, setPaused] = useState(false);
    const [picked, setPicked] = useState({});
    useEffect(() => { api.get(`${arenaApi()}/${id}/preview`).then((r) => setData(r.data)).catch((e) => setError(errorOf(e))); }, [id]);

    const qs = useMemo(() => data?.questions || [], [data]);
    const q = qs[i];
    const ms = (data?.secondsPerQuestion || 20) * 1000;
    const rounds = [...new Set(qs.map((x) => x.round))];
    const inRound = q ? qs.filter((x) => x.round === q.round) : [];
    const go = (n) => {
        if (n < 0 || n >= qs.length) return;
        setIntro(n === 0 || qs[n].round !== qs[n - 1]?.round);
        setI(n);
        setLeft(ms);
    };
    useEffect(() => { if (data) setLeft((data.secondsPerQuestion || 20) * 1000); }, [data]);

    // The clock: the round's card for a moment, then the question's seconds.
    useEffect(() => {
        if (!q || paused) return undefined;
        if (intro) { const t = setTimeout(() => setIntro(false), INTRO_MS); return () => clearTimeout(t); }
        if (left <= 0) { const t = setTimeout(() => go(i + 1), 600); return () => clearTimeout(t); }
        const t = setTimeout(() => setLeft((x) => Math.max(0, x - 100)), 100);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, intro, left, paused]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const secs = Math.ceil(left / 1000);
    return (
        <div className="fixed inset-0 z-[160] flex flex-col bg-slate-50" role="dialog" aria-modal="true" aria-label="Student view demo">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600"><Eye size={13} /> Demo · as students see it</p>
                    <p className="truncate font-black text-slate-900">{data?.title || 'Quiz Arena'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => go(i - 1)} disabled={!q || i === 0} aria-label="Previous question" className="rounded-xl p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={18} /></button>
                    <button type="button" onClick={() => setPaused((p) => !p)} disabled={!q} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40">{paused ? <><Play size={16} /> Play</> : <><Pause size={16} /> Pause</>}</button>
                    <button type="button" onClick={() => go(i + 1)} disabled={!q || i >= qs.length - 1} aria-label="Next question" className="rounded-xl p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={18} /></button>
                    <button type="button" onClick={onClose} aria-label="Close demo" className="ml-1 rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-5xl space-y-4">
                    {error && <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}
                    {!data && !error && <Loader2 className="mx-auto mt-16 animate-spin text-slate-400" />}
                    {data && !qs.length && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">No approved questions yet. Approve some in the question bank and they appear here.</p>}
                    {data?.draft && qs.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Not published yet: these are the approved questions Publish would take, in this order.</p>}

                    {q && (
                        <>
                            {/* The three rounds, the current one lit. */}
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].filter((r) => rounds.includes(r)).map((r) => (
                                    <div key={r} className={`rounded-2xl px-3 py-2 text-center ring-1 ${r === q.round ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-500 ring-slate-200'}`}>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">Round {r}</p>
                                        <p className="truncate text-sm font-black">{ROUND_NAMES[r]}</p>
                                    </div>
                                ))}
                            </div>

                            {intro ? (
                                <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-10 text-center text-white shadow-lg">
                                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/80">Round {q.round}</p>
                                    <p className="mt-2 text-3xl font-black">{ROUND_NAMES[q.round]}</p>
                                    <p className="mt-2 text-sm text-white/85">{inRound.length} question{inRound.length === 1 ? '' : 's'} · {data.secondsPerQuestion} seconds each</p>
                                </section>
                            ) : (
                                <section className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:p-8">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Question {inRound.indexOf(q) + 1} of {inRound.length}</span>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black tabular-nums ${secs <= 5 ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}><Timer size={15} /> {secs}s</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-[width] duration-100 ease-linear" style={{ width: `${(left / ms) * 100}%` }} /></div>
                                    {q.imageUrl
                                        ? <p className="text-xl font-black leading-snug text-slate-900 lg:text-2xl">{q.prompt}</p>
                                        : <p className="flex min-h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-6 text-center text-xl font-black leading-snug text-slate-900 ring-1 ring-indigo-100 sm:min-h-72 sm:text-2xl lg:min-h-[28.5rem] lg:px-12 lg:text-3xl">{q.prompt}</p>}
                                    {q.imageUrl && <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:h-72 lg:h-96"><img src={q.imageUrl} alt="" className="h-full w-full object-contain" /></div>}
                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {q.options.map((o, k) => {
                                            const mine = picked[i] === k;
                                            const done = picked[i] != null || left <= 0;
                                            return (
                                                <button key={k} type="button" disabled={done} onClick={() => setPicked((p) => ({ ...p, [i]: k }))}
                                                    className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition lg:min-h-16 lg:text-base ${mine ? 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-300' : done ? 'border-slate-200 bg-white text-slate-400' : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-300'}`}>
                                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{LETTERS[k]}</span>
                                                    <span className="min-w-0 break-words">{o}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="rounded-2xl bg-indigo-50 px-4 py-2.5 text-center text-sm font-semibold text-indigo-700">
                                        {picked[i] != null ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> Answer saved. The next question opens when time is up.</span> : left <= 0 ? 'Time is up — next question coming up…' : 'Pick your answer.'}
                                    </p>
                                </section>
                            )}
                            <p className="text-center text-xs text-slate-400">Question {i + 1} of {qs.length} overall · ← → to move, Esc to close</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
