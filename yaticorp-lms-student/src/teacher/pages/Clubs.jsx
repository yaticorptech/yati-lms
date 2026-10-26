/**
 * My Clubs: the clubs of the teacher's organization they are in charge of
 * (the organization chooses). The teacher adds each club's events — they go
 * on the members' calendar — and marks who came. Members, their posts and
 * approvals stay with the organization. Server: src/nccnss/teacher.js.
 */
import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, CalendarDays, Trash2, ArrowLeft, Crown, MapPin } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, CardTitle, EmptyState, Loading, ErrorNote, OkNote, Field, Modal, Badge } from '../ui';
import { btn, inputClass, fmtDate } from '../kit';

const KINDS = [['meeting', 'Meeting'], ['practice', 'Practice / rehearsal'], ['competition', 'Competition / match'], ['performance', 'Performance / show'], ['drive', 'Drive / activity'], ['camp', 'Camp / trip']];
const KIND_LABEL = Object.fromEntries(KINDS);
const CATEGORY_LABEL = { cultural: 'Cultural', sports: 'Sports', technical: 'Technical', literary: 'Literary & Debate', arts: 'Arts & Music', social: 'Social service', other: 'Other' };
const ROLE_LABEL = { president: 'President', vice_president: 'Vice President', secretary: 'Secretary', treasurer: 'Treasurer', coordinator: 'Coordinator', member: 'Member' };
const ROLE_ORDER = Object.keys(ROLE_LABEL);
const today = () => new Date().toISOString().slice(0, 10);

