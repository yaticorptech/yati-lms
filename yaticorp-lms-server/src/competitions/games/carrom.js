/**
 * Carrom — singles (2 seats) or doubles (4 seats, partners opposite).
 *
 * The server plays every shot. The student's browser only places the striker
 * on its baseline and aims; act() then runs the whole shot here with a
 * fixed-step simulation that uses nothing but arithmetic, so the same shot on
 * the same board always ends the same way. The frames it records go out in
 * view().lastShot and the table replays them — it never simulates anything.
 *
 * Units are millimetres on the 740 × 740 playing surface, origin at the top
 * left, y pointing down (the same axes as the table's SVG). Seat 0 sits at the
 * bottom edge. Board positions run 0 = bottom, 1 = right, 2 = top, 3 = left;
 * singles uses 0 and 2, doubles all four, and play passes round 0 → 1 → 2 → 3.
 *
 * A shot is { type: 'shoot', position, angle, power }:
 *   position  0..1 along the shooter's baseline, 0 at the shooter's left end
 *   angle     degrees, 0 straight away from the shooter, positive to the
 *             shooter's right, −80..80 (forward shots only)
 *   power     0..1 of the hardest flick
 */
const { GameError, clone } = require('./contract');

// ── The board ───────────────────────────────────────────────────────────────
const BOARD = 740;
const CENTRE = BOARD / 2;
const COIN_R = 15.9;
const QUEEN_R = 15.9;
const STRIKER_R = 20.65;
const POCKET_R = 22.25;
/** Pocket centres: each pocket's circle touches both cushions of its corner. */
const POCKETS = [
    { x: POCKET_R, y: POCKET_R },
    { x: BOARD - POCKET_R, y: POCKET_R },
    { x: BOARD - POCKET_R, y: BOARD - POCKET_R },
    { x: POCKET_R, y: BOARD - POCKET_R }
];
/** The striker's centre line runs this far in from its edge… */
const BASE_INSET = 117;
/** …and the striker's centre may sit this far either side of the middle. */
const BASE_HALF = 235;
const ANGLE_LIMIT = 80;
const COINS_EACH = 9;

const RADIUS = { white: COIN_R, black: COIN_R, queen: QUEEN_R, striker: STRIKER_R };
const MASS = { white: 1, black: 1, queen: 1, striker: 1.5 };

// ── The physics ─────────────────────────────────────────────────────────────
const STEPS_PER_SECOND = 480;
const DT = 1 / STEPS_PER_SECOND;
const STEP_MS = 1000 / STEPS_PER_SECOND;
/**
 * A frame is kept every SAMPLE steps (48 a second), which the table
 * interpolates — plus an extra one at the very step of a cushion bounce, a
 * collision or a pocketing (no closer than EVENT_GAP steps apart), so a fast
 * piece is never drawn turning before it reaches what it bounced off.
 */
const SAMPLE = 10;
const EVENT_GAP = 2;
const MAX_STEPS = 12 * STEPS_PER_SECOND;
const MAX_FRAMES = 600;
/** Constant deceleration from the board's friction, mm/s². */
const FRICTION = 700;
/** The hardest flick, mm/s: crosses the board and comes back off three cushions. */
const MAX_SPEED = 3000;
const PIECE_RESTITUTION = 0.9;
const WALL_RESTITUTION = 0.75;
/** How long after a shot its frames are still sent, so a late visitor is not shown an old shot. */
const FRESH_MS = 60 * 1000;

const COLOURS = { white: '#eadfc8', black: '#262626' };
const SINGLES_LABELS = ['White', 'Black'];
const DOUBLES_LABELS = ['White (A)', 'Black (A)', 'White (B)', 'Black (B)'];

/** For each board position: the shooter's forward and right-hand directions. */
const FRAMES = [
    { forward: { x: 0, y: -1 }, right: { x: 1, y: 0 } },   // bottom, facing up
    { forward: { x: -1, y: 0 }, right: { x: 0, y: -1 } },  // right, facing left
    { forward: { x: 0, y: 1 }, right: { x: -1, y: 0 } },   // top, facing down
    { forward: { x: 1, y: 0 }, right: { x: 0, y: 1 } }     // left, facing right
];

