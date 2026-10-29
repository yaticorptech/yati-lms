/**
 * The brain games — Rapid Fire, Code Clash and Brain Sprint — share one
 * engine, made here. Each follows ./contract.js; this file holds the rules
 * they have in common and rapidfire.js, codeclash.js and brainsprint.js each
 * pass their own questions and timing.
 *
 * Everyone plays the same questions at the same time. A game is a list of
 * questions, each in three phases:
 *
 *   ready     a few seconds' countdown before the first question
 *   question  the question is open; players answer
 *   reveal    the right answer, who got it and the points, for a moment
 *
 * then the next question, until the last one's reveal ends the game.
 * ('hidden' games have no reveal: the next question follows at once.)
 *
 * Two ways to answer, `mode`:
 *   'simultaneous'  each seat answers once. Right +100, wrong −20. Nobody's
 *                   pick, result or points show while the question is open
 *                   (asked 2026-10-29); the question closes when every seat
 *                   still playing has answered, or its time runs out, and the
 *                   reveal shows everyone's answers and points together.
 *   'buzzer'        the first right answer takes the point (+10) and closes
 *                   the question; a wrong answer costs 5 and locks that seat
 *                   out of the question.
 *   'hidden'        Rapid Fire: each seat answers once, right +10, wrong −5,
 *                   and nobody is told what was right — no answer, no
 *                   points, no scores — until the game is over, when the
 *                   recap shows every question with its answer.
 *
 * Places go by points; equal points go to whoever was faster in total on the
 * questions they got right; equal on both is a tie (the match is replayed). A
 * seat that resigns places below everyone still playing, and once only one
 * side is left the game ends.
 *
 * The answer to an open question never leaves the server: view() shows it
 * only in the reveal and once the game is over (in a 'hidden' game, only
 * once it is over).
 */
const { GameError, clone } = require('./contract');

// One colour a seat (up to twenty in a Group Brain room).
const PALETTE = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9', '#a855f7', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#3b82f6', '#e11d48', '#22c55e', '#eab308', '#8b5cf6', '#06b6d4', '#d946ef', '#65a30d', '#0f766e', '#b45309'];
const READY_MS = 4000;
const LEVELS = ['easy', 'medium', 'hard'];
const LEVEL_TIME = { easy: 1.5, medium: 1, hard: 0.7 };

/** A whole number from `value`, kept inside [min, max]; `fallback` when it is not a number. */
const clampNumber = (value, fallback, min, max) => {
    const n = Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return fallback;
    return Math.round(Math.min(max, Math.max(min, n)));
};

/** A shuffled copy of `list`, every random number from `rng`. */
const shuffle = (list, rng) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/** `count` questions from `bank`, none twice. */
const sample = (bank, count, rng) => shuffle(bank, rng).slice(0, count);

/**
 * One question as the game stores it: its options in a random order (unless
 * the question keeps its own, for "None of these" and the like), and the
 * answer's new place among them.
 */
const prepare = (q, rng) => {
    const order = q.fixedOrder ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i), rng);
    return {
        topic: q.topic || '',
        prompt: q.prompt,
        code: q.code || null,
        lang: q.lang || null,
        options: order.map((i) => String(q.options[i])),
        answer: order.indexOf(q.answer),
        explain: q.explain || '',
        // A picture with the question (a clock, dots, a grid…), and something to memorise before it, shown for
        // showMs and then taken away (2026-10-29, the solo memory games): both optional.
        ...(q.visual ? { visual: q.visual } : {}),
        ...(q.show ? { show: q.show, showMs: q.showMs || 2500 } : {})
    };
};

const playing = (state) => state.seats.map((_, i) => i).filter((i) => !state.out.includes(i));
const sidesPlaying = (state) => [...new Set(playing(state).map((i) => state.seats[i].side))];

/**
 * The finishing order of the sides: those still playing by points, then by
 * time on right answers; then the ones who resigned, the last to go highest.
 */
const placesOf = (state) => {
    const sides = [...new Set(state.seats.map((s) => s.side))];
    const total = (side, key) => state.seats.reduce((n, s, i) => n + (s.side === side ? state[key][i] : 0), 0);
    const ranked = sidesPlaying(state)
        .map((side) => ({ side, points: total(side, 'scores'), ms: total(side, 'fastMs') }))
        .sort((a, b) => b.points - a.points || a.ms - b.ms);
    const places = [];
    for (const r of ranked) {
        const last = places[places.length - 1];
        if (last && last.points === r.points && last.ms === r.ms) last.sides.push(r.side);
        else places.push({ points: r.points, ms: r.ms, sides: [r.side] });
    }
    const groups = places.map((p) => p.sides);
    const gone = [...state.out].reverse().map((i) => state.seats[i].side);
    for (const side of [...new Set(gone)]) if (sides.includes(side) && !groups.flat().includes(side)) groups.push([side]);
    return groups;
};

