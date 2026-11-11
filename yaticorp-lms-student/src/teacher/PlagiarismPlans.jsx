/**
 * The plagiarism check's plans (2026-11-04), as one slim strip. Free is the
 * check this page runs: against writing on YATICORP and the papers the
 * teacher uploaded, with citation flags and a PDF report, on our own server,
 * so it costs nothing per check. Pro needs an outside checking service
 * (internet and journal coverage) and is shown as coming soon: no button,
 * because there is nothing to buy yet.
 */
import { Check, Sparkles, Globe2, ShieldCheck } from 'lucide-react';

const FREE = ['YATICORP writing', 'Your uploaded papers', 'Open research papers', 'Wikipedia', 'Citation flags', 'PDF report'];

export default function PlagiarismPlans() {
    return (
        <section aria-label="Your plan" className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Free: the plan in use. */}
            <div className="flex items-center gap-3 p-3.5 sm:p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"><ShieldCheck size={19} aria-hidden="true" /></span>
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        Free plan <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</span>
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {FREE.map((t) => (
                            <li key={t} className="flex items-center gap-1 text-xs text-slate-600"><Check size={12} strokeWidth={3} aria-hidden="true" className="text-indigo-600" />{t}</li>
                        ))}
                    </ul>
                </div>
            </div>
            {/* Pro: what comes next. */}
            <div className="flex items-center gap-3 border-t border-slate-100 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-white p-3.5 sm:p-4 md:border-l md:border-t-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-amber-200"><Globe2 size={19} aria-hidden="true" /></span>
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        Pro <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800"><Sparkles size={10} aria-hidden="true" />Coming soon</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Adds the whole internet and paywalled journals.</p>
                </div>
            </div>
        </section>
    );
}
