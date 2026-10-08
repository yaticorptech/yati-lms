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

    createRoom: (game, options) => post('/rooms', { game, options }),
    joinRoom: (code) => post('/rooms/join', { code }),
    myRooms: () => get('/rooms/mine'),

    play: (gameId, since) => get(`/play/${gameId}`, since != null ? { params: { since } } : undefined),
    join: (gameId) => post(`/play/${gameId}/join`),
    act: (gameId, action) => post(`/play/${gameId}/action`, { action }),
    start: (gameId) => post(`/play/${gameId}/start`),
    leave: (gameId) => post(`/play/${gameId}/leave`)
};

/**
 * The four games, as the lobby shows them before the server answers. Each has
 * a photo and an icon under public/games/, its own Play Now colour, and the
 * width of the players pill painted into its photo, which a real one covers.
 */
export const GAMES = {
    chess: { label: 'Chess', emoji: '♟️', blurb: 'Two players, a clock each. Checkmate wins.', players: '2 players', tone: 'from-slate-700 to-slate-900', button: 'bg-[#5b4ae0] hover:bg-[#4c3cc9] shadow-[#5b4ae0]/30', pillWidth: 'min-w-[36%]' },
    ludo: { label: 'Ludo', emoji: '🎲', blurb: 'Roll, race and capture. First home wins.', players: '2–4 players', tone: 'from-rose-500 to-amber-500', button: 'bg-[#2f6fed] hover:bg-[#245dd0] shadow-[#2f6fed]/30', pillWidth: 'min-w-[39%]' },
    carrom: { label: 'Carrom', emoji: '🟤', blurb: 'Aim the striker, pocket your coins, cover the queen.', players: '2 or 4 players', tone: 'from-amber-600 to-orange-700', button: 'bg-[#e8405f] hover:bg-[#d2314f] shadow-[#e8405f]/30', pillWidth: 'min-w-[42%]' },
    uno: { label: 'UNO', emoji: '🃏', blurb: 'Match colours and numbers. Empty your hand first.', players: '2–4 players', tone: 'from-red-500 to-yellow-400', button: 'bg-[#34c08a] hover:bg-[#2aa877] shadow-[#34c08a]/30', pillWidth: 'min-w-[39%]' }
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
