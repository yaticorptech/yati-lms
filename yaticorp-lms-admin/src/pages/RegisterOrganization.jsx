/**
 * Public organization registration — the form a school, college or company
 * fills in to ask for access.
 *
 * Deliberately outside the auth guard and outside AdminLayout: nobody filling
 * this in has an account yet. It lives in the admin app rather than the student
 * one because what it creates is an administrator account, and it is reached
 * from the admin sign-in page.
 *
 * Submitting grants nothing. It creates a pending application and an account
 * that can sign in only to watch its own status until a platform superadmin
 * approves it, which is what the closing message says.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import PasswordField from '../components/PasswordField';
import Select from '../components/Select';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
const INPUT_BAD = 'w-full rounded-xl border border-red-400 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

const EMPTY = {
    name: '', organizationType: '', contactPerson: '', email: '', phone: '',
    address: '', website: '', expectedStudents: '', password: '', confirmPassword: ''
};

/**
 * Checked here as well as on the server, so someone gets told about a typo
 * before they wait on a request. The server's copy is the one that decides.
 */
const check = (form) => {
    const problems = {};
    if (!form.name.trim() || form.name.trim().length < 2) problems.name = 'Enter your organization name.';
    if (!form.organizationType) problems.organizationType = 'Choose the kind of organization.';
    if (!form.contactPerson.trim()) problems.contactPerson = 'Who should we contact?';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) problems.email = 'Enter a valid email address.';
    if (!/^[\d\s+()-]{8,20}$/.test(form.phone.trim())) problems.phone = 'Enter a valid phone number.';
    if (form.expectedStudents && Number(form.expectedStudents) < 0) problems.expectedStudents = 'That cannot be negative.';
    if (form.password.length < 8) problems.password = 'At least 8 characters, with upper and lower case, a number and a symbol.';
    if (form.password !== form.confirmPassword) problems.confirmPassword = 'The two passwords do not match.';
    return problems;
};

const Field = ({ label, id, error, required, hint, children }) => (
    <div>
        <label className={LABEL} htmlFor={id}>
            {label}{required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {children}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {!error && hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
);

const RegisterOrganization = () => {
    const [form, setForm] = useState(EMPTY);
    const [types, setTypes] = useState([]);
    const [problems, setProblems] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);   // { orgCode, name }
    const [pwFocused, setPwFocused] = useState(false);

    useEffect(() => {
        api.get('/organizations/types')
            .then((res) => setTypes(res.data.types || []))
            .catch(() => setError('Could not reach the server. Please try again in a moment.'));
    }, []);

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        // Clear a field's complaint as soon as it is being corrected.
        setProblems((p) => (p[field] ? { ...p, [field]: undefined } : p));
    };

    const submit = async (e) => {
        e.preventDefault();
        const found = check(form);
        setProblems(found);
        if (Object.values(found).some(Boolean)) return;

        setBusy(true); setError('');
        try {
            const res = await api.post('/organizations/register', form);
            setDone(res.data.organization);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 size={28} className="text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Registration submitted</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        Your organization registration has been submitted. Our administrator will review your request.
                    </p>
                    <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Your organization ID</p>
                        <p className="mt-1 font-mono text-lg font-bold text-slate-900">{done.orgCode}</p>
                        <p className="mt-2 text-xs text-slate-500">
                            Keep this. Once you are approved, your students use it to ask to join {done.name}.
                        </p>
                    </div>
                    <p className="mt-5 text-sm text-slate-500">
                        You can sign in now with the email and password you chose to see where your application stands.
                    </p>
                    <Link to="/login" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700">
                        Go to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
            <div className="mx-auto w-full max-w-2xl">
                <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600">
                    <ArrowLeft size={16} />Back to sign in
                </Link>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 p-6 sm:p-8">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                                <Building2 size={22} />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Register your organization</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Tell us about your school, college or company. We review every request, and you will
                                    hear from us once a decision has been made.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-5 p-6 sm:p-8" noValidate>
                        <Field label="Organization name" id="reg-name" error={problems.name} required>
                            <input id="reg-name" value={form.name} onChange={set('name')} autoComplete="organization"
                                className={problems.name ? INPUT_BAD : INPUT} />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Organization type" id="reg-type" error={problems.organizationType} required>
                                <Select id="reg-type" value={form.organizationType} onChange={set('organizationType')}
                                    className={problems.organizationType ? INPUT_BAD : INPUT}>
                                    <option value="">Choose one…</option>
                                    {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </Select>
                            </Field>
                            <Field label="Contact person" id="reg-contact" error={problems.contactPerson} required>
                                <input id="reg-contact" value={form.contactPerson} onChange={set('contactPerson')} autoComplete="name"
                                    className={problems.contactPerson ? INPUT_BAD : INPUT} />
                            </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Official email" id="reg-email" error={problems.email} required
                                hint="This becomes the sign-in for your organization.">
                                <input id="reg-email" type="email" value={form.email} onChange={set('email')} autoComplete="email"
                                    className={problems.email ? INPUT_BAD : INPUT} />
                            </Field>
                            <Field label="Phone number" id="reg-phone" error={problems.phone} required>
                                <input id="reg-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"
                                    className={problems.phone ? INPUT_BAD : INPUT} />
                            </Field>
                        </div>

                        <Field label="Address" id="reg-address">
                            <input id="reg-address" value={form.address} onChange={set('address')} autoComplete="street-address" className={INPUT} />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Website" id="reg-website">
                                <input id="reg-website" value={form.website} onChange={set('website')} placeholder="example.edu" className={INPUT} />
                            </Field>
                            <Field label="Expected number of students" id="reg-expected" error={problems.expectedStudents}
                                hint="A rough figure is fine.">
                                <input id="reg-expected" type="number" min="0" value={form.expectedStudents} onChange={set('expectedStudents')}
                                    className={problems.expectedStudents ? INPUT_BAD : INPUT} />
                            </Field>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Password" id="reg-password" error={problems.password} required>
                                <PasswordField id="reg-password" value={form.password} onChange={set('password')}
                                    autoComplete="new-password"
                                    onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                                    className={problems.password ? INPUT_BAD : INPUT} />
                                <PasswordStrengthChecker password={form.password} focused={pwFocused} />
                            </Field>
                            <Field label="Confirm password" id="reg-confirm" error={problems.confirmPassword} required>
                                <PasswordField id="reg-confirm" value={form.confirmPassword} onChange={set('confirmPassword')}
                                    autoComplete="new-password"
                                    className={problems.confirmPassword ? INPUT_BAD : INPUT} />
                            </Field>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" disabled={busy}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50">
                            {busy ? <><Loader2 size={16} className="animate-spin" />Submitting…</> : 'Submit registration'}
                        </button>

                        <p className="text-center text-xs text-slate-500">
                            Already registered? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterOrganization;