/**
 * Make an engine. `config`:
 *   id, label, emoji, summary
 *   mode            'simultaneous' | 'buzzer' | 'hidden'
 *   maxSeats        optional: most players (4 if not given; Group Brain games 6)
 *   questions       { min, max, fallback }   how many a game has
 *   seconds         { min, max, fallback }   time on each question
 *   revealMs        how long the answer shows
 *   pick(count, rng, level) -> raw questions { topic, prompt, code?, lang?, options, answer, explain?, fixedOrder? }
 *                   `level` is the game's difficulty: 'easy' | 'medium' | 'hard'
 *
 * options.difficulty (a Group Brain room's): 'easy' gives half as long again
 * on each question, 'hard' 30% less, unless questionSeconds is set.
 * options.extraQuestions (a Group Brain room's): an admin's own questions,
 * mixed in for up to a third of the game; any not well formed is left out.
 */
const makeEngine = (config) => {
    const buzzer = config.mode === 'buzzer';
    const hidden = config.mode === 'hidden';
    const simultaneous = !buzzer && !hidden;

    const finish = (state, now) => {
        state.status = 'finished';
        state.phase = 'over';
        state.phaseEndsAt = null;
        state.finishedAt = now;
        const places = placesOf(state);
        const reason = state.out.length && sidesPlaying(state).length <= 1
            ? 'The other side resigned'
            : places[0]?.length > 1 ? 'Level on points and time — a draw' : `Most points after ${state.questions.length} questions`;
        state.result = { places, reason };
        const first = places[0];
        state.message = first?.length === 1
            ? `${state.seats.filter((s) => s.side === first[0]).map((s) => s.name).join(' & ')} wins.`
            : 'A draw.';
        return state;
    };

    /** Open question `index`. */
    const open = (state, index, now) => {
        state.index = index;
        const q = state.questions[index];
        // Something to memorise first: shown, then the question.
        state.phase = q.show ? 'show' : 'question';
        state.phaseStartedAt = now;
        state.phaseEndsAt = now + (q.show ? q.showMs : state.questionMs);
        state.answers[index] = state.seats.map(() => []);
        state.winner = null;
        state.message = `Question ${index + 1} of ${state.questions.length}.`;
        return state;
    };

    /** Close the open question: show the answer. */
    const reveal = (state, now) => {
        const q = state.questions[state.index];
        state.phase = 'reveal';
        state.phaseStartedAt = now;
        state.phaseEndsAt = now + state.revealMs;
        const right = q.options[q.answer];
        if (buzzer) {
            state.message = state.winner !== null
                ? `${state.seats[state.winner].name} got it: ${right}.`
                : `Nobody got it. The answer: ${right}.`;
        } else {
            const got = state.answers[state.index].filter((tries) => tries.some((t) => t.correct)).length;
            state.message = `The answer: ${right}. ${got === 0 ? 'Nobody' : got === 1 ? 'One player' : `${got} players`} got it.`;
        }
        return state;
    };

    /** After a reveal: the next question, or the end. */
    const next = (state, now) => (state.index + 1 < state.questions.length ? open(state, state.index + 1, now) : finish(state, now));

    /** Close the open question: in a 'hidden' game straight on to the next, otherwise the reveal. */
    const close = (state, now) => (hidden ? next(state, now) : reveal(state, now));

    /** Whether nobody else can still answer the open question. */
    const settled = (state) => {
        const tries = state.answers[state.index];
        if (buzzer) return state.winner !== null || playing(state).every((i) => tries[i].length > 0);
        return playing(state).every((i) => tries[i].length > 0);
    };

    const answer = (state, seat, action, now) => {
        if (state.phase !== 'question') throw new GameError(state.phase === 'ready' ? 'The first question has not opened yet.' : 'Wait for the next question.');
        if (now >= state.phaseEndsAt) throw new GameError('Time is up for this question.');
        const q = state.questions[state.index];
        const choice = Number(action.choice);
        if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw new GameError('Choose one of the answers.');
        const tries = state.answers[state.index][seat];
        if (tries.length) throw new GameError(buzzer && !tries[0].correct ? 'You are locked out of this question.' : 'You have already answered.');

        const ms = Math.max(0, now - state.phaseStartedAt);
        const correct = choice === q.answer;
        let points;
        if (buzzer || hidden) points = correct ? 10 : -5;
        else points = correct ? 100 : -20;
        tries.push({ choice, ms, correct, points });
        state.scores[seat] += points;
        if (correct) {
            state.correct[seat] += 1;
            state.fastMs[seat] += ms;
            if (buzzer) state.winner = seat;
        }
        state.message = buzzer
            ? (correct ? `${state.seats[seat].name} buzzed in first with the right answer.` : `${state.seats[seat].name} buzzed in wrong.`)
            : `${state.seats[seat].name} has answered.`;
        return settled(state) ? close(state, now) : state;
    };

    const engine = {
        id: config.id,
        label: config.label,
        emoji: config.emoji,
        summary: config.summary,
        minSeats: 2,
        // Four in a competition match; a Group Brain game takes up to twenty (config.maxSeats).
        maxSeats: config.maxSeats || 4,
        seatsPerSide: { min: 1, max: 1 },

        create(seats, options, ctx) {
            if (!Array.isArray(seats) || seats.length < 2 || seats.length > engine.maxSeats) throw new GameError(`${config.label} needs 2 to ${engine.maxSeats} players.`);
            const o = options || {};
            const level = LEVELS.includes(o.difficulty) ? o.difficulty : 'medium';
            const count = clampNumber(o.questionCount, config.questions.fallback, config.questions.min, config.questions.max);
            const seconds = clampNumber(o.questionSeconds, Math.round(config.seconds.fallback * LEVEL_TIME[level]), config.seconds.min, config.seconds.max);
            let raw = config.pick(count, ctx.rng, level);
            const extra = (Array.isArray(o.extraQuestions) ? o.extraQuestions : [])
                .filter((q) => q && typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length === 4 && new Set(q.options.map(String)).size === 4 && [0, 1, 2, 3].includes(q.answer));
            if (extra.length) {
                const n = Math.min(Math.floor(count / 3), extra.length);
                raw = shuffle([...raw.slice(0, raw.length - n), ...sample(extra, n, ctx.rng)], ctx.rng);
            }
            const questions = raw.map((q) => prepare(q, ctx.rng));
            return {
                game: config.id,
                mode: config.mode,
                difficulty: level,
                status: 'active',
                seats: seats.map((s) => ({ name: s.name || 'Player', side: s.side })),
                questions,
                questionMs: seconds * 1000,
                revealMs: config.revealMs,
                index: -1,
                phase: 'ready',
                phaseStartedAt: ctx.now,
                phaseEndsAt: ctx.now + READY_MS,
                answers: [],
                winner: null,
                scores: seats.map(() => 0),
                correct: seats.map(() => 0),
                fastMs: seats.map(() => 0),
                out: [],
                result: null,
                message: 'Get ready — the first question opens in a moment.',
                startedAt: ctx.now,
                finishedAt: null
            };
        },

        view(state, seat, ctx) {
            const you = Number.isInteger(seat) && seat >= 0 && seat < state.seats.length ? seat : null;
            const active = state.status === 'active';
            const q = state.index >= 0 ? state.questions[state.index] : null;
            const showAnswer = hidden ? !active : state.phase === 'reveal' || !active;
            // A 'hidden' game keeps the scores to itself until it is over.
            const secret = hidden && active;
            const tries = q ? state.answers[state.index] || [] : [];
            // While a question is open a player sees their own answer, and of
            // the others only whether they have answered (in Rapid Fire, also
            // who buzzed in wrong: everyone hears a buzzer).
            const seatAnswer = (i) => {
                const t = tries[i] || [];
                if (!t.length) return null;
                const last = t[t.length - 1];
                if (showAnswer || (buzzer && i === you)) return { choice: last.choice, correct: last.correct, points: last.points, ms: last.ms };
                // Your own choice, but whether it was right waits for the reveal.
                if (i === you) return { choice: last.choice };
                if (buzzer && !last.correct) return { locked: true };
                return { answered: true };
            };
            const mine = you !== null ? tries[you] || [] : [];
            const pending = simultaneous && active && state.phase === 'question';
            return {
                game: state.game,
                status: state.status,
                you,
                turn: null,
                deadline: active ? state.phaseEndsAt : null,
                seats: state.seats.map((s, i) => ({ name: s.name, side: s.side, label: `Player ${i + 1}`, color: PALETTE[i % PALETTE.length] })),
                message: state.message,
                outcome: engine.outcome(state),

                mode: state.mode,
                difficulty: state.difficulty || null,
                phase: state.phase,
                serverNow: ctx?.now ?? null,
                phaseStartedAt: state.phaseStartedAt,
                phaseEndsAt: state.phaseEndsAt,
                questionMs: state.questionMs,
                number: state.index + 1,
                total: state.questions.length,
                question: q && state.phase !== 'over' && state.phase !== 'show' ? { topic: q.topic, prompt: q.prompt, code: q.code, lang: q.lang, options: [...q.options], visual: q.visual || null } : null,
                // What to memorise: only while it is shown.
                show: q && state.phase === 'show' ? { topic: q.topic, content: q.show, showMs: q.showMs } : null,
                answer: q && showAnswer && state.phase !== 'over' ? { index: q.answer, explain: q.explain } : null,
                answers: state.seats.map((_, i) => seatAnswer(i)),
                // All at once: the open question's points wait for the reveal.
                scores: secret ? null : state.scores.map((n, i) => n - (pending ? tries[i]?.reduce((t, x) => t + x.points, 0) || 0 : 0)),
                correct: secret ? null : state.correct.map((n, i) => n - (pending && tries[i]?.some((x) => x.correct) ? 1 : 0)),
                // The questions answered wrong (the scoreboard's ✗); the open one waits for the reveal.
                wrong: secret ? null : state.seats.map((_, i) => state.answers.reduce((t, qa, n) => {
                    if (n > state.index || (pending && n === state.index)) return t;
                    const last = qa?.[i]?.[qa[i].length - 1];
                    return t + (last && !last.correct ? 1 : 0);
                }, 0)),
                out: [...state.out],
                canAnswer: active && you !== null && state.phase === 'question' && !state.out.includes(you) && mine.length === 0,
                // The whole game, question by question, once it is over.
                recap: active ? null : state.questions.map((item, n) => ({
                    topic: item.topic,
                    prompt: item.prompt,
                    code: item.code,
                    lang: item.lang,
                    options: [...item.options],
                    answer: item.answer,
                    explain: item.explain,
                    answers: state.seats.map((_, i) => {
                        const t = state.answers[n]?.[i] || [];
                        const last = t[t.length - 1];
                        return last ? { choice: last.choice, correct: last.correct, points: last.points } : null;
                    })
                }))
            };
        },

        act(input, seat, action, ctx) {
            const state = clone(input);
            if (!Number.isInteger(seat) || seat < 0 || seat >= state.seats.length) throw new GameError('You are not playing in this game.');
            if (state.status !== 'active') throw new GameError('The game is over.');
            if (state.out.includes(seat)) throw new GameError('You have left this game.');
            const type = action && action.type;
            if (type === 'answer') return answer(state, seat, action, ctx.now);
            if (type === 'resign') {
                state.out.push(seat);
                state.message = `${state.seats[seat].name} resigned.`;
                if (sidesPlaying(state).length <= 1) return finish(state, ctx.now);
                // Nobody left to wait for on the open question: show its answer.
                if (state.phase === 'question' && settled(state)) return close(state, ctx.now);
                return state;
            }
            throw new GameError(`That is not something you can do in ${config.label}.`);
        },

        tick(input, ctx) {
            if (input.status !== 'active' || input.phaseEndsAt > ctx.now) return null;
            const state = clone(input);
            if (state.phase === 'ready') return open(state, 0, ctx.now);
            if (state.phase === 'show') {
                state.phase = 'question';
                state.phaseStartedAt = ctx.now;
                state.phaseEndsAt = ctx.now + state.questionMs;
                return state;
            }
            if (state.phase === 'question') return close(state, ctx.now);
            return next(state, ctx.now);
        },

        deadline(state) {
            return state.status === 'active' ? state.phaseEndsAt : null;
        },

        outcome(state) {
            if (state.status !== 'finished' || !state.result) return null;
            return { places: state.result.places.map((g) => [...g]), reason: state.result.reason };
        }
    };
    return engine;
};

module.exports = { makeEngine, shuffle, sample, prepare, clampNumber, READY_MS, LEVELS, PALETTE };
