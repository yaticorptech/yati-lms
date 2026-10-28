/**
 * My Units: the Scouts & Guides units of the teacher's organization they lead
 * (the organization chooses). The leader approves students asking to join,
 * adds the unit's events — they go on the members' calendar — and marks who
 * came. Creating units, choosing leaders and moving members stay with the
 * organization. Server: src/nccnss/leader.js.
 */
import { useCallback, useEffect, useState } from 'react';
import { Compass, Plus, CalendarDays, Trash2, ArrowLeft, Users, MapPin } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, CardTitle, EmptyState, Loading, ErrorNote, OkNote, Field, Modal, Badge } from '../ui';
import { btn, inputClass, fmtDate } from '../kit';

const KINDS = [['meeting', 'Meeting'], ['camp', 'Camp'], ['hike', 'Hike'], ['service', 'Service / drive'], ['test', 'Badge test'], ['parade', 'Parade']];
const KIND_LABEL = Object.fromEntries(KINDS);
const today = () => new Date().toISOString().slice(0, 10);

const EventModal = ({ unitId, onClose, onDone }) => {
    const [form, setForm] = useState({ kind: '', title: '', date: today(), hours: 1, place: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { onDone((await teacherApi.post(`/scout-units/${unitId}/events`, form)).data.message); }
        catch (err) { setError(messageOf(err, 'Could not add the event.')); setBusy(false); }
    };
    return (
        <Modal title="Add an event" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <Field id="su-kind" label="Type">
                    {/* Typed freely; the list only suggests. "Camp" counts towards the camps target. */}
                    <input id="su-kind" list="su-kinds" className={inputClass} value={form.kind} onChange={(e) => set('kind', e.target.value)} maxLength={40} placeholder="e.g. Weekly meeting, Annual camp" />
                    <datalist id="su-kinds">{KINDS.map(([, l]) => <option key={l} value={l} />)}</datalist>
                </Field>
                <Field id="su-title" label="Title">
                    <input id="su-title" className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Knots and first aid" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field id="su-date" label="Date"><input id="su-date" type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} required /></Field>
                    <Field id="su-hours" label="Hours it counts"><input id="su-hours" type="number" min="0" max="240" step="0.5" className={inputClass} value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
                </div>
                <Field id="su-place" label="Place" optional><input id="su-place" className={inputClass} value={form.place} onChange={(e) => set('place', e.target.value)} /></Field>
                <ErrorNote>{error}</ErrorNote>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                    <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Adding…' : 'Add to calendar'}</button>
                </div>
            </form>
        </Modal>
    );
};

const AttendanceModal = ({ unitId, event, members, onClose, onDone }) => {
    const [present, setPresent] = useState(() => new Set((event.presentMemberIds || []).map(String)));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const toggle = (id) => setPresent((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const save = async () => {
        setBusy(true); setError('');
        try { onDone((await teacherApi.put(`/scout-units/${unitId}/events/${event._id}/attendance`, { presentMemberIds: [...present] })).data.message); }
        catch (err) { setError(messageOf(err, 'Could not save attendance.')); setBusy(false); }
    };
    return (
        <Modal title={`Attendance — ${event.title}`} onClose={onClose}
            footer={<><button type="button" onClick={onClose} className={btn.secondary}>Cancel</button><button type="button" onClick={save} disabled={busy} className={btn.primary}>Save ({present.size} present)</button></>}>
            {members.length === 0 ? <p className="text-sm text-slate-500">The unit has no members yet.</p> : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {members.map((m) => (
                        <li key={m._id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                                <input type="checkbox" checked={present.has(String(m._id))} onChange={() => toggle(String(m._id))} className="h-4 w-4 accent-emerald-600" />
                                <span className="font-semibold text-slate-800">{m.student.name}</span>
                            </label>
                        </li>
                    ))}
                </ul>
            )}
            <ErrorNote>{error}</ErrorNote>
        </Modal>
    );
};

const UnitDetail = ({ id, onBack }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [adding, setAdding] = useState(false);
    const [marking, setMarking] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [now] = useState(() => Date.now());

    const load = useCallback(() => teacherApi.get(`/scout-units/${id}`).then((r) => { setData(r.data); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load the unit.'))), [id]);
    useEffect(() => { load(); }, [load]);
    const done = (msg) => { setAdding(false); setMarking(null); setOk(msg); load(); };
    const remove = async (e) => {
        if (!window.confirm(`Delete "${e.title}"?`)) return;
        try { done((await teacherApi.delete(`/scout-units/${id}/events/${e._id}`)).data.message); } catch (err) { setError(messageOf(err, 'Could not delete.')); }
    };
    const decide = async (m, status) => {
        setBusyId(m._id);
        try { done((await teacherApi.put(`/scout-units/${id}/members/${m._id}`, { status })).data.message); }
        catch (err) { setError(messageOf(err, 'That did not go through.')); }
        finally { setBusyId(null); }
    };

    if (!data) return error ? <ErrorNote onRetry={load}>{error}</ErrorNote> : <Loading />;
    const members = data.members.filter((m) => m.status === 'active');
    const requests = data.members.filter((m) => m.status === 'pending');
    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> My units</button>
            <PageHeader icon={Compass} title={data.unit.name} subtitle={`${data.unit.sectionLabel} · ${members.length} member${members.length === 1 ? '' : 's'}${data.unit.regNo ? ` · Reg. ${data.unit.regNo}` : ''}`}
                actions={<button type="button" onClick={() => setAdding(true)} className={btn.primary}><Plus size={16} /> Add event</button>} />
            <OkNote>{ok}</OkNote>
            <ErrorNote>{error}</ErrorNote>
            {requests.length > 0 && (
                <Card>
                    <CardTitle icon={Users}>Asking to join ({requests.length})</CardTitle>
                    <ul className="divide-y divide-slate-100">
                        {requests.map((m) => (
                            <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                <span className="min-w-0">
                                    <span className="block font-semibold text-slate-800">{m.student.name}</span>
                                    <span className="text-xs text-slate-500">{m.student.cardNumber}{m.note ? ` · “${m.note}”` : ''}</span>
                                </span>
                                <span className="flex gap-2">
                                    <button type="button" disabled={busyId === m._id} onClick={() => decide(m, 'rejected')} className={btn.secondary}>Reject</button>
                                    <button type="button" disabled={busyId === m._id} onClick={() => decide(m, 'active')} className={btn.primary}>Approve</button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Card>
                    <CardTitle icon={CalendarDays}>Events</CardTitle>
                    {data.events.length === 0 ? <p className="text-sm text-slate-500">No events yet. Add one and the members see it on their calendar.</p> : (
                        <ul className="divide-y divide-slate-100">
                            {data.events.map((e) => {
                                const upcoming = new Date(e.date).getTime() > now;
                                return (
                                    <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800">{e.title}</p>
                                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">{fmtDate(e.date)} · {KIND_LABEL[e.kind] || e.kind}{e.place && <span className="inline-flex items-center gap-0.5"><MapPin size={11} />{e.place}</span>}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {upcoming ? <Badge tone="bg-sky-100 text-sky-700">Upcoming</Badge> : e.attendanceTaken ? <Badge tone="bg-emerald-100 text-emerald-700">{e.presentCount} present</Badge> : <Badge tone="bg-amber-100 text-amber-800">Attendance not taken</Badge>}
                                            {!upcoming && <button type="button" onClick={() => setMarking(e)} className={btn.ghost}>Attendance</button>}
                                            <button type="button" onClick={() => remove(e)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label={`Delete ${e.title}`}><Trash2 size={15} /></button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
                <Card>
                    <CardTitle icon={Users}>Members</CardTitle>
                    {members.length === 0 ? <p className="text-sm text-slate-500">No members yet. Students ask to join from their Extra Curricular page.</p> : (
                        <ul className="space-y-2.5">
                            {members.map((m) => (
                                <li key={m._id} className="text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-semibold text-slate-800">{m.student.name}</span>
                                        {m.summary?.attendance != null && <Badge tone={m.summary.attendance < m.summary.minAttendance ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}>{m.summary.attendance}%</Badge>}
                                    </div>
                                    {m.summary && <p className="text-xs text-slate-500">{m.summary.hours} h · {m.summary.camps} camp{m.summary.camps === 1 ? '' : 's'}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
            {adding && <EventModal unitId={id} onClose={() => setAdding(false)} onDone={done} />}
            {marking && <AttendanceModal unitId={id} event={marking} members={members} onClose={() => setMarking(null)} onDone={done} />}
        </div>
    );
};

export default function TeacherScoutUnits() {
    const [units, setUnits] = useState(null);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);

    const load = useCallback(() => teacherApi.get('/scout-units').then((r) => { setUnits(r.data.units); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load your units.'))), []);
    useEffect(() => { load(); }, [load]);

    if (open) return <UnitDetail id={open} onBack={() => { setOpen(null); load(); }} />;
    return (
        <div className="space-y-5">
            <PageHeader icon={Compass} title="My Units" subtitle="Scouts & Guides units you lead. Approve new members, add events and take attendance." />
            {!units ? (error ? <ErrorNote onRetry={load}>{error}</ErrorNote> : <Loading />) : units.length === 0 ? (
                <EmptyState icon={Compass} title="No units to lead">
                    Your organization chooses each unit&apos;s leaders. Once they add you, the unit shows up here.
                </EmptyState>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {units.map((u) => (
                        <button key={u._id} type="button" onClick={() => setOpen(u._id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-black text-slate-900">{u.name}</p>
                                <Badge>{u.sectionLabel}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                                {u.members} member{u.members === 1 ? '' : 's'}
                                {u.pending > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{u.pending} asking to join</span>}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{u.nextEvent ? `Next: ${u.nextEvent.title} · ${fmtDate(u.nextEvent.date)}` : 'No event coming up'}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