const round1 = (n) => Math.round(n * 10) / 10;

// ── Opening layout ──────────────────────────────────────────────────────────
/**
 * The queen in the centre, six coins touching her and twelve round those —
 * hexagonally packed, colours alternating. Turning the board half round swaps
 * the colours, so neither side's break is easier.
 */
function openingPieces() {
    const d = 2 * COIN_R;
    const h = Math.sqrt(3) / 2;
    // unit vectors at 0°, 60°, … 300° (y down), without trigonometry
    const dirs = [[1, 0], [0.5, h], [-0.5, h], [-1, 0], [-0.5, -h], [0.5, -h]];
    const pieces = [{ id: 'Q', kind: 'queen', x: CENTRE, y: CENTRE }];
    const counts = { white: 0, black: 0 };
    const add = (kind, x, y) => {
        counts[kind] += 1;
        pieces.push({ id: `${kind === 'white' ? 'W' : 'B'}${counts[kind]}`, kind, x, y });
    };
    dirs.forEach(([dx, dy], k) => add(k % 2 ? 'black' : 'white', CENTRE + dx * d, CENTRE + dy * d));
    // the outer ring in angular order: a corner coin at 2d, then an edge coin
    // between it and the next corner, at d·√3
    for (let k = 0; k < 6; k++) {
        const [ax, ay] = dirs[k];
        const [bx, by] = dirs[(k + 1) % 6];
        add('white', CENTRE + ax * 2 * d, CENTRE + ay * 2 * d);
        add('black', CENTRE + (ax + bx) * d, CENTRE + (ay + by) * d);
    }
    return pieces;
}

// ── Geometry for a seat ─────────────────────────────────────────────────────
const boardPosition = (state, seat) => state.positions[seat];

/** The shooter's baseline in board coordinates, plus which way is forward and right. */
function seatFrame(state, seat) {
    const p = boardPosition(state, seat);
    const { forward, right } = FRAMES[p];
    const mid = { x: CENTRE - forward.x * (CENTRE - BASE_INSET), y: CENTRE - forward.y * (CENTRE - BASE_INSET) };
    return {
        position: p,
        orientation: p * 90,
        from: { x: mid.x - right.x * BASE_HALF, y: mid.y - right.y * BASE_HALF },
        to: { x: mid.x + right.x * BASE_HALF, y: mid.y + right.y * BASE_HALF },
        forward: { ...forward },
        right: { ...right }
    };
}

/** Where the striker's centre sits for a position 0..1 along `seat`'s baseline. */
function strikerStart(state, seat, position) {
    const f = seatFrame(state, seat);
    return { x: f.from.x + (f.to.x - f.from.x) * position, y: f.from.y + (f.to.y - f.from.y) * position };
}

