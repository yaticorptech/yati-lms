/**
 * @author Preethesh Kulal
 * @description Multi-step student registration with QR code scan/manual entry
 */
import Mascot from '../components/Mascot';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import useBackClose from '../native/useBackClose';
import { safeNextPath } from '../utils/sessionExpiry';
import teacherApi, { enterTeacher, hasTeacherSession } from '../teacher/teacherSession';
import { MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, Lock, Keyboard, ScanLine, CameraOff, ArrowRight, ArrowLeft, ChevronRight, UserPlus, User, Mail, Phone, CreditCard, Building2, Landmark, BookOpenCheck, Clock } from 'lucide-react';

// Password strength validator
const getPasswordStrengthError = (pw) => {
    if (!pw || pw.length < 8) return 'Min 8 characters required.';
    if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Must include a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
    return null;
};

// Contact Admin Modal
const ContactAdminModal = ({ onClose, page = 'signup' }) => {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    // Android's back button closes this, rather than leaving the page.
    useBackClose(onClose);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/tickets', { ...form, page });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="contact-admin-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><MessageCircleQuestion size={20} className="text-indigo-600" /></div>
                        <div>
                            <h2 id="contact-admin-title" className="text-lg font-bold text-slate-800">Contact Admin</h2>
                            <a href="tel:9535440195" className="text-sm text-indigo-600 font-semibold hover:underline">📞 9535440195</a>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-emerald-600" /></div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Message Sent!</h3>
                        <p className="text-slate-500 text-sm mb-4">We've received your request and will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1">Name *</label><input id="contact-name" required autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Your name" /></div>
                            <div><label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 mb-1">Email *</label><input id="contact-email" required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="your@email.com" /></div>
                        </div>
                        <div><label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label><input id="contact-subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Brief description of your issue" /></div>
                        <div><label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 mb-1">Message *</label><textarea id="contact-message" required rows="3" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue..." /></div>
                        <div className="flex justify-end space-x-3 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center disabled:opacity-50"><Send size={14} className="mr-1.5" />{loading ? 'Sending...' : 'Send Message'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


// A twinkling star, shared look with the login page. Module-level so the
// page's re-renders do not remount it and restart its animation.
const Sparkle = ({ className, delay = 0, size = 'text-base' }) => (
    <span aria-hidden="true" className={`lg-twinkle pointer-events-none absolute ${size} ${className}`} style={{ animationDelay: `${delay}s` }}>✦</span>
);

const STEPS = [
    ['Verify your card', 'Scan the QR code on your card, or type your card number.'],
    ['Your details', 'Tell us your name, email and phone number.'],
    ['Set a password', 'Choose a strong password to protect your account.'],
];

const inputClass = 'block w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm placeholder-slate-400 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500';
const primaryBtn = 'group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0';
const backBtn = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50';

/**
 * The step of the form that owns a field the server refused, so a failed
 * sign-up goes back there — with everything already typed kept — instead of
 * starting the student over at the card. The server names it (`field`); an
 * older one only said it in words.
 */
const FIELD_STEP = { card: 1, name: 2, email: 2, phone: 2, orgCode: 2, institution: 2, department: 2, password: 3 };
const fieldOf = (data) => data?.field
    || (/password/i.test(data?.message || '') ? 'password'
        : /email/i.test(data?.message || '') ? 'email'
            : /phone/i.test(data?.message || '') ? 'phone'
                : /name/i.test(data?.message || '') ? 'name'
                    : /card|qr/i.test(data?.message || '') ? 'card' : null);

/** The details step's fields, in the order they are on screen. */
const DETAIL_FIELDS = ['name', 'email', 'phone', 'orgCode'];
/** Element ids that do not follow signup-<field>. */
const FIELD_ID = { orgCode: 'signup-org-code', 'confirm-password': 'signup-confirm-password' };

/** A field's message, under it, tied to it for screen readers by aria-describedby. */
const FieldError = ({ id, children }) => (children
    ? <p id={id} className="mt-1.5 text-xs font-semibold text-red-600">{children}</p>
    : null);

/** The same red edge on every field with a problem. */
const invalidRing = (bad) => (bad ? ' border-red-300 focus:ring-red-400' : '');

const Signup = () => {
    const { user, enterApp } = useContext(AuthContext);
    // Where the student was heading before they were sent to sign in, passed
    // on from the sign-in page (?next=). Only a path in this app is taken.
    const [searchParams] = useSearchParams();
    const next = safeNextPath(searchParams.get('next') || '/');
    /* A teacher registering their card (?as=teacher, from the teacher sign-in).
       The same three steps and the same card check; the details ask for an
       institution instead of an Organization ID, take any email address, and
       the account opened is a teacher's (src/teacher on the server). */
    const asTeacher = searchParams.get('as') === 'teacher';
    const loginLink = asTeacher ? '/login?as=teacher' : next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;

    const [step, setStep] = useState(1);
    // The Terms and Privacy Policy, agreed to before the account is made.
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // The card belongs to an account already: the error then offers signing in.
    const [cardUsed, setCardUsed] = useState(false);
    // A teacher registered while the admin approves new teachers: their name, for the waiting screen.
    const [pendingApproval, setPendingApproval] = useState('');
    // The details step's problems, each said under its own field.
    const [fieldErrors, setFieldErrors] = useState({});
    const errorRef = useRef(null);
    const [showContact, setShowContact] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    /**
     * What the server did with the optional Organization ID, or null when the
     * field was left blank.
     *
     * A student who typed an ID has to be told whether it worked — a valid-looking
     * code for an organization that does not exist would otherwise vanish without
     * a word. A student who left it blank sees nothing extra and goes straight to
     * the dashboard, so this costs the common case nothing.
     */

    // Card validation state: the QR code (scanned, or returned for a typed
    // card number — registration needs it) and the card number as typed.
    const [qrCodeNumber, setQrCodeNumber] = useState('');
    const [typedCard, setTypedCard] = useState('');
    const typedDigits = typedCard.replace(/\D/g, '');
    const [_qrValidated, setQrValidated] = useState(false);
    const [qrValidating, setQrValidating] = useState(false);
    // Card details fetched from backend after QR validation (stored internally)
    const [cardDetails, setCardDetails] = useState({ CardNumber: '', CVV: '' });

    /* Reading the card. Same shape as the login page: a scan / type switch,
       a camera that only runs while `scanning` is true, and a fallback to
       typing when the camera is not available. */
    const [mode, setMode] = useState('scan');          // 'scan' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const scannerRef = useRef(null);
    const SCANNER_ID = 'signup-card-scanner';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        // Optional. A student with no school, college or company leaves it blank
        // and nothing about their account is different.
        orgCode: '',
        // A teacher's, both optional.
        institution: '',
        department: ''
    });

    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        // stop() and clear() throw synchronously when the camera is not
        // running (start still pending, or already stopped) — guard both.
        if (!inst) return;
        try {
            Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {});
        } catch { /* was not running */ }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        // The scanner library is fetched when the camera is first asked for,
        // not with the page.
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(SCANNER_ID);
            scannerRef.current = inst;
            return inst.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    if (cancelled) return;
                    // As read: the server makes sense of it the same way as the
                    // sign-in scan (a bare code, a URL ending in one, or the
                    // card number). Stripping it here to letters and digits
                    // broke codes that carry punctuation, and URLs.
                    setQrCodeNumber(decodedText.trim());
                    setScanError('');
                    setScanning(false);
                },
                () => {}   // a frame without a code is not an error
            );
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
            setMode('manual');
        });
        return () => { cancelled = true; stopScanner(); };
    }, [scanning]);

    // Stop the camera when moving away from step 1, and on unmount.
    useEffect(() => { if (step !== 1) setScanning(false); }, [step]);
    useEffect(() => () => stopScanner(), []);

    // A new error is brought into view (role="alert" also reads it out).
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [error]);

    // Moves to a field once the step it is on has rendered.
    const focusField = (name) => setTimeout(() => document.getElementById(FIELD_ID[name] || `signup-${name}`)?.focus(), 60);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // What was wrong with this field is being fixed: stop saying it.
        if (fieldErrors[e.target.name]) setFieldErrors((f) => ({ ...f, [e.target.name]: undefined }));
    };

    // Step 1: validate the card — the scanned QR code, or the typed card number
    const handleValidateQR = async (e) => {
        e.preventDefault();
        setError(null);

        const byNumber = mode === 'manual';
        if (byNumber ? typedDigits.length !== 12 : !qrCodeNumber.trim()) {
            return setError(byNumber ? 'Please enter the 12-digit card number printed on your card.' : 'Please scan the QR code on your card.');
        }

        setQrValidating(true);
        setCardUsed(false);
        try {
            const res = await api.post('/auth/validate-qr', byNumber ? { cardNumber: typedDigits } : { qrCodeNumber: qrCodeNumber.trim() });
            // Store card details internally — never shown as editable inputs
            setCardDetails({ CardNumber: res.data.cardNumber, CVV: res.data.cvv });
            if (res.data.qrCodeNumber) setQrCodeNumber(String(res.data.qrCodeNumber));
            setQrValidated(true);
            setStep(2);
            focusField('name');
        } catch (err) {
            if (err.response?.data?.code === 'CARD_USED') {
                setCardUsed(true);
                setError('This card already has an account — sign in instead.');
            } else {
                setError(err.response?.data?.message
                    || (!err.response ? 'Check your connection and try again.'
                        : byNumber ? 'That card number was not accepted. Please try again.' : 'Invalid QR Code. Please try again.'));
            }
        } finally {
            setQrValidating(false);
        }
    };

    // Every detail is required: nothing moves on, and no account is created,
    // until the name, a Gmail address and a phone number are all filled in.
    const phoneOk = (formData.phoneCode || '+91') === '+91' ? formData.phone.length === 10 : formData.phone.length >= 8 && formData.phone.length <= 12;
    const passwordsFilled = formData.password.length > 0 && formData.confirmPassword.length > 0;

    /**
     * What is wrong on the details step, field by field. Continue used to stay
     * switched off until all was well, with only a tooltip to say why — so
     * these messages never showed, and on a phone there was no tooltip at
     * all. Now Continue always answers, with each problem under its field.
     */
    const detailsProblems = () => {
        const problems = {};
        if (formData.name.trim().length < 2) problems.name = 'Please enter your full name.';
        if (!formData.email.trim()) problems.email = 'Please enter your email address.';
        // Teachers often use their institution's address, so any valid one does.
        else if (asTeacher ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) : !/^[^\s@]+@gmail\.com$/i.test(formData.email.trim())) problems.email = asTeacher ? 'Enter a valid email address.' : 'Only @gmail.com email addresses are allowed.';
        if (!formData.phone) problems.phone = 'Please enter your phone number.';
        else if (!phoneOk) problems.phone = (formData.phoneCode || '+91') === '+91' ? 'Please enter a 10-digit phone number.' : 'Please enter a valid phone number.';

        // The Organization ID is optional, so an empty box is fine. A filled one
        // has to look like an ID: the shape is worth checking now, while the
        // field is still on screen to correct.
        // Either an ID the organization chose (st_agnes_college) or an older,
        // generated one (ABC-2026-0001). Whether it exists is the server's call.
        // An old ID copied out of a document often has its hyphens turned into
        // en or em dashes; the server reads those as hyphens, so this does too.
        const typedOrgCode = asTeacher ? '' : formData.orgCode.trim().replace(/^@+/, '');
        const chosen = /^[a-z0-9._]{3,30}$/i.test(typedOrgCode) && /[a-z]/i.test(typedOrgCode);
        const older = /^[A-Za-z]+-\d{4}-\d{3,}$/.test(typedOrgCode.replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ''));
        if (typedOrgCode && !chosen && !older) {
            problems.orgCode = 'That Organization ID does not look right. Ask your organization for it (like xxx_college), or leave it blank.';
        }
        return problems;
    };

    const handlePersonalDetailsNext = (e) => {
        e.preventDefault();
        setError(null);
        const problems = detailsProblems();
        setFieldErrors(problems);
        const first = DETAIL_FIELDS.find((f) => problems[f]);
        if (first) { focusField(first); return; }
        setStep(3);
        focusField('password');
    };

    const handleRegistrationSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!agreed) return setError('Please agree to the Terms and Conditions and Privacy Policy to continue.');

        if (formData.password !== formData.confirmPassword) {
            focusField('confirm-password');
            return setError('Passwords do not match.');
        }

        const pwError = getPasswordStrengthError(formData.password);
        if (pwError) { focusField('password'); return setError(pwError); }

        setLoading(true);
        try {
            if (asTeacher) {
                const res = await teacherApi.post('/auth/register', {
                    name: formData.name,
                    email: formData.email,
                    phone: `${formData.phoneCode || '+91'} ${formData.phone}`,
                    CardNumber: cardDetails.CardNumber,
                    CVV: cardDetails.CVV,
                    qrCodeNumber: qrCodeNumber.trim(),
                    password: formData.password,
                    institution: formData.institution.trim(),
                    department: formData.department.trim()
                });
                // 202: registered, but waiting for the admin's approval — no session yet.
                if (res.data?.pending) { setPendingApproval(res.data.name || formData.name); setLoading(false); return; }
                enterTeacher(res.data);
                return;
            }
            const res = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                CardNumber: cardDetails.CardNumber,
                CVV: cardDetails.CVV,
                qrCodeNumber: qrCodeNumber.trim(),
                password: formData.password,
                // Optional; the server looks it up and, if it is an active
                // organization, records a join request for them to approve.
                orgCode: formData.orgCode.trim()
            });

            // Straight to the dashboard (or wherever they were heading), the
            // same way as signing in. What the Organization ID led to is shown
            // there, once. `reason` says why it was not requested — 'invalid'
            // or 'not_found' (the ID typed was wrong), 'error' (ours) — so the
            // dashboard only suggests another ID when the ID was the problem.
            if (res.data.organization) {
                const org = res.data.organization;
                const reason = org.reason || (org.requested ? 'requested' : 'unknown');
                try { sessionStorage.setItem('yati.signupOrg', JSON.stringify({ ...org, reason })); } catch { /* storage off */ }
            }
            // The page is on its way: the button keeps saying so until it gets there.
            enterApp(res.data, next);
        } catch (err) {
            setLoading(false);
            // No answer at all: nothing was decided, so nothing moves.
            if (!err.response) {
                setError('Check your connection and try again.');
                return;
            }
            const data = err.response.data || {};
            const field = fieldOf(data);
            if (data.code === 'CARD_USED') {
                // Someone signed up with this card meanwhile (or it was already
                // theirs): it cannot be used again, so step one, with the way in.
                setCardUsed(true);
                setError('This card already has an account — sign in instead.');
                setStep(1);
                setQrValidated(false);
                setCardDetails({ CardNumber: '', CVV: '' });
            } else if (field === 'card') {
                setError(data.message || 'Please verify your card again.');
                setStep(1);
                setQrValidated(false);
                setCardDetails({ CardNumber: '', CVV: '' });
            } else if (FIELD_STEP[field] === 2) {
                // Back to the details, everything kept, the problem under its field.
                setFieldErrors({ [field]: data.message || 'Please check this.' });
                setStep(2);
                focusField(field);
            } else {
                // The password, or something the form cannot point at: stay here.
                setError(data.message || 'Registration failed. Please try again.');
                if (field === 'password') focusField('password');
            }
        }
    };

    // Signed in already (a second tab, the back button): nothing to sign up for.
    if (user) return <Navigate to={next} replace />;
    if (hasTeacherSession()) return <Navigate to="/teacher" replace />;
    if (pendingApproval) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
                <div role="status" className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl shadow-emerald-100">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100"><Clock size={26} aria-hidden="true" /></span>
                    <h1 className="mt-4 text-xl font-black text-slate-900">Your account is waiting for approval</h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Thank you, {pendingApproval}. Your teacher card is registered. The administrator approves new teacher accounts before they can be used — you will get an email when yours is approved.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Then choose <strong>Teacher</strong> on the sign-in page and sign in with your card number and password.</p>
                    <Link to="/login?as=teacher" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Back to sign in</Link>
                </div>
            </div>
        );
    }

    const [stepTitle, stepHint] = STEPS[step - 1];

    // The error box every step shows; a used card adds the way to sign in.
    const errorBox = error && (
        <div ref={errorRef} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
            {error}
            {cardUsed && (
                <> <Link to={loginLink} className="font-bold text-indigo-600 underline">Sign in</Link></>
            )}
        </div>
    );

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-3 sm:p-6">
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="signup" />}

            <div className="lg-rise grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-indigo-200/70 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">

                {/* ── Left: the welcome panel ──────────────────────────── */}
                {/* Below lg the form comes first and this panel follows it, as on
                    the sign-in page: on a phone it is about a screen tall. */}
                <aside className="relative order-2 overflow-hidden bg-gradient-to-b from-indigo-600 via-violet-600 to-violet-200 p-7 text-white sm:p-9 lg:order-1 lg:min-h-[640px]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="lg-blob absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute right-10 top-24 h-12 w-12 rounded-full bg-white/15" />
                        <div className="absolute right-24 top-64 h-7 w-7 rounded-full bg-white/15" />
                        <div className="absolute left-8 top-1/2 h-4 w-4 rounded-full bg-white/20" />
                        <Sparkle className="left-[46%] top-[9%] text-white" delay={0.3} size="text-xs" />
                        <Sparkle className="left-[70%] top-[22%] text-white" delay={1.4} size="text-sm" />
                        <Sparkle className="left-[16%] top-[40%] text-white" delay={0.9} size="text-xs" />
                        <Sparkle className="left-[58%] top-[45%] text-white" delay={2.1} size="text-base" />
                        <Sparkle className="left-[30%] top-[52%] text-white" delay={1.8} size="text-xs" />
                        <Sparkle className="left-[80%] top-[58%] text-white" delay={0.6} size="text-sm" />
                        {/* The pale foreground wave the illustration stands on. */}
                        <div className="absolute -bottom-24 -left-10 h-56 w-[140%] rounded-[50%] bg-white/70 blur-md" />
                    </div>

                    <div className="relative mt-4 max-w-xs sm:mt-6">
                        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-[2.6rem]">
                            Welcome<br />to <span className="text-cyan-300">LearnHub</span>
                        </h1>
                        <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-indigo-100">
                            Your smart learning journey starts here. Let&apos;s achieve great things together!
                        </p>
                    </div>

                    {/* The mascot with the floating tiles. */}
                    <div aria-hidden="true" className="relative mt-8 h-72 sm:h-80 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:h-[52%]">
                        <span className="lg-float absolute right-8 top-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-lg ring-1 ring-white/40 backdrop-blur">🏆</span>
                        <span className="lg-float absolute left-4 top-16 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-lg ring-1 ring-white/40 backdrop-blur" style={{ animationDelay: '-2.4s' }}>📈</span>
                        <span className="mascot-tag absolute right-4 top-[38%] z-10 whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm font-black leading-tight text-indigo-700 shadow-lg">
                            Hi! Let&apos;s learn<br />together 👋
                        </span>
                        {/* A box capped by both height and width, so the character is
                            never wider than the panel and never cut off. */}
                        <div className="mascot-enter absolute bottom-0 left-1/2 aspect-[16/17] h-[92%] max-w-[70%] -translate-x-1/2">
                            <div className="lg-float h-full w-full" style={{ animationDelay: '-1.2s' }}>
                                <Mascot className="h-full w-full object-contain drop-shadow-2xl" />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Right: the sign-up card ──────────────────────────── */}
                <section className="relative order-1 bg-white px-5 py-8 sm:px-10 sm:py-10 lg:order-2">
                    <div className="mx-auto max-w-md">
                        {(
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            {/* The compact header a phone gets, with the welcome panel below the form. */}
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-indigo-500 lg:hidden">Welcome to LearnHub</p>
                            <span className="lg-float flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-indigo-100">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-300">{asTeacher ? <BookOpenCheck size={18} /> : <UserPlus size={18} />}</span>
                            </span>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{asTeacher ? 'Register your teacher card' : 'Create your account'}</h2>
                            <p className="mt-1.5 text-sm text-slate-500">{stepHint}</p>

                            {/* Stepper: which of the three steps we are on. */}
                            <div className="mt-4 flex items-center gap-2" aria-label={`Step ${step} of 3: ${stepTitle}`}>
                                {[1, 2, 3].map(s => (
                                    <span key={s} className={`h-2.5 rounded-full transition-all duration-300 ${step === s ? 'w-7 bg-indigo-600' : step > s ? 'w-2.5 bg-emerald-500' : 'w-2.5 bg-slate-200'}`} />
                                ))}
                                <span className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">Step {step} of 3</span>
                            </div>
                        </div>
                        )}

                        {/* Step 1: card QR */}
                        {step === 1 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handleValidateQR} style={{ animationDelay: '0.2s' }}>
                                {errorBox}

                                {/* Scan / type, as one bordered switch */}
                                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                                    {[['scan', 'Scan Card', ScanLine], ['manual', 'Type Instead', Keyboard]].map(([id, label, Icon]) => (
                                        <button key={id} type="button"
                                            onClick={() => { setScanError(''); setScanning(false); setMode(id); }}
                                            className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${mode === id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                                            <Icon size={16} /> {label}
                                        </button>
                                    ))}
                                </div>

                                {mode === 'scan' && qrCodeNumber ? (
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                        <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-emerald-700">Card read</p>
                                            <p className="break-all font-mono text-lg tracking-widest text-slate-800">{qrCodeNumber}</p>
                                        </div>
                                        <button type="button" onClick={() => { setQrCodeNumber(''); setScanError(''); setError(null); setCardUsed(false); }}
                                            className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Change</button>
                                    </div>
                                ) : mode === 'scan' ? (
                                    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-6 text-center">
                                        {/* html5-qrcode needs this element present before it starts. */}
                                        <div id={SCANNER_ID} className={`overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                        {!scanning ? (
                                            <>
                                                <button type="button" onClick={() => { setScanError(''); setScanning(true); }} aria-label="Scan your card"
                                                    className="lg-scan-ring mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-indigo-500 shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
                                                    <ScanLine size={44} strokeWidth={1.8} />
                                                </button>
                                                <p className="mt-4 text-lg font-bold text-slate-900">Scan your card</p>
                                                <p className="mt-1 text-sm text-slate-500">Hold the QR code on your card up to the camera</p>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => setScanning(false)}
                                                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                                <X size={13} /> Stop the camera
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="signup-card" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><CreditCard size={15} className="text-slate-500" /> Card Number</label>
                                        <input id="signup-card" type="text" required inputMode="numeric" autoComplete="off" maxLength={14} value={typedCard}
                                            onChange={(e) => { setTypedCard(e.target.value.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ')); setCardUsed(false); }}
                                            className={`${inputClass} font-mono tracking-widest`}
                                            placeholder="e.g. 2401 0001 9664" aria-describedby="signup-card-hint" />
                                        <p id="signup-card-hint" className="mt-1.5 text-xs text-slate-500">The 12-digit number printed on your physical or digital card.</p>
                                    </div>
                                )}

                                {scanError && (
                                    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                        <CameraOff size={14} className="mt-0.5 shrink-0" /> {scanError}
                                    </p>
                                )}

                                <button type="submit" disabled={qrValidating || (mode === 'manual' ? typedDigits.length !== 12 : !qrCodeNumber.trim())} className={primaryBtn}>
                                    {qrValidating ? 'Verifying your card…' : 'Verify Card'}
                                    {!qrValidating && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                </button>
                            </form>
                        )}

                        {/* Step 2: personal details */}
                        {step === 2 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handlePersonalDetailsNext} noValidate style={{ animationDelay: '0.2s' }}>
                                {errorBox}

                                {/* The card we verified in step 1, read-only. */}
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-emerald-700">Card verified</p>
                                        <p className="font-mono text-lg tracking-wider text-slate-800">{cardDetails.CardNumber}</p>
                                    </div>
                                    <CreditCard size={18} className="shrink-0 text-emerald-600/70" />
                                </div>

                                <div>
                                    <label htmlFor="signup-name" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><User size={15} className="text-slate-500" /> Full Name</label>
                                    <input id="signup-name" type="text" name="name" required autoComplete="name" value={formData.name} onChange={handleInputChange}
                                        aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                                        className={inputClass + invalidRing(fieldErrors.name)} placeholder="Your full name" />
                                    <FieldError id="signup-name-error">{fieldErrors.name}</FieldError>
                                </div>
                                <div>
                                    <label htmlFor="signup-email" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Mail size={15} className="text-slate-500" /> Email</label>
                                    <input id="signup-email" type="email" name="email" required autoComplete="email" value={formData.email} onChange={handleInputChange}
                                        aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'signup-email-error signup-email-hint' : 'signup-email-hint'}
                                        className={inputClass + invalidRing(fieldErrors.email)} placeholder={asTeacher ? 'you@college.edu.in' : 'you@gmail.com'} />
                                    <FieldError id="signup-email-error">{fieldErrors.email}</FieldError>
                                    <p id="signup-email-hint" className="mt-1.5 text-xs text-slate-500">{asTeacher ? 'Your work or personal email. Password-reset links go here.' : 'Only @gmail.com addresses are accepted.'}</p>
                                </div>
                                <div>
                                    <label htmlFor="signup-phone" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Phone size={15} className="text-slate-500" /> Phone Number</label>
                                    <div className="flex gap-2">
                                        {/* Labelled on its own: the visible label belongs to the number box. */}
                                        <label htmlFor="signup-phone-code" className="sr-only">Country code</label>
                                        <select
                                            id="signup-phone-code"
                                            autoComplete="tel-country-code"
                                            value={formData.phoneCode || '+91'}
                                            onChange={e => { setFormData({ ...formData, phoneCode: e.target.value }); setFieldErrors((f) => ({ ...f, phone: undefined })); }}
                                            className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+971">🇦🇪 +971</option>
                                            <option value="+61">🇦🇺 +61</option>
                                            <option value="+65">🇸🇬 +65</option>
                                            <option value="+60">🇲🇾 +60</option>
                                        </select>
                                        <input
                                            id="signup-phone"
                                            type="tel"
                                            name="phone"
                                            required
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            placeholder="Phone number"
                                            maxLength={12}
                                            value={formData.phone}
                                            onChange={(e) => { setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') }); setFieldErrors((f) => ({ ...f, phone: undefined })); }}
                                            aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'signup-phone-error' : undefined}
                                            className={`${inputClass} flex-1${invalidRing(fieldErrors.phone)}`}
                                        />
                                    </div>
                                    <FieldError id="signup-phone-error">{fieldErrors.phone}</FieldError>
                                </div>

                                {asTeacher ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="signup-institution" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                <Landmark size={15} className="text-slate-500" /> Institution <span className="font-normal text-slate-400">(optional)</span>
                                            </label>
                                            <input id="signup-institution" type="text" name="institution" maxLength={200} autoComplete="organization" value={formData.institution} onChange={handleInputChange}
                                                className={inputClass} placeholder="College or university" />
                                        </div>
                                        <div>
                                            <label htmlFor="signup-department" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                <Building2 size={15} className="text-slate-500" /> Department <span className="font-normal text-slate-400">(optional)</span>
                                            </label>
                                            <input id="signup-department" type="text" name="department" maxLength={200} value={formData.department} onChange={handleInputChange}
                                                className={inputClass} placeholder="e.g. Physics" />
                                        </div>
                                    </div>
                                ) : (
                                <>
                                {/* Optional, and said so twice: in the label and
                                    under the box. A student with no institution
                                    should not feel they are missing a step. */}
                                <div>
                                    <label htmlFor="signup-org-code" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Building2 size={15} className="text-slate-500" /> Organization ID
                                        <span className="font-normal text-slate-400">(optional)</span>
                                    </label>
                                    <input
                                        id="signup-org-code"
                                        type="text"
                                        name="orgCode"
                                        value={formData.orgCode}
                                        onChange={handleInputChange}
                                        autoComplete="off"
                                        spellCheck={false}
                                        autoCapitalize="none"
                                        aria-invalid={!!fieldErrors.orgCode} aria-describedby={fieldErrors.orgCode ? 'signup-org-code-error' : undefined}
                                        className={`${inputClass} font-mono${invalidRing(fieldErrors.orgCode)}`}
                                        placeholder="xx_xxxx_xxx"
                                    />
                                    <FieldError id="signup-org-code-error">{fieldErrors.orgCode}</FieldError>
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Only if your school, college or company gave you one. They will be asked to approve
                                        you, and can then follow your progress. You can add it later instead.
                                    </p>
                                </div>
                                </>
                                )}

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setError(null); setFieldErrors({}); setStep(1); setQrValidated(false); }} className={backBtn}><ArrowLeft size={15} /> Back</button>
                                    <button type="submit" className={primaryBtn}>
                                        Continue
                                        <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: password */}
                        {step === 3 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handleRegistrationSubmit} style={{ animationDelay: '0.2s' }}>
                                {errorBox}

                                <div>
                                    <label htmlFor="signup-password" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" /> Password</label>
                                    <div className="relative">
                                        <input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            autoComplete="new-password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            className={`${inputClass} pr-12`}
                                            placeholder="Create a password"
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Live strength checklist — only shown while typing */}
                                    {(passwordFocused || formData.password.length > 0) && (
                                        <div className="mt-3 grid grid-cols-1 gap-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
                                            {[
                                                { label: 'At least 8 characters', ok: formData.password.length >= 8 },
                                                { label: 'One uppercase letter', ok: /[A-Z]/.test(formData.password) },
                                                { label: 'One lowercase letter', ok: /[a-z]/.test(formData.password) },
                                                { label: 'One number', ok: /[0-9]/.test(formData.password) },
                                                { label: 'One special character', ok: /[^A-Za-z0-9]/.test(formData.password) },
                                            ].map(rule => (
                                                <div key={rule.label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${rule.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <span>{rule.ok ? '✓' : '○'}</span>
                                                    <span>{rule.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="signup-confirm-password" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" /> Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            id="signup-confirm-password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            required
                                            autoComplete="new-password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className={`${inputClass} pr-12`}
                                            placeholder="Repeat your password"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} aria-pressed={showConfirmPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                                    <span>I agree to the <Link to="/terms" target="_blank" className="font-bold text-indigo-600 hover:underline">Terms and Conditions</Link> and the <Link to="/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">Privacy Policy</Link>.</span>
                                </label>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setError(null); setStep(2); }} className={backBtn}><ArrowLeft size={15} /> Back</button>
                                    <button type="submit" disabled={loading || !passwordsFilled || !agreed} className={primaryBtn} title={passwordsFilled ? undefined : 'Enter and confirm a password to create your account'}>
                                        {loading ? 'Creating your account…' : 'Create Account'}
                                        {!loading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {(
                            <>
                        <button type="button" onClick={() => setShowContact(true)}
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-600">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><ChevronRight size={15} className="text-slate-500" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-500">
                            Already have an account? <Link to={loginLink} className="font-bold text-indigo-600 hover:underline">Sign in here</Link>
                        </p>
                        <p className="mt-2 text-center text-xs text-slate-500">
                            {asTeacher
                                ? <>A student? <Link to="/signup" className="font-bold text-indigo-600 hover:underline">Create a student account</Link></>
                                : <>A teacher? <Link to="/signup?as=teacher" className="font-bold text-emerald-700 hover:underline">Register a teacher card</Link></>}
                        </p>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Signup;
