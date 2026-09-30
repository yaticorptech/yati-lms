/**
 * Every tuning value for the Career Path mascot, in one place: how it breathes,
 * blinks, looks, walks and points; how a still comes and goes; how long it
 * waits before nudging or nodding off; and what each page and each event
 * makes it do. Nothing in here touches the DOM, so it is safe to read from
 * tests and from the /dev/mascot workbench alike.
 *
 * A "script" is a list of steps the engine acts out in order:
 *   { do: 'enter', wave }              walk in from the edge and wave (first view this session)
 *   { do: 'walk', to }                 bring `to` into view and walk to a spot beside it —
 *                                      a target name, a list of names tried in order, an
 *                                      element, or '@el' / '@cta' / '@prerequisite' for
 *                                      something the event carried. `scroll: false` never
 *                                      scrolls the page (and skips a target off screen);
 *                                      `ifContext` skips unless that context still holds
 *   { do: 'glide', to }                like walk, but dimmed and without the leg cycle
 *   { do: 'point', text, hold }        point at what it walked to — the rig's own arm — and say `text`
 *   { do: 'gesture', name }            wave | celebrate | clap, on the rig's own parts
 *   { do: 'still', name, ms, pop }     one of the kit's stills for `ms`
 *   { do: 'expression', name, ms }     a transform-only expression, reverting after `ms`
 *   { do: 'say', text }                the speech bubble
 *   { do: 'shake' | 'nod' | 'bounce' | 'confetti' }
 *   { do: 'context', name }            reading | watching | thinking | waiting | null
 *   { do: 'home' } { do: 'centre' } { do: 'wait', ms } { do: 'sleep' } { do: 'wake' }
 *   { do: 'if', fact, then, else }     branch on a fact the engine knows (see FACTS below)
 */

// ---------- sizes and breakpoints ----------
export const layout = {
    // The kit's canvas; every still is stood on the same ground line as the rig.
    canvas: { w: 1117, h: 1408 },
    // The rig's soles end about 4% above its canvas edge; stills are cut to their soles.
    ground: 0.04,
    // Width by screen: the app's own desktop layout, tablets, and phones.
    size: { desktop: 140, tablet: 120, phone: 96 },
    desktopQuery: '(min-width: 64rem) and (min-height: 30rem)',
    tabletQuery: '(min-width: 40rem)',
    // Space kept between the mascot and what it points at, and from the screen edge.
    gap: 16,
    margin: 8,
    // Below this width it stays docked in a corner and glides rather than walks.
    dockBelow: 640,
    // Docked, at rest, this much of its height shows above the phone's bottom
    // nav (the rest is behind it): head and shoulders, not a body over the page.
    dockPeek: 0.62,
    // Docked, a target is scrolled up to sit this far above its head before it points.
    dockGap: 12
};

// ---------- the alive-idle layer ----------
export const breathing = { periodMs: [3000, 4000], torsoScale: 0.018, headY: 5, armDeg: 1.5 };
// The slow layers under the breathing: a sway of the whole body, a tilt of the head, the arms drifting.
export const sway = { periodMs: 6300, deg: 1.2, x: 3, headPeriodMs: 7100, headDeg: 2.5, armPeriodMs: 5200, armDeg: 2.5 };
export const blink = { minMs: 3000, maxMs: 6000, durationMs: 140, doubleChance: 0.25, closed: 0.06 };
export const look = { eyesX: 14, eyesY: 10, headDeg: 4, headX: 3, lagMs: 120, cursorRange: 420, settleMs: 220, cursorMs: 2500 };
export const microIdle = { minMs: 8000, maxMs: 15000, clips: ['bounce', 'tilt', 'lookAround', 'stretch'], stretchArmDeg: 10 };
export const sleep = { afterMs: 30000, breathingPeriodMs: 5200 };
export const idleCta = { afterMs: 10000 };
// Where the eyes rest when nothing is asked of them: a little toward the page.
export const restGaze = { x: 0.15, y: 0.1 };

// ---------- walking ----------
export const walk = {
    // The container's spring (stiffness ~120, damping ~18), with a cruise speed
    // so a long walk is a walk and not a slingshot.
    spring: { stiffness: 120, damping: 18 },
    maxSpeed: 520,
    // One full stride per this many mascot widths; the cadence follows the speed.
    strideWidths: 1.4,
    legLift: 34,
    footDeg: 10,
    armDeg: 12,
    bob: 10,
    // Considered arrived when this close and this slow.
    arriveDistance: 1,
    arriveSpeed: 10,
    // Never wait longer than the distance deserves for a walk to land.
    msPerPx: 2,
    minWaitMs: 250,
    maxWaitMs: 3200,
    // Shorter hops glide; under reduced motion everything fades between spots.
    glideUnderPx: 120,
    glideMs: 250,
    fadeMs: 180,
    // Running (the path-complete dash) is the walk at this many times the cadence and speed.
    run: 1.6,
    // Landing: scaleY .96 → 1.02 → 1.
    squash: { ms: 320, down: 0.96, up: 1.02 },
    // Turning round is a quick turn, not a snap.
    turnMs: 150,
    // Repositioning for a section that scrolled into view: dimmed to this
    // while it glides over, with no leg cycle — never a run across the screen.
    glideOpacity: 0.4
};

