/**
 * Dashboard → Access hours: the days and the daily window when this
 * organization's students may use YATICORP. Outside them a student can still
 * sign in, but sees when the platform opens instead of their pages (server:
 * organizations/services/accessSchedule.js). India time. A closing time
 * before the opening time runs overnight.
 */
import React, { useEffect, useState } from 'react';
import { Clock, Loader2, Check } from 'lucide-react';
import api from '../utils/api';
import { CARD, INPUT, LABEL, BTN, Banner } from './orgUi';

const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];

export default function AccessHoursCard() {
    const [form, setForm] = useState(null);         // { enabled, days, start, end }
    const [hours, setHours] = useState('');
    const [open, setOpen] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/organizations/me/schedule')
            .then((r) => { setForm({ enabled: !!r.data.schedule.enabled, days: r.data.schedule.days || [], start: r.data.schedule.start, end: r.data.schedule.end }); setHours(r.data.hours); setOpen(r.data.open); })
            .catch((err) => setError(err.response?.data?.message || 'The access hours could not be loaded.'));
    }, []);

    const toggleDay = (d) => setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setNotice(''); setError('');
        try {
            const r = await api.put('/organizations/me/schedule', form);
            setHours(r.data.hours); setOpen(r.data.open); setNotice(r.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'The access hours could not be saved.');
        } finally { setBusy(false); }
    };

    if (!form) return error ? <Banner onClose={() => setError('')}>{error}</Banner> : null;

    return (
        <form onSubmit={save} className={`${CARD} p-5 lg:p-6`} noValidate>
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Clock size={20} /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-800">Access hours</h2>
                    <p className="text-sm text-slate-500">When your students can use YATICORP. Outside these hours they can sign in, but see when the platform opens.</p>
                </div>
            </div>

            {notice && <div className="mb-4"><Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner></div>}
            {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-3.5">
                <span>
                    <span className="block text-sm font-bold text-slate-800">Limit access to set hours</span>
                    <span className="block text-xs text-slate-500">Off: students can use the platform at any time.</span>
                </span>
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="h-5 w-5 shrink-0 accent-indigo-600" />
            </label>

            {form.enabled && (
                <div className="mt-4 space-y-4">
                    <fieldset>
                        <legend className={LABEL}>Days</legend>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(([d, label]) => (
                                <button key={d} type="button" aria-pressed={form.days.includes(d)} onClick={() => toggleDay(d)}
                                    className={`min-w-[3.25rem] rounded-xl px-3 py-2 text-sm font-bold transition-colors ${form.days.includes(d) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
                            ))}
                        </div>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                        <div>
                            <label htmlFor="hours-start" className={LABEL}>Opens at</label>
                            <input id="hours-start" type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} className={INPUT} />
                        </div>
                        <div>
                            <label htmlFor="hours-end" className={LABEL}>Closes at</label>
                            <input id="hours-end" type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} className={INPUT} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">India time. A closing time before the opening time runs overnight (for example 10:00 pm to 6:00 am).</p>
                </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600">
                    {hours}{open !== null && hours !== 'Open all the time' ? <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${open ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{open ? 'Open now' : 'Closed now'}</span> : null}
                </p>
                <button type="submit" disabled={busy} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save hours</button>
            </div>
        </form>
    );
}
