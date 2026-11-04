/**
 * @author Preethesh Kulal
 * @description Student login page with card number, password and forgot password support
 */
import ProfileImage from '../components/ProfileImage';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import DeviceLimitDialog from '../components/DeviceLimitDialog';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import SupportDialog from '../components/SupportDialog';
import { isNative } from '../native/platform';
import useBackClose from '../native/useBackClose';
import { SESSION_ENDED_KEY, safeNextPath } from '../utils/sessionExpiry';
import teacherApi, { enterTeacher, hasTeacherSession, TEACHER_SESSION_ENDED } from '../teacher/teacherSession';
import { Mail, KeyRound, MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, ScanLine, Keyboard, Loader2, CameraOff, QrCode, Lock, ArrowRight, ChevronRight, PlayCircle, CreditCard, Info } from 'lucide-react';

// --- Forgot Password Modal ---
// Three steps: the card (scanned, or its number typed), then whose account it
// is — the name and a partly hidden email, from the server — to confirm, and
// only then the link is sent. There is no Student / Teacher choice any more
// (2026-10-30): a card is looked up as a student's, then as a teacher's, and
// the link is sent from whichever side it belongs to.
const FORGOT_SCANNER_ID = 'forgot-card-scanner';
const SIDES = {
    student: { client: api, base: '/auth/student/forgot-password' },
    teacher: { client: teacherApi, base: '/auth/forgot-password' }
};
const ForgotPasswordModal = ({ onClose }) => {
    // Whose account the card or email turned out to be.
    const [side, setSide] = useState('student');
    const { client, base } = SIDES[side];
    const [step, setStep] = useState('card');          // 'card' | 'confirm' | 'sent'
    const [mode, setMode] = useState('scan');          // 'scan' | 'manual' | 'email'
    const [scanning, setScanning] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    // A teacher with no AI card is found by the email they gave at set-up (for the reset link only; they sign in by mobile number).
    const [email, setEmail] = useState('');
    const byEmail = mode === 'email';
    const who = () => (byEmail ? { email: email.trim() } : { cardNumber });
    const [account, setAccount] = useState(null);      // { name, email }
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const scannerRef = useRef(null);
    // Android's back button closes this, rather than leaving the page.
    useBackClose(onClose);

    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        if (!inst) return;
        try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {}); } catch { /* was not running */ }
    };

    // The card's account, to confirm.
    const lookUp = async (number) => {
        setLoading(true);
        setError('');
        try {
            let res;
            let found = 'teacher';
            if (byEmail) res = await SIDES.teacher.client.post(`${SIDES.teacher.base}/preview`, { email: email.trim() });
            else {
                // A student's card, or else a teacher's.
                try { res = await SIDES.student.client.post(`${SIDES.student.base}/preview`, { cardNumber: number }); found = 'student'; }
                catch (err) {
                    if (err.response?.status !== 404) throw err;
                    try { res = await SIDES.teacher.client.post(`${SIDES.teacher.base}/preview`, { cardNumber: number }); }
                    catch (e2) { if (e2.response?.status === 404) throw err; throw e2; }
                }
            }
            setSide(found);
            setCardNumber(number);
            setAccount(res.data);
            setStep('confirm');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not look up that card. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // A scanned code: the server turns it into the card number, then the account.
    const resolveScan = async (code) => {
        stopScanner();
        setScanning(false);
        setLoading(true);
        setError('');
        try {
            // A student's card answers here; a teacher's is read by the teacher side.
            const res = await api.post('/auth/card-scan', { code })
                .catch((err) => { if (err.response?.data?.code === 'TEACHER_CARD') return teacherApi.post('/auth/card-scan', { code }); throw err; });
            await lookUp(String(res.data.cardNumber));
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'That card could not be read. Try again, or type the number.');
        }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(FORGOT_SCANNER_ID);
            scannerRef.current = inst;
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 200, height: 200 } },
                (text) => { if (!cancelled) resolveScan(text); }, () => {});
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setError('The camera is not available. Type your card number instead.');
            setMode('manual');
        });
        return () => { cancelled = true; stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);
    useEffect(() => () => stopScanner(), []);

    const send = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await client.post(base, who());
            setMessage(res.data.message);
            setStep('sent');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const startOver = () => { setAccount(null); setCardNumber(''); setError(''); setStep('card'); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" className="bg-[#2a2f45] rounded-2xl shadow-2xl ring-1 ring-white/10 w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.04]">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><KeyRound size={18} className="text-indigo-300" /></div>
                        <h2 id="forgot-password-title" className="text-lg font-bold text-slate-100">Forgot Password</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">
                    {step === 'sent' ? (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={24} className="text-emerald-400" />
                            </div>
                            <p className="text-slate-100 font-bold">Check your email</p>
                            <p className="mt-1 text-slate-300 text-sm">We sent a reset link to <span className="font-semibold text-slate-100">{account?.email}</span>. It works for 1 hour.</p>
                            {message && <p className="sr-only">{message}</p>}
                            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm">Close</button>
                        </div>
                    ) : step === 'confirm' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Is this your account? The reset link will go to this email.</p>
                            <div className="flex items-center gap-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-md ring-2 ring-white">
                                    <ProfileImage src={account?.photo} alt="" className="h-full w-full object-cover" fallback={(account?.name || '?').trim()[0]?.toUpperCase()} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-white">{account?.name}</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-300"><Mail size={13} className="shrink-0 text-indigo-300" /> {account?.email}</p>
                                    <p className="mt-0.5 font-mono text-xs tracking-wider text-slate-400">{cardNumber}</p>
                                </div>
                            </div>
                            {error && <div role="alert" className="bg-red-500/10 border border-red-400/30 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={startOver} disabled={loading} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Not me</button>
                                <button type="button" onClick={send} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Yes, send link</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Scan your card or type its number. We'll show you the account before sending a reset link to its email.</p>

                            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1">
                                {[['scan', 'Scan Card', ScanLine], ['manual', 'Type Instead', Keyboard], ['email', 'Email', Mail]].map(([id, label, Icon]) => (
                                    <button key={id} type="button" onClick={() => { setError(''); setScanning(false); setMode(id); }}
                                        className={`inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all ${mode === id ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/15' : 'text-slate-400 hover:text-white'}`}>
                                        <Icon size={15} /> {label}
                                    </button>
                                ))}
                            </div>

                            {error && <div role="alert" className="bg-red-500/10 border border-red-400/30 text-red-300 p-3 rounded-lg text-sm">{error}</div>}

                            {byEmail ? (
                                <form onSubmit={(e) => { e.preventDefault(); lookUp(''); }} className="space-y-4">
                                    <div>
                                        <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-200 mb-1">Email</label>
                                        <input id="forgot-email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-white/15 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-100"
                                            placeholder="The email on your account" />
                                        <p className="mt-1 text-xs text-slate-400">For a teacher without a card: the email you gave when you set up your account. The reset link goes there.</p>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Cancel</button>
                                        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <>Continue <ArrowRight size={15} /></>}
                                        </button>
                                    </div>
                                </form>
                            ) : mode === 'scan' ? (
                                <div className="rounded-2xl border-2 border-dashed border-indigo-400/40 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-5 text-center">
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div id={FORGOT_SCANNER_ID} className={`overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                    {!scanning ? (
                                        <>
                                            <button type="button" onClick={() => { setError(''); setScanning(true); }} disabled={loading} aria-label="Scan your card"
                                                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-200 shadow-lg shadow-black/40 ring-1 ring-indigo-400/30 transition-transform hover:scale-105 disabled:opacity-60">
                                                {loading ? <Loader2 size={34} className="animate-spin" /> : <ScanLine size={38} strokeWidth={1.8} />}
                                            </button>
                                            <p className="mt-3 font-bold text-white">{loading ? 'Finding your account…' : 'Scan your card'}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">Hold the QR code on your card up to the camera</p>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setScanning(false)}
                                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#2a2f45] py-2 text-xs font-bold text-slate-300 hover:bg-white/5">
                                            <X size={13} /> Stop the camera
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); lookUp(cardNumber); }} className="space-y-4">
                                    <div>
                                        <label htmlFor="forgot-card-number" className="block text-sm font-semibold text-slate-200 mb-1">Card Number</label>
                                        <input id="forgot-card-number" required maxLength={12} inputMode="numeric" pattern="[0-9]*" autoComplete="username" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-4 py-3 border border-white/15 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider text-slate-100"
                                            placeholder="12-Digit Card Number" />
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Cancel</button>
                                        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <>Continue <ArrowRight size={15} /></>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// A twinkling star. Module-level so the page's re-renders (every keystroke
// in the password box) do not remount it and restart its animation.
// --- Main Login Page ---
const Login = () => {
    const { user, login, replaceDevice, enterApp } = useContext(AuthContext);
    // A 3rd device: the popup to swap it in (components/DeviceLimitDialog).
    const [deviceConflict, setDeviceConflict] = useState(null);
    // Where the student was heading when they were asked to sign in (a link
    // to a lesson, a page left when the session ended). Only a path in this
    // app is taken; anything else means the dashboard.
    const [searchParams] = useSearchParams();
    const next = safeNextPath(searchParams.get('next') || '/');
    const [cardNumber, setCardNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const errorRef = useRef(null);
    const scanButtonRef = useRef(null);
    // Sent here because the server no longer accepted the saved login
    // (utils/sessionExpiry): said once, so it is not a mystery why they are
    // signing in again. Read on the first render; cleared below.
    const [sessionEnded] = useState(() => { try { return ['device', 'replaced'].includes(sessionStorage.getItem(SESSION_ENDED_KEY)) ? sessionStorage.getItem(SESSION_ENDED_KEY) : sessionStorage.getItem(SESSION_ENDED_KEY) === '1' || sessionStorage.getItem(TEACHER_SESSION_ENDED) === '1'; } catch { return false; } });
    useEffect(() => { try { sessionStorage.removeItem(SESSION_ENDED_KEY); sessionStorage.removeItem(TEACHER_SESSION_ENDED); } catch { /* storage off */ } }, []);

    /* One box for everyone (2026-10-30): the card number or the mobile
       number, and the password. The server says whose account it is — a
       student's, or a teacher's (then the teacher sign-in finishes it) — and
       the person lands on their own dashboard. No Student / Teacher choice. */
    /* Signing in by card.
       The number is printed on the card and twelve digits long, which is a
       tedious thing to copy correctly on a phone. The camera reads the card's
       QR instead and the server turns it into the number, so the student only
       has their password left to type. Typing the number by hand is still
       there for a broken camera or a worn card. A teacher with no AI card
       types the mobile number their organization added them with, in the
       same box — nobody signs in by email (2026-10-31). */
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedCard, setScannedCard] = useState(false);
    // Whose card the scan read, from the server.
    const [scannedName, setScannedName] = useState('');
    // A typed number, checked when the student moves on to the password:
    // 'checking' | 'error' (with cardCheckError) | '' — found is scannedCard.
    const [cardCheck, setCardCheck] = useState('');
    const [cardCheckError, setCardCheckError] = useState('');
    const checkedNumberRef = useRef('');
    // One box takes a card or a mobile number (2026-10-30), so only a plain
    // 12-digit entry is checked as a card; a number that is not a card (a
    // mobile, a teacher's card) is simply left for the sign-in to decide.
    const checkTypedCard = async () => {
        const number = cardNumber.trim();
        if (scanning || !number || scannedCard || checkedNumberRef.current === number) return;
        checkedNumberRef.current = number;
        if (!/^\d{12}$/.test(number)) return;
        setCardCheck('checking'); setCardCheckError('');
        try {
            const res = await api.post('/auth/card-scan', { code: number, typed: true });
            if (checkedNumberRef.current !== number) return;
            setScannedName(res.data?.name || '');
            setScannedCard(true);
            setCardCheck('');
        } catch {
            if (checkedNumberRef.current === number) setCardCheck('');
        }
    };
    const [showHow, setShowHow] = useState(false);
    const scannerRef = useRef(null);
    const passwordRef = useRef(null);
    const SCANNER_ID = 'login-card-scanner';

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

    // Hand the scanned code to the server, which answers with the card number.
    const resolveScan = async (decodedText) => {
        stopScanner();
        setScanning(false);
        setScanError('');
        setLoading(true);
        try {
            // A student's card answers here; a teacher's is read by the teacher side.
            let res;
            try { res = await api.post('/auth/card-scan', { code: decodedText }); }
            catch (err) {
                if (err.response?.data?.code !== 'TEACHER_CARD') throw err;
                res = await teacherApi.post('/auth/card-scan', { code: decodedText });
            }
            // A demo (presentation) card signs in by its scan alone: straight to the dashboard.
            if (res.data?.token && res.data?.role !== 'teacher') { enterApp(res.data, next); return; }
            setCardNumber(res.data.cardNumber);
            setScannedName(res.data.name || '');
            setScannedCard(true);
            setError('');
            setTimeout(() => passwordRef.current?.focus(), 60);
        } catch (err) {
            setScanError(
                err.response?.data?.message
                    || (!err.response
                        ? 'Could not reach the server to check that card. Make sure the server is running and you are online, then try again or type the number.'
                        : 'That card could not be read. Try again, or type the number.')
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        // The scanner library is fetched when the camera is first asked for,
        // not with the page: most sign-ins never open it.
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(SCANNER_ID);
            scannerRef.current = inst;
            return inst.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => { if (!cancelled) resolveScan(decodedText); },
                () => {}   // a frame without a code is not an error
            );
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
        });
        return () => { cancelled = true; stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    useEffect(() => () => stopScanner(), []);

    // Android's back button closes the "How it works" sheet, rather than leaving the page.
    useBackClose(() => setShowHow(false), showHow);

    // A new error is brought into view (role="alert" also reads it out).
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [error]);

    if (user) return <Navigate to={next} replace />;
    // A teacher is signed in on this device: their dashboard.
    if (hasTeacherSession()) return <Navigate to="/teacher" replace />;

    const failed = (message) => { setError(message); setLoading(false); passwordRef.current?.focus(); };
    const teacherSignIn = async (body) => {
        try { enterTeacher((await teacherApi.post('/auth/login', body)).data); }
        catch (err) { failed(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Sign-in failed')); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        // In scan mode there is no number box for the browser to insist on,
        // so an empty card went to the server and came back as "Invalid card
        // number or password" — about a password the student had typed right.
        const typed = cardNumber.trim();
        if (!typed) {
            setError('Enter your card number or mobile number, or scan your card.');
            document.getElementById('login-card-number')?.focus();
            return;
        }
        setLoading(true);
        const res = await login(typed, password, next);
        // On success the page is already on its way to the dashboard: the
        // button keeps saying so until it gets there.
        if (res.success) return;
        // A teacher's card or number: the teacher sign-in finishes it, and they land on their dashboard.
        if (res.code === 'TEACHER_CARD' || res.code === 'TEACHER_ACCOUNT') { await teacherSignIn({ login: typed, password }); return; }
        if (res.code === 'DEVICE_LIMIT' && res.device) { setDeviceConflict(res.device); setLoading(false); return; }
        failed(res.error);
    };

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#232840] via-[#1f2336] to-[#272240] p-4 text-slate-100 sm:p-6">
            {/* A soft dark backdrop with two quiet glows — nothing to compete with the form. */}
            <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
            <span aria-hidden className="pointer-events-none absolute -right-40 -bottom-48 -z-10 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-[120px]" />
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
            {showContact && <SupportDialog onClose={() => setShowContact(false)} page="login" tone="dark" />}
            {deviceConflict && (
                <DeviceLimitDialog conflict={deviceConflict} onClose={() => setDeviceConflict(null)}
                    onReplace={(removeId) => replaceDevice(deviceConflict.ticket, removeId, next)} />
            )}
            {showHow && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowHow(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()} className="lg-rise w-full max-w-md overflow-hidden rounded-3xl bg-[#2a2f45] shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.04] px-5 py-4">
                            <h3 id="how-title" className="flex items-center gap-2 font-bold text-slate-100"><QrCode size={17} className="text-indigo-300" /> Signing in with your card</h3>
                            <button type="button" onClick={() => setShowHow(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
                        </div>
                        <ol className="space-y-4 p-5">
                            {[
                                ['Tap the scan area', 'Your browser will ask to use the camera. Allow it.'],
                                ['Hold up your card', 'Point the QR code on the card at the camera. It reads in a second.'],
                                ['Enter your password', 'The card number fills itself in, so the password is all you type.']
                            ].map(([t, d], i) => (
                                <li key={t} className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">{i + 1}</span>
                                    <div><p className="font-bold text-slate-100">{t}</p><p className="text-sm text-slate-400">{d}</p></div>
                                </li>
                            ))}
                        </ol>
                        <div className="border-t border-white/5 px-5 py-4 text-right">
                            <button type="button" onClick={() => setShowHow(false)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Got it</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="lg-rise w-full max-w-[28rem] overflow-hidden rounded-3xl bg-[#2a2f45] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10">

                {/* ── Right: the sign-in card ──────────────────────────── */}
                <section className="relative px-6 py-8 sm:px-9 sm:py-9">
                    <div className="mx-auto max-w-md">
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            <img src="/assets/YATICORP.png" alt="YATICORP" className="mb-6 h-8 w-auto object-contain" />
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Welcome back</h2>
                            <p className="mt-1.5 text-sm text-slate-400">Sign in with your card number or mobile number.</p>
                        </div>

                        <form className="lg-rise mt-6 space-y-5" onSubmit={handleLogin} style={{ animationDelay: '0.2s' }}>
                            {sessionEnded && !error && (
                                <p role="status" className="flex items-start gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 p-3 text-sm font-medium text-indigo-200">
                                    <Info size={16} className="mt-0.5 shrink-0" /> {sessionEnded === 'device' ? 'This device was removed from your account (you can use only 2 devices). Sign in to choose your devices.' : sessionEnded === 'replaced' ? 'Your account was signed in on another device, so you were signed out here. Only one sign-in at a time is allowed.' : 'Your session has ended — please sign in again.'}
                                </p>
                            )}
                            {error && (
                                <div ref={errorRef} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-300">
                                    {error}
                                </div>
                            )}

                            {/* One standard form: the card number, with the scanner inside the field
                                (asked 2026-10-29) — no separate Scan / Type step. A teacher without a card
                                types their mobile number in the same box. */}
                                <div>
                                    <label htmlFor="login-card-number" className="mb-2 block text-sm font-semibold text-slate-200">Card or mobile number</label>
                                    <div className="relative">
                                        <input id="login-card-number" type="text" maxLength="20" inputMode="tel" autoComplete="username" value={cardNumber}
                                            onChange={e => { setCardNumber(e.target.value.replace(/[^0-9A-Za-z+()\s-]/g, '')); setScannedCard(false); setScannedName(''); setCardCheck(''); setCardCheckError(''); checkedNumberRef.current = ''; }}
                                            onBlur={checkTypedCard} aria-invalid={cardCheck === 'error'} aria-describedby={cardCheck === 'error' ? 'login-card-check' : undefined}
                                            className={`block w-full appearance-none rounded-xl border bg-black/15 py-3.5 pr-14 pl-4 font-mono tracking-[0.12em] text-slate-100 shadow-sm placeholder:font-sans placeholder:tracking-normal placeholder-slate-500 transition duration-200 focus:border-transparent focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${scannedCard ? 'border-emerald-400/40' : cardCheck === 'error' ? 'border-red-400/50' : 'border-white/10'}`}
                                            placeholder="Card number or mobile number" />
                                        {/* Scan, inside the field: the camera opens below and fills the number in. */}
                                        <button ref={scanButtonRef} type="button" disabled={loading}
                                            onClick={() => { setScanError(''); setError(''); setScanning((on) => !on); }}
                                            aria-label={scanning ? 'Stop scanning' : 'Scan your card'} aria-pressed={scanning} title={scanning ? 'Stop scanning' : 'Scan your card'}
                                            className={`absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 ${scanning ? 'bg-indigo-500 text-white' : 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30 hover:bg-indigo-500/25'}`}>
                                            {loading && !cardNumber ? <Loader2 size={18} className="animate-spin" /> : scanning ? <X size={18} /> : <ScanLine size={19} />}
                                        </button>
                                    </div>
                                    {scannedCard && <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={13} className="shrink-0" /> {scannedName ? <span className="truncate">Card of <span className="text-emerald-200">{scannedName}</span></span> : 'Card found'}</p>}
                                    {!scannedCard && cardCheck === 'checking' && <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Loader2 size={13} className="shrink-0 animate-spin" /> Checking card…</p>}
                                    {!scannedCard && cardCheck === 'error' && <p id="login-card-check" role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-300"><Info size={13} className="shrink-0" /> {cardCheckError}</p>}
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div className={scanning ? 'mt-3' : 'hidden'}>
                                        <div id={SCANNER_ID} className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10" />
                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                            <span className="text-slate-400">Hold the QR code on your card up to the camera.</span>
                                            <button type="button" onClick={() => setShowHow(true)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-indigo-300 hover:text-indigo-100"><PlayCircle size={13} /> How it works</button>
                                        </div>
                                    </div>
                                    {!scanning && <p className="mt-2 text-xs text-slate-400">Teacher without a card? Use the mobile number your organization added you with.</p>}
                                </div>

                            {scanError && (
                                <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
                                    <CameraOff size={14} className="mt-0.5 shrink-0" />
                                    <span>{scanError}</span>
                                </p>
                            )}

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="login-password" className="text-sm font-semibold text-slate-200">Password</label>
                                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold text-indigo-300 transition-colors hover:text-indigo-100 hover:underline">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative mt-2">
                                    <input
                                        ref={passwordRef}
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 focus:bg-white/[0.07] px-4 py-3.5 pr-12 text-slate-100 shadow-sm placeholder-slate-500 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter your password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0">
                                {loading ? 'Authenticating…' : 'Access Platform'}
                                {!loading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                            </button>
                        </form>

                        <button type="button" onClick={() => setShowContact(true)}
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-200 hover:bg-indigo-500/15" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-300">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2f45] ring-1 ring-white/10"><ChevronRight size={15} className="text-slate-400" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-400">
                            Don&apos;t have an account? <Link to={next === '/' ? '/signup' : `/signup?next=${encodeURIComponent(next)}`} className="font-bold text-indigo-300 hover:underline">Sign up here</Link>
                        </p>
                        <p className="mt-3 text-center text-[11px] text-slate-400">
                            <Link to="/terms" className="hover:text-indigo-200 hover:underline">Terms and Conditions</Link> · <Link to="/privacy" className="hover:text-indigo-200 hover:underline">Privacy Policy</Link>
                        </p>
                        {/* Inside the app the admin console travels in the same bundle, under
                            /admin/. On the website it is its own site, so no link here. */}
                        {isNative() && (
                            <p className="mt-3 text-center text-xs text-slate-400">
                                Staff? <a href="/admin/index.html" className="font-bold text-indigo-300 hover:underline">Admin sign in</a>
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
