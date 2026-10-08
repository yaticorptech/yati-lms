/**
 * UNO — standard rules, 2 to 4 players, no stacking and no challenge rule.
 *
 * Follows ./contract.js. Everything random (the shuffle, every reshuffle of
 * the discard pile) comes from ctx.rng and every time from ctx.now, so a test
 * can replay a game exactly.
 *
 * Cards are { id, color, value }:
 *   color  'red' | 'yellow' | 'green' | 'blue', or 'wild' for the two wild cards
 *   value  '0'…'9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'
 *   id     stable and unique for the whole game, e.g. 'red-7-2', 'wild4-3'
 * A wild card keeps color 'wild' wherever it is; the colour its player chose
 * lives in state.currentColor.
 *
 * Actions:
 *   { type: 'play', card: id, color?: colour (wilds only, required), uno?: true }
 *   { type: 'draw' }   once per turn, before passing
 *   { type: 'pass' }   only after drawing
 *   { type: 'resign' }
 */
const { GameError, clone } = require('./contract');

const COLORS = ['red', 'yellow', 'green', 'blue'];
const SEAT_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fbc02d'];
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES = ['skip', 'reverse', 'draw2'];
const VALUE_NAMES = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw Two', wild: 'Wild', wild4: 'Wild Draw Four' };

const isNumber = (card) => NUMBERS.includes(card.value);
const isWild = (card) => card.color === 'wild';
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const cardName = (card) => (isWild(card) ? VALUE_NAMES[card.value] : `${capital(card.color)} ${VALUE_NAMES[card.value] || card.value}`);

const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
};

/** The 108-card deck in a fixed order: per colour one 0, two of 1–9 and of each action, then 4 Wild and 4 Wild Draw Four. */
const buildDeck = () => {
    const deck = [];
    for (const color of COLORS) {
        deck.push({ id: `${color}-0-1`, color, value: '0' });
        for (const value of [...NUMBERS.slice(1), ...ACTION_VALUES]) {
            for (const copy of [1, 2]) deck.push({ id: `${color}-${value}-${copy}`, color, value });
        }
    }
    for (const value of ['wild', 'wild4']) {
        for (const copy of [1, 2, 3, 4]) deck.push({ id: `${value}-${copy}`, color: 'wild', value });
    }
    return deck;
};

/** Fisher–Yates, in place, with the context's random numbers. */
const shuffle = (cards, rng) => {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
};

const nameOf = (state, seat) => state.seats[seat].name;
const activeSeats = (state) => state.seats.map((_, i) => i).filter((i) => !state.resigned[i]);
const top = (state) => state.discard[state.discard.length - 1];

/** The seat `steps` active players on from `from`, in the current direction. */
const nextSeat = (state, from, steps = 1) => {
    const n = state.seats.length;
    let seat = from;
    // Bounded, so a table with nobody left in it cannot spin forever.
    for (let moved = 0, looked = 0; moved < steps && looked < n * (steps + 1); looked++) {
        seat = (((seat + state.direction) % n) + n) % n;
        if (!state.resigned[seat]) moved++;
    }
    return seat;
};

const canPlay = (state, card) => isWild(card) || card.color === state.currentColor || card.value === top(state).value;

/** One card off the draw pile, reshuffling the discard pile (all but its top card) into it when it runs out. Null when there is nothing left anywhere. */
const drawOne = (state, ctx) => {
    if (!state.drawPile.length && state.discard.length > 1) {
        const keep = state.discard.pop();
        state.drawPile = shuffle(state.discard, ctx.rng);
        state.discard = [keep];
        state.reshuffles += 1;
    }
    return state.drawPile.length ? state.drawPile.pop() : null;
};

/** Draws up to `count` cards into a seat's hand; returns how many it got. */
const drawInto = (state, seat, count, ctx) => {
    let got = 0;
    for (let i = 0; i < count; i++) {
        const card = drawOne(state, ctx);
        if (!card) break;
        state.hands[seat].push(card);
        got++;
    }
    return got;
};

const startTurn = (state, seat, ctx) => {
    state.turn = seat;
    state.turnNumber += 1;
    state.hasDrawn = false;
    state.drawnCard = null;
    state.deadline = ctx.now + state.options.turnSeconds * 1000;
};

const finish = (state, winner, reason) => {
    state.status = 'finished';
    state.turn = null;
    state.deadline = null;
    state.hasDrawn = false;
    state.drawnCard = null;
    // Winner first, then everyone still in by fewest cards (ties share a
    // place), then those who resigned — the last to resign placing highest.
    const groups = [[winner]];
    const rest = activeSeats(state).filter((s) => s !== winner).sort((a, b) => state.hands[a].length - state.hands[b].length);
    for (const seat of rest) {
        const last = groups[groups.length - 1];
        if (last[0] !== winner && state.hands[last[0]].length === state.hands[seat].length) last.push(seat);
        else groups.push([seat]);
    }
    for (const seat of [...state.resignOrder].reverse()) groups.push([seat]);
    // Places are in sides; a side with several seats takes its best place.
    const seen = new Set();
    const places = [];
    for (const group of groups) {
        const sides = [];
        for (const seat of group) {
            const side = state.seats[seat].side;
            if (!seen.has(side)) { seen.add(side); sides.push(side); }
        }
        if (sides.length) places.push(sides.sort((a, b) => a - b));
    }
    state.result = { places, reason };
};

