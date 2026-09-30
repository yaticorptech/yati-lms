/**
 * The Career Path mascot's mind: what state it is in, which moment it is
 * acting out, what waits behind that one, and what each moment turns into.
 *
 * States:  idle | walking | pointing | reacting | sleeping | reading |
 *          watching | thinking | waiting
 * The last four are CONTEXTS — what the student is doing — and are where the
 * mascot returns after a moment instead of idle, for as long as the context
 * holds. A moment (an EVENT) becomes a SCRIPT of steps (mascotConfig); scripts
 * never overlap and never cut each other short. When a moment arrives while
 * one plays, what the student EARNED waits its turn; small talk is dropped,
 * because it would be stale by the time it played.
 *
 * Plain logic, no DOM: the engine acts the steps out.
 */
import config, { lines, pages, events as EVENTS, queue as Q, streak as STREAK } from '../../mascot/mascotConfig.js';
import { activeDays, currentStreak, dayKey } from '../utils/progress.js';

export const STATES = ['idle', 'walking', 'pointing', 'reacting', 'sleeping', 'reading', 'watching', 'thinking', 'waiting'];
export const CONTEXTS = ['reading', 'watching', 'thinking', 'waiting'];
export { lines as LINES };

const priorityOf = (event) => Q.priority[event.type] ?? 1;
const keyOf = (event) => event.key ?? event.type;

// ---------- the queue ----------

export const initialQueue = { running: null, lastStart: -Infinity, waiting: [] };

/**
 * Decides what happens to `event`: 'start' now, 'queue' for later, or 'drop'.
 * A page's own entrance is never queued behind stale moments: it clears them.
 */
export function admit(state, event, now) {
    const begin = () => ({ state: { ...state, running: event, lastStart: now }, decision: 'start' });
    if (event.type === 'pageEnter') {
        return state.running
            ? { state: { ...state, waiting: [event] }, decision: 'queue' }
            : { state: { ...state, running: event, lastStart: now, waiting: [] }, decision: 'start' };
    }
    if (!state.running && !state.waiting.length && now - state.lastStart >= Q.rateMs) return begin();
    if (priorityOf(event) < Q.waitsFrom || state.waiting.some((e) => keyOf(e) === keyOf(event))) {
        return { state, decision: 'drop' };
    }
    // Most important first; equal ones keep the order they happened in.
    const waiting = [...state.waiting, event].sort((a, b) => priorityOf(b) - priorityOf(a)).slice(0, Q.maxWaiting);
    return { state: { ...state, waiting }, decision: waiting.includes(event) ? 'queue' : 'drop' };
}

export const finish = (state) => ({ ...state, running: null });

/** The next waiting moment if one may start now, else how long until one may. */
export function takeNext(state, now) {
    if (state.running || !state.waiting.length) return { state };
    // The page's entrance does not wait for the breath between moments.
    const urgent = state.waiting[0].type === 'pageEnter';
    const waitMs = urgent ? 0 : state.lastStart + Q.rateMs - now;
    if (waitMs > 0) return { state, waitMs };
    const [event, ...waiting] = state.waiting;
    return { state: { ...state, running: event, lastStart: now, waiting }, event };
}

// ---------- pages ----------

const trim = (pathname) => String(pathname || '').replace(/\/+$/, '') || '/';

/** The page config for a Career Path pathname; the Overview is the bare /career. */
export function pageFor(pathname) {
    const path = trim(pathname);
    if (path === '/career') return pages['/career'];
    const found = Object.keys(pages).find((prefix) => prefix !== '/career' && (path === prefix || path.startsWith(`${prefix}/`)));
    return found ? pages[found] : null;
}

// ---------- scripts ----------

/**
 * Fills the '@' placeholders a script carries — '@el', '@cta', '@text' — from
 * the event, so the config can stay plain data.
 */
const fill = (step, event) => {
    const out = { ...step };
    for (const key of ['to', 'text']) {
        const value = out[key];
        if (typeof value !== 'string' || !value.startsWith('@')) continue;
        const name = value.slice(1);
        if (name === 'locked') out[key] = lines.locked(event.what || 'the step before');
        else if (name === 'classLine') { if (typeof event.next === 'boolean') out[key] = event.next ? lines.classNext : lines.classNow; }
        else out[key] = event[name] ?? null;
    }
    return out;
};

