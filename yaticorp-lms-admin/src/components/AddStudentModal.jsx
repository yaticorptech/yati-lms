/**
 * An organization adds a student. Two ways, one choice at the top:
 *   - Enter card details: one student, in the same two steps as adding a
 *     teacher: the card (its 12-digit number or QR code, typed), then the
 *     student's details. The card must have been verified by YATICORP; the
 *     server checks it again, claims it, and makes the student the
 *     organization's member at once. A mistake comes back as a 400 naming
 *     the field, and shows under it.
 *   - Scan cards: one card or many with the camera (onScanMany opens
 *     ScanCardsModal), added to the organization together; their students
 *     join as they register. The only scanner here, so the page needs no
 *     second Scan button.
 */
import React, { useState } from 'react';
import { Camera, Keyboard, Lock, Loader2, UserPlus, X } from 'lucide-react';
import api from '../utils/api';
import { Dialog, DialogTitle, Banner, BTN, BTN2, INPUT, LABEL } from './orgUi';
import PasswordStrengthChecker from './PasswordStrengthChecker';
import { Field } from './teachers/TeacherBits';
import { refusal } from './teachers/teacherUtils';

const EMPTY = { name: '', email: '', phone: '', password: '' };

export default function AddStudentModal({ onClose, onAdded, onScanMany }) {
    const [code, setCode] = useState('');
    const [card, setCard] = useState(null);           // { CardNumber, CVV, qrCodeNumber } once checked
    const [checking, setChecking] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: '' })); };

    const check = async (raw = code) => {
        const value = String(raw).trim();
        if (!value) return;
        setChecking(true);
        setError('');
        // Twelve digits is a card number typed by hand; anything else is the QR code.
        const digits = value.replace(/[\s-]/g, '');
        const body = /^\d{12}$/.test(digits) ? { cardNumber: digits } : { qrCodeNumber: value };
        try {
            const r = await api.post('/auth/validate-qr', body);
            setCard({ CardNumber: r.data.cardNumber, CVV: r.data.cvv, qrCodeNumber: r.data.qrCodeNumber });
        } catch (err) {
            setError(err.response?.data?.message || 'That card could not be checked.');
        } finally { setChecking(false); }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!card || busy) return;
        setBusy(true);
        setError('');
        setErrors({});
        try {
            const r = await api.post('/organizations/me/students', { ...form, ...card });
            onAdded(r.data.message || `${form.name} was added.`);
        } catch (err) {
            const { field, message } = refusal(err, 'The student could not be added. Please try again.');
            if (field === 'card') { setCard(null); setError(message); }
            else if (field && field in EMPTY) setErrors({ [field]: message });
            else setError(message);
        } finally { setBusy(false); }
    };

    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800"><UserPlus size={20} className="text-indigo-600" /> Add a student</DialogTitle>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                    {/* Step 1: the card */}
                    <div className="space-y-3">
                        <p className={LABEL}>1 · The student’s card</p>
                        {card ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                <span className="flex min-w-0 items-center gap-2 text-sm text-emerald-800">
                                    <Lock size={14} className="shrink-0" aria-hidden />
                                    <span className="min-w-0 break-all">Card <strong className="font-mono">{card.CardNumber}</strong> is verified and free to use</span>
                                </span>
                                <button type="button" onClick={() => { setCard(null); setCode(''); }} className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Change</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="How to add">
                                    <button type="button" aria-pressed="true"
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold text-indigo-600 shadow-sm"><Keyboard size={13} /> Enter card details</button>
                                    <button type="button" aria-pressed="false" onClick={onScanMany}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-slate-500 hover:text-slate-800"><Camera size={13} /> Scan cards</button>
                                </div>
                                <div className="flex gap-2">
                                    <input id="student-card" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }}
                                        placeholder="12-digit card number or QR code" aria-label="Card number or QR code" autoComplete="off"
                                        className={`${INPUT} min-w-0 flex-1 font-mono`} />
                                    <button type="button" onClick={() => check()} disabled={checking || !code.trim()} className={`${BTN} shrink-0`}>
                                        {checking && <Loader2 size={15} className="animate-spin" />} Check card
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">Scanning a pile of cards? Choose <strong>Scan cards</strong>: scan one or many, then add them all.</p>
                            </>
                        )}
                    </div>

                    {error && <Banner>{error}</Banner>}

                    {/* Step 2: the student */}
                    {card && (
                        <div className="space-y-3">
                            <p className={LABEL}>2 · The student</p>
                            <Field id="s-name" label="Full name *" value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" placeholder="Asha Rao" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field id="s-email" label="Email *" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" placeholder="name@example.com" hint="Sign-in details go here." />
                                <Field id="s-phone" label="Phone *" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="off" placeholder="98450 12345" />
                            </div>
                            <Field id="s-password" label="Password *" error={errors.password}>
                                <input id="s-password" type="text" value={form.password} onChange={set('password')} autoComplete="new-password"
                                    aria-invalid={errors.password ? 'true' : undefined} placeholder="Set a first password" className={INPUT} />
                                <PasswordStrengthChecker password={form.password} focused={!!form.password} />
                            </Field>
                            <p className="text-xs text-slate-500">The student joins your organization at once and is emailed their sign-in details.</p>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4">
                    <button type="button" onClick={onClose} className={BTN2} disabled={busy}>Cancel</button>
                    <button type="submit" disabled={!card || busy} className={BTN}>
                        {busy && <Loader2 size={15} className="animate-spin" />} Add student
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
