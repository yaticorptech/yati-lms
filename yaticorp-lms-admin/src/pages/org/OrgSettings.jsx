/**
 * What an organization can change about itself: its name, logo, contact person,
 * email, phone, address and website.
 *
 * The organization ID is shown but not editable, and there is no field for it —
 * students may already be holding it on a handout, and a code that changed
 * underneath them would quietly stop working. The server will not accept it
 * either; the schema marks it immutable and the update reads only a fixed list
 * of fields.
 *
 * Read-only until "Edit details" is pressed, and the save bar appears only once
 * something has actually changed, so the page cannot be saved by accident.
 */
import React, { useState, useEffect, useId } from 'react';
import { Pencil, Lock, Loader2, Check, Copy, KeyRound, ImagePlus, RotateCw, Camera } from 'lucide-react';
import api from '../../utils/api';
import { CARD, INPUT, LABEL, BTN, BTN2, Banner } from '../../components/orgUi';
import PasswordField from '../../components/PasswordField';
import PasswordStrengthChecker from '../../components/PasswordStrengthChecker';
import { formatDate } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import { getViewedOrganization } from '../../utils/viewOrganization';

/** The fields this page owns. Anything else the server sends is left alone. */
// The logo is not among them: it has its own card, uploaded as an image.
const FIELDS = ['name', 'contactPerson', 'email', 'phone', 'address', 'website'];
const EMPTY = Object.fromEntries(FIELDS.map((f) => [f, '']));
const pick = (organization) => Object.fromEntries(FIELDS.map((f) => [f, organization?.[f] ?? '']));

const Field = ({ label, id, hint, error, children }) => (
    <div>
        <label className={LABEL} htmlFor={id}>{label}</label>
        {children}
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p>
            : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
);

/** The organization's logo, changed by uploading an image. */
const LogoCard = ({ organization, onSaved, onError }) => {
    const [busy, setBusy] = useState(false);
    const upload = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return onError('Choose an image file for your logo.');
        if (file.size > 5 * 1024 * 1024) return onError('That image is over 5 MB. Choose a smaller one.');
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await api.post('/organizations/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onSaved(res.data.organization);
        } catch (err) {
            onError(err.response?.data?.message || 'Could not upload the logo.');
        } finally {
            setBusy(false);
        }
    };
    const inputId = useId();
    const has = Boolean(organization.logo);
    // One row, a phone included: the logo itself opens the picker (the camera
    // badge says so), with "Change logo" as words under the text on a phone
    // and as a button at the end of the row from a tablet up.
    return (
        <div className={`${CARD} flex items-center gap-4 p-4 sm:p-5 lg:p-6`}>
            <label htmlFor={inputId} title={has ? 'Change logo' : 'Upload logo'} className={`relative shrink-0 cursor-pointer ${busy ? 'pointer-events-none' : ''}`}>
                {has ? (
                    <img src={organization.logo} alt={`${organization.name} logo`} className="h-16 w-16 rounded-2xl bg-white object-contain p-1 ring-1 ring-slate-200 sm:h-20 sm:w-20" />
                ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 sm:h-20 sm:w-20"><ImagePlus size={26} /></span>
                )}
                <span aria-hidden className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-2 ring-white">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </span>
            </label>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">Logo</p>
                <p className={`text-xs leading-snug sm:text-sm ${has ? 'text-slate-500' : 'font-medium text-amber-700'}`}>
                    {has ? 'Shown to your students on your courses, and across this panel.' : 'Needed before you can add or publish courses.'}
                </p>
                <label htmlFor={inputId} className={`mt-1.5 inline-flex min-h-8 cursor-pointer items-center gap-1.5 text-sm font-semibold text-indigo-600 sm:hidden ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                    {busy ? 'Uploading…' : has ? 'Change logo' : 'Upload logo'}
                </label>
            </div>
            {/* The wrapper hides it on a phone: BTN2 carries its own inline-flex. */}
            <div className="hidden shrink-0 sm:block">
                <label htmlFor={inputId} className={`${BTN2} cursor-pointer whitespace-nowrap ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                    {has ? 'Change logo' : 'Upload logo'}
                </label>
            </div>
            <input id={inputId} type="file" accept="image/*" className="hidden" aria-label="Logo image"
                onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
    );
};

