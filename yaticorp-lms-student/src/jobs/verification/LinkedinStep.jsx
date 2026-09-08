/** Step 2 — the LinkedIn profile URL, typed by the student: form → checking → added. "Added", never "verified": a URL proves no ownership. */
import { useEffect, useState } from 'react';
import { Linkedin, Lock, CheckCircle2, AlertTriangle, Search, Link2 } from 'lucide-react';
import { verificationApi, checkLinkedinUrl } from './api';
import { FIELD_INPUT, FIELD_OK, FIELD_BAD } from '../ui';
import { Card, Heading, PrimaryButton, ErrorNotice, SuccessMark } from './ui';
const MIN_CHECK_MS = 900;
export default function LinkedinStep({ view, onView, onContinue }) {
    const li = view.steps.linkedin;
    const [url, setUrl] = useState(li.profileUrl || ''); const [touched, setTouched] = useState(false); const [editing, setEditing] = useState(li.status !== 'ADDED');
    const [checking, setChecking] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [serverProblem, setServerProblem] = useState('');
    useEffect(() => { if (li.status === 'ADDED' && !editing) setUrl(li.profileUrl); }, [li.status, li.profileUrl, editing]);
    const check = checkLinkedinUrl(url); const showState = touched && url.length > 0;
    const submit = async (e) => { e.preventDefault(); setTouched(true); setServerProblem(''); setError(null); if (!check.ok) return; setChecking(true); const t0 = Date.now(); try { const n = await verificationApi.linkedin(url.trim()); const wait = MIN_CHECK_MS - (Date.now() - t0); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); onView(n); setEditing(false); } catch (err) { if (err.problems?.linkedinUrl) setServerProblem(err.problems.linkedinUrl); else setError(err); } finally { setChecking(false); } };
    const cont = async () => { setBusy(true); setError(null); try { onView(await onContinue()); } catch (e) { setError(e); } finally { setBusy(false); } };
    if (checking) return (<Card className="animate-fade-in-up"><div className="flex flex-col items-center py-6 text-center"><span className="relative flex h-20 w-20 items-center justify-center"><span className="absolute inset-0 animate-ping rounded-full bg-indigo-100" /><span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Search size={28} className="animate-pulse" /></span></span><p className="mt-5 text-xl font-extrabold text-slate-900">Checking LinkedIn Profile…</p><p className="mt-1 text-sm text-slate-500">Validating your LinkedIn profile URL.</p></div></Card>);
    if (li.status === 'ADDED' && !editing) return (<Card className="animate-fade-in-up"><SuccessMark label="LinkedIn Profile Added" /><p className="mt-2 text-center text-sm text-slate-500">Your LinkedIn profile has been added successfully.</p><a href={li.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Link2 size={16} /> {li.profileUrl.replace(/^https?:\/\/(www\.)?/, '')}</a><p className="mt-2 text-center text-xs text-slate-400">The link format was checked. Ownership of the profile is not verified.</p><ErrorNotice error={error} /><PrimaryButton className="mt-6" onClick={cont} loading={busy} loadingText="Continuing…">Continue</PrimaryButton><button type="button" onClick={() => { setEditing(true); setTouched(false); }} className="mt-3 w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600">Use a different profile</button></Card>);
    return (
        <Card className="animate-fade-in-up">
            <Heading icon={Linkedin} title="LinkedIn Profile">Add your LinkedIn profile to improve your job recommendations and professional profile.</Heading>
            <form onSubmit={submit} noValidate>
                <label htmlFor="jv-linkedin" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">LinkedIn Profile URL</label>
                <input id="jv-linkedin" type="url" inputMode="url" autoComplete="url" placeholder="https://www.linkedin.com/in/your-name" value={url} onChange={(e) => { setUrl(e.target.value); setTouched(true); setServerProblem(''); }} onBlur={() => setTouched(true)} aria-invalid={showState && !check.ok} className={`${FIELD_INPUT} py-3 ${showState ? (check.ok && !serverProblem ? `${FIELD_OK} border-emerald-400` : FIELD_BAD) : FIELD_OK}`} />
                <p className="mt-2 min-h-5 text-sm" aria-live="polite">{serverProblem ? <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600"><AlertTriangle size={14} /> {serverProblem}</span> : showState ? (check.ok ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><CheckCircle2 size={14} /> Valid LinkedIn profile URL</span> : <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600"><AlertTriangle size={14} /> {check.message}</span>) : <span className="text-slate-400">Example: https://www.linkedin.com/in/john-doe</span>}</p>
                <ErrorNotice error={error} />
                <PrimaryButton type="submit" className="mt-5" disabled={!check.ok} icon={Search}>Verify LinkedIn</PrimaryButton>
            </form>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500"><Lock size={13} /> Your profile information is handled securely.</p>
            {li.status === 'ADDED' && <button type="button" onClick={() => setEditing(false)} className="mt-3 w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600">Keep the profile I already added</button>}
        </Card>
    );
}
