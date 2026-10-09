/**
 * Games & Competitions in the student app: the section's tabs, starting a
 * friendly game, a competition's live match offering Join game, the
 * leaderboard's three rankings, and the game page — its waiting room, the
 * board for a game in play, and the result.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const COMP = {
    id: 'c1', name: 'Inter-College Chess Cup', organizedBy: 'YATICORP', description: '', game: 'chess', gameLabel: 'Chess', emoji: '♟️',
    startsAt: '2026-10-20T10:00:00.000Z', registrationDeadline: '2026-10-18T10:00:00.000Z', registrationOpen: false,
    maxTeams: 8, playersPerTeam: 2, playersPerSide: 1, teamsPerMatch: 2, rules: 'Be fair.', prizes: [{ place: 1, title: 'Champions', xp: 300, rewardPoints: 100 }],
    participationXp: 20, certificates: true, participationCertificates: true, status: 'live', phase: 'live', teamsCount: 4, playersCount: 8, prizeDetails: 'Trophy and medals', colleges: ['Alpha', 'Beta'], winners: [], myTeam: { id: 't1', teamName: 'Alpha Knights', collegeName: 'Alpha College', status: 'approved', players: [] }
};
const MATCH = {
    id: 'm1', round: 0, roundName: 'Semi Final', kind: 'main', slot: 0, status: 'live', scheduledAt: '2026-10-20T10:00:00.000Z',
    sides: [{ teamId: 't1', teamName: 'Alpha Knights', collegeName: 'Alpha College', lineup: [{ userId: 'u1', name: 'Asha' }] },
        { teamId: 't2', teamName: 'Beta Rooks', collegeName: 'Beta College', lineup: [{ userId: 'u2', name: 'Ravi' }] }],
    winnerTeamId: null, places: [], decidedBy: null, resultNote: '', needsDecision: false, gameId: 'g1', gameStatus: 'active', games: 1,
    competition: { id: 'c1', name: COMP.name, game: 'chess', emoji: '♟️' }, myTeamId: 't1', playing: true, result: null
};
const BOARD = {
    colleges: [{ id: 'o1', rank: 1, collegeName: 'Alpha College', competitions: 2, played: 5, won: 4, titles: 1, points: 27 }],
    teams: [{ id: 't1', rank: 1, teamName: 'Alpha Knights', collegeName: 'Alpha College', competition: COMP.name, played: 3, won: 3, place: 1, points: 22 }],
    players: [{ id: 'u1', rank: 1, name: 'Asha', collegeName: 'Alpha College', played: 3, won: 3, titles: 1, points: 22 }]
};

const LUDO = { ...COMP, id: 'c2', name: 'Inter-College Ludo Championship', game: 'ludo', gameLabel: 'Ludo', emoji: '🎲', status: 'registration', phase: 'closing-soon', myTeam: null };
const DONE = { ...COMP, id: 'c3', name: 'Chess Cup 2025', status: 'completed', phase: 'completed', completedAt: '2026-09-01T10:00:00.000Z',
    winners: [{ place: 1, teamId: 't1', teamName: 'Alpha Knights', collegeName: 'Alpha College' }, { place: 2, teamId: 't2', teamName: 'Beta Rooks', collegeName: 'Beta College' }, { place: 3, teamId: 't3', teamName: 'Gamma', collegeName: 'Gamma College' }] };
const RESULT = { competition: { id: 'c3', name: 'Chess Cup 2025', game: 'chess', gameLabel: 'Chess', emoji: '♟️', completedAt: '2026-09-01T10:00:00.000Z' },
    teamName: 'Alpha Knights', collegeName: 'Alpha College', place: 1, score: { won: 3, played: 3 }, certificate: true };

const api = (extra = {}) => apiModule({
    '/competitions/rooms/mine': { rooms: [] },
    '/competitions/me': { competitions: [COMP], upcoming: [], live: [MATCH], completed: [], results: [RESULT] },
    '/competitions/leaderboard': BOARD,
    '/competitions/history': { competitions: [{ competition: DONE, teams: [{}, {}, {}, {}], rounds: [] }] },
    ...extra,
    '/competitions': { competitions: [COMP, LUDO, DONE] }
}, `(url) => (url.includes('/rooms') ? { game: { id: 'room1', code: 'K7Q2XM' } } : {})`);

const home = (tab = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import CompetitionsHome from '${srcFile('competitions/CompetitionsHome.jsx')}';
const Where = () => { const l = useLocation(); return <p id="where">{l.pathname}{l.search}</p>; };
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/competitions${tab ? `?tab=${tab}` : ''}']}>
    <Routes><Route path="/competitions" element={<><CompetitionsHome /><Where /></>} /><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter>);`;

describe('the Games & Competitions section', { skip: skipWithoutStyles }, () => {
    test('six tabs; the games are Chess, Ludo, Carrom and UNO, with a photo each, and Play Now opens a room', async () => {
        const { result, errors } = await screen({ entry: home(), api: api(), styles: true, script: `
            await sleep(600);
            const tabs = $$('nav[aria-label="Games & Competitions"] button').map((b) => b.innerText.trim());
            const games = $$('[data-game]').map((g) => g.dataset.game);
            const photos = $$('[data-game] img').map((i) => i.getAttribute('src'));
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            const search = $('input[type=search]'); setter.call(search, 'car'); search.dispatchEvent(new Event('input', { bubbles: true })); await sleep(150);
            const searched = $$('[data-game]').map((g) => g.dataset.game);
            setter.call(search, ''); search.dispatchEvent(new Event('input', { bubbles: true })); await sleep(150);
            // The cards came back after the search, so find the button now.
            [...$('[data-game="ludo"]').querySelectorAll('button')].find((b) => /Play Now/.test(b.innerText)).click(); await sleep(500);
            return { tabs, games, photos, searched, where: $('#where').innerText, posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.tabs, ['Games', 'Competitions', 'My Games', 'Leaderboard', 'Results', 'History']);
        assert.deepEqual(result.games, ['chess', 'ludo', 'carrom', 'uno']);
        assert.deepEqual(result.photos, ['/games/chess.jpg', '/games/chess-icon.png', '/games/ludo.jpg', '/games/ludo-icon.png', '/games/carrom.jpg', '/games/carrom-icon.png', '/games/uno.jpg', '/games/uno-icon.png']);
        assert.deepEqual(result.searched, ['carrom'], 'Search games narrows the cards');
        assert.equal(result.posted[0][0], '/competitions/rooms');
        assert.equal(result.posted[0][1].game, 'ludo');
        assert.equal(result.where, '/competitions/play/room1', 'straight into the new room');
    });

    test('the Competitions tab: game filters, then the competitions as simple cards', async () => {
        const { result } = await screen({ entry: home('competitions'), api: api(), styles: true, script: `
            await sleep(600);
            const card = $('[data-competition="c1"]');
            const view = [...card.querySelectorAll('a')].find((a) => /View Competition/.test(a.innerText));
            const before = $$('[data-competition]').map((c) => c.dataset.competition);
            $('[data-game-filter="ludo"]').click(); await sleep(200);
            const ludoOnly = $$('[data-competition]').map((c) => c.dataset.competition);
            return { text: text(card), href: view?.getAttribute('href'), before, ludoOnly,
                     ludoPhase: $('[data-competition="c2"] [data-phase]')?.innerText,
                     filters: $$('[data-game-filter]').map((b) => b.innerText.trim()) };` });
        assert.deepEqual(result.filters.map((f) => f.replace(/^\S+\s/, '')), ['All games', 'Chess', 'Ludo', 'Carrom', 'UNO']);
        assert.match(result.text, /Inter-College Chess Cup/);
        assert.match(result.text, /4 Colleges/);
        assert.match(result.text, /8 Players/);
        assert.match(result.text, /Trophy and medals/, 'the prize');
        assert.match(result.text, /Your team: Alpha Knights/);
        assert.equal(result.href, '/competitions/c1');
        assert.deepEqual(result.before.sort(), ['c1', 'c2'], 'a finished competition belongs to Results, not here');
        assert.deepEqual(result.ludoOnly, ['c2'], 'the game filter narrows the list');
        assert.match(result.ludoPhase, /Registration Closing Soon/);
    });

    test('My Games: Registered, Upcoming, Live, Completed — and a live match offers Join game', async () => {
        const { result } = await screen({ entry: home('mine'), api: api(), styles: true, script: `
            await sleep(600);
            const subs = $$('[aria-label="My games"] [role="tab"]').map((b) => b.innerText.replace(/\\s+/g, ' ').trim());
            const m = $('[data-match="m1"]');
            const join = [...m.querySelectorAll('a')].find((a) => /Join game/.test(a.innerText));
            return { subs, join: join?.getAttribute('href'), match: text(m) };` });
        assert.deepEqual(result.subs.map((x) => x.replace(/ \d+$/, '')), ['Registered', 'Upcoming', 'Live', 'Completed']);
        assert.equal(result.join, '/competitions/play/g1', 'it opens on Live when a match is on');
        assert.match(result.match, /Your team Alpha Knights/);
        assert.match(result.match, /Opponent Beta Rooks \(Beta College\)/);
    });

    test('My Games on a phone: a registered competition reads across the row, not down a narrow column', async () => {
        // The chip used to sit beside the name and the details together, and on
        // a phone it squeezed them to "Inter c…" over a column two words wide.
        const LONG = { ...COMP, name: 'Inter College Chess Championship', status: 'registration', phase: 'registration-open',
            myTeam: { ...COMP.myTeam, teamName: 'St Agnes College' } };
        const { result, errors } = await screen({
            entry: home('mine'), api: api({ '/competitions/me': { competitions: [LONG], upcoming: [], live: [], completed: [], results: [] } }),
            styles: true, device: DEVICES.galaxyA55, script: `
                await sleep(600);
                const li = $('[aria-label="My games"]').parentElement.querySelector('li');
                const name = li.querySelector('a'), details = name.parentElement.nextElementSibling;
                const chip = name.nextElementSibling;
                const L = li.getBoundingClientRect(), N = name.getBoundingClientRect(), D = details.getBoundingClientRect(), C = chip.getBoundingClientRect();
                return { name: name.innerText, cut: name.scrollWidth > name.clientWidth + 1, details: details.innerText,
                         detailsShare: D.width / L.width, detailsLines: Math.round(D.height / parseFloat(getComputedStyle(details).lineHeight)),
                         chipBesideName: C.left >= N.right && C.top < N.bottom, inside: C.right <= L.right + 1,
                         pageScrolls: document.documentElement.scrollWidth > innerWidth };` });
        assert.deepEqual(errors, []);
        assert.equal(result.name, 'Inter College Chess Championship', 'the whole name, not "Inter c…"');
        assert.equal(result.cut, false);
        assert.match(result.details, /Team: St Agnes College · Approved · /);
        assert.ok(result.detailsShare > 0.8, `the details use the row's width (${(result.detailsShare * 100).toFixed(0)}%)`);
        assert.ok(result.detailsLines <= 2, `in two lines at most, not ${result.detailsLines}`);
        assert.equal(result.chipBesideName, true, 'the status chip stays beside the name');
        assert.equal(result.inside, true);
        assert.equal(result.pageScrolls, false);
    });

    test('Results: winner, runner-up and third place, and the full results', async () => {
        const { result } = await screen({ entry: home('results'), api: api(), styles: true, script: `
            await sleep(600);
            return { text: text($('[data-result="c3"]')), href: [...$('[data-result="c3"]').querySelectorAll('a')].find((a) => /View Full Results/.test(a.innerText))?.getAttribute('href') };` });
        assert.match(result.text, /Winner Alpha College/);
        assert.match(result.text, /Runner-up Beta College/);
        assert.match(result.text, /Third place Gamma College/);
        assert.match(result.text, /4 participating colleges/);
        assert.equal(result.href, '/competitions/c3');
    });

    test('History: my past competitions, position, score and certificate', async () => {
        const { result } = await screen({ entry: home('history'), api: api(), styles: true, script: `
            await sleep(600);
            return { text: text($('[data-history]')), cert: $$('[data-history] button').some((b) => /Certificate/.test(b.innerText)) };` });
        assert.match(result.text, /Chess Cup 2025/);
        assert.match(result.text, /1st place/);
        assert.match(result.text, /3\/3 matches won/);
        assert.match(result.text, /Alpha College/);
        assert.equal(result.cert, true);
    });

    test('the leaderboard ranks colleges, teams and players', async () => {
        const { result } = await screen({ entry: home('leaderboard'), api: api(), styles: true, script: `
            await sleep(600);
            const read = () => text($('[data-ranking]'));
            const colleges = read();
            $$('[role="tab"]').find((b) => /Individual/.test(b.innerText)).click(); await sleep(200);
            return { colleges, players: read(), board: $('[data-ranking]').dataset.ranking };` });
        assert.match(result.colleges, /Alpha College/);
        assert.match(result.colleges, /27/);
        assert.equal(result.board, 'players');
        assert.match(result.players, /Asha/);
    });

    test('Your Games: open a room, copy its code, or leave it; three rows show, the rest scroll', async () => {
        const rooms = [
            { id: 'r1', game: 'chess', label: 'Chess', emoji: '♟️', code: 'GZVS8K', status: 'waiting', host: false, seats: [{ name: 'Bhagyashree' }] },
            { id: 'r2', game: 'carrom', label: 'Carrom', emoji: '🟤', code: '7C3S36', status: 'active', host: true, seats: [{ name: 'Bhagyashree' }, { name: 'Asha' }] },
            ...['ludo', 'ludo', 'uno', 'chess'].map((game, i) => ({ id: `x${i}`, game, label: game.toUpperCase(), emoji: '', code: `CODE0${i}`, status: 'waiting', host: true, seats: [{ name: 'Bhagyashree' }] }))
        ];
        const { result, errors } = await screen({ entry: home(), api: api({ '/competitions/rooms/mine': { rooms } }), styles: true, script: `
            await sleep(600);
            const box = $('[data-your-games]');
            const rows = $$('[data-room]').map((r) => text(r));
            const links = $$('[data-room] a').map((a) => [a.innerText.trim(), a.getAttribute('href')]);
            $('[data-room="r1"] button[aria-haspopup]').click(); await sleep(100);
            const menu1 = $$('[data-room="r1"] [role=menuitem]').map((b) => b.innerText.trim());
            $$('[data-room="r1"] [role=menuitem]').find((b) => /Leave room/.test(b.innerText)).click(); await sleep(400);
            $('[data-room="r2"] button[aria-haspopup]').click(); await sleep(100);
            const menu2 = $$('[data-room="r2"] [role=menuitem]').map((b) => b.innerText.trim());
            const list = $('[data-rooms]'); const row = $('[data-room="r1"]');
            const scroll = { rows: $$('[data-room]').length, shown: Math.round(list.clientHeight / row.getBoundingClientRect().height * 10) / 10, scrolls: list.scrollHeight > list.clientHeight + 2, scrollable: getComputedStyle(list).overflowY };
            return { rows, links, menu1, menu2, scroll, posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]), reloaded: window.__calls.filter((c) => c[1] === '/competitions/rooms/mine').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.rows[0], /Chess · GZVS8K Bhagyashree/);
        assert.match(result.rows[1], /Carrom · 7C3S36 Bhagyashree, Asha/);
        assert.deepEqual(result.links.slice(0, 2), [['Open room', '/competitions/play/r1'], ['Continue', '/competitions/play/r2']]);
        assert.equal(result.scroll.rows, 6, 'every room is in the list');
        assert.equal(result.scroll.scrollable, 'auto');
        assert.ok(result.scroll.scrolls, 'but the list scrolls');
        assert.ok(result.scroll.shown >= 2.9 && result.scroll.shown <= 3.3, `about three rows show at once (${result.scroll.shown})`);
        assert.deepEqual(result.menu1, ['Copy code', 'Leave room'], 'a room not started can be left');
        assert.deepEqual(result.posted, ['/competitions/play/r1/leave']);
        assert.equal(result.reloaded, 2, 'the list is asked for again after leaving');
        assert.deepEqual(result.menu2, ['Copy code'], 'a game in play cannot be left here');
    });

    test('on a phone the tab bar scrolls to the chosen tab by itself, with the next one in view', async () => {
        const { result, errors } = await screen({ entry: home('results'), api: api(), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            const bar = () => $('nav[aria-label="Games & Competitions"]');
            const shown = (label) => { const b = $$('nav[aria-label="Games & Competitions"] button').find((x) => x.innerText.trim() === label); const r = b.getBoundingClientRect(); const n = bar().getBoundingClientRect(); return r.left >= n.left - 1 && r.right <= n.right + 1; };
            await sleep(900);
            const atResults = { scrolled: bar().scrollLeft, results: shown('Results'), history: shown('History'), games: shown('Games') };
            $$('nav[aria-label="Games & Competitions"] button').find((x) => x.innerText.trim() === 'Games').click(); await sleep(900);
            return { atResults, atGames: { scrolled: bar().scrollLeft, games: shown('Games'), competitions: shown('Competitions') } };` });
        assert.deepEqual(errors, []);
        assert.ok(result.atResults.scrolled > 0, 'the bar moved on its own');
        assert.equal(result.atResults.results, true, 'Results is in view');
        assert.equal(result.atResults.history, true, 'and so is the next tab');
        assert.equal(result.atResults.games, false, 'the far end is off screen');
        assert.equal(result.atGames.scrolled, 0, 'back to Games: the bar scrolls back');
        assert.ok(result.atGames.games && result.atGames.competitions);
    });

    test('it fits a phone without scrolling sideways', async () => {
        for (const tab of ['', 'mine']) {
            const { result } = await screen({ entry: home(tab), api: api(), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
                await sleep(700);
                return { sideways: document.documentElement.scrollWidth > innerWidth + 1 };` });
            assert.equal(result.sideways, false, tab || 'games');
        }
    });
});

/* ── The game page ───────────────────────────────────────────────────── */

