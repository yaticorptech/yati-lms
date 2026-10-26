/**
 * Extra Curricular: NCC, NSS, Scouts & Guides and the organization's own
 * clubs. Each one the student is in (or has asked to join) is a folder tab
 * along the top, as in Career Path; the last tab asks to join another. With
 * none yet, the page says so and offers the request. The organization
 * approves both the membership and each activity logged; the page refreshes
 * every 30 seconds so their decisions show up on their own.
 *
 *   /extracurricular        the first membership, or "not in any yet"
 *   /extracurricular/join   pick one and fill in the details
 *   /extracurricular/:id    one membership: its calendar (ActivityCalendar.jsx — a club's
 *                           president adds events on it), hours, camps, attendance, activities
 *
 * Server: yaticorp-lms-server/src/nccnss/student.js.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, Clock, Tent, CalendarCheck, Award, Plus, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Trash2, Target, HeartHandshake, Compass, Users, Sparkles, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import FolderTabs from '../components/FolderTabs';
import { ActivityCalendar } from './ActivityCalendar';

const BASE = '/organizations/student/nccnss';
const KINDS = [['social', 'Social service / drive'], ['camp', 'Camp'], ['parade', 'Parade'], ['drill', 'Drill / training'], ['competition', 'Competition / match'], ['practice', 'Practice / rehearsal'], ['performance', 'Performance / show'], ['award', 'Award / achievement'], ['other', 'Other']];
const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm';
const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1';
const BTN = 'inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const errorOf = (err, fallback) => err.response?.data?.message || fallback;

const STATUS = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700'
};

const Notice = ({ notice, onClose }) => notice && (
    <p className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
        {notice.type === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{notice.text}</span>
        <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">✕</button>
    </p>
);

// What a student can join, in the order the picker shows them; the
// organization's clubs follow.
const SCHEMES = [
    { scheme: 'NCC', name: 'NCC', hint: 'National Cadet Corps: drill, camps and the A, B, C certificates.', icon: Shield, tone: 'from-emerald-500 to-green-700 shadow-emerald-500/40' },
    { scheme: 'NSS', name: 'NSS', hint: 'National Service Scheme: community service hours and special camps.', icon: HeartHandshake, tone: 'from-rose-400 to-red-600 shadow-rose-500/40' },
    { scheme: 'SCOUTS', name: 'Scouts & Guides', hint: 'Camping, first aid, badges and service.', icon: Compass, tone: 'from-amber-400 to-orange-500 shadow-orange-500/40' }
];
// A club member's post; plain members show none.
const ROLE_LABEL = { president: 'President', vice_president: 'Vice President', secretary: 'Secretary', treasurer: 'Treasurer', coordinator: 'Coordinator' };
const CLUB_LOOK = { icon: Users, tone: 'from-violet-500 to-indigo-600 shadow-violet-500/40' };
const lookOf = (m) => SCHEMES.find((x) => x.scheme === m.scheme) || CLUB_LOOK;
const sameChoice = (m, c) => m.scheme === c.scheme && String(m.clubId?._id || m.clubId || '') === String(c.clubId || '');

const JoinPage = ({ data, onDone }) => {
    const options = [
        ...SCHEMES,
        ...(data.clubs || []).map((c) => ({ scheme: 'CLUB', clubId: c._id, name: c.name, hint: c.description || 'A club in your organization.', ...CLUB_LOOK }))
    ];
    const [choice, setChoice] = useState(null);
    const [form, setForm] = useState({ unit: '', enrolmentNo: '', year: 1, certStage: '', note: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const taken = (c) => data.memberships.find((m) => m.status !== 'rejected' && sameChoice(m, c));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const res = await api.post(`${BASE}/join`, { ...form, scheme: choice.scheme, clubId: choice.clubId });
            onDone(res.data.message, res.data.memberId);
        } catch (err) { setError(errorOf(err, 'Could not send the request.')); setBusy(false); }
    };

    if (!choice) {
        return (
            <div className={`${CARD} space-y-4 p-5 sm:p-6`}>
                <div>
                    <h2 className="text-lg font-black text-slate-900">Request to enroll</h2>
                    <p className="text-sm text-slate-500">Pick what you want to join at {data.organization.name}. They confirm it, then you can log your activities.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {options.map((c) => {
                        const t = taken(c);
                        return (
                            <button key={`${c.scheme}-${c.clubId || ''}`} type="button" disabled={!!t} onClick={() => setChoice(c)}
                                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md disabled:pointer-events-none disabled:opacity-60">
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${c.tone}`}><c.icon size={19} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="font-black text-slate-900">{c.name}</span>
                                        {t && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{t.status === 'pending' ? 'Requested' : 'Joined'}</span>}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">{c.hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                {!(data.clubs || []).length && <p className="text-xs text-slate-400">Your organization has not added any clubs yet.</p>}
            </div>
        );
    }

    const club = choice.scheme === 'CLUB';
    const rejected = data.memberships.find((m) => m.status === 'rejected' && sameChoice(m, choice));
    return (
        <form onSubmit={submit} className={`${CARD} space-y-4 p-5 sm:p-6`}>
            <button type="button" onClick={() => setChoice(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Choose another</button>
            <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${choice.tone}`}><choice.icon size={21} /></span>
                <div>
                    <h2 className="text-lg font-black text-slate-900">Join {choice.name}</h2>
                    <p className="text-sm text-slate-500">Fill in your details. {data.organization.name} will confirm your request.</p>
                </div>
            </div>
            {rejected && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Your last request to join {choice.name} was not accepted. Check with your teacher or officer, then ask again.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
                {!club && <label><span className={LABEL}>{choice.scheme === 'SCOUTS' ? 'Troop / company' : 'Unit / company'}</span><input className={INPUT} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="As your officer calls it" /></label>}
                <label><span className={LABEL}>{club ? 'Membership no. (if you have one)' : 'Enrolment no. (if you have one)'}</span><input className={INPUT} value={form.enrolmentNo} onChange={(e) => set('enrolmentNo', e.target.value)} /></label>
                <label><span className={LABEL}>Year in {choice.name}</span>
                    <select className={INPUT} value={form.year} onChange={(e) => set('year', e.target.value)}>{[1, 2, 3].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
                </label>
                {choice.scheme === 'NCC' && (
                    <label><span className={LABEL}>Working towards</span>
                        <select className={INPUT} value={form.certStage} onChange={(e) => set('certStage', e.target.value)}>
                            <option value="">—</option>{['A', 'B', 'C'].map((c) => <option key={c} value={c}>{c} certificate</option>)}
                        </select>
                    </label>
                )}
                <label className="sm:col-span-2"><span className={LABEL}>Why do you want to join? (optional)</span>
                    <textarea className={INPUT} rows={3} maxLength={300} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Anything your organization should know" />
                </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}Send request</button>
        </form>
    );
};

const LogForm = ({ memberId, onDone, onCancel }) => {
    const [form, setForm] = useState({ kind: 'social', title: '', date: today(), hours: 2, place: '' });
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        const body = new FormData();
        Object.entries({ ...form, memberId }).forEach(([k, v]) => body.append(k, v));
        if (photo) body.append('proof', photo);
        try { onDone((await api.post(`${BASE}/activities`, body)).data.message); }
        catch (err) { setError(errorOf(err, 'Could not log the activity.')); }
        finally { setBusy(false); }
    };
    return (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={LABEL}>Type</span>
                    <select className={INPUT} value={form.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label><span className={LABEL}>What did you do</span><input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Tree plantation drive" required /></label>
                <label><span className={LABEL}>Date</span><input type="date" className={INPUT} value={form.date} max={today()} onChange={(e) => set('date', e.target.value)} /></label>
                <label><span className={LABEL}>Hours</span><input type="number" min="0" max="240" step="0.5" className={INPUT} value={form.hours} onChange={(e) => set('hours', e.target.value)} /></label>
                <label><span className={LABEL}>Place</span><input className={INPUT} value={form.place} onChange={(e) => set('place', e.target.value)} /></label>
                <label><span className={LABEL}>Photo proof (optional)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" /></label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}Submit for approval</button>
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            </div>
        </form>
    );
};

const Tile = ({ icon: Icon, label, value, target, percent, bad }) => (
    <div className={`${CARD} p-4`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Icon size={15} /> {label}</div>
        <p className={`mt-1 text-2xl font-black tabular-nums ${bad ? 'text-red-600' : 'text-slate-900'}`}>{value}{target ? <span className="text-base font-semibold text-slate-400"> / {target}</span> : null}</p>
        {percent !== undefined && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
        )}
    </div>
);

const Membership = ({ m, reload, say }) => {
    const [logging, setLogging] = useState(false);
    const s = m.summary;

    if (m.status === 'pending') {
        return (
            <div className={`${CARD} flex items-start gap-3 p-5`}>
                <Clock className="mt-0.5 shrink-0 text-amber-600" size={20} />
                <div>
                    <p className="font-bold text-slate-900">Waiting for your organization</p>
                    <p className="text-sm text-slate-500">You asked to join {m.name}{m.unit ? ` (${m.unit})` : ''}. You can log activities once it is confirmed.</p>
                </div>
            </div>
        );
    }

    const withdraw = async (a) => {
        try { say({ type: 'ok', text: (await api.delete(`${BASE}/activities/${a._id}`)).data.message }); reload(); }
        catch (err) { say({ type: 'error', text: errorOf(err, 'Could not withdraw it.') }); }
    };

    const checks = s ? [
        s.requiredHours > 0 && { ok: s.hours >= s.requiredHours, text: `${s.requiredHours} hours of service` },
        s.requiredCamps > 0 && { ok: s.camps >= s.requiredCamps, text: `${s.requiredCamps} camp${s.requiredCamps > 1 ? 's' : ''}` },
        { ok: s.attendance === null || s.attendance >= s.minAttendance, text: `${s.minAttendance}% attendance` }
    ].filter(Boolean) : [];

    return (
        <div className="space-y-4">
            {s && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile icon={Clock} label="Hours" value={s.hours} target={s.requiredHours || null} percent={s.requiredHours ? (s.hours / s.requiredHours) * 100 : undefined} />
                        <Tile icon={Tent} label="Camps" value={s.camps} target={s.requiredCamps || null} percent={s.requiredCamps ? (s.camps / s.requiredCamps) * 100 : undefined} />
                        <Tile icon={CalendarCheck} label="Attendance" value={s.attendance === null ? '—' : `${s.attendance}%`} bad={s.attendance !== null && s.attendance < s.minAttendance} />
                        <Tile icon={Award} label="Awards" value={s.awards} />
                    </div>
                    <div className={`${CARD} p-5`}>
                        <div className="flex items-center gap-2"><Target size={18} className="text-indigo-600" /><h2 className="font-black text-slate-900">Next step</h2></div>
                        <p className={`mt-2 rounded-xl px-3 py-2 text-sm font-semibold ${s.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-800'}`}>{s.next}</p>
                        <ul className="mt-3 space-y-1.5">
                            {checks.map((c) => (
                                <li key={c.text} className="flex items-center gap-2 text-sm text-slate-700">
                                    {c.ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                                    {c.text}
                                </li>
                            ))}
                        </ul>
                        {s.pendingActivities > 0 && <p className="mt-2 text-xs text-amber-700">{s.pendingActivities} activit{s.pendingActivities > 1 ? 'ies' : 'y'} waiting for approval.</p>}
                    </div>
                </>
            )}

            <div className={`${CARD} p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-slate-900">My activities</h2>
                    {!logging && <button onClick={() => setLogging(true)} className={BTN}><Plus size={16} /> Log activity</button>}
                </div>
                {logging && <LogForm memberId={m._id} onCancel={() => setLogging(false)} onDone={(text) => { setLogging(false); say({ type: 'ok', text }); reload(); }} />}
                {m.activities.length === 0 ? <p className="text-sm text-slate-500">Nothing logged yet. After a drive, camp or parade, log it here.</p> : (
                    <ul className="divide-y divide-slate-100">
                        {m.activities.map((a) => (
                            <li key={a._id} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                                    <p className="text-xs text-slate-500">{fmt(a.date)} · {a.hours} h · {a.kind}{a.place ? ` · ${a.place}` : ''}</p>
                                    {a.status === 'rejected' && a.reason && <p className="text-xs text-red-600">Reason: {a.reason}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noreferrer" className="text-indigo-600" aria-label="Photo"><ImageIcon size={16} /></a>}
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS[a.status]}`}>{a.status === 'pending' ? 'waiting' : a.status}</span>
                                    {a.status === 'pending' && <button onClick={() => withdraw(a)} className="text-slate-400 hover:text-red-600" aria-label="Withdraw"><Trash2 size={15} /></button>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {m.attendance.length > 0 && (
                <div className={`${CARD} p-5`}>
                    <h2 className="mb-2 font-black text-slate-900">Attendance</h2>
                    <div className="flex flex-wrap gap-1.5">
                        {m.attendance.map((e) => (
                            <span key={e._id} title={e.title} className={`rounded-lg px-2 py-1 text-xs font-semibold ${e.present ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                                {fmt(e.date)} {e.present ? '✓' : '✗'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ExtraCurricular = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const joining = id === 'join';
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState(null);

    const load = useCallback(async () => {
        try { setData((await api.get(BASE)).data); setFailed(false); }
        catch { setFailed(true); }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
        return () => clearInterval(timer);
    }, [load]);

    // The tabs: everything the student is in or has asked to join.
    const memberships = (data?.memberships || []).filter((m) => m.status !== 'rejected');
    const m = !joining && id ? memberships.find((x) => String(x._id) === id) : null;
    const tabs = data?.organization ? [
        ...memberships.map((x) => ({ key: x._id, to: `/extracurricular/${x._id}`, name: x.name, ...lookOf(x), on: m && String(m._id) === String(x._id) })),
        { key: 'join', to: '/extracurricular/join', name: memberships.length ? 'Join another' : 'Request to enroll', icon: Plus, tone: 'from-slate-400 to-slate-600 shadow-slate-500/40', on: joining }
    ] : [];

    if (data && !id && memberships.length) return <Navigate to={`/extracurricular/${memberships[0]._id}`} replace />;
    if (data && id && !joining && !m) return <Navigate to="/extracurricular" replace />;

    return (
        <div className="w-full space-y-4 pb-10">
            {tabs.length > 1 && <FolderTabs label="Extra Curricular" tabs={tabs} />}
            <Notice notice={notice} onClose={() => setNotice(null)} />

            {!data ? (failed ? (
                <div className={`${CARD} p-6 text-center text-sm text-slate-500`}>Could not load your record. <button onClick={load} className="font-semibold text-indigo-600">Try again</button></div>
            ) : <div className={`${CARD} h-40 animate-pulse`} />) : !data.organization ? (
                <div className={`${CARD} p-8 text-center`}>
                    <p className="font-bold text-slate-900">Join your school or college first</p>
                    <p className="mt-1 text-sm text-slate-500">Clubs, NCC, NSS and Scouts & Guides belong to your organization. Enter its Organization ID on your profile, then come back here.</p>
                    <Link to="/profile" className={`${BTN} mt-4`}>Go to My Profile</Link>
                </div>
            ) : joining ? (
                <JoinPage data={data} onDone={(text, memberId) => { setNotice({ type: 'ok', text }); load().then(() => navigate(memberId ? `/extracurricular/${memberId}` : '/extracurricular')); }} />
            ) : m ? (
                <>
                    <div className={`${CARD} flex items-center gap-3 p-5`}>
                        {(() => { const look = lookOf(m); return <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${look.tone}`}><look.icon size={21} /></span>; })()}
                        <div>
                            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-900">
                                {m.name}
                                {/* A club member's post, given by the organization. */}
                                {ROLE_LABEL[m.role] && <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700">{ROLE_LABEL[m.role]}</span>}
                            </h1>
                            <p className="text-sm text-slate-500">{data.organization.name}{m.unit ? ` · ${m.unit}` : ''}{m.clubId?.description ? ` · ${m.clubId.description}` : ''}</p>
                        </div>
                    </div>
                    {/* The club's (or unit's) own calendar; a club's president adds events on it. */}
                    {m.status === 'active' && <ActivityCalendar key={`cal-${m._id}`} memberId={m._id} canAdd={m.scheme === 'CLUB' && m.role === 'president'} title={m.name} />}
                    <Membership key={m._id} m={m} reload={load} say={setNotice} />
                </>
            ) : (
                <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles size={30} /></span>
                    <h1 className="mt-4 text-2xl font-black text-slate-900">You're not in any club yet</h1>
                    <p className="mt-2 max-w-md text-sm text-slate-600">You are not in any club, NCC, NSS or Scouts & Guides at {data.organization.name}. Ask to enroll, and once they confirm it, it shows up here as its own tab.</p>
                    <Link to="/extracurricular/join" className={`${BTN} mt-6 !rounded-2xl !px-5 !py-3`}><Plus size={17} /> Request to enroll</Link>
                </div>
            )}
        </div>
    );
};

export default ExtraCurricular;