// The arms. Idle layers stay within `idleDeg`; a gesture lifts an arm up to
// `maxDeg`, which is what the kit's own pointing pose does — the raster
// shoulder caps behind the torso are there so the seam never shows.
export const arm = { maxDeg: 62, idleDeg: 12 };

// ---------- gestures: the rig's own parts, staged like a person ----------
// Pointing: the head turns, the shoulders follow, the upper arm lifts, the
// wrist turns, the finger extends; a hold; then everything lowers in the
// reverse order. Times are milliseconds from the start of the gesture.
export const pointing = {
    head: [0, 260], shoulders: [160, 480], arm: [300, 900], wrist: [520, 1000], finger: [700, 1000],
    upMs: 1000, holdMs: 2000, lowerMs: 900,
    headDeg: 8, headX: 4, shoulderDeg: 4,
    // The upper arm at a level target, and how much more (or less) for one above (or below).
    armDeg: 50, armLiftDeg: 18,
    // The finger's absolute angle for a level target (90 is straight out), and its swing with elevation.
    fingerDeg: 90, fingerElevDeg: 40
};
export const variants = {
    wave: { upMs: 450, waveFrom: 500, waveTo: 1900, lowerMs: 500, armDeg: 55, handDeg: 22, hz: 3 },
    celebrate: { upMs: 400, bounceFrom: 300, bounceTo: 1500, lowerMs: 400, armDeg: 60, bounce: 18, hops: 2 },
    clap: { inMs: 350, clapFrom: 350, clapTo: 1150, lowerMs: 300, armDeg: 40, handDeg: 15, beats: 4 }
};
// A gesture cancelled mid-way lowers the arm over this long instead of snapping.
export const gestureCancelMs = 450;
export const shake = { deg: 6, times: 3, ms: 900 };
export const nod = { deg: 5, ms: 480 };
export const bounce = { height: 18, ms: 520 };

// ---------- expressions: transform-only, the artwork's own face ----------
// Each is a set of offsets on the rig's own raster layers, so the face stays
// the one the artwork has. Blended in over `crossfadeMs`.
export const expressions = {
    crossfadeMs: 350,
    happy: {},
    encouraged: { brows: { y: -6 }, head: { r: -2 }, torso: { sy: 1.01 } },
    curious: { brows: { y: -8, r: -4 }, head: { r: 6, y: 2 }, eyes: { x: 10, y: -5 } },
    thinking: { head: { r: -6, x: -4 }, eyes: { x: -12, y: -12 }, brows: { y: -6, r: 5 }, mouth: { y: 3 } },
    excited: { brows: { y: -10 }, eyes: { sx: 1.06, sy: 1.06 }, head: { y: -3 } },
    sleepy: { eyes: { sy: 0.45, y: 4 }, brows: { y: 7 }, head: { r: 9, y: 12, x: 8 }, mouth: { y: 5 }, torso: { sy: 0.99 } },
    sad: { brows: { y: 6, r: 8 }, head: { r: 4, y: 10 }, eyes: { y: 6 }, mouth: { y: 4 } }
};

// ---------- contexts: what the rig does while the student reads, watches, thinks ----------
export const contexts = {
    // Eyes sweep a line, drop to the next, and every few lines glance up.
    reading: { lineMs: [1800, 2600], lines: [3, 5], sweepX: 11, lineY: 8, glanceMs: 700, headDeg: 3 },
    // Eyes on the screen, the odd small nod or tilt, nothing big.
    watching: { reactMs: [7000, 12000], clips: ['nod', 'tilt'], eyesY: 4 },
    // A tilt, eyes up, a slow sway, a look around now and then.
    thinking: { swayMs: 4200, swayDeg: 2, lookMs: [5000, 9000] },
    // Facing what it pointed at, breathing, no gestures.
    waiting: {}
};

// ---------- stills ----------
export const stills = {
    // rig scale .96 + fade out → still pops in with overshoot → hold → cross back on a bounce
    rigOutMs: 120,
    rigOutScale: 0.96,
    popMs: 280,
    popFrom: 0.85,
    popOver: 1.04,
    holdMs: 1500,
    outMs: 160,
    backBounce: 10,
    // Height of the drawn figure relative to the rig, so a still never looks
    // bigger or smaller than the character it replaces. 1 = fit the same box.
    scale: {
        'wave-hi': 1, 'point-right': 1, 'cheer-jump': 1, 'confetti-cheer': 1, 'star-celebrate': 1,
        sad: 1, thinking: 1, 'thumbs-up': 1, worried: 1, clapping: 1, meditating: 1
    }
};

