/**
 * The teacher pages' shared class names and formatters (no components here,
 * so React's fast refresh keeps working on the component files).
 */
export const btn = {
    primary: 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
    secondary: 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
    ghost: 'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50',
    danger: 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50'
};

export const inputClass = 'block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

/** Words in a text, counted the way the server counts them. */
// Marks (\p{M}) included: Kannada and Hindi vowel signs and the virama are marks.
export const countWords = (text) => (String(text || '').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu) || []).length;

/** A name for a downloaded file: letters, digits, spaces → underscores. */
export const fileStem = (title, fallback) => String(title || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || fallback;

/** Date and time, short: "23 Oct, 9:41 am". */
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

export const WRITING_KINDS = { article: 'Article', essay: 'Essay', grant: 'Grant proposal', reflection: 'Reflection', notes: 'Notes', other: 'Other' };
