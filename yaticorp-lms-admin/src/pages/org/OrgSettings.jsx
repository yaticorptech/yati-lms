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
import React, { useState, useEffect } from 'react';
import { Building2, Pencil, Lock, Loader2, Check, Copy, KeyRound } from 'lucide-react';
import api from '../../utils/api';
import { CARD, INPUT, LABEL, BTN, BTN2, Banner, PageHeader } from '../../components/orgUi';
import PasswordField from '../../components/PasswordField';
import PasswordStrengthChecker from '../../components/PasswordStrengthChecker';
import { formatDate } from '../../utils/dates';

/** The fields this page owns. Anything else the server sends is left alone. */
const FIELDS = ['name', 'contactPerson', 'email', 'phone', 'address', 'website', 'logo'];
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

const OrgSettings = () => {
    const [organization, setOrganization] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saved, setSaved] = useState(EMPTY);   // the server's last confirmed copy
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.get('/organizations/me')
            .then((res) => {
                setOrganization(res.data.organization);
                setForm(pick(res.data.organization));
                setSaved(pick(res.data.organization));
            })
            .catch((err) => setError(err.response?.data?.message || 'Could not load your organization.'))
            .finally(() => setLoading(false));
    }, []);

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

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Building2} title="Organization Settings"
                subtitle="Your organization's details, as students and the platform see them.">
                {!editing && (
                    <button onClick={() => setEditing(true)} className={`${BTN} whitespace-nowrap`}>
                        <Pencil size={16} />Edit details
                    </button>
                )}
            </PageHeader>

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* ── The parts nobody can change ──────────────────────────────── */}
            <div className={`${CARD} p-5 lg:p-6`}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    <Lock size={14} />Fixed details
                </h2>
                <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                        <p className={LABEL}>Organization ID</p>
                        <button onClick={copyCode} aria-label={`Copy organization ID ${organization.orgCode}`}
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
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Your details</h2>
                    {!editing && <span className="text-xs text-slate-400">Press “Edit details” to change these.</span>}
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

                    <Field label="Logo URL" id="set-logo" hint="A link to your logo image. Leave blank if you do not have one.">
                        <input id="set-logo" value={form.logo} onChange={set('logo')} disabled={!editing} placeholder="https://…" className={INPUT} />
                    </Field>

                    {form.logo && (
                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                            <img src={form.logo} alt="" className="h-12 w-12 rounded-lg object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <span className="text-xs text-slate-500">Logo preview</span>
                        </div>
                    )}
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

            <ChangePassword />
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
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
            <div className="mb-5 flex items-start gap-3">
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

            {notice && <div className="mb-4"><Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner></div>}
            {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}

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

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <button type="submit" className={BTN} disabled={busy || !ready || mismatch}>
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    Change password
                </button>
            </div>
        </form>
    );
};

export default OrgSettings;