const chessView = (status = 'active') => ({
    game: 'chess', status, you: 0, turn: status === 'active' ? 0 : null, deadline: null, message: 'White to play',
    seats: [{ name: 'Asha', side: 0, label: 'White', color: '#f8fafc' }, { name: 'Ravi', side: 1, label: 'Black', color: '#0f172a' }],
    outcome: null, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    board: [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map((t) => ({ type: t, color: 'b' })), Array(8).fill({ type: 'p', color: 'b' }),
        Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
        Array(8).fill({ type: 'p', color: 'w' }), ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map((t) => ({ type: t, color: 'w' }))
    ],
    lastMove: null, inCheck: false, history: [], clocks: { 0: 600000, 1: 600000 }, clock: { minutes: 10, incrementSeconds: 0 },
    drawOffer: null, canOfferDraw: true, legalMoves: [{ from: 'e2', to: 'e4' }, { from: 'e2', to: 'e3' }]
});
const gameRow = (over) => ({
    id: 'g1', kind: 'friendly', game: 'chess', label: 'Chess', emoji: '♟️', status: 'active', version: 3, you: 0, host: true, code: 'K7Q2XM',
    seats: [{ name: 'Asha', side: 0, joined: true }, { name: 'Ravi', side: 1, joined: true }], minSeats: 2, maxSeats: 2, joinDeadline: null, outcome: null,
    view: chessView(), ...over
});
const page = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GamePage from '${srcFile('competitions/GamePage.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/competitions/play/g1']}><Routes><Route path="/competitions/play/:gameId" element={<GamePage />} /></Routes></MemoryRouter>);`;

