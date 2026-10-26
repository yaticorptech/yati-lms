/**
 * Add one teacher with their card — the same two steps as adding a student:
 * check the card first (its QR code, scanned or typed, or the 12-digit card
 * number), then the teacher's details. The server checks the card again and
 * claims it; a mistake comes back as a 400 naming the field, and shows under it.
 *
 * `endpoint` is where the form goes: /admin/teachers for the platform, or
 * /organizations/me/teachers, which makes the teacher the organization's
 * member at once. `organizations` (a super admin only) offers the choice of one.
 *
 * An organization first chooses what the teacher can open (`access`):
 *   Organisation dashboard only  name, email and password — a limited sign-in to its panel
 *   Teacher dashboard only       the card, then the details, as before
 *   Both                         the card and details; the same email and password
 *                                sign in to the panel, where Research opens their teacher dashboard
 */
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

import { Camera, Keyboard, Lock, Loader2, UserPlus, X, Building2, GraduationCap } from 'lucide-react';
import api from '../../utils/api';
import { stopReader } from '../../utils/qrReader';
import { Dialog, DialogTitle, Banner, BTN, BTN2, INPUT, LABEL } from '../orgUi';
import PasswordStrengthChecker from '../PasswordStrengthChecker';
import Select from '../Select';
import { Field } from './TeacherBits';
import { refusal, assignable } from './teacherUtils';

const SCANNER_ID = 'qr-reader-add-teacher';
const EMPTY = { name: '', email: '', phone: '', password: '', institution: '', department: '', designation: '', organizationId: '' };

