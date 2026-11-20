/**
 * Campus's components (first written for a separate Institution app, merged here 2026-11-19) —
 * one design language for every page:
 * porcelain paper, petrol-teal ink, brass for what is official. Tokens in
 * index.css. Kept to what the pages use.
 */
import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, ChevronDown, AlertTriangle, CheckCircle2, Search, Lock } from 'lucide-react';
import api, { CAMPUS } from './api';

/* ── Data ─────────────────────────────────────────────────────────────────── */

/** GET `CAMPUS + path` with `params` whenever they change: { data, loading, failed, reload }. `path` null waits. */
export const useData = (path, params = {}) => {
    const [state, setState] = useState({ data: null, loading: Boolean(path), failed: false, error: '' });
    const key = path ? `${path}?${JSON.stringify(params)}` : '';
    const seq = useRef(0);
    const load = useCallback(async (quiet = false) => {
        if (!path) { setState({ data: null, loading: false, failed: false }); return; }
        const mine = ++seq.current;
        if (!quiet) setState((s) => ({ ...s, loading: true, failed: false }));
        try {
            const res = await api.get(`${CAMPUS}${path}`, { params });
            if (mine === seq.current) setState({ data: res.data, loading: false, failed: false });
        } catch (err) {
            // What went wrong, said on the page: the server's own words and status, or that it could not be reached.
            const error = err?.response
                ? `${err.response.data?.message || 'The server could not answer'} (${err.response.status})`
                : `Could not reach the server at ${api.defaults.baseURL}.`;
            lastError = error;
            if (mine === seq.current) setState((s) => ({ ...s, loading: false, failed: !quiet || !s.data, error }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    useEffect(() => { load(); }, [load]);
    const reload = () => load(true);
    // `failed` carries the reason, so every page's <LoadFailed error={…}> can say it.
    return { ...state, reload };
};

/* ── Formatting ───────────────────────────────────────────────────────────── */

export const rupees = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const asDate = (d) => new Date(String(d).length === 10 ? `${d}T12:00:00` : d);
export const day = (d) => (d ? asDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const shortDay = (d) => (d ? asDate(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const pct = (n) => (n === null || n === undefined ? '—' : `${n}%`);
export const semestersOf = (dept) => Array.from({ length: dept?.semesters || 0 }, (_, i) => i + 1);
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const FEE_KINDS = [['admission', 'Admission'], ['tuition', 'Tuition'], ['exam', 'Examination'], ['hostel', 'Hostel'], ['transport', 'Transport'], ['other', 'Other']];
export const MODES = [['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card'], ['bank', 'Bank transfer'], ['cheque', 'Cheque'], ['dd', 'Demand draft'], ['online', 'Online']];
export const attendanceTone = (p) => (p === null || p === undefined ? 'text-ink-3' : p < 75 ? 'text-rose-700' : p < 85 ? 'text-amber-700' : 'text-petrol-600');
const attendanceBar = (p) => (p === null || p === undefined ? 'bg-line' : p < 75 ? 'bg-rose-500' : p < 85 ? 'bg-amber-500' : 'bg-petrol-500');

/* ── Buttons and fields ───────────────────────────────────────────────────── */

const BTN = {
    primary: 'bg-petrol-700 text-white shadow-[0_1px_0_rgb(255_255_255/.15)_inset,0_6px_16px_-8px_rgb(14_59_58/.6)] hover:bg-petrol-800',
    secondary: 'border border-line-2 bg-white text-ink hover:border-petrol-200 hover:bg-petrol-50',
    ghost: 'text-ink-2 hover:bg-petrol-50 hover:text-petrol-800',
    danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    brass: 'bg-brass-500 text-white hover:bg-brass-700'
};
export const Button = ({ variant = 'primary', size = 'md', busy, icon: Icon, children, className = '', ...rest }) => (
    <button type="button" {...rest} disabled={rest.disabled || busy}
        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-[background,border,color,transform] duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-sm'} ${BTN[variant]} ${className}`}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} aria-hidden />}
        {children}
    </button>
);

const FIELD = 'w-full rounded-xl border border-line-2 bg-white px-3 text-sm text-ink placeholder:text-ink-3 transition focus:border-petrol-500 focus:outline-none focus:ring-4 focus:ring-petrol-100 disabled:bg-porcelain disabled:text-ink-3';
export const Label = ({ children }) => <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">{children}</span>;
export const Field = ({ label, hint, children, className = '' }) => (
    <label className={`block ${className}`}>
        {label && <Label>{label}</Label>}
        {children}
        {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
);
export const Input = ({ className = '', ...rest }) => <input {...rest} className={`${FIELD} h-11 ${className}`} />;
export const Textarea = ({ className = '', ...rest }) => <textarea {...rest} className={`${FIELD} min-h-24 py-2.5 ${className}`} />;
// `small`: a table row's select, 36px (2026-11-19 QA: a 44px select stood out of its row).
export const Select = ({ className = '', small = false, children, ...rest }) => (
    <span className={`relative block ${className}`}>
        <select {...rest} className={`${FIELD} ${small ? 'h-9 text-[13px]' : 'h-11'} appearance-none pr-9`}>{children}</select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </span>
);
export const SearchBox = ({ value, onChange, placeholder = 'Search', className = '' }) => (
    <span className={`relative block ${className}`}>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${FIELD} h-11 pl-9`} />
    </span>
);
export const SemesterSelect = ({ dept, value, onChange, any, anyLabel = 'All semesters', ...rest }) => (
    <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} aria-label="Semester" {...rest}>
        {any && <option value="">{anyLabel}</option>}
        {semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}
    </Select>
);
/** Nothing when the department has a single section. */
export const SectionSelect = ({ dept, value, onChange, any = true, ...rest }) => (!dept?.sections || dept.sections.length < 2 ? null : (
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Section" {...rest}>
        {any && <option value="">All sections</option>}
        {dept.sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
    </Select>
));
export const Toggle = ({ checked, onChange, label, hint, disabled }) => (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-line bg-white p-3.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-petrol-200'}`}>
        <span><span className="block text-sm font-semibold text-ink">{label}</span>{hint && <span className="mt-0.5 block text-xs text-ink-3">{hint}</span>}</span>
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span aria-hidden className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition peer-focus-visible:ring-4 peer-focus-visible:ring-petrol-100 ${checked ? 'bg-petrol-600' : 'bg-line-2'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
    </label>
);

/* ── Surfaces ─────────────────────────────────────────────────────────────── */

export const Card = ({ className = '', children, ...rest }) => <section {...rest} className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(23_32_31/.04)] ${className}`}>{children}</section>;

/** The top of a page: an eyebrow (where you are), the title in the display face, a line of purpose, and its actions. */
export const PageHead = ({ eyebrow, title, sub, children }) => (
    <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-brass-700">{eyebrow}</p>}
            <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
            {sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{sub}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
);

/** Sliding segmented tabs. `options`: [[key, label, count?]]. */
export const Tabs = ({ options, value, onChange, className = '' }) => (
    <div role="tablist" className={`no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-paper p-1 ${className}`}>
        {options.map(([key, label, count]) => (
            <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition ${value === key ? 'bg-white text-petrol-800 shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink'}`}>
                {label}
                {count > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${value === key ? 'bg-petrol-100 text-petrol-800' : 'bg-line text-ink-2'}`}>{count}</span>}
            </button>
        ))}
    </div>
);

const CHIPS = {
    green: 'bg-petrol-50 text-petrol-700 ring-petrol-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    brass: 'bg-brass-50 text-brass-700 ring-brass-100',
    grey: 'bg-porcelain text-ink-2 ring-line'
};
export const Chip = ({ tone = 'grey', children }) => <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${CHIPS[tone]}`}>{children}</span>;
export const Meter = ({ value, className = '' }) => (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-porcelain ${className}`} aria-hidden>
        <div className={`h-full rounded-full transition-[width] duration-500 ${attendanceBar(value)}`} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
);
export const Roll = ({ value }) => <span className="inline-flex min-w-[3.25rem] justify-center rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2">{value || '—'}</span>;

const TONES = ['bg-petrol-600', 'bg-brass-500', 'bg-[#6b4e71]', 'bg-[#3d5a80]', 'bg-[#8a5a44]', 'bg-[#4f6d4a]'];
export const Avatar = ({ name = '', src, size = 'h-9 w-9 text-xs' }) => {
    const [broken, setBroken] = useState(false);
    const tone = TONES[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % TONES.length];
    const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    return (
        <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${size} ${tone}`} aria-hidden>
            {src && !broken ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} /> : letters || '?'}
        </span>
    );
};
export const Person = ({ name, sub, src }) => (
    <span className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={src} />
        <span className="min-w-0"><span className="block truncate font-medium text-ink">{name}</span>{sub && <span className="block truncate text-xs text-ink-3">{sub}</span>}</span>
    </span>
);

/** A table in a card: hairlines, tabular figures, a sticky header row. */
export const Register = ({ children, className = '', min = 'min-w-[680px]' }) => (
    <Card className={`overflow-hidden ${className}`}>
        <div className="overflow-x-auto"><table className={`w-full ${min} text-left text-sm tabular-nums`}>{children}</table></div>
    </Card>
);
export const TH = ({ children, className = '' }) => <th scope="col" className={`whitespace-nowrap border-b border-line bg-paper px-4 py-3 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 ${className}`}>{children}</th>;
export const TD = ({ children, className = '', ...rest }) => <td {...rest} className={`border-b border-line/70 px-4 py-3 align-middle ${className}`}>{children}</td>;

export const Figure = ({ label, value, sub, tone = 'text-ink', icon: Icon }) => (
    <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-3">{label}</p>
            {Icon && <Icon size={18} className="text-brass-500" aria-hidden />}
        </div>
        <p className={`mt-2 font-display text-[30px] font-semibold leading-none tabular-nums ${tone}`}>{value}</p>
        {sub && <p className="mt-2 text-xs text-ink-3">{sub}</p>}
    </Card>
);

export const Empty = ({ icon: Icon, title, children, action }) => (
    <div className="px-6 py-14 text-center">
        {Icon && <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-petrol-600"><Icon size={22} /></span>}
        {title && <p className="font-display text-lg font-semibold text-ink">{title}</p>}
        {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{children}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
);
export const Skeleton = ({ rows = 4, className = 'h-12' }) => (
    <div className="space-y-2.5 p-5" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }, (_, i) => <div key={i} className={`animate-pulse rounded-xl bg-porcelain ${className}`} />)}
    </div>
);
let lastError = '';
export const LoadFailed = ({ onRetry, what = 'this', error }) => (
    <div className="px-6 py-14 text-center" role="alert">
        <p className="text-sm text-ink-2">Could not load {what}.</p>
        <p className="mx-auto mt-1 max-w-lg text-xs text-ink-3">{error || lastError || 'Check your connection and try again.'}</p>
        {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
);
export const Banner = ({ kind = 'error', children, onClose }) => (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : kind === 'info' ? 'border-brass-100 bg-brass-50 text-brass-700' : 'border-petrol-200 bg-petrol-50 text-petrol-800'}`}>
        {kind === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{children}</span>
        {onClose && <button onClick={onClose} aria-label="Dismiss" className="-m-1 rounded-lg p-1 opacity-60 hover:opacity-100"><X size={15} /></button>}
    </div>
);

/* ── Popups ───────────────────────────────────────────────────────────────── */

const usePopup = (onClose) => {
    const ref = useRef(null);
    useEffect(() => {
        const before = document.activeElement;
        const node = ref.current;
        node?.querySelector('input,select,textarea,button:not([data-close])')?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
            if (e.key === 'Tab' && node) {
                const f = [...node.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
                if (!f.length) return;
                if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
                else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
            }
        };
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus?.(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return ref;
};

/** A centred popup. Put a <form> inside for submit-on-enter. */
export const Dialog = ({ title, sub, onClose, children, footer, size = 'max-w-lg' }) => {
    const ref = usePopup(onClose);
    const id = useId();
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] animate-rise sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`flex max-h-[92dvh] w-full ${size} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl`}>
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                    <div><h2 id={id} className="font-display text-xl font-semibold text-ink">{title}</h2>{sub && <p className="mt-0.5 text-sm text-ink-2">{sub}</p>}</div>
                    <button data-close onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-2 text-ink-3 hover:bg-porcelain hover:text-ink"><X size={18} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper px-5 py-3.5 sm:px-6">{footer}</div>}
            </div>
        </div>, document.body);
};

/** A panel from the right (a full screen on a phone): one student's record. */
export const Drawer = ({ title, sub, onClose, children, actions }) => {
    const ref = usePopup(onClose);
    const id = useId();
    return createPortal(
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/30 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="flex h-full w-full max-w-2xl flex-col bg-porcelain shadow-2xl animate-rise">
                <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4 sm:px-6">
                    <div className="min-w-0"><h2 id={id} className="truncate font-display text-xl font-semibold text-ink">{title}</h2>{sub && <p className="mt-0.5 text-sm text-ink-2">{sub}</p>}</div>
                    <div className="flex items-center gap-2">{actions}<button data-close onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-3 hover:bg-porcelain hover:text-ink"><X size={18} /></button></div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            </div>
        </div>, document.body);
};

/* ── Toasts and confirmations ─────────────────────────────────────────────── */

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export const ToastHost = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const push = useCallback((text, kind = 'ok') => {
        const id = Math.random();
        setToasts((t) => [...t.slice(-2), { id, text, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4500);
    }, []);
    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-xl animate-rise ${t.kind === 'error' ? 'bg-rose-700' : 'bg-petrol-900'}`}>
                        {t.kind === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-petrol-200" />}
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

/** `const [confirm, dialog] = useConfirm()`; `if (await confirm({ title, body, action, danger }))`. Render `dialog`. */
export const useConfirm = () => {
    const [ask, setAsk] = useState(null);
    const confirm = useCallback((opts) => new Promise((resolve) => setAsk({ ...opts, resolve })), []);
    const close = (v) => { ask?.resolve(v); setAsk(null); };
    const dialog = ask && (
        <Dialog title={ask.title} onClose={() => close(false)} size="max-w-md"
            footer={<><Button variant="secondary" onClick={() => close(false)}>Cancel</Button><Button variant={ask.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{ask.action || 'Confirm'}</Button></>}>
            <p className="text-sm leading-relaxed text-ink-2">{ask.body}</p>
        </Dialog>
    );
    return [confirm, dialog];
};

/** A submit helper for forms in popups: { busy, error, run(fn) }. */
export const useSubmit = () => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const run = async (fn) => {
        setBusy(true); setError('');
        try { return await fn(); } catch (err) { setError(err?.response?.data?.message || 'Something went wrong. Please try again.'); return undefined; } finally { setBusy(false); }
    };
    return { busy, error, setError, run };
};

/* ── Coming soon ──────────────────────────────────────────────────────────── */

/**
 * What is not open yet (2026-11-13): exams, internal marks, fees and feedback are
 * built but shown greyed with "Coming soon" until they are switched on — take a
 * key out of this set to open it everywhere in this app.
 */
export const SOON = new Set(['internals', 'fees', 'board', 'feedback']);

export const SoonBadge = ({ className = '' }) => (
    <span title="Locked" className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow ring-1 ring-slate-200 ${className}`}><Lock size={13} aria-label="Locked" /></span>
);
/** Shows `children` greyed and inert, with a Coming soon badge on top. */
export const Soon = ({ children, className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="pointer-events-none select-none opacity-50 grayscale" aria-hidden="true" inert="">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center"><SoonBadge className="shadow" /></div>
    </div>
);
/** A whole page that is not open yet. */
export const ComingSoonPage = ({ title, icon: Icon, text }) => (
    <div className="mx-auto max-w-lg py-20 text-center grayscale">
        {Icon && <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white text-ink-3"><Icon size={24} /></span>}
        <SoonBadge />
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink-2">{title}</h1>
        <p className="mt-2 text-sm text-ink-3">{text || ''}</p>
    </div>
);