/** The steps for a moment, with the event's own details filled in. */
export function scriptFor(event, { pathname } = {}) {
    let steps;
    switch (event.type) {
        case 'pageEnter':
            steps = pageFor(pathname ?? event.pathname)?.enter || [];
            break;
        case 'quizAnswer':
            steps = event.right ? EVENTS.quizAnswerRight : EVENTS.quizAnswerWrong;
            break;
        case 'custom':
            steps = event.steps || [];
            break;
        default:
            steps = EVENTS[event.type] || [];
    }
    return steps.map((step) => fill(step, event));
}

// ---------- state ----------

export function createBrain({ now = () => Date.now() } = {}) {
    const st = {
        state: 'idle',
        context: null,
        queue: initialQueue,
        pathname: null,
        facts: { pendingTasks: false },
        stepsInARow: 0,
        hinted: new Set()
    };

    const restState = () => st.context || 'idle';

    return {
        get state() {
            return st.state;
        },
        get context() {
            return st.context;
        },
        get facts() {
            return st.facts;
        },
        setState(name) {
            st.state = STATES.includes(name) ? name : 'idle';
        },
        /** Where it returns after a moment: the context, else idle. */
        rest() {
            st.state = restState();
            return st.state;
        },
        setContext(name) {
            st.context = CONTEXTS.includes(name) ? name : null;
            if (!['walking', 'pointing', 'reacting', 'sleeping'].includes(st.state)) st.state = restState();
        },
        setFact(name, value) {
            st.facts[name] = value;
        },
        /** A new page: the queue is cleared, the context and the hints with it. */
        routeChanged(pathname) {
            st.pathname = pathname;
            st.context = null;
            st.hinted = new Set();
            st.stepsInARow = 0;
            st.queue = { ...st.queue, waiting: [] };
            if (st.state !== 'sleeping') st.state = 'idle';
        },
        page: () => pageFor(st.pathname),
        /** Admits an event; returns 'start' | 'queue' | 'drop'. */
        admit(event) {
            const { state, decision } = admit(st.queue, event, now());
            st.queue = state;
            return decision;
        },
        /** The next moment to play, if one may start; otherwise how long to wait. */
        next() {
            const { state, event, waitMs } = takeNext(st.queue, now());
            st.queue = state;
            return { event, waitMs };
        },
        finish() {
            st.queue = finish(st.queue);
        },
        running: () => st.queue.running,
        script: (event) => scriptFor(event, { pathname: st.pathname }),
        /**
         * A finished step counts toward the streak; the third in a row is the
         * streak event instead. A wrong quiz answer resets the run.
         */
        stepDone() {
            st.stepsInARow += 1;
            if (st.stepsInARow >= STREAK.steps) {
                st.stepsInARow = 0;
                return 'streak';
            }
            return 'stepCompleted';
        },
        breakStreak() {
            st.stepsInARow = 0;
        },
        hinted: (el) => st.hinted.has(el),
        /** Marks the idle nudge for this element as given. */
        hintOnce(el) {
            if (!el || st.hinted.has(el)) return false;
            st.hinted.add(el);
            return true;
        }
    };
}

// ---------- achievements ----------

/**
 * What the student holds right now, each with a key that stays the same for
 * as long as it is the same achievement: a 3-day streak is keyed on the day
 * the run began, so one that breaks and builds back up is celebrated again;
 * the path marks are keyed on the roadmap, so a new roadmap starts afresh.
 */
export function achievementsFrom({ history = [], roadmap = null, badges = [] } = {}) {
    const out = [];

    const streak = currentStreak(history);
    if (streak >= 3) {
        // Mirrors currentStreak, which counts back from today: the run ends
        // today if there was work today, otherwise yesterday.
        const today = new Date();
        const end = new Date(today);
        if (!activeDays(history).has(dayKey(today))) end.setDate(end.getDate() - 1);
        const start = new Date(end);
        start.setDate(start.getDate() - (streak - 1));
        const key = `streak3:${dayKey(start)}`;
        out.push({ key, event: { type: 'achievement', key, text: lines.dayStreak(streak) } });
    }

    const phases = roadmap?.roadmapData?.educationRoadmap?.length || 0;
    const done = roadmap?.completedPhases?.length || 0;
    const road = roadmap?._id || `phases-${phases}`;
    // The whole path finished is the roadmap page's own moment (it knows the
    // instant); only the halfway mark is found here.
    if (phases && done < phases && done * 2 >= phases) {
        const key = `path50:${road}`;
        out.push({ key, event: { type: 'achievement', key, text: lines.halfway } });
    }

    for (const badge of badges) {
        if (!badge?.unlocked || !badge._id) continue;
        const key = `badge:${badge._id}`;
        out.push({ key, event: { type: 'badgeEarned', key, title: badge.title } });
    }
    return out;
}

export { config };
