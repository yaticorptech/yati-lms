/**
 * The teacher's profile, in the student profile's shape: a cover with their
 * photo (upload one, cropped round, or pick an avatar), name and details,
 * their research in four figures, then their details form, organization (a
 * popup), password, and signing out.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle2, Loader2, KeyRound, LogOut, Eye, EyeOff, Building2, Clock, Camera, CreditCard, Mail, Phone, CalendarDays, Microscope, Route, BookMarked, FileText, PenLine, Briefcase, GraduationCap, BookOpen, FlaskConical, Lightbulb } from 'lucide-react';
import teacherApi, { messageOf, TEACHER_TOKEN } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { Card, CardTitle, ErrorNote, OkNote, Field, StatTile, TeacherAvatar, Badge, Progress } from '../ui';
import { btn, inputClass, fmtNum, colorOf } from '../kit';
import OrganizationDialog from '../OrganizationDialog';
import PhotoPicker from '../../components/PhotoPicker';

// The banner's faint research icons, placed by hand; the smaller screens show fewer.
const BANNER_ICONS = [
    { icon: GraduationCap, className: 'right-[6%] top-4 h-12 w-12 rotate-12 sm:h-14 sm:w-14' },
    { icon: BookOpen, className: 'right-[18%] top-11 h-9 w-9 -rotate-6 sm:h-10 sm:w-10' },
    { icon: FlaskConical, className: 'right-[30%] top-3 hidden h-9 w-9 rotate-[18deg] sm:block' },
    { icon: PenLine, className: 'right-[42%] top-12 hidden h-8 w-8 -rotate-12 md:block' },
    { icon: Lightbulb, className: 'right-[54%] top-4 hidden h-9 w-9 rotate-6 lg:block' },
    { icon: BookMarked, className: 'right-[66%] top-10 hidden h-8 w-8 -rotate-[10deg] lg:block' }
];

// What a complete profile has: each with the form field that adds it ('photo' opens the picker).
const CHECKS = [
    { key: 'profilePicture', label: 'a photo', field: 'photo' },
    { key: 'phone', label: 'phone', field: 'me-phone' },
    { key: 'designation', label: 'designation', field: 'me-designation' },
    { key: 'institution', label: 'institution', field: 'me-institution' },
    { key: 'department', label: 'department', field: 'me-department' },
    { key: 'researchArea', label: 'research area', field: 'me-research' }
];

const FIELDS = [
    ['name', 'Full name', 80], ['email', 'Email', 254], ['phone', 'Phone', 20], ['designation', 'Designation', 100],
    ['institution', 'Institution', 200], ['department', 'Department', 200]
];

export default function TeacherProfile() {
    const { teacher, setTeacher, signOut } = useTeacher();
    const [f, setF] = useState(() => Object.fromEntries([...FIELDS.map(([k]) => [k, teacher?.[k] || '']), ['researchArea', teacher?.researchArea || '']]));
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [show, setShow] = useState(false);
    const [pwBusy, setPwBusy] = useState(false);
    const [pwError, setPwError] = useState({});
    const [pwNote, setPwNote] = useState('');
    const [org, setOrg] = useState(null);             // GET /organization, for the line on this page
    const [orgOpen, setOrgOpen] = useState(false);
    const loadOrg = useCallback(() => teacherApi.get('/organization').then((r) => setOrg(r.data)).catch(() => {}), []);
    useEffect(() => { loadOrg(); }, [loadOrg]);
    const waiting = org && !org.member && org.request?.status === 'pending';
    // The four figures under the cover; the page works without them.
    const [stats, setStats] = useState(null);
    useEffect(() => { teacherApi.get('/overview').then((r) => setStats(r.data)).catch(() => {}); }, []);
    const [picking, setPicking] = useState(false);

    // The student's photo picker, saving to this teacher's account.
    const account = {
        picture: teacher?.profilePicture || '',
        saveAvatar: (url) => teacherApi.put('/me', { profilePicture: url }).then((r) => r.data),
        uploadPhoto: (fd) => teacherApi.post('/me/picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
        onSaved: (t) => setTeacher(t),
        remove: () => teacherApi.put('/me', { profilePicture: '' }).then((r) => r.data)
    };
    const role = [teacher?.designation, teacher?.department, teacher?.institution].filter(Boolean).join(' · ');
    const joined = teacher?.createdAt ? new Date(teacher.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
    const info = [
        { icon: CreditCard, color: 'emerald', label: 'Card number', value: teacher?.cardNumber || '—', mono: true },
        { icon: Mail, color: 'sky', label: 'Email', value: teacher?.email || '—' },
        { icon: Phone, color: 'violet', label: 'Phone', value: teacher?.phone || '—' },
        org?.member
            ? { icon: Building2, color: 'amber', label: 'Organization', value: org.organization.name }
            : { icon: CalendarDays, color: 'amber', label: 'Joined', value: joined || '—' },
        ...(teacher?.researchArea ? [{ icon: Microscope, color: 'rose', label: 'Research area', value: teacher.researchArea }] : []),
        ...(org?.member && joined ? [{ icon: CalendarDays, color: 'teal', label: 'Joined', value: joined }] : [])
    ];
    const missing = CHECKS.filter((c) => !String(teacher?.[c.key] || '').trim());
    const complete = Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100);
    // "Complete profile": the photo picker, or the first empty field in the form.
    const finish = (m) => {
        if (m.field === 'photo') { setPicking(true); return; }
        const el = document.getElementById(m.field);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
    };
    const tiles = stats ? [
        { to: '/teacher/research-path', icon: Route, color: 'emerald', label: 'Research path', value: stats.research ? `${stats.research.percent}%` : '—', sub: stats.research ? `${stats.research.done} of ${stats.research.total} tasks` : 'Not started' },
        { to: '/teacher/publications', icon: BookMarked, color: 'violet', label: 'Publications', value: stats.publications.total, sub: `${stats.publications.published} published` },
        { to: stats.thesis ? `/teacher/thesis/${stats.thesis._id}` : '/teacher/thesis', icon: FileText, color: 'amber', label: 'Thesis words', value: stats.thesis ? fmtNum(stats.thesis.words) : '—', sub: stats.thesis ? `of ${fmtNum(stats.thesis.targetWords)}` : 'No thesis yet' },
        { to: '/teacher/writing', icon: PenLine, color: 'rose', label: 'Writing today', value: fmtNum(stats.writing.today), sub: `of ${fmtNum(stats.writing.goal)} words` }
    ] : [];

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setErrors({}); setNote(''); setError('');
        try {
            const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => String(v).trim() !== String(teacher?.[k] || '').trim()).map(([k, v]) => [k, String(v).trim()]));
            if (!Object.keys(changed).length) { setNote('Nothing to save. Your details are as shown.'); return; }
            const r = await teacherApi.put('/me', changed);
            setTeacher(r.data);
            setNote('Your details are saved.');
        } catch (err) {
            const field = err.response?.data?.field;
            if (field) setErrors({ [field]: err.response.data.message }); else setError(messageOf(err, 'Your details could not be saved.'));
        } finally { setSaving(false); }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        setPwError({}); setPwNote('');
        if (pw.newPassword !== pw.confirm) { setPwError({ confirm: 'The two new passwords do not match.' }); return; }
        setPwBusy(true);
        try {
            const r = await teacherApi.put('/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
            // This device stays signed in with a fresh token; every other session ends.
            localStorage.setItem(TEACHER_TOKEN, r.data.token);
            setPw({ currentPassword: '', newPassword: '', confirm: '' });
            setPwNote('Password changed. You stay signed in here; other devices will ask you to sign in again.');
        } catch (err) {
            const field = err.response?.data?.field;
            setPwError(field ? { [field]: err.response.data.message } : { form: messageOf(err, 'The password could not be changed.') });
        } finally { setPwBusy(false); }
    };

    return (
        <div className="space-y-6">
            {/* The cover: photo and name side by side, then how to reach them,
                then how complete the profile is. */}
            <section aria-labelledby="profile-name" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {/* The banner: the gradient with dots, two soft glows, faint
                    research icons on the right, and a wave along the bottom. */}
                <div aria-hidden="true" className="relative h-24 overflow-hidden sm:h-28"
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, #059669, #14b8a6 55%, #0ea5e9)', backgroundSize: '16px 16px, 100% 100%' }}>
                    <span className="absolute -left-10 -top-20 h-56 w-56 rounded-full bg-emerald-300/30 blur-2xl" />
                    <span className="absolute -right-6 -top-24 h-64 w-64 rounded-full bg-sky-300/30 blur-2xl" />
                    {BANNER_ICONS.map(({ icon: Icon, className }, i) => <Icon key={i} className={`absolute text-white/20 ${className}`} strokeWidth={1.5} />)}
                    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-8 w-full sm:h-10">
                        <path d="M0 35 C 200 5, 400 60, 600 32 S 1000 0, 1200 28 L1200 60 L0 60 Z" fill="rgba(255,255,255,0.12)" />
                        <path d="M0 48 C 250 22, 450 62, 700 42 S 1050 22, 1200 44 L1200 60 L0 60 Z" fill="rgba(255,255,255,0.18)" />
                    </svg>
                </div>
                <div className="px-5 pb-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="relative -mt-12 w-fit shrink-0 sm:-mt-14">
                            <TeacherAvatar teacher={teacher} className="h-24 w-24 text-2xl shadow-md ring-4 ring-white sm:h-28 sm:w-28 sm:text-3xl" />
                            <button type="button" onClick={() => setPicking(true)} aria-label={teacher?.profilePicture ? 'Change photo' : 'Add a photo'}
                                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white shadow ring-2 ring-white transition-colors hover:bg-emerald-800">
                                <Camera size={15} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 id="profile-name" className="text-2xl font-semibold tracking-tight text-slate-900">{teacher?.name || 'Teacher'}</h1>
                                <Badge tone="bg-teal-50 text-teal-700 ring-1 ring-teal-200">Teacher</Badge>
                            </div>
                            {role
                                ? <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Briefcase size={14} className="shrink-0 text-slate-400" aria-hidden="true" /><span className="truncate">{role}</span></p>
                                : <p className="mt-1 text-sm text-slate-400">Add your designation and institution below.</p>}
                        </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                        {info.map((x) => (
                            <div key={x.label} className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorOf(x.color).soft}`}><x.icon size={16} aria-hidden="true" /></span>
                                <div className="min-w-0">
                                    <dt className="text-xs text-slate-500">{x.label}</dt>
                                    <dd className={`truncate text-sm font-medium text-slate-800 ${x.mono ? 'font-mono' : ''}`} title={x.value}>{x.value}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>

                    {/* How complete the profile is, and a way to the first thing missing. */}
                    {missing.length > 0 && (
                        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-semibold text-slate-800">Profile {complete}% complete</span>
                                    <span className="text-xs text-slate-500 tabular-nums">{CHECKS.length - missing.length} of {CHECKS.length}</span>
                                </div>
                                <div className="mt-2"><Progress value={complete} tone="bg-amber-500" label="Profile complete" /></div>
                                <p className="mt-2 text-xs text-slate-600">Still to add: {missing.map((m) => m.label).join(', ')}</p>
                            </div>
                            <button type="button" onClick={() => finish(missing[0])} className={`${btn.secondary} shrink-0`}>Complete profile</button>
                        </div>
                    )}
                </div>
            </section>

            {tiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tiles.map((t) => (
                        <Link key={t.label} to={t.to} className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 [&>div]:hover:border-slate-300">
                            <StatTile icon={t.icon} color={t.color} label={t.label} value={t.value} sub={t.sub} />
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Card>
                    <CardTitle icon={UserCircle2} color="teal">Details</CardTitle>
                    <form onSubmit={save} className="space-y-3" noValidate>
                        <ErrorNote>{error}</ErrorNote>
                        <OkNote>{note}</OkNote>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {FIELDS.map(([k, label, max]) => (
                                <Field key={k} id={`me-${k}`} label={label} error={errors[k]} optional={['designation', 'institution', 'department'].includes(k)}>
                                    <input id={`me-${k}`} type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} maxLength={max} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={inputClass} />
                                </Field>
                            ))}
                        </div>
                        <Field id="me-research" label="Research area" optional error={errors.researchArea} hint="Used by the methodology advisor to tailor its answer.">
                            <input id="me-research" maxLength={300} value={f.researchArea} onChange={(e) => setF((x) => ({ ...x, researchArea: e.target.value }))} className={inputClass} placeholder="e.g. Educational technology in rural higher education" />
                        </Field>
                        <Field id="me-card" label="Card number" hint="The card you sign in with. It cannot be changed.">
                            <input id="me-card" readOnly value={teacher?.cardNumber || ''} className={`${inputClass} cursor-not-allowed bg-slate-50 font-mono text-slate-500`} />
                        </Field>
                        <button type="submit" disabled={saving} className={btn.primary}>{saving && <Loader2 size={15} className="animate-spin" />} Save details</button>
                    </form>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardTitle icon={Building2} color="sky">Organization</CardTitle>
                        <p className="text-sm text-slate-600">
                            {org?.member ? <>You are a member of <strong className="text-slate-900">{org.organization.name}</strong>.</>
                                : waiting ? <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-amber-600" aria-hidden="true" /> Waiting for {org.request.organization?.name || 'your organization'} to approve you.</span>
                                    : 'Your college or school on YATICORP. Add it with the Organization ID they give you.'}
                        </p>
                        <button type="button" onClick={() => setOrgOpen(true)} aria-haspopup="dialog" className={`${btn.secondary} mt-3`}>
                            <Building2 size={15} /> {org?.member || waiting ? 'View organization' : 'Add your organization'}
                        </button>
                    </Card>
                    <Card>
                        <CardTitle icon={KeyRound} color="amber">Change password</CardTitle>
                        <form onSubmit={changePassword} className="space-y-3" noValidate>
                            <ErrorNote>{pwError.form}</ErrorNote>
                            <OkNote>{pwNote}</OkNote>
                            {[['currentPassword', 'Current password', 'current-password'], ['newPassword', 'New password', 'new-password'], ['confirm', 'Repeat the new password', 'new-password']].map(([k, label, ac]) => (
                                <Field key={k} id={`pw-${k}`} label={label} error={pwError[k]} hint={k === 'newPassword' ? '8+ characters with upper and lower case, a number and a symbol.' : undefined}>
                                    <input id={`pw-${k}`} type={show ? 'text' : 'password'} autoComplete={ac} value={pw[k]} onChange={(e) => setPw((x) => ({ ...x, [k]: e.target.value }))} className={inputClass} />
                                </Field>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="submit" disabled={pwBusy || !pw.currentPassword || !pw.newPassword} className={btn.primary}>{pwBusy && <Loader2 size={15} className="animate-spin" />} Change password</button>
                                <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className={btn.ghost}>{show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'}</button>
                            </div>
                        </form>
                    </Card>
                    <Card>
                        <CardTitle icon={LogOut} color="rose">Sign out</CardTitle>
                        <p className="text-sm text-slate-500">Sign out of your teacher account on this device.</p>
                        <button type="button" onClick={signOut} className={`${btn.secondary} mt-3`}><LogOut size={15} /> Sign out</button>
                    </Card>
                </div>
            </div>
            {orgOpen && <OrganizationDialog onClose={() => setOrgOpen(false)} onChanged={loadOrg} />}
            {picking && <PhotoPicker account={account} onClose={() => setPicking(false)} />}
        </div>
    );
}
