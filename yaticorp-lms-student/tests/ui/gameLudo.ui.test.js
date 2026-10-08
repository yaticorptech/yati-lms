/**
 * The Ludo table, drawn from views shaped like the server's Ludo engine makes
 * them: the dice works only on your own turn before you roll, the tokens you
 * may move are the only ones you can tap, every token is on the board, and the
 * board turns so your own yard is bottom-left.
 *
 * The app's built stylesheet is not loaded (the table's new Tailwind classes
 * would not be in it anyway); the board and tokens are placed with inline
 * styles, so where they land can still be measured.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, DEVICES } from './harness.js';

const SEATS = [
    { name: 'Asha', side: 0, label: 'Red', color: '#dc2626' },
    { name: 'Bhagyashree', side: 1, label: 'Green', color: '#16a34a' },
    { name: 'Chinmay', side: 2, label: 'Yellow', color: '#eab308' },
    { name: 'Divya', side: 3, label: 'Blue', color: '#2563eb' }
];
const ORIGIN = [[9, 0], [0, 0], [0, 9], [9, 9]];
const SPOTS = [[1, 1], [1, 4], [4, 1], [4, 4]];
const yard = (colour, token) => ({ steps: -1, cell: [ORIGIN[colour][0] + SPOTS[token][0], ORIGIN[colour][1] + SPOTS[token][1]] });
const on = (steps, cell) => ({ steps, cell });

/** Red to roll, with a token out on a star (shared with Blue's) and one already home. */
const view = (over = {}) => ({
    game: 'ludo', status: 'active', you: 0, turn: 0, deadline: 4102444800000, seats: SEATS,
    message: 'Red rolls first', outcome: null,
    colorIndex: [0, 1, 2, 3], tokensPerPlayer: 4, finishSteps: 56,
    dice: null, diceBy: null, rollCount: 0, rolled: false, sixesInRow: 0,
    resigned: [false, false, false, false],
    tokens: [
        [yard(0, 0), on(8, [8, 2]), yard(0, 2), on(56, [7, 7])],
        [yard(1, 0), yard(1, 1), on(0, [6, 1]), yard(1, 3)],
        [on(8, [6, 12]), yard(2, 1), yard(2, 2), yard(2, 3)],
        [on(21, [8, 2]), yard(3, 1), yard(3, 2), yard(3, 3)]
    ],
    safe: [[13, 6], [8, 2], [6, 1], [2, 6], [1, 8], [6, 12], [8, 13], [12, 8]],
    lastMove: null, canRoll: true, movable: [],
    ...over
});

const CASES = [
    { id: 'roll', view: view() },
    { id: 'wait', view: view({ turn: 1, canRoll: false, dice: 3, diceBy: 0, rollCount: 4 }) },
    { id: 'move', view: view({ rolled: true, canRoll: false, dice: 6, diceBy: 0, rollCount: 5, movable: [0, 1, 2] }) },
    { id: 'watch', view: view({ you: null, canRoll: false }) },
    { id: 'busy', view: view(), busy: true },
    { id: 'green', view: view({ you: 1, turn: 1 }) },
    { id: 'over', view: view({ status: 'finished', turn: null, deadline: null, canRoll: false, outcome: { places: [[0], [1], [2], [3]], reason: 'Red got all four tokens home' } }) }
];

const entry = (cases) => `
import { createRoot } from 'react-dom/client';
import LudoTable from '${srcFile('competitions/games/LudoTable.jsx')}';
window.__actions = [];
for (const c of ${JSON.stringify(cases)}) {
  const el = document.createElement('div');
  el.id = c.id;
  el.style.width = c.width || '520px';
  el.style.marginBottom = '24px';
  document.getElementById('root').appendChild(el);
  const onAction = (action) => { window.__actions.push({ table: c.id, action }); return Promise.resolve(); };
  createRoot(el).render(<LudoTable view={c.view} busy={Boolean(c.busy)} onAction={onAction} />);
}`;

