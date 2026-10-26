/** Games & Competitions — the calls, on the LMS's axios client. */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || body?.error || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.status = err.response?.status;
    throw e;
};
const get = (p, config) => client.get(`/competitions${p}`, config).then((r) => r.data).catch(unwrap);
const post = (p, b) => client.post(`/competitions${p}`, b).then((r) => r.data).catch(unwrap);
const put = (p, b) => client.put(`/competitions${p}`, b).then((r) => r.data).catch(unwrap);
const del = (p) => client.delete(`/competitions${p}`).then((r) => r.data).catch(unwrap);

export const competitionsApi = {
    games: () => get('/games'),
    list: () => get('/'),
    detail: (id) => get(`/${id}`),
    me: () => get('/me'),
    leaderboard: () => get('/leaderboard'),
    history: () => get('/history'),
    certificate: (id) => client.get(`/competitions/${id}/certificate`, { responseType: 'blob' }).then((r) => r.data).catch(unwrap),
    // Every competition certificate I have earned, for My Profile's frame.
    myCertificates: () => get('/certificates').then((d) => d.certificates || []),
    // Takes one out of My Profile's frame; downloading it again puts it back.
    hideCertificate: (id) => client.delete(`/competitions/certificates/${id}`).then((r) => r.data).catch(unwrap),

    /* A quiz or a hackathon (asked 2026-10-23). */
    /** Sign up on my own (a competition students enter themselves), or withdraw. */
    signUp: (id) => post(`/${id}/signup`),
    withdraw: (id) => del(`/${id}/signup`),
    quiz: (id) => get(`/${id}/quiz`),
    startQuiz: (id) => post(`/${id}/quiz/start`),
    /** Answers as they are picked ({ questionId: choice }); `submit` hands the quiz in. */
    saveQuiz: (id, answers, submit = false) => put(`/${id}/quiz`, { answers, submit }),
    project: (id) => get(`/${id}/project`),
    saveProject: (id, body) => put(`/${id}/project`, body),

    /** A player's 6-character match code → their match's game, to open. */
    joinMatch: (code) => post('/matches/join', { code }),
    play: (gameId, since) => get(`/play/${gameId}`, since != null ? { params: { since } } : undefined),
    join: (gameId) => post(`/play/${gameId}/join`),
    act: (gameId, action) => post(`/play/${gameId}/action`, { action })
};

/**
 * The games, as the lobby shows them before the server answers: Chess (UNO,
 * then Ludo and Carrom, were removed on 2026-10-23; a match of theirs made
 * before then still plays, GamePage.jsx). Each has a photo and an icon
 * under public/games/, its own button colour, and the width of the players
 * pill painted into its photo, which a real one covers.
 */
export const GAMES = {
    chess: { label: 'Chess', emoji: '♟️', blurb: 'Two players, a clock each. Checkmate wins.', players: '2 players', tone: 'from-slate-700 to-slate-900', button: 'bg-[#5b4ae0] hover:bg-[#4c3cc9] shadow-[#5b4ae0]/30', pillWidth: 'min-w-[36%]' },
    // A quiz and a hackathon (asked 2026-10-23): no photo, drawn instead (`art`).
    quiz: { label: 'Quiz', emoji: '🧠', blurb: 'Timed questions, one go each. The highest score wins.', players: 'Teams or solo', tone: 'from-violet-600 to-fuchsia-500', button: 'bg-[#7c3aed] hover:bg-[#6d28d9] shadow-[#7c3aed]/30', pillWidth: 'min-w-[40%]', art: 'quiz' },
    hackathon: { label: 'Hackathon', emoji: '💻', blurb: 'Build a project for the problem. The best marks win.', players: 'Teams or solo', tone: 'from-emerald-600 to-teal-500', button: 'bg-[#059669] hover:bg-[#047857] shadow-[#059669]/30', pillWidth: 'min-w-[40%]', art: 'hackathon' }
};
export const gameImage = (id) => `/games/${id}.jpg`;
export const gameIcon = (id) => `/games/${id}-icon.png`;

export const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };

export const STATUS = {
    registration: { label: 'Registration open', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    closed: { label: 'Registration closed', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    live: { label: 'Live', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
    draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
};

/**
 * The one status a card shows, from the server's `phase`: what a person
 * needs to know at a glance — can colleges still register, is it on now.
 */
export const PHASE = {
    'registration-open': { dot: '🟢', label: 'Registration Open', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    'closing-soon': { dot: '🟡', label: 'Registration Closing Soon', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
    'registration-soon': { dot: '🔵', label: 'Registration Opens Soon', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    upcoming: { dot: '🔵', label: 'Upcoming', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
    live: { dot: '🔴', label: 'Live', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    completed: { dot: '⚫', label: 'Completed', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
    cancelled: { dot: '⚫', label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
};

/** The prize in a few words: the organizer's own line, or 1st place's reward. */
export const prizeLine = (c) => {
    if (c.prizeDetails) return c.prizeDetails;
    const first = c.prizes?.find((p) => p.place === 1);
    if (!first) return '';
    return first.title || [first.xp && `${first.xp} XP`, first.rewardPoints && `${first.rewardPoints} reward points`].filter(Boolean).join(' + ');
};

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Time to be announced');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
