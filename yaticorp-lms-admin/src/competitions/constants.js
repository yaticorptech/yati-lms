/** The admin panel's competition constants and helpers (shared by the pages). */
import api from '../utils/api';

export const GAMES = {
    chess: { label: 'Chess', emoji: '♟️', note: 'Two teams a match, one player each.' },
    ludo: { label: 'Ludo', emoji: '🎲', note: 'Two to four teams a match, one player each.' },
    carrom: { label: 'Carrom', emoji: '🟤', note: 'Two teams a match: singles, or doubles with two players each.' },
    uno: { label: 'UNO', emoji: '🃏', note: 'Two to four teams a match, one player each.' }
};

export const STATUS = {
    draft: ['Draft', 'bg-slate-100 text-slate-600'],
    registration: ['Registration open', 'bg-emerald-50 text-emerald-700'],
    closed: ['Registration closed', 'bg-amber-50 text-amber-700'],
    live: ['Live', 'bg-rose-50 text-rose-700'],
    completed: ['Completed', 'bg-indigo-50 text-indigo-700'],
    cancelled: ['Cancelled', 'bg-slate-100 text-slate-500'],
    pending: ['Waiting for approval', 'bg-amber-50 text-amber-700'],
    approved: ['Approved', 'bg-emerald-50 text-emerald-700'],
    rejected: ['Rejected', 'bg-rose-50 text-rose-700'],
    withdrawn: ['Withdrawn', 'bg-slate-100 text-slate-500'],
    scheduled: ['Upcoming', 'bg-sky-50 text-sky-700'],
    bye: ['Bye', 'bg-slate-100 text-slate-600']
};
export const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled');

/** A Date as the value a datetime-local input wants, in the browser's time zone. */
export const toLocalInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const errorOf = (err) => err.response?.data?.message || err.message || 'Something went wrong.';


/** A banner image, uploaded through `apiBase`/banner; resolves to its address. */
export const bannerUploader = (apiBase) => (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`${apiBase}/banner`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.url);
};