/** The striker's starting velocity for an angle (degrees) and power (0..1). */
function shotVelocity(state, seat, angle, power) {
    const { forward, right } = seatFrame(state, seat);
    const t = (angle * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const speed = power * MAX_SPEED;
    return { vx: (forward.x * c + right.x * s) * speed, vy: (forward.y * c + right.y * s) * speed };
}

const inPocket = (x, y) => POCKETS.findIndex((p) => {
    const dx = x - p.x;
    const dy = y - p.y;
    return dx * dx + dy * dy < POCKET_R * POCKET_R;
});

// ── The simulation ──────────────────────────────────────────────────────────
/**
 * Plays bodies forward until everything stops (or 12 s pass).
 * @param {Array<{id, kind, x, y, vx?, vy?}>} input  not modified
 * @param {{ trace?: boolean }} [opts]  trace: also return the kinetic energy after every step
 * @returns {{ bodies, pocketed, frames, steps, capped, energy? }}
 *   bodies    every input body with its final x, y and `on` (false once pocketed)
 *   pocketed  [{ id, kind, frame, pocket }] in the order they fell; `frame` is
 *             the index of the frame that last shows the piece, at the pocket
 *   frames    [{ t, moved: [[id, x, y], …] }] — t in ms from the flick, and
 *             only the pieces whose position (to 0.1 mm) changed since the
 *             frame before. A piece not listed is where it was last listed.
 */
function simulate(input, opts = {}) {
    const bodies = input.map((b) => ({
        id: b.id, kind: b.kind, x: b.x, y: b.y, vx: b.vx || 0, vy: b.vy || 0,
        r: RADIUS[b.kind], m: MASS[b.kind], on: true
    }));
    const n = bodies.length;
    const frames = [];
    const pocketed = [];
    const unplaced = [];
    const shown = bodies.map((b) => [round1(b.x), round1(b.y)]);
    const energy = opts.trace ? [kinetic(bodies)] : null;

    const record = (step) => {
        const t = Math.round(step * STEP_MS * 100) / 100;
        const moved = [];
        for (let i = 0; i < n; i++) {
            const b = bodies[i];
            const x = round1(b.x);
            const y = round1(b.y);
            if (x !== shown[i][0] || y !== shown[i][1]) {
                shown[i] = [x, y];
                moved.push([b.id, x, y]);
            }
        }
        const last = frames[frames.length - 1];
        if (last && (last.t === t || frames.length >= MAX_FRAMES)) {
            // Same moment (the final settle), or — never expected — out of
            // room: fold the moves into the last frame so nothing jumps.
            last.t = t;
            for (const entry of moved) {
                const at = last.moved.findIndex((e) => e[0] === entry[0]);
                if (at >= 0) last.moved[at] = entry; else last.moved.push(entry);
            }
        } else frames.push({ t, moved });
        while (unplaced.length) unplaced.pop().frame = frames.length - 1;
    };

    const pocketCheck = () => {
        let fell = false;
        for (const b of bodies) {
            if (!b.on) continue;
            const pocket = inPocket(b.x, b.y);
            if (pocket >= 0) {
                b.on = false;
                b.vx = 0;
                b.vy = 0;
                const entry = { id: b.id, kind: b.kind, frame: null, pocket };
                pocketed.push(entry);
                unplaced.push(entry);
                fell = true;
            }
        }
        return fell;
    };

    let steps = 0;
    let lastRecorded = 0;
    let moving = bodies.some((b) => b.vx !== 0 || b.vy !== 0);
    while (moving && steps < MAX_STEPS) {
        steps += 1;
        let event = false;
        // 1. move, then let friction take its share of the speed
        for (const b of bodies) {
            if (!b.on || (b.vx === 0 && b.vy === 0)) continue;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const next = speed - FRICTION * DT;
            if (next <= 0) { b.vx = 0; b.vy = 0; } else { b.vx *= next / speed; b.vy *= next / speed; }
        }
        // 2. anything whose centre is over a pocket drops
        if (pocketCheck()) event = true;
        // 3. cushions
        for (const b of bodies) {
            if (!b.on) continue;
            if (b.x < b.r) { b.x = b.r; if (b.vx < 0) { b.vx = -b.vx * WALL_RESTITUTION; event = true; } }
            else if (b.x > BOARD - b.r) { b.x = BOARD - b.r; if (b.vx > 0) { b.vx = -b.vx * WALL_RESTITUTION; event = true; } }
            if (b.y < b.r) { b.y = b.r; if (b.vy < 0) { b.vy = -b.vy * WALL_RESTITUTION; event = true; } }
            else if (b.y > BOARD - b.r) { b.y = BOARD - b.r; if (b.vy > 0) { b.vy = -b.vy * WALL_RESTITUTION; event = true; } }
        }
        // 4. pieces against pieces, in a fixed order
        for (let i = 0; i < n; i++) {
            const a = bodies[i];
            if (!a.on) continue;
            for (let j = i + 1; j < n; j++) {
                const b = bodies[j];
                if (!b.on) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const reach = a.r + b.r;
                const d2 = dx * dx + dy * dy;
                if (d2 >= reach * reach) continue;
                const d = Math.sqrt(d2);
                const nx = d > 0 ? dx / d : 1;
                const ny = d > 0 ? dy / d : 0;
                const ia = 1 / a.m;
                const ib = 1 / b.m;
                const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (closing < 0) {
                    const j2 = (-(1 + PIECE_RESTITUTION) * closing) / (ia + ib);
                    a.vx -= j2 * ia * nx; a.vy -= j2 * ia * ny;
                    b.vx += j2 * ib * nx; b.vy += j2 * ib * ny;
                    // a touch too slight to see is not worth a frame
                    if (closing < -20) event = true;
                }
                const overlap = reach - d;
                if (overlap > 0) {
                    const wa = ia / (ia + ib);
                    const wb = ib / (ia + ib);
                    a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
                    b.x += nx * overlap * wb; b.y += ny * overlap * wb;
                }
            }
        }
        if (energy) energy.push(kinetic(bodies));
        moving = bodies.some((b) => b.on && (b.vx !== 0 || b.vy !== 0));
        // Extra frames only while the regular ones still to come are sure to fit.
        const room = frames.length + Math.ceil((MAX_STEPS - steps) / SAMPLE) + 2 < MAX_FRAMES;
        if (steps % SAMPLE === 0 || (event && room && steps - lastRecorded >= EVENT_GAP)) {
            record(steps);
            lastRecorded = steps;
        }
    }
    const capped = moving;
    for (const b of bodies) { b.vx = 0; b.vy = 0; }
    settle(bodies);
    pocketCheck();
    if (steps !== lastRecorded || unplaced.length || shown.some((s, i) => s[0] !== round1(bodies[i].x) || s[1] !== round1(bodies[i].y))) {
        record(steps);
    }
    const result = { bodies: bodies.map(({ id, kind, x, y, on }) => ({ id, kind, x, y, on })), pocketed, frames, steps, capped };
    if (energy) result.energy = energy;
    return result;
}

function kinetic(bodies) {
    let e = 0;
    for (const b of bodies) if (b.on) e += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    return e;
}

/** Pushes resting pieces apart and back inside the cushions; positions only. */
function settle(bodies) {
    for (let pass = 0; pass < 30; pass++) {
        let moved = false;
        for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i];
            if (!a.on) continue;
            for (let j = i + 1; j < bodies.length; j++) {
                const b = bodies[j];
                if (!b.on) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const reach = a.r + b.r;
                const d2 = dx * dx + dy * dy;
                if (d2 >= reach * reach) continue;
                const d = Math.sqrt(d2);
                const nx = d > 0 ? dx / d : 1;
                const ny = d > 0 ? dy / d : 0;
                const push = (reach - d) / 2 + 1e-6;
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
                moved = true;
            }
        }
        for (const b of bodies) {
            if (!b.on) continue;
            const x = Math.min(BOARD - b.r, Math.max(b.r, b.x));
            const y = Math.min(BOARD - b.r, Math.max(b.r, b.y));
            if (x !== b.x || y !== b.y) { b.x = x; b.y = y; moved = true; }
        }
        if (!moved) return;
    }
}

