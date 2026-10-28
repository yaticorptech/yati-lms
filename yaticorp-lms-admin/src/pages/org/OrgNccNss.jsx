/**
 * Extra-curricular for an organization, one tab each: NSS, NCC, Scouts &
 * Guides, and Clubs.
 *
 *   NSS / NCC / Scouts   members with their hours, camps and attendance
 *                        against the targets; activities to approve; events
 *                        with attendance; the targets themselves. Scouts &
 *                        Guides also has its units (Cub pack, Guide company…),
 *                        each with a section and its leaders, which members
 *                        and events are put in. A member who leaves or is
 *                        moved to another unit is kept under Former, with
 *                        their record (Transfer moves them between units).
 *                        Ranks & badges: ranks passed, proficiency badges and
 *                        trainings, which leaders propose and the
 *                        organization approves (or records itself).
 *   Clubs                the organization's clubs (cultural, sports…). Create
 *                        one, then manage it: its members and their posts
 *                        (president, secretary…), the teacher in charge, its
 *                        events and the activities to approve. The teacher in
 *                        charge can add events too, from their own dashboard.
 *
 * Students see the events on their calendar. Refreshes every 30 seconds, so
 * requests and logged activities show up without a reload. Server:
 * src/nccnss/orgAdmin.js.
 */
import useStepParam from '../../hooks/useStepParam';
import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Users, CheckCircle2, XCircle, CalendarDays, Plus, Download, Clock, AlertTriangle, Award, Trash2, Loader2, Pencil, Image as ImageIcon, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, GraduationCap, Check } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, LABEL, INPUT, BTN, BTN2, Stat, Empty, Banner, Rows, Pill, PageHeader, Segmented, Avatar, LoadFailed, Dialog, DialogTitle, SearchInput, Bar } from '../../components/orgUi';
import { formatDate } from '../../utils/dates';
import BsgNoticeCard from '../../components/BsgNoticeCard';

const BASE = '/organizations/me/nccnss';
const SECTIONS = [['NSS', 'NSS'], ['NCC', 'NCC'], ['SCOUTS', 'Scouts & Guides'], ['CLUB', 'Clubs']];
const SCHEME_LABEL = { NSS: 'NSS', NCC: 'NCC', SCOUTS: 'Scouts & Guides', CLUB: 'Club' };
const CATEGORIES = [['cultural', 'Cultural'], ['sports', 'Sports'], ['technical', 'Technical'], ['literary', 'Literary & Debate'], ['arts', 'Arts & Music'], ['social', 'Social service'], ['other', 'Other']];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);
const CATEGORY_TONE = { cultural: 'bg-pink-100 text-pink-700', sports: 'bg-emerald-100 text-emerald-700', technical: 'bg-sky-100 text-sky-700', literary: 'bg-amber-100 text-amber-800', arts: 'bg-violet-100 text-violet-700', social: 'bg-rose-100 text-rose-700', other: 'bg-slate-100 text-slate-600' };
// The posts in a club, most senior first; everyone else is a member.
const ROLES = [['president', 'President'], ['vice_president', 'Vice President'], ['secretary', 'Secretary'], ['treasurer', 'Treasurer'], ['coordinator', 'Coordinator'], ['member', 'Member']];
const ROLE_LABEL = Object.fromEntries(ROLES);
const roleRank = (r) => ROLES.findIndex(([v]) => v === r);
const ACTIVITY_KINDS = [['social', 'Social service / drive'], ['camp', 'Camp'], ['parade', 'Parade'], ['drill', 'Drill / training'], ['competition', 'Competition / match'], ['practice', 'Practice / rehearsal'], ['performance', 'Performance / show'], ['award', 'Award / achievement'], ['other', 'Other']];
const EVENT_KINDS = {
    scheme: [['parade', 'Parade'], ['meeting', 'Meeting'], ['camp', 'Camp'], ['drive', 'Drive / activity']],
    club: [['meeting', 'Meeting'], ['practice', 'Practice / rehearsal'], ['competition', 'Competition / match'], ['performance', 'Performance / show'], ['drive', 'Drive / activity'], ['camp', 'Camp / trip']]
};
const SECTION_LABEL = { cubs: 'Cubs', bulbuls: 'Bulbuls', scouts: 'Scouts', guides: 'Guides', rovers: 'Rovers', rangers: 'Rangers' };
const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const today = () => new Date().toISOString().slice(0, 10);
const isClub = (scope) => scope.scheme === 'CLUB';

const Field = ({ label, children }) => <label className="block"><span className={LABEL}>{label}</span>{children}</label>;

const DialogShell = ({ title, onClose, onSubmit, busy, error, submitLabel = 'Save', size, children }) => (
    <Dialog onClose={() => { if (!busy) onClose(); }} size={size}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex min-h-0 flex-col">
            <div className="border-b border-slate-100 p-5"><DialogTitle>{title}</DialogTitle></div>
            <div className="space-y-3 overflow-y-auto p-5">
                {children}
                {error && <Banner>{error}</Banner>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                {onSubmit && <button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}{submitLabel}</button>}
            </div>
        </form>
    </Dialog>
);

/**
 * A dropdown of everyone, with a search box at its top: opens on the whole
 * list, narrows as you type. The list opens in place, below the field, so a
 * dialog's scrolling body never clips it.
 */
