/**
 * @description The safety and privacy notes every age band gets, and — for a
 *              student young enough to need one — a plain word about guardian
 *              permission.
 *
 * One small shield in the part-time board's top row, with a reflection that
 * keeps crossing it, and the notes in a popup behind it (the account owner's
 * call, 2026-10-02: the full-width amber notice took a whole band of the
 * board for something read once). Amber when a parent or guardian has to
 * agree, green otherwise.
 *
 * Permission itself is not asked for here. It is asked per job, when the
 * student applies, and answered by the guardian on their own page; see
 * application/ApplyFlow.jsx. This only says that it will be asked, so nothing
 * on the board promises an approval that never arrives.
 */
import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, X } from 'lucide-react';
import Portal from '../components/Portal';

const SafetyNotes = ({ rules }) => (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-600 sm:space-y-2 sm:text-sm">
        {rules?.verifiedOnly && <li>Only jobs from organisations the LMS has verified are shown to you.</li>}
        {!rules?.exposeContact && <li>Organisations never see your contact details, and you never see theirs. When you mark interest, the LMS passes it on{rules?.guardianApproval ? ' and copies your guardian' : ''}.</li>}
        {rules?.guardianApproval
            ? <li>For students under {rules.guardianAge || 18}: applying for a job emails your parent or guardian the job's details. They answer, then your school signs it off. Nothing is arranged until both have.</li>
            // Said to everyone, not only to the students it applies to (the
            // account owner's call, 2026-10-02).
            : <li>For students under {rules?.guardianAge || 18}: a parent or guardian has to agree before they take a job. Applying emails the parent the job's details; they answer, then the school signs it off. You are {rules?.guardianAge || 18} or over, so you can apply straight away.</li>}
        <li>Your date of birth is used only to decide which jobs you may see. It is never shown to an organisation.</li>
        <li>Your dates, interests and ♡ / ✕ choices stay in your account and only shape your own recommendations. You can edit or clear them any time.</li>
        <li>Anything that looks unsafe, asks for money, or asks to talk outside the LMS — use <strong>Report</strong> on the listing. Reports go to the LMS team.</li>
    </ul>
);

export default function GuardianBanner({ rules }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    if (!rules) return null;
    const guardian = !!rules.guardianApproval;
    // The age the server applies the rule under (18), said in so many words:
    // the popup only appears for a student under it, and should say why.
    const under = rules.guardianAge || 18;
    const Icon = guardian ? ShieldAlert : ShieldCheck;
    const title = guardian
        ? `You're under ${under} — a parent or guardian has to agree first`
        : rules.band === 'explore' ? 'Local jobs open at 14' : 'Staying safe on the board';
    const tone = guardian
        ? { button: 'border-amber-200 bg-amber-50 text-amber-600 focus-visible:ring-amber-400', tile: 'bg-amber-100 text-amber-700' }
        : { button: 'border-emerald-200 bg-emerald-50 text-emerald-600 focus-visible:ring-emerald-400', tile: 'bg-emerald-100 text-emerald-700' };

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} data-guardian-info aria-haspopup="dialog"
                aria-label={`${title}: safety and privacy`} title={title}
                className={`shine-loop inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 ${tone.button}`}>
                <Icon size={21} aria-hidden="true" className="relative" />
            </button>

            {open && (
                <Portal>
                    {/* Smaller on a phone (the account owner's call, 2026-10-02):
                        a narrower card, smaller type and less padding. */}
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm animate-fade-in sm:p-4" onClick={() => setOpen(false)}>
                        <div role="dialog" aria-modal="true" aria-labelledby="guardian-info-title" onClick={(e) => e.stopPropagation()}
                            className="flex max-h-[80dvh] w-full max-w-[22rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in sm:max-h-[85dvh] sm:max-w-md sm:rounded-3xl">
                            <div className="flex items-start gap-2.5 border-b border-slate-100 px-4 pb-3 pt-4 sm:gap-3 sm:px-5 sm:pb-4 sm:pt-5">
                                <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${tone.tile}`}><Icon size={20} /></span>
                                <div className="min-w-0 flex-1">
                                    <h3 id="guardian-info-title" className="text-[15px] font-bold leading-snug text-slate-900 sm:text-base">{title}</h3>
                                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                                        {guardian
                                            ? `Because you're under ${under}, a parent or guardian has to agree before you take a job. Browse and mark interest freely — when you apply for one, we ask them for permission for that job, and they get an email with the details and answer it themselves.`
                                            : rules.band === 'explore'
                                                ? 'Until then, explore skills and career paths.'
                                                : `Students under ${under} need a parent or guardian to agree before they take a job. Report anything that looks off — the LMS team reviews every report.`}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                                    className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
                                <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:mb-2.5 sm:text-[11px] sm:tracking-[0.14em]">
                                    <Lock size={13} aria-hidden="true" /> Safety information &amp; privacy notice
                                </p>
                                <SafetyNotes rules={rules} />
                            </div>
                            <div className="border-t border-slate-100 px-4 py-2.5 text-right sm:px-5 sm:py-3">
                                <button type="button" onClick={() => setOpen(false)}
                                    className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-bold sm:px-5 sm:py-2 text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">Got it</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}
