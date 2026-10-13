/** The admin panel's competition constants and helpers (shared by the pages). */
import api from '../utils/api';

// Each game's icon is GameIcon (competitions/shared.jsx).
export const GAMES = {
    chess: { label: 'Chess', note: 'Two teams a match, one player each.' },
    ludo: { label: 'Ludo', note: 'Two to four teams a match, one player each.' },
    carrom: { label: 'Carrom', note: 'Two teams a match: singles, or doubles with two players each.' },
    uno: { label: 'UNO', note: 'Two to four teams a match, one player each.' }
};

export const STATUS = {
    draft: ['Draft', 'bg-slate-100 text-slate-600'],
    registration: ['Registration open', 'bg-emerald-50 text-emerald-700'],
    'registration-soon': ['Registration opens soon', 'bg-sky-50 text-sky-700'],
    'closing-soon': ['Registration closing soon', 'bg-amber-50 text-amber-700'],
    closed: ['Registration closed', 'bg-amber-50 text-amber-700'],
    live: ['Live', 'bg-rose-50 text-rose-700'],
    completed: ['Completed', 'bg-indigo-50 text-indigo-700'],
    cancelled: ['Cancelled', 'bg-slate-100 text-slate-500'],
    pending: ['Waiting for approval', 'bg-amber-50 text-amber-700'],
    approved: ['Approved', 'bg-emerald-50 text-emerald-700'],
    rejected: ['Rejected', 'bg-rose-50 text-rose-700'],
    withdrawn: ['Withdrawn', 'bg-slate-100 text-slate-500'],
    scheduled: ['Upcoming', 'bg-sky-50 text-sky-700'],
    bye: ['Bye', 'bg-slate-100 text-slate-600'],
    // The server's `phase`: the stored status read against the dates, so a
    // card stops saying "Registration open" once the deadline has passed
    // ('registration-soon' and 'closing-soon' are above).
    // The student app's words (yaticorp-lms-student/src/competitions/api.js).
    'registration-open': ['Registration open', 'bg-emerald-50 text-emerald-700'],
    upcoming: ['Upcoming', 'bg-sky-50 text-sky-700']
};
export const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * The badge a competition wears: its status, read against its dates, as the
 * server's `phase` has it (competitions/services/views.js). A competition is
 * saved as open for registration until someone closes it or draws the
 * matches, so on its status alone one whose deadline had passed still read
 * "Registration open" here, while the student app said "Upcoming" and its own
 * card said "Registration is closed".
 */
export const competitionBadge = (c) => {
    if (c?.status !== 'registration') return c?.status;
    if (c.phase === 'upcoming') return 'closed';
    if (c.phase === 'registration-soon' || c.phase === 'closing-soon') return c.phase;
    return 'registration';
};
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled');

/** A Date as the value a datetime-local input wants, in the browser's time zone. */
export const toLocalInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * What the organizer is asked before deleting a competition: it goes for good,
 * with whatever hangs on it. `teams`: how many teams are registered or in.
 */
export const deleteQuestion = (c, teams = 0) => [
    `Delete "${c.name}" for good? Students will no longer see it.`,
    teams > 0 ? `${teams} team${teams === 1 ? ' is' : 's are'} registered for it; ${teams === 1 ? 'it goes' : 'they go'} too.` : '',
    c.status === 'live' ? 'Games in progress stop.' : '',
    c.status === 'completed' ? 'Its results and certificates go too. Prizes already given stay with the students.' : '',
    'This cannot be undone.'
].filter(Boolean).join('\n\n');

export const errorOf = (err) => err.response?.data?.message || err.message || 'Something went wrong.';


/** A banner image, uploaded through `apiBase`/banner; resolves to its address. */
export const bannerUploader = (apiBase) => (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`${apiBase}/banner`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.url);
};
