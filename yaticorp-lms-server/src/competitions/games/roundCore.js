/**
 * The round-based Group Brain games — Memory Matrix, Sequence & Reaction and
 * Strategy Arena — share one engine, made here. Each follows ./contract.js;
 * this file holds the rounds, the clock, the scores and the places, and
 * each game passes what a round is, what a player may answer, and how the
 * answers score.
 *
 * Everyone plays the same round at the same time. A round goes through:
 *
 *   ready    a few seconds' countdown before round 1
 *   show     what to remember (a grid, a sequence) or, in a reaction round,
 *            the wait for "Go" — skipped when the round has nothing to show
 *   answer   players answer, once each; it closes when everyone still
 *            playing has answered, or its time runs out
 *   reveal   the right answer, every player's answer and points, a moment
 *
 * then the next round, until the last one's reveal ends the game. Scores are
 * worked out when a round closes, all at once (Strategy Arena's points
 * depend on everyone's moves). Nothing about another player's answer, nor
 * the right one, leaves the server before the reveal.
 *
 * Places go by points; equal points go to whoever answered faster in total;
 * equal on both share the place. A seat that resigns places below everyone
 * still playing, and once only one is left the game ends.
 *
 * makeRoundEngine(config):
 *   id, label, emoji, summary, minSeats, maxSeats
 *   setup(options, rng, seatCount) -> { rounds, ...anything the game keeps }
 *   round(game, index, rng) -> { showMs, answerMs, ...the round }
 *   publicRound(round, phase, game) -> what players may see of it now
 *   answer(round, action, game, seat) -> the answer to keep (throws GameError)
 *   early(round, action) -> an answer given during `show` (reaction rounds), or undefined
 *   score(round, answers, game) -> [{ points, correct?, detail? }] per seat
 *   after(game, round, answers, results) -> optional: update what the game keeps
 *   seatView(game, seat) -> optional: extra for that player (Strategy's energy)
 *   actions: { [type](game, seat, action, ctx) -> null | { answer } } — optional
 *            moves within a round besides the one answer (Code Breaker's
 *            guesses, a hint): one returning { answer } ends that player's
 *            round as an answer would
 */
const { GameError, clone } = require('./contract');
const { PALETTE, clampNumber, LEVELS } = require('./quizCore');

const READY_MS = 4000;
const REVEAL_MS = 4000;

const playing = (s) => s.seats.map((_, i) => i).filter((i) => !s.out.includes(i));

const placesOf = (s) => {
    const ranked = playing(s)
        .map((i) => ({ side: s.seats[i].side, points: s.scores[i], ms: s.timeMs[i] }))
        .sort((a, b) => b.points - a.points || a.ms - b.ms);
    const places = [];
    for (const r of ranked) {
        const last = places[places.length - 1];
        if (last && last.points === r.points && last.ms === r.ms) last.sides.push(r.side);
        else places.push({ points: r.points, ms: r.ms, sides: [r.side] });
    }
    const groups = places.map((p) => p.sides);
    for (const i of [...s.out].reverse()) groups.push([s.seats[i].side]);
    return groups;
};

