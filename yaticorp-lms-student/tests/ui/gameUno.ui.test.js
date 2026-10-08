/**
 * The UNO table on its own, fed views shaped like the engine's
 * (yaticorp-lms-server/src/competitions/games/uno.js) and an onAction that
 * records what it is sent in window.__actions. The built stylesheet may not
 * hold the table's classes yet, so these check behaviour and the DOM; the
 * phone check leans only on the inline styles that keep the hand scrolling.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, DEVICES } from './harness.js';

const card = (id) => {
    const parts = id.split('-');
    return parts[0] === 'wild' || parts[0] === 'wild4'
        ? { id, color: 'wild', value: parts[0] }
        : { id, color: parts[0], value: parts[1] };
};
const seats = [
    { name: 'Asha', side: 0, label: 'Player 1', color: '#e53935' },
    { name: 'Ravi', side: 1, label: 'Player 2', color: '#1e88e5' },
    { name: 'Meera', side: 2, label: 'Player 3', color: '#43a047' }
];
const HAND = ['red-3-1', 'blue-7-1', 'green-5-1', 'wild-1', 'wild4-2', 'yellow-skip-1'];
const myTurn = (over = {}) => ({
    game: 'uno', status: 'active', you: 0, turn: 0, deadline: 4102444800000, seats,
    message: 'Ravi played Red 7.', outcome: null,
    top: { id: 'red-7-1', color: 'red', value: '7' }, currentColor: 'red', direction: 1,
    drawPileCount: 80, discardCount: 3,
    hand: HAND.map(card), handCounts: [6, 5, 1], resigned: [false, false, false],
    hasDrawn: false, turnNumber: 4, turnSeconds: 30,
    playable: ['red-3-1', 'blue-7-1', 'wild-1', 'wild4-2'], canDraw: true, canPass: false,
    ...over
});

const entry = (view, busy = false) => `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import UnoTable from '${srcFile('competitions/games/UnoTable.jsx')}';
window.__actions = [];
const VIEW = ${JSON.stringify(view)};
function Harness() {
  const [view, setView] = useState(VIEW);
  const [busy, setBusy] = useState(${busy});
  window.__setView = (patch) => setView((v) => ({ ...v, ...patch }));
  window.__setBusy = setBusy;
  const onAction = (a) => {
    window.__actions.push(a);
    return window.__reject ? Promise.reject(new Error('That card does not match.')) : Promise.resolve();
  };
  return <div style={{ maxWidth: 900, margin: '0 auto' }}><UnoTable view={view} onAction={onAction} busy={busy} /></div>;
}
createRoot(document.getElementById('root')).render(<Harness />);`;

const api = 'export default {};';
const play = (view, script, opts = {}) => screen({ entry: entry(view, opts.busy), api, script: `await sleep(150);\n${script}`, width: 1000, height: 900, ...opts });

/** Browser-side helpers, prepended to scripts that need them. */
const HELPERS = `
const cardBtn = (id) => $('[data-card="' + id + '"]');
const tap = async (el) => { if (el) el.click(); await sleep(60); };
const uno = () => $('[data-action="uno"]');
const actions = () => window.__actions.slice();
`;