const EventModal = ({ clubId, onClose, onDone }) => {
    const [form, setForm] = useState({ kind: '', title: '', date: today(), hours: 1, place: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { onDone((await teacherApi.post(`/clubs/${clubId}/events`, form)).data.message); }
        catch (err) { setError(messageOf(err, 'Could not add the event.')); setBusy(false); }
    };
    return (
        <Modal title="Add an event" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <Field id="ev-kind" label="Type">
                    {/* Typed freely; the list only suggests. */}
                    <input id="ev-kind" list="ev-kinds" className={inputClass} value={form.kind} onChange={(e) => set('kind', e.target.value)} maxLength={40} placeholder="e.g. Rehearsal, Inter-college fest" />
                    <datalist id="ev-kinds">{KINDS.map(([, l]) => <option key={l} value={l} />)}</datalist>
                </Field>
                <Field id="ev-title" label="Title">
                    <input id="ev-title" className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Annual day rehearsal" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field id="ev-date" label="Date"><input id="ev-date" type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} required /></Field>
                    <Field id="ev-hours" label="Hours it counts"><input id="ev-hours" type="number" min="0" max="240" step="0.5" className={inputClass} value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
                </div>
                <Field id="ev-place" label="Place" optional><input id="ev-place" className={inputClass} value={form.place} onChange={(e) => set('place', e.target.value)} /></Field>
                <ErrorNote>{error}</ErrorNote>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                    <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Adding…' : 'Add to calendar'}</button>
                </div>
            </form>
        </Modal>
    );
};

const AttendanceModal = ({ clubId, event, members, onClose, onDone }) => {
    const [present, setPresent] = useState(() => new Set((event.presentMemberIds || []).map(String)));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const toggle = (id) => setPresent((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const save = async () => {
        setBusy(true); setError('');
        try { onDone((await teacherApi.put(`/clubs/${clubId}/events/${event._id}/attendance`, { presentMemberIds: [...present] })).data.message); }
        catch (err) { setError(messageOf(err, 'Could not save attendance.')); setBusy(false); }
    };
    return (
        <Modal title={`Attendance — ${event.title}`} onClose={onClose}
            footer={<><button type="button" onClick={onClose} className={btn.secondary}>Cancel</button><button type="button" onClick={save} disabled={busy} className={btn.primary}>Save ({present.size} present)</button></>}>
            {members.length === 0 ? <p className="text-sm text-slate-500">The club has no members yet.</p> : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {members.map((m) => (
                        <li key={m._id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                                <input type="checkbox" checked={present.has(String(m._id))} onChange={() => toggle(String(m._id))} className="h-4 w-4 accent-emerald-600" />
                                <span className="font-semibold text-slate-800">{m.student.name}</span>
                                {m.role !== 'member' && <span className="text-xs text-slate-500">{ROLE_LABEL[m.role]}</span>}
                            </label>
                        </li>
                    ))}
                </ul>
            )}
            <ErrorNote>{error}</ErrorNote>
        </Modal>
    );
};

const ClubDetail = ({ id, onBack }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [adding, setAdding] = useState(false);
    const [marking, setMarking] = useState(null);
    const [now] = useState(() => Date.now());

    const load = useCallback(() => teacherApi.get(`/clubs/${id}`).then((r) => { setData(r.data); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load the club.'))), [id]);
    useEffect(() => { load(); }, [load]);
    const done = (msg) => { setAdding(false); setMarking(null); setOk(msg); load(); };
    const remove = async (e) => {
        if (!window.confirm(`Delete "${e.title}"?`)) return;
        try { done((await teacherApi.delete(`/clubs/${id}/events/${e._id}`)).data.message); } catch (err) { setError(messageOf(err, 'Could not delete.')); }
    };

    if (!data) return error ? <ErrorNote onRetry={load}>{error}</ErrorNote> : <Loading />;
    const members = [...data.members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> My clubs</button>
            <PageHeader icon={Users} title={data.club.name} subtitle={`${CATEGORY_LABEL[data.club.category] || 'Club'} · ${members.length} member${members.length === 1 ? '' : 's'}`}
                actions={<button type="button" onClick={() => setAdding(true)} className={btn.primary}><Plus size={16} /> Add event</button>} />
            <OkNote>{ok}</OkNote>
            <ErrorNote>{error}</ErrorNote>
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
                    <CardTitle icon={Crown}>Members</CardTitle>
                    {members.length === 0 ? <p className="text-sm text-slate-500">No members yet. Students ask to join, and the organization approves them.</p> : (
                        <ul className="space-y-2">
                            {members.map((m) => (
                                <li key={m._id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate font-semibold text-slate-800">{m.student.name}</span>
                                    <Badge tone={m.role === 'member' ? undefined : 'bg-emerald-100 text-emerald-800'}>{ROLE_LABEL[m.role] || 'Member'}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
            {adding && <EventModal clubId={id} onClose={() => setAdding(false)} onDone={done} />}
            {marking && <AttendanceModal clubId={id} event={marking} members={members} onClose={() => setMarking(null)} onDone={done} />}
        </div>
    );
};

export default function TeacherClubs() {
    const [clubs, setClubs] = useState(null);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);

    const load = useCallback(() => teacherApi.get('/clubs').then((r) => { setClubs(r.data.clubs); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load your clubs.'))), []);
    useEffect(() => { load(); }, [load]);

    if (open) return <ClubDetail id={open} onBack={() => { setOpen(null); load(); }} />;
    return (
        <div className="space-y-5">
            <PageHeader icon={Users} title="My Clubs" subtitle="Clubs you are in charge of. Add their events; the members see them on their calendar." />
            {!clubs ? (error ? <ErrorNote onRetry={load}>{error}</ErrorNote> : <Loading />) : clubs.length === 0 ? (
                <EmptyState icon={Users} title="No clubs in your charge">
                    Your organization chooses the teacher in charge of each club. Once they pick you, the club shows up here.
                </EmptyState>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {clubs.map((c) => (
                        <button key={c._id} type="button" onClick={() => setOpen(c._id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-black text-slate-900">{c.name}</p>
                                <Badge>{CATEGORY_LABEL[c.category] || 'Club'}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{c.members} member{c.members === 1 ? '' : 's'}</p>
                            <p className="mt-1 text-xs text-slate-500">{c.nextEvent ? `Next: ${c.nextEvent.title} · ${fmtDate(c.nextEvent.date)}` : 'No event coming up'}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
