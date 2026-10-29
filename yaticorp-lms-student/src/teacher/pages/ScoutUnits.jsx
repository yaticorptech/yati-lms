/**
 * My Units: the Scouts & Guides units of the teacher's organization they lead
 * (the organization chooses). The leader approves students asking to join,
 * adds the unit's events — they go on the members' calendar — marks who
 * came, and records ranks passed, badges and trainings, which the
 * organization approves. Creating units, choosing leaders and moving members stay with the
 * organization. Server: src/nccnss/leader.js.
 */
import { useCallback, useEffect, useState } from 'react';
import { Compass, Plus, CalendarDays, Trash2, ArrowLeft, Users, MapPin, Award, UserPlus, Search, Mail, Phone, CreditCard, CheckCircle2, XCircle, Image as ImageIcon, ChevronRight, UserMinus } from 'lucide-react';
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

/** Pick students of the organization and put them straight into the unit. */
const AddMembersModal = ({ unit, onClose, onDone }) => {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');
    const [added, setAdded] = useState(0);
    const load = useCallback((q) => teacherApi.get(`/scout-units/${unit._id}/candidates`, { params: { search: q } })
        .then((r) => setStudents(r.data.students)).catch((err) => setError(messageOf(err, 'Could not load your students.'))), [unit._id]);
    useEffect(() => { const t = setTimeout(() => load(search), 250); return () => clearTimeout(t); }, [search, load]);
    const add = async (s) => {
        setBusyId(s._id); setError('');
        try { await teacherApi.post(`/scout-units/${unit._id}/members`, { userId: s._id }); setAdded((n) => n + 1); await load(search); }
        catch (err) { setError(messageOf(err, 'Could not add them.')); }
        finally { setBusyId(null); }
    };
    const close = () => (added ? onDone(`${added} student${added === 1 ? '' : 's'} added — each has been notified.`) : onClose());
    return (
        <Modal title={`Add students to ${unit.name}`} onClose={close}>
            <div className="space-y-3">
                <p className="text-sm text-slate-500">They join as {unit.sectionLabel} straight away and get a notification that you added them.</p>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputClass} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or card number" autoFocus />
                </div>
                <ErrorNote>{error}</ErrorNote>
                {students === null ? <Loading /> : students.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">No students found in your organization.</p> : (
                    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {students.map((s) => (
                            <li key={s._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold text-slate-800">{s.name}</span>
                                    <span className="block truncate text-xs text-slate-500">{s.cardNumber || s.email}</span>
                                </span>
                                {s.inUnit === 'this' && !s.pending ? <Badge tone="bg-emerald-100 text-emerald-700">In this unit</Badge>
                                    : s.inUnit && s.inUnit !== 'this' ? <Badge tone="bg-slate-100 text-slate-600">In {s.inUnit}</Badge>
                                    : <button type="button" disabled={busyId === s._id} onClick={() => add(s)} className={btn.primary}>{busyId === s._id ? 'Adding…' : s.pending ? 'Approve & add' : <><Plus size={14} /> Add</>}</button>}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex justify-end pt-1"><button type="button" onClick={close} className={btn.secondary}>Done</button></div>
            </div>
        </Modal>
    );
};

const AWARD_LABEL = { rank: 'Rank', badge: 'Badge', training: 'Training' };
const ACT_TONE = { approved: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-700' };

/** One member: who they are, how far they have got, and what the leader can do for them. */
const MemberModal = ({ unitId, memberId, onClose, onPromote, onDone }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        teacherApi.get(`/scout-units/${unitId}/members/${memberId}`).then((r) => setData(r.data)).catch((err) => setError(messageOf(err, 'Could not load the student.')));
    }, [unitId, memberId]);
    const remove = async () => {
        if (!window.confirm(`Take ${data.member.student.name} out of this unit? Their ranks and record are kept.`)) return;
        setBusy(true);
        try { onDone((await teacherApi.delete(`/scout-units/${unitId}/members/${memberId}`)).data.message); }
        catch (err) { setError(messageOf(err, 'Could not remove them.')); setBusy(false); }
    };
    const m = data?.member;
    const s = m?.summary;
    const ranks = data?.ranks || [];
    const at = m?.rank ? ranks.indexOf(m.rank) : -1;
    return (
        <Modal title={m ? m.student.name : 'Student'} onClose={onClose} wide>
            {!data ? (error ? <ErrorNote>{error}</ErrorNote> : <Loading />) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-4">
                        {m.student.profilePicture
                            ? <img src={m.student.profilePicture} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                            : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-700">{(m.student.name || '?')[0].toUpperCase()}</span>}
                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-900">{m.student.name}
                                <Badge tone="bg-amber-100 text-amber-800">{m.rank || 'No rank yet'}</Badge>
                                <Badge tone="bg-slate-100 text-slate-600">{m.sectionLabel}</Badge>
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                {m.student.cardNumber && <span className="inline-flex items-center gap-1"><CreditCard size={12} />{m.student.cardNumber}</span>}
                                {m.student.email && <a href={`mailto:${m.student.email}`} className="inline-flex items-center gap-1 hover:text-emerald-700"><Mail size={12} />{m.student.email}</a>}
                                {m.student.phone && <a href={`tel:${m.student.phone}`} className="inline-flex items-center gap-1 hover:text-emerald-700"><Phone size={12} />{m.student.phone}</a>}
                                {m.student.className && <span>Class {m.student.className}</span>}
                                <span>In the unit since {fmtDate(m.joinedAt)}</span>
                                {m.enrolmentNo && <span>Enrolment {m.enrolmentNo}</span>}
                            </div>
                        </div>
                    </div>

                    {s && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[['Hours', `${s.hours} / ${s.requiredHours}`], ['Camps', `${s.camps} / ${s.requiredCamps}`], ['Attendance', s.attendance == null ? '—' : `${s.attendance}%`], ['Awards', s.awards]].map(([l, v]) => (
                                <div key={l} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
                                    <p className="text-lg font-black text-slate-900">{v}</p>
                                </div>
                            ))}
                            <p className={`col-span-full text-xs font-semibold ${s.atRisk ? 'text-red-600' : 'text-slate-500'}`}>{s.next}</p>
                        </div>
                    )}

                    {ranks.length > 0 && (
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Rank path</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {ranks.map((r, i) => (
                                    <span key={r} className="flex items-center gap-1.5">
                                        {i > 0 && <span className={i <= at ? 'text-amber-500' : 'text-slate-300'}>→</span>}
                                        <span className={`rounded-full px-2.5 py-1 font-bold ${i === at ? 'bg-amber-500 text-white' : i < at ? 'bg-amber-100 text-amber-800' : i === at + 1 ? 'border border-dashed border-amber-400 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>{r}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Ranks, badges & training</p>
                            {!m.awards.length ? <p className="text-sm text-slate-500">Nothing recorded yet.</p> : (
                                <ul className="divide-y divide-slate-100 text-sm">
                                    {m.awards.map((a) => (
                                        <li key={a._id} className="flex items-center justify-between gap-2 py-2">
                                            <span className="min-w-0"><span className="font-semibold text-slate-800">{a.name}</span> <span className="text-xs text-slate-500">· {AWARD_LABEL[a.type]} · {fmtDate(a.date)}</span></span>
                                            <span className="flex shrink-0 items-center gap-1.5">
                                                {a.certificateUrl && <a href={a.certificateUrl} target="_blank" rel="noreferrer" className="text-emerald-700" aria-label="Certificate"><ImageIcon size={15} /></a>}
                                                {a.status === 'pending' ? <Badge tone="bg-amber-100 text-amber-800">Waiting</Badge> : <CheckCircle2 size={15} className="text-emerald-600" />}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Attendance</p>
                            {!data.attendance.length ? <p className="text-sm text-slate-500">No attendance taken since they joined.</p> : (
                                <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm">
                                    {data.attendance.map((e) => (
                                        <li key={e._id} className="flex items-center justify-between gap-2 py-2">
                                            <span className="min-w-0 truncate"><span className="font-semibold text-slate-800">{e.title}</span> <span className="text-xs text-slate-500">· {fmtDate(e.date)}</span></span>
                                            {e.present ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600" /> : <XCircle size={15} className="shrink-0 text-red-500" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Activities they logged</p>
                        {!data.activities.length ? <p className="text-sm text-slate-500">None yet.</p> : (
                            <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm">
                                {data.activities.map((a) => (
                                    <li key={a._id} className="flex items-center justify-between gap-2 py-2">
                                        <span className="min-w-0 truncate"><span className="font-semibold text-slate-800">{a.title}</span> <span className="text-xs text-slate-500">· {fmtDate(a.date)} · {a.hours} h</span></span>
                                        <span className="flex shrink-0 items-center gap-1.5">
                                            {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noreferrer" className="text-emerald-700" aria-label="Proof"><ImageIcon size={15} /></a>}
                                            <Badge tone={ACT_TONE[a.status] || ACT_TONE.pending}>{a.status}</Badge>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <ErrorNote>{error}</ErrorNote>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
                        <button type="button" disabled={busy || m.status !== 'active'} onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><UserMinus size={15} /> Remove from unit</button>
                        <button type="button" disabled={m.status !== 'active'} onClick={() => onPromote({ _id: m._id, student: m.student, rank: m.rank })} className={btn.primary}><Award size={15} /> Promote / record badge</button>
                    </div>
                </div>
            )}
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

const AWARD_TYPES = [['rank', 'Rank'], ['badge', 'Proficiency badge'], ['training', 'Training']];

/** Propose a rank, badge or training for a member; the organization approves it. */
const AwardModal = ({ unitId, member, ranks, onClose, onDone }) => {
    const next = ranks[member.rank ? ranks.indexOf(member.rank) + 1 : 0] || '';
    const [form, setForm] = useState({ type: ranks.length ? 'rank' : 'badge', name: next, date: today(), examiner: '', certificateNo: '', note: '' });
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === 'type' ? { name: '' } : {}) }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        const body = new FormData();
        Object.entries(form).forEach(([k, v]) => body.append(k, v));
        if (file) body.append('certificate', file);
        try { onDone((await teacherApi.post(`/scout-units/${unitId}/members/${member._id}/awards`, body)).data.message); }
        catch (err) { setError(messageOf(err, 'Could not record it.')); setBusy(false); }
    };
    return (
        <Modal title={`Promote / record for ${member.student.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <Field id="aw-type" label="What">
                    <select id="aw-type" className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
                        {AWARD_TYPES.filter(([v]) => v !== 'rank' || ranks.length).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Field>
                <Field id="aw-name" label={form.type === 'rank' ? 'Rank passed' : form.type === 'badge' ? 'Badge' : 'Training'}>
                    {form.type === 'rank' ? (
                        <select id="aw-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required>
                            <option value="">Choose…</option>
                            {ranks.map((r) => <option key={r} value={r}>{r}{member.rank === r ? ' (current)' : r === next ? ' (next)' : ''}</option>)}
                        </select>
                    ) : <input id="aw-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={form.type === 'badge' ? 'e.g. First Aid, Camper' : 'e.g. District camp'} required />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field id="aw-date" label="Date"><input id="aw-date" type="date" className={inputClass} value={form.date} max={today()} onChange={(e) => set('date', e.target.value)} required /></Field>
                    <Field id="aw-cert" label="Certificate no." optional><input id="aw-cert" className={inputClass} value={form.certificateNo} onChange={(e) => set('certificateNo', e.target.value)} /></Field>
                </div>
                <Field id="aw-exam" label="Tested / awarded by" optional><input id="aw-exam" className={inputClass} value={form.examiner} onChange={(e) => set('examiner', e.target.value)} /></Field>
                <Field id="aw-file" label="Certificate image" optional><input id="aw-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" /></Field>
                <p className="text-xs text-slate-500">It goes on their record at once{form.type === 'rank' ? ' and becomes their rank' : ''}, and they get a notification.</p>
                <ErrorNote>{error}</ErrorNote>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                    <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Saving…' : form.type === 'rank' ? 'Promote' : 'Save'}</button>
                </div>
            </form>
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
    const [recording, setRecording] = useState(null);
    const [enrolling, setEnrolling] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [now] = useState(() => Date.now());

    const load = useCallback(() => teacherApi.get(`/scout-units/${id}`).then((r) => { setData(r.data); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load the unit.'))), [id]);
    useEffect(() => { load(); }, [load]);
    const done = (msg) => { setAdding(false); setMarking(null); setRecording(null); setEnrolling(false); setViewing(null); setOk(msg); load(); };
    const withdraw = async (a) => {
        try { done((await teacherApi.delete(`/scout-units/${id}/awards/${a._id}`)).data.message); } catch (err) { setError(messageOf(err, 'Could not withdraw.')); }
    };
    const remove = async (e) => {
        if (!window.confirm(`Delete "${e.title}"?`)) return;
        try { done((await teacherApi.delete(`/scout-units/${id}/events/${e._id}`)).data.message); } catch (err) { setError(messageOf(err, 'Could not delete.')); }
    };
    const verdict = async (a, decision) => {
        const reason = decision === 'reject' ? window.prompt('Why? (the student sees this)', 'Certificate could not be verified') : '';
        if (reason === null) return;
        setBusyId(a._id);
        try { done((await teacherApi.put(`/scout-units/${id}/awards/${a._id}`, { decision, reason })).data.message); }
        catch (err) { setError(messageOf(err, 'That did not go through.')); }
        finally { setBusyId(null); }
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
    // Students asking to be promoted (or for a badge), with their certificate.
    const asks = members.flatMap((m) => (m.awards || []).filter((a) => a.status === 'pending' && a.requestedByUserId).map((a) => ({ ...a, student: m.student })));
    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={15} /> My units</button>
            <PageHeader icon={Compass} title={data.unit.name} subtitle={`${data.unit.sectionLabel} · ${members.length} member${members.length === 1 ? '' : 's'}${data.unit.regNo ? ` · Reg. ${data.unit.regNo}` : ''}`}
                actions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEnrolling(true)} className={btn.secondary}><UserPlus size={16} /> Add students</button><button type="button" onClick={() => setAdding(true)} className={btn.primary}><Plus size={16} /> Add event</button></div>} />
            <OkNote>{ok}</OkNote>
            <ErrorNote>{error}</ErrorNote>
            {asks.length > 0 && (
                <Card>
                    <CardTitle icon={Award}>Promotion requests ({asks.length})</CardTitle>
                    <ul className="divide-y divide-slate-100">
                        {asks.map((a) => (
                            <li key={a._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                                <div className="flex min-w-0 items-center gap-3">
                                    {a.certificateUrl && (
                                        <a href={a.certificateUrl} target="_blank" rel="noreferrer" className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50" title="Open the certificate">
                                            <img src={a.certificateUrl} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        </a>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-slate-800">{a.student.name} <span className="font-normal text-slate-500">asks for</span> {a.type === 'rank' ? `rank ${a.name}` : a.name}</span>
                                        <span className="text-xs text-slate-500">{fmtDate(a.date)}{a.certificateNo ? ` · Cert. ${a.certificateNo}` : ''}{a.examiner ? ` · Tested by ${a.examiner}` : ''}</span>
                                        {a.certificateUrl && <a href={a.certificateUrl} target="_blank" rel="noreferrer" className="block text-xs font-bold text-emerald-700">View certificate</a>}
                                    </span>
                                </div>
                                <span className="flex gap-2">
                                    <button type="button" disabled={busyId === a._id} onClick={() => verdict(a, 'reject')} className={btn.secondary}>Reject</button>
                                    <button type="button" disabled={busyId === a._id} onClick={() => verdict(a, 'approve')} className={btn.primary}>{a.type === 'rank' ? 'Verify & promote' : 'Verify & add'}</button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
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
                    {members.length === 0 ? (
                        <div className="text-sm text-slate-500">
                            <p>No members yet. Add students of your organization, or they can ask to join from their Extra Curricular page.</p>
                            <button type="button" onClick={() => setEnrolling(true)} className="mt-2 inline-flex items-center gap-1 font-bold text-emerald-700"><UserPlus size={14} /> Add students</button>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {members.map((m) => (
                                <li key={m._id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 text-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40">
                                    <button type="button" onClick={() => setViewing(m._id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" title="View profile">
                                        {m.student.profilePicture
                                            ? <img src={m.student.profilePicture} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                                            : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">{(m.student.name || '?')[0].toUpperCase()}</span>}
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-1.5">
                                                <span className="truncate font-semibold text-slate-800">{m.student.name}</span>
                                                {m.summary?.attendance != null && <Badge tone={m.summary.attendance < m.summary.minAttendance ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}>{m.summary.attendance}%</Badge>}
                                            </span>
                                            <span className="block truncate text-xs text-slate-500">
                                                {m.rank ? <span className="font-semibold text-amber-700">{m.rank}</span> : 'No rank yet'}
                                                {m.summary && ` · ${m.summary.hours} h · ${m.summary.camps} camp${m.summary.camps === 1 ? '' : 's'}`}
                                            </span>
                                            {(m.awards || []).filter((a) => a.mine).map((a) => (
                                                <span key={a._id} className="block text-xs text-amber-700">Waiting: {a.name}</span>
                                            ))}
                                        </span>
                                    </button>
                                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                        <button type="button" onClick={() => setViewing(m._id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"><Users size={13} /> View profile</button>
                                        <button type="button" onClick={() => setRecording(m)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Award size={13} /> Promote</button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
            {viewing && <MemberModal unitId={id} memberId={viewing} onClose={() => setViewing(null)} onDone={done} onPromote={(mm) => { setViewing(null); setRecording(mm); }} />}
            {enrolling && <AddMembersModal unit={data.unit} onClose={() => setEnrolling(false)} onDone={done} />}
            {adding && <EventModal unitId={id} onClose={() => setAdding(false)} onDone={done} />}
            {recording && <AwardModal unitId={id} member={recording} ranks={data.ranks || []} onClose={() => setRecording(null)} onDone={done} />}
            {marking && <AttendanceModal unitId={id} event={marking} members={members} onClose={() => setMarking(null)} onDone={done} />}
        </div>
    );
};

const NOTICE_KIND = { exam: 'Exam / test', camp: 'Camp', training: 'Training', event: 'Event', rules: 'Rules & regulations', notice: 'Notice' };

/** The exams, camps and events BSG published for my units' Scouts & Guides, with their rules. */
const Notices = ({ notices }) => (notices?.length ? (
    <Card>
        <CardTitle icon={CalendarDays}>BSG exams, camps &amp; events</CardTitle>
        <ul className="divide-y divide-slate-100">
            {notices.map((n) => (
                <li key={n._id} className="py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{NOTICE_KIND[n.kind] || 'Notice'} · {n.from}</p>
                    <p className="font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500">{fmtDate(n.date)}{n.endDate ? ` – ${fmtDate(n.endDate)}` : ''}{n.place ? ` · ${n.place}` : ''}{n.minRank ? ` · Rank needed: ${n.minRank}` : ''}{n.sections?.length ? ` · ${n.sections.join(', ')}` : ''}</p>
                    {n.rules?.length > 0 && <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{n.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>}
                    {n.details && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.details}</p>}
                </li>
            ))}
        </ul>
    </Card>
) : null);

export default function TeacherScoutUnits() {
    const [units, setUnits] = useState(null);
    const [notices, setNotices] = useState([]);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);

    const load = useCallback(() => teacherApi.get('/scout-units').then((r) => { setUnits(r.data.units); setNotices(r.data.notices || []); setError(''); }).catch((err) => setError(messageOf(err, 'Could not load your units.'))), []);
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
            <Notices notices={notices} />
        </div>
    );
}