/**
 * The free spot nearest the centre for a piece of `kind`: the centre itself if
 * it is clear, otherwise the first clear point on widening rings round it.
 */
function freeSpot(pieces, kind) {
    const r = RADIUS[kind];
    const clear = (x, y) => {
        if (x < r || y < r || x > BOARD - r || y > BOARD - r) return false;
        if (POCKETS.some((p) => (x - p.x) ** 2 + (y - p.y) ** 2 < (POCKET_R + r) ** 2)) return false;
        return pieces.every((p) => {
            const reach = RADIUS[p.kind] + r + 0.01;
            return (x - p.x) ** 2 + (y - p.y) ** 2 >= reach * reach;
        });
    };
    if (clear(CENTRE, CENTRE)) return { x: CENTRE, y: CENTRE };
    for (let ring = 1; ring <= 90; ring++) {
        const radius = ring * 4;
        const count = Math.max(6, Math.ceil((2 * Math.PI * radius) / 4));
        for (let k = 0; k < count; k++) {
            const t = (2 * Math.PI * k) / count;
            const x = CENTRE + radius * Math.cos(t);
            const y = CENTRE + radius * Math.sin(t);
            if (clear(x, y)) return { x, y };
        }
    }
    return { x: CENTRE, y: CENTRE };
}

