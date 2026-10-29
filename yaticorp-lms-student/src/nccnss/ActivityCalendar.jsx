/**
 * Calendars of the events of what the student is in — NCC, NSS, Scouts &
 * Guides, their clubs. The organization and each club's teacher in charge add
 * them; so does a club's president, from here, on any date. Two shapes:
 *
 *   ActivityCalendar   one membership's month to page through: a dot on each
 *                      day with something on, and the picked day's (or the
 *                      month's) list. For a president, any day can be picked
 *                      and an event added on it.
 *   MyClubsCard        the dashboard's card: what the student is in, with
 *                      their posts, and what is coming up next
 *
 * Server: /organizations/student/nccnss/calendar (src/nccnss/student.js).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Users, ArrowRight, Plus, Trash2, Loader2 } from 'lucide-react';
import api from '../utils/api';

const BASE = '/organizations/student/nccnss';
const KIND_LABEL = { parade: 'Parade', meeting: 'Meeting', camp: 'Camp', drive: 'Drive', competition: 'Competition', practice: 'Practice', performance: 'Performance' };
const CLUB_KINDS = [['meeting', 'Meeting'], ['practice', 'Practice / rehearsal'], ['competition', 'Competition / match'], ['performance', 'Performance / show'], ['drive', 'Drive / activity'], ['camp', 'Camp / trip']];
// One colour per kind of membership, the same as its tab.
const TONE = { NCC: 'bg-emerald-500', NSS: 'bg-rose-500', SCOUTS: 'bg-amber-500', CLUB: 'bg-violet-500' };
const ROLE_LABEL = { president: 'President', vice_president: 'Vice President', secretary: 'Secretary', treasurer: 'Treasurer', coordinator: 'Coordinator' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INPUT = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
// The picked day at noon, so the date the server stores is that day in every time zone near ours.
const atNoon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();

/** The events between two dates (of one membership, when given); null while loading. */
const useEvents = (from, to, memberId) => {
    const [events, setEvents] = useState(null);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        let live = true;
        api.get(`${BASE}/calendar`, { params: { from: from.toISOString(), to: to.toISOString(), memberId } })
            .then((r) => { if (live) setEvents(r.data.events || []); })
            .catch(() => { if (live) setEvents([]); });
        return () => { live = false; };
    }, [from.getTime(), to.getTime(), memberId, tick]); // eslint-disable-line react-hooks/exhaustive-deps
    return [events, useCallback(() => setTick((t) => t + 1), [])];
};

const EventRow = ({ e, onDelete, showName = true }) => (
    <li className="flex items-start gap-3 py-2.5">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[e.scheme] || TONE.CLUB}`} />
        <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{e.title}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{fmtDay(e.date)}</span>{showName && <span>· {e.name}</span>}<span>· {KIND_LABEL[e.kind] || e.kind}</span>
                {e.place && <span className="inline-flex items-center gap-0.5"><MapPin size={11} />{e.place}</span>}
            </p>
        </div>
        {e.completed && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✓ Completed</span>}
        {e.present !== null && e.present !== undefined && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${e.present ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.present ? 'Present' : 'Absent'}</span>
        )}
        {onDelete && e.mine && e.present === null && (
            <button type="button" onClick={() => onDelete(e)} className="shrink-0 p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${e.title}`}><Trash2 size={15} /></button>
        )}
    </li>
);

/** A president's event on the picked day. */
const AddEvent = ({ memberId, day, onDone, onCancel }) => {
    const [form, setForm] = useState({ kind: '', title: '', hours: 1, place: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { onDone((await api.post(`${BASE}/calendar`, { ...form, memberId, date: atNoon(day) })).data.message); }
        catch (err) { setError(err.response?.data?.message || 'Could not add the event.'); setBusy(false); }
    };
    return (
        <form onSubmit={submit} className="mt-3 space-y-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
            <p className="text-sm font-bold text-slate-800">New event on {fmtDay(day)}</p>
            <input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Annual day rehearsal" required autoFocus />
            <div className="grid grid-cols-2 gap-2">
                {/* Typed freely; the list only suggests. */}
                <input className={INPUT} list="club-event-kinds" value={form.kind} onChange={(e) => set('kind', e.target.value)} maxLength={40} placeholder="Type, e.g. Rehearsal" aria-label="Type" />
                <datalist id="club-event-kinds">{CLUB_KINDS.map(([, l]) => <option key={l} value={l} />)}</datalist>
                <input type="number" min="0" max="240" step="0.5" className={INPUT} value={form.hours} onChange={(e) => set('hours', e.target.value)} aria-label="Hours" placeholder="Hours" />
            </div>
            <input className={INPUT} value={form.place} onChange={(e) => set('place', e.target.value)} placeholder="Place (optional)" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}Add event</button>
                <button type="button" onClick={onCancel} className="px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            </div>
        </form>
    );
};