const READ = `
const table = (id) => document.getElementById(id);
const rollButton = (id) => table(id).querySelector('[data-ludo-roll]');
const tokens = (id) => [...table(id).querySelectorAll('[data-ludo-token]')];
const token = (id, seat, index) => tokens(id).find((b) => b.dataset.seat === String(seat) && b.dataset.token === String(index));
const boardOf = (id) => table(id).querySelector('[data-ludo-board]');
/** Where a token's centre is on its board, 0–1 across and down. */
const spot = (id, b) => {
  const board = boardOf(id).getBoundingClientRect();
  const r = b.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - board.left) / board.width, y: (r.top + r.height / 2 - board.top) / board.height };
};`;

describe('the Ludo table', { skip: skipWithoutChrome }, () => {
    test('roll only on your turn, tap only the tokens that may move, every token drawn', async () => {
        const { result, errors } = await screen({
            entry: entry(CASES), api: 'export default {};', width: 1200, height: 1400,
            script: `${READ}
await sleep(400);
const state = {};
for (const id of ${JSON.stringify(CASES.map((c) => c.id))}) {
  state[id] = {
    roll: !rollButton(id).disabled,
    enabled: tokens(id).filter((b) => !b.disabled).map((b) => [Number(b.dataset.seat), Number(b.dataset.token)]),
    count: tokens(id).length,
    perSeat: [0, 1, 2, 3].map((s) => tokens(id).filter((b) => b.dataset.seat === String(s)).length),
    rotation: boardOf(id).dataset.rotation,
    hint: text(table(id).querySelector('[data-ludo-hint]')),
    stars: table(id).querySelectorAll('[data-ludo-safe]').length,
    names: [...table(id).querySelectorAll('[data-ludo-name]')].map((t) => t.textContent)
  };
}
const movableFlags = tokens('move').filter((b) => b.dataset.movable === 'true').map((b) => Number(b.dataset.token));

// Taps that must do nothing: a dice that is not yours, a spectator's, a busy one, a finished game's, a token that cannot move.
for (const id of ['wait', 'watch', 'busy', 'over', 'move']) rollButton(id).click();
token('roll', 0, 1).click();
token('move', 0, 3).click();
token('move', 1, 0).click();
await sleep(50);
const before = window.__actions.length;

rollButton('roll').click();
await sleep(50);
token('move', 0, 2).click();
await sleep(50);

// The stacked pair on the star at row 8, col 2 sit side by side, not on top of each other.
const redOnStar = spot('watch', token('watch', 0, 1));
const blueOnStar = spot('watch', token('watch', 3, 0));
// Rotation: the viewer's yard is bottom-left; a spectator sees Red there.
const greenYardForGreen = tokens('green').filter((b) => b.dataset.seat === '1' && b.dataset.steps === '-1').map((b) => spot('green', b));
const redYardForWatcher = tokens('watch').filter((b) => b.dataset.seat === '0' && b.dataset.steps === '-1').map((b) => spot('watch', b));
const board = boardOf('roll').getBoundingClientRect();
return { state, movableFlags, before, actions: window.__actions, redOnStar, blueOnStar, greenYardForGreen, redYardForWatcher,
         board: { width: Math.round(board.width), height: Math.round(board.height) } };`
        });
        assert.deepEqual(errors, []);
        const { state } = result;

        assert.equal(state.roll.roll, true, 'your turn, not yet rolled: the dice is live');
        assert.equal(state.wait.roll, false, 'someone else\'s turn');
        assert.equal(state.move.roll, false, 'already rolled');
        assert.equal(state.watch.roll, false, 'a spectator cannot roll');
        assert.equal(state.busy.roll, false, 'busy');
        assert.equal(state.over.roll, false, 'the game is over');
        assert.equal(state.green.roll, true);

        assert.deepEqual(state.roll.enabled, [], 'nothing to tap before rolling');
        assert.deepEqual(state.move.enabled.sort(), [[0, 0], [0, 1], [0, 2]], 'only the tokens the server says may move');
        assert.deepEqual(result.movableFlags.sort(), [0, 1, 2]);
        for (const id of ['wait', 'watch', 'busy', 'over']) assert.deepEqual(state[id].enabled, [], id);

        assert.equal(result.before, 0, 'disabled controls send nothing');
        assert.deepEqual(result.actions, [
            { table: 'roll', action: { type: 'roll' } },
            { table: 'move', action: { type: 'move', token: 2 } }
        ]);

        for (const c of CASES) {
            assert.equal(state[c.id].count, 16, `${c.id}: all sixteen tokens are drawn`);
            assert.deepEqual(state[c.id].perSeat, [4, 4, 4, 4]);
            assert.equal(state[c.id].stars, 8, 'the eight safe squares are marked');
        }
        assert.equal(state.roll.hint, 'Your turn — roll the dice');
        assert.match(state.move.hint, /Tap a glowing token/);
        assert.equal(state.wait.hint, 'Waiting for Green…');
        assert.deepEqual(state.roll.names, ['You', 'Bhagyashree', 'Chinmay', 'Divya'], 'your yard says You');
        assert.deepEqual(state.watch.names, ['Asha', 'Bhagyashree', 'Chinmay', 'Divya']);

        assert.equal(state.watch.rotation, '0');
        assert.equal(state.roll.rotation, '0', 'Red is already bottom-left');
        assert.equal(state.green.rotation, '1', 'the board turns for Green');
        assert.ok(result.greenYardForGreen.length === 3 && result.greenYardForGreen.every((p) => p.x < 0.4 && p.y > 0.6),
            `Green's yard is bottom-left for Green: ${JSON.stringify(result.greenYardForGreen)}`);
        assert.ok(result.redYardForWatcher.every((p) => p.x < 0.4 && p.y > 0.6), 'Red\'s yard is bottom-left for a spectator');

        const apart = Math.hypot(result.redOnStar.x - result.blueOnStar.x, result.redOnStar.y - result.blueOnStar.y);
        assert.ok(apart > 0.01, 'two tokens on one square are offset');
        for (const p of [result.redOnStar, result.blueOnStar]) {
            assert.ok(Math.abs(p.x - 2.5 / 15) < 1 / 15 && Math.abs(p.y - 8.5 / 15) < 1 / 15, `both stay on their square: ${JSON.stringify(p)}`);
        }
        assert.equal(result.board.width, result.board.height, 'the board is square');
    });

    test('a 344px phone: the board fits the screen and the glowing tokens are big enough to tap', async () => {
        const phone = [{ id: 'move', width: '100%', view: view({ rolled: true, canRoll: false, dice: 6, diceBy: 0, rollCount: 5, movable: [0, 1, 2] }) }];
        const { result, errors } = await screen({
            entry: entry(phone), api: 'export default {};', device: DEVICES.galaxyZFold6Folded, budget: 6000,
            script: `${READ}
await sleep(400);
const board = boardOf('move').getBoundingClientRect();
const tap = token('move', 0, 1).getBoundingClientRect();
token('move', 0, 1).click();
await sleep(50);
return { width: board.width, height: board.height, left: board.left, sideways: document.documentElement.scrollWidth > innerWidth,
         tap: Math.min(tap.width, tap.height), actions: window.__actions };`
        });
        assert.deepEqual(errors, []);
        assert.ok(result.width <= 344 && result.width > 280, `board width ${result.width}`);
        assert.ok(Math.abs(result.width - result.height) < 1, 'square');
        assert.equal(result.sideways, false, 'no sideways scrolling');
        assert.ok(result.tap >= 24, `a movable token's tap target is ${result.tap}px`);
        assert.deepEqual(result.actions, [{ table: 'move', action: { type: 'move', token: 1 } }]);
    });
});
