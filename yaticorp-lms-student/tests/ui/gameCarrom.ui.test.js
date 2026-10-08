/**
 * The carrom table, rendered with views shaped like the engine's view()
 * (yaticorp-lms-server/src/competitions/games/carrom.js) but written out by
 * hand, so this suite needs nothing from the server. It checks behaviour, not
 * layout: the pieces drawn, the action the Shoot button sends, that the
 * controls are dead when it is not the viewer's shot, and that a recorded
 * shot is replayed once and ends on the settled board.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, DEVICES } from './harness.js';

const board = {
    size: 740, coinRadius: 15.9, queenRadius: 15.9, strikerRadius: 20.65, pocketRadius: 22.25,
    pockets: [{ x: 22.25, y: 22.25 }, { x: 717.75, y: 22.25 }, { x: 717.75, y: 717.75 }, { x: 22.25, y: 717.75 }],
    baselineInset: 117, baselineHalf: 235
};
const bottom = { seat: 0, position: 0, orientation: 0, from: { x: 135, y: 623 }, to: { x: 605, y: 623 }, forward: { x: 0, y: -1 }, right: { x: 1, y: 0 }, angleMin: -80, angleMax: 80 };
const top = { seat: 1, position: 2, orientation: 180, from: { x: 605, y: 117 }, to: { x: 135, y: 117 }, forward: { x: 0, y: 1 }, right: { x: -1, y: 0 }, angleMin: -80, angleMax: 80 };
const pieces = [
    { id: 'Q', kind: 'queen', x: 370, y: 370 },
    { id: 'W1', kind: 'white', x: 401.8, y: 370 }, { id: 'B1', kind: 'black', x: 338.2, y: 370 },
    { id: 'W2', kind: 'white', x: 370, y: 401.8 }, { id: 'B2', kind: 'black', x: 370, y: 338.2 },
    { id: 'W3', kind: 'white', x: 200, y: 250 }
];

/** A view as the engine sends it to Asha (White, seat 0) on her turn; `o` overrides. */
const view = (o = {}) => ({
    game: 'carrom', status: 'active', you: 0, turn: 0, deadline: 45000,
    seats: [
        { name: 'Asha', side: 0, label: 'White', color: '#eadfc8', colour: 'white', orientation: 0 },
        { name: 'Ravi', side: 1, label: 'Black', color: '#262626', colour: 'black', orientation: 180 }
    ],
    message: 'Asha breaks with White.', outcome: null, mode: 'singles', board, pieces,
    pocketed: { white: 2, black: 1 },
    score: [
        { side: 0, colour: 'white', label: 'White', pocketed: 2, total: 9 },
        { side: 1, colour: 'black', label: 'Black', pocketed: 1, total: 9 }
    ],
    queenState: 'board', orientation: 0, orientations: [0, 180], yourColour: 'white',
    baseline: bottom, baselines: [bottom, top], canShoot: true,
    legal: { type: 'shoot', position: [0, 1], angle: [-80, 80], power: [0, 1] },
    turnSeconds: 45, lastShot: null,
    ...o
});

const entry = (v, { busy = false } = {}) => `
import { createRoot } from 'react-dom/client';
import CarromTable from '${srcFile('competitions/games/CarromTable.jsx')}';
window.__actions = [];
const onAction = (a) => { window.__actions.push(a); return Promise.resolve(); };
createRoot(document.getElementById('root')).render(
  <div style={{ width: 520, padding: 10 }}><CarromTable view={${JSON.stringify(v)}} onAction={onAction} busy={${busy}} /></div>);`;
const api = 'export default {};';

/** Browser helpers: set a range input the way a person dragging it would. */
const HELPERS = `
const slide = (label, value) => {
  const el = $('input[aria-label="' + label + '"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const shootButton = () => find(/Shoot/);
const controls = () => ['Striker position', 'Aim angle', 'Shot power'].map((l) => $('input[aria-label="' + l + '"]').disabled);
const pointer = (type, x, y) => $('svg[data-orientation]').dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
const centre = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
await sleep(200);`;