// ---------- the queue ----------
export const queue = {
    // One moment at a time, and a breath between them.
    rateMs: 3000,
    maxWaiting: 3,
    // From `waitsFrom` up a moment waits its turn; below it is dropped when busy.
    waitsFrom: 3,
    priority: {
        pageEnter: 5, pathCompleted: 5,
        phaseCompleted: 4, badgeEarned: 4, achievement: 4, streak: 4,
        stepCompleted: 3, quizPassed: 3, quizFailed: 3, lockedClicked: 3, custom: 3, cardClicked: 3,
        sectionActive: 3, startClicked: 3, playClicked: 3,
        // What the student has started doing waits its turn rather than being dropped.
        quizStarted: 3, readingStarted: 3, videoStarted: 3,
        videoPaused: 2, videoCompleted: 2, taskStarted: 2,
        timetableOpened: 2, calendarOpened: 2,
        quizAnswer: 1, idleCta: 1, sleep: 1, wander: 1, ponder: 1
    }
};

// ---------- what it says ----------
// Words only — no emoji — and short: it is a bubble, not a paragraph.
export const lines = {
    hello: "Hi! Let's plan your career path",
    startHere: 'Start here',
    nextStep: "Here's your next step",
    readyNext: 'Ready for the next step?',
    youAreHere: 'You are here',
    calendar: 'Your plan, one day at a time',
    classNow: 'This class is on now',
    classNext: 'Your next class',
    skillTask: 'Finish this task to grow the skill',
    pendingTask: 'One task is still open today',
    rewards: 'More tasks unlock the next badge',
    claim: 'Claim your badge!',
    tryAgain: "It's okay, let's try again!",
    streak: 'Three in a row!',
    locked: (what) => `Finish ${what} to unlock this`,
    badge: (title) => (title ? `New badge: ${title}` : 'You earned a new badge!'),
    dayStreak: (days) => `${days} days in a row. Keep it going!`,
    halfway: 'You are halfway along your career path!',
    complete: 'You finished your whole career path!',
    ideas: 'Every idea here was picked for your goal'
};

// ---------- pages: what opening each screen makes it do ----------
// `cta` is what it walks to after ten quiet seconds, once per element;
// `wander` lets it take the odd short walk while idle; `ponder` is the Ideas
// page's slow thinking loop.
export const pages = {
    '/career': {
        enter: [
            { do: 'enter', wave: true },
            { do: 'walk', to: ['start-quest', 'next-step'] },
            { do: 'point', text: lines.startHere }
        ],
        cta: ['start-quest'],
        sections: ['start-quest', 'view-roadmap', 'next-step'],
        wander: true
    },
    '/career/planner': {
        enter: [{ do: 'walk', to: 'start-task' }, { do: 'point', text: lines.nextStep }],
        cta: ['start-task'],
        sections: ['start-task']
    },
    '/career/calendar': {
        enter: [{ do: 'walk', to: ['calendar-day', 'calendar'] }, { do: 'point', text: lines.calendar }]
    },
    '/career/roadmap': {
        enter: [{ do: 'walk', to: 'current-roadmap-position' }, { do: 'point', text: lines.youAreHere }],
        sections: ['current-roadmap-position', 'claim-badge']
    },
    '/career/skills': {
        enter: [{ do: 'walk', to: 'skill-task' }, { do: 'point', text: lines.skillTask }],
        cta: ['skill-task'],
        sections: ['skill-task']
    },
    '/career/recommendations': {
        enter: [{ do: 'home' }, { do: 'still', name: 'thinking' }, { do: 'expression', name: 'thinking', ms: 6000 }],
        wander: true,
        ponder: true
    },
    '/career/profile': {
        enter: [
            {
                do: 'if',
                fact: 'pendingTasks',
                then: [{ do: 'walk', to: 'pending-task' }, { do: 'point', text: lines.pendingTask }],
                else: [{ do: 'still', name: 'thumbs-up' }]
            }
        ]
    },
    '/career/badges': {
        enter: [
            { do: 'walk', to: ['rewards', 'rewards-task', 'earn'] },
            { do: 'expression', name: 'encouraged', ms: 4000 },
            { do: 'point', text: lines.rewards }
        ],
        cta: ['rewards-task']
    },
    '/career/games': { enter: [], sections: ['play'] },
    '/career/settings': { enter: [] },
    '/career/onboarding': { enter: [{ do: 'enter', wave: true }] }
};

