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
import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Search, UserMinus, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import initials from '../utils/initials';
import { pictureSources } from '../utils/pictures';
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
// On a phone the icon heads the card and everything reads down from the top;
// from a tablet up the icon sits at the right. Top-aligned either way: tiles in
// a row share the tallest one's height, and a reversed column had packed the
// shorter ones to the bottom, so their icon and number floated mid-card.
export const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo', loading }) => (
    <div className={`${CARD} flex flex-col gap-2.5 p-4 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-3 sm:p-5`}>
        {Icon && <span className={`w-fit shrink-0 rounded-xl p-2 sm:p-2.5 ${TONES[tone]}`}><Icon size={18} /></span>}
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:tracking-wider">{label}</p>
            {loading
                ? <div className="animate-pulse h-8 w-16 bg-slate-100 rounded-lg mt-2" />
                : <p className="mt-1 truncate text-2xl font-bold text-slate-800 tabular-nums sm:text-3xl">{value ?? '—'}</p>}
            {sub && <p className="mt-1 text-xs leading-snug text-slate-500">{sub}</p>}
        </div>
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

const FADE = '1.75rem';
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A row of mutually exclusive choices — a sort order, a tab. A white pill
 * slides from the old choice to the new one.
 *
 * On a narrow phone the choices scroll sideways inside their own grey track,
 * which never runs past the page's edge: the side with more to see fades out,
 * and the chosen one is brought into view.
 */
// `locked`: { key: reason } for an option shown but not open yet — it stays in
// place, dimmed, and a click says why (onLocked) instead of switching to it.
export const Segmented = ({ options, value, onChange, counts = {}, locked = {}, onLocked }) => {
    const rowRef = useRef(null);
    const pillRef = useRef(null);
    const placed = useRef(false);
    const keys = options.map(([key]) => key).join('|');

    // The pill and the fades are set on the elements themselves: a switch
    // costs no extra render, and the first placement lands before paint.
    useLayoutEffect(() => {
        const row = rowRef.current;
        const pill = pillRef.current;
        if (!row || !pill) return undefined;
        const fade = () => {
            const more = row.scrollWidth - row.clientWidth;
            const start = row.scrollLeft > 2;
            const end = row.scrollLeft < more - 2;
            const mask = more > 2
                ? `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${start ? FADE : '0px'}, #000 calc(100% - ${end ? FADE : '0px'}), ${end ? 'transparent' : '#000'})`
                : '';
            row.style.maskImage = mask;
            row.style.webkitMaskImage = mask;
        };
        const place = () => {
            const chosen = row.querySelector('[aria-pressed="true"]');
            if (!chosen || !chosen.offsetWidth) { pill.style.opacity = '0'; return; }
            const first = !placed.current;
            if (first) pill.style.transition = 'none';
            pill.style.width = `${chosen.offsetWidth}px`;
            pill.style.transform = `translateX(${chosen.offsetLeft}px)`;
            pill.style.opacity = '1';
            if (first) { void pill.offsetWidth; pill.style.transition = ''; placed.current = true; }
            // Brought into view, near the middle, when the choice is cut off.
            const left = chosen.offsetLeft;
            const right = left + chosen.offsetWidth;
            if (left < row.scrollLeft + 8 || right > row.scrollLeft + row.clientWidth - 8) {
                row.scrollTo({ left: left - (row.clientWidth - chosen.offsetWidth) / 2, behavior: first || reducedMotion() ? 'auto' : 'smooth' });
            }
            fade();
        };
        place();
        // A count badge arriving, a web font loading, the phone turning.
        const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
        if (watch) { watch.observe(row); for (const b of row.querySelectorAll('button')) watch.observe(b); }
        row.addEventListener('scroll', fade, { passive: true });
        return () => { watch?.disconnect(); row.removeEventListener('scroll', fade); };
    }, [value, keys]);

    return (
        <div className="min-w-0 max-w-full">
            <div className="inline-flex max-w-full rounded-xl bg-slate-100">
                <div ref={rowRef} className="no-scrollbar relative flex min-w-0 gap-1 overflow-x-auto p-1">
                    <span ref={pillRef} aria-hidden
                        className="pointer-events-none absolute bottom-1 left-0 top-1 rounded-lg bg-white opacity-0 shadow-sm ring-1 ring-slate-900/5 transition-[transform,width] duration-300 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none" />
                    {options.map(([key, label]) => (
                        <button key={key} onClick={() => (locked[key] ? onLocked?.(key) : onChange(key))} aria-pressed={value === key}
                            aria-disabled={locked[key] ? 'true' : undefined} title={locked[key] || undefined}
                            className={`relative shrink-0 whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-[color,scale] duration-200 active:scale-95 motion-reduce:active:scale-100 ${value === key ? 'text-indigo-600' : locked[key] ? 'cursor-not-allowed text-slate-500 opacity-50' : 'text-slate-500 hover:text-slate-700'}`}>
                            {label}
                            {counts[key] > 0 && (
                                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black transition-colors duration-200 ${value === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {counts[key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AVATAR_TONES = ['bg-indigo-600', 'bg-violet-600', 'bg-sky-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];

/** A student's picture, or their initials on a colour that stays theirs. */
// A picture that will not load moves on to the next place it may be found
// (utils/pictures.js), and after the last one the initials show, never an
// empty circle.
export const Avatar = ({ name, src, size = 'h-10 w-10 text-sm' }) => {
    const tone = AVATAR_TONES[[...(name || '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
    const sources = pictureSources(src);
    const key = sources.join(' ');
    const [failed, setFailed] = useState({ key: '', count: 0 });
    const tried = failed.key === key ? failed.count : 0;
    const shown = sources[tried];
    return (
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${size} ${tone}`} aria-hidden>
            {shown
                ? <img key={shown} src={shown} alt="" className="h-full w-full object-cover" onError={() => setFailed({ key, count: tried + 1 })} />
                : initials(name)}
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
        {onClose && <button onClick={onClose} aria-label="Dismiss" className="-my-2 -mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg opacity-60 hover:opacity-100"><X size={16} /></button>}
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