describe('the game page', { skip: skipWithoutStyles }, () => {
    test('a friendly room waiting: the code, the players, and Start for the host', async () => {
        const waiting = gameRow({ status: 'waiting', view: null, seats: [{ name: 'Asha', side: 0, joined: true }] });
        const { result, errors } = await screen({ entry: page, api: apiModule({ '/competitions/play/g1': { game: waiting } }), styles: true, script: `
            await sleep(700);
            const start = $$('button').find((b) => /Start game/.test(b.innerText));
            return { body: text(document.body), startDisabled: start?.disabled };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /K7Q2XM/);
        assert.match(result.body, /Asha/);
        assert.equal(result.startDisabled, true, 'not until a second player joins');
    });

    test('a game in play: the players, whose turn, and the board; a move goes to the server', async () => {
        const { result, errors } = await screen({ entry: page, api: apiModule({ '/competitions/play/g1': { game: gameRow() } }), styles: true, script: `
            await sleep(900);
            const chips = $$('[data-seat-chip]').map(text);
            $('[data-square="e2"]').click(); await sleep(150);
            $('[data-square="e4"]').click(); await sleep(300);
            return { chips, squares: $$('[data-square]').length,
                     sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.squares, 64);
        assert.deepEqual(result.chips, [], 'chess shows its players in its own bars, with the clocks');
        assert.deepEqual(result.sent[0], ['/competitions/play/g1/action', { action: { type: 'move', from: 'e2', to: 'e4' } }]);
    });

    test('a finished game: who won, and why', async () => {
        const done = gameRow({ status: 'finished', outcome: { places: [[0], [1]], reason: 'Checkmate' }, view: { ...chessView('finished'), outcome: { places: [[0], [1]], reason: 'Checkmate' } } });
        const { result } = await screen({ entry: page, api: apiModule({ '/competitions/play/g1': { game: done } }), styles: true, script: `
            await sleep(700);
            return { outcome: text($('[data-outcome]')) };` });
        assert.match(result.outcome, /You won!/);
        assert.match(result.outcome, /Checkmate/);
    });
});
