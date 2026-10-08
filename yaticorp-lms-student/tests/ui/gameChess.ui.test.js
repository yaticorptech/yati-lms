/**
 * The chess table on its own, fed views shaped exactly like the server's
 * chess engine makes them (competitions/games/chess.js). The student app has
 * no chess library, so everything the table shows — where a piece may go, the
 * promotion choice, the clocks — has to come from the view, and every move
 * the student makes has to leave as one onAction() call. Those calls are
 * collected in window.__actions.
 *
 * Behaviour and DOM only: the built stylesheet predates this table, so its
 * Tailwind classes are not in it. The board's own geometry is inline, which
 * is what the phone-width check measures.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, DEVICES } from './harness.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const PROMOTING = 'r6k/1P6/8/8/8/8/8/4K3 w - - 0 60';

/** The engine's board: 8 rows from rank 8 down, a→h, {type, color} or null. */
const boardOf = (fen) => fen.split(' ')[0].split('/').map((rank) => {
    const row = [];
    for (const ch of rank) {
        if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) row.push(null);
        else row.push({ type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' });
    }
    return row;
});

const FILES = [...'abcdefgh'];
const whiteOpening = [
    ...FILES.flatMap((f) => [{ from: `${f}2`, to: `${f}3` }, { from: `${f}2`, to: `${f}4` }]),
    { from: 'b1', to: 'a3' }, { from: 'b1', to: 'c3' }, { from: 'g1', to: 'f3' }, { from: 'g1', to: 'h3' }
];
const blackOpening = [
    ...FILES.flatMap((f) => [{ from: `${f}7`, to: `${f}6` }, { from: `${f}7`, to: `${f}5` }]),
    { from: 'b8', to: 'a6' }, { from: 'b8', to: 'c6' }, { from: 'g8', to: 'f6' }, { from: 'g8', to: 'h6' }
];
const promotions = (from, to) => ['q', 'r', 'b', 'n'].map((promotion) => ({ from, to, promotion }));

const view = (over = {}) => {
    const fen = over.fen || START;
    return {
        game: 'chess', status: 'active', you: 0, turn: 0, deadline: 600000,
        seats: [{ name: 'Asha', side: 0, label: 'White', color: '#f8fafc' }, { name: 'Bilal', side: 1, label: 'Black', color: '#0f172a' }],
        message: 'White to move.', outcome: null,
        fen, board: boardOf(fen), lastMove: null, inCheck: false, history: [],
        clocks: { 0: 600000, 1: 600000 }, clock: { minutes: 10, incrementSeconds: 0 },
        drawOffer: null, canOfferDraw: true, legalMoves: whiteOpening,
        ...over
    };
};

const entry = (v, { busy = false } = {}) => `
import { createRoot } from 'react-dom/client';
import ChessTable from '${srcFile('competitions/games/ChessTable.jsx')}';
window.__actions = [];
const onAction = (action) => { window.__actions.push(action); return Promise.resolve(); };
createRoot(document.getElementById('root')).render(
  <div style={{ maxWidth: 900, padding: 12 }}><ChessTable view={${JSON.stringify(v)}} onAction={onAction} busy={${busy}} /></div>);`;

const API = 'export default {};';
const render = (v, script, options = {}) => screen({ entry: entry(v, options), api: API, script: `
    const sq = (name) => document.querySelector('[data-square="' + name + '"]');
    const targets = () => $$('[data-target]').map((el) => el.dataset.square).sort();
    const tap = async (name) => { sq(name).click(); await sleep(60); };
    await sleep(150);
    ${script}`, ...options });

describe('the chess table', { skip: skipWithoutChrome }, () => {
    test('draws 64 squares from White\'s side, with all 32 pieces, for White', async () => {
        const { result, errors } = await render(view(), `
            const squares = $$('[data-board] [data-square]').map((el) => el.dataset.square);
            return { count: squares.length, first: squares[0], last: squares[63], unique: new Set(squares).size,
                     pieces: $$('[data-piece]').length, e1: sq('e1').dataset.piece, d8: sq('d8').dataset.piece,
                     orientation: $('[data-board]').dataset.orientation, moves: text($('[data-moves]')) };`);
        assert.deepEqual(errors, []);
        assert.equal(result.count, 64);
        assert.equal(result.unique, 64);
        assert.equal(result.first, 'a8', 'a8 at the top left');
        assert.equal(result.last, 'h1', 'h1 at the bottom right');
        assert.equal(result.pieces, 32);
        assert.equal(result.e1, 'wk');
        assert.equal(result.d8, 'bq');
        assert.equal(result.orientation, 'white');
        assert.equal(result.moves, 'No moves yet.');
    });

    test('clicking a piece shows where it may go; clicking a target sends the move', async () => {
        const { result, errors } = await render(view(), `
            await tap('g1');
            const knight = targets();
            await tap('e2');
            const pawn = targets();
            const selected = $$('[data-selected]').map((el) => el.dataset.square);
            const before = window.__actions.length;
            await tap('e4');
            await sleep(50);
            return { knight, pawn, selected, before, actions: window.__actions, after: targets() };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.knight, ['f3', 'h3']);
        assert.deepEqual(result.pawn, ['e3', 'e4'], 'choosing another piece moves the selection');
        assert.deepEqual(result.selected, ['e2']);
        assert.equal(result.before, 0, 'selecting sends nothing');
        assert.deepEqual(result.actions, [{ type: 'move', from: 'e2', to: 'e4' }]);
        assert.deepEqual(result.after, [], 'the selection clears once the move is sent');
    });

    test('a square that is not a target clears the selection and sends nothing', async () => {
        const { result } = await render(view(), `
            await tap('e2'); const had = targets();
            await tap('e6');
            await tap('e7');
            return { had, now: targets(), actions: window.__actions };`);
        assert.deepEqual(result.had, ['e3', 'e4']);
        assert.deepEqual(result.now, [], 'an empty square, then the opponent\'s piece');
        assert.deepEqual(result.actions, []);
    });

    test('for Black the board turns round, and the last move is marked', async () => {
        const v = view({ fen: AFTER_E4, you: 1, turn: 1, lastMove: { from: 'e2', to: 'e4' }, history: ['e4'], legalMoves: blackOpening,
            message: 'White played e4.' });
        const { result, errors } = await render(v, `
            const squares = $$('[data-board] [data-square]').map((el) => el.dataset.square);
            const players = $$('[data-player]').map((el) => el.dataset.player);
            const last = $$('[data-last]').map((el) => el.dataset.square).sort();
            await tap('g8');
            const knight = targets();
            await tap('f6');
            await sleep(50);
            return { first: squares[0], last63: squares[63], players, last, knight, actions: window.__actions,
                     orientation: $('[data-board]').dataset.orientation, moves: text($('[data-moves]')) };`);
        assert.deepEqual(errors, []);
        assert.equal(result.first, 'h1', 'h1 at the top left for Black');
        assert.equal(result.last63, 'a8', 'a8 at the bottom right');
        assert.equal(result.orientation, 'black');
        assert.deepEqual(result.players, ['0', '1'], 'White\'s bar on top, Black\'s (yours) below');
        assert.deepEqual(result.last, ['e2', 'e4']);
        assert.deepEqual(result.knight, ['f6', 'h6']);
        assert.deepEqual(result.actions, [{ type: 'move', from: 'g8', to: 'f6' }]);
        assert.match(result.moves, /1\. e4/);
    });

    test('a pawn reaching the last rank asks which piece it becomes', async () => {
        const v = view({ fen: PROMOTING, legalMoves: [...promotions('b7', 'b8'), ...promotions('b7', 'a8'),
            { from: 'e1', to: 'd1' }, { from: 'e1', to: 'd2' }, { from: 'e1', to: 'e2' }, { from: 'e1', to: 'f2' }, { from: 'e1', to: 'f1' }] });
        const { result, errors } = await render(v, `
            await tap('b7');
            const kinds = $$('[data-target]').map((el) => el.dataset.square + ':' + el.dataset.target).sort();
            await tap('a8');
            const picker = !!$('[data-promotion-picker]');
            const choices = $$('[data-promotion]').map((el) => el.dataset.promotion);
            const sentEarly = window.__actions.length;
            click(/Cancel/);
            await sleep(60);
            const closed = !$('[data-promotion-picker]');
            await tap('b7'); await tap('a8');
            $('[data-promotion="n"]').click();
            await sleep(60);
            return { kinds, picker, choices, sentEarly, closed, actions: window.__actions, gone: !$('[data-promotion-picker]') };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.kinds, ['a8:capture', 'b8:move'], 'a capture is marked differently from a quiet move');
        assert.equal(result.picker, true);
        assert.deepEqual(result.choices, ['q', 'r', 'b', 'n']);
        assert.equal(result.sentEarly, 0, 'nothing is sent until a piece is chosen');
        assert.equal(result.closed, true, 'Cancel closes the picker');
        assert.deepEqual(result.actions, [{ type: 'move', from: 'b7', to: 'a8', promotion: 'n' }]);
        assert.equal(result.gone, true);
    });

    test('nothing can be moved by a spectator, out of turn, or while busy', async () => {
        const tryE2 = `await tap('e2'); await tap('e4'); await sleep(50);
            return { targets: targets(), actions: window.__actions, disabled: sq('e2').disabled,
                     orientation: $('[data-board]').dataset.orientation, offer: !!find(/Offer draw/) };`;
        const spectator = await render(view({ you: null, legalMoves: [] }), tryE2);
        const waiting = await render(view({ you: 1, legalMoves: [] }), tryE2);
        const busy = await render(view(), tryE2, { busy: true });
        for (const [name, run] of [['spectator', spectator], ['not your turn', waiting], ['busy', busy]]) {
            assert.deepEqual(run.errors, [], name);
            assert.deepEqual(run.result.targets, [], name);
            assert.deepEqual(run.result.actions, [], name);
            assert.equal(run.result.disabled, true, name);
        }
        assert.equal(spectator.result.orientation, 'white', 'a spectator watches from White\'s side');
        assert.equal(spectator.result.offer, false, 'a spectator has no draw button');
        assert.equal(waiting.result.orientation, 'black');
        assert.equal(waiting.result.offer, true, 'a draw may be offered on the opponent\'s turn');
    });

    test('check is marked on the king, and a finished game stops the clocks and the draw buttons', async () => {
        const v = view({ fen: FOOLS_MATE, status: 'finished', turn: null, deadline: null, inCheck: true, legalMoves: [],
            lastMove: { from: 'd8', to: 'h4' }, history: ['f3', 'e5', 'g4', 'Qh4#'], clocks: { 0: 590000, 1: 595000 },
            outcome: { places: [[1], [0]], reason: 'Checkmate' } });
        const { result, errors } = await render(v, `
            await sleep(1500);
            return { check: $$('[data-check]').map((el) => el.dataset.square), running: $$('[data-clock]').map((el) => el.dataset.running),
                     clocks: $$('[data-clock]').map((el) => text(el)), offer: !!find(/Offer draw/), moves: text($('[data-moves]')) };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.check, ['e1']);
        assert.deepEqual(result.running, ['false', 'false']);
        assert.deepEqual(result.clocks, ['9:55', '9:50'], 'Black on top, White below, both stopped');
        assert.equal(result.offer, false);
        assert.match(result.moves, /2\. g4 Qh4#/);
    });

    test('the clock of the side to move counts down between polls; the other stands still', async () => {
        const v = view({ clocks: { 0: 65000, 1: 600000 } });
        const { result, errors } = await render(v, `
            const read = () => Object.fromEntries($$('[data-clock]').map((el) => [el.dataset.clock, text(el)]));
            const before = read();
            await sleep(3200);
            return { before, after: read(), running: $('[data-clock="0"]').dataset.running };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.before, { 0: '1:05', 1: '10:00' });
        assert.equal(result.running, 'true');
        assert.equal(result.after[1], '10:00');
        const [m, s] = result.after[0].split(':').map(Number);
        assert.ok(m * 60 + s <= 62 && m * 60 + s >= 55, `White's clock ran down from 1:05, now ${result.after[0]}`);
    });

    test('draw offers: offer, and answer the opponent\'s with Accept or Decline', async () => {
        const offer = await render(view({ you: 1, turn: 0, legalMoves: [] }), `
            click(/Offer draw/); await sleep(60); return { actions: window.__actions };`);
        assert.deepEqual(offer.errors, []);
        assert.deepEqual(offer.result.actions, [{ type: 'offer-draw' }], 'offered while waiting for White');

        const answer = (button) => render(view({ drawOffer: 1 }), `
            const shown = text($('[data-draw-offer]'));
            click(${button}); await sleep(60); return { shown, actions: window.__actions };`);
        const accepted = await answer('/Accept/');
        const declined = await answer('/Decline/');
        assert.match(accepted.result.shown, /Black offers a draw/);
        assert.deepEqual(accepted.result.actions, [{ type: 'accept-draw' }]);
        assert.deepEqual(declined.result.actions, [{ type: 'decline-draw' }]);

        const waiting = await render(view({ drawOffer: 0 }), `return { text: text($('[data-chess-table]')), offer: !!find(/Offer draw/) };`);
        assert.match(waiting.result.text, /Draw offered\. Waiting for Black/);
        assert.equal(waiting.result.offer, false);

        const blocked = await render(view({ canOfferDraw: false }), `
            const b = find(/Offer draw/); b.click(); await sleep(60); return { disabled: b.disabled, actions: window.__actions };`);
        assert.equal(blocked.result.disabled, true);
        assert.deepEqual(blocked.result.actions, []);
    });

    test('fits a 344px phone: the board is square and nothing scrolls sideways', async () => {
        const { result, errors } = await render(view(), `
            const b = $('[data-board]').getBoundingClientRect();
            const s = sq('a8').getBoundingClientRect();
            return { width: Math.round(b.width), height: Math.round(b.height), square: [Math.round(s.width), Math.round(s.height)],
                     right: Math.round(b.right), viewport: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth };`,
        { device: DEVICES.galaxyZFold6Folded });
        assert.deepEqual(errors, []);
        assert.equal(result.viewport, 344);
        assert.equal(result.width, result.height, 'the board is square');
        assert.ok(result.width >= 280 && result.right <= 344, `board ${result.width}px wide, right edge at ${result.right}`);
        assert.equal(result.square[0], result.square[1], 'and so are its squares');
        assert.equal(result.sideways, false);
    });
});
