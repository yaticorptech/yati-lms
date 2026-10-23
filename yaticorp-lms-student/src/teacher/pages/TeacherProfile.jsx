/**
 * The teacher's own details, their organization (a popup), their password,
 * and signing out.
 */
import { useCallback, useEffect, useState } from 'react';
import { UserCircle2, Loader2, KeyRound, LogOut, Eye, EyeOff, Building2, Clock } from 'lucide-react';
import teacherApi, { messageOf, TEACHER_TOKEN } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { PageHeader, Card, CardTitle, ErrorNote, OkNote, Field } from '../ui';
import { btn, inputClass } from '../kit';
import OrganizationDialog from '../OrganizationDialog';

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

    const save = async (e) => {
        e.preventDefault();
        setSaving(true); setErrors({}); setNote(''); setError('');
        try {
            const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => String(v).trim() !== String(teacher?.[k] || '').trim()).map(([k, v]) => [k, String(v).trim()]));
            if (!Object.keys(changed).length) { setNote('Nothing to save — your details are as shown.'); return; }
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
            <PageHeader icon={UserCircle2} title="My profile" subtitle="Your details as they appear on your teacher account." />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Card>
                    <CardTitle icon={UserCircle2}>Details</CardTitle>
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
                        <CardTitle icon={Building2}>Organization</CardTitle>
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
                        <CardTitle icon={KeyRound}>Change password</CardTitle>
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
                        <CardTitle icon={LogOut}>Sign out</CardTitle>
                        <p className="text-sm text-slate-500">Sign out of your teacher account on this device.</p>
                        <button type="button" onClick={signOut} className={`${btn.secondary} mt-3`}><LogOut size={15} /> Sign out</button>
                    </Card>
                </div>
            </div>
            {orgOpen && <OrganizationDialog onClose={() => setOrgOpen(false)} onChanged={loadOrg} />}
        </div>
    );
}