// ── Seats, sides, colours ───────────────────────────────────────────────────
const colourOfSide = (state, side) => (side === state.sides[0] ? 'white' : 'black');
const colourOfSeat = (state, seat) => colourOfSide(state, state.seats[seat].side);
const sideOfColour = (state, colour) => (colour === 'white' ? state.sides[0] : state.sides[1]);
const otherColour = (colour) => (colour === 'white' ? 'black' : 'white');
const colourName = (colour) => (colour === 'white' ? 'White' : 'Black');
const seatLabel = (state, seat) => (state.seats.length === 4 ? DOUBLES_LABELS : SINGLES_LABELS)[seat];
const seatName = (state, seat) => state.seats[seat].name || seatLabel(state, seat);
const nextSeat = (state, seat) => (seat + 1) % state.seats.length;

function create(seats, options = {}, ctx = {}) {
    if (!Array.isArray(seats) || (seats.length !== 2 && seats.length !== 4)) {
        throw new GameError('Carrom is played by 2 players, or 4 in doubles.');
    }
    const sides = [seats[0].side, seats[1].side];
    if (sides[0] === sides[1]) throw new GameError('The two players must play for different sides.');
    if (seats.length === 4 && (seats[2].side !== sides[0] || seats[3].side !== sides[1])) {
        throw new GameError('In doubles partners sit opposite: seats 1 and 3 play for one side, seats 2 and 4 for the other.');
    }
    const raw = Number(options && options.turnSeconds);
    const turnSeconds = Number.isFinite(raw) ? Math.min(120, Math.max(15, Math.round(raw))) : 45;
    const now = ctx && Number.isFinite(ctx.now) ? ctx.now : 0;
    const state = {
        game: 'carrom',
        status: 'active',
        seats: seats.map((s) => ({ userId: String(s.userId), name: String(s.name || ''), side: s.side })),
        sides,
        positions: seats.length === 4 ? [0, 1, 2, 3] : [0, 2],
        turnSeconds,
        turn: 0,
        deadline: now + turnSeconds * 1000,
        pieces: openingPieces(),
        pocketed: { white: [], black: [] },
        queen: { state: 'board' },
        shots: 0,
        lastShot: null,
        message: '',
        outcome: null
    };
    state.message = `${seatName(state, 0)} breaks with White.`;
    return state;
}

const queenStateOf = (state) => (state.queen.state === 'pending' ? `pending:${state.queen.seat}`
    : state.queen.state === 'covered' ? `covered:${state.queen.side}` : 'board');

function baselineView(state, seat) {
    const f = seatFrame(state, seat);
    return { seat, ...f, angleMin: -ANGLE_LIMIT, angleMax: ANGLE_LIMIT };
}

