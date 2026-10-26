/**
 * Building blocks shared by the teacher pages: headers, cards, tiles, a modal,
 * form fields, a progress bar, and autosave for the writing editors.
 * Emerald is the teacher side's colour, as indigo is the student side's; each
 * section also has its own (kit.js COLORS), passed as `color`.
 */
import { useEffect } from 'react';
import { Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import Portal from '../components/Portal';
import ProfileImage from '../components/ProfileImage';
import { colorOf, initialsOf } from './kit';
import useBackClose from '../native/useBackClose';

export const PageHeader = ({ icon: Icon, title, subtitle, actions, color }) => (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div className="flex min-w-0 items-center gap-3.5">
            {Icon && <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${colorOf(color).solid}`}><Icon size={20} aria-hidden="true" /></span>}
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
);

export const Card = ({ className = '', children, ...rest }) => (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 ${className}`} {...rest}>{children}</section>
);

export const CardTitle = ({ icon: Icon, children, right, color }) => (
    <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold text-slate-900">{Icon && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorOf(color).soft}`}><Icon size={15} aria-hidden="true" /></span>}<span className="truncate">{children}</span></h2>
        {right}
    </div>
);

// A figure with its label: a coloured line on top, the label and the
// section's icon, then the number large.
export const StatTile = ({ icon: Icon, label, value, sub, color }) => (
    <div className={`flex h-full min-w-0 flex-col rounded-xl border border-t-[3px] border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${colorOf(color).top}`}>
        <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
            {Icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorOf(color).soft}`}><Icon size={16} aria-hidden="true" /></span>}
        </div>
        <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{value}</p>
        {/* Wraps rather than being cut off ("2 in review · 8…" on a phone). */}
        {sub && <p className="mt-1.5 text-xs leading-snug text-slate-500">{sub}</p>}
    </div>
);

export const Progress = ({ value = 0, tone = 'bg-emerald-600', label }) => {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

export const EmptyState = ({ icon: Icon, title, children, action, color }) => (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        {Icon && <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${colorOf(color).soft}`}><Icon size={22} aria-hidden="true" /></span>}
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
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
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        <AlertCircle size={16} className="shrink-0" aria-hidden="true" /> <span className="min-w-0 flex-1">{children}</span>
        {onRetry && <button type="button" onClick={onRetry} className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Try again</button>}
    </div>
) : null);

export const OkNote = ({ children }) => (children ? (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" /> {children}
    </div>
) : null);

export const Field = ({ id, label, hint, error, children, optional }) => (
    <div className="min-w-0">
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}{optional && <span className="font-normal text-slate-400"> (optional)</span>}</label>
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
            {/* In the middle of the screen on every size (the user's ask, 2026-10-24),
                not a sheet from the bottom on a phone. */}
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onClick={onClose}>
                <div role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()}
                    className={`flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                        <h2 id={labelId} className="min-w-0 truncate text-base font-semibold text-slate-900">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                    {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3">{footer}</div>}
                </div>
            </div>
        </Portal>
    );
};

/** The teacher's photo, or their initials on emerald when there is none (or it will not load). */
export const TeacherAvatar = ({ teacher, className = 'h-9 w-9 text-xs' }) => (
    <ProfileImage src={teacher?.profilePicture} alt="" className={`${className} shrink-0 rounded-full bg-slate-100 object-cover`}
        fallback={<span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-white`}>{initialsOf(teacher?.name)}</span>} />
);

export const Badge = ({ children, tone = 'bg-slate-100 text-slate-600' }) => (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{children}</span>
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
    return <span role="status" aria-live="polite" className={`text-xs font-medium ${tone}`}>{label}</span>;
};