const OrgSettings = () => {
    const { admin } = useAuth();
    const viewing = admin?.role === 'superadmin' ? getViewedOrganization() : null;
    const [organization, setOrganization] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saved, setSaved] = useState(EMPTY);   // the server's last confirmed copy
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [copied, setCopied] = useState(false);

    // Also the Retry on the load-failed screen, so it re-runs the same request.
    const load = () => {
        setLoading(true);
        setError('');
        return api.get('/organizations/me')
            .then((res) => {
                setOrganization(res.data.organization);
                setForm(pick(res.data.organization));
                setSaved(pick(res.data.organization));
            })
            .catch((err) => setError(err.response?.data?.message || 'Could not load your organization.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const changed = FIELDS.filter((f) => String(form[f] ?? '') !== String(saved[f] ?? ''));
    const nameMissing = !form.name.trim();
    const emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(organization.orgCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* refused over plain HTTP; the code is on screen anyway */ }
    };

    const save = async (e) => {
        e.preventDefault();
        if (nameMissing || emailBad || !changed.length) return;

        setBusy(true); setError(''); setNotice('');
        try {
            // Only what actually changed is sent, so this page can never
            // overwrite a field it does not show.
            const payload = Object.fromEntries(changed.map((f) => [f, form[f]]));
            const res = await api.put('/organizations/me', payload);
            setOrganization(res.data.organization);
            setSaved(pick(res.data.organization));
            setForm(pick(res.data.organization));
            // The email is also this account's sign-in, and the server moved
            // the login with it. Keep the stored session's copy in step so the
            // panel shows the new address (a viewing superadmin's own is untouched).
            if (!viewing && admin && res.data.organization.email && res.data.organization.email !== admin.email) {
                try {
                    localStorage.setItem('adminData', JSON.stringify({ ...admin, email: res.data.organization.email }));
                } catch { /* storage unavailable; the next sign-in shows it */ }
            }
            setEditing(false);
            setNotice(res.data.message);
            setTimeout(() => setNotice(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save your changes.');
        } finally {
            setBusy(false);
        }
    };

    const cancel = () => {
        setForm(saved);
        setEditing(false);
        setError('');
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
                <div className="animate-pulse h-96 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    // The load failed: there is no organization to show, and every card below
    // reads from it. Say so and offer the request again, rather than crash.
    if (!organization) {
        return (
            <div className="w-full space-y-4 lg:space-y-6 animate-fade-in pb-10">
                <Banner>
                    {error || 'Could not load your organization.'} Please try again.
                </Banner>
                <button onClick={load} className={BTN2}><RotateCw size={16} />Retry</button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 lg:space-y-6 animate-fade-in pb-10">

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* ── The logo: shown to students on its courses, and across this panel ── */}
            <LogoCard organization={organization} onSaved={(org) => {
                setOrganization(org);
                window.dispatchEvent(new CustomEvent('organization-logo', { detail: org.logo }));
                setNotice('Your logo was saved.');
                setTimeout(() => setNotice(''), 5000);
            }} onError={setError} />

            {/* ── The parts nobody can change ──────────────────────────────── */}
            <div className={`${CARD} p-5 lg:p-6`}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    <Lock size={14} />Fixed details
                </h2>
                <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                        <p className={LABEL}>Organization ID</p>
                        <button onClick={copyCode} aria-label={`Copy Organization ID ${organization.orgCode}`}
                            className="group inline-flex items-center gap-2 font-mono text-base font-bold text-slate-900 hover:text-indigo-600">
                            {organization.orgCode}
                            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={13} className="text-slate-300 group-hover:text-indigo-500" />}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">Permanent. Your students use it to join.</p>
                    </div>
                    <div>
                        <p className={LABEL}>Organization type</p>
                        <p className="font-semibold text-slate-800">{organization.typeLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">Contact the platform to change this.</p>
                    </div>
                    <div>
                        <p className={LABEL}>Approved</p>
                        <p className="font-semibold text-slate-800">{formatDate(organization.approvedAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">Registered {formatDate(organization.createdAt)}</p>
                    </div>
                </div>
            </div>

            {/* ── The parts they can ───────────────────────────────────────── */}
            <form onSubmit={save} className={`${CARD} p-5 lg:p-6`} noValidate>
                {/* Side by side when there is room; the hint drops under the heading on a phone. */}
                {/* The edit button sits on the card it opens, like Change password below. */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Your details</h2>
                    {!editing && (
                        <button type="button" onClick={() => setEditing(true)} className={`${BTN2} whitespace-nowrap`}>
                            <Pencil size={16} />Edit details
                        </button>
                    )}
                </div>

                <div className="space-y-5">
                    <Field label="Organization name" id="set-name" error={editing && nameMissing ? 'This cannot be empty.' : ''}>
                        <input id="set-name" value={form.name} onChange={set('name')} disabled={!editing} className={INPUT} />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Contact person" id="set-contact">
                            <input id="set-contact" value={form.contactPerson} onChange={set('contactPerson')} disabled={!editing} className={INPUT} />
                        </Field>
                        <Field label="Email" id="set-email"
                            hint="This is also your sign-in."
                            error={editing && emailBad ? 'Enter a valid email address.' : ''}>
                            <input id="set-email" type="email" value={form.email} onChange={set('email')} disabled={!editing} className={INPUT} />
                        </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Phone" id="set-phone">
                            <input id="set-phone" value={form.phone} onChange={set('phone')} disabled={!editing} className={INPUT} />
                        </Field>
                        <Field label="Website" id="set-website">
                            <input id="set-website" value={form.website} onChange={set('website')} disabled={!editing} placeholder="example.edu" className={INPUT} />
                        </Field>
                    </div>

                    <Field label="Address" id="set-address">
                        <textarea id="set-address" rows={2} value={form.address} onChange={set('address')} disabled={!editing} className={INPUT} />
                    </Field>

                </div>

                {editing && (
                    <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                        {changed.length > 0 && (
                            <span className="mr-auto text-xs font-semibold text-amber-600">
                                {changed.length} unsaved change{changed.length === 1 ? '' : 's'}
                            </span>
                        )}
                        <button type="button" onClick={cancel} className={BTN2} disabled={busy}>Cancel</button>
                        <button type="submit" className={BTN} disabled={busy || !changed.length || nameMissing || emailBad}>
                            {busy && <Loader2 size={16} className="animate-spin" />}
                            Save changes
                        </button>
                    </div>
                )}
            </form>

            {/* A superadmin managing this organization signs in with their own
                account, so the organization's password is not theirs to change
                (the server refuses it too). */}
            {!viewing && <ChangePassword />}
        </div>
    );
};

/**
 * Changing the password this organization signs in with.
 *
 * Its own card rather than a field in the details form above: a password is not
 * saved alongside a phone number, and mixing the two would mean the details form
 * had to handle "some fields saved, the password did not".
 *
 * The current password is asked for as well, because a session is not proof that
 * the person at the keyboard is the administrator — an unattended screen should
 * not be enough to lock an organization out of its own account.
 */
const ChangePassword = () => {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwFocused, setPwFocused] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    // Locked like the details above it: the fields open only on "Change password".
    const [open, setOpen] = useState(false);
    const close = () => { setOpen(false); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setError(''); };

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        setError('');
    };

    const ready = form.currentPassword && form.newPassword && form.confirmPassword;
    const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;

    const submit = async (e) => {
        e.preventDefault();
        if (!ready || mismatch) return;

        setBusy(true); setError(''); setNotice('');
        try {
            const res = await api.put('/organizations/me/password', form);
            // A password change signs out every other session: the old token is
            // refused from now on (401 PASSWORD_CHANGED), so the new one the
            // server hands back replaces it here — this session stays signed in.
            // Not for a superadmin managing this organization: their own token
            // is not the organization's.
            if (res.data?.token && !getViewedOrganization()) {
                try { localStorage.setItem('adminToken', res.data.token); } catch { /* storage unavailable */ }
            }
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setOpen(false);
            setNotice(res.data.message);
            setTimeout(() => setNotice(''), 6000);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not change your password.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className={`${CARD} p-5 lg:p-6`} noValidate>
            <div className={`flex flex-wrap items-start justify-between gap-3 ${open || notice ? 'mb-5' : ''}`}>
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <KeyRound size={20} />
                    </span>
                    <div>
                        <h2 className="font-bold text-slate-800">Change your password</h2>
                        <p className="text-sm text-slate-500">
                            The password you sign in with, alongside your organization's email.
                        </p>
                    </div>
                </div>
                {!open && <button type="button" onClick={() => { setOpen(true); setNotice(''); }} className={BTN2}><KeyRound size={16} />Change password</button>}
            </div>

            {notice && <div className="mb-4"><Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner></div>}
            {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}

            {open && <>
            <div className="space-y-5">
                <div className="max-w-sm">
                    <label className={LABEL} htmlFor="pw-current">Current password</label>
                    <PasswordField id="pw-current" autoComplete="current-password"
                        value={form.currentPassword} onChange={set('currentPassword')} className={INPUT} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className={LABEL} htmlFor="pw-new">New password</label>
                        <PasswordField id="pw-new" autoComplete="new-password"
                            value={form.newPassword} onChange={set('newPassword')}
                            onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                            className={INPUT} />
                        <PasswordStrengthChecker password={form.newPassword} focused={pwFocused} />
                    </div>
                    <div>
                        <label className={LABEL} htmlFor="pw-confirm">Confirm new password</label>
                        <PasswordField id="pw-confirm" autoComplete="new-password"
                            value={form.confirmPassword} onChange={set('confirmPassword')} className={INPUT} />
                        {mismatch && <p className="mt-1 text-xs text-red-500">The two new passwords do not match.</p>}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
                <button type="button" onClick={close} className={BTN2} disabled={busy}>Cancel</button>
                <button type="submit" className={BTN} disabled={busy || !ready || mismatch}>
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    Save new password
                </button>
            </div>
            </>}
        </form>
    );
};

export default OrgSettings;