function view(state, seat, ctx = {}) {
    const you = Number.isInteger(seat) && seat >= 0 && seat < state.seats.length ? seat : null;
    const active = state.status === 'active';
    const yourTurn = active && you !== null && state.turn === you;
    const now = ctx && Number.isFinite(ctx.now) ? ctx.now : null;
    const shot = state.lastShot;
    const fresh = shot && (now === null || now - shot.at <= FRESH_MS);
    const count = (colour) => state.pocketed[colour].length;
    return {
        game: 'carrom',
        status: state.status,
        you,
        turn: active ? state.turn : null,
        deadline: active ? state.deadline : null,
        seats: state.seats.map((s, i) => ({
            name: s.name, side: s.side, label: seatLabel(state, i), color: COLOURS[colourOfSeat(state, i)],
            colour: colourOfSeat(state, i), orientation: boardPosition(state, i) * 90
        })),
        message: state.message,
        outcome: state.outcome,
        mode: state.seats.length === 4 ? 'doubles' : 'singles',
        board: {
            size: BOARD, coinRadius: COIN_R, queenRadius: QUEEN_R, strikerRadius: STRIKER_R,
            pocketRadius: POCKET_R, pockets: POCKETS.map((p) => ({ ...p })),
            baselineInset: BASE_INSET, baselineHalf: BASE_HALF
        },
        pieces: state.pieces.map((p) => ({ id: p.id, kind: p.kind, x: round1(p.x), y: round1(p.y) })),
        pocketed: { white: count('white'), black: count('black') },
        score: ['white', 'black'].map((colour) => ({
            side: sideOfColour(state, colour), colour, label: colourName(colour), pocketed: count(colour), total: COINS_EACH
        })),
        queenState: queenStateOf(state),
        orientation: you !== null ? boardPosition(state, you) * 90 : 0,
        orientations: state.positions.map((p) => p * 90),
        yourColour: you !== null ? colourOfSeat(state, you) : null,
        baseline: active ? baselineView(state, state.turn) : null,
        baselines: state.seats.map((_, i) => baselineView(state, i)),
        canShoot: yourTurn,
        legal: yourTurn ? { type: 'shoot', position: [0, 1], angle: [-ANGLE_LIMIT, ANGLE_LIMIT], power: [0, 1] } : null,
        turnSeconds: state.turnSeconds,
        lastShot: shot ? {
            id: shot.id, seat: shot.seat, at: shot.at, duration: shot.duration,
            start: shot.start, frames: fresh ? shot.frames : [], pocketed: shot.pocketed,
            result: shot.result, foul: shot.foul
        } : null
    };
}

// ── Acting ──────────────────────────────────────────────────────────────────
function act(state, seat, action, ctx = {}) {
    if (!Number.isInteger(seat) || seat < 0 || seat >= state.seats.length) {
        throw new GameError('You are not playing in this game.');
    }
    if (state.status !== 'active') throw new GameError('This game is already over.');
    if (!action || typeof action !== 'object') throw new GameError('That is not a carrom move.');
    const now = ctx && Number.isFinite(ctx.now) ? ctx.now : 0;
    if (action.type === 'resign') return resign(clone(state), seat);
    if (action.type !== 'shoot') throw new GameError('In carrom you can only shoot or resign.');
    if (state.turn !== seat) throw new GameError(`It is ${seatName(state, state.turn)}'s shot, not yours.`);

    const { position, angle, power } = action;
    const number = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!number(position) || position < 0 || position > 1) {
        throw new GameError('The striker has to sit on your baseline: position must be a number from 0 to 1.');
    }
    if (!number(angle) || angle < -ANGLE_LIMIT || angle > ANGLE_LIMIT) {
        throw new GameError(`Aim forwards: the angle must be between -${ANGLE_LIMIT}° and ${ANGLE_LIMIT}°.`);
    }
    if (!number(power) || power < 0 || power > 1) {
        throw new GameError('Power must be a number from 0 to 1.');
    }
    const start = strikerStart(state, seat, position);
    const blocked = state.pieces.some((p) => {
        const reach = RADIUS[p.kind] + STRIKER_R - 0.1;
        return (p.x - start.x) ** 2 + (p.y - start.y) ** 2 < reach * reach;
    });
    if (blocked) throw new GameError('The striker would sit on top of a coin there — slide it along the baseline to a clear spot.');

    const next = clone(state);
    const { vx, vy } = shotVelocity(next, seat, angle, power);
    const bodies = [{ id: 'S', kind: 'striker', x: start.x, y: start.y, vx, vy },
        ...next.pieces.map((p) => ({ ...p, vx: 0, vy: 0 }))];
    const sim = simulate(bodies);
    next.pieces = sim.bodies.filter((b) => b.on && b.kind !== 'striker').map(({ id, kind, x, y }) => ({ id, kind, x, y }));
    const outcome = resolveShot(next, seat, sim.pocketed);
    next.shots += 1;
    next.lastShot = {
        id: next.shots, seat, at: now,
        start: bodies.map((b) => ({ id: b.id, kind: b.kind, x: round1(b.x), y: round1(b.y) })),
        frames: sim.frames,
        duration: sim.frames.length ? sim.frames[sim.frames.length - 1].t : 0,
        pocketed: sim.pocketed.map(({ id, kind, frame, pocket }) => ({ id, kind, frame, pocket })),
        result: outcome.text,
        foul: outcome.foul
    };
    next.message = outcome.text;
    if (next.status === 'active') next.deadline = now + next.turnSeconds * 1000;
    return next;
}