export default function AddTeacherModal({ endpoint, organizations, onClose, onAdded }) {
    const [mode, setMode] = useState('manual');
    const [code, setCode] = useState('');
    const [card, setCard] = useState(null);           // { CardNumber, CVV, qrCodeNumber } once checked
    const [checking, setChecking] = useState(false);
    const [scanError, setScanError] = useState('');
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const scanner = useRef(null);
    const choices = organizations ? assignable(organizations) : null;
    // Only an organization chooses access; the platform adds teacher-dashboard teachers as before.
    const choosing = endpoint === '/organizations/me/teachers';
    const [access, setAccess] = useState(() => (choosing ? { organization: false, teacher: false } : { organization: false, teacher: true }));
    const orgOnly = access.organization && !access.teacher;
    const chosen = access.organization || access.teacher;
    const toggle = (k) => { setAccess((a) => ({ ...a, [k]: !a[k] })); setError(''); };

    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: '' })); };

    // The camera runs only while "Scan" is chosen and no card is checked yet.
    useEffect(() => {
        // …and only while the card step is on screen (not for an organisation-dashboard-only teacher).
        if (mode !== 'camera' || card || orgOnly || !chosen) return undefined;
        let stopped = false;
        const reader = new Html5Qrcode(SCANNER_ID);
        scanner.current = reader;
        const started = reader.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (decoded) => {
            if (stopped) return;
            stopped = true;
            stopReader(reader);
            setCode(decoded.trim());
            setMode('manual');
        }, () => {}).catch(() => { setScanError('The camera could not be opened. Type the QR code or card number instead.'); setMode('manual'); });
        // utils/qrReader: its stop() throws when the camera is not running, so
        // it is stopped safely, once it has finished starting.
        return () => { stopped = true; stopReader(reader, started); scanner.current = null; };
    }, [mode, card, orgOnly, chosen]);

    const check = async () => {
        const raw = code.trim();
        if (!raw) return;
        setChecking(true);
        setError('');
        // Twelve digits is a card number typed by hand; anything else is the QR code.
        const digits = raw.replace(/[\s-]/g, '');
        const body = /^\d{12}$/.test(digits) ? { cardNumber: digits } : { qrCodeNumber: raw };
        try {
            const r = await api.post('/auth/validate-qr', body);
            setCard({ CardNumber: r.data.cardNumber, CVV: r.data.cvv, qrCodeNumber: r.data.qrCodeNumber });
        } catch (err) {
            setError(err.response?.data?.message || 'That card could not be checked.');
        } finally { setChecking(false); }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (busy || !chosen || (!orgOnly && !card)) return;
        setBusy(true);
        setError('');
        setErrors({});
        try {
            const body = orgOnly ? { name: form.name, email: form.email, password: form.password } : { ...form, ...card };
            if (!choices) delete body.organizationId;
            if (choosing) body.access = access;
            const r = await api.post(endpoint, body);
            onAdded(r.data.message || `${form.name} was added.`);
        } catch (err) {
            const { field, message } = refusal(err, 'The teacher could not be added. Please try again.');
            if (field === 'card') { setCard(null); setError(message); }
            else if (field && field in EMPTY) setErrors({ [field]: message });
            else if (field === 'access') setError(message);
            else setError(message);
        } finally { setBusy(false); }
    };

    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800"><UserPlus size={20} className="text-emerald-600" /> Add a teacher</DialogTitle>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                    {/* Step 0, for an organization: what the teacher can open */}
                    {choosing && (
                        <div className="space-y-2">
                            <p className={LABEL}>What can this teacher open?</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {[
                                    ['organization', Building2, 'Organisation dashboard', 'Sign in to this panel with email and password. Limited: no settings, teachers or removing students.'],
                                    ['teacher', GraduationCap, 'Teacher dashboard', 'Their own research and writing tools, signed in with their YATICORP card.']
                                ].map(([k, Icon, title, hint]) => (
                                    <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${access[k] ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input type="checkbox" checked={access[k]} onChange={() => toggle(k)} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Icon size={15} className="text-indigo-600" /> {title}</span>
                                            <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {access.organization && access.teacher && <p className="text-xs text-slate-500">Both: one email and password for this panel, where <strong>Research</strong> opens their teacher dashboard.</p>}
                        </div>
                    )}

                    {/* Organisation dashboard only: just the sign-in */}
                    {orgOnly && (
                        <div className="space-y-3">
                            <p className={LABEL}>Their sign-in to this panel</p>
                            <Field id="s-name" label="Full name *" value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" placeholder="Dr. Asha Rao" />
                            <Field id="s-email" label="Email *" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" placeholder="name@college.edu" />
                            <Field id="s-password" label="Password *" error={errors.password}>
                                <input id="s-password" type="text" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="Set a first password" className={INPUT} />
                                <PasswordStrengthChecker password={form.password} focused={!!form.password} />
                            </Field>
                            <p className="text-xs text-slate-500">They sign in on the organization sign-in page with this email and password.</p>
                        </div>
                    )}
                    {orgOnly && error && <Banner>{error}</Banner>}

                    {/* Step 1: the card */}
                    {chosen && !orgOnly && <div className="space-y-3">
                        <p className={LABEL}>1 · The teacher’s card</p>
                        {card ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                <span className="flex min-w-0 items-center gap-2 text-sm text-emerald-800">
                                    <Lock size={14} className="shrink-0" aria-hidden />
                                    <span className="min-w-0 break-all">Card <strong className="font-mono">{card.CardNumber}</strong> is free to use</span>
                                </span>
                                <button type="button" onClick={() => { setCard(null); setCode(''); }} className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Change</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="How to enter the card">
                                    <button type="button" aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Keyboard size={13} /> Type</button>
                                    <button type="button" aria-pressed={mode === 'camera'} onClick={() => { setScanError(''); setMode('camera'); }}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${mode === 'camera' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Camera size={13} /> Scan with camera</button>
                                </div>
                                {mode === 'camera' ? (
                                    <div>
                                        <div id={SCANNER_ID} className="w-full overflow-hidden rounded-xl border border-slate-200" />
                                        <p className="mt-1 text-center text-xs text-slate-400">Hold the QR code on the card up to the camera.</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input id="teacher-card" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }}
                                            placeholder="QR code or 12-digit card number" aria-label="QR code or card number" autoComplete="off"
                                            className={`${INPUT} min-w-0 flex-1 font-mono`} />
                                        <button type="button" onClick={check} disabled={checking || !code.trim()} className={`${BTN} shrink-0`}>
                                            {checking && <Loader2 size={15} className="animate-spin" />} Check card
                                        </button>
                                    </div>
                                )}
                                {scanError && <p className="text-xs text-red-600">{scanError}</p>}
                            </>
                        )}
                    </div>}

                    {!orgOnly && error && <Banner>{error}</Banner>}

                    {/* Step 2: the teacher */}
                    {card && !orgOnly && chosen && (
                        <div className="space-y-3">
                            <p className={LABEL}>2 · The teacher</p>
                            <Field id="t-name" label="Full name *" value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" placeholder="Dr. Asha Rao" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field id="t-email" label="Email *" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" placeholder="name@college.edu" hint="Any email address — sign-in details go here." />
                                <Field id="t-phone" label="Phone *" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="off" placeholder="98450 12345" />
                            </div>
                            <Field id="t-password" label="Password *" error={errors.password}>
                                <input id="t-password" type="text" value={form.password} onChange={set('password')} autoComplete="new-password"
                                    aria-invalid={errors.password ? 'true' : undefined} placeholder="Set a first password" className={INPUT} />
                                <PasswordStrengthChecker password={form.password} focused={!!form.password} />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field id="t-institution" label="Institution" value={form.institution} onChange={set('institution')} error={errors.institution} placeholder={choices ? '' : 'Your organization, if left empty'} />
                                <Field id="t-department" label="Department" value={form.department} onChange={set('department')} error={errors.department} />
                            </div>
                            <Field id="t-designation" label="Designation" value={form.designation} onChange={set('designation')} error={errors.designation} placeholder="Assistant Professor" />
                            {choices && (
                                <Field id="t-org" label="Organization" error={errors.organizationId} hint="Optional. The teacher becomes its member at once.">
                                    <Select id="t-org" value={form.organizationId} onChange={set('organizationId')} aria-label="Organization" className={INPUT}>
                                        <option value="">No organization</option>
                                        {choices.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                                    </Select>
                                </Field>
                            )}
                            <p className="text-xs text-slate-500">The teacher is emailed their card number and this password, and signs in by choosing <strong>Teacher</strong> on the sign-in page.{access.organization ? ' The same email and password sign in to this panel.' : ''}</p>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4">
                    <button type="button" onClick={onClose} className={BTN2} disabled={busy}>Cancel</button>
                    <button type="submit" disabled={busy || !chosen || (!orgOnly && !card)} className={BTN}>
                        {busy && <Loader2 size={15} className="animate-spin" />} Add teacher
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