const makeRoundEngine = (config) => {
    const finish = (s, now) => {
        s.status = 'finished';
        s.phase = 'over';
        s.phaseEndsAt = null;
        s.finishedAt = now;
        const places = placesOf(s);
        const reason = s.out.length && playing(s).length <= 1
            ? 'The others resigned'
            : places[0]?.length > 1 ? 'Level on points and time — a draw' : `Most points after ${s.rounds} rounds`;
        s.result = { places, reason };
        s.message = places[0]?.length === 1 ? `${s.seats.find((x) => x.side === places[0][0]).name} wins.` : 'A draw.';
        return s;
    };

    /** Open round `index`: its show, or straight to answering. */
    const open = (s, index, now, rng) => {
        s.index = index;
        s.current = config.round(s, index, rng);
        s.answers = s.seats.map(() => null);
        s.results = null;
        s.message = `Round ${index + 1} of ${s.rounds}.`;
        return s.current.showMs ? to(s, 'show', now, s.current.showMs) : to(s, 'answer', now, s.current.answerMs);
    };
    const to = (s, phase, now, ms) => {
        s.phase = phase;
        s.phaseStartedAt = now;
        s.phaseEndsAt = now + ms;
        return s;
    };

    /** Close the round: score every answer at once, then the reveal. */
    const close = (s, now) => {
        const results = config.score(s.current, s.answers, s);
        results.forEach((r, i) => {
            if (s.out.includes(i)) return;
            s.scores[i] += r.points;
            if (r.correct) s.correct[i] += 1;
            if (s.answers[i]) s.timeMs[i] += s.answers[i].ms;
        });
        s.results = results;
        // Every round's results, kept for the record (Group Brain's checks read them).
        s.log = [...(s.log || []), { index: s.index, results }];
        if (config.after) config.after(s, s.current, s.answers, results);
        s.message = config.revealMessage ? config.revealMessage(s.current, results, s) : `Round ${s.index + 1} done.`;
        return to(s, 'reveal', now, REVEAL_MS);
    };

    const settled = (s) => playing(s).every((i) => s.answers[i]);

    const engine = {
        id: config.id,
        label: config.label,
        emoji: config.emoji,
        summary: config.summary,
        minSeats: config.minSeats || 2,
        maxSeats: config.maxSeats || 4,
        seatsPerSide: { min: 1, max: 1 },

        create(seats, options, ctx) {
            if (!Array.isArray(seats) || seats.length < engine.minSeats || seats.length > engine.maxSeats) throw new GameError(`${config.label} needs ${engine.minSeats} to ${engine.maxSeats} players.`);
            const o = options || {};
            const level = LEVELS.includes(o.difficulty) ? o.difficulty : 'medium';
            const setup = config.setup({ ...o, difficulty: level }, ctx.rng, seats.length);
            return {
                game: config.id,
                difficulty: level,
                status: 'active',
                seats: seats.map((x) => ({ name: x.name || 'Player', side: x.side })),
                ...setup,
                rounds: clampNumber(o.rounds, setup.rounds, 3, 20),
                index: -1,
                current: null,
                phase: 'ready',
                phaseStartedAt: ctx.now,
                phaseEndsAt: ctx.now + READY_MS,
                answers: [],
                results: null,
                scores: seats.map(() => 0),
                correct: seats.map(() => 0),
                timeMs: seats.map(() => 0),
                out: [],
                result: null,
                message: 'Get ready — round 1 starts in a moment.',
                startedAt: ctx.now,
                finishedAt: null
            };
        },

        view(s, seat, ctx) {
            const you = Number.isInteger(seat) && seat >= 0 && seat < s.seats.length ? seat : null;
            const active = s.status === 'active';
            const revealed = s.phase === 'reveal' || !active;
            return {
                game: s.game,
                status: s.status,
                you,
                turn: null,
                deadline: active ? s.phaseEndsAt : null,
                seats: s.seats.map((x, i) => ({ name: x.name, side: x.side, label: `Player ${i + 1}`, color: PALETTE[i % PALETTE.length] })),
                message: s.message,
                outcome: engine.outcome(s),
                difficulty: s.difficulty,
                phase: s.phase,
                serverNow: ctx?.now ?? null,
                phaseStartedAt: s.phaseStartedAt,
                phaseEndsAt: s.phaseEndsAt,
                number: s.index + 1,
                total: s.rounds,
                round: s.current && s.phase !== 'over' ? config.publicRound(s.current, s.phase, s) : null,
                // While a round is open: your own answer, and of the others only that they have answered.
                answers: s.seats.map((_, i) => {
                    const a = s.answers?.[i];
                    if (!a) return null;
                    if (revealed || i === you) return { ...a.value, ms: a.ms };
                    return { answered: true };
                }),
                results: revealed ? s.results : null,
                scores: [...s.scores],
                correct: [...s.correct],
                out: [...s.out],
                canAnswer: active && you !== null && !s.out.includes(you) && !s.answers?.[you]
                    && (s.phase === 'answer' || (s.phase === 'show' && !!s.current?.early)),
                ...(config.seatView && you !== null ? config.seatView(s, you) : {})
            };
        },

        act(input, seat, action, ctx) {
            const s = clone(input);
            if (!Number.isInteger(seat) || seat < 0 || seat >= s.seats.length) throw new GameError('You are not playing in this game.');
            if (s.status !== 'active') throw new GameError('The game is over.');
            if (s.out.includes(seat)) throw new GameError('You have left this game.');
            const type = action && action.type;
            if (type === 'resign') {
                s.out.push(seat);
                s.message = `${s.seats[seat].name} resigned.`;
                if (playing(s).length <= 1) return finish(s, ctx.now);
                if (s.phase === 'answer' && settled(s)) return close(s, ctx.now);
                return s;
            }
            if (config.actions?.[type]) {
                if (s.phase !== 'answer') throw new GameError(s.phase === 'show' ? 'Wait — the round opens in a moment.' : 'Wait for the next round.');
                if (s.answers[seat]) throw new GameError('You have finished this round.');
                if (ctx.now >= s.phaseEndsAt) throw new GameError('Time is up for this round.');
                const out = config.actions[type](s, seat, action || {}, ctx);
                if (out && out.answer !== undefined) {
                    s.answers[seat] = { value: out.answer, ms: Math.max(0, ctx.now - s.phaseStartedAt) };
                    return settled(s) ? close(s, ctx.now) : s;
                }
                return s;
            }
            if (type !== 'answer') throw new GameError(`That is not something you can do in ${config.label}.`);
            if (s.answers[seat]) throw new GameError('You have already answered this round.');
            if (s.phase === 'show' && s.current.early) {
                // A reaction round: answering before "Go" is a false start.
                s.answers[seat] = { value: config.early(s.current, action), ms: s.current.answerMs };
                return settled(s) ? close(s, ctx.now) : s;
            }
            if (s.phase !== 'answer') throw new GameError(s.phase === 'show' ? 'Watch first — answering opens in a moment.' : 'Wait for the next round.');
            if (ctx.now >= s.phaseEndsAt) throw new GameError('Time is up for this round.');
            const value = config.answer(s.current, action, s, seat);
            s.answers[seat] = { value, ms: Math.max(0, ctx.now - s.phaseStartedAt) };
            s.message = `${s.seats[seat].name} has answered.`;
            return settled(s) ? close(s, ctx.now) : s;
        },

        tick(input, ctx) {
            if (input.status !== 'active' || input.phaseEndsAt > ctx.now) return null;
            const s = clone(input);
            if (s.phase === 'ready') return open(s, 0, ctx.now, ctx.rng);
            // Answering opens at the show's scheduled end ("Go"), however late
            // this tick runs, so a reaction is timed from the moment every
            // browser showed Go.
            if (s.phase === 'show') return settled(s) ? close(s, ctx.now) : to(s, 'answer', s.phaseEndsAt, s.current.answerMs);
            if (s.phase === 'answer') return close(s, ctx.now);
            return s.index + 1 < s.rounds ? open(s, s.index + 1, ctx.now, ctx.rng) : finish(s, ctx.now);
        },

        deadline(s) {
            return s.status === 'active' ? s.phaseEndsAt : null;
        },

        outcome(s) {
            if (s.status !== 'finished' || !s.result) return null;
            return { places: s.result.places.map((g) => [...g]), reason: s.result.reason };
        }
    };
    return engine;
};

module.exports = { makeRoundEngine, READY_MS, REVEAL_MS };
