/**
 * @description Local jobs the admin posts for students — the table, and the
 *              form behind "Add job" / "Edit".
 *
 * Every row here is shown to students on the job's dates, filtered by the
 * age rules on the server: a job with minimum age 14 classed youth-safe
 * reaches a 15-year-old's board; one classed general does not. The form
 * says so beside the fields so the operator sees the consequence of what
 * they pick, and the server refuses a combination the rules would never
 * show anyone.
 */
import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { MapPin, Plus, Pencil, Trash2, RefreshCw, X, CalendarDays, BadgeCheck, Loader2, Users } from 'lucide-react';

const toInput = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const dateRange = (j) => (toInput(j.startsAt) === toInput(j.endsAt) ? fmt(j.startsAt) : `${fmt(j.startsAt)} – ${fmt(j.endsAt)}`);

const BLANK = {
    title: '', organizationName: '', verified: true, organizationAbout: '',
    description: '', category: 'events', opportunityType: 'gig', interests: [],
    area: '', city: 'Bengaluru', landmark: '',
    startsAt: '', endsAt: '', timeLabel: '', hoursPerSession: '2-4', slots: 1,
    minimumAge: 18, maximumAge: '', compensationKind: 'paid', compensationLabel: '',
    safetyClassification: 'general', guardianApprovalRequired: true, supervision: '', safetyNotes: '',
    contactEmail: '', contactPhone: '', status: 'open'
};

const fromJob = (j) => ({
    ...BLANK,
    title: j.title, organizationName: j.organization?.name || '', verified: !!j.organization?.verified, organizationAbout: j.organization?.about || '',
    description: j.description || '', category: j.category, opportunityType: j.opportunityType, interests: j.interests || [],
    area: j.location?.area || '', city: j.location?.city || '', landmark: j.location?.landmark || '',
    startsAt: toInput(j.startsAt), endsAt: toInput(j.endsAt), timeLabel: j.timeLabel || '', hoursPerSession: j.hoursPerSession || '2-4', slots: j.slots || 1,
    minimumAge: j.minimumAge, maximumAge: j.maximumAge ?? '', compensationKind: j.compensation?.kind || 'paid', compensationLabel: j.compensation?.label || '',
    safetyClassification: j.safetyClassification, guardianApprovalRequired: j.guardianApprovalRequired !== false, supervision: j.supervision || '', safetyNotes: j.safetyNotes || '',
    contactEmail: j.contact?.email || '', contactPhone: j.contact?.phone || '', status: j.status
});

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