describe('the UNO table', { skip: skipWithoutChrome }, () => {
    test('draws your hand, the piles, the colour, the direction and the other players', async () => {
        const { result, errors } = await play(myTurn(), `
            const cards = $$('[data-card]').map((b) => ({ id: b.dataset.card, playable: b.dataset.playable === 'true', disabled: b.disabled, label: b.getAttribute('aria-label') }));
            const opponents = $$('[data-seat]').map((li) => ({ seat: li.dataset.seat, count: li.dataset.count, text: text(li) }));
            return {
                cards, opponents,
                top: $('[data-top-card]')?.dataset.topCard,
                colour: $('[data-current-color]')?.dataset.currentColor,
                direction: $('[data-direction]')?.dataset.direction,
                draw: { disabled: $('[data-action="draw"]').disabled, label: $('[data-action="draw"]').getAttribute('aria-label') },
                pass: !!$('[data-action="pass"]'),
                uno: { disabled: uno().disabled, pressed: uno().getAttribute('aria-pressed') },
                hint: text($('[aria-live]')),
                topText: text($('[data-top-card]')),
                handText: text($('[data-hand]'))
            };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.equal(result.cards.length, 6, 'all six of your cards');
        assert.deepEqual(result.cards.map((c) => c.id).sort(), [...HAND].sort());
        const byId = Object.fromEntries(result.cards.map((c) => [c.id, c]));
        for (const id of ['red-3-1', 'blue-7-1', 'wild-1', 'wild4-2']) {
            assert.equal(byId[id].playable, true, `${id} is playable`);
            assert.equal(byId[id].disabled, false);
        }
        for (const id of ['green-5-1', 'yellow-skip-1']) {
            assert.equal(byId[id].playable, false, `${id} is not playable`);
            assert.equal(byId[id].disabled, true, `${id} cannot be tapped`);
            assert.match(byId[id].label, /cannot be played/);
        }
        assert.equal(byId['wild4-2'].label, 'Wild Draw Four');
        assert.equal(byId['yellow-skip-1'].label.startsWith('Yellow Skip'), true);
        assert.match(result.handText, /⊘/, 'a Skip shows its symbol');
        assert.match(result.handText, /\+4/);
        assert.match(result.handText, /WILD/);
        assert.deepEqual(result.opponents.map((o) => [o.seat, o.count]), [['1', '5'], ['2', '1']], 'the others, in turn order after you');
        assert.match(result.opponents[0].text, /Ravi.*5 cards/);
        assert.match(result.opponents[1].text, /Meera.*1 card.*UNO!/, 'a player on one card shows UNO!');
        assert.equal(result.top, 'red-7-1');
        assert.match(result.topText, /7/);
        assert.equal(result.colour, 'red');
        assert.equal(result.direction, 'clockwise');
        assert.equal(result.draw.disabled, false);
        assert.match(result.draw.label, /80 left/);
        assert.equal(result.pass, false, 'no Pass before drawing');
        assert.deepEqual(result.uno, { disabled: false, pressed: 'false' });
        assert.match(result.hint, /Your turn/);
    });

    test('tapping a playable card plays it; an unplayable one does nothing', async () => {
        const { result, errors } = await play(myTurn(), `
            await tap(cardBtn('green-5-1'));
            const afterBad = actions();
            await tap(cardBtn('blue-7-1'));
            return { afterBad, all: actions() };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.deepEqual(result.afterBad, []);
        assert.deepEqual(result.all, [{ type: 'play', card: 'blue-7-1' }]);
    });

    test('a wild opens the colour picker and sends the colour chosen; Cancel sends nothing', async () => {
        const { result, errors } = await play(myTurn(), `
            await tap(cardBtn('wild-1'));
            const open = !!$('[data-color-picker]');
            const colours = $$('[data-color-picker] [data-color]').map((b) => b.dataset.color);
            const before = actions();
            await tap($('[data-color-picker] button[aria-label="Cancel"]'));
            const closedByCancel = !$('[data-color-picker]');
            const afterCancel = actions();
            await tap(cardBtn('wild4-2'));
            await tap($('[data-color-picker] [data-color="blue"]'));
            return { open, colours, before, closedByCancel, afterCancel, all: actions(), closed: !$('[data-color-picker]') };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.equal(result.open, true);
        assert.deepEqual(result.colours, ['red', 'yellow', 'green', 'blue']);
        assert.deepEqual(result.before, [], 'nothing is sent until a colour is picked');
        assert.equal(result.closedByCancel, true);
        assert.deepEqual(result.afterCancel, []);
        assert.deepEqual(result.all, [{ type: 'play', card: 'wild4-2', color: 'blue' }]);
        assert.equal(result.closed, true);
    });

    test('the UNO! toggle rides along with the next play as uno:true, including a wild', async () => {
        const { result, errors } = await play(myTurn({ hand: ['red-3-1', 'wild-1'].map(card), handCounts: [2, 5, 1], playable: ['red-3-1', 'wild-1'] }), `
            await tap(uno());
            const pressed = uno().getAttribute('aria-pressed');
            await tap(cardBtn('red-3-1'));
            // The play went through: the next view is a new turn.
            window.__setView({ turnNumber: 5 }); await sleep(60);
            const fresh = uno().getAttribute('aria-pressed');
            await tap(uno()); await tap(uno());
            const offAgain = uno().getAttribute('aria-pressed');
            await tap(cardBtn('red-3-1'));
            await tap(uno());
            await tap(cardBtn('wild-1'));
            await tap($('[data-color-picker] [data-color="green"]'));
            return { pressed, fresh, offAgain, all: actions() };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.equal(result.pressed, 'true');
        assert.equal(result.fresh, 'false', 'a new turn starts with UNO! off');
        assert.equal(result.offAgain, 'false', 'pressing it again turns it off');
        assert.deepEqual(result.all, [
            { type: 'play', card: 'red-3-1', uno: true },
            { type: 'play', card: 'red-3-1' },
            { type: 'play', card: 'wild-1', color: 'green', uno: true }
        ]);
    });

    test('a pressed UNO! does not carry over into the next turn', async () => {
        const { result, errors } = await play(myTurn(), `
            await tap(uno());
            const pressed = uno().getAttribute('aria-pressed');
            window.__setView({ turnNumber: 6 });
            await sleep(60);
            return { pressed, next: uno().getAttribute('aria-pressed') };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.equal(result.pressed, 'true');
        assert.equal(result.next, 'false');
    });

    test('Draw sends a draw; after drawing only the drawn card is playable and Pass appears', async () => {
        const first = await play(myTurn(), `
            await tap($('[data-action="draw"]'));
            return actions();`.replace(/^/, HELPERS));
        assert.deepEqual(first.errors, []);
        assert.deepEqual(first.result, [{ type: 'draw' }]);

        const drawn = myTurn({ hand: [...HAND, 'red-5-2'].map(card), handCounts: [7, 5, 1], hasDrawn: true, playable: ['red-5-2'], canDraw: false, canPass: true });
        const { result, errors } = await play(drawn, `
            const playable = $$('[data-card]').filter((b) => !b.disabled).map((b) => b.dataset.card);
            const drawDisabled = $('[data-action="draw"]').disabled;
            const hint = text($('[aria-live]'));
            await tap($('[data-action="draw"]'));
            await tap($('[data-action="pass"]'));
            return { playable, drawDisabled, hint, all: actions(), passText: text($('[data-action="pass"]')) };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.deepEqual(result.playable, ['red-5-2']);
        assert.equal(result.drawDisabled, true, 'no second draw');
        assert.match(result.hint, /play it or pass/);
        assert.equal(result.passText, 'Pass');
        assert.deepEqual(result.all, [{ type: 'pass' }]);
    });

    test('nothing can be done when it is not your turn, or while busy', async () => {
        const script = `
            for (const b of $$('[data-card]')) await tap(b);
            await tap($('[data-action="draw"]'));
            await tap(uno());
            return { all: actions(), cardsEnabled: $$('[data-card]').filter((b) => !b.disabled).length, drawDisabled: $('[data-action="draw"]').disabled,
                     unoDisabled: uno().disabled, hint: text($('[aria-live]')), cards: $$('[data-card]').length };`.replace(/^/, HELPERS);
        const waiting = await play(myTurn({ turn: 1, playable: [], canDraw: false, canPass: false }), script);
        assert.deepEqual(waiting.errors, []);
        assert.deepEqual(waiting.result.all, []);
        assert.equal(waiting.result.cards, 6, 'your hand still shows');
        assert.equal(waiting.result.cardsEnabled, 0);
        assert.equal(waiting.result.drawDisabled, true);
        assert.equal(waiting.result.unoDisabled, true);
        assert.match(waiting.result.hint, /Waiting for Ravi/);

        const busy = await play(myTurn(), script, { busy: true });
        assert.deepEqual(busy.errors, []);
        assert.deepEqual(busy.result.all, [], 'nothing is sent while the last move is on its way');
        assert.equal(busy.result.cardsEnabled, 0);
    });

    test('a spectator sees every player and no hand; a refused move leaves no unhandled error', async () => {
        const watching = await play(myTurn({ you: null, hand: null, playable: [], canDraw: false, canPass: false }), `
            return { seats: $$('[data-seat]').map((li) => li.dataset.seat), hand: !!$('[data-hand]'), uno: !!uno(), hint: text($('[aria-live]')) };`.replace(/^/, HELPERS));
        assert.deepEqual(watching.errors, []);
        assert.deepEqual(watching.result.seats, ['0', '1', '2']);
        assert.equal(watching.result.hand, false);
        assert.equal(watching.result.uno, false);
        assert.match(watching.result.hint, /Watching/);

        const refused = await play(myTurn(), `
            window.__reject = true;
            await tap(cardBtn('red-3-1'));
            await sleep(100);
            return actions();`.replace(/^/, HELPERS));
        assert.deepEqual(refused.errors, [], 'the page shows the refusal; the table must not throw');
        assert.deepEqual(refused.result, [{ type: 'play', card: 'red-3-1' }]);
    });

    test('anticlockwise play and a wild on top show the colour chosen', async () => {
        const { result, errors } = await play(myTurn({ direction: -1, top: { id: 'wild-3', color: 'wild', value: 'wild' }, currentColor: 'blue', playable: ['blue-7-1', 'wild-1', 'wild4-2'] }), `
            return { direction: $('[data-direction]').dataset.direction, colour: $('[data-current-color]').dataset.currentColor,
                     colourText: text($('[data-current-color]')), topLabel: $('[data-top-card]').getAttribute('aria-label') };`.replace(/^/, HELPERS));
        assert.deepEqual(errors, []);
        assert.equal(result.direction, 'anticlockwise');
        assert.equal(result.colour, 'blue');
        assert.equal(result.colourText, 'Blue');
        assert.match(result.topLabel, /Wild, colour chosen Blue/);
    });

    test('on a 344px phone a big hand scrolls sideways inside the table, not the page', async () => {
        const big = ['red-1-1', 'red-2-1', 'red-4-1', 'red-5-1', 'red-6-1', 'red-8-1', 'red-9-1', 'blue-1-1', 'blue-2-1', 'blue-3-1',
            'green-1-1', 'green-2-1', 'green-3-1', 'yellow-1-1', 'yellow-2-1', 'yellow-3-1', 'wild-1', 'wild-2', 'wild4-1', 'red-skip-2'];
        const { result, errors } = await screen({
            entry: entry(myTurn({ hand: big.map(card), handCounts: [20, 5, 1], playable: big.filter((id) => id.startsWith('red') || id.startsWith('wild')) })),
            api, device: DEVICES.galaxyZFold6Folded,
            script: `await sleep(400);
                const hand = $('[data-hand]');
                const before = hand.scrollLeft;
                hand.scrollLeft = hand.scrollWidth; await sleep(100);
                return { pageSideways: document.documentElement.scrollWidth > innerWidth, handScrolls: hand.scrollWidth > hand.clientWidth + 1,
                         moved: hand.scrollLeft > before, tableWidth: Math.round($('[data-uno-table]').getBoundingClientRect().width), innerWidth,
                         cards: $$('[data-card]').length };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.cards, 20);
        assert.equal(result.pageSideways, false, 'the page does not scroll sideways');
        assert.equal(result.handScrolls, true, 'the hand scrolls inside the table');
        assert.equal(result.moved, true);
        assert.ok(result.tableWidth <= result.innerWidth, `the table fits the screen (${result.tableWidth} of ${result.innerWidth}px)`);
    });
});