const SearchSelect = ({ items, value, onChange, placeholder, loading, emptyText = 'No one found.', allowNone }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const chosen = items.find((i) => i.id === value);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? items.filter((i) => `${i.label} ${i.sub || ''}`.toLowerCase().includes(q)) : items;
    }, [items, query]);
    const pick = (id) => { onChange(id); setOpen(false); setQuery(''); };
    return (
        <div>
            <button type="button" onClick={() => setOpen((o) => !o)} className={`${INPUT} flex items-center justify-between gap-2 text-left`} aria-expanded={open}>
                <span className={`truncate ${chosen ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                    {chosen ? <>{chosen.label}{chosen.sub ? <span className="font-normal text-slate-500"> · {chosen.sub}</span> : null}</> : placeholder}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="relative border-b border-slate-100 p-2">
                        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-full rounded-lg bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1">
                        {allowNone && (
                            <li><button type="button" onClick={() => pick('')} className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">None</button></li>
                        )}
                        {loading ? <li className="px-3 py-3 text-sm text-slate-400">Loading…</li> : shown.length === 0 ? <li className="px-3 py-3 text-sm text-slate-400">{emptyText}</li> : shown.map((i) => (
                            <li key={i.id}>
                                <button type="button" onClick={() => pick(i.id)} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${i.id === value ? 'bg-indigo-50' : ''}`}>
                                    <span className="min-w-0 truncate"><span className="font-semibold text-slate-800">{i.label}</span>{i.sub && <span className="text-slate-500"> · {i.sub}</span>}</span>
                                    {i.id === value && <Check size={15} className="shrink-0 text-indigo-600" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

/** A list loaded once for a picker: the students, or the teachers, of this organization. */
const useList = (path, key, map) => {
    const [state, setState] = useState({ items: [], loading: true });
    useEffect(() => {
        let live = true;
        api.get(`${BASE}/${path}`)
            .then((res) => { if (live) setState({ items: (res.data[key] || []).map(map), loading: false }); })
            .catch(() => { if (live) setState({ items: [], loading: false }); });
        return () => { live = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return state;
};
const useStudents = () => useList('candidates', 'students', (s) => ({ id: s._id, label: s.name, sub: s.cardNumber || s.email }));
const useTeachers = () => useList('teachers', 'teachers', (t) => ({ id: t._id, label: t.name, sub: t.designation || t.department || t.email }));
const useScoutUnits = () => useList('units?status=active', 'units', (u) => ({ id: u._id, label: u.name, sub: SECTION_LABEL[u.section] }));

/** The Scouts unit picker: this organization's active units, plus `noneLabel` for none. */
const ScoutUnitSelect = ({ value, onChange, noneLabel = 'No unit yet', label = 'Unit' }) => {
    const units = useScoutUnits();
    return (
        <Field label={label}>
            <select className={INPUT} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={units.loading}>
                <option value="">{units.loading ? 'Loading…' : noneLabel}</option>
                {units.items.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.sub}</option>)}
            </select>
        </Field>
    );
};

/** Shared by the add-member and edit-member dialogs. */
const MemberFields = ({ form, set, scheme, lockUnit }) => (
    <>
        {scheme === 'CLUB' && (
            <Field label="Post in the club">
                <select className={INPUT} value={form.role || 'member'} onChange={(e) => set('role', e.target.value)}>
                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
            {scheme === 'SCOUTS' && (lockUnit
                ? <Field label="Unit"><input className={INPUT} value={form.unit || '—'} disabled /></Field>
                : <ScoutUnitSelect value={form.unitId} onChange={(v) => set('unitId', v)} />)}
            {scheme !== 'CLUB' && scheme !== 'SCOUTS' && <Field label="Unit / company"><input className={INPUT} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. 5 KAR BN / Unit 2" /></Field>}
            <Field label={scheme === 'CLUB' ? 'Membership no.' : 'Enrolment no.'}><input className={INPUT} value={form.enrolmentNo} onChange={(e) => set('enrolmentNo', e.target.value)} /></Field>
        </div>
        {scheme === 'SCOUTS' && !form.unitId && form.unit && (
            <p className="-mt-1 text-xs text-amber-700">Typed earlier as &ldquo;{form.unit}&rdquo;. Choose the unit it means to link them.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
                <select className={INPUT} value={form.year} onChange={(e) => set('year', e.target.value)}>
                    {[1, 2, 3].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
            </Field>
            {scheme === 'NCC' && (
                <Field label="Certificate">
                    <select className={INPUT} value={form.certStage} onChange={(e) => set('certStage', e.target.value)}>
                        <option value="">—</option>{['A', 'B', 'C'].map((c) => <option key={c} value={c}>{c} certificate</option>)}
                    </select>
                </Field>
            )}
        </div>
    </>
);

const AddMemberDialog = ({ scope, title, onClose, onDone }) => {
    const students = useStudents();
    const [userId, setUserId] = useState('');
    const [form, setForm] = useState({ unit: '', unitId: scope.unitId || '', enrolmentNo: '', year: 1, certStage: '', role: 'member' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async () => {
        if (!userId) { setError('Choose a student.'); return; }
        setBusy(true); setError('');
        try { onDone((await api.post(`${BASE}/members`, { ...form, ...scope, userId })).data.message); }
        catch (err) { setError(errorOf(err, 'Could not add the member.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={`Add a student to ${title}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Add">
            <Field label="Student">
                <SearchSelect items={students.items} loading={students.loading} value={userId} onChange={setUserId} placeholder="Choose a student" emptyText="No student matches." />
            </Field>
            <MemberFields form={form} set={set} scheme={scope.scheme} />
        </DialogShell>
    );
};

/** Adds an activity for a member, or edits `activity` when one is given. */
const LogActivityDialog = ({ member, activity, onClose, onDone }) => {
    const [form, setForm] = useState(() => (activity
        ? { kind: activity.kind, title: activity.title, date: String(activity.date).slice(0, 10), hours: activity.hours, place: activity.place || '' }
        : { kind: member.scheme === 'CLUB' ? 'practice' : 'social', title: '', date: today(), hours: 2, place: '' }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async () => {
        setBusy(true); setError('');
        try {
            const res = activity
                ? await api.put(`${BASE}/activities/${activity._id}`, form)
                : await api.post(`${BASE}/activities`, { ...form, memberId: member._id });
            onDone(res.data.message);
        } catch (err) { setError(errorOf(err, activity ? 'Could not save the activity.' : 'Could not add the activity.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={`${activity ? 'Edit' : 'Add'} activity — ${member.student.name}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel={activity ? 'Save' : 'Add'}>
            <Field label="Type">
                <select className={INPUT} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                    {ACTIVITY_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </Field>
            <Field label="What was it"><input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Blood donation camp" required /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><input type="date" className={INPUT} value={form.date} max={today()} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Hours"><input type="number" min="0" max="240" step="0.5" className={INPUT} value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
            </div>
            <Field label="Place"><input className={INPUT} value={form.place} onChange={(e) => set('place', e.target.value)} /></Field>
        </DialogShell>
    );
};

const MiniStat = ({ label, value }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800 tabular-nums">{value}</p>
    </div>
);

/** Move an active Scouts member to another unit: their record in this one is kept. */
const TransferDialog = ({ member, onClose, onDone }) => {
    const [unitId, setUnitId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = async () => {
        if (!unitId) { setError('Choose the unit to move them to.'); return; }
        setBusy(true); setError('');
        try { onDone((await api.post(`${BASE}/members/${member._id}/transfer`, { unitId })).data.message); }
        catch (err) { setError(errorOf(err, 'Could not transfer.')); setBusy(false); }
    };
    return (
        <DialogShell title={`Transfer ${member.student.name}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Transfer">
            <p className="text-sm text-slate-600">Now in <span className="font-semibold">{member.unit || 'no unit'}</span>. Their activities and attendance there stay on that record; the new unit continues it.</p>
            <ScoutUnitSelect value={unitId} onChange={setUnitId} noneLabel="Choose a unit" label="Move to" />
        </DialogShell>
    );
};

const MemberDialog = ({ memberId, onClose, onChanged }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [logging, setLogging] = useState(null);   // 'new', or the activity being edited
    const [moving, setMoving] = useState(false);

    const load = async ({ isCurrent = () => true } = {}) => {
        try {
            const res = await api.get(`${BASE}/members/${memberId}`);
            if (!isCurrent()) return;
            setData(res.data);
            const m = res.data.member;
            setForm((f) => f || { unit: m.unit, unitId: m.unitId?._id || '', enrolmentNo: m.enrolmentNo, year: m.year, certStage: m.certStage, role: m.role || 'member' });
        } catch (err) { if (isCurrent()) setError(errorOf(err, 'Could not load the member.')); }
    };
    const reload = useAutoRefresh(load, 30000, [memberId]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = async (extra = {}) => {
        setBusy(true); setError('');
        try { await api.put(`${BASE}/members/${memberId}`, { ...form, ...extra }); onChanged(); reload(); }
        catch (err) { setError(errorOf(err, 'Could not save.')); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        const keeps = m.scheme === 'SCOUTS' && ['active', 'completed'].includes(m.status);
        if (!window.confirm(keeps ? 'Remove this student from Scouts & Guides? Their record is kept under Former.' : 'Remove this student? Their logged activities are deleted too.')) return;
        setBusy(true);
        try { await api.delete(`${BASE}/members/${memberId}`); onChanged(); onClose(); }
        catch (err) { setError(errorOf(err, 'Could not remove.')); setBusy(false); }
    };
    const removeActivity = async (a) => {
        if (!window.confirm(`Delete "${a.title}"? Its hours stop counting.`)) return;
        try { await api.delete(`${BASE}/activities/${a._id}`); reload(); onChanged(); }
        catch (err) { setError(errorOf(err, 'Could not delete the activity.')); }
    };

    const m = data?.member;
    const s = data?.summary;
    const ended = m && ['left', 'transferred'].includes(m.status);
    return (
        <>
        <DialogShell title={m ? `${m.student.name} · ${m.name}` : 'Member'} onClose={onClose} onSubmit={m ? () => save() : null} busy={busy} error={error} size="max-w-2xl">
            {!data ? <Rows count={3} /> : (
                <>
                    {ended && (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            {m.status === 'transferred' ? 'Moved on' : 'Left'} on {formatDate(m.endedAt)}{m.endReason ? ` — ${m.endReason}` : ''}. This record is kept as their history.
                        </p>
                    )}
                    {m.status === 'pending' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <span>Asked to join {m.name}. Check the details below, then decide.{m.note ? <span className="mt-1 block italic">&ldquo;{m.note}&rdquo;</span> : null}</span>
                            <span className="flex gap-2">
                                <button type="button" onClick={() => save({ status: 'rejected' })} disabled={busy} className={BTN2}>Reject</button>
                                <button type="button" onClick={() => save({ status: 'active' })} disabled={busy} className={BTN}>Approve</button>
                            </span>
                        </div>
                    )}
                    {s && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MiniStat label="Hours" value={`${s.hours}${s.requiredHours ? ` / ${s.requiredHours}` : ''}`} />
                            <MiniStat label="Camps" value={`${s.camps} / ${s.requiredCamps}`} />
                            <MiniStat label="Attendance" value={s.attendance === null ? '—' : `${s.attendance}%`} />
                            <MiniStat label="Awards" value={s.awards} />
                        </div>
                    )}
                    {s && <p className={`rounded-xl px-3 py-2 text-sm font-medium ${s.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}>Next: {s.next}</p>}
                    <MemberFields form={form} set={set} scheme={m.scheme} lockUnit={ended || (!!m.unitId && ['active', 'completed'].includes(m.status))} />
                    {m.scheme === 'SCOUTS' && m.status === 'active' && (
                        <button type="button" onClick={() => setMoving(true)} className="-mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-700"><ArrowLeft size={13} className="rotate-180" /> Transfer to another unit</button>
                    )}
                    {data.history?.length > 0 && (
                        <>
                            <h3 className="pt-2 text-sm font-bold text-slate-800">Earlier memberships</h3>
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {data.history.map((h) => (
                                    <li key={h._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-slate-800">{h.unit || 'No unit'}{h.section ? ` · ${SECTION_LABEL[h.section]}` : ''}</span>
                                            <span className="text-xs text-slate-500">{h.organization} · {formatDate(h.startedAt)} – {h.endedAt ? formatDate(h.endedAt) : 'now'}{h.endReason ? ` · ${h.endReason}` : ''}</span>
                                        </span>
                                        <span className="text-xs text-slate-600">{h.hours} h · {h.camps} camps · {h.attendance === null ? '—' : `${h.attendance}%`}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <h3 className="text-sm font-bold text-slate-800">Activities</h3>
                        {m.status === 'active' && <button type="button" onClick={() => setLogging('new')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"><Plus size={14} /> Add activity</button>}
                    </div>
                    {data.activities.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                            {data.activities.map((a) => (
                                <li key={a._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-slate-800">{a.title}</span>
                                        <span className="text-xs text-slate-500">{formatDate(a.date)} · {a.hours} h · {a.kind}{a.place ? ` · ${a.place}` : ''}</span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                        {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noreferrer" className="text-indigo-600" aria-label="Proof photo"><ImageIcon size={16} /></a>}
                                        <Pill status={a.status} />
                                        <button type="button" onClick={() => setLogging(a)} className="p-1 text-slate-400 hover:text-indigo-600" aria-label="Edit activity"><Pencil size={15} /></button>
                                        <button type="button" onClick={() => removeActivity(a)} className="p-1 text-slate-400 hover:text-red-600" aria-label="Delete activity"><Trash2 size={15} /></button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {m.scheme === 'SCOUTS' && <AwardsSection data={data} onChanged={() => { reload(); onChanged(); }} setError={setError} />}

                    <h3 className="pt-2 text-sm font-bold text-slate-800">Attendance</h3>
                    {data.attendance.length === 0 ? <p className="text-sm text-slate-500">No attendance taken yet.</p> : (
                        <div className="flex flex-wrap gap-1.5">
                            {data.attendance.map((e) => (
                                <span key={e._id} title={`${e.title} · ${formatDate(e.date)}`} className={`rounded-lg px-2 py-1 text-xs font-semibold ${e.present ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                                    {formatDate(e.date)} {e.present ? '✓' : '✗'}
                                </span>
                            ))}
                        </div>
                    )}
                    {!ended && <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 pt-2 text-xs font-bold text-red-600"><Trash2 size={14} /> Remove from {m.name}</button>}
                </>
            )}
        </DialogShell>
        {/* Outside the member dialog's <form>: a form inside a form is invalid,
            and its submit was not reliably the activity's own. */}
        {moving && m && <TransferDialog member={m} onClose={() => setMoving(false)} onDone={() => { setMoving(false); onChanged(); onClose(); }} />}
        {logging && m && <LogActivityDialog member={m} activity={logging === 'new' ? null : logging} onClose={() => setLogging(null)} onDone={() => { setLogging(null); reload(); onChanged(); }} />}
        </>
    );
};

/** The Scouts members list's unit filter. */
const UnitFilter = ({ value, onChange }) => {
    const units = useScoutUnits();
    if (!units.items.length) return null;
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Unit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">All units</option>
            {units.items.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
    );
};

/** Members of one scheme, or of one club (then with their posts, changed in place). */
const MembersTab = ({ scope, title, overview, onChanged }) => {
    const club = isClub(scope);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [adding, setAdding] = useState(false);
    const [open, setOpen] = useState(null);
    const [notice, setNotice] = useState('');
    const [unitId, setUnitId] = useState('');

    const params = { ...scope, unitId: unitId || undefined, filter: ['atRisk', 'eligible'].includes(filter) ? filter : undefined, status: ['pending', 'former'].includes(filter) ? filter : undefined, search: search || undefined };
    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/members`, { params, signal });
            if (!isCurrent()) return;
            const list = res.data.members || [];
            setRows(club ? [...list].sort((a, b) => roleRank(a.role) - roleRank(b.role)) : list); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, [scope.scheme, scope.clubId, filter, search, unitId]);
    const changed = () => { reload(); onChanged(); };

    const update = async (r, body) => {
        try { setNotice((await api.put(`${BASE}/members/${r._id}`, body)).data.message); changed(); }
        catch (err) { setNotice(errorOf(err, 'That did not go through.')); }
    };
    const exportCsv = async () => {
        const res = await api.get(`${BASE}/members/export`, { params, responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url; a.download = `${title.replace(/\W+/g, '-').toLowerCase()}-members.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <Segmented options={club ? [['', 'Everyone'], ['pending', 'Asked to join']] : [['', 'Everyone'], ['pending', 'Asked to join'], ['atRisk', 'Behind'], ['eligible', 'Eligible'], ...(scope.scheme === 'SCOUTS' ? [['former', 'Former']] : [])]}
                    value={filter} onChange={setFilter} counts={{ pending: overview?.totals.pendingMembers, atRisk: overview?.totals.atRisk }} />
                <div className="flex gap-2">
                    {scope.scheme === 'SCOUTS' && <UnitFilter value={unitId} onChange={setUnitId} />}
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, card, unit" />
                    <button onClick={exportCsv} className={BTN2} aria-label="Export CSV"><Download size={16} /><span className="hidden sm:inline">Export</span></button>
                    <button onClick={() => setAdding(true)} className={BTN}><Plus size={16} /><span className="hidden sm:inline">Add student</span></button>
                </div>
            </div>
            <div className={`${CARD} overflow-x-auto`}>
                {loading ? <Rows count={4} /> : failed ? <LoadFailed what="the members" onRetry={reload} /> : rows.length === 0 ? (
                    <Empty icon={Users}>No members yet. Add students, or they can ask to join from their Extra Curricular page.</Empty>
                ) : club ? (
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr><th className="px-4 py-3">Student</th><th className="px-3 py-3">Post</th><th className="px-3 py-3">Year</th><th className="px-3 py-3">Attendance</th><th className="px-3 py-3">Hours</th><th className="px-4 py-3">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((r) => (
                                <tr key={r._id} className="hover:bg-slate-50">
                                    <td className="cursor-pointer px-4 py-3" onClick={() => setOpen(r._id)}>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={r.student.name} src={r.student.profilePicture} size="h-8 w-8 text-xs" />
                                            <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{r.student.name}</span><span className="text-xs text-slate-500">{r.enrolmentNo || r.student.cardNumber}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <select value={r.role || 'member'} onChange={(e) => update(r, { role: e.target.value })} disabled={r.status === 'pending'} aria-label={`Post of ${r.student.name}`}
                                            className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${r.role && r.role !== 'member' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                                            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-3 py-3 text-slate-700">{r.year}</td>
                                    <td className={`px-3 py-3 tabular-nums font-semibold ${r.summary.attendance === null ? 'text-slate-400' : r.summary.attendance < r.summary.minAttendance ? 'text-red-600' : 'text-emerald-700'}`}>
                                        {r.summary.attendance === null ? '—' : `${r.summary.attendance}%`}
                                    </td>
                                    <td className="px-3 py-3 tabular-nums text-slate-700">{r.summary.hours}</td>
                                    <td className="px-4 py-3">
                                        {r.status === 'pending' ? (
                                            <span className="flex gap-1.5">
                                                <button onClick={() => update(r, { status: 'rejected' })} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">Reject</button>
                                                <button onClick={() => update(r, { status: 'active' })} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">Approve</button>
                                            </span>
                                        ) : <Pill status="active" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Student</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3">Year</th>
                                <th className="px-3 py-3">Hours</th><th className="px-3 py-3">Camps</th><th className="px-3 py-3">Attendance</th>
                                <th className="px-3 py-3">Awards</th><th className="px-3 py-3">Status</th><th className="px-4 py-3">Next step</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((r) => {
                                const s = r.summary;
                                const pct = s.requiredHours ? (s.hours / s.requiredHours) * 100 : 100;
                                return (
                                    <tr key={r._id} onClick={() => setOpen(r._id)} className="cursor-pointer hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={r.student.name} src={r.student.profilePicture} size="h-8 w-8 text-xs" />
                                                <span className="min-w-0">
                                                    <span className="block truncate font-semibold text-slate-800">{r.student.name}</span>
                                                    <span className="text-xs text-slate-500">{r.enrolmentNo || r.student.cardNumber}</span>
                                                    {r.rank && <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{r.rank}</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {r.unit || '—'}
                                            {r.section && <span className="block text-xs text-slate-500">{SECTION_LABEL[r.section]}</span>}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">{r.year}{r.certStage ? ` · ${r.certStage}` : ''}</td>
                                        <td className="px-3 py-3 w-36">
                                            <span className="tabular-nums text-slate-700">{s.hours}{s.requiredHours ? ` / ${s.requiredHours}` : ''}</span>
                                            {s.requiredHours > 0 && <Bar percent={pct} tone={pct >= 100 ? 'emerald' : 'indigo'} />}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums text-slate-700">{s.camps} / {s.requiredCamps}</td>
                                        <td className={`px-3 py-3 tabular-nums font-semibold ${s.attendance === null ? 'text-slate-400' : s.attendance < s.minAttendance ? 'text-red-600' : 'text-emerald-700'}`}>
                                            {s.attendance === null ? '—' : `${s.attendance}%`}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums text-slate-700">{s.awards}</td>
                                        <td className="px-3 py-3">
                                            {['left', 'transferred'].includes(r.status) ? <Pill status={r.status === 'left' ? 'left' : 'moved'} /> : r.status === 'pending' ? <Pill status="pending" /> : s.eligible ? <Pill status="approved" /> : s.atRisk
                                                ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"><AlertTriangle size={12} /> Behind</span>
                                                : <Pill status="active" />}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">
                                            {['left', 'transferred'].includes(r.status) ? `${r.endReason || 'Ended'} · ${formatDate(r.endedAt)}` : r.status === 'pending' ? 'Waiting for your approval' : s.next}
                                            {s.pendingActivities > 0 && <span className="block text-amber-700">{s.pendingActivities} to approve</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {adding && <AddMemberDialog scope={{ ...scope, unitId: unitId || undefined }} title={title} onClose={() => setAdding(false)} onDone={(msg) => { setAdding(false); setNotice(msg); changed(); }} />}
            {open && <MemberDialog memberId={open} onClose={() => setOpen(null)} onChanged={changed} />}
        </div>
    );
};

const AWARD_TYPES = [['rank', 'Rank'], ['badge', 'Proficiency badge'], ['training', 'Training']];
const AWARD_LABEL = Object.fromEntries(AWARD_TYPES);

/** Record a rank, badge or training for a Scouts member; `ranks` are their section's. */
const AwardDialog = ({ member, ranks, onClose, onDone }) => {
    const [form, setForm] = useState({ type: ranks.length ? 'rank' : 'badge', name: '', date: today(), examiner: '', certificateNo: '', note: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === 'type' ? { name: '' } : {}) }));
    const submit = async () => {
        setBusy(true); setError('');
        try { onDone((await api.post(`${BASE}/members/${member._id}/awards`, form)).data.message); }
        catch (err) { setError(errorOf(err, 'Could not record it.')); setBusy(false); }
    };
    return (
        <DialogShell title={`Record for ${member.student.name}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Record">
            <Field label="What">
                <select className={INPUT} value={form.type} onChange={(e) => set('type', e.target.value)}>
                    {AWARD_TYPES.filter(([v]) => v !== 'rank' || ranks.length).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </Field>
            <Field label={form.type === 'rank' ? 'Rank' : form.type === 'badge' ? 'Badge' : 'Training'}>
                {form.type === 'rank' ? (
                    <select className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required>
                        <option value="">Choose…</option>
                        {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                ) : <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={form.type === 'badge' ? 'e.g. First Aid, Camper' : 'e.g. District camp, Basic course'} required />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><input type="date" className={INPUT} value={form.date} max={today()} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Certificate no."><input className={INPUT} value={form.certificateNo} onChange={(e) => set('certificateNo', e.target.value)} /></Field>
            </div>
            <Field label="Tested / awarded by"><input className={INPUT} value={form.examiner} onChange={(e) => set('examiner', e.target.value)} /></Field>
            <Field label="Note"><input className={INPUT} value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </DialogShell>
    );
};

/** A Scouts member's rank and record, in their member dialog. */
const AwardsSection = ({ data, onChanged, setError }) => {
    const m = data.member;
    const [adding, setAdding] = useState(false);
    const remove = async (a) => {
        if (!window.confirm(`Remove ${a.name} from their record?`)) return;
        try { await api.delete(`${BASE}/awards/${a._id}`); onChanged(); }
        catch (err) { setError(errorOf(err, 'Could not remove it.')); }
    };
    const awards = data.awards || [];
    return (
        <>
            <div className="flex items-center justify-between pt-2">
                <h3 className="text-sm font-bold text-slate-800">Ranks, badges &amp; training {data.rank && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">Now: {data.rank}</span>}</h3>
                {['active', 'completed'].includes(m.status) && <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"><Plus size={14} /> Record</button>}
            </div>
            {awards.length === 0 ? <p className="text-sm text-slate-500">Nothing recorded yet.</p> : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {awards.map((a) => (
                        <li key={a._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span className="min-w-0">
                                <span className="block truncate font-semibold text-slate-800">{a.name} <span className="font-normal text-slate-500">· {AWARD_LABEL[a.type]}</span></span>
                                <span className="text-xs text-slate-500">{formatDate(a.date)}{a.examiner ? ` · ${a.examiner}` : ''}{a.certificateNo ? ` · Cert. ${a.certificateNo}` : ''}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                <Pill status={a.status} />
                                {String(a.organizationId) === String(m.organizationId) && <button type="button" onClick={() => remove(a)} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Remove ${a.name}`}><Trash2 size={15} /></button>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {adding && <AwardDialog member={m} ranks={data.ranks || []} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onChanged(); }} />}
        </>
    );
};

/** Ranks, badges and trainings to approve (leaders propose them), and the decided ones. */
const AwardsTab = ({ onChanged }) => {
    const [status, setStatus] = useState('pending');
    const [rows, setRows] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState(null);
    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/awards`, { params: { status }, signal });
            if (!isCurrent()) return;
            setRows(res.data.awards || []); setPendingCount(res.data.pendingCount || 0); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, [status]);
    const decide = async (a, decision) => {
        const reason = decision === 'reject' ? window.prompt('Why? (they see this)') : '';
        if (reason === null) return;
        setBusyId(a._id);
        try { setNotice((await api.put(`${BASE}/awards/${a._id}`, { decision, reason })).data.message); reload(); onChanged(); }
        catch (err) { setNotice(errorOf(err, 'That did not go through.')); }
        finally { setBusyId(null); }
    };
    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <Segmented options={[['pending', 'To approve'], ['approved', 'Approved'], ['rejected', 'Rejected']]} value={status} onChange={setStatus} counts={{ pending: pendingCount }} />
            <div className={`${CARD} overflow-x-auto`}>
                {loading ? <Rows count={3} /> : failed ? <LoadFailed what="the ranks and badges" onRetry={reload} /> : rows.length === 0 ? (
                    <Empty icon={Award}>{status === 'pending' ? 'Nothing to approve. Unit leaders propose ranks, badges and trainings from their teacher dashboard.' : 'Nothing here yet.'}</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((a) => (
                            <li key={a._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar name={a.userId.name} src={a.userId.profilePicture} size="h-9 w-9 text-xs" />
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-slate-800">{a.userId.name} · <span className="text-amber-800">{a.name}</span> <span className="text-xs font-normal text-slate-500">({AWARD_LABEL[a.type]})</span></span>
                                        <span className="text-xs text-slate-500">
                                            {a.unitId?.name || 'No unit'} · {formatDate(a.date)}{a.examiner ? ` · tested by ${a.examiner}` : ''}{a.proposedByTeacherId ? ` · proposed by ${a.proposedByTeacherId.name}` : ''}{a.reason ? ` · ${a.reason}` : ''}
                                        </span>
                                    </span>
                                </div>
                                {a.status === 'pending' ? (
                                    <span className="flex shrink-0 gap-2">
                                        <button onClick={() => decide(a, 'reject')} disabled={busyId === a._id} className={BTN2}><XCircle size={15} /> Reject</button>
                                        <button onClick={() => decide(a, 'approve')} disabled={busyId === a._id} className={BTN}><CheckCircle2 size={15} /> Approve</button>
                                    </span>
                                ) : <Pill status={a.status} />}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const ApprovalsTab = ({ scope, onChanged }) => {
    const [status, setStatus] = useState('pending');
    const [rows, setRows] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState(null);

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/activities`, { params: { status, ...scope }, signal });
            if (!isCurrent()) return;
            setRows(res.data.activities || []); setPendingCount(res.data.pendingCount || 0); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, [status, scope.scheme, scope.clubId]);

    const decide = async (a, decision) => {
        const reason = decision === 'reject' ? window.prompt('Reason for rejecting (the student sees this):', '') : '';
        if (reason === null) return;
        setBusyId(a._id);
        try { setNotice((await api.put(`${BASE}/activities/${a._id}`, { decision, reason })).data.message); reload(); onChanged(); }
        catch (err) { setNotice(errorOf(err, 'That did not go through.')); }
        finally { setBusyId(null); }
    };

    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <p className="text-sm text-slate-500">Activities students logged themselves. Approve them and their hours count.</p>
            <Segmented options={[['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']]} value={status} onChange={setStatus} counts={{ pending: pendingCount }} />
            <div className={`${CARD} overflow-hidden`}>
                {loading ? <Rows count={3} height="h-16" /> : failed ? <LoadFailed what="the activities" onRetry={reload} /> : rows.length === 0 ? (
                    <Empty icon={Clock}>{status === 'pending' ? 'Nothing waiting for approval.' : `No ${status} activities.`}</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((a) => (
                            <li key={a._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex min-w-0 items-start gap-3">
                                    <Avatar name={a.userId.name} src={a.userId.profilePicture} />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-800">{a.title} <span className="font-normal text-slate-500">· {a.hours} h</span></p>
                                        <p className="text-sm text-slate-500">{a.userId.name}{a.memberId.unit ? ` · ${a.memberId.unit}` : ''} · {a.kind} · {formatDate(a.date)}{a.place ? ` · ${a.place}` : ''}</p>
                                        {a.reason && <p className="text-xs text-red-600">Reason: {a.reason}</p>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {a.proofUrl
                                        ? <a href={a.proofUrl} target="_blank" rel="noreferrer" className={BTN2}><ImageIcon size={16} /> Photo</a>
                                        : <span className="text-xs text-slate-400">No photo</span>}
                                    {status === 'pending' ? (
                                        <>
                                            <button onClick={() => decide(a, 'reject')} disabled={busyId === a._id} className={BTN2}><XCircle size={16} /> Reject</button>
                                            <button onClick={() => decide(a, 'approve')} disabled={busyId === a._id} className={BTN}><CheckCircle2 size={16} /> Approve</button>
                                        </>
                                    ) : <Pill status={a.status} />}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const EventDialog = ({ scope, title, date, onClose, onDone }) => {
    const kinds = isClub(scope) ? EVENT_KINDS.club : EVENT_KINDS.scheme;
    const [form, setForm] = useState({ unit: '', unitId: '', kind: '', title: '', date: date || today(), hours: 2, place: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async () => {
        setBusy(true); setError('');
        try { onDone((await api.post(`${BASE}/events`, { ...form, ...scope })).data.message); }
        catch (err) { setError(errorOf(err, 'Could not add the event.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={`Add an event — ${title}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Add to calendar">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                    {/* Typed freely; the list only suggests. */}
                    <input className={INPUT} list="event-kinds" value={form.kind} onChange={(e) => set('kind', e.target.value)} maxLength={40} placeholder={isClub(scope) ? 'e.g. Rehearsal' : 'e.g. Parade'} />
                    <datalist id="event-kinds">{kinds.map(([, l]) => <option key={l} value={l} />)}</datalist>
                </Field>
                {scope.scheme === 'SCOUTS' && <ScoutUnitSelect value={form.unitId} onChange={(v) => set('unitId', v)} noneLabel="All units" />}
                {!isClub(scope) && scope.scheme !== 'SCOUTS' && <Field label="Unit (blank = all)"><input className={INPUT} value={form.unit} onChange={(e) => set('unit', e.target.value)} /></Field>}
            </div>
            <Field label="Title"><input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={isClub(scope) ? 'e.g. Annual day rehearsal' : 'e.g. Weekly parade'} required /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><input type="date" className={INPUT} value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Hours it counts"><input type="number" min="0" max="240" step="0.5" className={INPUT} value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
            </div>
            <Field label="Place"><input className={INPUT} value={form.place} onChange={(e) => set('place', e.target.value)} /></Field>
            <p className="text-xs text-slate-500">The members see it on their calendar.</p>
        </DialogShell>
    );
};

const AttendanceDialog = ({ event, onClose, onDone }) => {
    const [members, setMembers] = useState(null);
    const [present, setPresent] = useState(() => new Set((event.presentMemberIds || []).map(String)));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // Loaded once: ticking the list must not be undone by a background refresh.
    useEffect(() => {
        let live = true;
        api.get(`${BASE}/members`, { params: { scheme: event.scheme, clubId: event.clubId?._id || undefined, unitId: event.unitId || undefined, status: 'active' } })
            .then((res) => { if (live) setMembers((res.data.members || []).filter((m) => !event.unit || m.unit === event.unit)); })
            .catch(() => { if (live) setError('Could not load the members.'); });
        return () => { live = false; };
    }, [event._id]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (id) => setPresent((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const submit = async () => {
        setBusy(true); setError('');
        try { onDone((await api.put(`${BASE}/events/${event._id}/attendance`, { presentMemberIds: [...present] })).data.message); }
        catch (err) { setError(errorOf(err, 'Could not save attendance.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={`Attendance — ${event.title}`} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel={`Save (${present.size} present)`}>
            {!members ? <Rows count={3} /> : members.length === 0 ? <p className="text-sm text-slate-500">No active members{event.unit ? ` in ${event.unit}` : ''}.</p> : (
                <>
                    <div className="flex gap-3 text-xs font-bold text-indigo-700">
                        <button type="button" onClick={() => setPresent(new Set(members.map((m) => String(m._id))))}>Mark all present</button>
                        <button type="button" onClick={() => setPresent(new Set())}>Clear</button>
                    </div>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {members.map((m) => (
                            <li key={m._id}>
                                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                                    <input type="checkbox" checked={present.has(String(m._id))} onChange={() => toggle(String(m._id))} className="h-4 w-4 accent-indigo-600" />
                                    <span className="font-semibold text-slate-800">{m.student.name}</span>
                                    <span className="text-xs text-slate-500">{m.role && m.role !== 'member' ? ROLE_LABEL[m.role] : m.unit} {m.enrolmentNo}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </DialogShell>
    );
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The calendar of one scheme or club: a compact month on the left — click any
 * date to add an event on it — and that day's (or the month's) events on the
 * right, with attendance and delete. Members see the same events on theirs.
 */
const EventsTab = ({ scope, title, onChanged }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState('');
    const [adding, setAdding] = useState(null);      // the date to add on, 'YYYY-MM-DD'
    const [marking, setMarking] = useState(null);
    const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
    const [picked, setPicked] = useState(null);      // a Date
    const [todayKey] = useState(() => dayKey(new Date()));
    const [now] = useState(() => Date.now());

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/events`, { params: scope, signal });
            if (!isCurrent()) return;
            setRows(res.data.events || []); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, [scope.scheme, scope.clubId]);
    const done = (msg) => { setAdding(null); setMarking(null); setNotice(msg); reload(); onChanged(); };
    const remove = async (e) => {
        if (!window.confirm(`Delete "${e.title}"? Its attendance is deleted too.`)) return;
        try { done((await api.delete(`${BASE}/events/${e._id}`)).data.message); } catch (err) { setNotice(errorOf(err, 'Could not delete.')); }
    };

    const byDay = useMemo(() => {
        const map = {};
        rows.forEach((e) => { (map[dayKey(e.date)] = map[dayKey(e.date)] || []).push(e); });
        return map;
    }, [rows]);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const lead = (month.getDay() + 6) % 7;
    const cells = [...Array(lead).fill(null), ...Array.from({ length: end.getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
    const pickedKey = picked ? dayKey(picked) : null;
    const shown = picked
        ? byDay[pickedKey] || []
        : rows.filter((e) => { const d = new Date(e.date); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(); })
            .sort((x, y) => new Date(x.date) - new Date(y.date));
    const go = (n) => { setPicked(null); setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1)); };
    const pick = (d) => {
        if (pickedKey === dayKey(d)) { setPicked(null); return; }
        setPicked(d);
        // An empty day opens the form straight away; a day with events shows them first.
        if (!(byDay[dayKey(d)] || []).length) setAdding(isoDay(d));
    };

    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {loading ? <Rows count={3} /> : failed ? <div className={CARD}><LoadFailed what="the events" onRetry={reload} /></div> : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                    <div className={`${CARD} p-4`}>
                        <div className="mb-2 flex items-center justify-between">
                            <button type="button" onClick={() => go(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={18} /></button>
                            <h3 className="text-sm font-black text-slate-900">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
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
                                    <button key={k} type="button" onClick={() => pick(d)}
                                        className={`flex h-10 flex-col items-center justify-center rounded-lg text-sm transition-colors ${pickedKey === k ? 'bg-indigo-600 font-bold text-white' : k === todayKey ? 'bg-indigo-50 font-bold text-indigo-700' : on.length ? 'font-semibold text-slate-800 hover:bg-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {d.getDate()}
                                        {on.length > 0 && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${pickedKey === k ? 'bg-white' : 'bg-violet-500'}`} />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Click any date to add an event on it. Members see it on their calendar.</p>
                    </div>

                    <div className={`${CARD} p-4`}>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 font-black text-slate-900"><CalendarDays size={18} className="text-indigo-600" />
                                {picked ? picked.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : `${title} · this month`}</h3>
                            <div className="flex items-center gap-3">
                                {picked && <button type="button" onClick={() => setPicked(null)} className="text-xs font-bold text-slate-500 hover:text-indigo-600">Whole month</button>}
                                <button type="button" onClick={() => setAdding(isoDay(picked || new Date()))} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><Plus size={14} /> Add event</button>
                            </div>
                        </div>
                        {shown.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">{picked ? 'Nothing on this day.' : 'Nothing this month yet. Click a date to add an event.'}</p>
                        ) : (
                            <ul className="mt-1 divide-y divide-slate-100">
                                {shown.map((e) => {
                                    const upcoming = new Date(e.date).getTime() > now;
                                    return (
                                        <li key={e._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800">{e.title}{e.unit ? <span className="font-normal text-slate-500"> · {e.unit}</span> : null}</p>
                                                <p className="text-sm text-slate-500">{formatDate(e.date)} · {e.kind} · {e.hours} h{e.place ? ` · ${e.place}` : ''}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {upcoming ? <Pill status="upcoming" /> : e.attendanceTaken
                                                    ? <span className="text-sm font-semibold text-emerald-700">{e.presentCount} present</span>
                                                    : <span className="text-sm font-semibold text-amber-700">Attendance not taken</span>}
                                                <button onClick={() => setMarking(e)} className={BTN2}>Attendance</button>
                                                <button onClick={() => remove(e)} className="p-2 text-slate-400 hover:text-red-600" aria-label="Delete event"><Trash2 size={16} /></button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
            {adding && <EventDialog key={adding} scope={scope} title={title} date={adding} onClose={() => setAdding(null)} onDone={done} />}
            {marking && <AttendanceDialog event={marking} onClose={() => setMarking(null)} onDone={done} />}
        </div>
    );
};

const TargetsTab = ({ scheme, targets, onChanged }) => {
    // A server from before Scouts and clubs sends no targets for them: start blank rather than crash.
    const [form, setForm] = useState(() => targets?.[scheme] || { requiredHours: 0, requiredCamps: 0, minAttendance: 75 });
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const save = async () => {
        setBusy(true);
        try { setNotice((await api.put(`${BASE}/settings`, { scheme, ...form })).data.message); onChanged(); }
        catch (err) { setNotice(errorOf(err, 'Could not save.')); }
        finally { setBusy(false); }
    };
    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <div className={`${CARD} max-w-xl space-y-3 p-5`}>
                <p className="text-sm text-slate-500">What a student needs for the {SCHEME_LABEL[scheme]} certificate. Progress, &ldquo;Behind&rdquo; and &ldquo;Eligible&rdquo; are worked out from these.</p>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Hours"><input type="number" min="0" className={INPUT} value={form.requiredHours} onChange={(e) => set('requiredHours', e.target.value)} /></Field>
                    <Field label="Camps"><input type="number" min="0" className={INPUT} value={form.requiredCamps} onChange={(e) => set('requiredCamps', e.target.value)} /></Field>
                    <Field label="Min attendance %"><input type="number" min="0" max="100" className={INPUT} value={form.minAttendance} onChange={(e) => set('minAttendance', e.target.value)} /></Field>
                </div>
                <button onClick={save} disabled={busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}Save targets</button>
            </div>
        </div>
    );
};

/** The headline numbers for one scheme or one club. */
const useOverview = (scope) => {
    const [overview, setOverview] = useState(null);
    const [error, setError] = useState('');
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const res = await api.get(`${BASE}/overview`, { params: scope, signal });
            if (isCurrent()) { setOverview(res.data); setError(''); }
        } catch (err) { if (isCurrent()) setError(errorOf(err, 'Could not load the overview.')); }
    };
    const reload = useAutoRefresh(load, 30000, [scope.scheme, scope.clubId]);
    return { overview, error, setError, reload };
};

/** Add or edit a Scouts unit: its name, section, registration number and leaders. */
const UnitDialog = ({ unit, onClose, onDone }) => {
    const teachers = useTeachers();
    const [form, setForm] = useState({
        name: unit?.name || '', section: unit?.section || '', regNo: unit?.regNo || '', note: unit?.note || '',
        leaderTeacherIds: (unit?.leaderTeacherIds || []).map((t) => t._id)
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggleLeader = (id) => set('leaderTeacherIds', form.leaderTeacherIds.includes(id) ? form.leaderTeacherIds.filter((x) => x !== id) : [...form.leaderTeacherIds, id]);
    const submit = async () => {
        if (!form.section) { setError('Choose the unit\'s section.'); return; }
        setBusy(true); setError('');
        try { onDone((unit ? await api.put(`${BASE}/units/${unit._id}`, form) : await api.post(`${BASE}/units`, form)).data.message); }
        catch (err) { setError(errorOf(err, 'Could not save the unit.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={unit ? 'Edit unit' : 'Add a unit'} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel={unit ? 'Save' : 'Add'}>
            <Field label="Name"><input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 1st Scout Troop" required /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Section">
                    <select className={INPUT} value={form.section} onChange={(e) => set('section', e.target.value)}>
                        <option value="">Choose…</option>
                        {Object.entries(SECTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Field>
                <Field label="BSG registration no."><input className={INPUT} value={form.regNo} onChange={(e) => set('regNo', e.target.value)} placeholder="If registered" /></Field>
            </div>
            <Field label="Leaders">
                {teachers.loading ? <p className="text-sm text-slate-400">Loading…</p> : teachers.items.length === 0 ? (
                    <p className="text-sm text-slate-500">No teachers yet. Add teachers to your organization first.</p>
                ) : (
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                        {teachers.items.map((t) => (
                            <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                                <input type="checkbox" checked={form.leaderTeacherIds.includes(t.id)} onChange={() => toggleLeader(t.id)} />
                                <span className="font-semibold text-slate-800">{t.label}</span>{t.sub && <span className="text-slate-500">· {t.sub}</span>}
                            </label>
                        ))}
                    </div>
                )}
            </Field>
            <Field label="Note"><textarea className={INPUT} rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </DialogShell>
    );
};

/** Scouts & Guides units: each with its section, leaders and member count. */
const UnitsTab = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState(null);   // 'new', or the unit

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/units`, { signal });
            if (!isCurrent()) return;
            setRows(res.data.units || []); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, []);
    const done = (msg) => { setEditing(null); setNotice(msg); reload(); };
    const setStatus = async (u, status) => {
        try { done((await api.put(`${BASE}/units/${u._id}`, { status })).data.message); }
        catch (err) { setNotice(errorOf(err, 'That did not go through.')); }
    };
    const remove = async (u) => {
        if (!window.confirm(`Delete ${u.name}?`)) return;
        try { done((await api.delete(`${BASE}/units/${u._id}`)).data.message); }
        catch (err) { setNotice(errorOf(err, 'Could not delete.')); }
    };

    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <div className="flex justify-end"><button onClick={() => setEditing('new')} className={BTN}><Plus size={16} /> Add unit</button></div>
            <div className={`${CARD} overflow-x-auto`}>
                {loading ? <Rows count={3} /> : failed ? <LoadFailed what="the units" onRetry={reload} /> : rows.length === 0 ? (
                    <Empty icon={Users}>No units yet. Add your Cub pack, Bulbul flock, Scout troop, Guide company, Rover crew or Ranger team, then put members in them.</Empty>
                ) : (
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr><th className="px-4 py-3">Unit</th><th className="px-3 py-3">Section</th><th className="px-3 py-3">Leaders</th><th className="px-3 py-3">Members</th><th className="px-3 py-3">Status</th><th className="px-4 py-3" /></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((u) => (
                                <tr key={u._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3"><span className="block font-semibold text-slate-800">{u.name}</span>{u.regNo && <span className="text-xs text-slate-500">Reg. {u.regNo}</span>}</td>
                                    <td className="px-3 py-3 text-slate-700">{SECTION_LABEL[u.section]}</td>
                                    <td className="px-3 py-3 text-slate-700">{u.leaderTeacherIds?.length ? u.leaderTeacherIds.map((t) => t.name).join(', ') : <span className="text-amber-700">No leader yet</span>}</td>
                                    <td className="px-3 py-3 text-slate-700">{u.members}{u.pending > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{u.pending} asked</span>}</td>
                                    <td className="px-3 py-3">{u.status === 'active' ? <Pill status="active" /> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Retired</span>}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="inline-flex gap-1">
                                            <button onClick={() => setEditing(u)} className="p-1 text-slate-400 hover:text-indigo-600" aria-label={`Edit ${u.name}`}><Pencil size={15} /></button>
                                            <button onClick={() => setStatus(u, u.status === 'active' ? 'inactive' : 'active')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">{u.status === 'active' ? 'Retire' : 'Reactivate'}</button>
                                            <button onClick={() => remove(u)} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${u.name}`}><Trash2 size={15} /></button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {editing && <UnitDialog unit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
        </div>
    );
};

/** The exams, camps and events BSG (national, and this organization's state) published for its Scouts & Guides. */
const NoticesTab = () => {
    const [notices, setNotices] = useState(null);
    const [failed, setFailed] = useState(false);
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const res = await api.get('/organizations/me/bsg/feed', { signal });
            if (isCurrent()) { setNotices(res.data.notices || []); setFailed(false); }
        } catch { if (isCurrent()) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    if (!notices) return failed ? <div className={CARD}><LoadFailed what="the notices" onRetry={reload} /></div> : <Rows count={2} height="h-24" />;
    if (!notices.length) return <div className={CARD}><Empty icon={CalendarDays}>No BSG notices right now. Set your state in Settings to see your state office&apos;s exams and camps as well as the national ones.</Empty></div>;
    return <div className="space-y-3">{notices.map((n) => <BsgNoticeCard key={n._id} notice={n} />)}</div>;
};

/** NSS, NCC or Scouts & Guides: its numbers, then members, approvals, events and targets. */
const SchemeView = ({ scheme, office }) => {
    const scope = useMemo(() => ({ scheme }), [scheme]);
    const title = SCHEME_LABEL[scheme];
    const [tab, setTab] = useState('members');
    const { overview, error, setError, reload } = useOverview(scope);
    const t = overview?.totals;
    return (
        <div className="space-y-4">
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={Users} label={`${title} members`} value={t?.members} sub={t && `${t.pendingMembers} asked to join`} loading={!overview} />
                <Stat icon={Clock} tone="amber" label="To approve" value={t?.pendingActivities} sub={t && `${t.upcomingEvents} events coming up`} loading={!overview} />
                <Stat icon={AlertTriangle} tone="violet" label="Behind" value={t?.atRisk} sub={t && `Avg attendance ${t.avgAttendance ?? '—'}${t.avgAttendance !== null ? '%' : ''}`} loading={!overview} />
                <Stat icon={Award} tone="emerald" label="Eligible" value={t?.eligible} sub={t && `${t.totalHours} hours logged`} loading={!overview} />
            </div>
            <Segmented options={[['members', 'Members'], ...(scheme === 'SCOUTS' ? [['units', 'Units'], ['awards', 'Ranks & badges'], ...(office ? [] : [['notices', 'BSG notices']])] : []), ['approvals', 'Approvals'], ['events', 'Calendar'], ['targets', 'Targets']]} value={tab} onChange={setTab}
                counts={{ approvals: t?.pendingActivities, members: t?.pendingMembers, awards: t?.pendingAwards }} />
            {tab === 'members' && <MembersTab scope={scope} title={title} overview={overview} onChanged={reload} />}
            {tab === 'units' && <UnitsTab />}
            {tab === 'awards' && <AwardsTab onChanged={reload} />}
            {tab === 'notices' && <NoticesTab />}
            {tab === 'approvals' && <ApprovalsTab scope={scope} onChanged={reload} />}
            {tab === 'events' && <EventsTab scope={scope} title={title} onChanged={reload} />}
            {tab === 'targets' && (overview ? <TargetsTab scheme={scheme} targets={overview.targets} onChanged={reload} /> : <Rows count={2} />)}
        </div>
    );
};

const ClubDialog = ({ club, onClose, onDone }) => {
    const teachers = useTeachers();
    const [form, setForm] = useState({
        name: club?.name || '', category: club?.category || 'cultural', description: club?.description || '',
        inchargeTeacherId: club?.inchargeTeacherId?._id || ''
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async () => {
        setBusy(true); setError('');
        try { onDone((club ? await api.put(`${BASE}/clubs/${club._id}`, form) : await api.post(`${BASE}/clubs`, form)).data.message); }
        catch (err) { setError(errorOf(err, 'Could not save the club.')); }
        finally { setBusy(false); }
    };
    return (
        <DialogShell title={club ? 'Edit club' : 'Create a club'} onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel={club ? 'Save' : 'Create'}>
            <Field label="Name"><input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dance Club, Cricket Club" required /></Field>
            <Field label="Type">
                <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(([v, l]) => (
                        <button key={v} type="button" onClick={() => set('category', v)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${form.category === v ? `${CATEGORY_TONE[v]} ring-current` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
                    ))}
                </div>
            </Field>
            <Field label="Teacher in charge">
                <SearchSelect items={teachers.items} loading={teachers.loading} value={form.inchargeTeacherId} onChange={(v) => set('inchargeTeacherId', v)}
                    placeholder="Choose a teacher" emptyText="No teacher matches. Add teachers to your organization first." allowNone />
            </Field>
            <p className="-mt-1 text-xs text-slate-500">The teacher in charge adds the club&apos;s events from their own dashboard.</p>
            <Field label="What it does (students see this)"><textarea className={INPUT} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        </DialogShell>
    );
};

/** One club: its members and their posts, its events, activities to approve. */
const ClubManage = ({ club, onBack, onChanged }) => {
    const scope = useMemo(() => ({ scheme: 'CLUB', clubId: club._id }), [club._id]);
    const [tab, setTab] = useState('members');
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState('');
    const { overview, reload } = useOverview(scope);
    const t = overview?.totals;
    const changed = () => { reload(); onChanged(); };
    const remove = async () => {
        if (!window.confirm(`Delete ${club.name}?`)) return;
        try { await api.delete(`${BASE}/clubs/${club._id}`); onChanged(); onBack(); }
        catch (err) { setNotice(errorOf(err, 'Could not delete.')); }
    };
    return (
        <div className="space-y-4">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> All clubs</button>
            {notice && <Banner onClose={() => setNotice('')}>{notice}</Banner>}
            <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">{club.name}</h2>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_TONE[club.category] || CATEGORY_TONE.other}`}>{CATEGORY_LABEL[club.category] || 'Other'}</span>
                    </div>
                    {club.description && <p className="mt-1 text-sm text-slate-500">{club.description}</p>}
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><GraduationCap size={15} className="text-indigo-500" /> In charge: <span className="font-semibold">{club.inchargeTeacherId?.name || 'No teacher yet'}</span></p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button onClick={() => setEditing(true)} className={BTN2}><Pencil size={15} /> Edit club</button>
                    <button onClick={remove} className={`${BTN2} !text-red-600`} aria-label="Delete club"><Trash2 size={15} /></button>
                </div>
            </div>
            <Segmented options={[['members', 'Members & posts'], ['events', 'Calendar'], ['approvals', 'Approvals']]} value={tab} onChange={setTab}
                counts={{ members: t?.pendingMembers, approvals: t?.pendingActivities }} />
            {tab === 'members' && <MembersTab scope={scope} title={club.name} overview={overview} onChanged={changed} />}
            {tab === 'events' && <EventsTab scope={scope} title={club.name} onChanged={changed} />}
            {tab === 'approvals' && <ApprovalsTab scope={scope} onChanged={changed} />}
            {editing && <ClubDialog club={club} onClose={() => setEditing(false)} onDone={(msg) => { setEditing(false); onChanged(msg); }} />}
        </div>
    );
};

/** Every club as a card; Create club; open one to manage it. */
const ClubsView = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState('');
    const [creating, setCreating] = useState(false);
    // An opened club is a step in the address: Back returns to all the clubs.
    const [openId, openClub, closeClub] = useStepParam('club');
    const setOpenId = (id) => (id ? openClub(id) : closeClub());
    const [category, setCategory] = useState('');

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const res = await api.get(`${BASE}/clubs`, { signal });
            if (!isCurrent()) return;
            setRows(res.data.clubs || []); setFailed(false);
        } catch { if (isCurrent() && fresh) setFailed(true); }
        finally { if (isCurrent()) setLoading(false); }
    };
    const reload = useAutoRefresh(load, 30000, []);
    const changed = (msg) => { if (typeof msg === 'string') setNotice(msg); reload(); };

    const open = rows.find((c) => c._id === openId);
    if (open) return <ClubManage club={open} onBack={() => setOpenId(null)} onChanged={changed} />;

    const shown = category ? rows.filter((c) => c.category === category) : rows;
    return (
        <div className="space-y-3">
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Segmented options={[['', 'All'], ...CATEGORIES.filter(([v]) => rows.some((c) => c.category === v))]} value={category} onChange={setCategory} />
                <button onClick={() => setCreating(true)} className={`${BTN} shrink-0`}><Plus size={16} /> Create club</button>
            </div>
            {loading ? <Rows count={3} height="h-28" /> : failed ? <div className={CARD}><LoadFailed what="the clubs" onRetry={reload} /></div> : rows.length === 0 ? (
                <div className={CARD}><Empty icon={Users}>No clubs yet. Create one — cultural, sports, technical… — and students can ask to join it.</Empty></div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {shown.map((c) => (
                        <button key={c._id} onClick={() => setOpenId(c._id)} className={`${CARD} p-5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-black text-slate-900">{c.name}</p>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY_TONE[c.category] || CATEGORY_TONE.other}`}>{CATEGORY_LABEL[c.category] || 'Other'}</span>
                            </div>
                            {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
                            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><GraduationCap size={14} className="text-indigo-500" /> {c.inchargeTeacherId?.name || 'No teacher in charge'}</p>
                            <div className="mt-3 flex items-center gap-3 text-sm">
                                <span className="font-semibold text-slate-700">{c.members} member{c.members === 1 ? '' : 's'}</span>
                                {c.pending > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{c.pending} asked to join</span>}
                                <span className="ml-auto text-xs font-bold text-indigo-600">Manage →</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {creating && <ClubDialog onClose={() => setCreating(false)} onDone={(msg) => { setCreating(false); changed(msg); }} />}
        </div>
    );
};

const OrgNccNss = () => {
    // A BSG office handles Scouts & Guides only: no NCC, NSS or clubs.
    const office = Boolean(useOutletContext()?.organization?.bsgOffice);
    const [section, setSection] = useState(office ? 'SCOUTS' : 'NSS');
    if (office) {
        return (
            <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
                <PageHeader icon={Shield} title="Scouts & Guides" subtitle="Your direct members — Scouts & Guides with no institution: their units, attendance, ranks and badges." />
                <SchemeView scheme="SCOUTS" office />
            </div>
        );
    }
    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Shield} title="Extra-curricular"
                subtitle="NSS, NCC, Scouts & Guides and your clubs. Pick one to see its members, events and approvals." />
            <Segmented options={SECTIONS} value={section} onChange={setSection} />
            {section === 'CLUB' ? <ClubsView /> : <SchemeView key={section} scheme={section} />}
        </div>
    );
};

export default OrgNccNss;
