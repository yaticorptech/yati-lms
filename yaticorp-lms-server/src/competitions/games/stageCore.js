/**
 * The Group Brain adventures (The Final Vault, The Lost Kingdom) run on this engine. Each follows
 * ./contract.js.
 *
 * Everyone plays the same stages (made once, from the game's rng) against
 * the same clock, each at their own pace: a short countdown, then one timed
 * run. A player's progress is their own — which stage they are on, their
 * mistakes, lives or energy — and only how far along each player is, never
 * their answers, is shown to the others. The run ends for a player when
 * they finish, fail (out of lives or energy) or leave; the game ends when it
 * has ended for everyone, or when the time runs out.
 *
 * Every move names the stage it is for, so a double click or a stale screen
 * cannot answer a stage twice: a move for any stage but the player's current
 * one is refused.
 *
 * makeStageEngine(config):
 *   id, label, emoji, summary, minSeats, maxSeats
 *   setup(options, rng) -> { seconds, ...what everyone shares (the stages, the map) }
 *   start(shared) -> a player's progress at the start (stage 0, lives…)
 *   actions: { [type](state, seat, action, ctx) } — change state.progress[seat];
 *            set `done` (finished) or `failed`; throw GameError to refuse
 *   publicOf(state, seat, over) -> what that player may see of the game
 *   progressOf(progress) -> { at, of } for the live board
 *   score(state, seat) -> points
 *
 * Places: by points, then who finished first.
 */
const { GameError, clone } = require('./contract');
const { PALETTE, LEVELS } = require('./quizCore');

const READY_MS = 5000;

const makeStageEngine = (config) => {
    const playing = (s) => s.seats.map((_, i) => i).filter((i) => !s.out.includes(i));
    const ended = (s, i) => s.out.includes(i) || s.progress[i].done || s.progress[i].failed;

    const placesOf = (s) => {
        const rows = playing(s).map((i) => ({ side: s.seats[i].side, points: s.scores[i], at: s.progress[i].doneMs ?? Infinity }))
            .sort((a, b) => b.points - a.points || a.at - b.at);
        const groups = [];
        let last = null;
        for (const r of rows) {
            if (last && last.points === r.points && last.at === r.at) groups[groups.length - 1].push(r.side);
            else groups.push([r.side]);
            last = r;
        }
        for (const i of [...s.out].reverse()) groups.push([s.seats[i].side]);
        return groups;
    };

    const finish = (s, now, why) => {
        s.status = 'finished';
        s.phase = 'over';
        s.phaseEndsAt = null;
        s.finishedAt = now;
        s.scores = s.seats.map((_, i) => (s.out.includes(i) ? 0 : config.score(s, i)));
        const places = placesOf(s);
        s.result = { places, reason: why || (places[0]?.length > 1 ? 'Level on points — a draw' : 'Most points') };
        s.message = places[0]?.length === 1 ? `${s.seats.find((x) => x.side === places[0][0]).name} wins.` : 'A draw.';
        return s;
    };
    const maybeOver = (s, now) => {
        if (playing(s).length <= 1 && s.out.length) return finish(s, now, 'The others left');
        return playing(s).every((i) => ended(s, i)) ? finish(s, now, 'Everyone has finished their run') : s;
    };

    const engine = {
        id: config.id, label: config.label, emoji: config.emoji, summary: config.summary,
        minSeats: config.minSeats || 2, maxSeats: config.maxSeats || 6,
        seatsPerSide: { min: 1, max: 1 },

        create(seats, options, ctx) {
            if (!Array.isArray(seats) || seats.length < engine.minSeats || seats.length > engine.maxSeats) throw new GameError(`${config.label} needs ${engine.minSeats} to ${engine.maxSeats} players.`);
            const level = LEVELS.includes(options?.difficulty) ? options.difficulty : 'medium';
            const shared = config.setup({ ...(options || {}), difficulty: level }, ctx.rng);
            return {
                game: config.id, difficulty: level, status: 'active',
                seats: seats.map((x) => ({ name: x.name || 'Player', side: x.side })),
                shared,
                progress: seats.map(() => ({ ...config.start(shared), done: false, failed: false, doneMs: null, mistakes: 0 })),
                phase: 'ready', phaseStartedAt: ctx.now, phaseEndsAt: ctx.now + READY_MS,
                runMs: shared.seconds * 1000,
                scores: seats.map(() => 0), out: [], result: null,
                message: `Get ready — ${config.label} begins in a moment.`,
                startedAt: ctx.now, finishedAt: null
            };
        },

        view(s, seat, ctx) {
            const you = Number.isInteger(seat) && seat >= 0 && seat < s.seats.length ? seat : null;
            const over = s.status !== 'active';
            return {
                game: s.game, status: s.status, you, turn: null,
                deadline: over ? null : s.phaseEndsAt,
                seats: s.seats.map((x, i) => ({ name: x.name, side: x.side, label: `Player ${i + 1}`, color: PALETTE[i % PALETTE.length] })),
                message: s.message, outcome: engine.outcome(s),
                difficulty: s.difficulty, phase: s.phase, serverNow: ctx?.now ?? null,
                phaseStartedAt: s.phaseStartedAt, phaseEndsAt: s.phaseEndsAt, runMs: s.runMs,
                // The live board: how far each player is, never their answers.
                players: s.progress.map((p, i) => ({ ...config.progressOf(p, s), done: p.done, failed: p.failed, mistakes: p.mistakes, left: s.out.includes(i) })),
                scores: over ? [...s.scores] : s.seats.map((_, i) => (s.out.includes(i) ? 0 : config.score(s, i))),
                out: [...s.out],
                canPlay: !over && s.phase === 'play' && you !== null && !ended(s, you),
                ...config.publicOf(s, you, over)
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
                s.message = `${s.seats[seat].name} left.`;
                return maybeOver(s, ctx.now);
            }
            const run = config.actions[type];
            if (!run) throw new GameError(`That is not something you can do in ${config.label}.`);
            if (s.phase !== 'play') throw new GameError('Get ready — it starts in a moment.');
            if (ctx.now >= s.phaseEndsAt) throw new GameError('Time is up.');
            const p = s.progress[seat];
            if (p.done) throw new GameError('You have finished your run.');
            if (p.failed) throw new GameError('Your run is over.');
            // A move for another stage than the current one: a double click, or a screen behind.
            if (action.stage != null && Number(action.stage) !== p.stage) throw new GameError('That stage is already behind you.');
            run(s, seat, action, ctx);
            if (p.done && p.doneMs == null) p.doneMs = ctx.now - s.phaseStartedAt;
            return maybeOver(s, ctx.now);
        },

        tick(input, ctx) {
            if (input.status !== 'active' || input.phaseEndsAt > ctx.now) return null;
            const s = clone(input);
            if (s.phase === 'ready') {
                s.phase = 'play';
                s.phaseStartedAt = s.phaseEndsAt;
                s.phaseEndsAt = s.phaseStartedAt + s.runMs;
                s.message = 'Go!';
                return s;
            }
            return finish(s, ctx.now, 'Time ran out');
        },

        deadline(s) { return s.status === 'active' ? s.phaseEndsAt : null; },
        outcome(s) { return s.status === 'finished' && s.result ? { places: s.result.places.map((g) => [...g]), reason: s.result.reason } : null; }
    };
    return engine;
};

module.exports = { makeStageEngine, READY_MS };
