/**
 * Step 1 — Aadhaar. Screens by server state: intro → scanner → QR validated
 * (card summary + linked mobile) → OTP → verified. Every arrow is a server
 * answer; the OTP lives in local state only while the boxes are on screen.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { ShieldCheck, ScanLine, Smartphone, QrCode, Lock, RefreshCw, CreditCard, Info } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { verificationApi } from './api';
import { FIELD_INPUT, FIELD_OK, FIELD_BAD } from '../ui';
import AadhaarScanner from './AadhaarScanner';
import OtpInput from './OtpInput';
import { Card, Heading, PrimaryButton, SecondaryButton, ErrorNotice, Reassurance, SuccessMark, MockNotice } from './ui';
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const useCountdown = (until) => { const target = until ? new Date(until).getTime() : 0; const [now, setNow] = useState(() => Date.now()); useEffect(() => { if (!target) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [target]); return target ? target - now : 0; };
const tenDigits = (raw) => String(raw || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '').slice(0, 10);

export default function IdentityStep({ view, onView, onContinue }) {
    const { user } = useContext(AuthContext) || {};
    const identity = view.steps.identity; const verified = identity.status === 'VERIFIED';
    const [scanning, setScanning] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
    const [otp, setOtp] = useState(''); const [otpProblem, setOtpProblem] = useState(null);
    const [mobile, setMobile] = useState(() => tenDigits(user?.phone)); const [mobileProblem, setMobileProblem] = useState('');
    const screen = verified ? 'verified' : scanning ? 'scanner' : view.state === 'AADHAAR_QR_VALIDATED' ? 'qr' : view.state === 'OTP_SENT' ? 'otp' : 'intro';
    const run = async (call) => { setBusy(true); setError(null); try { const n = await call(); onView(n); return n; } catch (e) { setError(e); return null; } finally { setBusy(false); } };
    const onScan = useCallback(async (payload) => { setBusy(true); setError(null); try { if (view.state === 'NOT_STARTED') await verificationApi.identityStart(); onView(await verificationApi.identityQr(payload)); } catch (e) { setError(e); } finally { setScanning(false); setBusy(false); } }, [view, onView]);
    const startScan = async () => { setError(null); if (view.state === 'NOT_STARTED') { const n = await run(() => verificationApi.identityStart()); if (!n) return; } setScanning(true); };
    const otpMeta = identity.otp; const expiresIn = useCountdown(otpMeta?.expiresAt); const resendIn = useCountdown(otpMeta?.resendAvailableAt); const expired = screen === 'otp' && (!otpMeta || expiresIn <= 0);
    const mobileOk = /^[6-9]\d{9}$/.test(mobile);
    const sendOtp = async () => { if (identity.requiresMobile && !mobileOk) { setMobileProblem('Enter the 10-digit mobile number linked with your Aadhaar.'); return; } setOtp(''); setOtpProblem(null); setMobileProblem(''); setBusy(true); setError(null); try { onView(await verificationApi.otpSend(identity.requiresMobile ? mobile : undefined)); } catch (e) { if (e.code === 'MOBILE_MISMATCH' || e.code === 'MOBILE_REQUIRED') setMobileProblem(e.message); else setError(e); } finally { setBusy(false); } };
    const verifyOtp = async (code = otp) => { if (code.length !== 6 || busy) return; setBusy(true); setError(null); setOtpProblem(null); try { const n = await verificationApi.otpVerify(code); setOtp(''); onView(n); } catch (e) { setOtp(''); if (e.code === 'INVALID_OTP') setOtpProblem({ message: `${e.message}${e.attemptsLeft !== undefined ? ` ${e.attemptsLeft} attempt${e.attemptsLeft === 1 ? '' : 's'} left.` : ''}` }); else if (e.code === 'OTP_EXPIRED') setOtpProblem({ message: 'This code has expired. Request a new one.', expired: true }); else if (e.code === 'TOO_MANY_ATTEMPTS') setOtpProblem({ message: 'Too many wrong codes. Request a new one.', expired: true }); else setError(e); } finally { setBusy(false); } };

    if (screen === 'scanner') return (<Card><AadhaarScanner onScan={onScan} onCancel={() => setScanning(false)} busy={busy} />{identity.providerIsMock && <MockNotice>Mock provider: any QR reading <code className="font-mono">MOCK-AADHAAR:Your Name:9876543210</code> is accepted.</MockNotice>}</Card>);
    if (screen === 'verified') return (<Card className="animate-fade-in-up"><SuccessMark label="Aadhaar Verified" /><p className="mt-2 text-center text-sm text-slate-500">Your identity has been successfully verified.</p><ErrorNotice error={error} /><PrimaryButton className="mt-6" onClick={() => run(onContinue)} loading={busy} loadingText="Continuing…">Continue</PrimaryButton></Card>);
    if (screen === 'qr') return (
        <Card className="animate-fade-in-up">
            <SuccessMark label="Aadhaar QR Scanned" /><p className="mt-2 text-center text-sm text-slate-500">Aadhaar information has been securely validated.</p>
            {identity.card && (<div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 ring-1 ring-indigo-100"><CreditCard size={20} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{identity.card.name}</p><p className="font-mono text-sm tracking-widest text-slate-600">XXXX XXXX {identity.card.last4}</p></div></div>)}
            {identity.requiresMobile ? (
                <div className="mt-5"><label htmlFor="jv-mobile" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Smartphone size={15} className="text-slate-500" /> Mobile number linked with your Aadhaar</label>
                    <div className={`${FIELD_INPUT} flex items-center gap-2 p-0 ${mobileProblem ? FIELD_BAD : FIELD_OK}`}><span className="pl-4 text-sm font-bold text-slate-500">+91</span><input id="jv-mobile" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={mobile} onChange={(e) => { setMobile(tenDigits(e.target.value)); setMobileProblem(''); }} aria-invalid={!!mobileProblem} className="w-full bg-transparent py-3 pr-4 tracking-wider outline-none" /></div>
                    <p className="mt-1.5 text-xs" aria-live="polite">{mobileProblem ? <span className="font-semibold text-rose-600">{mobileProblem}</span> : identity.card?.mobileLinked === false ? <span className="text-amber-700">This card&apos;s QR gives us no mobile record to check against, so the code goes to the number you enter.</span> : <span className="text-slate-500">We check this number against the record inside your Aadhaar QR{identity.maskedMobile ? <> (ending <span className="font-mono">{identity.maskedMobile.slice(-4)}</span>)</> : ''}, then send the code to it.</span>}</p>
                </div>
            ) : (<div className="mt-5 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900"><Smartphone size={18} className="mt-0.5 shrink-0 text-indigo-600" /><p>We will now send a verification OTP to the Aadhaar-linked mobile number{identity.maskedMobile ? <>, <span className="font-mono font-bold">{identity.maskedMobile}</span></> : ''}.</p></div>)}
            <ErrorNotice error={error} onRetry={sendOtp} />
            <PrimaryButton className="mt-6" onClick={sendOtp} disabled={identity.requiresMobile && !mobileOk} loading={busy} loadingText="Sending…" icon={Smartphone}>Send Verification OTP</PrimaryButton>
            <button type="button" onClick={startScan} className="mt-3 w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600">Scan a different card</button>
        </Card>
    );
    if (screen === 'otp') return (
        <Card className="animate-fade-in-up">
            <Heading icon={Smartphone} title="Verify Your Mobile">A verification code has been sent to the mobile number linked with your Aadhaar{identity.maskedMobile ? <>: <span className="font-mono font-bold text-slate-700">{identity.maskedMobile}</span></> : ''}.</Heading>
            {otpMeta?.simulated && <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900"><Info size={14} className="mt-0.5 shrink-0" /><p><span className="font-bold">Test mode:</span> no SMS provider is configured on the server, so the code was written to the server log instead of being sent.</p></div>}
            <p className="mb-3 text-center text-sm font-semibold text-slate-700">Enter 6-digit OTP</p>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpProblem(null); }} disabled={busy || expired} invalid={!!otpProblem} onComplete={(c) => verifyOtp(c)} />
            <p className="mt-3 min-h-5 text-center text-sm" aria-live="polite">{otpProblem ? <span className="font-semibold text-rose-600">{otpProblem.message}</span> : expired ? <span className="font-semibold text-rose-600">This code has expired. Request a new one.</span> : <span className="text-slate-500">OTP expires in <span className="font-mono font-bold text-slate-700">{mmss(expiresIn)}</span></span>}</p>
            <ErrorNotice error={error} />
            <PrimaryButton className="mt-5" onClick={() => verifyOtp()} disabled={otp.length !== 6 || expired || otpProblem?.expired} loading={busy} loadingText="Verifying…" icon={ShieldCheck}>Verify &amp; Continue</PrimaryButton>
            <div className="mt-5 text-center text-sm text-slate-500"><p>Didn&apos;t receive the code?</p><SecondaryButton className="mt-2" icon={RefreshCw} onClick={sendOtp} disabled={busy || (resendIn > 0 && !expired && !otpProblem?.expired) || (otpMeta && otpMeta.resendsLeft === 0)}>{resendIn > 0 && !expired && !otpProblem?.expired ? `Resend OTP in ${Math.ceil(resendIn / 1000)}s` : 'Resend OTP'}</SecondaryButton>{otpMeta && otpMeta.resendsLeft === 0 && <p className="mt-2 text-xs text-slate-400">No resends left. Scan your Aadhaar again to start over.</p>}</div>
            {identity.providerIsMock && <MockNotice>Mock provider: the OTP is the fixed code AADHAAR_MOCK_OTP (default 123456). No SMS is sent.</MockNotice>}
            <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-slate-500">{identity.requiresMobile && <button type="button" onClick={() => onView({ ...view, state: 'AADHAAR_QR_VALIDATED' })} className="hover:text-indigo-600">Change mobile number</button>}<button type="button" onClick={startScan} className="hover:text-indigo-600">Scan a different card</button></div>
        </Card>
    );
    return (
        <Card className="animate-fade-in-up">
            <Heading icon={Lock} title="Verify Your Identity">To access personalized job opportunities, complete your identity verification.</Heading>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><ShieldCheck size={15} /> Aadhaar Verification</p>
                <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white p-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100"><QrCode size={30} /></span><p className="mt-3 text-base font-bold text-slate-900">Scan Aadhaar Card</p><p className="mt-1 text-xs text-slate-500">Hold the Secure QR code on your Aadhaar card up to the camera.</p><SecondaryButton className="mt-4" icon={ScanLine} onClick={startScan} disabled={busy}>Scan Aadhaar</SecondaryButton></div>
                <p className="mt-4 text-xs text-slate-500">Your Aadhaar information is used only for identity verification.</p>
                <Reassurance items={['Secure verification', 'No unnecessary Aadhaar data storage', 'Protected user information']} />
            </div>
            <ErrorNotice error={error} onRetry={error?.code === 'PROVIDER_UNAVAILABLE' ? undefined : startScan} />
            {identity.providerIsMock && <MockNotice>The identity provider is the development mock. Nothing is verified against UIDAI.</MockNotice>}
            <PrimaryButton className="mt-6" disabled title="Scan your Aadhaar card to continue">Continue</PrimaryButton>
            <p className="mt-2 text-center text-xs text-slate-400">Scan your Aadhaar card to continue.</p>
        </Card>
    );
}
