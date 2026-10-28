/**
 * The teacher pages' shared class names and formatters (no components here,
 * so React's fast refresh keeps working on the component files).
 */
export const btn = {
    primary: 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2',
    secondary: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
    ghost: 'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
    danger: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50'
};

export const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20';

/**
 * Each section's colour, used for its icon, header, tiles and the sidebar row:
 * Research Path emerald, Methodologies sky, Publications violet, Thesis amber,
 * Writing rose, Plagiarism indigo, Profile teal. Written out in full:
 * Tailwind cannot see class names put together at runtime.
 */
export const COLORS = {
    emerald: { solid: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', nav: 'bg-emerald-50 text-emerald-800', top: 'border-t-emerald-500' },
    sky: { solid: 'bg-sky-600 text-white', soft: 'bg-sky-50 text-sky-600', text: 'text-sky-600', nav: 'bg-sky-50 text-sky-800', top: 'border-t-sky-500' },
    violet: { solid: 'bg-violet-600 text-white', soft: 'bg-violet-50 text-violet-600', text: 'text-violet-600', nav: 'bg-violet-50 text-violet-800', top: 'border-t-violet-500' },
    amber: { solid: 'bg-amber-500 text-white', soft: 'bg-amber-50 text-amber-600', text: 'text-amber-600', nav: 'bg-amber-50 text-amber-800', top: 'border-t-amber-500' },
    rose: { solid: 'bg-rose-600 text-white', soft: 'bg-rose-50 text-rose-600', text: 'text-rose-600', nav: 'bg-rose-50 text-rose-800', top: 'border-t-rose-500' },
    indigo: { solid: 'bg-indigo-600 text-white', soft: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-600', nav: 'bg-indigo-50 text-indigo-800', top: 'border-t-indigo-500' },
    teal: { solid: 'bg-teal-600 text-white', soft: 'bg-teal-50 text-teal-600', text: 'text-teal-600', nav: 'bg-teal-50 text-teal-800', top: 'border-t-teal-500' }
};
export const colorOf = (c) => COLORS[c] || COLORS.emerald;

/** inputClass for the styled Select (components/Select.jsx), whose trigger is a flex row. */
export const selectClass = inputClass.replace('block ', '');

/** Words in a text, counted the way the server counts them. */
// Marks (\p{M}) included: Kannada and Hindi vowel signs and the virama are marks.
export const countWords = (text) => (String(text || '').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu) || []).length;

/** A name for a downloaded file: letters, digits, spaces → underscores. */
export const fileStem = (title, fallback) => String(title || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || fallback;

/** Date and time, short: "23 Oct, 9:41 am". */
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
/** The same, short, for a tight row: "now", "5m ago", "3h ago", "2d ago", then "12 Oct". */
export const fmtAgoShort = (d, now = Date.now()) => {
    if (!d) return '';
    const minutes = Math.max(0, Math.round((now - new Date(d).getTime()) / 60000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days < 7 ? `${days}d ago` : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then the date. */
export const fmtAgo = (d, now = Date.now()) => {
    if (!d) return '';
    const minutes = Math.max(0, Math.round((now - new Date(d).getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'yesterday';
    return days < 7 ? `${days} days ago` : `on ${fmtDate(d)}`;
};
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
/** "Dr. Meera Iyer" → "MI": titles are skipped. */
export const initialsOf = (name) => (name || '').trim().split(/\s+/).filter((w) => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'T';

export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

export const WRITING_KINDS = { article: 'Article', essay: 'Essay', grant: 'Grant proposal', reflection: 'Reflection', notes: 'Notes', other: 'Other' };