export const ActivityCalendar = ({ memberId, canAdd = false, title = 'Calendar' }) => {
    const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
    const [picked, setPicked] = useState(null);     // a Date
    const [adding, setAdding] = useState(false);
    const [notice, setNotice] = useState('');
    const [todayKey] = useState(() => dayKey(new Date()));
    const end = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59), [month]);
    const [events, reload] = useEvents(month, end, memberId);

    const byDay = useMemo(() => {
        const map = {};
        (events || []).forEach((e) => { (map[dayKey(e.date)] = map[dayKey(e.date)] || []).push(e); });
        return map;
    }, [events]);
    // Monday-first grid: blanks before the 1st, then the month's days.
    const lead = (month.getDay() + 6) % 7;
    const cells = [...Array(lead).fill(null), ...Array.from({ length: end.getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
    const pickedKey = picked ? dayKey(picked) : null;
    const shown = picked ? byDay[pickedKey] || [] : events || [];
    const go = (n) => { setPicked(null); setAdding(false); setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1)); };
    const pick = (d) => {
        const same = pickedKey === dayKey(d);
        setPicked(same ? null : d);
        setAdding(!same && canAdd && !(byDay[dayKey(d)] || []).length);
    };
    const remove = async (e) => {
        if (!window.confirm(`Delete "${e.title}"?`)) return;
        try { setNotice((await api.delete(`${BASE}/calendar/${e._id}`)).data.message); reload(); }
        catch (err) { setNotice(err.response?.data?.message || 'Could not delete it.'); }
    };

    return (
        // A compact month (fixed-height days, a narrow column) beside the list:
        // square days on a full-width page made each one a tile the size of a card.
        <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                    <button type="button" onClick={() => go(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={18} /></button>
                    <h2 className="text-sm font-black text-slate-900">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
                    <button type="button" onClick={() => go(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-slate-400">
                    {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((d, i) => {
                        if (!d) return <span key={`b${i}`} />;
                        const k = dayKey(d);
                        const on = byDay[k] || [];
                        return (
                            <button key={k} type="button" onClick={() => pick(d)} disabled={!on.length && !canAdd}
                                className={`flex h-10 flex-col items-center justify-center rounded-lg text-sm transition-colors ${pickedKey === k ? 'bg-indigo-600 font-bold text-white' : k === todayKey ? 'bg-indigo-50 font-bold text-indigo-700' : on.length ? 'font-semibold text-slate-800 hover:bg-slate-100' : canAdd ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400'}`}>
                                {d.getDate()}
                                {on.length > 0 && (
                                    <span className="mt-0.5 flex gap-0.5">
                                        {on.slice(0, 3).map((e) => <span key={e._id} className={`h-1.5 w-1.5 rounded-full ${pickedKey === k ? 'bg-white' : TONE[e.scheme] || TONE.CLUB}`} />)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {canAdd && <p className="mt-3 text-xs text-slate-500">As president, tap any date to add an event for the club.</p>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-black text-slate-900"><CalendarDays size={18} className="text-indigo-600" />{picked ? fmtDay(picked) : `${title} · this month`}</h2>
                    {picked
                        ? <button type="button" onClick={() => { setPicked(null); setAdding(false); }} className="text-xs font-bold text-indigo-600">Whole month</button>
                        : canAdd && <button type="button" onClick={() => { const d = new Date(); setPicked(d); setAdding(true); }} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus size={14} /> Add event</button>}
                </div>
                {notice && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{notice}</p>}
                {events === null ? <div className="mt-3 h-24 animate-pulse rounded-xl bg-slate-100" /> : shown.length === 0 ? (
                    !adding && <p className="mt-3 text-sm text-slate-500">{picked ? 'Nothing on this day.' : 'Nothing on this month yet.'}</p>
                ) : (
                    <ul className="mt-1 divide-y divide-slate-100">{shown.map((e) => <EventRow key={e._id} e={e} onDelete={canAdd ? remove : null} showName={!memberId} />)}</ul>
                )}
                {picked && canAdd && (adding
                    ? <AddEvent key={pickedKey} memberId={memberId} day={picked} onCancel={() => setAdding(false)} onDone={(text) => { setAdding(false); setNotice(text); reload(); }} />
                    : <button type="button" onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"><Plus size={15} /> Add an event on this day</button>)}
            </div>
        </div>
    );
};

/** On the dashboard: what the student is in, with their posts, and the next few events. Nothing until they are in something. */
export const MyClubsCard = ({ className = '', fallback = null }) => {
    const [memberships, setMemberships] = useState(null);
    // The next two months, fixed when the card first shows.
    const [[from, to]] = useState(() => [new Date(), new Date(Date.now() + 60 * 86400000)]);
    const [events] = useEvents(from, to);
    useEffect(() => {
        let live = true;
        api.get(BASE).then((r) => { if (live) setMemberships((r.data.memberships || []).filter((m) => m.status === 'active')); }).catch(() => { if (live) setMemberships([]); });
        return () => { live = false; };
    }, []);
    // Not in anything (yet): whatever the page puts in this place instead.
    if (memberships && !memberships.length) return fallback;
    if (!memberships) return null;
    // The next fourteen days as a strip, each with a dot per event that day.
    const byDay = {};
    (events || []).forEach((e) => { (byDay[dayKey(e.date)] = byDay[dayKey(e.date)] || []).push(e); });
    const strip = Array.from({ length: 14 }, (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i));
    const nextFor = (m) => (events || []).find((e) => e.name === m.name);
    const leads = memberships.find((m) => m.role === 'president');
    return (
        <section className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-black text-slate-900"><Users size={18} className="text-indigo-600" /> My clubs & activities</h2>
                <Link to="/extracurricular" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">Open <ArrowRight size={13} /></Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {memberships.map((m) => {
                    const next = nextFor(m);
                    return (
                        <Link key={m._id} to={`/extracurricular/${m._id}`} className="group rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50">
                            <div className="flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[m.scheme] || TONE.CLUB}`} />
                                <span className="truncate font-bold text-slate-800">{m.name}</span>
                                {ROLE_LABEL[m.role] && <span className="ml-auto shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">{ROLE_LABEL[m.role]}</span>}
                            </div>
                            <p className="mt-1.5 truncate text-xs text-slate-500">{next ? <>Next: <span className="font-semibold text-slate-700">{next.title}</span> · {fmtDay(next.date)}</> : 'No upcoming events'}</p>
                        </Link>
                    );
                })}
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Next two weeks</p>
            <div className="mt-2 grid grid-cols-7 gap-1">
                {strip.map((d) => {
                    const on = byDay[dayKey(d)] || [];
                    const today = dayKey(d) === dayKey(from);
                    return (
                        <div key={dayKey(d)} className={`flex flex-col items-center rounded-lg py-1.5 ${today ? 'bg-indigo-600 text-white' : on.length ? 'bg-indigo-50 text-slate-800' : 'text-slate-500'}`}>
                            <span className={`text-[10px] font-bold uppercase ${today ? 'text-indigo-100' : 'text-slate-400'}`}>{WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 2)}</span>
                            <span className="text-sm font-bold">{d.getDate()}</span>
                            <span className="mt-0.5 flex h-1.5 gap-0.5">{on.slice(0, 3).map((e) => <span key={e._id} className={`h-1.5 w-1.5 rounded-full ${today ? 'bg-white' : TONE[e.scheme] || TONE.CLUB}`} />)}</span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Coming up</p>
            {events === null ? <div className="mt-2 h-14 animate-pulse rounded-xl bg-slate-100" /> : events.length === 0 ? (
                <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
                    <CalendarDays size={28} className="text-indigo-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Nothing scheduled in the next two months</p>
                    {leads ? (
                        <Link to={`/extracurricular/${leads._id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"><Plus size={15} /> Plan an event for {leads.name}</Link>
                    ) : (
                        <p className="mt-1 text-xs text-slate-500">Your teachers will add events here — check back soon.</p>
                    )}
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">{events.slice(0, 4).map((e) => <EventRow key={e._id} e={e} />)}</ul>
            )}
        </section>
    );
};
