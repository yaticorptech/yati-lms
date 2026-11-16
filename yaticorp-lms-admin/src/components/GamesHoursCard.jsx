/**
 * Dashboard → Games hours (2026-11-14): when this organization's students may play the games.
 * Each day is open or closed; an open day can have a window (4:00 pm – 6:00 pm) and/or a number of
 * minutes (45 a day, brain and group games together). Outside them students see when the games
 * open next and can ask to play now — those requests are answered here (allow for an hour, for the
 * rest of the day, or decline). Server: src/games/orgHours.js (/organizations/me/games-hours).
 */
import React, { useEffect, useState } from 'react';
import { Gamepad2, Loader2, Check, X } from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN, BTN2, Banner } from './orgUi';

const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
const BASE = '/organizations/me/games-hours';
const blank = (day) => ({ day, on: false, window: false, start: '16:00', end: '18:00', limit: false, minutes: 60 });
const formOf = (schedule) => ({
    enabled: Boolean(schedule?.enabled),
    days: DAYS.map(([day]) => {
        const d = (schedule?.days || []).find((x) => x.day === day);
        if (!d) return blank(day);
        return { day, on: true, window: Boolean(d.start || d.end), start: d.start || '16:00', end: d.end || '18:00', limit: d.minutes > 0, minutes: d.minutes || 60 };
    })
});
const bodyOf = (form) => ({
    enabled: form.enabled,
    days: form.days.filter((d) => d.on).map((d) => ({ day: d.day, start: d.window ? d.start : '', end: d.window ? d.end : '', minutes: d.limit ? Number(d.minutes) || 0 : 0 }))
});
const time = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const FIELD = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

