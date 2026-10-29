/** Games & Competitions — the calls, on the LMS's axios client. */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || body?.error || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.status = err.response?.status;
    // A Group Brain room I am already in, when that is why it was refused.
    if (body?.roomId) e.roomId = body.roomId;
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
 * Group Brain rooms (asked 2026-10-27): make a room for a game and share its
 * code; others join with it; each says Ready; the maker starts. The game is
 * then played on the same page as a match (competitionsApi.play / act).
 */
export const roomsApi = {
    games: () => get('/rooms/games').then((d) => d.games || []),
    mine: () => get('/rooms/mine').then((d) => d.room || null),
    create: (game, options) => post('/rooms', { game, options }),
    join: (code) => post('/rooms/join', { code }),
    // Play online (like online Ludo): the fees on offer, and a seat at a table (the fee comes from the wallet).
    onlineInfo: () => get('/rooms/online'),
    online: (game, players, fee) => post('/rooms/online', { game, players, fee }),
    ready: (gameId, ready) => post(`/play/${gameId}/ready`, { ready }),
    start: (gameId) => post(`/play/${gameId}/start`),
    leave: (gameId) => post(`/play/${gameId}/leave`),
    remove: (gameId, seat) => post(`/play/${gameId}/remove`, { seat }),
    history: () => get('/rooms/history').then((d) => d.games || []),
    // type: points | chess | xp; period: all | week; game: one game, or all.
    leaderboard: ({ type = 'points', period = 'all', game } = {}) => get('/rooms/leaderboard', { params: { type, period, ...(game ? { game } : {}) } }),
    // My dashboard: totals, games, Brain Performance Score, chess rating, XP, achievements, certificates.
    profile: () => get('/rooms/profile'),
    certificate: (certId) => client.get(`/competitions/rooms/certificates/${certId}`, { responseType: 'blob' }).then((r) => r.data).catch(unwrap),
    // Anyone may check a certificate's ID (no sign-in needed).
    verify: (certId) => get(`/group-brain/verify/${encodeURIComponent(certId)}`)
};
export const SKILL_LABELS = { memory: 'Memory', reasoning: 'Reasoning', spatial: 'Spatial', strategy: 'Strategy' };

/**
 * The ten Group Brain games, as the Games page shows them. `table` is which
 * board plays it: the quiz board (games/QuizTable.jsx) for the question
 * games, a board of its own for the rest. `players` is how many a room
 * holds; `tone` the card's colours.
 */
export const GROUP_GAMES = {
    chess: { label: 'Chess', emoji: '♟️', blurb: 'Full chess rules — castling, promotion, checkmate — with a clock each and the move list.', players: '2 players', tone: 'from-slate-700 to-slate-900', table: 'chess' },
    memorymatrix: { label: 'Memory Matrix', emoji: '🟦', blurb: 'Cells light up, then go dark: pick the same ones. The grid grows as you go.', players: '2, 4 or 6 players', tone: 'from-sky-500 to-indigo-600', table: 'memorymatrix' },
    patternmaster: { label: 'Pattern Master', emoji: '🔷', blurb: 'Find the missing shape, arrow or number in each sequence.', players: '2, 4 or 6 players', tone: 'from-fuchsia-500 to-violet-600', table: 'quiz' },
    numberlogic: { label: 'Number Logic', emoji: '🔣', blurb: 'Number series, missing numbers and signs, and number puzzles.', players: '2, 4 or 6 players', tone: 'from-blue-500 to-cyan-600', table: 'quiz' },
    wordlogic: { label: 'Word Logic', emoji: '📚', blurb: 'Anagrams, analogies, odd one out, opposites and spelling.', players: '2, 4 or 6 players', tone: 'from-emerald-500 to-teal-600', table: 'quiz' },
    sudoku: { label: 'Sudoku Challenge', emoji: '🔢', blurb: 'Race to solve the same 9×9 Sudoku. Hints, mistakes and the clock all count.', players: '2, 4 or 6 players', tone: 'from-indigo-500 to-blue-700', table: 'sudoku' },
    deduction: { label: 'Deduction Detective', emoji: '🕵️', blurb: 'Read the clues, rule things out, name the answer: logic grids and more.', players: '2, 4 or 6 players', tone: 'from-slate-700 to-indigo-700', table: 'quiz' },
    spatialiq: { label: 'Spatial IQ', emoji: '🧊', blurb: 'Rotations, mirror images, paper folding and cube nets.', players: '2, 4 or 6 players', tone: 'from-amber-500 to-orange-600', table: 'quiz' },
    sequence: { label: 'Sequence & Reaction', emoji: '🎯', blurb: 'Watch a sequence and tap it back, longer each round — and reaction rounds.', players: '2, 4 or 6 players', tone: 'from-pink-500 to-rose-600', table: 'sequence' },
    lostkingdom: { label: 'The Lost Kingdom', emoji: '🧭', blurb: 'Five trials to the treasure of Aurelia — numbers, knowledge and logic, new every game.', players: '2, 4 or 6 players', tone: 'from-amber-700 to-emerald-800', table: 'kingdom' },
    finalvault: { label: 'The Final Vault', emoji: '🏛️', blurb: 'Five temple chambers, the same puzzles for everyone — open the treasure vault first.', players: '2, 4 or 6 players', tone: 'from-amber-600 to-yellow-800', table: 'vault' }
};
export const DIFFICULTIES = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
// How many players a room is for (Chess: always 2).
export const ROOM_SIZES = [2, 4, 6];

