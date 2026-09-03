/**
 * @description Guardian approval for minors, plus the safety and privacy
 *              notes every band gets. Four honest states — not asked,
 *              pending, approved, declined — and the request never leaves the
 *              LMS: a guardian's name is recorded, an operator confirms with
 *              them, and the status changes here.
 */
import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, XCircle, ChevronDown, Lock, Loader2 } from 'lucide-react';
import { opportunitiesApi } from './api';

const SafetyNotes = ({ rules }) => (
    <details className="group mt-3 rounded-xl border border-slate-200 bg-white/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl">
            <span className="inline-flex items-center gap-2"><Lock size={14} className="text-slate-400" aria-hidden="true" /> Safety information &amp; privacy notice</span>
            <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
            {rules?.verifiedOnly && <li>Only jobs from organisations the LMS has verified are shown to you.</li>}
            {!rules?.exposeContact && <li>Organisations never see your contact details, and you never see theirs. When you mark interest, the LMS passes it on{rules?.guardianApproval ? ' and copies your guardian' : ''}.</li>}
            {rules?.guardianApproval && <li>Every job here needs a parent or guardian's approval before anything is arranged.</li>}
            <li>Your date of birth is used only to decide which jobs you may see. It is never shown to an organisation.</li>
            <li>Your dates, interests and ♡ / ✕ choices stay in your account and only shape your own recommendations. You can edit or clear them any time.</li>
            <li>Anything that looks unsafe, asks for money, or asks to talk outside the LMS — use <strong>Report</strong> on the listing. Reports go to the LMS team.</li>
        </ul>
    </details>
);

export default function GuardianBanner({ rules, guardian, onGuardian }) {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);

    if (!rules) return null;

    if (!rules.guardianApproval) {
        return (
            <section aria-label="Safety" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />
                    {rules.band === 'explore' ? 'Local jobs open at 14. Until then, explore skills and career paths.' : 'Report anything that looks off — the LMS team reviews every report.'}
                </p>
                <SafetyNotes rules={rules} />
            </section>
        );
    }

    const request = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await opportunitiesApi.requestGuardian(name.trim());
            onGuardian(res.guardian);
            setOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const status = guardian?.status || 'none';
    const STATE = {
        none: { icon: ShieldAlert, tone: 'border-amber-200 bg-amber-50', text: 'text-amber-900', title: 'Guardian approval required', body: 'Every job here needs a parent or guardian to approve before anything is arranged. You can browse and mark interest now.' },
        pending: { icon: Clock, tone: 'border-sky-200 bg-sky-50', text: 'text-sky-900', title: 'Guardian approval pending', body: `We've noted ${guardian?.guardianName || 'your guardian'} as your guardian. The LMS team confirms with them and updates this — usually within a few days.` },
        approved: { icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-900', title: 'Guardian approved', body: `${guardian?.guardianName || 'Your guardian'} has approved supervised local jobs for you. Organisations are still contacted through the LMS.` },
        rejected: { icon: XCircle, tone: 'border-rose-200 bg-rose-50', text: 'text-rose-900', title: 'Guardian has not approved yet', body: guardian?.note || 'Your guardian did not approve local jobs for now. You can ask again when that changes.' }
    }[status] || {};
    const Icon = STATE.icon;

    return (
        <section aria-label="Guardian approval" className={`rounded-2xl border p-4 ${STATE.tone}`}>
            <div className="flex flex-wrap items-start gap-3">
                <Icon size={22} className={`mt-0.5 shrink-0 ${STATE.text}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className={`font-bold ${STATE.text}`}>🛡 {STATE.title}</p>
                    <p className="mt-0.5 text-sm text-slate-700">{STATE.body}</p>
                </div>
                {(status === 'none' || status === 'rejected') && !open && (
                    <button type="button" onClick={() => setOpen(true)}
                        className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60">
                        {status === 'rejected' ? 'Request again' : 'Request approval'}
                    </button>
                )}
            </div>

            {open && (
                <form onSubmit={request} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-white/70 bg-white/70 p-3">
                    <div className="min-w-[200px] flex-1">
                        <label htmlFor="opp-guardian-name" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Parent or guardian's name</label>
                        <input id="opp-guardian-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="e.g. Priya Sharma" />
                    </div>
                    <button type="submit" disabled={busy || !name.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {busy && <Loader2 size={14} className="animate-spin" />} Send request
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white">Cancel</button>
                    {error && <p className="w-full text-xs text-rose-600">{error}</p>}
                    <p className="w-full text-xs text-slate-500">No contact details are collected here. The LMS team reaches your guardian through the details your school registered.</p>
                </form>
            )}

            <SafetyNotes rules={rules} />
        </section>
    );
}
