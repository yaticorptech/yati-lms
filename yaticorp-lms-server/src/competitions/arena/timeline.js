/**
 * Where a Quiz Arena contest is at any moment, worked out from the clock alone.
 *
 * The quiz runs from the moment an admin pressed Start (startedAt). Until
 * then it waits, even past its planned startsAt: nothing starts by itself. Each round opens with a short intro, then each of its
 * questions is open for `secondsPerQuestion`, then shows its answer for a few
 * seconds, then the next one opens:
 *
 *   waiting → intro R1 → Q1 open → Q1 answer → Q2 open → … → intro R2 → … → finished
 *
 * Because every moment follows from the start time, every student is on the
 * same question with the same seconds left, a student who reconnects lands
 * exactly where the quiz is, and a question whose time ran out stays closed:
 * no timer lives in a browser or in server memory.
 *
 * Pure functions: no database, no Date.now() of their own.
 */
const { ROUND_NAMES } = require('./models');

const INTRO_MS = 5000;
// No pause between questions: the next one opens the moment one closes.
const REVEAL_MS = 0;

const startOf = (c) => (c.startedAt ? new Date(c.startedAt).getTime() : null);

/** The paper's questions grouped by round, in order: [{ round, from, count }]. */
const roundsOf = (c) => {
    const out = [];
    c.paper.forEach((q, i) => {
        const last = out[out.length - 1];
        if (last && last.round === q.round) last.count += 1;
        else out.push({ round: q.round, from: i, count: 1 });
    });
    return out;
};

/** How long the whole quiz runs, in milliseconds. */
const totalMs = (c) => {
    const q = c.secondsPerQuestion * 1000;
    return roundsOf(c).reduce((t, r) => t + INTRO_MS + r.count * (q + REVEAL_MS), 0);
};

/**
 * The stage at `now`:
 *   { stage: 'waiting', startsAt }
 *   { stage: 'intro', round, roundName, startedAt, endsAt }
 *   { stage: 'question' | 'reveal', round, roundName, index, inRound, roundSize, startedAt, endsAt }
 *       `index` is the question's place in the whole paper; `startedAt` and
 *       `endsAt` bound this stage (the answer shows from the question's end).
 *   { stage: 'finished', endedAt }
 */
const phaseAt = (c, now) => {
    const start = startOf(c);
    if (start == null) return { stage: 'waiting', startsAt: new Date(c.startsAt).getTime() };
    if (now < start) return { stage: 'waiting', startsAt: start };
    const q = c.secondsPerQuestion * 1000;
    let t = start;
    for (const r of roundsOf(c)) {
        const base = { round: r.round, roundName: ROUND_NAMES[r.round] };
        if (now < t + INTRO_MS) return { stage: 'intro', ...base, roundSize: r.count, startedAt: t, endsAt: t + INTRO_MS };
        t += INTRO_MS;
        for (let k = 0; k < r.count; k += 1) {
            const at = { ...base, index: r.from + k, inRound: k + 1, roundSize: r.count };
            if (now < t + q) return { stage: 'question', ...at, startedAt: t, endsAt: t + q };
            t += q;
            if (now < t + REVEAL_MS) return { stage: 'reveal', ...at, startedAt: t, endsAt: t + REVEAL_MS };
            t += REVEAL_MS;
        }
    }
    return { stage: 'finished', endedAt: t };
};

/** How many questions have closed by `now` (their answers may be shown). */
const closedBy = (c, now) => {
    const p = phaseAt(c, now);
    if (p.stage === 'waiting') return 0;
    if (p.stage === 'finished') return c.paper.length;
    if (p.stage === 'question') return p.index;
    if (p.stage === 'reveal') return p.index + 1;
    // A round's intro: every question before this round has closed.
    return roundsOf(c).find((r) => r.round === p.round).from;
};

/**
 * The contest's state for lists and badges: draft, cancelled, registration
 * (open), upcoming (registration closed, not started), live, ended (awaiting
 * results), results.
 */
const stateOf = (c, now) => {
    if (c.status !== 'published') return c.status;
    if (c.resultsPublishedAt) return 'results';
    const p = phaseAt(c, now);
    if (p.stage === 'finished') return 'ended';
    if (p.stage !== 'waiting') return 'live';
    if (c.registrationOpensAt && now < new Date(c.registrationOpensAt).getTime()) return 'upcoming';
    return now < new Date(c.registrationDeadline).getTime() ? 'registration' : 'upcoming';
};

module.exports = { phaseAt, totalMs, roundsOf, closedBy, stateOf, startOf, INTRO_MS, REVEAL_MS };
