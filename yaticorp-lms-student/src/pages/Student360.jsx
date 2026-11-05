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
import useAutoRefresh from '../hooks/useAutoRefresh';
import { Link } from 'react-router-dom';
import { Orbit, Landmark, UserRound, BarChart3, RotateCcw, ChevronRight, Target, Upload, FileText, ImageIcon, CheckCircle2, Clock, XCircle, Trash2, X, Loader2, Plus, Camera, Search, MessageSquare, Paperclip } from 'lucide-react';
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
    const [teacherOpen, setTeacherOpen] = useState(false);   // the teacher card, opened to their contact
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = () => api.get('/user/360').then((r) => { setData(r.data); setFailed(false); });
    // Marks and checks from the teacher show without a refresh: asked again every 15s while on screen.
    useAutoRefresh(() => load().catch(() => setFailed(true)), 15000);
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
    const left = Math.max(possible - total, 0);
    const pct = possible > 0 ? Math.round(Math.min(100, (total / possible) * 100)) : 0;
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
            {/* Welcome, with the campus behind and Add proof on the right. */}
            <header className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(100deg,#ede9fe_0%,#eef2ff_45%,#e9e5ff_100%)] px-5 py-6 sm:px-8 sm:py-7">
                <img src="/illustrations/360/campus.png" alt="" aria-hidden="true" loading="lazy"
                    className="pointer-events-none absolute bottom-0 right-[14%] -z-10 hidden h-full w-auto max-w-[58%] object-cover object-bottom opacity-90 [mask-image:linear-gradient(90deg,transparent,black_18%,black_80%,transparent)] md:block" />
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100/80 text-indigo-600 shadow-inner shadow-indigo-200/50 sm:h-16 sm:w-16"><Landmark size={30} strokeWidth={2.25} aria-hidden="true" /></span>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{data.organization || '360'}</h1>
                            <p className="mt-1 text-sm font-medium text-slate-600 sm:text-lg">Your activities, marks and teachers</p>
                        </div>
                    </div>
                    {addButton('Add Proof', 'hidden rounded-2xl bg-indigo-600 px-6 py-3.5 text-base text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 sm:inline-flex')}
                </div>
            </header>

            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{notice}</p>}

            {/* The marks: the ring, the bar, the three counts, and the cap on the books. */}
            <section aria-label="Your 360 marks" className="relative overflow-hidden rounded-3xl border border-white bg-white/80 p-5 shadow-[0_20px_50px_-28px_rgba(79,70,229,0.35)] ring-1 ring-indigo-100/70 backdrop-blur sm:p-7">
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
                    <MarksRing total={total} possible={possible} />
                    <div className="w-full min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-md shadow-indigo-200/60 ring-1 ring-indigo-50"><BarChart3 size={22} strokeWidth={2.5} aria-hidden="true" /></span>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Your 360 Marks</h2>
                                <p className="text-sm text-slate-500">{possible <= 0 ? 'Your marks add up here as your proofs are accepted.' : left > 0 ? `Earn ${fmt(left)} more marks to complete.` : 'Every mark earned. Well done!'}{perProof && possible > 0 ? ' Some activities give marks for each proof too.' : ''}</p>
                            </div>
                        </div>
                        {possible > 0 && (
                            <div className="mt-5 flex items-center gap-3">
                                <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80" role="progressbar" aria-label="Marks earned" aria-valuemin={0} aria-valuemax={possible} aria-valuenow={Math.min(total, possible)}>
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-400 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 tabular-nums">{pct}%</span>
                            </div>
                        )}
                        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
                            {[
                                ['Accepted', count('approved'), CheckCircle2, 'bg-emerald-50/80', 'bg-emerald-100 text-emerald-600'],
                                ['Waiting', count('pending'), Clock, 'bg-amber-50/80', 'bg-amber-100 text-amber-500'],
                                ['Sent Back', count('rejected'), RotateCcw, 'bg-rose-50/80', 'bg-rose-100 text-rose-500']
                            ].map(([label, n, Icon, bg, chip]) => (
                                <div key={label} className={`flex flex-col items-start gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${bg}`}>
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 ${chip}`}><Icon size={24} strokeWidth={2.25} aria-hidden="true" /></span>
                                    <div className="min-w-0">
                                        <p className="text-2xl font-black leading-none text-slate-900 tabular-nums sm:text-3xl">{n}</p>
                                        <p className="mt-1 truncate text-xs font-medium text-slate-600 sm:text-base">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <img src="/illustrations/360/books.png" alt="" aria-hidden="true" loading="lazy"
                        className="hidden w-52 shrink-0 mix-blend-multiply xl:block 2xl:w-60" />
                </div>
            </section>

            {/* Who checks the proof, and what is left to earn. */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
                {teachers.length > 0 && (
                    <section className="relative overflow-hidden rounded-3xl border border-white bg-white/80 shadow-[0_20px_50px_-30px_rgba(79,70,229,0.35)] ring-1 ring-indigo-100/70">
                        <svg aria-hidden="true" viewBox="0 0 400 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-indigo-100/70"><path d="M0 60 C 120 20, 260 90, 400 30 L400 80 L0 80 Z" fill="currentColor" /></svg>
                        <button type="button" onClick={() => setTeacherOpen((v) => !v)} aria-expanded={teacherOpen}
                            className="relative flex w-full items-center gap-4 p-5 text-left sm:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 sm:h-[4.5rem] sm:w-[4.5rem]"><UserRound size={30} aria-hidden="true" /></span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm text-slate-500 sm:text-base">{teachers.length === 1 ? 'Your 360 Teacher' : 'Your 360 Teachers'}</span>
                                <span className="block truncate text-xl font-black text-slate-900 sm:text-2xl">{teachers.map((t) => t.name).join(', ')}</span>
                            </span>
                            <ChevronRight size={22} aria-hidden="true" className={`shrink-0 text-slate-500 transition-transform ${teacherOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {teacherOpen && (
                            <ul className="relative space-y-1.5 px-5 pb-5 sm:px-6">
                                {teachers.map((t) => (
                                    <li key={t.name} className="rounded-xl bg-white/90 px-3 py-2 text-sm ring-1 ring-slate-100">
                                        <p className="font-semibold text-slate-800">{t.name}{t.subjects?.length ? <span className="font-normal text-slate-500"> · {t.subjects.join(', ')}</span> : null}</p>
                                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                                            {t.email && <a href={`mailto:${t.email}`} className="font-semibold text-indigo-600 hover:underline">{t.email}</a>}
                                            {t.phone && <a href={`tel:${t.phone}`} className="font-semibold text-indigo-600 hover:underline">{t.phone}</a>}
                                            {!t.email && !t.phone && <span className="text-slate-400">No contact details shared.</span>}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}
                <section className={`relative flex items-center gap-4 overflow-hidden rounded-3xl border border-white bg-[linear-gradient(100deg,#ffffff_0%,#f5f3ff_55%,#ede9fe_100%)] p-5 shadow-[0_20px_50px_-30px_rgba(79,70,229,0.35)] ring-1 ring-indigo-100/70 sm:p-6 ${teachers.length ? '' : 'lg:col-span-2'}`}>
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-indigo-600 sm:h-20 sm:w-20"><Target size={56} strokeWidth={2} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        {possible > 0 && left > 0 ? (
                            <p className="text-xl font-black text-slate-900 sm:text-2xl">Earn <span className="text-indigo-600">{fmt(left)}</span> more marks!</p>
                        ) : <p className="text-xl font-black text-slate-900 sm:text-2xl">{possible > 0 ? <>All <span className="text-indigo-600">{fmt(possible)}</span> marks earned!</> : 'Earn your 360 marks!'}</p>}
                        <p className="mt-1 text-sm text-slate-600 sm:text-base">Submit activities and get them approved to reach your target.</p>
                    </div>
                    <img src="/illustrations/360/rosette.png" alt="" aria-hidden="true" loading="lazy" className="hidden h-24 w-auto shrink-0 mix-blend-multiply sm:block" />
                </section>
            </div>
            {addButton('Add Proof', 'flex w-full rounded-2xl bg-indigo-600 py-3.5 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 sm:hidden')}

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
                                // The marks it brought: per proof (mode each), or the activity's marks so far out of its top.
                                // Each upload its own marks (2026-11-04); a mark given the old way on the whole activity shows as that.
                                const perProof = a && proofs.some((x) => String(x.activityId) === String(a._id) && x.status === 'approved' && x.marks > 0);
                                const score = p.status !== 'approved' ? null
                                    : a?.mode === 'each' ? { got: p.marks || a.marks || 0, of: null }
                                        : a && !perProof && byActivity[String(a._id)] ? { got: byActivity[String(a._id)], of: a.marks || 0 }
                                            : { got: p.marks || 0, of: null };
                                return <UploadRow key={p._id} proof={p} score={score} onRemove={() => removeProof(p)} onAgain={() => openAdd(p.activityId)} />;
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

/** The marks inside a ring that fills, indigo into sky, as they are earned. */
function MarksRing({ total, possible }) {
    const share = possible > 0 ? Math.min(1, total / possible) : 0;
    const R = 44, C = 2 * Math.PI * R;
    return (
        <div className="relative h-48 w-48 shrink-0 rounded-full bg-white shadow-[0_18px_40px_-16px_rgba(79,70,229,0.45),inset_0_0_0_10px_#f1f5f9] sm:h-56 sm:w-56" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                <defs><linearGradient id="s360-ring" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
                <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="url(#s360-ring)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${Math.max(C * share, share > 0 ? 2 : 0)} ${C}`} className="transition-[stroke-dasharray] duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="flex items-baseline gap-1"><span className="text-5xl font-black leading-none text-slate-900 tabular-nums sm:text-6xl">{fmt(total)}</span>{possible > 0 && <span className="text-xl font-bold text-slate-500 sm:text-2xl">/ {fmt(possible)}</span>}</p>
                <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">Marks</p>
            </div>
        </div>
    );
}

/** One uploaded proof: the file, its activity, where it stands, and the teacher's note. */
function UploadRow({ proof: p, score, onRemove, onAgain }) {
    const Icon = p.fileType === 'pdf' ? FileText : ImageIcon;
    const chip = p.status === 'approved'
        ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12} aria-hidden="true" />Accepted</span>
        : p.status === 'rejected'
            ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700"><XCircle size={12} aria-hidden="true" />Sent back</span>
            : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock size={12} aria-hidden="true" />Waiting</span>;
    // Accepted: the marks, large enough to see at a glance; "Marks to come" while the teacher has not given them.
    const marks = score && (score.got > 0 ? (
        <span className="inline-flex shrink-0 items-baseline gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 text-white tabular-nums"
            title={score.of ? 'Marks for this activity so far' : 'Marks for this proof'}>
            <span className="text-sm font-black">{score.of ? fmt(score.got) : `+${fmt(score.got)}`}</span>
            {score.of ? <span className="text-[11px] font-semibold opacity-75">/ {fmt(score.of)}</span> : null}
            <span className="text-[11px] font-semibold opacity-75">marks</span>
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            <Clock size={12} aria-hidden="true" />Marks to come
        </span>
    ));
    return (
        <li className={`rounded-xl border px-3 py-2.5 ${p.status === 'rejected' ? 'border-red-200 bg-red-50/50' : p.status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200"><Icon size={16} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{p.activityName}</p>
                    <p className="truncate text-xs text-slate-500">{p.groupName ? `${p.groupName} · ` : ''}Sent {day(p.createdAt)}</p>
                    <a href={p.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-indigo-600 hover:underline">{p.fileName || 'Proof'}</a>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    {chip}
                    {marks}
                    {p.status !== 'approved' && (
                        <button type="button" onClick={onRemove} aria-label={`Remove proof ${p.fileName || ''}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    )}
                </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 pl-[42px] sm:hidden">
                <span className="flex items-center gap-2">{chip}{marks}</span>
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