// ---------- events: what each moment makes it do ----------
export const events = {
    stepCompleted: [
        { do: 'gesture', name: 'clap' },
        { do: 'confetti' },
        { do: 'gesture', name: 'celebrate' },
        { do: 'glide', to: ['start-task', 'next-step'] },
        { do: 'point', text: lines.nextStep }
    ],
    // A section scrolled into view: a dimmed glide over, then the pointing.
    sectionActive: [{ do: 'glide', to: '@el' }, { do: 'point' }],
    // The Start button pressed: a thumbs up and a happy bounce.
    startClicked: [{ do: 'still', name: 'thumbs-up', ms: 1100, pop: true }, { do: 'bounce' }],
    // Play pressed on a game: a celebration.
    playClicked: [{ do: 'confetti' }, { do: 'gesture', name: 'celebrate' }],
    streak: [{ do: 'still', name: 'confetti-cheer' }, { do: 'say', text: lines.streak }],
    phaseCompleted: [{ do: 'still', name: 'confetti-cheer' }, { do: 'walk', to: 'claim-badge' }, { do: 'point', text: lines.claim }],
    pathCompleted: [
        { do: 'centre' },
        { do: 'still', name: 'confetti-cheer', ms: 2000 },
        { do: 'say', text: lines.complete },
        { do: 'gesture', name: 'wave' }
    ],
    badgeEarned: [
        { do: 'confetti' },
        { do: 'still', name: 'star-celebrate', ms: 1600 },
        { do: 'expression', name: 'encouraged', ms: 3000 }
    ],
    achievement: [{ do: 'say', text: '@text' }, { do: 'still', name: 'star-celebrate' }],
    quizPassed: [{ do: 'context', name: null }, { do: 'confetti' }, { do: 'gesture', name: 'celebrate' }],
    quizFailed: [
        { do: 'context', name: null },
        { do: 'still', name: 'sad', ms: 1200 },
        { do: 'expression', name: 'encouraged', ms: 5000 },
        { do: 'walk', to: 'retry' },
        { do: 'point', text: lines.tryAgain }
    ],
    // Marked as it happens: a nod for a right answer, a curious beat for a wrong one. No stills.
    quizAnswerRight: [{ do: 'nod' }],
    quizAnswerWrong: [{ do: 'expression', name: 'curious', ms: 1200 }],
    lockedClicked: [
        { do: 'expression', name: 'curious', ms: 2500 },
        { do: 'shake' },
        { do: 'walk', to: '@prerequisite' },
        { do: 'point', text: '@locked' }
    ],
    cardClicked: [
        { do: 'walk', to: '@el' },
        { do: 'expression', name: 'happy' },
        { do: 'walk', to: ['enroll', 'view-roadmap'] },
        { do: 'point' }
    ],
    idleCta: [{ do: 'walk', to: '@cta' }, { do: 'point', text: lines.readyNext }],
    sleep: [{ do: 'sleep' }],
    taskStarted: [{ do: 'context', name: 'waiting' }],
    // The context itself is set the moment the section is on screen; these only walk over.
    // Never scrolling: the student is reading or watching right where they are.
    readingStarted: [{ do: 'walk', to: '@el', scroll: false, ifContext: 'reading' }],
    videoStarted: [{ do: 'walk', to: '@el', scroll: false, ifContext: 'watching' }],
    videoPaused: [{ do: 'context', name: 'waiting' }],
    videoCompleted: [{ do: 'context', name: null }, { do: 'still', name: 'thumbs-up' }],
    quizStarted: [{ do: 'walk', to: '@el', scroll: false, ifContext: 'thinking' }, { do: 'still', name: 'thinking', ms: 1200, ifContext: 'thinking' }],
    timetableOpened: [{ do: 'walk', to: ['current-class', 'next-class'] }, { do: 'point', text: '@classLine' }],
    calendarOpened: [{ do: 'walk', to: ['calendar-day', 'calendar'] }, { do: 'point', text: lines.calendar }],
    wander: [{ do: 'wander' }],
    ponder: [{ do: 'expression', name: 'thinking', ms: 5000 }, { do: 'lookAround' }],
    custom: []
};

// Three finished steps in one sitting, none undone in between, earn the confetti.
export const streak = { steps: 3 };
// The Overview's and Ideas page's short walks: how far, and how often.
export const wander = { minMs: 20000, maxMs: 35000, maxPx: 160 };
export const ponder = { minMs: 14000, maxMs: 24000 };

// Presses that get a reaction: the start buttons a thumbs up, Play a celebration.
export const clicks = { start: ['start-quest', 'start-task', 'start', 'enroll'], play: ['play'] };

// Facts the engine keeps for `if` steps.
export const FACTS = ['pendingTasks'];

const config = {
    layout, breathing, sway, blink, look, microIdle, sleep, idleCta, restGaze, walk, arm, pointing, variants, gestureCancelMs,
    shake, nod, bounce, expressions, contexts, stills, queue, lines, pages, events, streak, wander, ponder, clicks
};
export default config;
