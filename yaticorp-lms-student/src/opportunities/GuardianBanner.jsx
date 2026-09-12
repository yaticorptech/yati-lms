/**
 * @description The safety and privacy notes every age band gets, and — for a
 *              student young enough to need one — a plain word about guardian
 *              permission.
 *
 * Permission itself is no longer asked for here. It is asked per job, when the
 * student applies, and answered by the guardian on their own page; see
 * application/ApplyFlow.jsx. This banner only says that it will be asked, so
 * nothing on the board promises an approval that never arrives.
 */
import { ShieldCheck, ShieldAlert, Lock, ChevronDown } from 'lucide-react';

const SafetyNotes = ({ rules }) => (
    <details className="group mt-3 rounded-xl border border-slate-200 bg-white/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl">
            <span className="inline-flex items-center gap-2"><Lock size={14} className="text-slate-400" aria-hidden="true" /> Safety information &amp; privacy notice</span>
            <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
            {rules?.verifiedOnly && <li>Only jobs from organisations the LMS has verified are shown to you.</li>}
            {!rules?.exposeContact && <li>Organisations never see your contact details, and you never see theirs. When you mark interest, the LMS passes it on{rules?.guardianApproval ? ' and copies your guardian' : ''}.</li>}
            {rules?.guardianApproval && <li>Applying for a job emails your parent or guardian the job's details. They answer, then your school signs it off. Nothing is arranged until both have.</li>}
            <li>Your date of birth is used only to decide which jobs you may see. It is never shown to an organisation.</li>
            <li>Your dates, interests and ♡ / ✕ choices stay in your account and only shape your own recommendations. You can edit or clear them any time.</li>
            <li>Anything that looks unsafe, asks for money, or asks to talk outside the LMS — use <strong>Report</strong> on the listing. Reports go to the LMS team.</li>
        </ul>
    </details>
);

export default function GuardianBanner({ rules }) {
    if (!rules) return null;

    if (!rules.guardianApproval) {
        return (
            <section aria-label="Safety" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ShieldCheck size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
                    {rules.band === 'explore'
                        ? 'Local jobs open at 14. Until then, explore skills and career paths.'
                        : 'Report anything that looks off — the LMS team reviews every report.'}
                </p>
                <SafetyNotes rules={rules} />
            </section>
        );
    }

    return (
        <section aria-label="Guardian approval" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start gap-3">
                <ShieldAlert size={22} className="mt-0.5 shrink-0 text-amber-900" aria-hidden="true" />
                <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-amber-900">A parent or guardian has to agree first</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-700">
                        Browse and mark interest freely. When you apply for a job, we ask your
                        parent or guardian for permission for that job — they get an email with the
                        details and answer it themselves.
                    </p>
                </div>
            </div>
            <SafetyNotes rules={rules} />
        </section>
    );
}
