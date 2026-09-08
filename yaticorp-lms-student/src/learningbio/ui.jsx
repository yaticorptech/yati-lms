/** Small shared pieces for the Learning Bio card and page. */
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export const Section = ({ id, icon: Icon, title, hint, action, children }) => (
    <section id={id} className="lift rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 animate-fade-in-up">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">{Icon && <Icon size={19} className="text-indigo-600" />} {title}</h2>
                {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

export const Btn = ({ children, icon: Icon, tone = 'ghost', loading, className = '', ...rest }) => (
    <button type="button" {...rest} disabled={rest.disabled || loading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60 ${
            tone === 'primary' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-lg'
                : tone === 'danger' ? 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                    : 'border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'} ${className}`}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : Icon && <Icon size={15} />}{children}
    </button>
);

export const ErrorBox = ({ error, onRetry }) => error ? (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <AlertCircle size={17} className="mt-0.5 shrink-0" />
        <div className="flex-1"><p className="font-semibold">{error.message || "We couldn't generate your bio right now."}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-1 text-xs font-bold underline">Try again</button>}</div>
    </div>
) : null;

export const Empty = ({ icon: Icon = Sparkles, title, children }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
        <Icon size={22} className="mx-auto text-slate-400" />
        <p className="mt-2 text-sm font-bold text-slate-700">{title}</p>
        {children && <p className="mt-1 text-xs text-slate-500">{children}</p>}
    </div>
);

export const Avatar = ({ src, name, size = 'h-16 w-16' }) => (
    <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-md ring-2 ring-white`}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (name || '?').trim().charAt(0).toUpperCase()}
    </span>
);

/** "Analyzing your learning journey…" while the first load runs. */
export const Analyzing = ({ label = 'Analyzing your learning journey…' }) => (
    <div className="space-y-4" aria-busy="true">
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-700"><Loader2 size={15} className="animate-spin" /> {label}</p>
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
    </div>
);
