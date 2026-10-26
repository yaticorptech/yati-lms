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

    /** A player's 6-character match code → their match's game, to open. */
    joinMatch: (code) => post('/matches/join', { code }),
    // The entry fee, online through Razorpay (once my team is approved): the order, then its check.
    pay: (id) => post(`/${id}/pay`),
    payVerify: (id, body) => post(`/${id}/pay/verify`, body),
    play: (gameId, since) => get(`/play/${gameId}`, since != null ? { params: { since } } : undefined),
    join: (gameId, code) => post(`/play/${gameId}/join`, { code }),
    // What has opened for me and waits for my code (the start pop-up).
    alerts: () => get('/alerts').then((d) => d.alerts || []),
    act: (gameId, action) => post(`/play/${gameId}/action`, { action })
};

/**
 * The games, as the lobby shows them before the server answers: Chess and the
 * three brain games (Ludo and Carrom were replaced by them on 2026-10-24; UNO
 * was removed on 2026-10-23). Each card's picture and icon (public/games/
 * <id>-card.jpg and <id>-icon.png) are cut from the account owner's design
 * for the Competitions page (2026-10-24); the players badge is part of the
 * picture. `keywords` widen the search. Every card's button is the same
 * purple (GAME_BUTTON). `brain` marks the games played as a quiz
 * (games/QuizTable.jsx); `format` is how a game of it runs.
 */
export const GAME_BUTTON = 'bg-gradient-to-r from-[#3b31c4] to-[#6d3fe0] hover:from-[#332aa8] hover:to-[#5d33c9] shadow-[#4f3fd8]/30';
export const GAMES = {
    chess: { label: 'Chess', emoji: '♟️', blurb: 'Two players, a clock each. Checkmate wins.', players: '2 players', tone: 'from-slate-700 to-slate-900', keywords: 'board strategy king checkmate' },
    rapidfire: { label: 'Rapid Fire', emoji: '⚡', blurb: 'Quick general-knowledge round: answer every question fast. Answers and scores are shown at the end.', players: '2–4 players', format: '15 questions · 8 s each', brain: true, tone: 'from-orange-500 to-rose-700', keywords: 'quiz speed fast general knowledge gk' },
    codeclash: { label: 'Code Clash', emoji: '💻', blurb: 'Hackathon-style coding round: predict the output, spot the bug, beat the clock.', players: '2–4 players', format: '8 challenges · 45 s each', brain: true, tone: 'from-slate-900 to-emerald-700', keywords: 'coding programming hackathon code javascript python developer' },
    brainsprint: { label: 'Brain Sprint', emoji: '🧩', blurb: 'IQ puzzles made fresh every match: series, logic, numbers. Fastest mind wins.', players: '2–4 players', format: '12 puzzles · 25 s each', brain: true, tone: 'from-cyan-600 to-indigo-600', keywords: 'iq puzzle logic reasoning series numbers brain' }
};
/** The games played as a quiz, by id. */
export const BRAIN_GAMES = Object.keys(GAMES).filter((id) => GAMES[id].brain);
export const gameImage = (id) => `/games/${id}-card.jpg?v=2`; // v2: without the painted players badge
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
    cancelled: { dot: '⚫', label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
    // Its start date passed and it never began: closed.
    expired: { dot: '⚫', label: 'Closed', cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
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
