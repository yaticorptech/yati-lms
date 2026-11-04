/**
 * 360 (2026-10-30): the teachers tracking this student — each teacher keeps
 * their own set of students in their 360 dashboard — by name only (no
 * subjects, phone or email here, 2026-11-02). In the menu only once the
 * organization opens 360 to its students (StudentLayout).
 *
 * Activities (2026-10-31): the organization's list, in categories, each worth
 * "up to N marks" or "N per proof". Only students a 360 teacher has added see
 * 360 at all (the server answers enabled: false, notAdded, for the others).
 * The student uploads proof for an activity (a corrected sheet with its
 * marks, a marks card, a certificate, a fee receipt; a picture or PDF) and
 * their 360 teacher checks it: "up to N" gets one mark for the activity from
 * all its proof, "per proof" N for each one accepted; proof can be sent back
 * with a reason. Proof not yet accepted can be removed and uploaded again.
 *
 * A dashboard, not a list of every activity (2026-11-04, the user's ask):
 * - the marks, inside a slowly turning 360 ring, with what was accepted, is
 *   waiting and was sent back, and the 360 teacher;
 * - a + button (Add proof) opening a popup: a search box that suggests
 *   activities as the student types ("hand assignment" → Handwritten
 *   Assignments) and picks the category and activity for them, or the two
 *   dropdowns of the organization's categories and their activities; then a
 *   photo taken there and then, or a file from the device; Submit saves it to
 *   the student's Google Drive and their 360 teacher checks it and gives marks;
 * - the proof uploaded so far, newest first, with where each stands and the
 *   teacher's note; proof sent back is listed first, with Upload again on it
 *   (no separate note above, 2026-11-04).
 * Server: src/three60 (GET /api/user/360, POST/DELETE /api/user/360/proofs).
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Orbit, UserRound, Upload, FileText, ImageIcon, CheckCircle2, Clock, XCircle, Trash2, X, Loader2, Plus, Camera, Search, MessageSquare, Paperclip } from 'lucide-react';
import api from '../utils/api';
import YatiLoader from '../components/YatiLoader';
import Portal from '../components/Portal';
import Select from '../components/Select';
import useConfirmDialog from '../components/useConfirmDialog';
import useBackClose from '../native/useBackClose';
import { ensureDriveLinked, isDriveRequired } from '../integrations/google/driveGate';
import { getSnapshot, refresh, subscribe } from '../integrations/google/googleStore';
import GoogleConnectionCard from '../integrations/google/GoogleConnectionCard';

// Proof is kept in the student's own Google Drive (2026-11-02), shared by link for their 360 teacher.
const PROOF_DRIVE_REASON = 'Proof you upload is kept in your own Google Drive, shared by link so your 360 teacher can check it.';

const MAX_MB = 10;
const SHOWN = 6;   // uploads listed before "Show all"
const fmt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
const worth = (a) => (a.mode === 'each' ? `${fmt(a.marks)} mark${a.marks === 1 ? '' : 's'} per proof` : `Up to ${fmt(a.marks)} marks`);
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

export default function Student360() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [adding, setAdding] = useState(null);      // { activityId }: the Add proof popup
    const [notice, setNotice] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = () => api.get('/user/360').then((r) => { setData(r.data); setFailed(false); });
    useEffect(() => {
        let live = true;
        load().catch(() => { if (live) setFailed(true); });
        return () => { live = false; };
    }, []);
    const retry = () => { setFailed(false); load().catch(() => setFailed(true)); };
    useEffect(() => { if (!notice) return undefined; const t = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(t); }, [notice]);

    if (failed && !data) {
        return (
            <div role="alert" className="flex flex-col items-center py-16 text-center">
                <p className="font-medium text-slate-500">360 could not be loaded just now.</p>
                <button type="button" onClick={retry} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Try again</button>
            </div>
        );
    }
    if (!data) return <YatiLoader label="Loading 360" />;
    if (!data.enabled) {
        return (
            <div className="mx-auto max-w-md py-16 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Orbit size={22} /></span>
                <p className="font-semibold text-slate-700">{data.notAdded ? 'Your 360 teacher has not added you yet.' : '360 is not open for you yet.'}</p>
                <p className="mt-1 text-sm text-slate-500">{data.notAdded ? 'Once your mentor adds you to their 360 list, your activities show here.' : 'Your organization opens it when it is ready.'}</p>
                <Link to="/" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline">Back to Dashboard</Link>
            </div>
        );
    }

    const teachers = data.teachers || [];
    const groups = data.activityGroups || [];
    const proofs = data.proofs || [];
    const byActivity = data.totals?.byActivity || {};
    const all = groups.flatMap((g) => g.activities);
    const activityOf = (id) => all.find((a) => String(a._id) === String(id));
    const possible = all.reduce((n, a) => n + (a.mode === 'each' ? 0 : a.marks || 0), 0);
    // Per-proof activities have no top: their marks come on top of `possible` (never "23 of 20").
    const perProof = all.some((a) => a.mode === 'each');
    const total = data.totals?.total || 0;
    const count = (status) => proofs.filter((p) => p.status === status).length;
    // Sent back first (they need a new upload), then the rest, newest first (2026-11-04).
    const newest = [...proofs].sort((a, b) => ((b.status === 'rejected') - (a.status === 'rejected')) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    const listed = showAll ? newest : newest.slice(0, SHOWN);

    const openAdd = async (activityId = '') => { if (await ensureDriveLinked(PROOF_DRIVE_REASON)) setAdding({ activityId }); };
    const removeProof = async (p) => {
        if (!(await confirm({ title: 'Remove this proof?', message: `“${p.fileName || 'File'}” for ${p.activityName}. You can upload it again.`, confirmLabel: 'Remove', destructive: true }))) return;
        try {
            await api.delete(`/user/360/proofs/${p._id}`);
            setData((d) => ({ ...d, proofs: d.proofs.filter((x) => x._id !== p._id) }));
            setNotice('Proof removed.');
        } catch (err) { setNotice(err.response?.data?.message || 'That proof could not be removed.'); }
    };

    const addButton = (label, cls = '') => (
        <button type="button" onClick={() => openAdd()} disabled={!all.length}
            className={`items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-colors disabled:opacity-50 ${cls}`}>
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />{label}
        </button>
    );

    return (
        <div className="space-y-5 pb-10">
            <header className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Orbit size={22} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">360</h1>
                    <p className="text-sm text-slate-500">{data.organization ? `${data.organization} · ` : ''}your activities, marks and teachers</p>
                </div>
                {addButton('Add proof', 'hidden bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700 sm:inline-flex')}
            </header>

            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{notice}</p>}

            {/* The marks, inside the turning 360 ring. */}
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg shadow-indigo-600/20 sm:p-6" aria-label="Your 360 marks">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                    <Ring total={total} />
                    <div className="w-full min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/75">Your 360 marks</p>
                        <p className="text-4xl font-black leading-tight tabular-nums">{fmt(total)}</p>
                        {possible > 0 && <p className="text-xs font-semibold text-white/80">{perProof ? `of ${fmt(possible)}, plus marks per proof` : `of ${fmt(possible)} you can earn`}</p>}
                        {possible > 0 && (
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Marks earned" aria-valuemin={0} aria-valuemax={possible} aria-valuenow={Math.min(total, possible)}>
                                <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (total / possible) * 100)}%` }} />
                            </div>
                        )}
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            {[['Accepted', count('approved')], ['Waiting', count('pending')], ['Sent back', count('rejected')]].map(([label, n]) => (
                                <div key={label} className="rounded-xl bg-white/12 px-2 py-2 ring-1 ring-white/15">
                                    <p className="text-lg font-black tabular-nums">{n}</p>
                                    <p className="text-[11px] font-semibold text-white/80">{label}</p>
                                </div>
                            ))}
                        </div>
                        {teachers.length > 0 && (
                            <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-white/85">
                                <UserRound size={15} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{teachers.length === 1 ? 'Your 360 teacher' : 'Your 360 teachers'}: <strong className="text-white">{teachers.map((t) => t.name).join(', ')}</strong></span>
                            </p>
                        )}
                    </div>
                </div>
                {addButton('Add proof', 'mt-5 flex w-full bg-white text-indigo-700 hover:bg-indigo-50 sm:hidden')}
            </section>

            {/* What has been uploaded: sent back first, then newest first. */}
            <section aria-labelledby="s360-uploads" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 id="s360-uploads" className="text-base font-black text-slate-900">Your uploads</h2>
                        <p className="text-xs text-slate-500">{proofs.length ? `${proofs.length} proof${proofs.length === 1 ? '' : 's'} · your 360 teacher checks each and gives the marks` : 'Your 360 teacher checks each proof and gives the marks.'}</p>
                    </div>
                </div>
                {!all.length ? (
                    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Your organization has not listed any activities yet.</p>
                ) : !proofs.length ? (
                    <button type="button" onClick={() => openAdd()}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 px-4 py-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white"><Plus size={24} strokeWidth={2.5} aria-hidden="true" /></span>
                        <span className="font-bold text-slate-800">Add your first proof</span>
                        <span className="text-xs text-slate-500">A certificate, a marks card or a photo, for any of your {all.length} activities</span>
                    </button>
                ) : (
                    <>
                        <ul className="space-y-2">
                            {listed.map((p) => {
                                const a = activityOf(p.activityId);
                                return <UploadRow key={p._id} proof={p} score={a && a.mode !== 'each' ? `${fmt(byActivity[String(a._id)] || 0)} / ${fmt(a.marks)}` : ''} onRemove={() => removeProof(p)} onAgain={() => openAdd(p.activityId)} />;
                            })}
                        </ul>
                        {newest.length > SHOWN && (
                            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 w-full rounded-lg py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50">
                                {showAll ? 'Show fewer' : `Show all ${newest.length}`}
                            </button>
                        )}
                    </>
                )}
            </section>

            {adding && (
                <AddProof groups={groups} initialActivityId={adding.activityId} onClose={() => setAdding(null)}
                    onDone={(proof) => {
                        setAdding(null);
                        setData((d) => ({ ...d, proofs: [...(d.proofs || []), proof] }));
                        setNotice('Proof uploaded. Your teacher will check it.');
                    }} />
            )}
            {confirmDialog}
        </div>
    );
}

/** The marks in a ring that turns slowly (still for anyone who asks for less motion). */
function Ring({ total }) {
    return (
        <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.95),rgba(255,255,255,0.08)_30%,rgba(255,255,255,0.55)_55%,rgba(255,255,255,0.08)_80%,rgba(255,255,255,0.95))] motion-safe:animate-[spin_8s_linear_infinite]" />
            <div className="absolute inset-[5px] rounded-full bg-gradient-to-br from-indigo-600 to-violet-700" />
            <div className="absolute inset-3 rounded-full border-2 border-dashed border-white/25 motion-safe:animate-[spin_24s_linear_infinite_reverse]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">360</span>
                <span className="text-4xl font-black leading-none tabular-nums">{fmt(total)}</span>
                <span className="mt-1 text-[11px] font-semibold text-white/75">marks</span>
            </div>
        </div>
    );
}

/** One uploaded proof: the file, its activity, where it stands, and the teacher's note. */
function UploadRow({ proof: p, score, onRemove, onAgain }) {
    const Icon = p.fileType === 'pdf' ? FileText : ImageIcon;
    const chip = p.status === 'approved'
        ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12} aria-hidden="true" />Accepted{p.marks ? ` · +${fmt(p.marks)}` : score ? ` · ${score}` : ''}</span>
        : p.status === 'rejected'
            ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700"><XCircle size={12} aria-hidden="true" />Sent back</span>
            : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock size={12} aria-hidden="true" />Waiting</span>;
    return (
        <li className={`rounded-xl border px-3 py-2.5 ${p.status === 'rejected' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200"><Icon size={16} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{p.activityName}</p>
                    <p className="truncate text-xs text-slate-500">{p.groupName ? `${p.groupName} · ` : ''}Sent {day(p.createdAt)}</p>
                    <a href={p.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-indigo-600 hover:underline">{p.fileName || 'Proof'}</a>
                </div>
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                    {chip}
                    {p.status !== 'approved' && (
                        <button type="button" onClick={onRemove} aria-label={`Remove proof ${p.fileName || ''}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    )}
                </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 pl-[42px] sm:hidden">
                {chip}
                {p.status !== 'approved' && (
                    <button type="button" onClick={onRemove} aria-label={`Remove proof ${p.fileName || ''}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                )}
            </div>
            {p.note && <p className="mt-1.5 pl-[42px] text-[11px] text-slate-500">Your note: {p.note}</p>}
            {p.reviewNote && (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-[42px]">
                    <p className={`flex min-w-0 flex-1 basis-full items-start gap-1.5 sm:basis-auto rounded-lg px-2 py-1.5 text-xs ${p.status === 'rejected' ? 'bg-white font-semibold text-red-700 ring-1 ring-red-100' : 'bg-white text-slate-600 ring-1 ring-slate-100'}`}>
                        <MessageSquare size={13} className="mt-px shrink-0" aria-hidden="true" />Teacher: {p.reviewNote}
                    </p>
                    {p.status === 'rejected' && <button type="button" onClick={onAgain} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"><Upload size={12} aria-hidden="true" />Upload again</button>}
                </div>
            )}
        </li>
    );
}

/** Words typed, matched against an activity and its category: "hand assignment" finds Handwritten Assignments. */
const matches = (query, choice) => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = `${choice.activity.name} ${choice.group.name}`.toLowerCase();
    return words.length > 0 && words.every((w) => hay.includes(w));
};

/** The popup: find or choose the activity, take a photo or pick a file, submit. */
function AddProof({ groups, initialActivityId, onClose, onDone }) {
    // Every activity, even one at full marks: a student sends as much proof as they like (2026-11-04).
    const choices = useMemo(() => groups.flatMap((group) => group.activities.map((activity) => ({ group, activity }))), [groups]);
    const start = choices.find((c) => String(c.activity._id) === String(initialActivityId));
    const [groupId, setGroupId] = useState(start ? String(start.group._id) : '');
    const [activityId, setActivityId] = useState(start ? String(start.activity._id) : '');
    const [query, setQuery] = useState('');
    const [suggesting, setSuggesting] = useState(false);
    const [file, setFile] = useState(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [driveNeeded, setDriveNeeded] = useState(false);   // the server said Drive is not linked: the popup with the card
    const camera = useRef(null);
    const device = useRef(null);
    const close = () => { if (!busy) onClose(); };

    useBackClose(close, true);
    useEffect(() => {
        const before = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = before; };
    }, []);
    const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : ''), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const group = groups.find((g) => String(g._id) === groupId);
    const activity = group?.activities.find((a) => String(a._id) === activityId);
    const suggestions = query.trim() ? choices.filter((c) => matches(query, c)).slice(0, 6) : [];
    // The dropdowns show only once the search has found the activity (filled in), or found nothing (2026-11-04).
    const showPickers = Boolean(activityId) || (query.trim() !== '' && suggestions.length === 0);
    const choose = (c) => { setGroupId(String(c.group._id)); setActivityId(String(c.activity._id)); setQuery(''); setSuggesting(false); setError(''); };

    const pick = (f) => {
        setError('');
        if (!f) return;
        const ok = f.type.startsWith('image/') || f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (!ok) { setError('Choose a picture or a PDF.'); return; }
        if (f.size > MAX_MB * 1024 * 1024) { setError(`That file is over ${MAX_MB} MB — choose a lighter one.`); return; }
        setFile(f);
    };
    const submit = async (e) => {
        e.preventDefault();
        if (!activity) { setError('Search for the activity this proof is for.'); return; }
        if (!file) { setError('Take a photo or choose a file first.'); return; }
        setBusy(true); setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('activityId', activity._id);
            if (note.trim()) fd.append('note', note.trim());
            const r = await api.post('/user/360/proofs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onDone(r.data.proof);
        } catch (err) {
            if (isDriveRequired(err)) { refresh(true).catch(() => {}); setDriveNeeded(true); setBusy(false); return; }
            setError(err.response?.data?.message || 'The proof could not be uploaded. Please try again.');
            setBusy(false);
        }
    };

    const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800';
    return (
        <Portal>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md" onClick={close}>
                <form role="dialog" aria-modal="true" aria-labelledby="proof-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}
                    onKeyDown={(e) => { if (e.key === 'Escape' && !suggesting) close(); }}
                    className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl animate-pop-in">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                        <div className="min-w-0">
                            <h2 id="proof-title" className="font-bold text-slate-800">Add proof</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Saved in your Google Drive; your 360 teacher checks it and gives the marks.</p>
                        </div>
                        <button type="button" onClick={close} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
                    </div>
                    <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
                        {/* Search: suggestions as they type; a tap fills the category and activity. */}
                        <div className="relative">
                            <label htmlFor="proof-search" className="mb-1 block text-xs font-bold text-slate-600">Find the activity</label>
                            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-[34px] text-slate-400" />
                            <input id="proof-search" type="search" value={query} autoComplete="off"
                                onChange={(e) => { setQuery(e.target.value); setSuggesting(true); }} onFocus={() => setSuggesting(true)}
                                onBlur={() => setTimeout(() => setSuggesting(false), 150)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) { e.preventDefault(); choose(suggestions[0]); } if (e.key === 'Escape') setSuggesting(false); }}
                                placeholder="e.g. hand assignment, NSS camp" role="combobox" aria-expanded={suggesting && suggestions.length > 0} aria-controls="proof-suggestions"
                                className={`${field} pl-9 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`} />
                            {suggesting && query.trim() && (
                                <ul id="proof-suggestions" role="listbox" aria-label="Suggested activities" className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                                    {suggestions.length ? suggestions.map((c) => (
                                        <li key={c.activity._id} role="option" aria-selected={String(c.activity._id) === activityId}>
                                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(c)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-indigo-50">
                                                <span className="text-sm font-semibold text-slate-800">{c.activity.name}</span>
                                                <span className="text-xs text-slate-500">{c.group.name} · {worth(c.activity)}</span>
                                            </button>
                                        </li>
                                    )) : <li className="px-3 py-2 text-sm text-slate-500">No activity matches. Choose the category and activity below.</li>}
                                </ul>
                            )}
                        </div>
                        {showPickers && (
                        <>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="proof-category" className="mb-1 block text-xs font-bold text-slate-600">Category</label>
                                <Select id="proof-category" aria-label="Category" value={groupId} placeholder="Choose a category" className={field}
                                    onChange={(e) => { setGroupId(e.target.value); setActivityId(''); setError(''); }}>
                                    {groups.filter((g) => choices.some((c) => c.group === g)).map((g) => <option key={g._id} value={String(g._id)}>{g.name}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="proof-activity" className="mb-1 block text-xs font-bold text-slate-600">Activity</label>
                                <Select id="proof-activity" aria-label="Activity" value={activityId} placeholder={group ? 'Choose an activity' : 'Choose a category first'} disabled={!group} className={field}
                                    onChange={(e) => { setActivityId(e.target.value); setError(''); }}>
                                    {(group?.activities || []).map((a) => <option key={a._id} value={String(a._id)}>{a.name}</option>)}
                                </Select>
                            </div>
                        </div>
                        {activity && <p className="-mt-2 text-xs font-semibold text-indigo-700">{group.name} › {activity.name} · {worth(activity)}</p>}
                        </>
                        )}

                        {/* The proof: a photo taken now, or a file already on the device. */}
                        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take a photo" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
                        <input ref={device} type="file" accept="image/*,application/pdf,.pdf" className="hidden" aria-label="Proof file" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
                        {file ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                                {preview ? <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-emerald-200" />
                                    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-200"><Paperclip size={22} /></span>}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button type="button" onClick={() => setFile(null)} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-white">Change</button>
                            </div>
                        ) : (
                            <div>
                                <p className="mb-1 text-xs font-bold text-slate-600">The proof</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => camera.current?.click()} disabled={busy}
                                        className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 px-3 py-5 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                                        <Camera size={22} className="text-indigo-500" aria-hidden="true" />
                                        <span className="text-sm font-bold text-slate-800">Take photo</span>
                                        <span className="text-[11px] text-slate-500">With your camera</span>
                                    </button>
                                    <button type="button" onClick={() => device.current?.click()} disabled={busy}
                                        className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 px-3 py-5 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                                        <Upload size={22} className="text-indigo-500" aria-hidden="true" />
                                        <span className="text-sm font-bold text-slate-800">From device</span>
                                        <span className="text-[11px] text-slate-500">Picture or PDF · up to {MAX_MB} MB</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="proof-note" className="mb-1 block text-xs font-bold text-slate-600">Note for your teacher <span className="font-normal text-slate-400">(optional)</span></label>
                            <textarea id="proof-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
                                placeholder="For example: NSS camp, 12–18 Jan, Udupi"
                                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                    </div>
                    <div className="flex gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                        <button type="button" onClick={close} disabled={busy} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={busy}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                            {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Upload size={14} /> Submit</>}
                        </button>
                    </div>
                </form>
            </div>
            {driveNeeded && <LinkDrive onClose={() => setDriveNeeded(false)} />}
        </Portal>
    );
}

/**
 * Drive not linked when Submit was pressed (2026-11-04): a popup over Add
 * proof with the Google connect card. What was chosen stays; once linked,
 * Done closes it and Submit sends the proof.
 */
function LinkDrive({ onClose }) {
    const google = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const linked = google.connected && !google.needsReconnect;
    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="drive-title" onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-pop-in">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="drive-title" className="font-bold text-slate-800">Link your Google Drive</h2>
                        <p className="mt-0.5 text-sm text-slate-500">{PROOF_DRIVE_REASON} Connect it once, then tap Submit.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
                </div>
                <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
                    {linked && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />Drive is linked. Tap Done, then Submit.</p>}
                    <GoogleConnectionCard />
                </div>
                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                    <button type="button" onClick={onClose} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">{linked ? 'Done' : 'Close'}</button>
                </div>
            </div>
        </div>
    );
}
