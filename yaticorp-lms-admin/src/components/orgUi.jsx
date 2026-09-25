/**
 * The handful of styling constants and tiny presentational pieces the five
 * organization pages share.
 *
 * This panel's habit is to declare INPUT / LABEL / BTN as module constants and
 * a local Stat or Pill inside each page. That is fine for one page; repeated
 * across five it becomes five copies to keep in step, so the identical ones are
 * gathered here. The values are the panel's existing ones, unchanged — this is
 * a single home for them, not a new design language.
 */
import React from 'react';
import initials from '../utils/initials';

export const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
export const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
export const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50';
export const BTN2 = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';
export const CARD = 'bg-white rounded-2xl shadow-sm border border-slate-200';

const TONES = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    slate: 'bg-slate-100 text-slate-600'
};

/**
 * One headline number. `value` of 0 shows as 0; only undefined shows a dash.
 *
 * Sized to sit two across on a phone: the icon moves above the number there,
 * so the label and the value get the card's full width.
 */
export const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo', loading }) => (
    <div className={`${CARD} flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5`}>
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            {loading
                ? <div className="animate-pulse h-8 w-16 bg-slate-100 rounded-lg mt-2" />
                : <p className="mt-1 truncate text-2xl font-bold text-slate-800 tabular-nums sm:text-3xl">{value ?? '—'}</p>}
            {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && <span className={`w-fit shrink-0 rounded-xl p-2 sm:p-2.5 ${TONES[tone]}`}><Icon size={18} /></span>}
    </div>
);

/**
 * The top of every organization page: an icon, the title, one line of what the
 * page is for, and room on the right for its actions. One shape everywhere, so
 * moving between pages does not re-teach where things are.
 */
export const PageHeader = ({ icon: Icon, title, subtitle, children }) => (
    <div className={`${CARD} flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between lg:p-6`}>
        <div className="flex min-w-0 items-start gap-3">
            {Icon && <span className="shrink-0 rounded-xl bg-indigo-100 p-2.5 text-indigo-600"><Icon size={20} /></span>}
            <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
        </div>
        {children && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>}
    </div>
);

/**
 * A row of mutually exclusive choices — a sort order, a tab. Scrolls sideways
 * on a narrow phone rather than wrapping onto a second line.
 */
export const Segmented = ({ options, value, onChange, counts = {} }) => (
    <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {options.map(([key, label]) => (
                <button key={key} onClick={() => onChange(key)} aria-pressed={value === key}
                    className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${value === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {label}
                    {counts[key] > 0 && (
                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${value === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {counts[key]}
                        </span>
                    )}
                </button>
            ))}
        </div>
    </div>
);

const AVATAR_TONES = ['bg-indigo-600', 'bg-violet-600', 'bg-sky-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];

/** A student's picture, or their initials on a colour that stays theirs. */
export const Avatar = ({ name, src, size = 'h-10 w-10 text-sm' }) => {
    const tone = AVATAR_TONES[[...(name || '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
    return (
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${size} ${tone}`} aria-hidden>
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
        </div>
    );
};

/** A thin progress rail. Percentages are clamped, never trusted blindly. */
export const Bar = ({ percent = 0, tone = 'indigo' }) => {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    const fill = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' }[tone] || 'bg-indigo-500';
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar"
            aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${fill}`} style={{ width: `${value}%` }} />
        </div>
    );
};

const STATUS_TONE = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    blocked: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-600',
    suspended: 'bg-orange-100 text-orange-800'
};

export const Pill = ({ status }) => (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${STATUS_TONE[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
    </span>
);

/** Nothing here yet — said plainly, with the reason. */
export const Empty = ({ icon: Icon, children }) => (
    <div className="px-6 py-16 text-center">
        {Icon && (
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon size={22} className="text-slate-300" />
            </div>
        )}
        <p className="text-slate-500 font-medium">{children}</p>
    </div>
);

export const Banner = ({ kind = 'error', children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
        <span className="flex-1">{children}</span>
        {onClose && <button onClick={onClose} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">✕</button>}
    </div>
);

export const Rows = ({ count = 3, height = 'h-12' }) => (
    <div className="p-6 space-y-3">
        {Array.from({ length: count }, (_, i) => <div key={i} className={`animate-pulse ${height} bg-slate-100 rounded-xl`} />)}
    </div>
);