function list(parts) {
    if (parts.length <= 1) return parts.join('');
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function describe(fell) {
    const parts = [];
    for (const colour of ['white', 'black']) {
        const k = fell.filter((p) => p.kind === colour).length;
        if (k) parts.push(`${k === 1 ? 'a' : k} ${colour} coin${k === 1 ? '' : 's'}`);
    }
    if (fell.some((p) => p.kind === 'queen')) parts.push('the queen');
    if (fell.some((p) => p.kind === 'striker')) parts.push('the striker');
    return list(parts);
}

/** Moves the most recently pocketed coin of `colour` back to the free spot nearest the centre. */
function returnCoin(state, colour) {
    const id = state.pocketed[colour].pop();
    if (!id) return false;
    const spot = freeSpot(state.pieces, colour);
    state.pieces.push({ id, kind: colour, x: spot.x, y: spot.y });
    return true;
}

function returnQueen(state) {
    const spot = freeSpot(state.pieces, 'queen');
    state.pieces.push({ id: 'Q', kind: 'queen', x: spot.x, y: spot.y });
    state.queen = { state: 'board' };
}

/**
 * Applies the rules to what fell in one shot. Mutates `state` (already a
 * copy) and returns the sentence that describes the shot.
 */
function resolveShot(state, seat, fell) {
    const name = seatName(state, seat);
    const side = state.seats[seat].side;
    const own = colourOfSeat(state, seat);
    const theirs = otherColour(own);
    const ownIn = fell.filter((p) => p.kind === own);
    const theirsIn = fell.filter((p) => p.kind === theirs);
    const queenIn = fell.some((p) => p.kind === 'queen');
    const strikerIn = fell.some((p) => p.kind === 'striker');
    const wasPending = state.queen.state === 'pending' && state.queen.seat === seat;
    const notes = [];
    let foul = false;

    for (const p of ownIn) state.pocketed[own].push(p.id);
    for (const p of theirsIn) state.pocketed[theirs].push(p.id);
    const sentence = fell.length ? `${name} pocketed ${describe(fell)}.` : `${name} pocketed nothing.`;

    if (strikerIn) {
        foul = true;
        notes.push('Foul — the striker went in.');
        if (queenIn || wasPending) {
            returnQueen(state);
            notes.push('The queen goes back to the centre.');
        }
        if (returnCoin(state, own)) notes.push(`One ${own} coin goes back to the centre.`);
    } else if (wasPending) {
        if (ownIn.length) {
            state.queen = { state: 'covered', side, seat };
            notes.push(`The queen is covered — she belongs to ${colourName(own)}.`);
        } else {
            returnQueen(state);
            notes.push('The queen was not covered and goes back to the centre.');
        }
    } else if (queenIn) {
        if (ownIn.length) {
            state.queen = { state: 'covered', side, seat };
            notes.push(`The queen is covered at once — she belongs to ${colourName(own)}.`);
        } else {
            state.queen = { state: 'pending', seat };
            notes.push(`Cover the queen with a ${own} coin on the next shot.`);
        }
    }

    // No side may finish its coins while the queen is still to be won.
    if (state.queen.state !== 'covered') {
        for (const colour of [own, theirs]) {
            if (state.pocketed[colour].length >= COINS_EACH) {
                returnCoin(state, colour);
                foul = true;
                notes.push(colour === own
                    ? `Foul — ${colourName(own)}'s last coin cannot go in before the queen is covered; it goes back to the centre.`
                    : `Foul — ${colourName(theirs)}'s last coin cannot go in before the queen is covered; it goes back to the centre.`);
            }
        }
        // A foul ends the turn, so a queen waiting for this seat's cover cannot wait.
        if (foul && state.queen.state === 'pending') {
            returnQueen(state);
            notes.push('The queen goes back to the centre.');
        }
    }

    // A side that has every coin in, with the queen covered, has won.
    if (state.queen.state === 'covered') {
        const winner = state.pocketed[own].length >= COINS_EACH ? own
            : state.pocketed[theirs].length >= COINS_EACH ? theirs : null;
        if (winner) {
            const winSide = sideOfColour(state, winner);
            const loseSide = sideOfColour(state, otherColour(winner));
            const reason = `${colourName(winner)} cleared the board`;
            finish(state, [[winSide], [loseSide]], reason);
            return { text: [sentence, ...notes, `${reason} — ${colourName(winner)} wins.`].join(' '), foul };
        }
    }

    const again = !foul && (ownIn.length > 0 || (queenIn && state.queen.state === 'pending'));
    if (!again) state.turn = nextSeat(state, seat);
    notes.push(again ? `${name} shoots again.` : `${seatName(state, state.turn)} to shoot.`);
    return { text: [sentence, ...notes].join(' '), foul };
}

function finish(state, places, reason) {
    state.status = 'finished';
    state.outcome = { places, reason };
    state.turn = null;
    state.deadline = null;
}

function resign(state, seat) {
    const side = state.seats[seat].side;
    const colour = colourOfSide(state, side);
    const reason = `${colourName(colour)} resigned`;
    finish(state, [[sideOfColour(state, otherColour(colour))], [side]], reason);
    state.message = `${seatName(state, seat)} resigned — ${colourName(otherColour(colour))} wins.`;
    return state;
}

function tick(state, ctx = {}) {
    if (state.status !== 'active' || state.deadline == null) return null;
    const now = ctx && Number.isFinite(ctx.now) ? ctx.now : null;
    if (now === null || now < state.deadline) return null;
    const next = clone(state);
    const seat = next.turn;
    const notes = [`${seatName(next, seat)} ran out of time — the shot is forfeited.`];
    if (next.queen.state === 'pending' && next.queen.seat === seat) {
        returnQueen(next);
        notes.push('The queen goes back to the centre.');
    }
    next.turn = nextSeat(next, seat);
    notes.push(`${seatName(next, next.turn)} to shoot.`);
    next.message = notes.join(' ');
    next.deadline = now + next.turnSeconds * 1000;
    return next;
}

const deadline = (state) => (state.status === 'active' ? state.deadline : null);
const outcome = (state) => (state.status === 'finished' ? state.outcome : null);

module.exports = {
    id: 'carrom',
    label: 'Carrom',
    emoji: '🟤',
    minSeats: 2,
    maxSeats: 4,
    seatsPerSide: { min: 1, max: 2 },
    summary: 'Flick the striker, pocket your nine coins and cover the queen — singles or doubles.',
    create,
    view,
    act,
    tick,
    deadline,
    outcome,
    // internals, exported for the tests
    simulate,
    openingPieces,
    seatFrame,
    strikerStart,
    shotVelocity,
    freeSpot,
    CONSTANTS: {
        BOARD, CENTRE, COIN_R, QUEEN_R, STRIKER_R, POCKET_R, POCKETS, BASE_INSET, BASE_HALF, ANGLE_LIMIT,
        COINS_EACH, DT, STEP_MS, SAMPLE, EVENT_GAP, MAX_STEPS, MAX_FRAMES, FRICTION, MAX_SPEED,
        PIECE_RESTITUTION, WALL_RESTITUTION, FRESH_MS, RADIUS, MASS
    }
};