describe('the carrom table', { skip: skipWithoutChrome }, () => {
    test('draws every piece, the striker on the shooter\'s baseline, the pockets and the score', async () => {
        const { result, errors } = await screen({
            entry: entry(view()), api, width: 600, script: `${HELPERS}
            return {
                pieces: $$('[data-piece]').map((g) => g.getAttribute('data-piece')).sort(),
                kinds: $$('[data-piece]').map((g) => g.getAttribute('data-kind')).sort(),
                striker: $$('[data-striker]').length,
                pockets: $$('[data-pocket]').length,
                white: text($('[data-score="white"]')), black: text($('[data-score="black"]')),
                queen: text($('[data-queen]')),
                shoot: !shootButton().disabled, controls: controls(), aim: !!$('[data-aim]'),
                square: (() => { const b = $('svg[data-orientation]').getBoundingClientRect(); return Math.abs(b.width - b.height) < 1; })()
            };`
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.pieces, ['B1', 'B2', 'Q', 'W1', 'W2', 'W3']);
        assert.deepEqual(result.kinds, ['black', 'black', 'queen', 'white', 'white', 'white']);
        assert.equal(result.striker, 1);
        assert.equal(result.pockets, 4);
        assert.equal(result.white, 'White (you): 2/9');
        assert.equal(result.black, 'Black: 1/9');
        assert.equal(result.queen, 'Queen on the board');
        assert.equal(result.shoot, true, 'Shoot is live on your turn');
        assert.deepEqual(result.controls, [false, false, false]);
        assert.equal(result.aim, true, 'the dotted aim line is drawn');
        assert.equal(result.square, true);
    });

    test('Shoot sends the position, angle and power from the sliders', async () => {
        const { result, errors } = await screen({
            entry: entry(view()), api, width: 600, script: `${HELPERS}
            shootButton().click(); await sleep(100);
            slide('Striker position', 250); slide('Aim angle', -30); slide('Shot power', 80); await sleep(50);
            const label = text($('[data-angle]'));
            shootButton().click(); await sleep(100);
            return { actions: window.__actions, label };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.actions.length, 2);
        const [first, second] = result.actions;
        assert.equal(first.type, 'shoot');
        for (const a of result.actions) {
            assert.ok(typeof a.position === 'number' && a.position >= 0 && a.position <= 1, `position ${a.position}`);
            assert.ok(typeof a.angle === 'number' && a.angle >= -80 && a.angle <= 80, `angle ${a.angle}`);
            assert.ok(typeof a.power === 'number' && a.power >= 0 && a.power <= 1, `power ${a.power}`);
        }
        assert.deepEqual(second, { type: 'shoot', position: 0.25, angle: -30, power: 0.8 });
        assert.equal(result.label, '30° left');
    });

    test('dragging along the baseline places the striker; pulling back from it aims the other way', async () => {
        const { result, errors } = await screen({
            entry: entry(view()), api, width: 600, script: `${HELPERS}
            const svg = $('svg[data-orientation]').getBoundingClientRect();
            const s0 = centre($('[data-striker]'));
            // along the baseline, well left of the striker
            pointer('pointerdown', s0.x - svg.width * 0.25, s0.y); await sleep(30);
            pointer('pointermove', s0.x - svg.width * 0.2, s0.y); await sleep(30);
            pointer('pointerup', s0.x - svg.width * 0.2, s0.y); await sleep(30);
            const s1 = centre($('[data-striker]'));
            // grab the striker and pull it back and to the left: the shot goes forward and right
            pointer('pointerdown', s1.x, s1.y); await sleep(30);
            pointer('pointermove', s1.x - 30, s1.y + 50); await sleep(30);
            pointer('pointerup', s1.x - 30, s1.y + 50); await sleep(30);
            shootButton().click(); await sleep(100);
            return { moved: s1.x - s0.x, action: window.__actions[0] };`
        });
        assert.deepEqual(errors, []);
        assert.ok(result.moved < -40, `the striker moved left (${result.moved}px)`);
        assert.ok(result.action.position < 0.45, `position ${result.action.position}`);
        assert.ok(result.action.angle > 15 && result.action.angle < 45, `pulled back-left aims right: ${result.action.angle}°`);
        assert.ok(result.action.power > 0.2 && result.action.power <= 1, `power ${result.action.power}`);
    });

    test('on someone else\'s turn, to a spectator, or while busy, nothing can be shot', async () => {
        const script = `${HELPERS}
            shootButton().click();
            pointer('pointerdown', 300, 500); pointer('pointermove', 280, 560); pointer('pointerup', 280, 560);
            await sleep(100);
            return { shoot: shootButton().disabled, controls: controls(), actions: window.__actions.length, hint: text($('[data-hint]')), aim: !!$('[data-aim]') };`;
        const theirs = await screen({ entry: entry(view({ you: 1, turn: 0, yourColour: 'black', orientation: 180, canShoot: false, legal: null })), api, width: 600, script });
        const watching = await screen({ entry: entry(view({ you: null, yourColour: null, canShoot: false, legal: null })), api, width: 600, script });
        const busy = await screen({ entry: entry(view(), { busy: true }), api, width: 600, script });
        for (const { result, errors } of [theirs, watching, busy]) {
            assert.deepEqual(errors, []);
            assert.equal(result.shoot, true, 'Shoot is disabled');
            assert.deepEqual(result.controls, [true, true, true]);
            assert.equal(result.actions, 0, 'and nothing was sent');
            assert.equal(result.aim, false, 'no aim line');
        }
        assert.equal(theirs.result.hint, 'Waiting for Asha to shoot…');
        assert.equal(watching.result.hint, 'You are watching — Asha to shoot.');
    });

    test('the board is turned so the viewer\'s edge is at the bottom', async () => {
        const { result, errors } = await screen({
            entry: entry(view({ you: 1, turn: 1, yourColour: 'black', orientation: 180, baseline: top })), api, width: 600, script: `${HELPERS}
            const svg = $('svg[data-orientation]');
            const s = centre($('[data-striker]')); const b = svg.getBoundingClientRect();
            return { turn: svg.querySelector('g').getAttribute('transform'), strikerLow: s.y > b.top + b.height * 0.7 };`
        });
        assert.deepEqual(errors, []);
        assert.match(result.turn, /^rotate\(180 /);
        assert.equal(result.strikerLow, true, 'Black\'s striker (top of the board) is drawn at the bottom for Black');
    });

    test('a striker sitting on a coin cannot be shot until it is moved', async () => {
        const onLine = [...pieces, { id: 'B3', kind: 'black', x: 370, y: 623 }];
        const { result, errors } = await screen({
            entry: entry(view({ pieces: onLine })), api, width: 600, script: `${HELPERS}
            const before = { shoot: shootButton().disabled, hint: text($('[data-hint]')) };
            slide('Striker position', 100); await sleep(50);
            return { before, after: shootButton().disabled };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.before.shoot, true);
        assert.match(result.before.hint, /sitting on a coin/);
        assert.equal(result.after, false, 'clear of the coin, Shoot comes back');
    });

    test('a new shot is replayed from its frames, then the settled board is shown', async () => {
        // W3 is knocked into the top-left pocket; the striker comes to rest below it.
        const lastShot = {
            id: 7, seat: 0, at: 0, duration: 400,
            start: [{ id: 'S', kind: 'striker', x: 135, y: 623 }, ...pieces.map((p) => ({ ...p }))],
            frames: [
                { t: 100, moved: [['S', 150, 480]] },
                { t: 200, moved: [['S', 175, 300], ['W3', 160, 180]] },
                { t: 300, moved: [['S', 180, 290], ['W3', 60, 50]] },
                { t: 330, moved: [['W3', 30, 30]] },
                { t: 400, moved: [['S', 182, 288]] }
            ],
            pocketed: [{ id: 'W3', kind: 'white', frame: 3, pocket: 0 }],
            result: 'Asha pocketed a white coin. Asha shoots again.', foul: false
        };
        const settled = pieces.filter((p) => p.id !== 'W3');
        const { result, errors } = await screen({
            entry: entry(view({ pieces: settled, lastShot, pocketed: { white: 3, black: 1 } })), api, width: 600, script: `
            await sleep(30);
            const svg = $('svg[data-orientation]');
            const early = { animating: svg.getAttribute('data-animating'), w3: !!$('[data-piece="W3"]'), skip: !!find(/Skip/), shoot: find(/Shoot/).disabled };
            await sleep(2500);
            return { early, late: { animating: svg.getAttribute('data-animating'), w3: !!$('[data-piece="W3"]'), pieces: $$('[data-piece]').length, skip: !!find(/Skip/), shoot: find(/Shoot/).disabled } };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.early.animating, 'true');
        assert.equal(result.early.w3, true, 'W3 is on the board while the shot plays');
        assert.equal(result.early.skip, true);
        assert.equal(result.early.shoot, true, 'no shooting over a replay');
        assert.equal(result.late.animating, 'false');
        assert.equal(result.late.w3, false, 'W3 has gone into the pocket');
        assert.equal(result.late.pieces, 5);
        assert.equal(result.late.skip, false);
        assert.equal(result.late.shoot, false, 'Asha shoots again');
    });

    test('on a 344px phone the board fits, nothing scrolls sideways, and a touch drag aims', async () => {
        const phone = `
import { createRoot } from 'react-dom/client';
import CarromTable from '${srcFile('competitions/games/CarromTable.jsx')}';
window.__actions = [];
createRoot(document.getElementById('root')).render(
  <div style={{ padding: 8 }}><CarromTable view={${JSON.stringify(view())}} onAction={(a) => { window.__actions.push(a); return Promise.resolve(); }} busy={false} /></div>);`;
        const { result, errors } = await screen({
            entry: phone, api, device: DEVICES.galaxyZFold6Folded, script: `${HELPERS}
            const touch = (type, x, y) => $('svg[data-orientation]').dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true }));
            const svg = $('svg[data-orientation]').getBoundingClientRect();
            const s = centre($('[data-striker]'));
            touch('pointerdown', s.x, s.y); await sleep(40);
            touch('pointermove', s.x + 12, s.y + 30); await sleep(40);
            touch('pointerup', s.x + 12, s.y + 30); await sleep(40);
            shootButton().click(); await sleep(150);
            return { width: svg.width, square: Math.abs(svg.width - svg.height) < 1, sideways: document.documentElement.scrollWidth > innerWidth,
                     touchAction: $('svg[data-orientation]').style.touchAction, action: window.__actions[0] };`
        });
        assert.deepEqual(errors, []);
        assert.ok(result.width > 280 && result.width <= 344, `board ${result.width}px wide`);
        assert.equal(result.square, true);
        assert.equal(result.sideways, false);
        assert.equal(result.touchAction, 'none', 'a drag on the board does not scroll the page on your turn');
        assert.ok(result.action && result.action.angle < -5, `pulled back-right aims left: ${result.action && result.action.angle}°`);
    });

    test('Skip jumps straight to the settled board', async () => {
        const lastShot = {
            id: 3, seat: 0, at: 0, duration: 9000,
            start: [{ id: 'S', kind: 'striker', x: 370, y: 623 }, ...pieces],
            frames: [{ t: 9000, moved: [['S', 370, 500]] }], pocketed: [], result: 'Asha pocketed nothing.', foul: false
        };
        const { result, errors } = await screen({
            entry: entry(view({ lastShot })), api, width: 600, script: `
            await sleep(50);
            const before = $('svg[data-orientation]').getAttribute('data-animating');
            find(/Skip/).click(); await sleep(50);
            return { before, after: $('svg[data-orientation]').getAttribute('data-animating') };`
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(result, { before: 'true', after: 'false' });
    });
});
