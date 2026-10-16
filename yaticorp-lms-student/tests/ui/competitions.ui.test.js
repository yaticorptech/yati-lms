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
    test('seven tabs; the games are Chess, Ludo, Carrom and UNO, with a photo each, and Play Now opens a room', async () => {
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
        assert.deepEqual(result.tabs, ['Games', 'Brain Boosters', 'Competitions', 'My Games', 'Leaderboard', 'Results', 'History']);
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
        assert.doesNotMatch(result.text, /Trophy and medals|Prize/, 'no prize line on the card (the user removed it, 14 Oct)');
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

    test('a match waiting for the organizer to decide it offers no Join game', async () => {
        const waiting = { ...MATCH, needsDecision: true, gameStatus: 'abandoned', resultNote: 'Nobody joined the game. The organizer will decide this match.' };
        const { result, errors } = await screen({ entry: home('mine'), api: api({ '/competitions/me': { competitions: [COMP], upcoming: [], live: [waiting], completed: [], results: [] } }), styles: true, script: `
            await sleep(600);
            const card = $('[data-match="m1"]');
            return { text: text(card), links: [...card.querySelectorAll('a')].map((a) => a.innerText.trim()) };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Waiting for the organizer to decide this match/);
        assert.ok(!result.links.some((l) => /Join game|Watch/.test(l)), `no way into a game that is over (${result.links})`);
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
            const box = (label) => { const b = $$('nav[aria-label="Games & Competitions"] button').find((x) => x.innerText.trim() === label); return [b.getBoundingClientRect(), bar().getBoundingClientRect()]; };
            const shown = (label) => { const [r, n] = box(label); return r.left >= n.left - 1 && r.right <= n.right + 1; };
            const peeks = (label) => { const [r, n] = box(label); return r.left < n.right - 8; };
            await sleep(900);
            const atResults = { scrolled: bar().scrollLeft, results: shown('Results'), history: shown('History'), games: shown('Games') };
            $$('nav[aria-label="Games & Competitions"] button').find((x) => x.innerText.trim() === 'Games').click(); await sleep(900);
            return { atResults, atGames: { scrolled: bar().scrollLeft, games: shown('Games'), next: peeks('Brain Boosters') } };` });
        assert.deepEqual(errors, []);
        assert.ok(result.atResults.scrolled > 0, 'the bar moved on its own');
        assert.equal(result.atResults.results, true, 'Results is in view');
        assert.equal(result.atResults.history, true, 'and so is the next tab');
        assert.equal(result.atResults.games, false, 'the far end is off screen');
        assert.equal(result.atGames.scrolled, 0, 'back to Games: the bar scrolls back');
        // At the start of the bar the gamepad tile comes first, so on the
        // narrowest phone the next tab is only partly in view, enough to show the row goes on.
        assert.ok(result.atGames.games, 'Games is in view');
        assert.ok(result.atGames.next, 'and the next tab shows at the edge');
    });

    test('on a phone the game filters scroll to the chosen game by itself, with the next one in view', async () => {
        const { result, errors } = await screen({ entry: home('competitions'), api: api(), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            const row = () => $('[aria-label="Filter by game"]');
            const pick = (id) => $('[data-game-filter="' + id + '"]');
            const shown = (id) => { const r = pick(id).getBoundingClientRect(); const n = row().getBoundingClientRect(); return r.left >= n.left - 1 && r.right <= n.right + 1; };
            await sleep(700);
            const before = { overflows: row().scrollWidth > row().clientWidth, scrolled: row().scrollLeft, uno: shown('uno') };
            pick('ludo').click(); await sleep(900);
            const atLudo = { scrolled: row().scrollLeft, ludo: shown('ludo'), carrom: shown('carrom'), pressed: pick('ludo').getAttribute('aria-pressed') };
            pick('all').click(); await sleep(900);
            return { before, atLudo, atAll: { scrolled: row().scrollLeft, all: shown('all') }, sideways: document.documentElement.scrollWidth > innerWidth + 1 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.overflows, true, 'five games are wider than the phone, so the row scrolls');
        assert.equal(result.before.uno, false, 'UNO starts off screen');
        assert.equal(result.atLudo.pressed, 'true');
        assert.ok(result.atLudo.scrolled > 0, 'choosing Ludo moved the row on its own');
        assert.equal(result.atLudo.ludo, true, 'Ludo is in view');
        assert.equal(result.atLudo.carrom, true, 'and so is the next game');
        assert.equal(result.atAll.scrolled, 0, 'back to All games: the row scrolls back');
        assert.equal(result.atAll.all, true);
        assert.equal(result.sideways, false, 'the page itself never scrolls sideways');
    });

    test('on a phone the My Games tabs scroll to the chosen tab by itself, with the next one in view', async () => {
        const { result, errors } = await screen({
            entry: home('mine'), api: api({ '/competitions/me': { competitions: [COMP], upcoming: [], live: [], completed: [], results: [] } }),
            styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            const row = () => $('[aria-label="My games"]');
            const tab = (label) => $$('[aria-label="My games"] [role="tab"]').find((b) => b.innerText.replace(/\\s*\\d+$/, '').trim() === label);
            const shown = (label) => { const r = tab(label).getBoundingClientRect(), n = row().getBoundingClientRect(); return r.left >= n.left - 1 && r.right <= n.right + 1; };
            await sleep(700);
            const before = { overflows: row().scrollWidth > row().clientWidth, completed: shown('Completed') };
            tab('Live').click(); await sleep(900);
            const atLive = { scrolled: row().scrollLeft, live: shown('Live'), completed: shown('Completed') };
            tab('Registered').click(); await sleep(900);
            return { before, atLive, atFirst: { scrolled: row().scrollLeft, registered: shown('Registered') } };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.overflows, true, 'four tabs are wider than the phone, so the row scrolls');
        assert.equal(result.before.completed, false, 'Completed starts off screen');
        assert.ok(result.atLive.scrolled > 0, 'choosing Live moved the row on its own');
        assert.equal(result.atLive.live, true);
        assert.equal(result.atLive.completed, true, 'and the next tab, Completed, is in view');
        assert.equal(result.atFirst.scrolled, 0, 'back to Registered: the row scrolls back');
        assert.equal(result.atFirst.registered, true);
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

describe('a round with an odd number of teams', { skip: skipWithoutStyles }, () => {
    test('the team with the bye goes straight through: its card has no match time', async () => {
        const SCHEDULED = { ...MATCH, status: 'scheduled', gameId: null, gameStatus: null };
        const BYE = { ...MATCH, id: 'm2', slot: 1, status: 'bye', gameId: null, gameStatus: null, games: 0, winnerTeamId: 't3', decidedBy: 'bye',
            sides: [{ teamId: 't3', teamName: 'Gamma Pawns', collegeName: 'Gamma College', lineup: [] }] };
        const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Rounds } from '${srcFile('competitions/parts.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><Rounds rounds={${JSON.stringify([{ round: 0, name: 'Semi Final', matches: [SCHEDULED, BYE] }])}} /></MemoryRouter>);`;
        const { result, errors } = await screen({ entry, api: api(), script: `
            await sleep(300);
            const card = (id) => document.querySelector('[data-match="' + id + '"]').innerText;
            return { match: card('m1'), bye: card('m2') };` });
        assert.deepEqual(errors, []);
        assert.match(result.bye, /goes straight through/);
        assert.doesNotMatch(result.bye, /2026/, 'no time on a match nobody plays');
        assert.match(result.match, /2026/, 'a real match keeps its time');
    });
});

describe('a finished competition\'s results page', { skip: skipWithoutStyles }, () => {
    const team = (id, teamName, college, player) => ({ id, teamName, collegeName: college, status: 'approved', players: [{ userId: `u-${id}`, name: player }] });
    const side = (t) => ({ teamId: t.id, teamName: t.teamName, collegeName: t.collegeName, lineup: [] });
    const match = (id, round, roundName, kind, a, b, winner) => ({ id, round, roundName, kind, slot: 0, status: b ? 'completed' : 'bye', scheduledAt: '2026-10-14T05:30:00.000Z',
        sides: b ? [side(a), side(b)] : [side(a)], winnerTeamId: winner.id, places: b ? [[winner.id], [(winner === a ? b : a).id]] : [[a.id]], decidedBy: b ? 'game' : 'bye', resultNote: '', needsDecision: false, gameId: null, games: b ? 1 : 0 });
    const page = (competition, teams, rounds) => ({ entry: `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CompetitionDetail from '${srcFile('competitions/CompetitionDetail.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/competitions/${competition.id}']}><Routes><Route path="/competitions/:id" element={<CompetitionDetail />} /></Routes></MemoryRouter>);`,
    api: apiModule({ [`/competitions/${competition.id}`]: { competition, teams, rounds } }) });
    const read = `
        await sleep(700);
        const headings = [...document.querySelectorAll('h2')].map((h) => h.innerText.trim());
        const rows = [...document.querySelectorAll('[data-standing]')].map((li) => li.innerText.replace(/\\s+/g, ' ').trim());
        return { headings, rows };`;

    test('the winners, then every team in its final place; no prizes box and no college list', async () => {
        const [a, b, c, d] = [team('t1', 'SSS team', 'sssss', 'Hari Kiran'), team('t2', 'Alpha Knights', 'neworg', 'Asha'), team('t3', 'Beta Rooks', 'beta', 'Ravi'), team('t4', 'Gamma', 'gamma', 'Gauri')];
        const rounds = [
            { round: 0, name: 'Semi Final', matches: [match('m1', 0, 'Semi Final', 'main', a, d, a), match('m2', 0, 'Semi Final', 'main', b, c, b)] },
            { round: 1, name: 'Final', matches: [match('m3', 1, 'Final', 'main', a, b, a), match('m4', 1, 'Third place', 'third-place', c, d, c)] }
        ];
        const done = { ...DONE, id: 'r1', winners: [{ place: 1, teamId: 't1', teamName: 'SSS team', collegeName: 'sssss' }, { place: 2, teamId: 't2', teamName: 'Alpha Knights', collegeName: 'neworg' }, { place: 3, teamId: 't3', teamName: 'Beta Rooks', collegeName: 'beta' }],
            myTeam: { ...b } };
        const { result, errors } = await screen({ ...page(done, [d, c, b, a], rounds), styles: true, script: read });
        assert.deepEqual(errors, []);
        assert.ok(result.headings.some((h) => /Winners/.test(h)));
        assert.ok(result.headings.indexOf('Final standings') > result.headings.findIndex((h) => /Winners/.test(h)), 'the standings follow the winners');
        assert.ok(!result.headings.some((h) => /Prizes/.test(h)), 'no Prizes & rewards once it is over');
        assert.ok(!result.headings.some((h) => /Participating colleges/.test(h)), 'the standings name every team instead');
        assert.ok(result.headings.some((h) => /Competition rules/.test(h)), 'the rules stay');
        assert.deepEqual(result.rows, [
            '1 SSS team sssss · Hari Kiran Won the final Won 2 of 2',
            '2 Alpha KnightsYour team neworg · Asha Lost the final Won 1 of 2', // the tag sits beside the name, not after a space
            '3 Beta Rooks beta · Ravi Won the third-place match Won 1 of 2',
            '4 Gamma gamma · Gauri Lost the third-place match Won 0 of 2'
        ]);
    });

    test('on a phone each team keeps its name whole, with its result underneath', async () => {
        const [a, b, c, d] = [team('t1', 'SSS team', 'sssss', 'Hari Kiran'), team('t2', 'Alpha Knights', 'neworg', 'Asha'), team('t3', 'Beta Rooks', 'Sample Beta College', 'Ravi'), team('t4', 'Gamma Pawns', 'Sample Gamma College', 'Gauri')];
        const rounds = [
            { round: 0, name: 'Semi Final', matches: [match('m1', 0, 'Semi Final', 'main', a, d, a), match('m2', 0, 'Semi Final', 'main', b, c, b)] },
            { round: 1, name: 'Final', matches: [match('m3', 1, 'Final', 'main', a, b, a), match('m4', 1, 'Third place', 'third-place', c, d, c)] }
        ];
        const done = { ...DONE, id: 'r4', myTeam: { ...b }, winners: [{ place: 1, teamId: 't1', teamName: 'SSS team', collegeName: 'sssss' }, { place: 2, teamId: 't2', teamName: 'Alpha Knights', collegeName: 'neworg' }, { place: 3, teamId: 't3', teamName: 'Beta Rooks', collegeName: 'Sample Beta College' }] };
        const { result, errors } = await screen({ ...page(done, [a, b, c, d], rounds), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            return [...document.querySelectorAll('[data-standing]')].map((li) => {
                const name = li.querySelector('p.font-bold'), res = [...li.querySelectorAll('p')].find((p) => /final|match/.test(p.innerText));
                return { whole: name.scrollWidth <= name.clientWidth + 1, below: res.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 1 };
            });` });
        assert.deepEqual(errors, []);
        for (const [i, r] of result.entries()) {
            assert.equal(r.whole, true, `row ${i + 1}: the name is not cut off`);
            assert.equal(r.below, true, `row ${i + 1}: the result is under the name`);
        }
    });

    test('teams out in the same round share a rank', async () => {
        const t = ['A', 'B', 'C', 'D', 'E', 'F'].map((x) => team(x, `Team ${x}`, `College ${x}`, `Player ${x}`));
        const [A, B, C, D, E, F] = t;
        const rounds = [
            { round: 0, name: 'Quarter Final', matches: [match('q1', 0, 'Quarter Final', 'main', A, B, A), match('q2', 0, 'Quarter Final', 'main', C, D, C), match('q3', 0, 'Quarter Final', 'main', E, F, E)] },
            { round: 1, name: 'Semi Final', matches: [match('s1', 1, 'Semi Final', 'main', A, E, A), match('s2', 1, 'Semi Final', 'main', C, null, C)] },
            { round: 2, name: 'Final', matches: [match('f1', 2, 'Final', 'main', A, C, A)] }
        ];
        const done = { ...DONE, id: 'r2', myTeam: null, winners: [{ place: 1, teamId: 'A', teamName: 'Team A', collegeName: 'College A' }, { place: 2, teamId: 'C', teamName: 'Team C', collegeName: 'College C' }] };
        const { result, errors } = await screen({ ...page(done, t, rounds), styles: true, script: read });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.rows.map((r) => r.split(' College')[0]), ['1 Team A', '2 Team C', '3 Team E', '4 Team B', '4 Team D', '4 Team F']);
        assert.match(result.rows[2], /Out in the Semi Final Won 1 of 2$/);
        assert.match(result.rows[3], /Out in the Quarter Final Won 0 of 1$/);
        assert.match(result.rows[1], /Lost the final Won 1 of 2$/, 'a bye is not a match won');
    });

    test('with many teams the list shows two and scrolls for the rest, on a laptop and a phone', async () => {
        const t = ['A', 'B', 'C', 'D', 'E', 'F'].map((x) => team(x, `Team ${x}`, `College ${x}`, `Player ${x}`));
        const [A, B, C, D, E, F] = t;
        const rounds = [
            { round: 0, name: 'Quarter Final', matches: [match('q1', 0, 'Quarter Final', 'main', A, B, A), match('q2', 0, 'Quarter Final', 'main', C, D, C), match('q3', 0, 'Quarter Final', 'main', E, F, E)] },
            { round: 1, name: 'Semi Final', matches: [match('s1', 1, 'Semi Final', 'main', A, E, A), match('s2', 1, 'Semi Final', 'main', C, null, C)] },
            { round: 2, name: 'Final', matches: [match('f1', 2, 'Final', 'main', A, C, A)] }
        ];
        const many = { ...DONE, id: 'r5', myTeam: null, winners: [{ place: 1, teamId: 'A', teamName: 'Team A', collegeName: 'College A' }, { place: 2, teamId: 'C', teamName: 'Team C', collegeName: 'College C' }] };
        const look = `
            await sleep(700);
            const list = document.querySelector('[data-standings]'), rows = [...list.children];
            const two = rows[0].getBoundingClientRect().height + rows[1].getBoundingClientRect().height + 2;
            const before = { shownTop: rows[1].getBoundingClientRect().bottom <= list.getBoundingClientRect().bottom + 1,
                             thirdHidden: rows[2].getBoundingClientRect().top >= list.getBoundingClientRect().bottom - 1 };
            list.scrollTop = list.scrollHeight; await sleep(200);
            const last = rows.at(-1).getBoundingClientRect(), box = list.getBoundingClientRect();
            return { height: list.getBoundingClientRect().height, two, scrolls: list.scrollHeight > list.clientHeight + 5, before,
                     lastShown: last.bottom <= box.bottom + 1 && last.top >= box.top - 1, note: document.querySelector('[data-standings-more]')?.innerText };`;
        for (const where of [{ width: 1280, height: 900 }, { device: DEVICES.galaxyZFold6Folded }]) {
            const { result, errors } = await screen({ ...page(many, t, rounds), styles: true, ...where, script: look });
            assert.deepEqual(errors, []);
            const label = where.device ? 'phone' : 'laptop';
            assert.ok(Math.abs(result.height - result.two) <= 1.5, `${label}: as tall as two teams (${result.height} vs ${result.two})`);
            assert.equal(result.scrolls, true, `${label}: the rest scroll`);
            assert.equal(result.before.shownTop, true, `${label}: the first two show whole`);
            assert.equal(result.before.thirdHidden, true, `${label}: the third waits below`);
            assert.equal(result.lastShown, true, `${label}: scrolling reaches the last team`);
            assert.equal(result.note, 'Showing 2 of 6 teams. Scroll the list to see the rest.');
        }
    });

    test('with two teams there is nothing to scroll', async () => {
        const [a, b] = [team('t1', 'SSS team', 'sssss', 'Hari Kiran'), team('t2', 'Alpha Knights', 'neworg', 'Asha')];
        const two = { ...DONE, id: 'r6', myTeam: null, winners: [{ place: 1, teamId: 't1', teamName: 'SSS team', collegeName: 'sssss' }, { place: 2, teamId: 't2', teamName: 'Alpha Knights', collegeName: 'neworg' }] };
        const { result, errors } = await screen({ ...page(two, [a, b], [{ round: 0, name: 'Final', matches: [match('f', 0, 'Final', 'main', a, b, a)] }]), styles: true, script: `
            await sleep(700);
            const list = document.querySelector('[data-standings]');
            return { scrolls: list.scrollHeight > list.clientHeight + 1, note: !!document.querySelector('[data-standings-more]') };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result, { scrolls: false, note: false });
    });

    test('on a small phone the team line keeps its width, and two columns of rounds do not widen the page', async () => {
        const [a, b, c, d] = [team('t1', 'SSS team', 'sssss', 'Hari Kiran'), team('t2', 'Alpha Mobile', 'Sample Alpha College', 'Asha'), team('t3', 'Beta Rooks', 'beta', 'Ravi'), team('t4', 'Gamma', 'gamma', 'Gauri')];
        const rounds = [
            { round: 0, name: 'Semi Final', matches: [match('m1', 0, 'Semi Final', 'main', a, d, a), match('m2', 0, 'Semi Final', 'main', b, c, b)] },
            { round: 1, name: 'Final', matches: [match('m3', 1, 'Final', 'main', a, b, a), match('m4', 1, 'Third place', 'third-place', c, d, c)] }
        ];
        const done = { ...DONE, id: 'r7', certificates: true, winners: [{ place: 1, teamId: 't1', teamName: 'SSS team', collegeName: 'sssss' }, { place: 2, teamId: 't2', teamName: 'Alpha Mobile', collegeName: 'Sample Alpha College' }, { place: 3, teamId: 't3', teamName: 'Beta Rooks', collegeName: 'beta' }],
            myTeam: { ...b, place: 2 } };
        // In the app's own frame (a padded page scrolling inside <main>), where
        // the second column of rounds sits far enough right to show the bug.
        const bare = page(done, [a, b, c, d], rounds);
        const framed = { ...bare, entry: bare.entry.replace('element={<CompetitionDetail />}',
            'element={<div className="flex h-dvh"><main className="relative flex-1 overflow-auto"><div className="mx-auto p-4 pb-[7.5rem]"><CompetitionDetail /></div></main></div>}') };
        assert.notEqual(framed.entry, bare.entry, 'the frame was put in');
        const { result, errors } = await screen({ ...framed, styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            const line = [...document.querySelectorAll('header p')].find((p) => /You play for/.test(p.innerText));
            const box = line.parentElement.getBoundingClientRect(), text = line.getBoundingClientRect();
            const cert = [...document.querySelectorAll('header button')].find((x) => /My certificate/.test(x.innerText)).getBoundingClientRect();
            const back = [...document.querySelectorAll('a')].find((x) => /Competitions/.test(x.innerText)).getBoundingClientRect();
            const main = document.querySelector('main');
            return { share: text.width / box.width, certBelow: cert.top >= text.bottom - 1, wide: main.scrollWidth - main.clientWidth + Math.max(0, innerWidth - screen.width), backHeight: back.height };` });
        assert.deepEqual(errors, []);
        assert.ok(result.share > 0.6, `"You play for…" has room (${Math.round(result.share * 100)}% of its box)`);
        assert.equal(result.certBelow, true, 'My certificate goes under it');
        assert.ok(result.wide <= 1, `the page fits the screen (${result.wide}px too wide)`);
        assert.ok(result.backHeight >= 40, `the back link is a finger's height (${result.backHeight}px)`);
    });

    test('on a phone the podium shows each team and college name whole', async () => {
        const [a, b, c, d] = [team('t1', 'Delta Bishops', 'Sample Delta College', 'Dhanya'), team('t2', 'Alpha Knights', 'Sample Alpha College', 'Asha'), team('t3', 'Gamma Pawns', 'Sample Gamma College', 'Gauri'), team('t4', 'Beta Rooks', 'Sample Beta College', 'Ravi')];
        const rounds = [
            { round: 0, name: 'Semi Final', matches: [match('m1', 0, 'Semi Final', 'main', a, d, a), match('m2', 0, 'Semi Final', 'main', b, c, b)] },
            { round: 1, name: 'Final', matches: [match('m3', 1, 'Final', 'main', a, b, a), match('m4', 1, 'Third place', 'third-place', c, d, c)] }
        ];
        const done = { ...DONE, id: 'r8', myTeam: null, winners: [a, b, c].map((t, i) => ({ place: i + 1, teamId: t.id, teamName: t.teamName, collegeName: t.collegeName })) };
        const { result, errors } = await screen({ ...page(done, [a, b, c, d], rounds), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            return [...document.querySelectorAll('[data-podium] p')].filter((p) => p.innerText.trim()).map((p) => ({ text: p.innerText.trim(), whole: p.scrollWidth <= p.clientWidth + 1 && p.scrollHeight <= p.clientHeight + 1 }));` });
        assert.deepEqual(errors, []);
        for (const name of ['Delta Bishops', 'Sample Delta College', 'Alpha Knights', 'Sample Alpha College', 'Gamma Pawns', 'Sample Gamma College']) {
            const p = result.find((x) => x.text === name);
            assert.ok(p, `${name} is on the podium`);
            assert.equal(p.whole, true, `${name} is not cut off`);
        }
    });

    test('before it is over the page still shows the prizes, and no standings', async () => {
        const live = { ...COMP, id: 'r3', status: 'live', phase: 'live' };
        const { result, errors } = await screen({ ...page(live, [], []), styles: true, script: read });
        assert.deepEqual(errors, []);
        assert.ok(result.headings.some((h) => /Prizes/.test(h)));
        assert.ok(!result.headings.includes('Final standings'));
    });
});

describe('a college\'s own competition', { skip: skipWithoutStyles }, () => {
    // Hosted by a college for its own students only: teams, not colleges.
    const OWN = { ...COMP, id: 'c9', name: 'Delta Chess Day', organizedBy: 'Sample Delta College', hostOrganizationId: 'o1', status: 'registration', phase: 'registration-open',
        registrationOpen: true, teamsCount: 2, playersCount: 4, myTeam: null };
    const TEAMS = ['Reds', 'Blues'].map((teamName, i) => ({ id: `t${i + 1}`, teamName, collegeName: 'Sample Delta College', status: 'approved', place: null, coordinator: { name: 'Delta Coordinator' },
        players: [{ userId: `u${i}a`, name: `${teamName} One` }, { userId: `u${i}b`, name: `${teamName} Two` }] }));
    const ownApi = apiModule({
        '/competitions/rooms/mine': { rooms: [] },
        '/competitions/c9': { competition: OWN, teams: TEAMS, rounds: [] },
        '/competitions': { competitions: [OWN, COMP] }
    });

    test('its page says it is for the college\'s students, in teams the college makes', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CompetitionDetail from '${srcFile('competitions/CompetitionDetail.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/competitions/c9']}><Routes><Route path="/competitions/:id" element={<CompetitionDetail />} /></Routes></MemoryRouter>);`;
        const { result, errors } = await screen({ entry, api: ownApi, script: `
            await sleep(700);
            return { page: document.body.innerText, note: document.querySelector('[data-register-note]')?.innerText || '' };` });
        assert.deepEqual(errors, []);
        assert.match(result.page, /Your college/);
        assert.doesNotMatch(result.page, /Inter-College/);
        assert.match(result.page, /8 teams · up to 2 players each/);
        assert.match(result.note, /for your college's students only/);
        assert.match(result.page, /Teams\s*\(2\)/);
        assert.doesNotMatch(result.page, /Participating colleges|coordinator Delta Coordinator/);
    });

    test('its card says Your college and counts teams', async () => {
        const { result, errors } = await screen({ entry: home('competitions'), api: ownApi, script: `
            await sleep(700);
            return { own: document.querySelector('[data-competition="c9"]').innerText, other: document.querySelector('[data-competition="c1"]').innerText };` });
        assert.deepEqual(errors, []);
        assert.match(result.own, /Your college/);
        assert.match(result.own, /2 Teams/);
        assert.doesNotMatch(result.other, /Your college/, 'an inter-college one does not say so');
        assert.match(result.other, /Colleges/);
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

describe('on a small phone', { skip: skipWithoutStyles }, () => {
    test('a finished game: the status line is whole, and the result text is not squeezed under its button', async () => {
        const reason = 'White ran out of time';
        const lost = gameRow({ status: 'finished', outcome: { places: [[1], [0]], reason },
            view: { ...chessView('finished'), message: 'White ran out of time — Ravi wins the game on the clock.', outcome: { places: [[1], [0]], reason } } });
        const { result, errors } = await screen({ entry: page, api: apiModule({ '/competitions/play/g1': { game: lost } }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            const status = [...document.querySelectorAll('header p')].find((p) => /ran out of time/.test(p.innerText));
            const card = $('[data-outcome]'), heading = [...card.querySelectorAll('p')].find((p) => /won/.test(p.innerText));
            const words = heading.parentElement.getBoundingClientRect(), button = [...card.querySelectorAll('a')].find((a) => /Back to/.test(a.innerText)).getBoundingClientRect();
            const back = [...document.querySelectorAll('a')].find((a) => /Games/.test(a.innerText)).getBoundingClientRect();
            return { statusWhole: status.scrollWidth <= status.clientWidth + 1, share: words.width / card.getBoundingClientRect().width,
                     apart: button.top >= words.bottom - 1 || button.left >= words.right - 1, backHeight: back.height };` });
        assert.deepEqual(errors, []);
        assert.equal(result.statusWhole, true, 'the status line wraps instead of ending in "…"');
        assert.ok(result.share > 0.6, `the result text has room (${Math.round(result.share * 100)}% of the card)`);
        assert.equal(result.apart, true, 'the button does not sit on the text');
        assert.ok(result.backHeight >= 40, `the back link is a finger's height (${result.backHeight}px)`);
    });

    test('Leaderboard: College, Team and Individual on one line, every word whole', async () => {
        for (const device of [DEVICES.galaxyZFold6Folded, DEVICES.galaxyA55]) {
            const { result, errors } = await screen({ entry: home('leaderboard'), api: api(), styles: true, device, script: `
                await sleep(700);
                const tabs = [...document.querySelectorAll('[role="tablist"][aria-label="Ranking"] [role="tab"]')];
                const tops = tabs.map((t) => Math.round(t.getBoundingClientRect().top));
                const list = tabs[0].parentElement;
                return { labels: tabs.map((t) => t.innerText.trim()), oneLine: new Set(tops).size === 1,
                         whole: tabs.every((t) => t.scrollWidth <= t.clientWidth + 1), inside: list.scrollWidth <= list.clientWidth + 1 };` });
            assert.deepEqual(errors, []);
            assert.deepEqual(result.labels, ['College', 'Team', 'Individual']);
            assert.equal(result.oneLine, true, `${device.width}px: the three on one line`);
            assert.equal(result.whole, true, `${device.width}px: no label cut off`);
            assert.equal(result.inside, true, `${device.width}px: nothing sticks out of the row`);
        }
    });

    test('Leaderboard: the top two show, and the rest scroll inside the list', async () => {
        const college = (i) => ({ id: `o${i}`, rank: i, collegeName: `College ${i}`, competitions: 1, played: 2, won: 1, titles: 0, points: 20 - i });
        const many = { ...BOARD, colleges: [1, 2, 3, 4, 5, 6].map(college) };
        const { result, errors } = await screen({ entry: home('leaderboard'), api: api({ '/competitions/leaderboard': many }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            const list = document.querySelector('[data-ranking="colleges"]'), rows = [...list.children];
            const two = rows[0].getBoundingClientRect().height + rows[1].getBoundingClientRect().height;
            const height = list.getBoundingClientRect().height, scrolls = list.scrollHeight > list.clientHeight + 5;
            list.scrollTop = list.scrollHeight; await sleep(200);
            const last = rows.at(-1).getBoundingClientRect(), box = list.getBoundingClientRect();
            const note = document.querySelector('[data-ranking-more]')?.innerText;
            [...document.querySelectorAll('[aria-label="Ranking"] [role="tab"]')].find((t) => /Team/.test(t.innerText)).click(); await sleep(400);
            return { height, two, scrolls, lastShown: last.bottom <= box.bottom + 1, note,
                     teamNote: document.querySelector('[data-ranking-more]')?.innerText || null };` });
        assert.deepEqual(errors, []);
        assert.ok(Math.abs(result.height - result.two) <= 1.5, `as tall as two rows (${result.height} vs ${result.two})`);
        assert.equal(result.scrolls, true, 'the rest scroll');
        assert.equal(result.lastShown, true, 'scrolling reaches the last college');
        assert.equal(result.note, 'Showing 2 of 6 colleges. Scroll the list to see the rest.');
        assert.equal(result.teamNote, null, 'one team ranked: nothing to scroll, no note');
    });

    test('Your Games: Continue and Open room are a finger\'s height', async () => {
        const rooms = [
            { id: 'r1', game: 'chess', label: 'Chess', emoji: '♟️', code: 'GZVS8K', status: 'waiting', host: true, seats: [{ name: 'Asha' }] },
            { id: 'r2', game: 'uno', label: 'UNO', emoji: '🃏', code: '7C3S36', status: 'active', host: true, seats: [{ name: 'Asha' }, { name: 'Ravi' }] }
        ];
        const { result, errors } = await screen({ entry: home(), api: api({ '/competitions/rooms/mine': { rooms } }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            return $$('[data-room] a').map((a) => [a.innerText.trim(), Math.round(a.getBoundingClientRect().height)]);` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.map(([label]) => label).sort(), ['Continue', 'Open room']);
        for (const [label, height] of result) assert.ok(height >= 36, `${label} is ${height}px tall`);
    });

    test('History: the competition name is whole, and Certificate goes under it rather than squeezing it', async () => {
        const long = { ...RESULT, competition: { ...RESULT.competition, name: 'Inter-College Chess Championship 2026' } };
        const { result, errors } = await screen({ entry: home('history'), api: api({ '/competitions/me': { competitions: [COMP], upcoming: [], live: [], completed: [], results: [long] } }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            const row = $('[data-history] li'), name = row.querySelector('a'), words = name.parentElement.getBoundingClientRect();
            const cert = [...row.querySelectorAll('button')].find((b) => /Certificate/.test(b.innerText)).getBoundingClientRect();
            return { whole: name.scrollWidth <= name.clientWidth + 1 && /Championship 2026/.test(name.innerText), share: words.width / row.getBoundingClientRect().width, below: cert.top >= words.bottom - 1 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.whole, true, 'the name is not cut to "…"');
        assert.ok(result.share > 0.6, `the details have room (${Math.round(result.share * 100)}% of the row)`);
        assert.equal(result.below, true, 'Certificate is under them');
    });

    test('the banners\' description lines, the stars note and a game\'s tagline and goal are left out on a phone, and kept on a laptop', async () => {
        const look = `
            await sleep(900);
            const line = (re) => [...document.querySelectorAll('p')].find((p) => re.test(p.textContent));
            const shown = (el) => !!el && el.getClientRects().length > 0;
            return { hero: shown(line(/Compete with your college friends/)), boosters: shown(line(/Where every challenge makes you/)), boostersThere: !!line(/Where every challenge makes you/) };`;
        // Brain Boosters reads the signed-in student, so it gets one here.
        const boosters = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import CompetitionsHome from '${srcFile('competitions/CompetitionsHome.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Asha' } }}><MemoryRouter initialEntries={['/competitions?tab=brain-boosters']}><CompetitionsHome /></MemoryRouter></AuthContext.Provider>);`;
        const boostersApi = api({ '/games/time': {} });
        // The page, then a game's "Ready?" screen (Sequence Recall's).
        const boostersLook = `
            await sleep(2500);
            const line = (re) => [...document.querySelectorAll('p')].find((p) => re.test(p.textContent));
            const shown = (el) => !!el && el.getClientRects().length > 0;
            const page = { boosters: shown(line(/Where every challenge makes you/)), boostersThere: !!line(/Where every challenge makes you/), stars: shown(line(/Your level and stars in each game/)), starsThere: !!line(/Your level and stars in each game/) };
            const card = document.querySelector('[data-game="sequence-recall"]');
            (card.matches('button') ? card : card.querySelector('button')).click();
            await sleep(1500);
            const goal = [...document.querySelectorAll('span')].find((el) => /^Repeat a run of \\d+ to clear this level\\.$/.test(el.textContent));
            return { ...page, tagline: shown(line(/Repeating a sequence back is how every skill starts/)), taglineThere: !!line(/Repeating a sequence back is how every skill starts/), goal: shown(goal), goalThere: !!goal };`;
        const phone = await screen({ entry: boosters, api: boostersApi, styles: true, device: DEVICES.galaxyZFold6Folded, script: boostersLook });
        const laptop = await screen({ entry: boosters, api: boostersApi, styles: true, width: 1366, height: 900, script: boostersLook });
        const games = await screen({ entry: home(), api: api(), styles: true, device: DEVICES.galaxyZFold6Folded, script: look });
        const gamesLaptop = await screen({ entry: home(), api: api(), styles: true, width: 1366, height: 900, script: look });
        assert.equal(games.result.hero, false, 'phone: no "Compete with your college friends…"');
        assert.equal(gamesLaptop.result.hero, true, 'laptop: it is there');
        assert.equal(phone.result.boostersThere && laptop.result.boostersThere, true, 'the Brain Boosters page rendered');
        assert.equal(phone.result.boosters, false, 'phone: no "Where every challenge makes you sharper…"');
        assert.equal(laptop.result.boosters, true, 'laptop: it is there');
        assert.equal(phone.result.starsThere && phone.result.taglineThere, true, 'the stars note and the game\'s tagline rendered');
        assert.equal(phone.result.stars, false, 'phone: no "Your level and stars in each game are saved…"');
        assert.equal(laptop.result.stars, true, 'laptop: it is there');
        assert.equal(phone.result.tagline, false, 'phone: no "Repeating a sequence back is how every skill starts."');
        assert.equal(laptop.result.tagline, true, 'laptop: it is there');
        assert.equal(phone.result.goalThere, true, 'the game\'s goal rendered');
        assert.equal(phone.result.goal, false, 'phone: no "Repeat a run of 3 to clear this level."');
        assert.equal(laptop.result.goal, true, 'laptop: it is there');
    });

    test('Results: a card with long college names stays inside the screen', async () => {
        const LONG = { ...DONE, winners: [{ place: 1, teamId: 't1', teamName: 'Alpha Knights', collegeName: 'Sample Delta College of Engineering and Technology' },
            { place: 2, teamId: 't2', teamName: 'Beta Rooks', collegeName: 'Sample Alpha College of Arts, Science and Commerce' }] };
        // In the app's own frame: the page scrolls inside <main>, which is where
        // a card too wide shows (bare, the phone just widens its viewport).
        const framed = home('results').replace('element={<><CompetitionsHome /><Where /></>}',
            'element={<div className="flex h-dvh"><main className="relative flex-1 overflow-auto"><div className="mx-auto p-4 pb-[7.5rem]"><CompetitionsHome /><Where /></div></main></div>}');
        assert.notEqual(framed, home('results'), 'the frame was put in');
        const { result, errors } = await screen({ entry: framed, api: api({ '/competitions/history': { competitions: [{ competition: LONG, teams: [{}, {}], rounds: [] }] } }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(700);
            const card = $('[data-result="c3"]').closest('section').getBoundingClientRect(), main = $('main');
            return { right: card.right, width: screen.width, wide: main.scrollWidth - main.clientWidth + Math.max(0, innerWidth - screen.width) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.right <= result.width + 0.5, `the card ends inside the screen (${Math.round(result.right)} of ${result.width}px)`);
        assert.ok(result.wide <= 1, 'and the page does not scroll sideways');
    });
});
