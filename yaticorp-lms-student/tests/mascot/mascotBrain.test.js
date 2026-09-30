/**
 * The Career Path mascot's mind, with no browser: its states and contexts,
 * one moment at a time with a breath between them, what each moment and each
 * page turn into, and that every gesture it asks for is a still that exists.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { admit, finish, takeNext, initialQueue, scriptFor, pageFor, createBrain, achievementsFrom, STATES, CONTEXTS, LINES } =
    await import('../../src/career/mascot/mascotBrain.js');
const { default: config, queue: Q, pages, events, expressions } = await import('../../src/mascot/mascotConfig.js');
const { STILLS } = await import('../../src/mascot/stills.js');

// ---------- the queue ----------

test('the first moment starts at once', () => {
    const { decision } = admit(initialQueue, { type: 'stepCompleted' }, 1000);
    assert.equal(decision, 'start');
});

test('while one plays, an earned moment waits and small talk is dropped', () => {
    let { state } = admit(initialQueue, { type: 'stepCompleted' }, 1000);
    const earned = admit(state, { type: 'phaseCompleted' }, 1100);
    assert.equal(earned.decision, 'queue');
    state = earned.state;
    assert.equal(admit(state, { type: 'quizAnswer', right: true }, 1200).decision, 'drop');
    assert.equal(admit(state, { type: 'wander' }, 1200).decision, 'drop');
});

test('the next one starts no sooner than the breath after the last began', () => {
    let { state } = admit(initialQueue, { type: 'stepCompleted' }, 1000);
    state = admit(state, { type: 'phaseCompleted' }, 1100).state;
    state = finish(state);
    const early = takeNext(state, 2000);
    assert.equal(early.event, undefined);
    assert.equal(early.waitMs, Q.rateMs - 1000);
    const later = takeNext(state, 1000 + Q.rateMs);
    assert.equal(later.event.type, 'phaseCompleted');
});

test('a new page cuts in front of everything, and does not wait for the breath', () => {
    let { state } = admit(initialQueue, { type: 'stepCompleted' }, 1000);
    state = admit(state, { type: 'phaseCompleted' }, 1100).state;
    const enter = admit(state, { type: 'pageEnter', pathname: '/career/skills' }, 1200);
    assert.equal(enter.decision, 'queue');
    assert.deepEqual(enter.state.waiting.map((e) => e.type), ['pageEnter'], 'the stale moment is gone');
    const next = takeNext(finish(enter.state), 1300);
    assert.equal(next.event.type, 'pageEnter');
});

test('the queue keeps the most important, and no moment twice', () => {
    let { state } = admit(initialQueue, { type: 'stepCompleted' }, 1000);
    for (const type of ['quizPassed', 'badgeEarned', 'quizPassed', 'lockedClicked', 'phaseCompleted', 'streak']) {
        state = admit(state, { type }, 1100).state;
    }
    assert.equal(state.waiting.length, Q.maxWaiting);
    assert.deepEqual(state.waiting.map((e) => e.type), ['badgeEarned', 'phaseCompleted', 'streak']);
});

// ---------- pages and scripts ----------

test('each Career Path page has its own entrance; the Overview is the bare /career', () => {
    assert.equal(pageFor('/career'), pages['/career']);
    assert.equal(pageFor('/career/'), pages['/career']);
    assert.equal(pageFor('/career/planner'), pages['/career/planner']);
    assert.equal(pageFor('/career/recommendations/anything'), pages['/career/recommendations']);
    assert.equal(pageFor('/learn/c1'), null);
    const overview = scriptFor({ type: 'pageEnter' }, { pathname: '/career' });
    assert.deepEqual(overview.map((s) => s.do), ['enter', 'walk', 'point']);
    assert.equal(overview[0].wave, true);
    assert.deepEqual(overview[1].to, ['start-quest', 'next-step']);
    assert.deepEqual(scriptFor({ type: 'pageEnter' }, { pathname: '/career/roadmap' })[0].to, 'current-roadmap-position');
    assert.equal(scriptFor({ type: 'pageEnter' }, { pathname: '/career/profile' })[0].do, 'if');
    assert.ok(pages['/career/recommendations'].ponder && pages['/career'].wander);
});

test('a finished step is a clap, sparkle and a celebration, then a glide to the next task to point; three in a row is confetti', () => {
    const step = scriptFor({ type: 'stepCompleted' });
    assert.deepEqual(step.map((s) => s.do), ['gesture', 'confetti', 'gesture', 'glide', 'point']);
    assert.equal(step[0].name, 'clap');
    assert.equal(step[2].name, 'celebrate');
    assert.deepEqual(step[3].to, ['start-task', 'next-step']);
    assert.equal(scriptFor({ type: 'streak' })[0].name, 'confetti-cheer');
});

test('a section scrolled into view is a dimmed glide over and a pointing; Start pressed a thumbs up and a bounce; Play a celebration', () => {
    const el = {};
    const section = scriptFor({ type: 'sectionActive', el });
    assert.deepEqual(section.map((s) => s.do), ['glide', 'point']);
    assert.equal(section[0].to, el);
    const start = scriptFor({ type: 'startClicked' });
    assert.equal(start[0].name, 'thumbs-up');
    assert.equal(start[1].do, 'bounce');
    assert.deepEqual(scriptFor({ type: 'playClicked' }).map((s) => s.name || s.do), ['confetti', 'celebrate']);
    assert.deepEqual(pages['/career'].sections, ['start-quest', 'view-roadmap', 'next-step']);
    assert.deepEqual(pages['/career/games'].sections, ['play']);
});

test('a failed quiz is sad for 1.2s, then encouraged and pointing at the retry', () => {
    const failed = scriptFor({ type: 'quizFailed' });
    assert.deepEqual(failed.map((s) => s.do), ['context', 'still', 'expression', 'walk', 'point']);
    assert.equal(failed[1].name, 'sad');
    assert.equal(failed[1].ms, 1200);
    assert.equal(failed[2].name, 'encouraged');
    assert.equal(failed[3].to, 'retry');
    assert.equal(failed[4].text, LINES.tryAgain);
    assert.deepEqual(scriptFor({ type: 'quizPassed' }).map((s) => s.name || s.do), ['context', 'confetti', 'celebrate']);
});

test('an answer as it is given is a nod or a curious beat, never a still', () => {
    assert.deepEqual(scriptFor({ type: 'quizAnswer', right: true }).map((s) => s.do), ['nod']);
    const wrong = scriptFor({ type: 'quizAnswer', right: false });
    assert.equal(wrong[0].do, 'expression');
    assert.equal(wrong[0].name, 'curious');
});

test('a locked step: curious, a head shake, then over to what unlocks it', () => {
    const el = {};
    const locked = scriptFor({ type: 'lockedClicked', el, what: 'Class 11', prerequisite: 'current-roadmap-position' });
    assert.deepEqual(locked.map((s) => s.do), ['expression', 'shake', 'walk', 'point']);
    assert.equal(locked[2].to, 'current-roadmap-position');
    assert.equal(locked[3].text, 'Finish Class 11 to unlock this');
});

test('the path completed: a run to the centre, confetti, a wave; a badge: confetti and the star', () => {
    assert.deepEqual(scriptFor({ type: 'pathCompleted' }).map((s) => s.do), ['centre', 'still', 'say', 'gesture']);
    const badge = scriptFor({ type: 'badgeEarned', title: 'Early bird' });
    assert.deepEqual(badge.map((s) => s.do), ['confetti', 'still', 'expression']);
    assert.equal(badge[1].name, 'star-celebrate');
    assert.equal(badge[2].ms, 3000);
});

test('contexts: reading, watching and thinking walk to the section; the context itself is what is on screen; a paused video waits', () => {
    const el = {};
    assert.deepEqual(scriptFor({ type: 'readingStarted', el }).map((s) => s.do), ['walk']);
    assert.equal(scriptFor({ type: 'readingStarted', el })[0].to, el);
    assert.equal(scriptFor({ type: 'quizStarted', el })[1].name, 'thinking');
    assert.ok(!scriptFor({ type: 'videoStarted', el }).some((s) => s.do === 'context'), 'never re-applied late');
    assert.equal(scriptFor({ type: 'videoPaused' })[0].name, 'waiting');
});

test('every gesture is a still from the kit, every face is a transform-only expression, and every step is known', () => {
    const KNOWN = new Set(['enter', 'walk', 'glide', 'point', 'gesture', 'still', 'expression', 'say', 'shake', 'nod', 'bounce', 'confetti', 'context', 'home', 'centre', 'wander', 'lookAround', 'wait', 'sleep', 'wake', 'if']);
    const GESTURES = new Set(['wave', 'celebrate', 'clap']);
    const check = (steps, where) => {
        for (const step of steps) {
            assert.ok(KNOWN.has(step.do), `${where}: unknown step "${step.do}"`);
            if (step.do === 'still') assert.ok(STILLS.includes(step.name), `${where}: "${step.name}" is not a still`);
            if (step.do === 'gesture') assert.ok(GESTURES.has(step.name), `${where}: "${step.name}" is not a gesture`);
            if (step.do === 'expression') assert.ok(step.name in expressions, `${where}: "${step.name}" is not an expression`);
            if (step.do === 'if') check([...(step.then || []), ...(step.else || [])], where);
        }
    };
    for (const [path, page] of Object.entries(pages)) check(page.enter, path);
    for (const [name, steps] of Object.entries(events)) check(steps, name);
    assert.ok(STILLS.includes('point-right') && STILLS.includes('wave-hi'));
});

test('no line the bubble can show has an emoji in it', () => {
    const lines = Object.values(LINES).map((line) => (typeof line === 'function' ? line('Class 11') : line));
    for (const line of lines) assert.doesNotMatch(line, /\p{Extended_Pictographic}/u, line);
});

// ---------- state ----------

test('the brain has the states and contexts, rests in its context, and forgets it on a new page', () => {
    assert.deepEqual(STATES, ['idle', 'walking', 'pointing', 'reacting', 'sleeping', 'reading', 'watching', 'thinking', 'waiting']);
    assert.deepEqual(CONTEXTS, ['reading', 'watching', 'thinking', 'waiting']);
    const brain = createBrain({ now: () => 1000 });
    assert.equal(brain.state, 'idle');
    brain.setState('walking');
    assert.equal(brain.state, 'walking');
    brain.setContext('reading');
    assert.equal(brain.state, 'walking', 'a context does not interrupt a walk');
    brain.rest();
    assert.equal(brain.state, 'reading');
    brain.setState('reacting');
    brain.rest();
    assert.equal(brain.state, 'reading', 'it returns to what the student is doing');
    brain.routeChanged('/career/skills');
    assert.equal(brain.context, null);
    assert.equal(brain.state, 'idle');
    assert.equal(brain.page(), pages['/career/skills']);
    brain.setState('nonsense');
    assert.equal(brain.state, 'idle');
});

test('three finished steps in a row are a streak; a wrong answer breaks the run; a nudge is given once per element', () => {
    const brain = createBrain({ now: () => 1000 });
    assert.equal(brain.stepDone(), 'stepCompleted');
    assert.equal(brain.stepDone(), 'stepCompleted');
    assert.equal(brain.stepDone(), 'streak');
    brain.stepDone();
    brain.breakStreak();
    assert.equal(brain.stepDone(), 'stepCompleted');
    const el = {};
    assert.equal(brain.hintOnce(el), true);
    assert.equal(brain.hintOnce(el), false);
    assert.equal(brain.hintOnce(null), false);
});

test('the brain admits, plays and finishes moments in order', () => {
    let t = 1000;
    const brain = createBrain({ now: () => t });
    assert.equal(brain.admit({ type: 'stepCompleted' }), 'start');
    assert.equal(brain.admit({ type: 'phaseCompleted' }), 'queue');
    assert.equal(brain.running().type, 'stepCompleted');
    brain.finish();
    assert.equal(brain.next().event, undefined, 'still inside the breath');
    t += config.queue.rateMs;
    assert.equal(brain.next().event.type, 'phaseCompleted');
});

// ---------- achievements ----------

test('achievements: a 3-day streak keyed on its first day, the path at half, badges once earned; the end is the page\'s own', () => {
    const daysAgo = (n) => {
        const d = new Date();
        d.setHours(10, 0, 0, 0);
        d.setDate(d.getDate() - n);
        return d;
    };
    const done = (n) => ({ status: 'Completed', completedAt: daysAgo(n).toISOString() });
    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const three = achievementsFrom({ history: [done(2), done(1), done(0)] });
    assert.deepEqual(three.map((a) => a.key), [`streak3:${key(daysAgo(2))}`]);
    assert.match(three[0].event.text, /^3 days in a row/);
    assert.deepEqual(achievementsFrom({ history: [done(1), done(0)] }), [], 'two days is not three');

    const road = (n) => ({ _id: 'r1', roadmapData: { educationRoadmap: [1, 2, 3, 4] }, completedPhases: Array.from({ length: n }, (_, i) => i) });
    assert.deepEqual(achievementsFrom({ roadmap: road(1) }).map((a) => a.key), []);
    assert.deepEqual(achievementsFrom({ roadmap: road(2) }).map((a) => a.key), ['path50:r1']);
    assert.deepEqual(achievementsFrom({ roadmap: road(4) }).map((a) => a.key), [], 'the roadmap page celebrates the end itself');

    const badges = [{ _id: 'b1', title: 'Early bird', unlocked: true }, { _id: 'b2', title: 'Night owl', unlocked: false }];
    const earned = achievementsFrom({ badges });
    assert.deepEqual(earned.map((a) => a.event.type), ['badgeEarned']);
    assert.equal(earned[0].event.title, 'Early bird');
});
