/**
 * @author Preethesh Kulal
 * @description Multi-step student registration with QR code scan/manual entry
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import api from '../utils/api';
import SupportDialog from '../components/SupportDialog';
import { AuthContext } from '../context/AuthContext';
import { safeNextPath } from '../utils/sessionExpiry';
import teacherApi, { enterTeacher, hasTeacherSession } from '../teacher/teacherSession';
import { MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, Lock, Loader2, ScanLine, CameraOff, ArrowRight, ArrowLeft, ChevronRight, UserPlus, User, Mail, Phone, CreditCard, Building2, Landmark, BookOpenCheck, Clock, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import AuthBrandPanel from '../components/AuthBrandPanel';

// Password strength validator
const getPasswordStrengthError = (pw) => {
    if (!pw || pw.length < 8) return 'Min 8 characters required.';
    if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Must include a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
    return null;
};


const STEPS = [
    ['Verify your card', 'Scan the QR code on your card, or type your card number.'],
    ['Your details', 'Tell us your name, email and phone number.'],
    ['Set a password', 'Choose a strong password to protect your account.'],
];

// The sign-in page's look (2026-10-30): dark fields on a dark card.
const inputClass = 'block w-full appearance-none rounded-xl border border-white/10 bg-black/15 px-4 py-3.5 text-slate-100 shadow-sm placeholder-slate-500 transition duration-200 focus:border-transparent focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500';
const primaryBtn = 'group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0';
const backBtn = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white';

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
// A teacher their organization added: the set-up pages after the mobile number.
const ORG_STEPS = ['confirm', 'password', 'details'];
const ORG_HINT = {
    phone: 'Added by your organization? Check with your mobile number.',
    confirm: 'Your organization added you. Check that this is you.',
    password: 'Choose the password you will sign in with.',
    details: 'Your email and a few details, then your dashboard.'
};
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Guest Lecturer', 'Head of Department', 'Principal', 'Teacher'];

/** A field's message, under it, tied to it for screen readers by aria-describedby. */
const FieldError = ({ id, children }) => (children
    ? <p id={id} className="mt-1.5 text-xs font-semibold text-red-300">{children}</p>
    : null);

/** The same red edge on every field with a problem. */
const invalidRing = (bad) => (bad ? ' !border-red-400/60 focus:ring-red-400' : '');

