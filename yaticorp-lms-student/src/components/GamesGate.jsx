/**
 * Games hours (2026-11-14): the student's organization decides when its students may play — some
 * days, a window on each (4:00 pm to 6:00 pm) and/or minutes a day. Outside them this stands in for
 * the games: when they open next, the week's hours, and a way to ask the organization to let them
 * play now. Asked again every 30 seconds and right when the games close or open, so the page follows
 * the clock by itself. The server refuses play outside the hours too (src/games/orgHours.js).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Hourglass, Send, Check, X, Loader2, CalendarClock, Building2, Gamepad2 } from 'lucide-react';
import careerApi from '../career/services/api';
import api from '../utils/api';

const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const fmtWhen = (d) => {
    if (!d) return '';
    const at = new Date(d);
    const now = new Date();
    const sameDay = at.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === at.toDateString();
    return sameDay ? 'Today' : tomorrow ? 'Tomorrow' : at.toLocaleDateString('en-IN', { weekday: 'long' });
};
const clockOf = (m) => {
    const h = Math.floor(m / 60) % 24;
    return `${h % 12 || 12}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
};
const TITLE = {
    'time-up': 'You’ve used today’s games time',
    before: 'Games unlock later today',
    after: 'Games are done for today',
    'closed-day': 'No games today'
};
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const REASONS = ['Practising for a competition', 'My teacher asked me to', 'I have a free period'];

/** Hours · minutes · seconds until `at`, ticking every second. */
function Countdown({ at }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    const left = Math.max(0, Math.floor((new Date(at) - now) / 1000));
    const days = Math.floor(left / 86400);
    const parts = days > 0
        ? [[days, 'days'], [Math.floor(left / 3600) % 24, 'hrs'], [Math.floor(left / 60) % 60, 'min']]
        : [[Math.floor(left / 3600), 'hrs'], [Math.floor(left / 60) % 60, 'min'], [left % 60, 'sec']];
    return (
        <div className="flex w-full items-end gap-1.5 sm:w-auto sm:gap-2" role="timer" aria-label={`Opens in ${parts.map(([v, l]) => `${v} ${l}`).join(' ')}`}>
            {parts.map(([v, l], i) => (
                <React.Fragment key={l}>
                    {i > 0 && <span aria-hidden className="pb-7 text-2xl font-light text-white/25">:</span>}
                    <div className="flex flex-1 flex-col items-center sm:flex-none">
                        <span className="w-full min-w-[3.25rem] rounded-xl bg-white/[0.07] px-2 py-1.5 text-center text-3xl font-black tabular-nums tracking-tight text-white ring-1 ring-inset ring-white/10 sm:min-w-[3.75rem] sm:text-4xl">{String(v).padStart(2, '0')}</span>
                        <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{l}</span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}

/** Today as a line from midnight to midnight: the open window, and where "now" sits on it. */
function TodayLine({ win }) {
    const d = new Date();
    const nowM = d.getHours() * 60 + d.getMinutes();
    const pct = (m) => `${(m / 1440) * 100}%`;
    const passed = nowM >= win.to;
    return (
        <div className="relative mt-7">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] font-semibold text-white/50">
                <span>Today</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Games open {clockOf(win.from)} – {clockOf(win.to)}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: pct(nowM) }} />
                <div className={`absolute inset-y-0 rounded-full ${passed ? 'bg-emerald-400/35' : 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_14px_rgba(52,211,153,0.55)]'}`} style={{ left: pct(win.from), width: pct(win.to - win.from) }} />
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(nowM) }}>
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />
                    <span className="relative block h-4 w-4 rounded-full border-[3px] border-indigo-950 bg-white" />
                </div>
            </div>
            <div className="relative mt-2 h-4 text-[10px] font-medium text-white/35">
                <span className="absolute left-0">12am</span>
                {[360, 720, 1080].map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: pct(m) }}>{clockOf(m)}</span>)}
                <span className="absolute right-0">12am</span>
            </div>
        </div>
    );
}

/**
 * Closed (redesigned 2026-11-16): a dark hero that answers "when can I play?" at a glance — a live countdown
 * and today's line with "now" and the open window on it — then the week, then asking to play now.
 */