/**
 * The games, as the lobby shows them before the server answers: Chess and the
 * three brain games (Ludo and Carrom were replaced by them on 2026-10-24; UNO
 * was removed on 2026-10-23). Each card's picture and icon (public/games/
 * <id>-card.jpg and <id>-icon.png) are cut from the account owner's design
 * for the Competitions page (2026-10-24); the players badge is part of the
 * picture. `keywords` widen the search. Every card's button is the same
 * purple (GAME_BUTTON). `brain` marks the games played as a quiz
 * (games/QuizTable.jsx); `format` is how a game of it runs.
 * Quiz and Hackathon (asked 2026-10-23) are challenges, not games: no
 * photo, drawn instead (`art`).
 */
export const GAME_BUTTON = 'bg-gradient-to-r from-[#3b31c4] to-[#6d3fe0] hover:from-[#332aa8] hover:to-[#5d33c9] shadow-[#4f3fd8]/30';
export const GAMES = {
    chess: { label: 'Chess', emoji: '♟️', blurb: 'Two players, a clock each. Checkmate wins.', players: '2 players', tone: 'from-slate-700 to-slate-900', keywords: 'board strategy king checkmate' },
    rapidfire: { label: 'Rapid Fire', emoji: '⚡', blurb: 'Quick general-knowledge round: answer every question fast. Answers and scores are shown at the end.', players: '2–4 players', format: '15 questions · 8 s each', brain: true, tone: 'from-orange-500 to-rose-700', keywords: 'quiz speed fast general knowledge gk' },
    codeclash: { label: 'Code Clash', emoji: '💻', blurb: 'Hackathon-style coding round: predict the output, spot the bug, beat the clock.', players: '2–4 players', format: '8 challenges · 45 s each', brain: true, tone: 'from-slate-900 to-emerald-700', keywords: 'coding programming hackathon code javascript python developer' },
    brainsprint: { label: 'Brain Sprint', emoji: '🧩', blurb: 'IQ puzzles made fresh every match: series, logic, numbers. Fastest mind wins.', players: '2–4 players', format: '12 puzzles · 25 s each', brain: true, tone: 'from-cyan-600 to-indigo-600', keywords: 'iq puzzle logic reasoning series numbers brain' },
};
/** The games played as a quiz, by id. */
export const BRAIN_GAMES = Object.keys(GAMES).filter((id) => GAMES[id].brain);
export const gameImage = (id) => `/games/${id}-card.jpg?v=3`; // v3: the sharper pictures from the design
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