const Signup = () => {
    const { user, enterApp } = useContext(AuthContext);
    // Where the student was heading before they were sent to sign in, passed
    // on from the sign-in page (?next=). Only a path in this app is taken.
    const [searchParams, setSearchParams] = useSearchParams();
    const next = safeNextPath(searchParams.get('next') || '/');
    /* A teacher registering their card (?as=teacher, from the teacher sign-in).
       The same three steps and the same card check; the details ask for an
       institution instead of an Organization ID, take any email address, and
       the account opened is a teacher's (src/teacher on the server). */
    const asTeacher = searchParams.get('as') === 'teacher';
    const swapped = Boolean(useLocation().state?.authSwapFrom);
    const loginLink = asTeacher ? '/login?as=teacher' : next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
    // The Student / Teacher switch (2026-10-30), as on the sign-in page. It is
    // the same ?as=teacher the links use; what is already typed stays.
    const chooseRole = (role) => {
        const params = new URLSearchParams(searchParams);
        if (role === 'teacher') params.set('as', 'teacher'); else params.delete('as');
        setSearchParams(params, { replace: true });
        setError(null); setFieldErrors({}); setCardUsed(false);
        setOrgMode(false); setOrgResult(null); setOrgPick(null); setOrgStage('phone');
    };

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

    /* Reading the card. As on the sign-in page (2026-10-30): one box for the
       number, with the scanner inside it on the right. The camera runs only
       while `scanning` is true; a code it reads is checked at once. */
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    /* A teacher with no AI card is added by their organization with their
       name and mobile number only (2026-10-30). "Verify as your
       organization's teacher" checks that number, then, for an account still
       to be set up: "Is this you?" (their name and number), a password, and
       their email and details — and they land on their teacher dashboard.
       One already set up is sent to sign in with the number and password. */
    const [orgMode, setOrgMode] = useState(false);
    const [orgStage, setOrgStage] = useState('phone');   // phone → confirm → password → details
    const [orgPhone, setOrgPhone] = useState('');
    const [orgChecking, setOrgChecking] = useState(false);
    const [orgResult, setOrgResult] = useState(null);
    const [orgPick, setOrgPick] = useState(null);         // the account they said is them
    const [orgPassword, setOrgPassword] = useState('');
    const [orgConfirm, setOrgConfirm] = useState('');
    const [orgDetails, setOrgDetails] = useState({ email: '', designation: '', department: '' });
    const orgWaiting = (orgResult?.teachers || []).filter((t) => t.needsPassword && t.active);
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
                    setScanError('');
                    setScanning(false);
                    validateCard({ qrCodeNumber: decodedText.trim() });
                },
                () => {}   // a frame without a code is not an error
            );
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
        });
        return () => { cancelled = true; stopScanner(); };
        // validateCard is the same each render in what it does; the camera restarts only with `scanning`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Step 1: validate the card — the typed card number, or the QR code the scanner read
    const validateCard = async (body) => {
        const byNumber = !!body.cardNumber;
        setError(null);
        setQrValidating(true);
        setCardUsed(false);
        try {
            const res = await api.post('/auth/validate-qr', body);
            // Store card details internally — never shown as editable inputs
            setCardDetails({ CardNumber: res.data.cardNumber, CVV: res.data.cvv });
            // Registration needs the card's QR code: the server's, or the one just scanned.
            setQrCodeNumber(String(res.data.qrCodeNumber || body.qrCodeNumber || ''));
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
    const orgFail = (err, fallback) => setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : fallback));
    const orgGo = (stage) => { setError(null); setOrgStage(stage); };
    const verifyOrgTeacher = async () => {
        setError(null); setOrgResult(null); setOrgPick(null);
        if (orgPhone.replace(/\D/g, '').length < 7) return setError('Enter the mobile number your organization added you with.');
        setOrgChecking(true);
        try {
            const found = (await teacherApi.post('/auth/org-check', { phone: orgPhone.trim() })).data;
            setOrgResult(found);
            const waiting = (found.teachers || []).filter((t) => t.needsPassword && t.active);
            // Still to be set up: "Is this you?" next.
            if (waiting.length) { setOrgPick(waiting[0]); setOrgStage('confirm'); }
        } catch (err) { orgFail(err, 'Could not check just now. Please try again.'); }
        finally { setOrgChecking(false); }
    };
    const finishOrgSetup = async () => {
        setError(null);
        const email = orgDetails.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
        if (!orgDetails.designation.trim()) { document.getElementById('signup-org-designation')?.focus(); return setError('Enter your designation.'); }
        if (!orgDetails.department.trim()) { document.getElementById('signup-org-department')?.focus(); return setError('Choose or enter your department.'); }
        setOrgChecking(true);
        try {
            enterTeacher((await teacherApi.post('/auth/org-check/setup', {
                phone: orgPhone.trim(), teacherId: orgPick?.id, password: orgPassword,
                email, designation: orgDetails.designation.trim(), department: orgDetails.department.trim()
            })).data);
        } catch (err) {
            // A password the server refuses is fixed on its own page.
            if (err.response?.data?.field === 'password') setOrgStage('password');
            orgFail(err, 'Could not set up your account just now. Please try again.');
            setOrgChecking(false);
        }
    };
    const orgSubmit = (e) => {
        e.preventDefault();
        if (orgStage === 'phone') return orgResult ? undefined : verifyOrgTeacher();
        if (orgStage === 'confirm') return orgGo('password');
        if (orgStage === 'password') {
            const weak = getPasswordStrengthError(orgPassword);
            if (weak) return setError(weak);
            if (orgPassword !== orgConfirm) return setError('The two passwords do not match.');
            return orgGo('details');
        }
        return finishOrgSetup();
    };
    const handleValidateQR = (e) => {
        e.preventDefault();
        if (typedDigits.length !== 12) return setError('Please enter the 12-digit card number printed on your card, or scan its QR code.');
        return validateCard({ cardNumber: typedDigits });
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
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#232840] via-[#1f2336] to-[#272240] p-4 text-slate-100">
                <div role="status" className="w-full max-w-md rounded-3xl bg-[#2a2f45] p-8 text-center shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30"><Clock size={26} aria-hidden="true" /></span>
                    <h1 className="mt-4 text-xl font-black text-white">Your account is waiting for approval</h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Thank you, {pendingApproval}. Your teacher card is registered. The administrator approves new teacher accounts before they can be used — you will get an email when yours is approved.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">Then choose <strong className="text-white">Teacher</strong> on the sign-in page and sign in with your card number and password.</p>
                    <Link to="/login?as=teacher" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Back to sign in</Link>
                </div>
            </div>
        );
    }

    const [, stepHint] = STEPS[step - 1];

    // The error box every step shows; a used card adds the way to sign in.
    const errorBox = error && (
        <div ref={errorRef} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-300">
            {error}
            {cardUsed && (
                <> <Link to={loginLink} className="font-bold text-indigo-300 underline">Sign in</Link></>
            )}
        </div>
    );

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#171a2b] p-4 text-slate-100 sm:p-6 lg:p-10">
            {/* The sign-in page's backdrop: a fine grid and two soft glows. */}
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
            <span aria-hidden className="pointer-events-none absolute -top-48 right-1/4 -z-10 h-[32rem] w-[40rem] rounded-full bg-indigo-600/20 blur-[140px]" />
            <span aria-hidden className="pointer-events-none absolute -left-40 -bottom-56 -z-10 h-[30rem] w-[30rem] rounded-full bg-violet-600/15 blur-[140px]" />
            {showContact && <SupportDialog onClose={() => setShowContact(false)} page="signup" tone="dark" />}

            {/* As on the sign-in page: the form, with the card panel on the right (desktop). */}
            <div className={`${swapped ? 'auth-swap-in auth-swap-register' : 'lg-rise'} grid w-full max-w-[30rem] overflow-hidden rounded-[28px] bg-[#232740] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08] lg:max-w-[62rem] lg:grid-cols-[1fr_1.05fr]`}>

                {/* ── Left: brand panel (desktop) ─────────────────────── */}
                <AuthBrandPanel eyebrow={asTeacher ? 'For teachers' : 'Get started'}
                    title={asTeacher ? 'Bring your classroom online in minutes.' : 'One card. Every lesson, wherever you are.'}
                    text={asTeacher ? 'Register your card or the mobile number your organization added you with, and your classes are ready.' : 'Register the AI card you were given, set a password, and start learning right away.'}
                    points={asTeacher
                        ? [[BookOpenCheck, 'Your classes and students in one place'], [GraduationCap, 'Follow every student’s progress'], [Sparkles, 'AI help built into every lesson']]
                        : [[ScanLine, 'Scan your card to register'], [ShieldCheck, 'Protected on up to two devices'], [Sparkles, 'AI help built into every lesson']]} />
                {/* ── Right: the sign-up form ─────────────────────────────────── */}
                <section className="relative px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
                    <div className="mx-auto max-w-md">
                        {(
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            <img src="/assets/YATICORP.png" alt="YATICORP" className="mb-5 h-8 w-auto object-contain lg:hidden" />
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Welcome to LearnHub</p>
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30">{asTeacher ? <BookOpenCheck size={20} /> : <UserPlus size={20} />}</span>
                            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{asTeacher ? 'Register your teacher card' : 'Create your account'}</h2>
                            <p className="mt-1.5 text-sm text-slate-400">{orgMode && asTeacher ? ORG_HINT[orgStage] : stepHint}</p>
                            {/* Student or teacher, as one switch, under the heading (2026-10-30). */}
                            <div role="radiogroup" aria-label="Signing up as" className="mt-5 grid w-full grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-black/15 p-1">
                                {[['student', 'Student', GraduationCap], ['teacher', 'Teacher', BookOpenCheck]].map(([id, label, Icon]) => {
                                    const on = (id === 'teacher') === asTeacher;
                                    return (
                                        <button key={id} type="button" role="radio" aria-checked={on} onClick={() => chooseRole(id)}
                                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${on ? (id === 'teacher' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm') : 'text-slate-400 hover:text-white'}`}>
                                            <Icon size={15} aria-hidden="true" /> {label}
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                        )}

                        {/* Step 1: card QR */}
                        {step === 1 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={orgMode && asTeacher ? orgSubmit : handleValidateQR} style={{ animationDelay: '0.2s' }}>
                                {/* A teacher signs up with an AI card, or with the mobile number
                                    their organization added them with (only those numbers can). */}
                                {asTeacher && (!orgMode || orgStage === 'phone') && (
                                    <div role="radiogroup" aria-label="Sign up with" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                                        {[[false, 'AI card', CreditCard], [true, 'Mobile number', Phone]].map(([org, label, Icon]) => {
                                            const on = orgMode === org;
                                            return (
                                                <button key={label} type="button" role="radio" aria-checked={on}
                                                    onClick={() => { if (on) return; setError(null); setScanning(false); setOrgResult(null); setOrgPick(null); setOrgStage('phone'); setOrgMode(org); }}
                                                    className={`inline-flex min-h-[32px] items-center gap-2 rounded-md text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${on ? 'text-emerald-200' : 'text-slate-400 hover:text-white'}`}>
                                                    <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-emerald-400' : 'border-slate-500'}`}>
                                                        {on && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                                                    </span>
                                                    <Icon size={13} aria-hidden="true" /> {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {errorBox}

                                {asTeacher && orgMode ? (
                                    <>
                                        {orgStage === 'phone' && (<>
                                        {/* No AI card: the organization added them; check the number they were added with. */}
                                        <div>
                                            <label htmlFor="signup-org-phone" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Phone size={15} className="text-slate-400" /> Mobile number</label>
                                            <input id="signup-org-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={orgPhone}
                                                onChange={(e) => { setOrgPhone(e.target.value.replace(/[^0-9+()\s-]/g, '')); setOrgResult(null); setError(null); }}
                                                className={inputClass} placeholder="The number your organization added you with" aria-describedby="signup-org-phone-hint" />
                                            <p id="signup-org-phone-hint" className="mt-1.5 text-xs text-slate-400">Only numbers your organization has added can create an account here.</p>
                                        </div>
                                        {orgResult && !orgWaiting.length ? (
                                            <>
                                                <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left">
                                                    <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-300" />
                                                    <div className="min-w-0 text-sm">
                                                        <p className="font-bold text-emerald-200">Verified</p>
                                                        <p className="mt-0.5 text-slate-200">
                                                            {orgResult.teachers.map((t) => `${t.firstName}, ${t.organization}`).join(' · ')} — your organization has added you as a teacher.
                                                        </p>
                                                        <p className="mt-1 text-slate-300">{orgResult.teachers.some((t) => t.active)
                                                            ? 'Your account is set up. Sign in with this mobile number and your password.'
                                                            : 'The account is not active yet. Ask your organization to turn it on, then try again.'}</p>
                                                    </div>
                                                </div>
                                                {orgResult.teachers.some((t) => t.active) && (
                                                    <Link to="/login" className={primaryBtn}>
                                                        Go to sign in
                                                        <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
                                                    </Link>
                                                )}
                                            </>
                                        ) : (
                                            <button type="submit" disabled={orgChecking || orgPhone.replace(/\D/g, '').length < 7} className={primaryBtn}>
                                                {orgChecking ? 'Checking…' : 'Verify'}
                                                {!orgChecking && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                            </button>
                                        )}
                                        </>)}

                                        {/* "Is this you?": the name and number their organization added. */}
                                        {orgStage === 'confirm' && (<>
                                            <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left">
                                                <p className="flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 size={18} /> Verified · Is this you?</p>
                                                <div className="mt-3 space-y-2" role={orgWaiting.length > 1 ? 'radiogroup' : undefined} aria-label={orgWaiting.length > 1 ? 'Which one is you' : undefined}>
                                                    {orgWaiting.map((t) => (
                                                        <label key={t.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${orgPick?.id === t.id ? 'border-emerald-400/50 bg-black/20' : 'border-white/10'} ${orgWaiting.length > 1 ? 'cursor-pointer' : ''}`}>
                                                            {orgWaiting.length > 1 && <input type="radio" name="org-pick" checked={orgPick?.id === t.id} onChange={() => setOrgPick(t)} className="mt-1 h-4 w-4 accent-emerald-500" />}
                                                            <span className="min-w-0">
                                                                <span className="flex items-center gap-1.5 text-base font-bold text-white"><User size={15} className="text-slate-400" /> {t.name}</span>
                                                                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300"><Phone size={14} className="text-slate-400" /> {t.phone}</span>
                                                                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300"><Building2 size={14} className="text-slate-400" /> {t.organization}</span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <button type="submit" disabled={!orgPick} className={primaryBtn}>
                                                Yes, this is me
                                                <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
                                            </button>
                                            <button type="button" onClick={() => { orgGo('phone'); setOrgResult(null); setOrgPick(null); setError('Check the mobile number. If it is yours but the name is wrong, ask your organization to correct it.'); }}
                                                className="w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">
                                                No, this is not me
                                            </button>
                                        </>)}

                                        {/* Their own password, typed twice. */}
                                        {orgStage === 'password' && (<>
                                            <div>
                                                <label htmlFor="signup-org-password" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Lock size={15} className="text-slate-400" /> Set your password</label>
                                                <div className="relative">
                                                    <input id="signup-org-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={orgPassword} autoFocus
                                                        onChange={(e) => { setOrgPassword(e.target.value); setError(null); }} className={`${inputClass} pr-12`} placeholder="Choose a password" />
                                                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-slate-200">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                <p className="mt-1.5 text-xs text-slate-400">At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol. You sign in with your mobile number and this password.</p>
                                            </div>
                                            <div>
                                                <label htmlFor="signup-org-confirm" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Lock size={15} className="text-slate-400" /> Confirm password</label>
                                                <input id="signup-org-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={orgConfirm}
                                                    onChange={(e) => { setOrgConfirm(e.target.value); setError(null); }} className={inputClass} placeholder="Type it again" />
                                            </div>
                                            <button type="submit" className={primaryBtn}>
                                                Continue
                                                <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
                                            </button>
                                            <button type="button" onClick={() => orgGo('confirm')} disabled={orgChecking} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-100 hover:underline disabled:opacity-50"><ArrowLeft size={13} /> Back</button>
                                        </>)}

                                        {/* Their email and basic details, then into the dashboard. */}
                                        {orgStage === 'details' && (<>
                                            <div>
                                                <label htmlFor="signup-org-email" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Mail size={15} className="text-slate-400" /> Email</label>
                                                <input id="signup-org-email" type="email" autoComplete="email" value={orgDetails.email} autoFocus
                                                    onChange={(e) => { setOrgDetails((d) => ({ ...d, email: e.target.value })); setError(null); }} className={inputClass} placeholder="name@college.edu" />
                                                <p className="mt-1.5 text-xs text-slate-400">For a password reset if you ever forget it.</p>
                                            </div>
                                            <div>
                                                <label htmlFor="signup-org-designation" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><GraduationCap size={15} className="text-slate-400" /> Designation</label>
                                                <input id="signup-org-designation" required aria-required="true" list="signup-org-designations" maxLength={100} value={orgDetails.designation}
                                                    onChange={(e) => setOrgDetails((d) => ({ ...d, designation: e.target.value }))} className={inputClass} placeholder="e.g. Assistant Professor" />
                                                <datalist id="signup-org-designations">{DESIGNATIONS.map((d) => <option key={d} value={d} />)}</datalist>
                                            </div>
                                            <div>
                                                <label htmlFor="signup-org-department" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Landmark size={15} className="text-slate-400" /> Department</label>
                                                {/* The courses the organization lists, one tap to pick; anything else can still be typed. */}
                                                {(orgPick?.courses || []).length > 0 && (
                                                    <div className="mb-2.5 flex flex-wrap gap-2" role="group" aria-label="Your organization's courses (choose one or more)">
                                                        {orgPick.courses.map((c) => {
                                                            // More than one can be picked: kept as "B.Com, BBA".
                                                            const picked = orgDetails.department.split(',').map((x) => x.trim()).filter(Boolean);
                                                            const on = picked.some((x) => x.toLowerCase() === c.toLowerCase());
                                                            return (
                                                                <button key={c} type="button" aria-pressed={on}
                                                                    onClick={() => setOrgDetails((d) => {
                                                                        const list = d.department.split(',').map((x) => x.trim()).filter(Boolean);
                                                                        const next = on ? list.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...list, c];
                                                                        return { ...d, department: next.join(', ') };
                                                                    })}
                                                                    className={`min-h-[36px] rounded-full border px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${on ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-400 hover:text-white'}`}>
                                                                    {c}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <input id="signup-org-department" required aria-required="true" maxLength={200} value={orgDetails.department}
                                                    onChange={(e) => setOrgDetails((d) => ({ ...d, department: e.target.value }))} className={inputClass}
                                                    placeholder={(orgPick?.courses || []).length ? 'Pick one or more courses above, or type them' : 'e.g. Commerce'} />
                                            </div>
                                            <button type="submit" disabled={orgChecking} className={primaryBtn}>
                                                {orgChecking ? 'Setting up…' : 'Finish & open my dashboard'}
                                                {!orgChecking && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                            </button>
                                            <button type="button" onClick={() => orgGo('password')} disabled={orgChecking} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-100 hover:underline disabled:opacity-50"><ArrowLeft size={13} /> Back</button>
                                        </>)}

                                    </>
                                ) : (
                                    <>
                                {/* One box for the card number, the scanner inside it on the right,
                                    as on the sign-in page (2026-10-30). */}
                                <div>
                                    <label htmlFor="signup-card" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><CreditCard size={15} className="text-slate-400" /> Card Number</label>
                                    <div className="relative">
                                        <input id="signup-card" type="text" inputMode="numeric" autoComplete="off" maxLength={14} value={typedCard}
                                            onChange={(e) => { setTypedCard(e.target.value.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ')); setCardUsed(false); }}
                                            className={`${inputClass} pr-14 font-mono tracking-widest`}
                                            placeholder="e.g. 2401 0001 9664" aria-describedby="signup-card-hint" />
                                        <button type="button" disabled={qrValidating}
                                            onClick={() => { setScanError(''); setError(null); setScanning((on) => !on); }}
                                            aria-label={scanning ? 'Stop scanning' : 'Scan your card'} aria-pressed={scanning} title={scanning ? 'Stop scanning' : 'Scan your card'}
                                            className={`absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 ${scanning ? 'bg-indigo-500 text-white' : 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30 hover:bg-indigo-500/25'}`}>
                                            {qrValidating && !typedDigits ? <Loader2 size={18} className="animate-spin" /> : scanning ? <X size={18} /> : <ScanLine size={19} />}
                                        </button>
                                    </div>
                                    <p id="signup-card-hint" className="mt-1.5 text-xs text-slate-400">The 12-digit number printed on your physical or digital card.</p>
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div className={scanning ? 'mt-3' : 'hidden'}>
                                        <div id={SCANNER_ID} className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10" />
                                        <p className="mt-2 text-xs text-slate-400">Hold the QR code on your card up to the camera</p>
                                    </div>
                                </div>

                                {scanError && (
                                    <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
                                        <CameraOff size={14} className="mt-0.5 shrink-0" /> {scanError}
                                    </p>
                                )}

                                <button type="submit" disabled={qrValidating || typedDigits.length !== 12} className={primaryBtn}>
                                    {qrValidating ? 'Verifying your card…' : 'Verify Card'}
                                    {!qrValidating && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                </button>
                                    </>
                                )}
                            </form>
                        )}

                        {/* Step 2: personal details */}
                        {step === 2 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handlePersonalDetailsNext} noValidate style={{ animationDelay: '0.2s' }}>
                                {errorBox}

                                {/* The card we verified in step 1, read-only. */}
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                                    <CheckCircle2 size={22} className="shrink-0 text-emerald-300" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-emerald-300">Card verified</p>
                                        <p className="font-mono text-lg tracking-wider text-slate-100">{cardDetails.CardNumber}</p>
                                    </div>
                                    <CreditCard size={18} className="shrink-0 text-emerald-300/70" />
                                </div>

                                <div>
                                    <label htmlFor="signup-name" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><User size={15} className="text-slate-400" /> Full Name</label>
                                    <input id="signup-name" type="text" name="name" required autoComplete="name" value={formData.name} onChange={handleInputChange}
                                        aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                                        className={inputClass + invalidRing(fieldErrors.name)} placeholder="Your full name" />
                                    <FieldError id="signup-name-error">{fieldErrors.name}</FieldError>
                                </div>
                                <div>
                                    <label htmlFor="signup-email" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Mail size={15} className="text-slate-400" /> Email</label>
                                    <input id="signup-email" type="email" name="email" required autoComplete="email" value={formData.email} onChange={handleInputChange}
                                        aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'signup-email-error signup-email-hint' : 'signup-email-hint'}
                                        className={inputClass + invalidRing(fieldErrors.email)} placeholder={asTeacher ? 'you@college.edu.in' : 'you@gmail.com'} />
                                    <FieldError id="signup-email-error">{fieldErrors.email}</FieldError>
                                    <p id="signup-email-hint" className="mt-1.5 text-xs text-slate-400">{asTeacher ? 'Your work or personal email. Password-reset links go here.' : 'Only @gmail.com addresses are accepted.'}</p>
                                </div>
                                <div>
                                    <label htmlFor="signup-phone" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Phone size={15} className="text-slate-400" /> Phone Number</label>
                                    <div className="flex gap-2">
                                        {/* Labelled on its own: the visible label belongs to the number box. */}
                                        <label htmlFor="signup-phone-code" className="sr-only">Country code</label>
                                        <select
                                            id="signup-phone-code"
                                            autoComplete="tel-country-code"
                                            value={formData.phoneCode || '+91'}
                                            onChange={e => { setFormData({ ...formData, phoneCode: e.target.value }); setFieldErrors((f) => ({ ...f, phone: undefined })); }}
                                            className="w-24 rounded-xl border border-white/10 bg-black/15 px-2 py-3.5 text-sm text-slate-100 shadow-sm [color-scheme:dark] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            <label htmlFor="signup-institution" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                                                <Landmark size={15} className="text-slate-400" /> Institution <span className="font-normal text-slate-500">(optional)</span>
                                            </label>
                                            <input id="signup-institution" type="text" name="institution" maxLength={200} autoComplete="organization" value={formData.institution} onChange={handleInputChange}
                                                className={inputClass} placeholder="College or university" />
                                        </div>
                                        <div>
                                            <label htmlFor="signup-department" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                                                <Building2 size={15} className="text-slate-400" /> Department <span className="font-normal text-slate-500">(optional)</span>
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
                                    <label htmlFor="signup-setup-code" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                                        <Building2 size={15} className="text-slate-400" /> Organization ID
                                        <span className="font-normal text-slate-500">(optional)</span>
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
                                    <p className="mt-1.5 text-xs text-slate-400">
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
                                    <label htmlFor="signup-password" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Lock size={15} className="text-slate-400" /> Password</label>
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
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Live strength checklist — only shown while typing */}
                                    {(passwordFocused || formData.password.length > 0) && (
                                        <div className="mt-3 grid grid-cols-1 gap-1 rounded-xl border border-white/10 bg-black/15 px-4 py-3 sm:grid-cols-2">
                                            {[
                                                { label: 'At least 8 characters', ok: formData.password.length >= 8 },
                                                { label: 'One uppercase letter', ok: /[A-Z]/.test(formData.password) },
                                                { label: 'One lowercase letter', ok: /[a-z]/.test(formData.password) },
                                                { label: 'One number', ok: /[0-9]/.test(formData.password) },
                                                { label: 'One special character', ok: /[^A-Za-z0-9]/.test(formData.password) },
                                            ].map(rule => (
                                                <div key={rule.label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${rule.ok ? 'text-emerald-300' : 'text-slate-500'}`}>
                                                    <span>{rule.ok ? '✓' : '○'}</span>
                                                    <span>{rule.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="signup-confirm-password" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Lock size={15} className="text-slate-400" /> Confirm Password</label>
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
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-300">
                                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                                    <span>I agree to the <Link to="/terms" target="_blank" className="font-bold text-indigo-300 hover:underline">Terms and Conditions</Link> and the <Link to="/privacy" target="_blank" className="font-bold text-indigo-300 hover:underline">Privacy Policy</Link>.</span>
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
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-200 hover:bg-indigo-500/15" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-300">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2f45] ring-1 ring-white/10"><ChevronRight size={15} className="text-slate-400" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-400">
                            Already have an account? <Link to={loginLink} state={{ authSwapFrom: 'register' }} className="font-bold text-indigo-300 hover:underline">Sign in here</Link>
                        </p>
                        <p className="mt-2 text-center text-xs text-slate-400">
                            {asTeacher
                                ? <>A student? <Link to="/signup" className="font-bold text-indigo-300 hover:underline">Create a student account</Link></>
                                : <>A teacher? <Link to="/signup?as=teacher" className="font-bold text-emerald-300 hover:underline">Register a teacher card</Link></>}
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