const engine = {
    id: 'uno',
    label: 'UNO',
    emoji: '🃏',
    minSeats: 2,
    maxSeats: 4,
    seatsPerSide: { min: 1, max: 1 },
    summary: 'Match the colour or the number, call UNO on your last card, and be the first to empty your hand.',

    create(seats, options = {}, ctx) {
        if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4) throw new GameError('UNO needs 2 to 4 players.');
        const opts = options || {};
        const turnSeconds = clampInt(opts.turnSeconds, 10, 120, 30);
        const handSize = clampInt(opts.handSize, 5, 7, 7);
        const state = {
            game: 'uno',
            status: 'active',
            seats: seats.map((s, i) => ({ userId: String(s.userId ?? ''), name: String(s.name || `Player ${i + 1}`), side: Number.isInteger(s.side) ? s.side : i })),
            options: { turnSeconds, handSize },
            drawPile: shuffle(buildDeck(), ctx.rng),
            discard: [],
            hands: seats.map(() => []),
            resigned: seats.map(() => false),
            resignOrder: [],
            outOfPlay: [],
            currentColor: null,
            direction: 1,
            turn: 0,
            turnNumber: 0,
            hasDrawn: false,
            drawnCard: null,
            deadline: null,
            reshuffles: 0,
            message: '',
            result: null
        };
        for (let round = 0; round < handSize; round++) {
            for (let seat = 0; seat < seats.length; seat++) state.hands[seat].push(state.drawPile.pop());
        }
        // The first discard must be a number card: anything else goes back and the pile is reshuffled.
        let first = state.drawPile.pop();
        while (!isNumber(first)) {
            state.drawPile.push(first);
            shuffle(state.drawPile, ctx.rng);
            first = state.drawPile.pop();
        }
        state.discard.push(first);
        state.currentColor = first.color;
        startTurn(state, 0, ctx);
        state.message = `${cardName(first)} starts the pile. ${nameOf(state, 0)} goes first.`;
        return state;
    },

    view(state, seat, _ctx) {
        const you = Number.isInteger(seat) && seat >= 0 && seat < state.seats.length ? seat : null;
        const active = state.status === 'active';
        const myTurn = active && you !== null && state.turn === you;
        const t = top(state);
        const playable = myTurn
            ? state.hands[you].filter((c) => (state.hasDrawn ? c.id === state.drawnCard : true) && canPlay(state, c)).map((c) => c.id)
            : [];
        return {
            game: 'uno',
            status: state.status,
            you,
            turn: active ? state.turn : null,
            deadline: active ? state.deadline : null,
            seats: state.seats.map((s, i) => ({ name: s.name, side: s.side, label: `Player ${i + 1}`, color: SEAT_COLORS[i % SEAT_COLORS.length] })),
            message: state.message,
            outcome: engine.outcome(state),

            top: { id: t.id, color: t.color, value: t.value },
            currentColor: state.currentColor,
            direction: state.direction,
            drawPileCount: state.drawPile.length,
            discardCount: state.discard.length,
            hand: you === null ? null : state.hands[you].map((c) => ({ id: c.id, color: c.color, value: c.value })),
            handCounts: state.hands.map((h) => h.length),
            resigned: [...state.resigned],
            hasDrawn: active ? state.hasDrawn : false,
            turnNumber: state.turnNumber,
            turnSeconds: state.options.turnSeconds,
            playable,
            canDraw: myTurn && !state.hasDrawn,
            canPass: myTurn && state.hasDrawn
        };
    },

    act(input, seat, action, ctx) {
        if (input.status !== 'active') throw new GameError('This game is already over.');
        if (!Number.isInteger(seat) || seat < 0 || seat >= input.seats.length) throw new GameError('You are not playing in this game.');
        if (input.resigned[seat]) throw new GameError('You have already resigned from this game.');
        if (!action || typeof action !== 'object' || typeof action.type !== 'string') throw new GameError('That move was not understood.');
        const state = clone(input);
        const me = nameOf(state, seat);

        if (action.type === 'resign') {
            state.resigned[seat] = true;
            state.resignOrder.push(seat);
            state.outOfPlay.push(...state.hands[seat]);
            state.hands[seat] = [];
            const left = activeSeats(state);
            if (left.length === 1) {
                state.message = `${me} resigned. ${nameOf(state, left[0])} wins.`;
                finish(state, left[0], `${nameOf(state, left[0])} is the last player left`);
                return state;
            }
            state.message = `${me} resigned.`;
            if (state.turn === seat) {
                const next = nextSeat(state, seat);
                startTurn(state, next, ctx);
                state.message += ` ${nameOf(state, next)}'s turn.`;
            }
            return state;
        }

        if (state.turn !== seat) throw new GameError(`It is not your turn — it is ${nameOf(state, state.turn)}'s.`);

        if (action.type === 'draw') {
            if (state.hasDrawn) throw new GameError('You have already drawn this turn. Play the card you drew or pass.');
            const card = drawOne(state, ctx);
            if (!card) {
                const next = nextSeat(state, seat);
                state.message = `There were no cards left for ${me} to draw, so the turn passes to ${nameOf(state, next)}.`;
                startTurn(state, next, ctx);
                return state;
            }
            state.hands[seat].push(card);
            if (canPlay(state, card)) {
                state.hasDrawn = true;
                state.drawnCard = card.id;
                state.message = `${me} drew a card.`;
            } else {
                const next = nextSeat(state, seat);
                state.message = `${me} drew a card and could not play it.`;
                startTurn(state, next, ctx);
            }
            return state;
        }

        if (action.type === 'pass') {
            if (!state.hasDrawn) throw new GameError('Draw a card before you pass.');
            const next = nextSeat(state, seat);
            state.message = `${me} passed.`;
            startTurn(state, next, ctx);
            return state;
        }

        if (action.type === 'play') {
            const hand = state.hands[seat];
            const index = hand.findIndex((c) => c.id === action.card);
            if (index === -1) throw new GameError('That card is not in your hand.');
            const card = hand[index];
            if (state.hasDrawn && card.id !== state.drawnCard) throw new GameError('After drawing you may only play the card you drew, or pass.');
            if (!canPlay(state, card)) {
                const t = top(state);
                throw new GameError(isWild(t)
                    ? `That card does not match. Play a ${state.currentColor} card or a wild card.`
                    : `That card does not match. Play a ${state.currentColor} card, a ${VALUE_NAMES[t.value] || t.value}, or a wild card.`);
            }
            if (isWild(card) && !COLORS.includes(action.color)) throw new GameError('Choose a colour for your wild card.');

            hand.splice(index, 1);
            state.discard.push(card);
            state.currentColor = isWild(card) ? action.color : card.color;
            const parts = [isWild(card) ? `${me} played ${cardName(card)} and chose ${action.color}` : `${me} played ${cardName(card)}`];

            if (hand.length === 1 && action.uno !== true) {
                const got = drawInto(state, seat, 2, ctx);
                parts.push(`${me} did not call UNO and draws ${got} penalty card${got === 1 ? '' : 's'}`);
            } else if (hand.length === 1) {
                parts.push(`${me} calls UNO`);
            }

            // A last card that is a Draw Two or Wild Draw Four still makes the
            // next player draw: the cards count when the others are placed.
            let next;
            let effect = null;
            if (card.value === 'skip') {
                next = nextSeat(state, seat, 2);
                effect = `${nameOf(state, nextSeat(state, seat))} is skipped`;
            } else if (card.value === 'reverse') {
                state.direction *= -1;
                if (activeSeats(state).length === 2) {
                    next = seat; // with two players a Reverse works as a Skip
                    effect = `${nameOf(state, nextSeat(state, seat))} is skipped`;
                } else {
                    next = nextSeat(state, seat);
                    effect = 'Play changes direction';
                }
            } else if (card.value === 'draw2' || card.value === 'wild4') {
                const victim = nextSeat(state, seat);
                const got = drawInto(state, victim, card.value === 'draw2' ? 2 : 4, ctx);
                next = nextSeat(state, seat, 2);
                effect = `${nameOf(state, victim)} draws ${got} and misses a turn`;
            } else {
                next = nextSeat(state, seat);
            }

            if (hand.length === 0) {
                const drew = card.value === 'draw2' || card.value === 'wild4' ? `. ${effect}` : '';
                state.message = `${parts[0]}${drew}. ${me} wins!`;
                finish(state, seat, `${me} played their last card`);
                return state;
            }
            if (effect) parts.splice(1, 0, effect);
            state.message = `${parts.join('. ')}.`;
            startTurn(state, next, ctx);
            return state;
        }

        throw new GameError('That move was not understood.');
    },

    tick(input, ctx) {
        if (input.status !== 'active' || input.deadline === null || ctx.now < input.deadline) return null;
        const state = clone(input);
        const seat = state.turn;
        const me = nameOf(state, seat);
        if (!state.hasDrawn) {
            const card = drawOne(state, ctx);
            if (card) state.hands[seat].push(card);
            state.message = card ? `${me} ran out of time, drew a card and passed.` : `${me} ran out of time and passed.`;
        } else {
            state.message = `${me} ran out of time and passed.`;
        }
        startTurn(state, nextSeat(state, seat), ctx);
        return state;
    },

    deadline(state) {
        return state.status === 'active' ? state.deadline : null;
    },

    outcome(state) {
        return state.status === 'finished' && state.result ? { places: state.result.places.map((g) => [...g]), reason: state.result.reason } : null;
    }
};

module.exports = engine;
