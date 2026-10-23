/**
 * Building blocks shared by the teacher pages: headers, cards, tiles, a modal,
 * form fields, a progress bar, and autosave for the writing editors.
 * Emerald is the teacher side's colour, as indigo is the student side's.
 */
import { useEffect } from 'react';
import { Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import Portal from '../components/Portal';
import useBackClose from '../native/useBackClose';

export const PageHeader = ({ icon: Icon, title, subtitle, actions, tone = 'from-emerald-500 to-teal-600' }) => (
    <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
            {Icon && <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}><Icon size={22} aria-hidden="true" /></span>}
            <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
);

export const Card = ({ className = '', children, ...rest }) => (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`} {...rest}>{children}</section>
);

export const CardTitle = ({ icon: Icon, children, right }) => (
    <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900 sm:text-base">{Icon && <Icon size={17} className="shrink-0 text-emerald-600" aria-hidden="true" />}<span className="truncate">{children}</span></h2>
        {right}
    </div>
);

export const StatTile = ({ icon: Icon, label, value, sub, tone = 'bg-emerald-50 text-emerald-600' }) => (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        {Icon && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={19} aria-hidden="true" /></span>}
        <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
            <p className="text-lg font-black leading-tight text-slate-900">{value}</p>
            {sub && <p className="truncate text-[11px] font-semibold text-slate-400">{sub}</p>}
        </div>
    </div>
);

export const Progress = ({ value = 0, tone = 'bg-emerald-500', label }) => {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

export const EmptyState = ({ icon: Icon, title, children, action }) => (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        {Icon && <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon size={26} aria-hidden="true" /></span>}
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        {children && <p className="mt-1 max-w-md text-sm text-slate-500">{children}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export const Loading = ({ label = 'Loading…' }) => (
    <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500" role="status">
        <Loader2 size={18} className="animate-spin text-emerald-600" aria-hidden="true" /> {label}
    </div>
);

export const ErrorNote = ({ children, onRetry }) => (children ? (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        <AlertCircle size={16} className="shrink-0" aria-hidden="true" /> <span className="min-w-0 flex-1">{children}</span>
        {onRetry && <button type="button" onClick={onRetry} className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100">Try again</button>}
    </div>
) : null);

export const OkNote = ({ children }) => (children ? (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" /> {children}
    </div>
) : null);

export const Field = ({ id, label, hint, error, children, optional }) => (
    <div className="min-w-0">
        <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-600">{label}{optional && <span className="font-normal text-slate-400"> (optional)</span>}</label>
        {children}
        {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
);

/** A dialog: Escape, the back button and a tap outside close it. */
export const Modal = ({ title, onClose, children, footer, wide = false, labelId = 'teacher-modal-title' }) => {
    useBackClose(onClose);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <Portal>
            <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
                <div role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()}
                    className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                        <h2 id={labelId} className="min-w-0 truncate text-base font-black text-slate-900">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={18} /></button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                    {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
                </div>
            </div>
        </Portal>
    );
};

export const Badge = ({ children, tone = 'bg-slate-100 text-slate-600' }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{children}</span>
);

export const SaveStatus = ({ status }) => {
    const map = {
        idle: ['', 'text-slate-400'],
        pending: ['Unsaved changes', 'text-amber-600'],
        saving: ['Saving…', 'text-slate-500'],
        saved: [status.at ? `Saved ${status.at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Saved', 'text-emerald-600'],
        error: [status.error || 'Could not save', 'text-red-600']
    };
    const [label, tone] = map[status.state] || map.idle;
    return <span role="status" aria-live="polite" className={`text-xs font-semibold ${tone}`}>{label}</span>;
};