function Closed({ s, onAsked }) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const ask = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { onAsked((await api.post('/organizations/student/games-access', { note })).data.organization); }
        catch (err) { setError(err.response?.data?.message || 'Your request could not be sent. Try again.'); }
        finally { setBusy(false); }
    };
    const today = new Date().getDay();
    const nextDay = s.opensAt ? new Date(s.opensAt).getDay() : null;
    const todayRow = (s.week || []).find((d) => d.day === today);
    const win = todayRow?.open && Number.isFinite(todayRow.from) && Number.isFinite(todayRow.to) && s.reason !== 'time-up' ? todayRow : null;
    const req = s.request;
    const Icon = s.reason === 'time-up' ? Hourglass : Lock;
    const sub = s.opensAt
        ? `They unlock ${fmtWhen(s.opensAt).toLowerCase() === 'today' ? 'today' : fmtWhen(s.opensAt)} at ${timeOf(s.opensAt)} — this page opens them for you automatically.`
        : 'Your institution hasn’t set the next games time yet.';
    const usedPct = s.limitSeconds > 0 ? Math.min(100, (s.usedSeconds / s.limitSeconds) * 100) : 0;

    return (
        <div className="mx-auto w-full max-w-3xl px-3 pb-28 pt-4 sm:px-6 sm:pb-12 sm:pt-8">
            <section className="overflow-hidden rounded-3xl sm:rounded-[28px] bg-white shadow-[0_30px_80px_-40px_rgba(30,27,75,0.55)] ring-1 ring-slate-200/70">
                {/* When can I play? */}
                <div className="relative isolate overflow-hidden bg-[#13123a] px-5 pb-6 pt-6 text-white sm:px-8 sm:pb-8 sm:pt-8">
                    <span aria-hidden className="absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
                    <span aria-hidden className="absolute -bottom-32 -left-16 -z-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
                    <span aria-hidden className="absolute inset-0 -z-10 opacity-[0.06] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />

                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
                        <div className="min-w-0 md:max-w-md">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-200 ring-1 ring-inset ring-white/10">
                                <Icon size={12} aria-hidden="true" /> Games locked
                            </span>
                            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-[28px]">{TITLE[s.reason] || 'Games are closed right now'}</h1>
                            <p className="mt-2 text-sm leading-relaxed text-white/65">{sub}</p>
                            <p className="mt-3 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/40" title={s.organization}><Building2 size={13} className="shrink-0" aria-hidden="true" /> <span className="truncate">{s.organization}</span></p>
                        </div>
                        {s.opensAt && (
                            <div className="w-full shrink-0 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10 sm:w-auto sm:bg-transparent sm:p-0 sm:ring-0">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/90">Opens in</p>
                                <Countdown at={s.opensAt} />
                            </div>
                        )}
                    </div>

                    {win && <TodayLine win={win} />}
                    {s.reason === 'time-up' && s.limitSeconds > 0 && (
                        <div className="mt-7">
                            <div className="mb-2 flex justify-between text-[11px] font-semibold text-white/50"><span>Played today</span><span>{Math.round(s.usedSeconds / 60)} / {Math.round(s.limitSeconds / 60)} min</span></div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400" style={{ width: `${usedPct}%` }} /></div>
                        </div>
                    )}
                </div>

                {/* The week. */}
                <div className="px-5 py-6 sm:px-8">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarClock size={16} className="text-indigo-600" aria-hidden="true" /> This week’s games hours</h2>
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-600" /> Today</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Next open</span>
                        </div>
                    </div>
                    <ul className="grid grid-cols-7 gap-1 pt-1 min-[400px]:gap-1.5 sm:gap-2">
                        {(s.week || []).map((d) => {
                            const isToday = d.day === today;
                            const isNext = d.day === nextDay && !isToday;
                            const hasWin = Number.isFinite(d.from);
                            return (
                                <li key={d.day} title={`${d.name}: ${d.words}`}
                                    className={`relative flex min-h-[88px] min-w-0 flex-col items-center rounded-xl px-0.5 pb-2.5 pt-3 text-center transition sm:rounded-2xl sm:px-1 ${isToday ? 'bg-indigo-50 ring-2 ring-indigo-600' : isNext ? 'bg-emerald-50 ring-2 ring-emerald-500' : d.open ? 'bg-white ring-1 ring-slate-200' : 'bg-slate-50 ring-1 ring-slate-100'}`}>
                                    <span className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-indigo-700' : isNext ? 'text-emerald-700' : d.open ? 'text-slate-700' : 'text-slate-400'}`}>{SHORT[d.day]}</span>
                                    {d.open ? (
                                        <>
                                            <span className={`mt-2 flex h-6 w-6 items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : isNext ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}><Gamepad2 size={13} aria-hidden="true" /></span>
                                            <span className="mt-1.5 break-words text-[10px] font-semibold leading-tight text-slate-700 sm:text-[11px]">
                                                {hasWin ? <>{clockOf(d.from)}<span className="hidden sm:inline">–{clockOf(d.to)}</span></> : 'All day'}
                                                {d.minutes ? <span className="block text-[10px] font-medium text-slate-500">{d.minutes} min</span> : null}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="my-auto text-[11px] font-medium text-slate-400">Off</span>
                                    )}
                                    {(isToday || isNext) && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-white ${isToday ? 'bg-indigo-600' : 'bg-emerald-500'}`}>{isToday ? 'Today' : 'Next'}</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Ask to play now. */}
                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-6 sm:px-8">
                    {req?.status === 'pending' ? (
                        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Loader2 size={18} className="animate-spin" aria-hidden="true" /></span>
                            <div>
                                <p className="text-sm font-bold text-amber-900">Request sent at {timeOf(req.at)}</p>
                                <p className="mt-0.5 text-sm text-amber-800/80">Waiting for {s.organization}. Games will unlock here the moment they say yes.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={ask}>
                            <label htmlFor="games-note" className="block text-sm font-bold text-slate-900">Can’t wait? Ask to play now</label>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Your request goes to {s.organization}. Adding a reason helps them decide.</p>
                            {req?.status === 'declined' && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100"><X size={13} aria-hidden="true" /> Your last request today was declined. You can ask again.</p>}
                            {req?.status === 'granted' && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"><Check size={13} aria-hidden="true" /> The extra time you were given has ended.</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {REASONS.map((r) => (
                                    <button key={r} type="button" onClick={() => setNote(note === r ? '' : r)} aria-pressed={note === r}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${note === r ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-700'}`}>{r}</button>
                                ))}
                            </div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input id="games-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Or write your own reason (optional)"
                                    className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
                                <button type="submit" disabled={busy} className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#13123a] px-6 sm:w-auto text-sm font-bold text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 active:scale-[0.98] disabled:opacity-60">
                                    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />} {busy ? 'Sending…' : 'Send request'}
                                </button>
                            </div>
                            {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
                        </form>
                    )}
                </div>
            </section>
        </div>
    );
}

export default function GamesGate({ children }) {
    const [s, setS] = useState(null);
    const timer = useRef(null);
    const load = useCallback(() => {
        careerApi.get('/games/time').then(({ data }) => setS(data?.organization || { applies: false, open: true })).catch(() => setS((x) => x || { applies: false, open: true }));
    }, []);
    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, 30000);
        // Joined or left an organization: its games hours apply, or stop applying, at once.
        window.addEventListener('yati:organization-changed', load);
        return () => { clearInterval(t); window.removeEventListener('yati:organization-changed', load); };
    }, [load]);
    // Asked again right when the state should flip: the games close, or open.
    useEffect(() => {
        clearTimeout(timer.current);
        const at = s?.applies ? (s.open ? s.closesAt : s.opensAt) : null;
        if (at) {
            const ms = new Date(at) - Date.now() + 1500;
            if (ms > 0 && ms < 2 ** 31) timer.current = setTimeout(load, ms);
        }
        return () => clearTimeout(timer.current);
    }, [s, load]);

    if (!s) return null;
    if (s.applies && !s.open) return <Closed s={s} onAsked={(next) => setS(next || s)} />;
    return children;
}