/** A 12-hour time (2026-11-14): hour, minutes and AM/PM; kept as "HH:MM" (24-hour) underneath. */
const Time12 = ({ value, onChange, label }) => {
    const [h24, m] = String(value || '16:00').split(':').map(Number);
    const pm = h24 >= 12;
    const h12 = ((h24 + 11) % 12) + 1;
    const set = (hh, mm, isPm) => onChange(`${String((hh % 12) + (isPm ? 12 : 0)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    const sel = 'h-9 rounded-lg border border-slate-200 bg-white px-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none';
    return (
        <span className="inline-flex items-center gap-1" role="group" aria-label={label}>
            <select value={h12} onChange={(e) => set(Number(e.target.value), m, pm)} aria-label={`${label}: hour`} className={sel}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-slate-400">:</span>
            <select value={m - (m % 5)} onChange={(e) => set(h12, Number(e.target.value), pm)} aria-label={`${label}: minutes`} className={sel}>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((n) => <option key={n} value={n}>{String(n).padStart(2, '0')}</option>)}
            </select>
            <select value={pm ? 'PM' : 'AM'} onChange={(e) => set(h12, m, e.target.value === 'PM')} aria-label={`${label}: AM or PM`} className={sel}>
                <option>AM</option><option>PM</option>
            </select>
        </span>
    );
};

const Toggle = ({ checked, onChange, label }) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
);

export default function GamesHoursCard() {
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState('');
    const [requests, setRequests] = useState([]);
    const [busy, setBusy] = useState(false);
    const [deciding, setDeciding] = useState('');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const take = (data) => { const f = formOf(data.schedule); setForm(f); setSaved(JSON.stringify(bodyOf(f))); setRequests(data.requests || []); };
    useEffect(() => {
        const load = () => api.get(BASE).then((r) => take(r.data)).catch((err) => setError(err.response?.data?.message || 'The games hours could not be loaded.'));
        load();
        const t = setInterval(() => { if (!document.hidden) api.get(BASE).then((r) => setRequests(r.data.requests || [])).catch(() => {}); }, 30000);
        return () => clearInterval(t);
    }, []);

    const setDay = (day, patch) => setForm((f) => ({ ...f, days: f.days.map((d) => (d.day === day ? { ...d, ...patch } : d)) }));
    const dirty = form && JSON.stringify(bodyOf(form)) !== saved;

    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setNotice(''); setError('');
        try { const r = await api.put(BASE, bodyOf(form)); take(r.data); setNotice(r.data.message); }
        catch (err) { setError(err.response?.data?.message || 'The games hours could not be saved.'); }
        finally { setBusy(false); }
    };
    const decide = async (id, decision, minutes) => {
        setDeciding(`${id}:${decision}:${minutes || ''}`); setNotice(''); setError('');
        try { const r = await api.post(`${BASE}/requests/${id}`, { decision, minutes }); setRequests(r.data.requests || []); setNotice(r.data.message); }
        catch (err) { setError(err.response?.data?.message || 'That did not go through.'); }
        finally { setDeciding(''); }
    };

    if (!form) return error ? <Banner onClose={() => setError('')}>{error}</Banner> : null;
    const pending = requests.filter((r) => r.status === 'pending');
    const answered = requests.filter((r) => r.status !== 'pending').slice(0, 5);

    return (
        <section className={`${CARD} overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md`}>
            <form onSubmit={save} noValidate className="p-5 lg:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Gamepad2 size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-slate-800">Games hours</h2>
                        <p className="text-sm text-slate-500">When your students can play games. Outside these hours they see when games open next.</p>
                    </div>
                    <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} label="Limit games to set hours" />
                </div>

                {notice && <div className="mt-4"><Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner></div>}
                {error && <div className="mt-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}

                {form.enabled && (
                    <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {form.days.map((d) => {
                            const name = DAYS.find(([x]) => x === d.day)[1];
                            return (
                                <li key={d.day} className={`grid gap-3 p-3 sm:grid-cols-[150px_auto_1fr] sm:items-center ${d.on ? '' : 'bg-slate-50/60'}`}>
                                    <label className="flex cursor-pointer items-center gap-3">
                                        <Toggle checked={d.on} onChange={(v) => setDay(d.day, { on: v })} label={`${name} open`} />
                                        <span className={`text-sm font-semibold ${d.on ? 'text-slate-800' : 'text-slate-400'}`}>{name}</span>
                                    </label>
                                    {d.on ? (
                                        <>
                                            {/* One rule a day (2026-11-14): all day, a time window, or minutes — not both. */}
                                            <select value={d.window ? 'window' : d.limit ? 'limit' : 'all'} aria-label={`${name}: how games are open`}
                                                onChange={(e) => setDay(d.day, { window: e.target.value === 'window', limit: e.target.value === 'limit' })}
                                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none sm:w-44">
                                                <option value="all">All day</option>
                                                <option value="window">Between times</option>
                                                <option value="limit">Minutes a day</option>
                                            </select>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {d.window && (<>
                                                    <Time12 value={d.start} onChange={(v) => setDay(d.day, { start: v })} label={`${name} from`} />
                                                    <span className="text-sm text-slate-400">to</span>
                                                    <Time12 value={d.end} onChange={(v) => setDay(d.day, { end: v })} label={`${name} to`} />
                                                </>)}
                                                {d.limit && (<>
                                                    <input type="number" min={5} max={1440} step={5} value={d.minutes} onChange={(e) => setDay(d.day, { minutes: e.target.value })} aria-label={`${name} minutes`} className={`${FIELD} w-20`} />
                                                    <span className="text-sm text-slate-500">minutes</span>
                                                </>)}
                                                {!d.window && !d.limit && <span className="text-sm font-semibold text-emerald-700">Open all day</span>}
                                            </div>
                                        </>
                                    ) : <span className="text-sm text-slate-400 sm:col-span-2">Closed</span>}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="mt-5 flex justify-end">
                    <button type="submit" disabled={busy || !dirty} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {dirty ? 'Save games hours' : 'Saved'}</button>
                </div>
            </form>

            {(pending.length > 0 || answered.length > 0) && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 lg:p-6">
                    <h3 className="text-sm font-bold text-slate-800">Requests to play {pending.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{pending.length} waiting</span>}</h3>
                    <ul className="mt-3 space-y-2">
                        {pending.map((r) => (
                            <li key={r._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-800">{r.student.name}{r.student.cardNumber && <span className="ml-2 font-mono text-xs font-normal text-slate-400">{r.student.cardNumber}</span>}</p>
                                    <p className="truncate text-xs text-slate-500">{time(r.at)}{r.note ? ` · “${r.note}”` : ''}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" disabled={!!deciding} onClick={() => decide(r._id, 'grant', 60)} className={BTN}>{deciding === `${r._id}:grant:60` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 1 hour</button>
                                    <button type="button" disabled={!!deciding} onClick={() => decide(r._id, 'grant', 0)} className={BTN2}>{deciding === `${r._id}:grant:` ? <Loader2 size={15} className="animate-spin" /> : null} Rest of today</button>
                                    <button type="button" disabled={!!deciding} onClick={() => decide(r._id, 'decline')} aria-label={`Decline ${r.student.name}`} className={`${BTN2} text-rose-600`}>{deciding === `${r._id}:decline:` ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}</button>
                                </div>
                            </li>
                        ))}
                        {answered.map((r) => (
                            <li key={r._id} className="flex items-center justify-between gap-3 px-1 text-sm">
                                <span className="truncate text-slate-600">{r.student.name}</span>
                                <span className={`shrink-0 text-xs font-semibold ${r.status === 'granted' ? 'text-emerald-700' : 'text-slate-400'}`}>{r.status === 'granted' ? `Allowed until ${time(r.until)}` : 'Declined'}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
