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
import React, { createContext, useContext } from 'react';
import { Search, UserMinus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import initials from '../utils/initials';
import useDialog from '../hooks/useDialog';

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
// `locked`: { key: reason } for an option shown but not open yet — it stays in
// place, dimmed, and a click says why (onLocked) instead of switching to it.
export const Segmented = ({ options, value, onChange, counts = {}, locked = {}, onLocked }) => (
    <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {options.map(([key, label]) => (
                <button key={key} onClick={() => (locked[key] ? onLocked?.(key) : onChange(key))} aria-pressed={value === key}
                    aria-disabled={locked[key] ? 'true' : undefined} title={locked[key] || undefined}
                    className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${value === key ? 'bg-white text-indigo-600 shadow-sm' : locked[key] ? 'cursor-not-allowed text-slate-500 opacity-50' : 'text-slate-500 hover:text-slate-700'}`}>
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

/**
 * A load that failed with nothing to show. Not the empty state: "no students
 * yet" on a failed request tells the admin something untrue, so this says the
 * list could not be loaded and offers the request again.
 */
export const LoadFailed = ({ what, onRetry }) => (
    <div className="px-6 py-16 text-center" role="alert">
        <p className="text-slate-500 font-medium">Unable to load {what}. Please try again.</p>
        {onRetry && <button onClick={onRetry} className={`${BTN2} mt-4`}>Retry</button>}
    </div>
);

export const Banner = ({ kind = 'error', children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
        <span className="flex-1">{children}</span>
        {/* A 40px target, pulled into the banner's padding so the banner keeps its height. */}
        {onClose && <button onClick={onClose} aria-label="Dismiss" className="-my-2 -mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg opacity-60 hover:opacity-100">✕</button>}
    </div>
);

export const Rows = ({ count = 3, height = 'h-12' }) => (
    <div className="p-6 space-y-3">
        {Array.from({ length: count }, (_, i) => <div key={i} className={`animate-pulse ${height} bg-slate-100 rounded-xl`} />)}
    </div>
);

/**
 * The one search box of the organization pages and Organizations — the same
 * height, border, icon and focus ring everywhere, instead of four near-copies.
 * `onChange` is handed the text, not the event.
 */
export const SearchInput = ({ value, onChange, placeholder = 'Search…', label, className = 'sm:w-64', ...rest }) => (
    <div className={`relative w-full ${className}`}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={label || placeholder}
            {...rest}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/40"
        />
    </div>
);

/**
 * "1–25 of 240", with Previous and Next. Says nothing at all when everything
 * fits on one page — there is nothing to page through.
 */
export const Pager = ({ page, limit, total, onPage, noun = 'students' }) => {
    if (!total || total <= limit) return null;
    const pages = Math.ceil(total / limit);
    const from = (page - 1) * limit + 1;
    const to = Math.min(total, page * limit);
    const NAV_BTN = 'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
    return (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
            <p className="text-sm text-slate-500 tabular-nums" aria-live="polite">
                <span className="font-semibold text-slate-700">{from}–{to}</span> of {total} {noun}
            </p>
            <div className="flex items-center gap-2">
                <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={NAV_BTN}>
                    <ChevronLeft size={16} /><span className="hidden sm:inline">Previous</span>
                </button>
                <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className={NAV_BTN}>
                    <span className="hidden sm:inline">Next</span><ChevronRight size={16} />
                </button>
            </div>
        </nav>
    );
};

const DialogTitleId = createContext(undefined);

/**
 * The organization panel's popup: the dimmed overlay, a centred white panel,
 * and everything useDialog gives it — announced by its title, focus inside
 * while open, Escape to close, focus back on the button that opened it.
 *
 * Give the heading as <DialogTitle> so the popup is named by it. `onClose` is
 * what Escape calls; pass one that does nothing while a request is in flight.
 */
export const Dialog = ({ onClose, children, size = 'max-w-md', z = 'z-[100]' }) => {
    const { dialogProps, titleId } = useDialog(onClose);
    return (
        <div {...dialogProps} className={`fixed inset-0 ${z} flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4`}>
            <div className={`flex w-full ${size} flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)]`}>
                <DialogTitleId.Provider value={titleId}>{children}</DialogTitleId.Provider>
            </div>
        </div>
    );
};

export const DialogTitle = ({ as: Tag = 'h2', className = 'text-lg font-bold text-slate-800', children }) => (
    <Tag id={useContext(DialogTitleId)} className={className}>{children}</Tag>
);

/**
 * "Remove {student}?" — the one confirmation both the student list and a
 * student's own page ask with. It used to be two copies of the same markup.
 *
 * It says what removing is not, because "remove" sounds like deletion: the
 * student keeps their account and everything they learned. An error stays in
 * the dialog that asked, with the dialog still open.
 */
export const RemoveStudentDialog = ({ student, busy, error, onCancel, onConfirm }) => (
    <Dialog onClose={() => { if (!busy) onCancel(); }}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-center sm:p-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <UserMinus size={24} className="text-amber-600" />
            </div>
            <DialogTitle>Remove {student.name}?</DialogTitle>
            <p className="mt-3 text-sm text-slate-500">
                They stop appearing in your organization and you can no longer see their progress.
                Their account, courses, progress, XP and certificates are untouched — nothing is deleted.
            </p>
            <p className="mt-2 text-sm text-slate-500">They can ask to join again with your Organization ID.</p>
            {error && <div className="mt-4 text-left"><Banner>{error}</Banner></div>}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
            <button onClick={onCancel} className={BTN2} disabled={busy} data-autofocus>Cancel</button>
            <button onClick={onConfirm} disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                {busy && <Loader2 size={16} className="animate-spin" />}
                Remove student
            </button>
        </div>
    </Dialog>
);