const Field = ({ label, children, hint, span = 1 }) => (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
        <label className={LABEL}>{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
);

const SAFETY_TONE = { 'youth-safe': 'bg-emerald-50 text-emerald-700', supervised: 'bg-sky-50 text-sky-700', general: 'bg-slate-100 text-slate-600', restricted: 'bg-rose-50 text-rose-700' };

/** Who will see this job, from the same facts the server's rules read. */
const audience = (f) => {
    const min = Number(f.minimumAge);
    if (!Number.isFinite(min)) return '';
    if (min < 14) return 'Not allowed — nobody under 14 may be offered a job.';
    if (min < 18) {
        const teenOk = ['youth-safe', 'supervised'].includes(f.safetyClassification) && f.verified && ['gig', 'event-support'].includes(f.opportunityType);
        return teenOk
            ? `Shown to students aged ${min}+ (with guardian approval) and to adults.`
            : `Minimum age is ${min}, but 14–17s only see verified one-day or event jobs classed youth-safe or supervised — as set, only adults will see this.`;
    }
    return 'Shown to students aged 18 and over only.';
};

const JobForm = ({ initial, vocab, onClose, onSaved }) => {
    const [f, setF] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (patch) => { setError(''); setF((x) => ({ ...x, ...patch })); };
    const toggleInterest = (id) => set({ interests: f.interests.includes(id) ? f.interests.filter((x) => x !== id) : [...f.interests, id] });

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const body = { ...f, endsAt: f.endsAt || f.startsAt, maximumAge: f.maximumAge === '' ? null : Number(f.maximumAge), minimumAge: Number(f.minimumAge), slots: Number(f.slots) || 1 };
            const res = initial.id
                ? await api.put(`/jobs/admin/opportunities/${initial.id}`, body)
                : await api.post('/jobs/admin/opportunities', body);
            onSaved(res.data.job);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Could not save the job.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <form role="dialog" aria-modal="true" onSubmit={submit} onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                    <h3 className="font-bold text-slate-800">{initial.id ? 'Edit local job' : 'Add a local job'}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
                </div>

                <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
                    <Field label="Title" span={2}><input value={f.title} onChange={(e) => set({ title: e.target.value })} className={INPUT} required placeholder="e.g. Diwali sweet boxing helpers" /></Field>
                    <Field label="Organisation"><input value={f.organizationName} onChange={(e) => set({ organizationName: e.target.value })} className={INPUT} required /></Field>
                    <Field label="Verified organisation" hint="Under-18s only ever see verified organisations.">
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <input type="checkbox" checked={f.verified} onChange={(e) => set({ verified: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                            <BadgeCheck size={14} className="text-emerald-600" /> Verified by the LMS team
                        </label>
                    </Field>
                    <Field label="Description" span={2}><textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={INPUT} /></Field>

                    <Field label="Category">
                        <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={INPUT}>
                            {vocab.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Job type">
                        <select value={f.opportunityType} onChange={(e) => set({ opportunityType: e.target.value })} className={INPUT}>
                            {vocab.types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Also matches interests" span={2} hint="Students who picked these interests see it ranked higher.">
                        <div className="flex flex-wrap gap-1.5">
                            {vocab.categories.map((c) => (
                                <button key={c.id} type="button" onClick={() => toggleInterest(c.id)} aria-pressed={f.interests.includes(c.id)}
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${f.interests.includes(c.id) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>
                                    {c.icon} {c.label}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Starts on"><input type="date" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value, endsAt: f.endsAt && f.endsAt < e.target.value ? e.target.value : f.endsAt })} className={INPUT} required /></Field>
                    <Field label="Ends on" hint="Leave blank for a one-day job."><input type="date" value={f.endsAt} min={f.startsAt} onChange={(e) => set({ endsAt: e.target.value })} className={INPUT} /></Field>
                    <Field label="Time"><input value={f.timeLabel} onChange={(e) => set({ timeLabel: e.target.value })} className={INPUT} placeholder="e.g. 10:00–14:00" /></Field>
                    <Field label="Hours per session">
                        <select value={f.hoursPerSession} onChange={(e) => set({ hoursPerSession: e.target.value })} className={INPUT}>
                            {vocab.hours.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Area"><input value={f.area} onChange={(e) => set({ area: e.target.value })} className={INPUT} placeholder="e.g. Jayanagar" /></Field>
                    <Field label="City"><input value={f.city} onChange={(e) => set({ city: e.target.value })} className={INPUT} /></Field>
                    <Field label="Landmark" span={2}><input value={f.landmark} onChange={(e) => set({ landmark: e.target.value })} className={INPUT} placeholder="e.g. Gandhi Bazaar" /></Field>

                    <Field label="Minimum age"><input type="number" min={14} max={99} value={f.minimumAge} onChange={(e) => set({ minimumAge: e.target.value })} className={INPUT} required /></Field>
                    <Field label="Maximum age" hint="Optional."><input type="number" min={14} max={99} value={f.maximumAge} onChange={(e) => set({ maximumAge: e.target.value })} className={INPUT} /></Field>
                    <Field label="Safety classification" span={2}>
                        <select value={f.safetyClassification} onChange={(e) => set({ safetyClassification: e.target.value })} className={INPUT}>
                            {vocab.safety.map((s) => <option key={s.id} value={s.id}>{s.label} — {s.blurb}</option>)}
                        </select>
                        <p className={`mt-1.5 rounded-lg px-3 py-2 text-xs font-medium ${Number(f.minimumAge) < 18 && !audience(f).startsWith('Shown to students aged ' + f.minimumAge) ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>{audience(f)}</p>
                    </Field>
                    <Field label="Supervision" span={2}><input value={f.supervision} onChange={(e) => set({ supervision: e.target.value })} className={INPUT} placeholder="Who supervises, and how" /></Field>
                    <Field label="Safety notes" span={2}><input value={f.safetyNotes} onChange={(e) => set({ safetyNotes: e.target.value })} className={INPUT} placeholder="Daytime only, no cash handling…" /></Field>

                    <Field label="Pay"><input value={f.compensationLabel} onChange={(e) => set({ compensationLabel: e.target.value })} className={INPUT} placeholder="e.g. ₹500/day · lunch" /></Field>
                    <Field label="Pay kind">
                        <select value={f.compensationKind} onChange={(e) => set({ compensationKind: e.target.value })} className={INPUT}>
                            {['paid', 'stipend', 'volunteer', 'free'].map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </Field>
                    <Field label="Spots"><input type="number" min={1} value={f.slots} onChange={(e) => set({ slots: e.target.value })} className={INPUT} /></Field>
                    <Field label="Status">
                        <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={INPUT}>
                            <option value="open">Open — shown to students</option>
                            <option value="closed">Closed — hidden</option>
                        </select>
                    </Field>
                    <Field label="Contact email" hint="Shown to adults only; never to a minor."><input type="email" value={f.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} className={INPUT} /></Field>
                    <Field label="Contact phone"><input value={f.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} className={INPUT} /></Field>
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 p-4">
                    {error && <p className="flex-1 text-sm font-medium text-red-600">{error}</p>}
                    <button type="button" onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {busy && <Loader2 size={14} className="animate-spin" />} {initial.id ? 'Save changes' : 'Publish job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const LocalJobsPanel = () => {
    const [jobs, setJobs] = useState([]);
    const [vocab, setVocab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);   // BLANK or fromJob(job) with id
    const [showPast, setShowPast] = useState(false);

    // Loading starts true and is only ever cleared here; a manual refresh
    // sets it again from the click, not from inside the effect.
    const load = useCallback(() => {
        api.get('/jobs/admin/opportunities')
            .then((r) => { setJobs(r.data.jobs || []); setVocab(r.data.vocab); setError(''); })
            .catch((err) => setError(err.response?.data?.error || err.response?.data?.message || 'Could not load local jobs.'))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const remove = async (job) => {
        if (!window.confirm(`Delete "${job.title}"?\n\nStudents who marked it interested lose it from their list.`)) return;
        try {
            await api.delete(`/jobs/admin/opportunities/${job.id}`);
            setJobs((rows) => rows.filter((j) => j.id !== job.id));
        } catch (err) {
            setError(err.response?.data?.error || 'Could not delete the job.');
        }
    };

    const onSaved = (job) => {
        setJobs((rows) => (rows.some((j) => j.id === job.id) ? rows.map((j) => (j.id === job.id ? job : j)) : [...rows, job]).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)));
        setEditing(null);
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const visible = jobs.filter((j) => showPast || new Date(j.endsAt) >= today);
    const label = (list, id) => list?.find((x) => x.id === id)?.label || id;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><MapPin size={16} className="text-indigo-500" /> Local jobs</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Posted here, shown to students on the job&apos;s dates. The age rules decide who sees each one — the form tells you as you fill it in.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600" /> Show past
                    </label>
                    <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
                    <button onClick={() => setEditing({ ...BLANK })} disabled={!vocab} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Plus size={15} /> Add job</button>
                </div>
            </div>

            {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

            {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading local jobs…</p>
            ) : visible.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No {showPast ? '' : 'upcoming '}local jobs yet — add one and it appears on students&apos; boards on its dates.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="py-2 pr-3">Job</th>
                                <th className="py-2 pr-3">Dates</th>
                                <th className="py-2 pr-3">Ages</th>
                                <th className="py-2 pr-3">Safety</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((j) => (
                                <tr key={j.id} className="align-top">
                                    <td className="py-3 pr-3">
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-xl leading-none">{j.icon}</span>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800">{j.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {j.organization?.name}{j.organization?.verified && <BadgeCheck size={12} className="ml-1 inline text-emerald-600" />}
                                                    {' · '}{label(vocab?.categories, j.category)} · {label(vocab?.types, j.opportunityType)}
                                                    {j.location?.area ? ` · ${j.location.area}` : ''}
                                                    {j.slots > 1 && <> · <Users size={11} className="inline" /> {j.slots}</>}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-3 whitespace-nowrap text-slate-700"><CalendarDays size={13} className="mr-1 inline text-slate-400" />{dateRange(j)}{j.timeLabel ? <span className="block text-xs text-slate-400">{j.timeLabel}</span> : null}</td>
                                    <td className="py-3 pr-3 whitespace-nowrap text-slate-700">{j.minimumAge}{j.maximumAge != null ? `–${j.maximumAge}` : '+'}</td>
                                    <td className="py-3 pr-3"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${SAFETY_TONE[j.safetyClassification] || ''}`}>{j.safetyClassification}</span></td>
                                    <td className="py-3 pr-3">
                                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${j.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{j.status}</span>
                                        {j.source === 'seed' && <span className="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700" title="Starter row — edit it and it becomes yours">demo</span>}
                                    </td>
                                    <td className="py-3 text-right whitespace-nowrap">
                                        <button onClick={() => setEditing({ ...fromJob(j), id: j.id })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" title="Edit" aria-label={`Edit ${j.title}`}><Pencil size={15} /></button>
                                        <button onClick={() => remove(j)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete" aria-label={`Delete ${j.title}`}><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && vocab && <JobForm initial={editing} vocab={vocab} onClose={() => setEditing(null)} onSaved={onSaved} />}
        </div>
    );
};

export default LocalJobsPanel;
