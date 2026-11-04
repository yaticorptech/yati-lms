/**
 * Linguistic Ability (asked 2026-10-22; redesigned the same day to work like
 * Duolingo), in a real browser with the server stood in for: the learning
 * path on a phone and a laptop, the tabs, and the full-screen sessions — a
 * lesson from its tips to the result, hearts running out, translation with
 * word tiles and Kannada letters, matching pairs, the placement test and
 * revision; and the courses in other languages (a Hindi speaker learning
 * Kannada), chosen at the start or from the chip.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';
import { createRequire } from 'node:module';
// The picture stories as the server builds them (comics.js, 2026-10-31).
const comics = createRequire(import.meta.url)('../../../yaticorp-lms-server/src/linguistic/comics.js');
// The Letters lessons as the server builds them (alphabet.js, 2026-10-31).
const alphabet = createRequire(import.meta.url)('../../../yaticorp-lms-server/src/linguistic/alphabet.js');

const DASH = {
    student: { firstName: 'Asha' }, level: 'beginner', levelLabel: 'Beginner', placement: null,
    levels: [
        { level: 'beginner', label: 'Beginner', total: 4, completed: 2, passingScore: 60, complete: false, certificate: null },
        { level: 'intermediate', label: 'Intermediate', total: 1, completed: 0, passingScore: 70, complete: false, certificate: null },
        { level: 'advanced', label: 'Advanced', total: 0, completed: 0, passingScore: 75, complete: false, certificate: null }
    ],
    modules: [], overall: { total: 5, completed: 2, percent: 40 }, quizAverage: 90, points: 340, streak: { current: 3, longest: 5, today: true },
    achievements: [{ key: 'first_lesson', emoji: '🌱', title: 'Off to a Start', description: 'Complete your first lesson.', earned: true, current: 1, target: 1 }, { key: 'translator', emoji: '🔁', title: 'Translator', description: 'Translate 10 items correctly.', earned: false, current: 4, target: 10 }],
    resume: null, daily: { done: false, score: null, total: 5 }, mistakes: 4, pendingReviews: 1, today: { xp: 30, lessons: 1 }, certificateMinAverage: 70,
    language: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' }, languageChosen: false, started: true, dailyGoal: 30, goalSet: true,
    languages: [{ code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', group: 'india' }, { code: 'hi', name: 'Hindi', native: 'हिन्दी', group: 'india' }, { code: 'ur', name: 'Urdu', native: 'اردو', group: 'india', rtl: true }, { code: 'fr', name: 'French', native: 'Français', group: 'world' }, { code: 'ja', name: 'Japanese', native: '日本語', group: 'world' }, { code: 'ko', name: 'Korean', native: '한국어', group: 'world' }],
    course: { code: 'en', name: 'English', native: 'English', full: true },
    // A learning plan made (2026-10-26: without one, the section asks for the time first — PlanQuestion.jsx).
    plan: { days: 60, tier: 'full', day: 1, daysLeft: 60, over: false, total: 117, done: 0, left: 117, behind: 0, minutesPerLesson: 7, today: { day: 1, today: true, lessons: [] } },
    courses: [{ code: 'en', name: 'English', native: 'English', full: true, begun: true }, ...[['kn', 'Kannada', 'ಕನ್ನಡ'], ['hi', 'Hindi', 'हिन्दी'], ['fr', 'French', 'Français'], ['ja', 'Japanese', '日本語']].map(([code, name, native]) => ({ code, name, native, full: false, begun: false }))]
};
const lesson = (id, title, more = {}) => ({ id, title, summary: `About ${title}`, order: 1, module: 'vocabulary', review: null, direction: null, open: true, status: 'new', bestScore: null, attempts: 0, ...more });
const PATH = {
    level: 'beginner', levelLabel: 'Beginner', placement: null, current: 'v2', certificateMinAverage: 70,
    levels: [
        { level: 'beginner', label: 'Beginner', passingScore: 60, open: true, total: 4, completed: 2, complete: false, certificate: null, units: [
            // Topic units (2026-10-24): a lesson of each kind in each.
            { id: 'beginner-1', index: 1, kind: 'topic', title: 'Home and family', open: true, lessons: [lesson('v1', 'Home and family', { status: 'completed', bestScore: 100 }), lesson('g1', 'Articles', { module: 'grammar', status: 'completed', bestScore: 80 })] },
            { id: 'beginner-2', index: 2, kind: 'topic', title: 'Food and drink', open: true, lessons: [lesson('v2', 'Food and drink', { order: 2 }), lesson('g2', 'Pronouns', { module: 'grammar', order: 2, open: false })] }] },
        { level: 'intermediate', label: 'Intermediate', passingScore: 70, open: false, total: 1, completed: 0, complete: false, certificate: null, units: [
            { id: 'intermediate-1', index: 1, kind: 'topic', title: 'Feelings', open: false, lessons: [lesson('t1', 'Sentences', { module: 'translation', open: false, direction: 'kn-en' })] }] }
    ]
};

/**
 * A keyboard's rows of letter keys (2026-11-03, "give the correct alignment for all languages"), measured in the page:
 * for each row, its full first line's space at each side, its last line's, how many keys to a line, and their widths.
 */
const KEY_ROWS = `((root) => [...document.querySelectorAll(root + ' [data-key-grid]')].map((g) => {
    const box = g.getBoundingClientRect(), keys = [...g.children].map((k) => k.getBoundingClientRect());
    const lines = []; for (const k of keys) { const l = lines.find((x) => Math.abs(x[0].top - k.top) < 2); if (l) l.push(k); else lines.push([k]); }
    const side = (l) => [Math.round(Math.min(...l.map((k) => k.left)) - box.left), Math.round(box.right - Math.max(...l.map((k) => k.right)))];
    // How many keys a full line holds: the box's width over a key and its gap (4px).
    const holds = Math.floor((box.width + 4.5) / (keys[0].width + 4));
    return { first: side(lines[0]), last: side(lines[lines.length - 1]), lines: lines.map((l) => l.length), holds, keys: keys.length, widths: new Set(keys.map((k) => Math.round(k.width))).size };
}))`;
/** As a phone keyboard: full lines edge to edge, a shorter last line in the middle, every key one width. */
const assertKeyRows = (rows, name) => {
    assert.ok(rows.length > 0, `${name}: its keys`);
    for (const r of rows) {
        const where = `${name} ${JSON.stringify(r)}`;
        assert.equal(r.widths, 1, `${where}: one width`);
        assert.ok(r.lines.slice(0, -1).every((n) => n === r.holds), `${where}: every line but the last full`);
        if (r.lines[0] === r.holds) assert.ok(r.first.every((x) => x <= 1), `${where}: a full line edge to edge`);
        assert.ok(Math.abs(r.last[0] - r.last[1]) <= 1.5, `${where}: the last line in the middle`);
    }
};

/** The section in the app's frame (the page scrolls inside <main>), with the shell around its tabs; `device` is the device's language. */
const app = (route, device = null) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Shell from '${srcFile('linguistic/LingoShell.jsx')}';
import Home from '${srcFile('linguistic/LinguisticHome.jsx')}';
import Practice from '${srcFile('linguistic/PracticeHub.jsx')}';
import Badges from '${srcFile('linguistic/Badges.jsx')}';
import Writing from '${srcFile('linguistic/MyWriting.jsx')}';
import Lesson from '${srcFile('linguistic/LessonPage.jsx')}';
import Placement from '${srcFile('linguistic/Placement.jsx')}';
import Review from '${srcFile('linguistic/Review.jsx')}';
import Roadmap from '${srcFile('linguistic/Roadmap.jsx')}';
import Dashboard from '${srcFile('linguistic/Dashboard.jsx')}';
import Letters from '${srcFile('linguistic/LettersChart.jsx')}';
import Notes from '${srcFile('linguistic/Learnt.jsx')}';
const Where = () => <p data-where>{useLocation().pathname}</p>;
${device ? `Object.defineProperty(navigator, 'languages', { get: () => ['${device}'] });` : ''}
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <div className="flex h-dvh"><main className="relative flex-1 overflow-auto"><div className="mx-auto p-4 pb-[7.5rem]">
      <Routes>
        <Route path="/linguistic" element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="practice" element={<Practice />} />
          <Route path="badges" element={<Badges />} />
          <Route path="writing" element={<Writing />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="letters" element={<Letters />} />
          <Route path="notes" element={<Notes />} />
        </Route>
        <Route path="/linguistic/placement" element={<Placement />} />
        <Route path="/linguistic/review" element={<Review />} />
        <Route path="/linguistic/:module/:lessonId" element={<Lesson />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </div></main></div>
  </MemoryRouter>);`;
const WIDE = `const m = $('main'); return m.scrollWidth - m.clientWidth + (matchMedia('(pointer: coarse)').matches ? Math.max(0, innerWidth - screen.width) : 0);`;
const SESSION_WIDE = `const s = $('[data-lingo-session]'); const m = s.querySelector('main'); return Math.max(s.scrollWidth - s.clientWidth, m.scrollWidth - m.clientWidth, matchMedia('(pointer: coarse)').matches ? Math.max(0, innerWidth - screen.width) : 0);`;
// Session helpers: press the main button (or the sheet's), type into the answer box.
const DRIVE = `
const press = async () => { ($('[data-continue]') || $('[data-primary]')).click(); await sleep(260); };
const typeIn = (v) => { const el = $('[data-answer-area] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
const sheet = () => $('[data-sheet]')?.dataset.sheet || null;`;
const V2 = { id: 'v2', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Food and drink', direction: null, passingScore: 60, learn: { intro: 'Words for food.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, words: [], quiz: [] };
// The learning plan (2026-10-24): the times to choose, and a roadmap on its third day, one lesson behind.
const PLAN_OPTIONS = { options: [
    { days: 14, tier: 'main', lessons: 72, perDay: 5.1, minutes: 40 }, { days: 30, tier: 'main', lessons: 72, perDay: 2.4, minutes: 20 },
    { days: 60, tier: 'full', lessons: 117, perDay: 2, minutes: 15 }, { days: 90, tier: 'full', lessons: 117, perDay: 1.3, minutes: 10 }, { days: 180, tier: 'full', lessons: 117, perDay: 0.7, minutes: 10 }
] };
const RL = (id, title, module, extra = {}) => ({ id, title, module, type: 'lesson', level: 'beginner', unit: 'Family', status: 'new', open: false, ...extra });
const TODAY = { day: 3, today: true, lessons: [RL('r3', 'Family', 'vocabulary', { status: 'completed', open: true }), RL('r4', 'Articles: a, an and the', 'grammar', { open: true })] };
const ROADMAP = { course: { code: 'en', name: 'English' }, level: 'beginner', options: PLAN_OPTIONS.options, plan: {
    days: 30, tier: 'main', day: 3, daysLeft: 28, over: false, total: 72, done: 4, left: 68, behind: 1, minutesPerLesson: 7, today: TODAY,
    schedule: [{ day: 1, past: true, lessons: [RL('r1', 'Old lesson', 'grammar', { status: 'completed' })] }, { day: 2, past: true, lessons: [] }, TODAY,
        { day: 4, lessons: [RL('r5', 'Daily conversation 1: Kannada → English', 'translation'), RL('r6', 'Food, size and feelings', 'vocabulary', { unit: 'Food, size and feelings' })] }]
} };
const SHELL_API = { '/linguistic/plan/options': PLAN_OPTIONS, '/linguistic/plan': ROADMAP, '/linguistic/path': PATH, '/linguistic/lessons/v2': V2, '/linguistic/history': { attempts: [] }, '/linguistic/submissions': { submissions: [] }, '/linguistic/': DASH };

describe('Linguistic Ability', { skip: skipWithoutStyles }, () => {
    for (const [name, size] of [['phone', { device: DEVICES.galaxyZFold6Folded }], ['laptop', { width: 1366, height: 900 }]]) {
        test(`the path on a ${name}: tabs, sections, units, lessons done / next / locked, the trophy — inside the screen`, async () => {
            const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule(SHELL_API), styles: true, ...size, script: `
                await sleep(1300);
                const nodes = Object.fromEntries($$('[data-node]').map((b) => [b.dataset.node, b.dataset.status]));
                const out = { wide: (() => { ${WIDE} })(), tabs: $$('[data-tab]').map((t) => t.dataset.tab), sections: $$('[data-section]').map((s) => s.dataset.section), nodes,
                    crown: !!$('[data-node="v1"] .lucide-crown'), bubble: $('[data-start-bubble]')?.closest('div').querySelector('[data-node]')?.dataset.node,
                    jump: $$('[data-jump]').length, shut: $$('[data-section-locked]').length, lockedUnits: $$('[data-unit][data-open="false"] [data-unit-locked]').map((x) => x.closest('[data-unit]').dataset.unit), openGrey: $$('[data-unit][data-open="true"] [data-unit-locked]').length, shutBars: $$('[data-section="intermediate"] [data-section-head] [role="progressbar"]').length, shutLock: !!$('[data-section="intermediate"] [data-section-lock]'), trophies: $$('[data-trophy]').length, mascots: $$('[data-unit] img[src^="/mascot/stills/"]').length,
                    rail: !!$('aside[aria-label="Your progress"]'), width: Math.round($('[data-path]').getBoundingClientRect().width), cards: ['[data-quests]', '[data-plan-card]', '[data-course-card]'].filter((q) => $(q)), xp: $('[data-xp]')?.dataset.xp, streak: $('[data-streak]')?.dataset.streak };
                $('[data-node="v2"]').click(); await sleep(300);
                out.card = text($('[data-lesson-card="v2"]'));
                $('[data-node="g2"]').click(); await sleep(300);
                out.locked = text($('[data-lesson-card="g2"]'));
                out.units = $$('[data-unit-title]').map(text);
                out.kinds = $$('[data-node]').map((b) => b.dataset.kind);
                $('[data-guidebook-open="beginner-1"]').click(); await sleep(300);
                out.guide = $$('[data-guidebook="beginner-1"] li').map(text);
                $('[data-guidebook] button[aria-label="Close"]').click(); await sleep(200);
                $('[data-node="v2"]').click(); await sleep(300);
                $('[data-start-lesson]').click(); await sleep(300);
                out.went = location.pathname === '/' ? text($('[data-lingo-session]') ? null : $('[data-where]')) || 'session' : location.pathname;
                out.session = !!$('[data-lingo-session]');
                return out;` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual(result.tabs, [], 'the tabs are the dashboard\'s; the path has its ✕ back to it (2026-10-27)');
            assert.deepEqual(result.sections, ['beginner', 'intermediate']);
            assert.deepEqual(result.nodes, { v1: 'completed', v2: 'new', g1: 'completed', g2: 'locked', t1: 'locked' });
            assert.equal(result.crown, true, 'a crown for 100%');
            assert.equal(result.bubble, 'v2', 'START over the lesson to take next');
            assert.deepEqual([result.jump, result.shut], [0, 1], 'no "Jump here?" (2026-10-28): the shut section says to finish the one before');
            assert.deepEqual([result.lockedUnits, result.openGrey], [['intermediate-1'], 0], 'a unit not open: its banner grey, with a lock; the open ones in colour');
            assert.deepEqual([result.shutBars, result.shutLock], [0, true], 'a section still shut: "Locked", and no progress bar');
            assert.equal(result.trophies, 2); assert.equal(result.mascots, 3);
            assert.deepEqual([result.rail, result.cards], [false, []], 'the side panel and its cards are on the dashboard only (2026-10-26)');
            if (name === 'laptop') assert.ok(result.width > 1000, `the path page is full width (${result.width}px)`);
            assert.deepEqual([result.xp, result.streak], [undefined, undefined], 'the language, level, streak and XP bar is on the dashboard only (2026-10-26)');
            assert.match(result.card, /Food and drink/); assert.match(result.card, /Vocabulary · lesson 1 of 2/i); assert.match(result.card, /start/i);
            assert.deepEqual(result.units, ['Home and family', 'Food and drink', 'Feelings'], 'topic units');
            assert.deepEqual(result.kinds, ['vocabulary', 'grammar', 'vocabulary', 'grammar', 'translation'], 'a lesson of each kind in a unit');
            assert.match(result.locked, /Finish the lessons above to unlock this one/);
            assert.equal(result.guide.length, 2); assert.match(result.guide[1], /Articles/); assert.match(result.guide[1], /Grammar/i); assert.match(result.guide[1], /best 80%/i);
            assert.equal(result.session, true, 'START opens the lesson, full screen');
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });
    }

    test('starting out (2026-10-27, eight questions taken out; 2026-10-28, "where to start" too): Get started, the language to learn and the level, the reason, the translation language, the roadmap and where it leads — each question waits for an answer', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languages: [...DASH.languages, { code: 'en', name: 'English', native: 'English', group: 'world' }] };
        const post = `(url, body) => ({ ok: true, level: body.level, placement: { level: body.level, chosen: true } })`;
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const at = () => $('[data-onboarding]')?.dataset.onboarding;
            const out = { tabs: $$('[data-tab]').length, steps: [], shown: [] };
            out.welcome = [at(), btn().textContent.trim(), btn().disabled];
            const pass = async () => { out.shown.push([at(), btn().disabled]); btn().click(); await sleep(400); };
            const stepIs = async (name, ...picks) => {
                out.steps.push([at(), btn().disabled]);
                btn().click(); await sleep(150);
                const stayed = at() === name;
                for (const pick of picks) { $(pick).click(); await sleep(120); }
                out.steps.push([at(), btn().disabled, stayed]);
                if (name === 'know') out.cefr = $$('[data-cefr]').map((x) => x.textContent);
                if (name === 'start') out.recommended = $('[data-recommended]')?.closest('[data-start]')?.dataset.start;
                if (name === 'time') { out.tiers = $$('[data-plan-tier]').map((x) => x.dataset.planTier); out.suggested = $$('[data-plan-days]').find((x) => /Recommended/i.test(x.textContent))?.dataset.planDays; }
                btn().click(); await sleep(450);
            };
            await pass();
            out.learn = { english: $('[data-course="en"]')?.getAttribute('aria-pressed'), tiles: $$('[data-course]').length };
            const box = $('[data-language-search]');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, 'hin'); box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(120);
            out.learn.found = $$('[data-course]').map((x) => x.dataset.course);
            await pass();
            await stepIs('know', '[data-know="0"]');
            await stepIs('why', '[data-reason="abroad"]');
            out.translateFirst = $$('[data-language]')[0]?.dataset.language;
            await stepIs('translate', '[data-language="ja"]');
            await stepIs('time', '[data-plan-days="60"]');
            out.chart = $('[data-goal-chart]')?.dataset.goalChart;
            await pass();
            // Last (2026-10-28): the languages they speak, write and read; the one they know best ticked to begin with.
            out.knows = { first: $$('[data-knows][aria-pressed="true"]').map((b) => b.dataset.knows), title: text($('[data-onboarding] h1')), top: $('[data-knows]')?.dataset.knows };
            $('[data-knows="hi"]').click(); await sleep(100);
            out.knows.count = text($('[data-knows-count]'));
            await pass();
            out.knows.write = text($('[data-onboarding] h1'));
            $('[data-knows="ja"]').click(); await sleep(100);
            out.knows.none = btn().disabled;
            $('[data-knows="ja"]').click(); await sleep(100);
            await pass();
            out.knows.read = text($('[data-onboarding] h1'));
            out.last = btn().textContent.trim();
            await pass();
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.tabs, 0, 'the section waits behind the start screens');
        assert.deepEqual(result.welcome, ['welcome', 'Get started', false], 'first, Get started');
        assert.deepEqual(result.learn, { english: 'true', tiles: 5, found: ['hi'] }, 'English to begin; the languages searched');
        assert.deepEqual(result.shown, [['welcome', false], ['learn', false], ['chart', false], ['speak', false], ['write', false], ['read', false]], 'the screens with nothing to choose (or already chosen) go on');
        assert.deepEqual(result.knows, { first: ['ja'], title: 'Which languages do you speak?', top: 'en', count: '2 chosen', write: 'Which languages can you write?', none: true, read: 'Which languages can you read?' }, 'the three language questions, last; one or more each');
        const asked = ['know', 'why', 'translate', 'time'];
        assert.deepEqual(result.steps, asked.flatMap((n) => [[n, true], [n, false, true]]), 'CONTINUE is grey, and does nothing, until an answer is chosen');
        assert.deepEqual(result.cefr, ['A1', 'A1–A2', 'A2–B1', 'B1–B2', 'B2+']);
        assert.equal(result.translateFirst, 'en', 'the device\'s language (English, in this browser) first');
        assert.deepEqual(result.tiers, ['main', 'main', 'full', 'full', 'full'], 'each time says whether it has every lesson or the main ones');
        assert.equal(result.suggested, '60', 'the shortest roadmap with every lesson: 2 months');
        assert.equal(result.chart, '9', 'where 2 months take them: week 9');
        assert.equal(result.last, 'Start learning', 'reading is the last screen (2026-10-28: no "where to start" — everyone starts at Section 1, Unit 1)');
        assert.deepEqual(result.sent, [
            ['/linguistic/about', { reason: 'abroad', know: 0 }], ['/linguistic/knows', { speak: ['ja', 'hi'], write: ['ja'], read: ['ja'] }],
            ['/linguistic/language', { language: 'ja' }], ['/linguistic/plan', { days: 60 }], ['/linguistic/level', { level: 'beginner' }]
        ], 'the answers and their languages; the language they know, the plan, then the level');
    });

    test('starting out at Advanced (2026-10-31): choosing "I can discuss most topics" says a test comes first; at the end, the test opens — no Advanced without it', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languages: [...DASH.languages, { code: 'en', name: 'English', native: 'English', group: 'world' }] };
        const JT = { id: 'jt', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Beginner assessment', review: 'assessment', direction: null, passingScore: 50, learn: { intro: 'The jump test: 20 questions on Beginner.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, words: [], quiz: [] };
        const post = `(url, body) => url.endsWith('/jump') ? { level: 'advanced', lesson: 'jt', module: 'vocabulary' } : ({ ok: true, level: body.level, placement: { level: body.level, chosen: true } })`;
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/lessons/jt': JT, ...SHELL_API, '/linguistic/': fresh }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const at = () => $('[data-onboarding]')?.dataset.onboarding;
            const go = async () => { btn().click(); await sleep(400); };
            const out = {};
            for (let i = 0; i < 12 && at() !== 'know'; i++) await go();
            $('[data-know="0"]').click(); await sleep(120);
            out.noteForNew = !!$('[data-advanced-test-note]');
            $('[data-know="4"]').click(); await sleep(120);
            out.note = text($('[data-advanced-test-note]'));
            await go();
            const picks = { why: '[data-reason="abroad"]', translate: '[data-language="ja"]', time: '[data-plan-days="60"]' };
            for (let i = 0; i < 14 && $('[data-onboarding]'); i++) {
                const pick = picks[at()];
                if (pick && btn().disabled) { $(pick).click(); await sleep(120); }
                await go();
            }
            await sleep(600);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]);
            out.opened = window.__calls.some((c) => c[0] === 'GET' && c[1].endsWith('/lessons/jt'));
            out.inTest = !!$('[data-lingo-session]') && !$('[data-onboarding]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.noteForNew, false, 'no test for one who is new to it');
        assert.match(result.note, /first take the Advanced entry test.*20 questions, 10 on Beginner and 10 on Advanced.*half of each right and Advanced opens.*start from Beginner.*one try/);
        assert.deepEqual(result.sent.slice(-2), ['/linguistic/level', '/linguistic/jump'], 'started at Beginner, then the jump test to Advanced');
        assert.equal(result.opened, true, 'the test opens straight away');
        assert.equal(result.inTest, true);
    });

    test('a locked Advanced lesson on the path (2026-10-31): tapped, it offers the jump test, not only "Locked"', async () => {
        const advanced = { level: 'advanced', label: 'Advanced', passingScore: 75, open: false, total: 1, completed: 0, complete: false, certificate: null, jump: { from: 'beginner', status: 'new' }, units: [
            { id: 'advanced-reading', index: 1, kind: 'track', title: 'Reading', open: false, lessons: [lesson('a1', 'Reading 1', { module: 'reading', level: 'advanced', open: false })] }] };
        const { result, errors } = await screen({ entry: app('/linguistic?section=advanced'), api: apiModule({ '/linguistic/lessons/jt': { id: 'jt', module: 'vocabulary', level: 'beginner', title: 'Beginner assessment', review: 'assessment', passingScore: 50, learn: { intro: 'The jump test.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, words: [], quiz: [] }, ...SHELL_API, '/linguistic/path': { ...PATH, levels: [PATH.levels[0], advanced] } }, `(url) => url.endsWith('/jump') ? { level: 'advanced', lesson: 'jt', module: 'vocabulary' } : {}`), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1300);
            $('[data-node="a1"]').click(); await sleep(300);
            const card = $('[data-lesson-card="a1"]');
            const out = { jump: !!card?.querySelector('[data-jump-start]'), locked: !!card && [...card.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Locked'), text: text(card?.querySelector('[data-jump-test]')) };
            card.querySelector('[data-jump-start]')?.click(); await sleep(500);
            out.sent = window.__calls.find((c) => c[1].endsWith('/jump'))?.[2];
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.jump, result.locked], [true, false]);
        assert.match(result.text, /Advanced entry test/);
        assert.deepEqual(result.sent, { level: 'advanced' });
    });

    test('the roadmap (2026-10-24): the day of the plan, one lesson behind, today\'s lessons to tap, the days to come; the time can be changed', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/roadmap'), api: apiModule(SHELL_API, '(url, body) => ({ ...' + JSON.stringify(ROADMAP) + ', plan: { ...' + JSON.stringify(ROADMAP.plan) + ', days: body.days } })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1300);
            const out = { roadmap: $('[data-roadmap]')?.dataset.roadmap, day: text($('[data-plan-day]')), status: $('[data-plan-status]')?.dataset.planStatus,
                today: $$('[data-today] [data-roadmap-lesson]').map((x) => x.dataset.roadmapLesson), link: $('[data-today] a[data-roadmap-lesson]')?.getAttribute('href'),
                rows: $$('[data-plan-day-row]').map((x) => x.dataset.planDayRow), wide: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) };
            if (!$('[data-plan-change]')) return { ...out, text: document.body.innerText.slice(0, 500) };
            $('[data-plan-change]').click(); await sleep(300);
            out.choices = $$('[data-plan-days]').length;
            $('[data-plan-days="90"]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.after = $('[data-roadmap]')?.dataset.roadmap;
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.roadmap, result.day, result.status], ['30', '3', 'orange'], result.text);
        assert.deepEqual(result.today, ['r3', 'r4']);
        assert.equal(result.link, '/linguistic/grammar/r4', 'the lesson to do today opens from the roadmap');
        assert.deepEqual(result.rows, ['3', '4'], 'today and the days to come; the days gone folded away');
        assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        assert.equal(result.choices, 5);
        assert.deepEqual(result.sent, [['/linguistic/plan', { days: 90 }]]);
        assert.equal(result.after, '90', 'the new roadmap shown');
    });

    test('a student who started before the learning plan: on entering, how much time they have — then the path (2026-10-26)', async () => {
        const before = { ...DASH, plan: null };
        const post = `(url, body) => (url.includes('/plan') ? ${JSON.stringify(ROADMAP)} : { ok: true })`;
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': before }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1300);
            const out = { asked: !!$('[data-plan-question]'), title: text($('[data-plan-question] h1')), choices: $$('[data-plan-days]').length, tabs: $$('[data-tab]').length,
                disabled: $('[data-lingo-session] [data-primary]').disabled };
            $('[data-plan-days="60"]').click(); await sleep(120);
            out.ready = !$('[data-lingo-session] [data-primary]').disabled;
            $('[data-lingo-session] [data-primary]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.wide = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.asked, result.title, result.choices, result.tabs, result.disabled], [true, 'How much time do you have to learn English?', 5, 0, true], 'asked first, the section behind it; CONTINUE waits for a choice');
        assert.equal(result.ready, true);
        assert.deepEqual(result.sent, [['/linguistic/plan', { days: 60 }]]);
        assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
    });

    test('starting out knowing some English (2026-10-28): no "Find my level" or "start at Intermediate" — Section 1, Unit 1, as everyone', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        const PL = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/placement': PL, ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const go = async (pick) => { if (pick) { $(pick).click(); await sleep(100); } btn().click(); await sleep(400); };
            await go(); await go(); await go('[data-know="3"]');
            await go('[data-reason="school"]');
            await go(); await go('[data-plan-days="30"]'); await go(); await go(); await go();
            const options = $$('[data-start]').length, label = btn().innerText.trim();
            btn().click(); await sleep(700);
            return { options, label, test: /find your English level/i.test($('[data-lingo-session] [data-answer-area] h1')?.innerText || ''), sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.options, result.label.toUpperCase()], [0, 'START LEARNING'], 'no choice of where to start');
        assert.deepEqual(result.sent.map((c) => c[0]), ['/linguistic/about', '/linguistic/knows', '/linguistic/plan', '/linguistic/level']);
        assert.deepEqual(result.sent[1][1], { speak: ['kn'], write: ['kn'], read: ['kn'] }, 'the language they know, ticked');
        assert.deepEqual(result.sent[3][1], { level: 'beginner' }, 'Beginner, though they said they know some');
        assert.equal(result.test, false, 'no placement test opened');
    });

    test('the dashboard (where the section opens; its tabs none lit), like the profile dashboard: welcome, continue, skills, levels, badges (2026-10-26)', async () => {
        const modules = [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }, { id: 'grammar', total: 6, completed: 1, average: null }];
        const dash = { ...DASH, modules, plan: ROADMAP.plan, today: { xp: 10, lessons: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 390, script: `
            await sleep(1200);
            return {
                tab: $('nav[aria-label="Language Learning"] a[aria-current="page"]')?.dataset.tab || null, tabs: $$('nav[aria-label="Language Learning"] a').map((a) => a.dataset.tab),
                tabTiles: $$('nav[aria-label="Language Learning"] [data-tab-node]').map((x) => !!x.querySelector('svg') && x.getBoundingClientRect().bottom <= x.nextElementSibling.getBoundingClientRect().top + 1),
                flowLine: (() => { const nodes = $$('[data-tab-node]').map((x) => x.getBoundingClientRect()); const line = $('[data-tab-flow] > span').getBoundingClientRect(); const mid = (r) => (r.top + r.bottom) / 2; return nodes.every((n) => Math.abs(mid(n) - mid(line)) < 3) && line.left >= nodes[0].left && line.right <= nodes[3].right; })(),
                welcome: !!$('[data-lingo-welcome]'), message: text($('[data-lingo-welcome-line]')), pictures: $$('[data-lingo-welcome] img').map((i) => i.getAttribute('src').split('/').pop()), tiles: $$('[data-lingo-dashboard] .lift').length, road: $$('[data-roadmap-day]').map((x) => x.dataset.roadmapDay + ':' + x.dataset.state), cheer: $('[data-plan-cheer]')?.dataset.planCheer, side: ['[data-plan-card]', '[data-quests]'].filter((q) => $('[data-lingo-dashboard-cards] ' + q)).length, quick: $$('[data-lingo-quick] > a, [data-lingo-quick] > div').map((x) => [Object.keys(x.dataset)[0], !!x.querySelector('svg'), text(x.querySelector('.rounded-xl'))]), quickLine: !!$('[data-lingo-quick] > span'), removed: ['[data-lingo-plan-card]', '[data-lingo-week]', '[data-lingo-badges-strip]'].filter((q) => $(q)),
                stats: [$('[data-xp]')?.dataset.xp, !!$('[data-course-chip]')], cont: text($('[data-lingo-continue]')), href: $('[data-lingo-continue]')?.getAttribute('href'),
                skills: $$('[data-skill]').length, levels: $$('[data-level-row]').length, skillIcons: $$('[data-skill]').map((x) => [!!x.querySelector('[data-skill] a svg'), x.querySelector('a')?.getAttribute('href')]), levelIcons: $$('[data-level-row] svg').length, skillRow: new Set($$('[data-skill]').map((x) => Math.round(x.getBoundingClientRect().top))).size,
                wide: (() => { ${WIDE} })()
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.tab, result.tabs], [null, ['Learn', 'Practice', 'Writing', 'Badges']], 'the tabs on the dashboard too (2026-10-27), none lit; as a flow, the badges last (2026-10-29)');
        assert.deepEqual(result.tabTiles, [true, true, true, true], 'each tab a tile with its picture, its name in a pill under it (2026-10-29)');
        assert.equal(result.flowLine, true, 'one line through the middle of the tiles, first to last');
        assert.equal(result.href, '/linguistic?lesson=r4', 'Continue opens the path at that lesson');
        assert.deepEqual(result.stats, ['340', true], 'the language, level, streak and XP bar, on the dashboard');
        assert.equal(result.side, 2, 'the side panel\'s roadmap and daily quests, on the dashboard');
        assert.deepEqual(result.quick.map(([k, art]) => [k, art]), [['lingoContinue', true], ['placementCta', true], ['mistakes', true]], 'continue, the level and the mistakes as three icons in a row (2026-10-29)');
        assert.equal(result.quickLine, false, 'no line joining them (2026-10-29, "remove that")');
        assert.deepEqual([result.road, result.cheer], [['1:today', '8:ahead', '15:ahead', '22:ahead', '30:ahead'], 'orange'], 'the roadmap\'s road: day 3 of 30, past Day 1; one lesson behind, "Catch up!" (2026-10-27)');
        assert.deepEqual([result.welcome, result.tiles, result.removed, result.levels], [true, 0, [], DASH.levels.length], 'no number tiles, roadmap or week (taken off)');
        assert.match(result.cont, /Articles: a, an and the|Continue/);
        assert.equal(result.message, 'Welcome to Language Learning!', 'only the welcome, no other text');
        assert.ok(result.pictures.every((p) => /wave-hi/.test(p)), `the mascot only, no profile photo (${result.pictures})`);
        assert.equal(result.skills, 2);
        assert.ok(result.skillIcons.every(([art, href]) => art && href.startsWith('/linguistic')), 'each skill an icon that opens it (2026-10-29)');
        assert.equal(result.skillRow, 1, 'the skills in one row');
        assert.ok(result.levelIcons >= DASH.levels.length, 'a medal for each level');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('the dashboard\'s "Your languages" (2026-10-28): how many and which they speak, write and read, the language learnt beside them; asked when not said yet', async () => {
        const said = { ...DASH, knows: { speak: ['kn', 'hi'], write: ['kn'], read: ['kn', 'hi'] }, modules: [{ id: 'speaking', total: 10, completed: 2, average: null }, { id: 'reading', total: 8, completed: 4, average: null }] };
        const a = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': said }), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1300);
            return { rows: $$('[data-knows-row]').map((r) => [r.dataset.knowsRow, r.dataset.count, !!r.querySelector('[data-knows-learning]')]), text: text($('[data-knows-row="speak"]')), wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(a.errors, []);
        assert.equal(a.result.__error, undefined, a.result.__error);
        assert.deepEqual(a.result.rows, [['speak', '2', false], ['write', '1', false], ['read', '2', false]], 'counts; no "English · learning N%" (removed 2026-10-28)');
        assert.match(a.result.text, /Speak · 2 languages/); assert.doesNotMatch(a.result.text, /learning \d+%/);
        assert.ok(a.result.wide <= 1, `nothing wider than the phone (${a.result.wide}px)`);

        const b = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': { ...DASH, knows: null } }, '(url, body) => ({ knows: body })'), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1300);
            const out = { ask: !!$('[data-knows-ask]') };
            $('[data-knows-start]').click(); await sleep(300);
            out.first = $('[data-knows-sheet]')?.dataset.knowsSheet;
            out.grey = $('[data-knows-next]').disabled;
            $('[data-knows="kn"]').click(); await sleep(80); $('[data-knows-next]').click(); await sleep(200);
            $('[data-knows="kn"]').click(); await sleep(80); $('[data-knows-next]').click(); await sleep(200);
            $('[data-knows="kn"]').click(); await sleep(80); $('[data-knows="hi"]').click(); await sleep(80);
            out.label = text($('[data-knows-next]'));
            $('[data-knows-next]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.closed = !$('[data-knows-sheet]');
            return out;` });
        assert.deepEqual(b.errors, []);
        assert.equal(b.result.__error, undefined, b.result.__error);
        assert.deepEqual([b.result.ask, b.result.first, b.result.grey, b.result.label], [true, 'speak', true, 'Save'], 'not said yet: asked, speak first, one needed');
        assert.deepEqual(b.result.sent, [['/linguistic/knows', { speak: ['kn'], write: ['kn'], read: ['kn', 'hi'] }]]);
        assert.equal(b.result.closed, true);
    });

    test('on a laptop the dashboard takes the whole width: every card in two columns that start and end on one line (2026-10-26)', async () => {
        const dash = { ...DASH, modules: [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }], plan: ROADMAP.plan };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1400, script: `
            await sleep(1200);
            const cards = $$('[data-lingo-dashboard-cards] > * > *').map((c) => c.getBoundingClientRect());
            const lefts = [...new Set(cards.map((c) => Math.round(c.left)))];
            const bottom = (x) => Math.max(...cards.filter((c) => Math.round(c.left) === x).map((c) => c.bottom));
            const tops = lefts.map((x) => Math.min(...cards.filter((c) => Math.round(c.left) === x).map((c) => c.top)));
            const bar = ['[data-lingo-close]', 'nav[aria-label="Language Learning"]', '[data-lingo-stats]'].map((q) => $(q).getBoundingClientRect());
            const row = bar.every((r) => Math.abs((r.top + r.bottom) / 2 - (bar[0].top + bar[0].bottom) / 2) < 8) && bar[0].right <= bar[1].left && bar[1].right <= bar[2].left;
            return { row, aside: !!$('aside[aria-label="Your progress"]'), width: Math.round($('[data-lingo-dashboard]').getBoundingClientRect().width),
                columns: lefts.length, even: Math.round(Math.abs(bottom(lefts[0]) - bottom(lefts[1]))), tallest: Math.round(Math.max(...cards.map((c) => c.height))),
                topsLevel: Math.round(Math.abs(tops[0] - tops[1])), wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.aside, result.columns, result.topsLevel], [false, 2, 0], 'two columns, starting level');
        assert.equal(result.row, true, 'one top row: ✕, the tabs, then the language, level, streak and XP (2026-10-27)');
        assert.ok(result.even <= 1, `the two columns end on one line (${result.even}px apart)`);
        assert.ok(result.width > 1000, `the full width (${result.width}px)`);
        assert.ok(result.wide <= 1);
    });

    test('Continue where you stopped: the path, at that lesson, its START card open (2026-10-26)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic?lesson=g1'), api: apiModule(SHELL_API), styles: true, script: `
            await sleep(1200);
            return { tabs: $$('nav[aria-label="Language Learning"] a').map((a) => a.dataset.tab), card: $('[data-lesson-card]')?.dataset.lessonCard || null };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.tabs, result.card], [[], 'g1'], 'the path, without the tabs (2026-10-27), at that lesson');
    });

    test('inside pages: a click on the empty page opens the dashboard; not on a banner, nor a click that only closes the START card (2026-10-26)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic?lesson=g1'), api: apiModule(SHELL_API), styles: true, script: `
            await sleep(1200);
            const tap = async (el) => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); await sleep(500); };
            const blank = () => $('[data-node="v2"]').closest('.w-full');
            const card = !!$('[data-lesson-card="g1"]');
            await tap(blank());
            const closing = { card: !!$('[data-lesson-card]'), dashboard: !!$('[data-lingo-dashboard]') };
            await tap($('[data-unit-title]'));
            const banner = !!$('[data-lingo-dashboard]');
            await tap(blank());
            return { card, closing, banner, after: !!$('[data-lingo-dashboard]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.card, true);
        assert.deepEqual(result.closing, { card: false, dashboard: false }, 'the first click only closes the START card');
        assert.equal(result.banner, false, 'a click on a unit banner stays');
        assert.equal(result.after, true, 'a click on the empty page opens the dashboard');
    });

    test('straight to Advanced (2026-10-31): under the locked section, the Advanced entry test; it opens; tried and not passed, it says they learn from Beginner', async () => {
        const advanced = (jump) => ({ level: 'advanced', label: 'Advanced', passingScore: 75, open: false, total: 1, completed: 0, complete: false, certificate: null, jump, units: [
            { id: 'advanced-reading', index: 1, kind: 'track', title: 'Reading', open: false, lessons: [lesson('a1', 'Reading 1', { module: 'reading', level: 'advanced', open: false })] }] });
        const pathWith = (jump) => ({ ...PATH, levels: [PATH.levels[0], advanced(jump)] });
        const JT = { id: 'jt', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Beginner assessment', review: 'assessment', direction: null, passingScore: 50, learn: { intro: 'The jump test.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, words: [], quiz: [] };
        const { result, errors } = await screen({ entry: app('/linguistic?section=advanced'), api: apiModule({ '/linguistic/lessons/jt': JT, ...SHELL_API, '/linguistic/path': pathWith({ from: 'beginner', status: 'new' }) }, `(url) => url.endsWith('/jump') ? { level: 'advanced', lesson: 'jt', module: 'vocabulary' } : {}`), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1300);
            const box = $('[data-section="advanced"] [data-jump-test]');
            const before = { status: box?.dataset.jumpTest, text: text(box) };
            $('[data-jump-start]').click(); await sleep(800);
            return { before, sent: window.__calls.find((c) => c[1].endsWith('/jump'))?.[2], opened: window.__calls.some((c) => c[0] === 'GET' && c[1].endsWith('/lessons/jt')), wide: 0 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.before.status, 'new');
        assert.match(result.before.text, /Advanced entry test.*20 questions, 10 on Beginner and 10 on Advanced.*half of each right and Advanced opens now.*learn from Section 1, Beginner.*one try/s);
        assert.deepEqual(result.sent, { level: 'advanced' });
        assert.equal(result.opened, true, 'the test opened');

        const failed = await screen({ entry: app('/linguistic?section=advanced'), api: apiModule({ ...SHELL_API, '/linguistic/path': pathWith({ from: 'beginner', status: 'failed', percent: 45 }) }), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1300);
            return { status: $('[data-section="advanced"] [data-jump-test]')?.dataset.jumpTest, text: text($('[data-section="advanced"] [data-jump-test]')), button: !!$('[data-jump-start]') };` });
        assert.deepEqual(failed.errors, []);
        assert.deepEqual([failed.result.status, failed.result.button], ['failed', false], 'one try');
        assert.match(failed.result.text, /took the Advanced entry test \(45%\): you learn from Section 1, Beginner\. Finish it and pass its assessment to open Advanced/);
    });

    for (const passed of [false, true]) {
        test(`the jump test's result (2026-10-31): ${passed ? 'passed, straight to Advanced' : 'not passed, back to the start of Beginner, no second try'}`, async () => {
            const JT = { id: 'jt', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Beginner assessment', review: 'assessment', direction: null, passingScore: 50, learn: { intro: 'The jump test.' },
                progress: { status: 'started', step: 'quiz', bestScore: null, attempts: 0 }, words: [], quiz: [{ id: 'q1', type: 'mcq', kind: 'review', prompt: 'What is “ಮನೆ”?', options: ['house', 'water', 'tree', 'sun'] }] };
            const R = { score: passed ? 12 : 9, total: 20, percent: passed ? 60 : 45, passed, passingScore: 50, firstPass: passed, bestScore: passed ? 60 : 45, results: [], next: null, certificate: null, events: [],
                jump: { from: 'beginner', to: 'advanced', passed, halves: [{ level: 'beginner', percent: passed ? 70 : 80 }, { level: 'advanced', percent: passed ? 50 : 10 }] } };
            const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/jt'), api: apiModule({ '/linguistic/lessons/jt': JT, ...SHELL_API }, `(url) => url.endsWith('/quiz/check') ? { correct: true, answer: 'house' } : url.endsWith('/quiz') ? ${JSON.stringify(R)} : {}`), styles: true, device: DEVICES.galaxyA55, script: `
                ${DRIVE}
                await sleep(1000);
                for (let i = 0; i < 8 && !$('[data-finish]'); i++) {
                    const pick = $$('[data-option]').find((b) => b.innerText.trim().endsWith('house'));
                    if (pick && pick.getAttribute('aria-pressed') !== 'true' && pick.getAttribute('aria-checked') !== 'true' && !pick.dataset.picked) { pick.click(); pick.dataset.picked = '1'; await sleep(80); }
                    await press(); await sleep(250);
                }
                await sleep(400);
                const out = { finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), body: text($('[data-finish]')), stats: $$('[data-stat]').map(text), buttons: $$('[data-finish] button, footer button').map(text).filter(Boolean) };
                $('footer [data-primary]')?.click(); await sleep(400);
                out.went = text($('[data-where]')) || location.pathname;
                out.calls = window.__calls.filter((c) => c[0] === 'GET').map((c) => c[1]).slice(-3);
                return out;` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.equal(result.finish, passed ? 'pass' : 'fail');
            assert.equal(result.title, passed ? 'You can go straight to Advanced!' : 'Not yet: you start from Beginner');
            if (passed) assert.match(result.body, /60% on the Advanced entry test, with half of each part right: Advanced is open/);
            else assert.match(result.body, /45%\. To go straight to Advanced you needed 50% or more on both Beginner and Advanced\. You learn from the start of Beginner: finish it and pass its assessment to open Advanced/);
            assert.ok(result.stats.some((x) => /Beginner/i.test(x) && x.includes(passed ? '70%' : '80%')) && result.stats.some((x) => /Advanced/i.test(x) && x.includes(passed ? '50%' : '10%')), `how each half went (${result.stats})`);
            assert.ok(!result.buttons.some((b) => /try again|retake/i.test(b)), `no second try (${result.buttons})`);
            assert.ok(result.buttons.some((b) => (passed ? /Go to Advanced/ : /Start Beginner/).test(b)), `${result.buttons}`);
        });
    }

    for (const [name, device] of [['phone', DEVICES.galaxyA55], ['laptop', { width: 1366, height: 900, dpr: 1, mobile: false }]]) {
        test(`the picture stories on a ${name} (2026-10-31): a comic page of panels — title, captions, bubbles over their speakers and clear of faces, narration — then its questions, the story there again`, async () => {
            const looks = [];
            // English, Kannada and Hindi whole; of the other 18 languages a story each in the scripts that differ most (right to left, CJK, long words).
            const SAMPLE = ['ar:comic-advanced-1', 'zh:comic-advanced-2', 'ja:comic-advanced-3', 'ko:comic-advanced-4', 'ta:comic-advanced-3', 'ml:comic-advanced-4', 'de:comic-advanced-1', 'ru:comic-advanced-2', 'ur:comic-advanced-1', 'bn:comic-advanced-4'];
            const stubs = comics.stubs().filter((x) => [null, 'kn', 'hi'].includes(x.course) || SAMPLE.includes(x.seedKey));
            assert.equal(stubs.length, 22);
            for (const [k, stub] of stubs.entries()) {
                const built = comics.build(stub, 'en');
                const LESSON = { id: 'cm', module: 'reading', moduleLabel: 'Reading and Writing', level: 'advanced', title: built.title, review: 'comic', direction: null, passingScore: 75, language: 'kn', languageName: 'Kannada',
                    learn: built.learn, comic: built.comic, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, writing: [],
                    quiz: built.quiz.map(({ id, type, prompt, options }) => ({ id, type, prompt, options })) };
                const { result, errors } = await screen({ entry: app('/linguistic/reading/cm'), api: apiModule({ '/linguistic/lessons/cm': LESSON, ...SHELL_API }), styles: true, device, script: `
                    ${DRIVE}
                    await sleep(1300);
                    for (let i = 0; i < 3 && !$('[data-comic]'); i++) await press();
                    await sleep(400);
                    const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
                    const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
                    const panels = $$('[data-comic-panel]');
                    const checks = panels.map((p) => {
                        const box = p.firstElementChild.getBoundingClientRect();
                        const bubbles = [...p.querySelectorAll('[data-bubble] > p')].map((b) => b.getBoundingClientRect());
                        const cap = p.querySelector('[data-comic-caption], [data-comic-title]')?.getBoundingClientRect();
                        // A face: the head's lower two thirds (a bubble's tail may touch the top of it).
                        const faces = [...p.querySelectorAll('[data-head]')].map((h) => { const r = h.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top + r.height / 3, bottom: r.bottom }; });
                        return { inside: bubbles.every((b) => inside(b, box)), apart: bubbles.every((b, i) => bubbles.every((c, j) => i === j || !overlap(b, c))), clear: !cap || bubbles.every((b) => !overlap(b, cap)), faces: faces.filter((f) => bubbles.some((b) => overlap(b, f))).length, wide: Math.round(box.width),
                            where: JSON.stringify({ box: [box.top, box.height].map(Math.round), bubbles: bubbles.map((b) => [b.left, b.top, b.right, b.bottom].map(Math.round)), faces: faces.map((f) => [f.left, f.top, f.right, f.bottom].map(Math.round)) }) };
                    });
                    const page = $('[data-comic-page]');
                    const out = { panels: panels.length, columns: page.dataset.columns, checks, title: text($('[data-comic-title]')), narration: text($('[data-comic-narration]')), read: !!$('[data-comic-read]'),
                        theme: $('[data-comic]').dataset.comicTheme, titleStyle: $('[data-comic-title]')?.dataset.comicTitle, bubbleStyle: $('[data-bubble-style]')?.dataset.bubbleStyle, moral: text($('[data-comic-moral]')), zooms: $$('[data-zoom]').length,
                        frame: getComputedStyle(panels[0]).borderTopColor + ' ' + getComputedStyle(panels[0]).borderTopLeftRadius,
                        wideFirst: Math.round($('[data-comic-panel="0"]').getBoundingClientRect().width), wide: (() => { ${SESSION_WIDE} })() };
                    // On to its questions: the story there again, to look back at.
                    await press(); await sleep(300); await press(); await sleep(400);
                    out.question = text($('[data-answer-area] h1'));
                    const peek = $$('[data-answer-area] button[aria-expanded]').find((b) => /again/.test(b.innerText));
                    out.peek = text(peek);
                    peek?.click(); await sleep(300);
                    out.peekComic = !!$('[data-answer-area] [data-comic]');
                    return out;` });
                const story = `${built.comic.title} on a ${name}`;
                assert.deepEqual(errors, [], story);
                assert.equal(result.__error, undefined, result.__error);
                assert.equal(result.panels, built.comic.panels.length, story);
                // Its own layout (2026-10-31): Three Silver Coins three to a row on a wide page, the others two.
                assert.equal(result.columns, name === 'phone' ? '1' : built.comic.theme === 'journey' ? '3' : '2', story);
                assert.equal(result.theme, built.comic.theme);
                assert.ok(result.moral.toLowerCase().includes(built.comic.moral.slice(0, 12).toLowerCase()) && result.moral.toLowerCase().startsWith((built.comic.moralLabel || 'moral:').toLowerCase()), `${story}: its moral at the end (${result.moral})`);
                assert.ok(result.zooms >= 1, `${story}: a close-up among its panels`);
                looks.push([result.theme, result.titleStyle, result.bubbleStyle, result.frame].join(' · '));
                assert.equal(result.title.toLowerCase(), built.comic.title.toLowerCase(), `${story}: its title, in capitals as a comic has it`);
                assert.ok(result.narration, `${story}: a line of narration under its first panel`);
                assert.equal(result.read, true, `${story}: Read aloud`);
                for (const [i, c] of result.checks.entries()) {
                    assert.equal(c.inside, true, `${story}, panel ${i + 1}: its bubbles inside it`);
                    assert.equal(c.apart, true, `${story}, panel ${i + 1}: no bubble over another`);
                    assert.equal(c.clear, true, `${story}, panel ${i + 1}: no bubble over the caption`);
                    assert.equal(c.faces, 0, `${story}, panel ${i + 1}: no bubble over a face (${c.where})`);
                }
                if (name === 'laptop') assert.ok(result.checks[1].wide < result.wideFirst * 0.6, `${story}: two to a row, the first across the page`);
                assert.ok(result.wide <= 1, `${story}: nothing wider than the screen (${result.wide}px)`);
                assert.equal(result.question, built.quiz[0].prompt, `${story}: then its questions`);
                assert.equal(result.peek, `See “${built.comic.title}” again`);
                assert.equal(result.peekComic, true, `${story}: the story there again`);
            }
            // Not the same design for every story (2026-10-31): each its own look, title and frame (the same in each language).
            assert.equal(new Set(looks.map((l) => l.split(' · ')[1])).size, 4, `four title styles (${looks.join(' | ')})`);
            assert.equal(new Set(looks.map((l) => l.split(' · ')[3])).size, 4, `four panel frames (${looks.join(' | ')})`);
        });
    }

    const LEARNT = { course: { code: 'en', name: 'English', locale: 'en-IN' }, levels: [
        { level: 'beginner', label: 'Beginner', units: [
            { id: 'beginner-0', title: 'Letters', lessons: [{ id: 'l1', title: 'Letters: A to E', letters: [{ letter: 'A', sound: 'ay', speak: 'ay', word: 'apple', pic: '🍎', sentence: 'I eat a red apple.', locale: 'en-IN' }, { letter: 'B', sound: 'bee', speak: 'bee', word: 'ball', pic: '⚽', sentence: 'The boy kicks the ball.', locale: 'en-IN' }] }] },
            { id: 'beginner-1', title: 'Family', lessons: [{ id: 'l2', title: 'Family words', words: [{ word: 'mother', meaning: 'ತಾಯಿ', locale: 'en-IN' }, { word: 'father', meaning: 'ತಂದೆ', locale: 'en-IN' }] },
                { id: 'l3', title: 'Translation', sentences: [{ text: 'I drink water every morning before I go to school with my brother.', meaning: 'ನಾನು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ನೀರು ಕುಡಿಯುತ್ತೇನೆ.' }] }] }] },
        { level: 'advanced', label: 'Advanced', units: [{ id: 'advanced-stories', title: 'Stories', lessons: [{ id: 'l4', title: 'Picture story: The Shared Well', story: { title: 'The Shared Well', moral: 'What we share keeps flowing.', moralLabel: 'Moral:' } }] }] }] };
    // Units of 2 to 10 lessons, one after another, so the circles start at every point of their zigzag.
    const LONG_PATH = { ...PATH, current: 'u2-0', levels: [{ ...PATH.levels[0], units: Array.from({ length: 9 }, (_, k) => ({
        id: `beginner-${k + 1}`, index: k + 1, kind: 'topic', title: `Unit ${k + 1}`, open: true,
        lessons: Array.from({ length: k + 2 }, (_, i) => lesson(`u${k + 2}-${i}`, `Lesson ${i + 1}`, { order: k + 1, status: k === 0 ? 'completed' : 'new' })) })) }] };
    for (const [name, device] of [['Galaxy Z Fold folded', DEVICES.galaxyZFold6Folded], ['Galaxy A55', DEVICES.galaxyA55], ['Pixel 9', DEVICES.pixel9]]) {
        test(`the learning path on a ${name} (2026-11-03): the mascot beside the circles, never behind one`, async () => {
            const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/path': LONG_PATH }), styles: true, device, script: `
                await sleep(1500);
                const overlap = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
                const units = $$('[data-unit]').map((u) => {
                    const m = u.querySelector('img[src^="/mascot/stills/"]').getBoundingClientRect();
                    const nodes = [...u.querySelectorAll('[data-node]')];
                    return [u.dataset.unit, nodes.length, nodes.filter((b) => overlap(b.getBoundingClientRect(), m)).length];
                });
                return { units, wide: (() => { ${WIDE} })() };` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.equal(result.units.length, 9);
            assert.deepEqual(result.units.map(([, n]) => n), [2, 3, 4, 5, 6, 7, 8, 9, 10], 'every unit drawn');
            assert.deepEqual(result.units.filter(([, , hit]) => hit > 0), [], 'no circle behind the mascot');
            assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
        });
    }

    for (const [name, size] of [['phone', { device: DEVICES.galaxyA55 }], ['laptop', { width: 1440, height: 900 }]]) {
        test(`the notes at the top of the learning path on a ${name} (2026-11-02): a card beside the roadmap and all sections, opening the notes`, async () => {
            const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/learnt': LEARNT, ...SHELL_API }), styles: true, ...size, script: `
                await sleep(1500);
                const cards = [...$('[data-path-top]').children];
                const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; };
                const out = { cards: cards.map((c) => c.dataset.roadmapLink !== undefined ? 'roadmap' : c.dataset.allSections !== undefined ? 'sections' : c.dataset.notesLink !== undefined ? 'notes' : 'section'), boxes: cards.map(box), card: text($('[data-notes-link]')) };
                out.wide = (() => { ${WIDE} })();
                $('[data-notes-link]').click(); await sleep(1200);
                out.page = [!!$('[data-notes-page]'), $$('[data-notes-topic]').length];
                return out;` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual(result.cards, ['roadmap', 'sections', 'notes', 'section']);
            assert.match(result.card, /^Your notes (From \d+ lessons? you finished|What you learn is written here)$/);
            if (name === 'laptop') assert.equal(new Set(result.boxes.map(String)).size, 1, `four in one row, one height (${JSON.stringify(result.boxes)})`);
            assert.deepEqual(result.page, [true, 3], 'tapped: the notes, every topic there');
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });
    }

    test('the notes page on a phone (2026-11-02): what was learnt in the lessons finished — letters, words, sentences, stories — searched, and each topic one tap away', async () => {
        const find = (v) => `{ const el = $('[data-notes-search]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(200); }`;
        const { result, errors } = await screen({ entry: app('/linguistic/notes'), api: apiModule({ '/linguistic/learnt': LEARNT, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1500);
            const out = { doors: !!$('[data-door]'), counts: text($('[data-notes-counts]')), topics: $$('[data-notes-topic]').map(text),
                letters: $$('[data-notes-letter]').length, words: $$('[data-notes-word]').length, sentences: $$('[data-notes-sentence]').length, story: text($('[data-notes-story]')),
                open: $('[data-notes-lesson="l2"] [data-notes-open]').getAttribute('href') };
            out.wide = (() => { ${WIDE} })();
            const box = () => $('[data-notes-unit="advanced-stories"]').getBoundingClientRect();
            const before = box();
            $('[data-notes-topic="advanced-stories"]').click(); await sleep(1200);
            const after = box();
            out.went = [before.top > innerHeight, after.top >= 0 && after.bottom <= innerHeight + 1];
            ${find('moth')}
            out.found = [$$('[data-notes-word]').map(text), $$('[data-notes-unit]').map((u) => u.dataset.notesUnit)];
            ${find('ತಾಯಿ')}
            out.byMeaning = $$('[data-notes-word]').length;
            ${find('zzz')}
            out.none = !!$('[data-notes-none]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.doors, false, 'its own page, not a dashboard card (the card removed 2026-11-02)');
        assert.equal(result.counts, '2 words 2 letters 1 sentence 1 story');
        assert.deepEqual(result.topics, ['1 · Letters', '1 · Family', '2 · Stories'], 'every topic, to go to');
        assert.deepEqual([result.letters, result.words, result.sentences, result.story], [2, 2, 1, '📖 The Shared Well Moral: What we share keeps flowing.']);
        assert.equal(result.open, '/linguistic?lesson=l2', 'each lesson can be opened again');
        assert.deepEqual(result.went, [true, true], 'a topic tapped: below the screen before, on it at once');
        assert.deepEqual(result.found, [['mother ತಾಯಿ'], ['beginner-1']], 'searched: only what matches');
        assert.equal(result.byMeaning, 1, 'by its meaning too');
        assert.equal(result.none, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    // The hello bubble over the scene (2026-11-03, user's picture: on a smaller screen it covered the heading): at every
    // width it says hello in the course's language, sits whole inside the picture, clear of the words beside it.
    for (const [name, size] of [['Galaxy A55', { device: DEVICES.galaxyA55 }], ['Pixel 9', { device: DEVICES.pixel9 }], ['iPad Mini', { device: DEVICES.iPadMini }], ['tablet 820', { width: 820, height: 1180, dpr: 2, mobile: true }], ['laptop 1024', { width: 1024, height: 768 }], ['laptop 1280', { width: 1280, height: 800 }], ['laptop 1440', { width: 1440, height: 900 }], ['screen 1920', { width: 1920, height: 1080 }]]) {
        test(`the hello bubble on a ${name} (2026-11-03): in the course's language, inside the picture, clear of the heading`, async () => {
            const dash = { ...DASH, course: { code: 'hi', name: 'Hindi', locale: 'hi-IN' } };
            const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, ...size, script: `
                await sleep(1500);
                const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
                const bubble = [...document.querySelectorAll('[data-lingo-hello]')].find((b) => b.getBoundingClientRect().width > 0);
                const scene = $('[data-lingo-welcome] img').parentElement;
                const cs = getComputedStyle(scene);
                return { bubble: r(bubble), hello: bubble ? text(bubble) : null, scene: r(scene), heading: r($('[data-lingo-welcome-line]')), button: r($('[data-lingo-continue]')),
                    clips: cs.overflow === 'hidden', fades: /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''), wide: (() => { ${WIDE} })() };` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            const { bubble, scene, heading, button } = result;
            const where = JSON.stringify(result);
            const overlap = (a, b) => a[0] < b[2] - 1 && a[2] > b[0] + 1 && a[1] < b[3] - 1 && a[3] > b[1] + 1;
            // Always drawn over the picture's own bubble, in the course's language (2026-11-03, user: "in that place show
            // the Hindi text", on a laptop where the picture is cut on its left and its こんにちは showed through).
            // 2026-11-03, then "give the correct alignment": whole and sharp, not faded with the picture's left edge.
            const H = scene[3] - scene[1], W = scene[2] - scene[0];
            if (!bubble) { assert.ok(!size.device && size.width >= 1024 && W / H < 2.75, `a hello bubble, unless the picture is cut past the mascot's head (${where})`); return; }
            assert.match(result.hello, /^नमस्ते! Let’s learn together!/, 'hello in Hindi, the course\'s language');
            assert.ok(bubble[0] >= scene[0] - 1 && bubble[2] <= scene[2] + 1 && bubble[1] >= scene[1] - 1 && bubble[3] <= scene[3] + 1, `whole, inside the picture (${where})`);
            assert.equal(result.fades, false, 'the picture fades, not the box the bubble is in');
            // Where the picture holds the painted bubble whole, exactly on it.
            if (!size.device && size.width >= 1024 && W - 3.552 * H >= 0) assert.ok(Math.abs(scene[2] - 2.852 * H - bubble[2]) <= 2, `on the painted bubble (${where})`);
            assert.ok(!overlap(bubble, heading) && !overlap(bubble, button), `clear of the heading and Continue (${where})`);
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });
    }

    test('the dashboard doors on a laptop (2026-10-31): the lit Start door level with the others, its outline inside its edge', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API), styles: true, width: 1440, height: 900, script: `
            await sleep(1300);
            const doors = $$('[data-door]');
            const box = (b) => { const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; };
            const home = $('[data-door="home"]');
            return { ids: doors.map((d) => d.dataset.door), lit: home.dataset.active === 'true', boxes: doors.map(box), ring: getComputedStyle($('[data-door-ring]')).boxShadow, outside: getComputedStyle(home).boxShadow };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.ids, result.lit], [['home', 'learn', 'writing', 'practice', 'badges'], true]);
        assert.equal(new Set(result.boxes.map(String)).size, 1, `all five on one line, one size (${JSON.stringify(result.boxes)})`);
        assert.match(result.ring, /inset/, 'the outline inside the card');
        assert.doesNotMatch(result.outside, /rgb\(30, 136, 240\) 0px 0px 0px 3px/, 'no outline outside it');
    });

    test('the dashboard bubble says hello in the language being learnt, in its own letters, on one line inside the bubble (2026-10-31)', async () => {
        for (const [code, name, hello] of [['ja', 'Japanese', 'こんにちは！'], ['de', 'German', 'Hallo!'], ['kn', 'Kannada', 'ನಮಸ್ಕಾರ!'], ['pa', 'Punjabi', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ!'], ['ur', 'Urdu', 'السلام علیکم!'], ['en', 'English', 'Hello!']]) {
            const dash = { ...DASH, course: { code, name, native: name, full: true } };
            const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1366, height: 900, script: `
                await sleep(1300);
                const bubble = $('[data-lingo-hello]');
                const line = bubble?.firstElementChild;
                const [b, l] = [bubble.getBoundingClientRect(), line.getBoundingClientRect()];
                return { code: bubble?.dataset.lingoHello, hello: text(line), lang: line.lang, fits: line.scrollWidth <= line.clientWidth + 1 && l.left >= b.left && l.right <= b.right, oneLine: l.height < parseFloat(getComputedStyle(line).fontSize) * 1.6, size: getComputedStyle(line).fontSize };` });
            assert.deepEqual(errors, [], name);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual([result.code, result.hello, result.lang], [code, hello, code], `${name}: its hello`);
            assert.equal(result.fits, true, `${name}: inside the bubble (${result.size})`);
            assert.equal(result.oneLine, true, `${name}: on one line`);
        }
    });

    test('every letter on one page (2026-10-31): the sound above each letter, tapped it is heard; the kagunita slides sideways on a phone', async () => {
        const CHART = { course: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' }, locale: 'kn-IN',
            groups: [{ id: 'vowels', title: 'Vowels', letters: [{ char: 'ಅ', say: 'a' }, { char: 'ಆ', say: 'aa' }, { char: 'ಇ', say: 'i' }] }, { id: 'consonants-1', title: 'Consonants 1', letters: [{ char: 'ಕ', say: 'ka' }, { char: 'ಖ', say: 'kha' }, { char: 'ಳ', say: 'ḷa' }] }, { id: 'signs', title: 'Vowel signs', letters: [{ char: 'ಕಾ', say: 'kaa' }] }],
            table: { columns: ['', 'ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ'].map((sign, i) => ({ sign, say: ['a', 'aa', 'i', 'ii', 'u', 'uu', 'ru', 'e', 'ee', 'ai', 'o', 'oo', 'au', 'am', 'ah'][i] })),
                rows: [['ಕ', 'k'], ['ಖ', 'kh']].map(([c, st]) => ({ char: c, say: `${st}a`, cells: ['', 'ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ'].map((sign, i) => ({ char: c + sign, say: st + ['a', 'aa', 'i', 'ii', 'u', 'uu', 'ru', 'e', 'ee', 'ai', 'o', 'oo', 'au', 'am', 'ah'][i] })) })) } };
        const { result, errors } = await screen({ entry: app('/linguistic/letters'), api: apiModule({ '/linguistic/letters': CHART, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, script: `
            Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => [{ lang: 'hi-IN', name: 'Lekha' }] });
            window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
            window.__spoken = [];
            window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang, u.rate]);
            await sleep(1200);
            const tile = $('[data-letter-tile="ಅ"]');
            const [say, letter] = [...tile.querySelectorAll('span')].map((x) => x.getBoundingClientRect());
            tile.click(); await sleep(100);
            $('[data-letter-tile="ಳ"]').click(); await sleep(100);
            const box = $('[data-kagunita] .overflow-x-auto');
            return { title: text($('[data-letters-chart] h1')), groups: $$('[data-letters-group]').map((g) => g.dataset.lettersGroup), above: say.bottom <= letter.top + 1, tileText: text(tile),
                spoken: window.__spoken, rows: $$('[data-kagunita-row]').length, cells: $$('[data-kagunita-row="ka"] [data-letter-tile]').map((t) => t.dataset.letterTile).slice(0, 3),
                slides: box.scrollWidth > box.clientWidth, wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.title, /Kannada letters/);
        assert.deepEqual(result.groups, ['vowels', 'consonants-1'], 'the vowel signs are in the table');
        assert.equal(result.above, true, 'the English above the letter');
        assert.match(result.tileText, /a\s*ಅ/);
        assert.deepEqual(result.spoken, [['अ', 'hi-IN', 0.75], ['ल', 'hi-IN', 0.75]], 'heard, slowly: Kannada read by the Hindi voice on a device with no Kannada one; ಳ as the nearest sound it has (2026-10-31)');
        assert.deepEqual([result.rows, result.cells], [2, ['ಕ', 'ಕಾ', 'ಕಿ']]);
        assert.equal(result.slides, true, 'the table slides sideways inside its card');
        assert.ok(result.wide <= 1, `the page itself is not wider than the phone (${result.wide}px)`);
    });

    test('Chinese A–Z on the chart (2026-10-31): the English letter above its Chinese name, its pinyin under it, each name on one line from a folded phone to a laptop, heard in Chinese', async () => {
        const CHART = { course: { code: 'zh', name: 'Chinese', native: '中文' }, locale: 'zh-CN',
            groups: [{ id: 'alphabet', title: 'The alphabet A–Z', wide: true, letters: [{ char: '诶', say: 'A', pinyin: 'ēi' }, { char: '比', say: 'B', pinyin: 'bǐ' }, { char: '豆贝尔维', say: 'W', pinyin: 'dòu bèi ěr wéi' }, { char: '艾克斯', say: 'X', pinyin: 'ài kè sī' }] }, { id: 'numbers', title: 'Numbers 一–十', letters: [{ char: '一', say: 'yī' }] }] };
        for (const [name, device] of [['folded phone', DEVICES.galaxyZFold6Folded], ['phone', DEVICES.galaxyA55], ['iPad', DEVICES.iPadMini], ['laptop', { width: 1366, height: 768, dpr: 1 }]]) {
            const { result, errors } = await screen({ entry: app('/linguistic/letters'), api: apiModule({ '/linguistic/letters': CHART, ...SHELL_API }), styles: true, device, script: `
                Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => [{ lang: 'zh-CN', name: 'Tingting' }] });
                window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
                window.__spoken = [];
                window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);
                await sleep(1200);
                const tile = $('[data-letter-tile="豆贝尔维"]');
                const [say, name, pinyin] = [...tile.querySelectorAll('span')];
                const [a, b, c] = [say, name, pinyin].map((x) => x.getBoundingClientRect());
                const size = parseFloat(getComputedStyle(name).fontSize);
                tile.click(); await sleep(100);
                return { parts: [text(say), text(name), text(pinyin)], above: a.bottom <= b.top + 1, under: c.top >= b.bottom - 1 && c.right <= tile.getBoundingClientRect().right, oneLine: b.height < size * 1.6, sizes: [Math.round(b.width), Math.round(b.height), tile.clientWidth, size],
                    spoken: window.__spoken, wide: (() => { ${WIDE} })() };` });
            assert.deepEqual(errors, [], name);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual(result.parts, ['W', '豆贝尔维', 'dòu bèi ěr wéi'], name);
            assert.equal(result.under, true, `${name}: the pinyin under the characters, inside the tile`);
            assert.equal(result.above, true, `${name}: the English letter above its Chinese name`);
            assert.equal(result.oneLine, true, `${name}: the four characters on one line (name ${result.sizes})`);
            assert.deepEqual(result.spoken, [['豆贝尔维', 'zh-CN']], `${name}: read in Chinese`);
            assert.ok(result.wide <= 1, `${name}: the page itself is not wider than the screen (${result.wide}px)`);
        }
    });

    test('Kannada letters no word starts with (2026-11-04, "give the word for that letter"): each with a word it is inside — the letter coloured on its card — matched to its word, never its sound', async () => {
        const built = alphabet.build(alphabet.stubs().find((x) => x.seedKey === 'kn:letters-beginner-2'), 'en');
        const quiz = alphabet.quizOf(built, 'ui').map(({ id, type, kind, prompt, options }) => ({ id, type, kind, prompt, options }));
        const LESSON = { id: 'lk2', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: built.title, review: 'letters', direction: null, passingScore: 60, language: 'en', languageName: 'English',
            course: 'kn', target: 'kn', targetName: 'Kannada', targetLocale: 'kn-IN', learn: built.learn, words: built.words, quiz, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 } };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/lk2'), api: apiModule({ '/linguistic/lessons/lk2': LESSON, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, budget: 40000, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 3 && !$('[data-letter-words]'); i++) await press();
            const card = (ch) => $('[data-letter-word="' + ch + '"]');
            const out = { nga: text(card('ಙ')), coloured: $$('[data-letter-inside]').map((x) => [x.dataset.letterInside, x.textContent]),
                colour: getComputedStyle($('[data-letter-inside]')).color, kappe: !!card('ಕ')?.querySelector('[data-letter-inside]') };
            await press(); await sleep(300);
            out.rights = [];
            for (let round = 0; round < 6 && $('[data-pairs]'); round++) {
                out.rights.push(...$$('[data-pair="kn"]').map((b) => text(b)));
                const words = ${JSON.stringify(Object.fromEntries(alphabet.build(alphabet.stubs().find((x) => x.seedKey === 'kn:letters-beginner-2'), 'en').words.map((w) => [w.word, `${w.pic} ${w.for}`])))};
                for (const l of $$('[data-pair="en"]')) {
                    const letter = l.querySelector('[dir="auto"]').textContent.trim();
                    l.click(); await sleep(60);
                    $$('[data-pair="kn"]').find((r) => text(r) === words[letter])?.click(); await sleep(120);
                }
                await sleep(600);
            }
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.nga, /ಙ.*📚.*ಙ — ವಾಙ್ಮಯ/s, 'ಙ — ವಾಙ್ಮಯ, with its picture');
        assert.deepEqual(result.coloured.find(([m]) => m === 'ಙ'), ['ಙ', 'ಙ್ಮ'], 'ಙ coloured, with the letter joined to it');
        assert.ok(result.coloured.some(([m]) => m === 'ಣ') && result.coloured.some(([m]) => m === 'ಞ'), `ಣ and ಞ too (${JSON.stringify(result.coloured)})`);
        assert.equal(result.colour, 'rgb(224, 134, 0)', 'in orange');
        assert.equal(result.kappe, false, 'a word that starts with its letter is not marked');
        assert.ok(result.rights.length >= built.words.length, `every letter in the pairs (${result.rights.length})`);
        assert.ok(result.rights.every((r) => /^\S+ \S+/.test(r) && !/^[a-zṭḍṇṅñḷṣśāīū]+$/i.test(r)), `each matched to its word and picture, none to a sound (${result.rights.join(' | ')})`);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('an English Letters lesson (2026-10-31): each letter with its word and picture — A for 🍎 apple — tapped and heard; then match the following (letter to word), then "Which sentence has a word that starts with “A”?"', async () => {
        const built = alphabet.build(alphabet.stubs().find((x) => x.seedKey === 'letters-beginner-1'), 'kn');
        const quiz = alphabet.quizOf(built, 'ui').map(({ id, type, kind, prompt, options }) => ({ id, type, kind, prompt, options }));
        const LESSON = { id: 'le', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: built.title, review: 'letters', direction: null, passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: built.learn, words: built.words, quiz, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 } };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/le'), api: apiModule({ '/linguistic/lessons/le': LESSON, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => [{ lang: 'en-IN', name: 'Rishi' }] });
            window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
            window.__spoken = [];
            window.speechSynthesis.speak = (u) => window.__spoken.push(u.text);
            await sleep(1000);
            const kinds = [];
            for (let i = 0; i < 3 && !$('[data-letter-words]'); i++) { kinds.push(text($('[data-answer-area] h1'))); await press(); }
            const cards = $$('[data-letter-word]');
            const out = { cards: cards.map((c) => c.dataset.letterWord), first: text(cards[0]), pairs: !!$('[data-pairs], [data-pair]') };
            cards[0].click(); await sleep(100);
            out.spoken = window.__spoken.slice(-1)[0];
            const inside = cards.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
            out.inside = inside;
            await press(); await sleep(300);
            // Match the following: each letter with its word and picture.
            out.matches = [];
            for (let round = 0; round < 4 && $('[data-pairs]'); round++) {
                const lefts = $$('[data-pair="en"]'), rights = $$('[data-pair="kn"]');
                out.matches.push(lefts.map((b) => text(b)).join('') + ':' + rights.length);
                for (const l of lefts) {
                    const letter = text(l);
                    const word = ${JSON.stringify(Object.fromEntries(alphabet.build(alphabet.stubs().find((x) => x.seedKey === 'letters-beginner-1'), 'kn').words.map((w) => [w.word, `${w.pic} ${w.for}`])))}[letter];
                    l.click(); await sleep(60);
                    rights.find((r) => text(r) === word)?.click(); await sleep(120);
                }
                await sleep(500);
                await press(); await sleep(300);
            }
            out.next = text($('[data-answer-area] h1'));
            await press(); await sleep(300);
            out.question = text($('[data-answer-area] h1'));
            out.options = $$('[data-option]').map(text);
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.cards, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], 'every letter of the lesson');
        assert.match(result.first, /Aa.*🍎.*A for apple.*I eat a red apple\./s, 'its word, and the word in a sentence');
        assert.equal(result.pairs, false, 'no matching');
        assert.equal(result.spoken, 'ay for apple. I eat a red apple.', 'tapped: "A for apple" and its sentence read aloud');
        assert.equal(result.inside, true);
        assert.ok(result.matches.length >= 1 && result.matches.join('').replace(/:\d+/g, '').split('').sort().join('') === 'ABCDEFGHI', `match the following: every letter, to its word (${result.matches})`);
        // Asked in the student's language, Kannada here (2026-11-02: not "H is for …").
        assert.match(result.question, /^“[A-I]” ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುವ ಪದ ಯಾವ ವಾಕ್ಯದಲ್ಲಿದೆ\?$|^“[\w ]+” ಯಾವ ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುತ್ತದೆ\?/, `then the quiz (${result.next})`);
        assert.doesNotMatch(result.question, /is for/);
        assert.ok(result.options.length === 4, `${result.options}`);
        if (/ವಾಕ್ಯದಲ್ಲಿದೆ\?$/.test(result.question)) assert.ok(result.options.every((o) => /\S+ [A-Z].+\.$/.test(o)), `sentences to choose, not single words (${result.options})`);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a Kannada Letters lesson (2026-11-02): ಕ — ಕಪ್ಪೆ with its picture, its sound in English letters, its sentence, the sentence\'s sound and meaning; tapped, heard in Kannada', async () => {
        const built = alphabet.build(alphabet.stubs().find((x) => x.seedKey === 'kn:letters-beginner-2'), 'en');
        const quiz = alphabet.quizOf(built, 'ui').map(({ id, type, kind, prompt, options, say, sayLang }) => ({ id, type, kind, prompt, options, say, sayLang }));
        const LESSON = { id: 'lk', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: built.title, review: 'letters', direction: null, passingScore: 60, language: 'en', languageName: 'English',
            course: 'kn', target: 'kn', targetName: 'Kannada', targetLocale: 'kn-IN', learn: built.learn, words: built.words, quiz, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 } };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/lk'), api: apiModule({ '/linguistic/lessons/lk': LESSON, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => [{ lang: 'kn-IN', name: 'Kannada' }] });
            window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
            window.__spoken = [];
            window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);
            await sleep(1000);
            for (let i = 0; i < 3 && !$('[data-letter-words]'); i++) await press();
            const cards = $$('[data-letter-word]');
            const ka = $('[data-letter-word="ಕ"]');
            const out = { cards: cards.length, ka: text(ka), say: text(ka?.querySelector('[data-letter-word-say]')), sentenceSay: text(ka?.querySelector('[data-letter-sentence-say]')), meaning: text(ka?.querySelector('[data-letter-sentence-en]')),
                inside: cards.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), wide: (() => { ${SESSION_WIDE} })() };
            ka.click(); await sleep(100);
            out.spoken = window.__spoken.slice(-1)[0];
            await press(); await sleep(300);
            out.pairs = $$('[data-pair="kn"]').map(text).slice(0, 2);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.cards, built.words.filter((w) => w.for).length, 'a card for each letter with a word');
        assert.match(result.ka, /ಕ.*🐸.*ಕ — ಕಪ್ಪೆ.*kappe.*ಕಪ್ಪೆ ನೀರಿಗೆ ಹಾರುತ್ತದೆ\./s);
        assert.deepEqual([result.say, result.sentenceSay, result.meaning], ['kappe', 'kappe nīrige hāruttade', 'The frog jumps into the water.']);
        assert.deepEqual(result.spoken, ['ಕ, ಕಪ್ಪೆ. ಕಪ್ಪೆ ನೀರಿಗೆ ಹಾರುತ್ತದೆ.', 'kn-IN'], 'heard in Kannada');
        assert.ok(result.pairs.every((p) => /^\S+ \S+/.test(p)), `then match each letter to its word and picture (${result.pairs})`);
        assert.equal(result.inside, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a Letters lesson (2026-10-31, from scratch): straight to matching each letter with its sound (the cards are the chart\'s), no spelling drill', async () => {
        const LESSON = { id: 'lt', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Letters: Vowels', review: 'letters', direction: null, passingScore: 60, language: 'en', languageName: 'English',
            course: 'hi', target: 'hi', targetName: 'Hindi', targetLocale: 'hi-IN',
            learn: { intro: 'The letters of Hindi: look at each one and hear it, match them to their sounds, then a short quiz.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words: [{ word: 'अ', kannada: 'a', pos: '', example: '', locale: 'hi-IN' }, { word: 'आ', kannada: 'aa', pos: '', example: '', locale: 'hi-IN' }, { word: 'इ', kannada: 'i', pos: '', example: '', locale: 'hi-IN' }, { word: 'ई', kannada: 'ii', pos: '', example: '', locale: 'hi-IN' }],
            quiz: [{ id: 'L~0~sound', type: 'mcq', kind: 'letterSound', prompt: 'How does “अ” sound?', options: ['a', 'aa', 'i', 'ii'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/lt'), api: apiModule({ '/linguistic/lessons/lt': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            let cards = 0;
            for (let n = 0; n < 4 && !$('[data-pairs]'); n++) { if ($('[data-flashcard]')) cards++; await press(); }
            return { cards, pairs: !!$('[data-pairs]'), spelling: !!$('input[placeholder="Type in English"], textarea[placeholder="Type in English"]'), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.cards, 0, 'no letter cards: each letter was seen and heard on the Letters chart (2026-10-31)');
        assert.deepEqual([result.pairs, result.spelling], [true, false], 'letters matched to their sounds; no spelling drill');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('the speaker uses the language\'s own voice; Kannada with no Kannada voice is read by a Telugu or Hindi one (2026-10-31); with none at all it says so, not silence', async () => {
        const entryWith = (list) => `
import { createRoot } from 'react-dom/client';
import { Speaker } from '${srcFile('linguistic/ui.jsx')}';
Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => ${JSON.stringify(list)} });
window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
window.__spoken = [];
window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang, u.voice ? u.voice.name : null]);
createRoot(document.getElementById('root')).render(<div className="lingo flex gap-10 p-10"><span id="kn"><Speaker text="ಕುಟುಂಬ" lang="kn-IN" /></span><span id="hi"><Speaker text="परिवार" lang="hi-IN" /></span></div>);`;
        const tapBoth = `
            await sleep(500);
            $('#kn button').click(); await sleep(200);
            const note = text($('[data-no-voice]'));
            $('#hi button').click(); await sleep(200);
            return { note, spoken: window.__spoken };`;
        // A computer like the one Kannada was silent on: English and Hindi voices, no Kannada.
        const hindi = await screen({ entry: entryWith([{ lang: 'en-US', name: 'Samantha' }, { lang: 'hi_IN', name: 'Lekha' }]), api: apiModule({}), styles: true, script: tapBoth });
        assert.deepEqual(hindi.errors, []);
        assert.equal(hindi.result.__error, undefined, hindi.result.__error);
        assert.ok(!hindi.result.note, 'no "no voice" note any more');
        assert.deepEqual(hindi.result.spoken, [['कुटुंब', 'hi-IN', 'Lekha'], ['परिवार', 'hi-IN', 'Lekha']], 'Kannada read by the Hindi voice, in Devanagari letters');
        // A phone with a Telugu voice: that one first (its letters are closest).
        const telugu = await screen({ entry: entryWith([{ lang: 'te-IN', name: 'Telugu' }, { lang: 'hi-IN', name: 'Hindi' }]), api: apiModule({}), styles: true, script: tapBoth });
        assert.deepEqual(telugu.result.spoken[0], ['కుటుంబ', 'te-IN', 'Telugu']);
        // No Kannada, Telugu, Hindi or Marathi voice: it says so.
        const none = await screen({ entry: entryWith([{ lang: 'en-US', name: 'Samantha' }]), api: apiModule({}), styles: true, script: tapBoth });
        assert.match(none.result.note, /This device has no Kannada voice/);
    });

    test('an ✕ on every page: the dashboard\'s closes the section (straight to the app\'s Dashboard, 2026-10-29), a page inside goes back to the dashboard (2026-10-26)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/practice'), api: apiModule(SHELL_API), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1000);
            const inside = $('[data-lingo-close]');
            const before = { kind: inside?.dataset.lingoClose, href: inside?.getAttribute('href'), label: inside?.getAttribute('aria-label') };
            inside.click(); await sleep(600);
            const close = $('[data-lingo-close]');
            return { before, dashboard: !!$('[data-lingo-dashboard]'), after: { kind: close?.dataset.lingoClose, href: close?.getAttribute('href') }, wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.before, { kind: 'dashboard', href: '/linguistic/dashboard', label: 'Back to the Language Learning dashboard' });
        assert.equal(result.dashboard, true, 'the ✕ inside opens the dashboard');
        assert.deepEqual(result.after, { kind: 'section', href: '/' }, 'the dashboard\'s ✕ leaves the section');
        assert.ok(result.wide <= 1, `the ✕ beside the tabs keeps the phone page inside the screen (${result.wide}px)`);
    });

    test('left halfway through Get started: coming back opens the same question (or, left on one taken out, the one before it), with the answers kept (2026-10-26, 27)', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        // Kept before 2026-10-27, on "skills" (the old screen 7, taken out): back at the reason, the last one still asked before it.
        const saved = JSON.stringify({ step: 7, course: 'en', from: 'kn', know: 3, reason: 'travel' });
        const { result, errors } = await screen({ entry: `localStorage.setItem('lingo:start:me', ${JSON.stringify(saved)});\n${app('/linguistic')}`, api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), script: `
            await sleep(1200);
            const at = $('[data-onboarding]')?.dataset.onboarding;
            const reason = $('[data-reason="travel"]')?.getAttribute('aria-pressed');
            $('[data-lingo-session] button[aria-label="Back"]')?.click(); await sleep(300);
            const know = $('[data-know="3"]')?.getAttribute('aria-pressed');
            const kept = JSON.parse(localStorage.getItem('lingo:start:me'));
            return { at, reason, know, back: $('[data-onboarding]')?.dataset.onboarding, kept: [kept.step, kept.at] };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.at, 'why', 'the reason, not Get started');
        assert.deepEqual([result.reason, result.back, result.know, result.kept], ['true', 'know', 'true', [2, 'know']], 'the answers still picked, and the place kept, by name too');
    });

    test('starting a Kannada course (chosen in the dropdowns) as a Hindi speaker: every screen names Kannada; from the first unit (2026-10-28)', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, language: { code: 'hi', name: 'Hindi', native: 'हिन्दी' }, languageChosen: true, course: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', full: false } };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const title = () => $('[data-onboarding] h1')?.textContent;
            const go = async (pick) => { if (pick) { $(pick).click(); await sleep(100); } btn().click(); await sleep(400); };
            const out = {};
            await go(); out.learning = $('[data-course="kn"]')?.getAttribute('aria-pressed'); await go();
            out.know = [title(), $('[data-know="0"]')?.textContent];
            await go('[data-know="3"]');
            out.why = title();
            await go('[data-reason="travel"]');
            out.translate = { picked: $('[data-language="hi"]')?.getAttribute('aria-pressed'), kannada: $('[data-language="kn"]')?.disabled };
            await go();
            await go('[data-plan-days="30"]'); await go(); await go(); await go();
            out.options = $$('[data-start]').length;
            out.label = btn().textContent.trim();
            const gets = window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/linguistic/').length;
            btn().click(); await sleep(700);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.reloaded = window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/linguistic/').length > gets;
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.learning, 'true', 'the course they chose in the dropdowns');
        assert.equal(result.why, 'What is your main reason for learning Kannada?');
        assert.match(result.know[0], /What.s your Kannada level\?/); assert.match(result.know[1], /I am new to Kannada/);
        assert.deepEqual(result.translate, { picked: 'true', kannada: true }, 'Hindi, as chosen; not Kannada, which they learn');
        assert.equal(result.options, 0, 'no choice of where to start');
        assert.match(result.label, /start learning/i);
        assert.deepEqual(result.sent, [['/linguistic/about', { reason: 'travel', know: 3 }], ['/linguistic/knows', { speak: ['hi'], write: ['hi'], read: ['hi'] }], ['/linguistic/course', { course: 'kn', start: 'beginner' }], ['/linguistic/plan', { days: 30 }]], 'the course from Beginner, though they said they know some; no /level (that is English\'s)');
        assert.equal(result.reloaded, true, 'the section opens');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('one language only (2026-10-27): the chip shows the course being learnt, locked; the language they speak can change', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            const pick = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
            const out = {
                selects: $$('[data-language-picker] select').map((s) => s.getAttribute('aria-label')),
                speak: $('[data-speak]').value, learn: $('[data-learn]').value, locked: $('[data-learn]').disabled,
                hint: $('[data-learn]').closest('label').textContent,
                saveOff: $('[data-picker-save]').disabled, wide: (() => { ${WIDE} })()
            };
            pick('[data-speak]', 'hi'); await sleep(150);
            $('[data-picker-save]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.closed = !$('[data-language-picker]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.selects, ['I speak', 'I want to learn'], 'first the language they know, then the one they learn');
        assert.deepEqual([result.speak, result.learn, result.locked], ['kn', 'en', true], 'the course cannot be changed');
        assert.match(result.hint, /You are learning English\. Finish all its sections, then choose your next language\./);
        assert.equal(result.saveOff, true, 'nothing changed yet');
        assert.deepEqual(result.sent, [['/linguistic/language', { language: 'hi' }]], 'only the language they speak; nothing to /course');
        assert.equal(result.closed, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('the next language (2026-10-28): English finished, the chip lets the student choose their next language', async () => {
        const dash = { ...DASH, started: true, courseDone: true, courses: DASH.courses.map((c) => (c.code === 'en' ? { ...c, begun: true, done: true } : c)) };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            const pick = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
            const out = { locked: $('[data-learn]').disabled, hint: $('[data-learn]').closest('label').textContent, english: $('[data-learn] option[value="en"]').textContent, head: $('[data-language-picker] p').textContent };
            pick('[data-learn]', 'ja'); await sleep(150);
            $('[data-picker-save]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.locked, false, 'open again: English is finished');
        assert.match(result.hint, /You finished English\. Choose your next language\./);
        assert.match(result.head, /you finished English/);
        assert.match(result.english, /· finished$/);
        assert.deepEqual(result.sent, [['/linguistic/course', { course: 'ja', start: 'beginner' }]]);
    });

    test('Bhagyashree\'s accounts (2026-10-28, freeCourse): the learning language can be changed before English is finished', async () => {
        const dash = { ...DASH, started: true, courseDone: false, freeCourse: true };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            return { locked: $('[data-learn]').disabled, hint: $('[data-learn]').closest('label').textContent };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.locked, false);
        assert.doesNotMatch(result.hint, /Finish all its sections/);
    });

    test('learning Hindi: Hindi cannot be chosen as the language they speak (no swapping courses, 2026-10-27)', async () => {
        const dash = { ...DASH, course: { code: 'hi', name: 'Hindi', native: 'हिन्दी', full: false }, courses: DASH.courses.map((c) => (c.code === 'hi' ? { ...c, begun: true } : c)) };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            return { off: $$('[data-speak] option').filter((o) => o.disabled).map((o) => [o.value, o.textContent]), learn: $('[data-learn]').value, locked: $('[data-learn]').disabled };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.off.map(([v]) => v), ['hi']); assert.match(result.off[0][1], /\(you are learning it\)$/);
        assert.deepEqual([result.learn, result.locked], ['hi', true]);
    });

    test('matching pairs got wrong (2026-11-03): under them, how many wrong picks, and for each word what was chosen and the right answer', async () => {
        const LESSON = { id: 'mp', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Family', direction: null, passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'New words.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words: [['mother', 'ತಾಯಿ'], ['father', 'ತಂದೆ'], ['house', 'ಮನೆ']].map(([word, kannada]) => ({ word, kannada, pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null })),
            quiz: [{ id: 'word:0', type: 'mcq', prompt: 'Which word means "ಮನೆ"?', options: ['house', 'water'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/mp'), api: apiModule({ '/linguistic/lessons/mp': LESSON }), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let n = 0; n < 6 && !$('[data-pairs]'); n++) { await press(); }
            const cell = (side, t) => $$('[data-pair="' + side + '"]').find((b) => b.innerText.trim() === t);
            const pair = async (en, kn) => { cell('en', en).click(); await sleep(60); cell('kn', kn).click(); await sleep(150); };
            const box = () => { const b = $('[data-pair-misses]'); return b && { count: b.dataset.pairMisses, head: text(b.querySelector('p')),
                rows: [...b.querySelectorAll('[data-pair-miss]')].map((r) => [r.querySelector('[data-pair-word]').innerText, [...r.querySelectorAll('[data-pair-chosen]')].map((x) => x.innerText), text(r.querySelector('[data-pair-right]'))]) }; };
            const out = { before: box() };
            await pair('mother', 'ತಂದೆ'); out.one = box();
            await pair('mother', 'ತಂದೆ'); await pair('father', 'ತಾಯಿ'); out.three = box();
            await pair('house', 'ಮನೆ'); out.kept = box();
            // The button right under the pairs and that box, none at the foot of the screen (2026-11-03).
            const btn = $('[data-primary]'), under = $('[data-pair-misses]').getBoundingClientRect().bottom;
            out.button = { inline: !!btn.closest('[data-inline-primary]'), footer: !!$('footer'), below: btn.getBoundingClientRect().top >= under, label: text(btn), grey: btn.disabled };
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.before, null, 'nothing until one is got wrong');
        assert.deepEqual(result.one, { count: '1', head: 'ತಪ್ಪು ಆಯ್ಕೆಗಳು: 1', rows: [['mother', ['ತಂದೆ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಾಯಿ']] }, 'one wrong: counted, what was chosen, the right answer (in Kannada)');
        assert.deepEqual(result.three, { count: '3', head: 'ತಪ್ಪು ಆಯ್ಕೆಗಳು: 3', rows: [['mother', ['ತಂದೆ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಾಯಿ'], ['father', ['ತಾಯಿ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಂದೆ']] }, 'every wrong pick counted; each word once, with what was chosen');
        assert.deepEqual(result.kept, result.three, 'a right match after: the list stays');
        assert.deepEqual(result.button, { inline: true, footer: false, below: true, label: 'ಪರಿಶೀಲಿಸಿ', grey: true }, 'CHECK right under the pairs, not in a bar at the bottom');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a long Tamil phrase on a flashcard on a narrow phone (2026-11-03): inside the card, front and back, smaller rather than cut', async () => {
        const LESSON = { id: 'tv', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'advanced', title: 'Work', direction: null, passingScore: 60,
            course: 'ta', target: 'ta', targetName: 'Tamil', targetLocale: 'ta-IN', language: 'kn', languageName: 'Kannada',
            learn: { intro: 'New Tamil words.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words: [{ word: 'பேச்சுவார்த்தை நடத்து, பேரம் பேசு', kannada: 'ಮಾತುಕತೆ ನಡೆಸು, ಚೌಕಾಸಿ ಮಾಡು', say: 'pechuvaarththai nadaththu, peram pesu', pos: 'verb', example: '', synonyms: [], antonyms: [], audio: null, course: true },
                { word: 'வீடு', kannada: 'ಮನೆ', say: 'veedu', pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null, course: true }],
            quiz: [{ id: 'word:0', type: 'mcq', prompt: 'Which word means "ಮನೆ"?', options: ['வீடு', 'நீர்'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/tv'), api: apiModule({ '/linguistic/lessons/tv': LESSON }), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press(); await sleep(300);
            const fits = (sel) => { const c = $('[data-flashcard]').getBoundingClientRect(), w = $(sel), r = w.getBoundingClientRect();
                return { inside: r.left >= c.left && r.right <= c.right, overflow: w.scrollWidth - w.clientWidth, size: parseFloat(getComputedStyle(w).fontSize) }; };
            const front = fits('[data-card-word]');
            $('[data-flashcard]').click(); await sleep(200);
            const back = fits('[data-card-meaning]');
            $('[aria-label="Next word"]').click(); await sleep(200);
            const short = fits('[data-card-word]');
            return { front, back, short, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        for (const side of ['front', 'back']) assert.ok(result[side].inside && result[side].overflow <= 1, `${side}: inside the card (${JSON.stringify(result[side])})`);
        assert.ok(result.front.size < 36 && result.front.size >= 18, `the long phrase made smaller (${result.front.size}px)`);
        assert.equal(result.short.size, 36, 'a short word keeps its size');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a Japanese word on the card and in the pairs: how it sounds in English letters, in place of "noun"; Kannada keeps "noun" (2026-10-27)', async () => {
        const course = { course: 'ja', target: 'ja', targetName: 'Japanese', targetLocale: 'ja-JP', language: 'hi', languageName: 'Hindi' };
        const lesson = (words) => ({ id: 'jv', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Home and family', direction: null, passingScore: 60, ...course,
            learn: { intro: 'New Japanese words.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words: words.map(([word, kannada, say]) => ({ word, kannada, say, pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null, course: true })),
            quiz: [{ id: 'word:0', type: 'mcq', prompt: 'Which word means "घर"?', options: ['家', '本'] }] });
        const card = `
            ${DRIVE}
            await sleep(1000);
            await press();
            const out = { say: text($('[data-flashcard] [data-say]')), noun: /noun/i.test($('[data-flashcard]').textContent) };
            for (let n = 0; n < 6 && !$('[data-pairs]'); n++) { await press(); }
            out.pairs = $$('[data-pair="en"] [data-say]').map(text);
            return out;`;
        const ja = await screen({ entry: app('/linguistic/vocabulary/jv'), api: apiModule({ '/linguistic/lessons/jv': lesson([['家', 'घर', 'ie'], ['本', 'किताब', 'hon']]) }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: card });
        assert.deepEqual(ja.errors, []);
        assert.deepEqual(ja.result, { say: 'ie', noun: false, pairs: ['ie', 'hon'] }, 'on the card, and under each word in the pairs');
        const kn = await screen({ entry: app('/linguistic/vocabulary/jv'), api: apiModule({ '/linguistic/lessons/jv': { ...lesson([['ಮನೆ', 'घर', null]]), course: 'kn', target: 'kn', targetName: 'Kannada' } }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: card });
        assert.deepEqual(kn.errors, []);
        assert.deepEqual(kn.result, { say: null, noun: true, pairs: [] });
    });

    test('a French course: each tile with its sound, a wrong answer\'s right one with its sound, a sentence to read with its sound — tapped, its English (2026-10-27)', async () => {
        const course = { course: 'fr', target: 'fr', targetName: 'French', targetLocale: 'fr-FR', language: 'hi', languageName: 'Hindi' };
        const LESSON = { id: 'tf', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Greetings', direction: 'kn-en', passingScore: 60, ...course,
            learn: { intro: 'Write in French.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'word', topic: 'greetings', source: 'सुप्रभात', open: false, bank: ['Bonjour', 'merci'], bankSays: { Bonjour: 'bon-zhoor', merci: 'mehr-see' } },
                { id: 'i2', kind: 'sentence', topic: 'greetings', source: 'Je vais bien.', sourceSay: 'zhuh vay byan', sourceEn: 'I am fine.', sourceWords: [['zhuh', 'I'], ['vay', 'go (am)'], ['byan', 'well']], direction: 'en-kn', open: false, bank: ['मैं', 'ठीक', 'हूँ'] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'घर', bank: ['maison', 'eau'] }] };
        const post = `(url, body) => url.endsWith('/check') ? (body.given === 'Bonjour' ? { correct: true, verdict: 'exact', answer: 'Bonjour', accepted: [], explanation: '', diff: [], events: [] }
            : { correct: false, verdict: 'wrong', answer: 'Bonjour', answerSay: 'bon-zhoor', accepted: [], explanation: '', diff: [], events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tf'), api: apiModule({ '/linguistic/lessons/tf': LESSON }, post), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const tile = (w) => $$('[data-tiles] button').find((b) => b.textContent.startsWith(w));
            const out = { tiles: $$('[data-tiles] [data-tile-say]').map(text) };
            tile('merci').click(); await sleep(60); await press(); await sleep(200);
            out.wrong = [text($('[data-correction]')), text($('[data-correction-say]'))];
            await press(); await sleep(300);
            tile('Bonjour').click(); await sleep(60); await press(); await sleep(400);
            out.read = [text($('[data-source]')), text($('[data-source-say]'))];
            out.hidden = !$('[data-source-meaning]');
            $('[data-say-word="1"]').click(); await sleep(150);
            out.word = text($('[data-source-meaning]'));
            out.whole = text($('[data-source-meaning] [data-source-whole]'));
            $('[data-source]').click(); await sleep(150);
            out.meaning = text($('[data-source-meaning]'));
            // A tap outside the card closes it.
            const away = $('[data-translation] h1'), r = away.getBoundingClientRect();
            away.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); await sleep(150);
            out.closed = !$('[data-source-meaning]');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.tiles, ['bon-zhoor', 'mehr-see'], 'under each French tile');
        assert.deepEqual(result.wrong, ['Bonjour', 'bon-zhoor'], 'the right answer, and how it sounds');
        assert.deepEqual(result.read, ['Je vais bien.', 'zhuh vay byan'], 'under the sentence to read');
        assert.equal(result.hidden, true);
        assert.match(result.word, /^VAY go \(am\)/, 'a word tapped: its own English, as Duolingo\'s hints');
        assert.equal(result.whole, 'FULL SENTENCE I am fine.', 'and the whole sentence\'s English under it');
        assert.equal(result.meaning, 'ENGLISH I am fine.', 'the sentence tapped: all of it');
        assert.equal(result.closed, true, 'a tap outside closes it');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a Hindi course (2026-11-02): a sentence to read has no sound line, but tapped, its English', async () => {
        const LESSON = { id: 'th', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'At work', direction: 'kn-en', passingScore: 60,
            course: 'hi', target: 'hi', targetName: 'Hindi', targetLocale: 'hi-IN', language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Write in Kannada.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'work', source: 'बैठक सोमवार तक के लिए स्थगित कर दी गई है।', sourceEn: 'The meeting has been put off until Monday.', direction: 'en-kn', open: false }],
            quiz: [{ id: 'q1', type: 'translation', source: 'घर', bank: ['ಮನೆ', 'ನೀರು'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/th'), api: apiModule({ '/linguistic/lessons/th': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press(); await sleep(400);
            const out = { source: text($('[data-source]')), say: !!$('[data-source-say]'), dotted: getComputedStyle($('[data-source]')).textDecorationStyle, hidden: !$('[data-source-meaning]') };
            $('[data-source]').click(); await sleep(150);
            out.meaning = text($('[data-source-meaning]'));
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.source, result.say, result.dotted, result.hidden], ['बैठक सोमवार तक के लिए स्थगित कर दी गई है।', false, 'dotted', true], 'the sentence, marked to tap');
        assert.equal(result.meaning, 'ENGLISH The meeting has been put off until Monday.', 'tapped: its English');
        assert.ok(result.wide <= 1, `nothing wider than the phone, a long English too (${result.wide}px)`);
    });

    test('"What does 食べ物 mean?": the word asked about, to hear and to read in English letters (2026-10-27)', async () => {
        const REVIEW = { fixed: 0, mistakes: [{ id: 'm1', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', lessonTitle: 'Home', kind: 'question', count: 1, given: 'big',
            question: { id: 'meaning:4', type: 'mcq', prompt: 'What does "食べ物、食事" mean?', options: ['big', 'food'], promptSay: { text: '食べ物、食事', say: 'tabemono, shokuji', locale: 'ja-JP' } } }] };
        const { result, errors } = await screen({ entry: app('/linguistic/review'), api: apiModule({ '/linguistic/review': REVIEW }, '(url, body) => ({ correct: true, resolved: true, answer: "food" })'), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(900);
            const bubble = $('[data-prompt-word]')?.closest('div');
            return { word: text($('[data-prompt-word]')), say: text($('[data-prompt-say]')), speaker: !!$('[data-prompt-word]')?.closest('[data-question]')?.querySelector('button[aria-label]'), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.word, result.say, result.speaker], ['食べ物、食事', 'tabemono, shokuji', true], 'the word, how it sounds, and a speaker to hear it');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('quiz choices in the language learnt carry their sound (mistakes practice, 2026-10-27)', async () => {
        const REVIEW = { fixed: 0, mistakes: [{ id: 'm1', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', lessonTitle: 'Home', kind: 'question', count: 1, given: '本',
            question: { id: 'word:0', type: 'mcq', prompt: 'Which Japanese word means "घर"?', options: ['家', '本'], says: { '家': 'ie', '本': 'hon' } } }] };
        const { result, errors } = await screen({ entry: app('/linguistic/review'), api: apiModule({ '/linguistic/review': REVIEW }, '(url, body) => ({ correct: true, resolved: true, answer: "家" })'), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(900);
            return $$('[data-option]').map((b) => [b.querySelector('[dir]')?.textContent, text(b.querySelector('[data-say]'))]);` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result, [['家', 'ie'], ['本', 'hon']]);
    });

    test('a Kannada course lesson for a Hindi speaker: Kannada words read aloud in Kannada, no spelling; writing in Kannada with Kannada letters', async () => {
        const course = { course: 'kn', target: 'kn', targetName: 'Kannada', targetLocale: 'kn-IN', language: 'hi', languageName: 'Hindi' };
        const WORDS = { id: 'cv', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Home and family', direction: null, passingScore: 60, ...course,
            learn: { intro: 'New Kannada words, with their meanings in Hindi.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words: [['ಕುಟುಂಬ', 'परिवार'], ['ತಾಯಿ', 'माँ'], ['ತಂದೆ', 'पिता'], ['ಮನೆ', 'घर']].map(([word, kannada]) => ({ word, kannada, pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null, course: true })),
            quiz: [{ id: 'word:0', type: 'mcq', prompt: 'Which Kannada word means "परिवार"?', options: ['ಕುಟುಂಬ', 'ಮನೆ'] }] };
        const WRITE = { id: 'ct', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Greetings: write in Kannada', direction: 'kn-en', passingScore: 60, ...course,
            learn: { intro: 'Read each sentence in Hindi and write it in Kannada.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'greetings', source: 'नमस्ते।', open: false, bank: null }], quiz: [] };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/cv'), api: apiModule({ '/linguistic/lessons/cv': WORDS, '/linguistic/lessons/ct': WRITE }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const card = $('[data-flashcard]');
            const out = { word: [card?.querySelector('[lang]')?.getAttribute('lang'), card?.textContent.includes('ಕುಟುಂಬ')] };
            card.click(); await sleep(150);
            out.back = [$('[data-flashcard]').textContent.includes('परिवार'), $('[data-flashcard]').textContent.includes('“')];
            const kinds = [];
            for (let n = 0; n < 6 && !$('[data-pairs]'); n++) { await press(); }
            out.pairs = [$$('[data-pair="en"]').map((b) => b.querySelector('[lang]')?.getAttribute('lang'))[0], $$('[data-pair="kn"]').map((b) => b.querySelector('[lang]')?.getAttribute('lang'))[0]];
            out.spelling = !!$('input[placeholder="Type in English"], textarea[placeholder="Type in English"]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.word, ['kn', true], 'the word learnt is Kannada');
        assert.deepEqual(result.back, [true, false], 'its Hindi meaning; no empty example');
        assert.deepEqual(result.pairs, ['kn', 'hi']);
        assert.equal(result.spelling, false);

        const w = await screen({ entry: app('/linguistic/translation/ct'), api: apiModule({ '/linguistic/lessons/ct': WRITE }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const out = { title: $('[data-answer-area] h1')?.textContent, direction: $('[data-translation] span')?.textContent, placeholder: $('[data-answer-area] textarea')?.placeholder, box: $('[data-answer-area] textarea')?.getAttribute('lang') };
            const letters = $$('[data-answer-area] button').find((b) => /Kannada letters/.test(b.textContent));
            out.letters = !!letters;
            letters?.click(); await sleep(200);
            out.keys = $$('[data-letter-keys] button, [data-kannada-keys] button').length > 10;
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(w.errors, []);
        assert.equal(w.result.__error, undefined, w.result.__error);
        assert.equal(w.result.title, 'इस वाक्य का अनुवाद करें', 'the instruction in Hindi, the language they know (2026-10-24)');
        assert.equal(w.result.direction, 'Hindi → Kannada');
        assert.equal(w.result.box, 'kn');
        assert.match(w.result.placeholder, /ಕನ್ನಡ/);
        assert.equal(w.result.letters, true);
        assert.equal(w.result.keys, true, 'Kannada letters to type with');
        assert.ok(w.result.wide <= 1, `nothing wider than the phone (${w.result.wide}px)`);
    });

    test('the ✕ in a lesson, the placement test and the mistakes: End session opens the learning path, not the dashboard (2026-10-31)', async () => {
        const MISTAKES = { fixed: 0, mistakes: [{ id: 'm1', module: 'grammar', moduleLabel: 'Grammar Practice', level: 'beginner', lessonTitle: 'Articles', kind: 'question', count: 1, given: 'a', question: { id: 'q1', type: 'fill', prompt: 'This is ___ easy question.' } }] };
        const TEST = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }] };
        for (const [at, api] of [['/linguistic/grammar/g1', { '/linguistic/lessons/g1': GRAMMAR, ...SHELL_API }], ['/linguistic/placement', { '/linguistic/placement': TEST, ...SHELL_API }], ['/linguistic/review', { '/linguistic/review': MISTAKES, ...SHELL_API }]]) {
            const { result, errors } = await screen({ entry: app(at), api: apiModule(api, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
                await sleep(1200);
                const found = !!$('[data-lingo-session] button[aria-label="Quit"]');
                if (!found) return { found };
                $('[data-lingo-session] button[aria-label="Quit"]').click(); await sleep(400);
                const r = $('[data-quit]').getBoundingClientRect();
                const middle = Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) < 40 && r.bottom < innerHeight - 8 && r.left >= 8;
                $('[data-end-session]').click(); await sleep(800);
                return { found, middle, session: !!$('[data-lingo-session]'), path: !!$('[data-section]'), dashboard: !!$('[data-lingo-dashboard]') };` });
            assert.deepEqual(errors, [], at);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual([result.found, result.middle, result.session, result.path, result.dashboard], [true, true, false, true, false], `${at}: ✕, a popup in the middle of the phone (2026-10-29), End session → the learning path (2026-10-31)`);
        }
    });

    test('Back on the learning path opens the dashboard (2026-10-31), not the lesson just ended', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/lessons/g1': GRAMMAR, ...SHELL_API }), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1200);
            // The pages before: the dashboard, then a lesson ended with End session.
            sessionStorage.setItem('yati:trail', JSON.stringify(['/linguistic/dashboard', '/linguistic/grammar/g1', '/linguistic']));
            const back = $('[data-lingo-close]');
            const label = text(back);
            back.click(); await sleep(800);
            return { label, dashboard: !!$('[data-lingo-dashboard]'), session: !!$('[data-lingo-session]'), lesson: window.__calls.some((c) => c[1].endsWith('/lessons/g1')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result, { label: 'Back', dashboard: true, session: false, lesson: false });
    });

    test('the tabs: Practice (daily, mistakes, placement; the quests are on the dashboard), Badges, Writing', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1100);
            $('[data-tab="Practice"]').click(); await sleep(400);
            const practice = { quests: !!$('[data-practice-hub] [data-quests]'), daily: $('[data-daily]')?.getAttribute('href'), mistakes: $('[data-mistakes]')?.dataset.mistakes, placement: $('[data-placement-card]')?.dataset.placementCard, wide: (() => { ${WIDE} })() };
            $('[data-lingo-close]').click(); await sleep(500);
            $('[data-tab="Badges"]').click(); await sleep(500);
            const badges = { list: $$('[data-badge]').map((b) => b.dataset.badge + ':' + b.dataset.earned), levels: $$('[data-level]').length,
                gems: $$('[data-badge] [data-gem]').map((g) => g.dataset.gem + ':' + g.dataset.gemHue), levelGems: $$('[data-level] [data-gem]').map((g) => g.dataset.gem), wide: (() => { ${WIDE} })() };
            $('[data-lingo-close]').click(); await sleep(500);
            $('[data-tab="Writing"]').click(); await sleep(500);
            return { practice, badges, writing: text($('[data-writing-page]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.practice, { quests: false, daily: '/linguistic/daily', mistakes: '4', placement: 'none', wide: 0 });
        assert.deepEqual(result.badges, { list: ['first_lesson:true', 'translator:false'], levels: 3,
            gems: ['hex:green', 'hex:purple'], levelGems: ['hex', 'hex', 'hex'], wide: 0 }, 'each badge in its own colours, on a card of its colour (2026-10-27)');
        assert.match(result.writing, /Nothing yet/);
    });

    const GRAMMAR = {
        id: 'g1', module: 'grammar', moduleLabel: 'Grammar Practice', level: 'beginner', title: 'Articles', summary: 'a, an, the', direction: null, passingScore: 60,
        learn: { intro: 'Articles come before nouns.', points: ['Use "an" before a vowel sound.'], examples: ['I have a pen.'] },
        progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
        practice: [{ id: 'p1', type: 'fill', prompt: 'I saw ___ owl.' }],
        quiz: [{ id: 'q1', type: 'mcq', prompt: 'Choose the word that fits: ___ apple a day.', options: ['A', 'An'] }, { id: 'q2', type: 'rearrange', prompt: 'Put the words in order', words: ['good', 'This', 'is'] }]
    };
    const GRAMMAR_POST = `(url, body) => {
        if (url.endsWith('/quiz/check')) { const ok = body.id === 'q1' ? body.given === 'An' : body.given === 'This is good'; return { correct: ok, near: false, answer: body.id === 'q1' ? 'An' : 'This is good.', explanation: 'Because.' }; }
        if (url.endsWith('/check')) return { correct: body.given.trim().toLowerCase() === 'an', near: false, answer: 'an', explanation: '"Owl" begins with a vowel sound.', events: [] };
        if (url.endsWith('/quiz')) { const ok = body.answers.q1 === 'An' && body.answers.q2 === 'This is good';
            return { score: ok ? 2 : 0, total: 2, percent: ok ? 100 : 0, passed: ok, passingScore: 60, firstPass: ok, bestScore: ok ? 100 : 0, events: ok ? [{ kind: 'xp', amount: 20 }] : [],
                results: [{ id: 'q1', prompt: '___ apple', given: body.answers.q1 || '', correct: body.answers.q1 === 'An', answer: 'An', explanation: 'Vowel.' }, { id: 'q2', prompt: 'Order', given: body.answers.q2 || '', correct: body.answers.q2 === 'This is good', answer: 'This is good.', explanation: 'S V.' }],
                next: ok ? { id: 'g2', title: 'Pronouns', level: 'beginner' } : null, certificate: null }; }
        return { step: body.step };
    }`;

    test('before the quiz, the practice questions got wrong (2026-11-04): each with the answer given, crossed out, the right one and why; none got wrong, no review', async () => {
        const run = (first) => screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': { ...GRAMMAR, language: 'kn', languageName: 'Kannada' } }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let n = 0; n < 4 && !$('[data-answer-area] input, [data-answer-area] textarea'); n++) await press();
            const type = (v) => { const box = $('[data-answer-area] input, [data-answer-area] textarea'); Object.getOwnPropertyDescriptor(box.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(box, v); box.dispatchEvent(new Event('input', { bubbles: true })); };
            type(${JSON.stringify(first)}); await sleep(60); await press(); await sleep(250);
            if (${JSON.stringify(first)} !== 'an') { await press(); await sleep(250); type('an'); await sleep(60); await press(); await sleep(400); }
            const box = $('[data-miss-review]');
            const out = { review: !!box, title: text($('[data-answer-area] h1')) };
            if (box) {
                out.count = box.dataset.missReview;
                out.items = $$('[data-miss]').map((li) => [text(li.querySelector('[data-miss-prompt]')), text(li.querySelector('[data-miss-given]')), text(li.querySelector('[data-miss-answer]')), text(li.querySelector('[data-miss-why]'))]);
                out.struck = getComputedStyle($('[data-miss-given]')).textDecorationLine;
                out.button = [text($('[data-primary]')), !!$('[data-primary]').closest('footer')];
                out.wide = (() => { ${SESSION_WIDE} })();
                await press(); await sleep(300);
                out.after = text($('[data-answer-area] h1'));
            }
            return out;` });
        const wrong = await run('a');
        assert.deepEqual(wrong.errors, []);
        assert.equal(wrong.result.__error, undefined, wrong.result.__error);
        assert.equal(wrong.result.review, true, 'the review, before the quiz');
        assert.deepEqual([wrong.result.count, wrong.result.title], ['1', 'ನಿಮ್ಮ ತಪ್ಪುಗಳನ್ನು ನೋಡಿ'], 'in the student\'s language');
        assert.deepEqual(wrong.result.items, [['I saw ___ owl.', 'a', 'an', 'ಏಕೆ: "Owl" begins with a vowel sound.']], 'the question, the first answer given, the right one, why');
        assert.equal(wrong.result.struck, 'line-through');
        assert.deepEqual(wrong.result.button, ['ಮುಂದುವರಿಸಿ', true], 'Continue, in the bar as on any screen to read');
        assert.equal(wrong.result.after, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'then the quiz');
        assert.ok(wrong.result.wide <= 1, `nothing wider than the phone (${wrong.result.wide}px)`);
        const right = await run('an');
        assert.deepEqual(right.errors, []);
        assert.equal(right.result.__error, undefined, right.result.__error);
        assert.equal(right.result.review, false, 'nothing got wrong: no review');
    });

    test('CHECK right under the question, every language (2026-11-04); the CONTINUE it turns into there too; a screen to read keeps its Continue in the bar at the foot', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': { ...GRAMMAR, language: 'kn', languageName: 'Kannada' } }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            const where = () => { const b = $('[data-primary]'); return { label: text(b), inline: !!b.closest('[data-inline-primary]'), bar: !!b.closest('footer') }; };
            const out = { read: where() };
            for (let n = 0; n < 4 && !$('[data-answer-area] input, [data-answer-area] textarea'); n++) await press();
            out.check = where();
            const box = $('[data-answer-area] input, [data-answer-area] textarea'), under = (box.closest('[translate="no"]') || box).getBoundingClientRect().bottom;
            out.below = $('[data-primary]').getBoundingClientRect().top >= under - 1;
            Object.getOwnPropertyDescriptor(box.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(box, 'a');
            box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(60); await press(); await sleep(250);
            out.after = where();
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.read, { label: 'ಮುಂದುವರಿಸಿ', inline: false, bar: true }, 'a screen to read: its Continue in the bar, as before');
        assert.deepEqual(result.check, { label: 'ಪರಿಶೀಲಿಸಿ', inline: true, bar: false }, 'CHECK under the question, no bar');
        assert.equal(result.below, true, 'below the answer');
        assert.deepEqual(result.after, { label: 'ಮುಂದುವರಿಸಿ', inline: true, bar: false }, 'once checked (wrong): its CONTINUE in the same place');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a paragraph is checked in the lesson, each sentence corrected, nothing sent to a teacher; with mistakes, Continue gives the same task again, its text kept to fix, until it is right (2026-10-27)', async () => {
        const READING = {
            id: 'rd', module: 'reading', moduleLabel: 'Reading and Writing', level: 'beginner', title: 'My Morning', summary: '', direction: null, passingScore: 60,
            learn: { intro: 'A short story.' }, progress: { status: 'new', step: 'practice', bestScore: null, attempts: 0 },
            writing: [{ id: 'w4', type: 'paragraph', prompt: 'Write about your morning.', minWords: 5 }], quiz: [{ id: 'q1', type: 'mcq', prompt: 'When?', options: ['Six', 'Ten'] }]
        };
        const POST = `(url, body) => {
            // Written right: no mistakes. Written with "He go": the correction, and the task again.
            if (url.includes('/writing/') && !/He go /.test(body.answer)) return { correct: null, checked: true, ok: true, words: 9, total: 2, clean: 2, findings: [],
                sentences: [{ text: 'I wake up at six.', corrected: 'I wake up at six.', mistakes: [] }, { text: 'He goes to college.', corrected: 'He goes to college.', mistakes: [] }], submission: { id: 's1', status: 'checked' } };
            if (url.includes('/writing/')) return { correct: null, checked: true, ok: false, words: 9, total: 2, clean: 1, findings: [{ kind: 'good', text: 'Every sentence starts with a capital letter.' }],
                sentences: [{ text: 'I wake up at six.', corrected: 'I wake up at six.', mistakes: [] }, { text: 'He go to college.', corrected: 'He goes to college.', mistakes: [{ wrong: 'go', right: 'goes', why: 'With he, she or it, add -s.' }] }],
                submission: { id: 's1', status: 'checked' } };
            return { step: body.step };
        }`;
        const { result, errors } = await screen({ entry: app('/linguistic/reading/rd'), api: apiModule({ '/linguistic/lessons/rd': READING }, POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 8 && !$('[data-writing="w4"]'); i++) await press();
            typeIn('Thankyou for the fever.'); await sleep(60);
            const one = { grey: $('[data-primary]').disabled, count: text($('[data-sentences]')), rule: text($('[data-sentence-rule]')) };
            typeIn('I wake up at six. He go to college'); await sleep(60);
            one.noStop = $('[data-primary]').disabled; await press(); await sleep(150);
            one.stayed = !!$('[data-writing="w4"]') && !$('[data-sheet]') && !window.__calls.some((c) => c[1].includes('/writing/'));
            typeIn('I wake up at six. He go to college. I like my mornings.'); await sleep(60);
            one.three = !$('[data-primary]').disabled;
            await press(); await sleep(200);
            const S = $('[data-lingo-session]');
            return { one, at: !!$('[data-writing="w4"]'), tone: sheet(), title: text($('[data-sheet] h2, [data-sheet] p')), fixed: $$('[data-talk-sentence="fixed"]').map(text), ok: $$('[data-talk-sentence="ok"]').length,
                teacher: /teacher|ಶಿಕ್ಷಕ/i.test(S.innerText), model: /Model answer|ಮಾದರಿ ಉತ್ತರ/i.test(text($('[data-sheet]'))), sheetText: text($('[data-sheet]')),
                popup: await (async () => {
                    const p = { open: !!$('[data-grammar-popup] [data-talk-corrections]'), bottom: !!$('.lingo-sheet[data-sheet]') };
                    $('[data-grammar-close]').click(); await sleep(200);
                    p.closed = !$('[data-grammar-popup]'); p.show = !!$('[data-show-corrections]');
                    $('[data-show-corrections]').click(); await sleep(200);
                    p.reopened = !!$('[data-grammar-popup]');
                    return p;
                })(),
                again: await (async () => {
                    await press(); await sleep(300);
                    const a = { same: !!$('[data-writing="w4"]'), mark: !!$('[data-again]'), kept: $('[data-answer-area] textarea').value };
                    typeIn('I wake up at six. He goes to college. I like my mornings.'); await sleep(60); await press(); await sleep(200);
                    a.right = sheet(); await press(); await sleep(300);
                    a.next = !$('[data-writing="w4"]');
                    return a;
                })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.one, { grey: true, count: '3ರಲ್ಲಿ 1 ವಾಕ್ಯಗಳು', rule: 'ಕನಿಷ್ಠ 3 ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ. ಪ್ರತಿಯೊಂದನ್ನೂ ಪೂರ್ಣವಿರಾಮದಿಂದ (.) ಮುಗಿಸಿ.', noStop: true, stayed: true, three: true },
            'under 3 sentences (2026-10-28): CHECK grey, the count and the rule in the student language, nothing sent; 3 sentences: CHECK');
        assert.equal(result.at, true);
        assert.equal(result.tone, 'info');
        // In the student's language (Kannada here): "Fix the marked words", "1 of 2 sentences with no mistakes".
        assert.match(result.sheetText, /^ಗುರುತಿಸಿದ ಪದಗಳನ್ನು ಸರಿಪಡಿಸಿ 2 ವಾಕ್ಯಗಳಲ್ಲಿ 1 ತಪ್ಪಿಲ್ಲದವು/);
        assert.equal(result.fixed.length, 1); assert.match(result.fixed[0], /He go to college/); assert.match(result.fixed[0], /He goes to college/); assert.match(result.fixed[0], /add -s/);
        assert.equal(result.ok, 1);
        assert.deepEqual([result.teacher, result.model], [false, false], 'nothing about a teacher, and no full model answer: the grammar is corrected here');
        assert.deepEqual(result.popup, { open: true, bottom: false, closed: true, show: true, reopened: true }, 'the corrections in a popup, not the bottom sheet; its ✕ closes it, Show corrections opens it again (2026-10-27)');
        assert.deepEqual(result.again, { same: true, mark: true, kept: 'I wake up at six. He go to college. I like my mornings.', right: 'right', next: true }, 'Continue: the same task, the student\'s text kept to fix; put right, on to the next');
    });

    test('words in order, got wrong: the student\'s words stay, the right answer in green under them, Continue, the same question again until it is right, then the next (2026-10-27)', async () => {
        const ONLY = { ...GRAMMAR, practice: [], quiz: [GRAMMAR.quiz[1]] };
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': ONLY }, GRAMMAR_POST), styles: true, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-question="q2"]'); i++) await press();
            const put = async (words) => { for (const w of words) { $$('[data-tiles] button').find((b) => b.innerText.trim() === w && !b.classList.contains('invisible')).click(); await sleep(80); } };
            await put(['good', 'This', 'is']); await press(); await sleep(300);
            const box = $('[data-placed]').getBoundingClientRect(), fix = $('[data-correction]').getBoundingClientRect();
            const first = { at: !!$('[data-question="q2"]'), sheet: sheet(), correction: text($('[data-correction]')), color: getComputedStyle($('[data-correction]')).color,
                inBox: !!$('[data-placed] [data-correction]') && fix.top > box.top + 40 && fix.bottom <= box.bottom + 1, placed: $$('[data-placed] button').length,
                below: fix.top >= $$('[data-placed] button').pop().getBoundingClientRect().bottom, red: getComputedStyle($('[data-placed] button')).color, locked: $('[data-placed] button').disabled, button: text($('[data-primary]')) };
            await press(); await sleep(400);
            const again = { at: !!$('[data-question="q2"]'), mark: !!$('[data-again]'), correction: !!$('[data-correction]'), placed: $$('[data-placed] button').length };
            await put(['is', 'This', 'good']); await press(); await sleep(300);
            const wrongAgain = { correction: text($('[data-correction]')), button: text($('[data-primary]')) };
            await press(); await sleep(400);
            const third = { at: !!$('[data-question="q2"]'), correction: !!$('[data-correction]') };
            await put(['This', 'is', 'good']); await press(); await sleep(900);
            const quiz = window.__calls.find((c) => c[0] === 'POST' && c[1].endsWith('/quiz'));
            return { first, again, wrongAgain, third, after: { sheet: sheet(), still: !!$('[data-question="q2"]') }, counted: quiz && quiz[2].answers.q2 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.first, { at: true, sheet: null, correction: 'This is good.', color: 'rgb(88, 167, 0)', inBox: true, placed: 3, below: true, red: 'rgb(234, 43, 43)', locked: true, button: 'ಮುಂದುವರಿಸಿ' }, 'the student\'s words stay, in red; the right answer in green under them; CONTINUE');
        assert.deepEqual(result.again, { at: true, mark: true, correction: false, placed: 0 }, 'then the same question again, fresh, marked as a mistake');
        assert.deepEqual(result.wrongAgain, { correction: 'This is good.', button: 'ಮುಂದುವರಿಸಿ' }, 'wrong again: the answer again, and Continue');
        assert.deepEqual(result.third, { at: true, correction: false }, 'and the same question once more, until it is right');
        assert.deepEqual(result.after, { sheet: null, still: false }, 'the second try goes straight on');
        assert.equal(result.counted, 'good This is', 'the first answer is the one that counts, not the one put right');
    });

    test('the corrections in the student\'s own language: a Hindi speaker\'s checked paragraph (2026-10-27)', async () => {
        const READING = {
            id: 'rd', module: 'reading', moduleLabel: 'Reading and Writing', level: 'beginner', title: 'My Morning', summary: '', direction: null, passingScore: 60, language: 'hi',
            learn: { intro: 'A short story.' }, progress: { status: 'new', step: 'practice', bestScore: null, attempts: 0 },
            writing: [{ id: 'w4', type: 'paragraph', prompt: 'Write about your morning.', minWords: 5 }], quiz: [{ id: 'q1', type: 'mcq', prompt: 'When?', options: ['Six', 'Ten'] }]
        };
        // As the server sends it to a Hindi speaker: the corrections already in Hindi.
        const POST = `(url, body) => {
            if (url.includes('/writing/')) return { correct: null, checked: true, words: 9, total: 2, clean: 1, findings: [],
                sentences: [{ text: 'I wake up at six.', corrected: 'I wake up at six.', mistakes: [] }, { text: 'He go to college', corrected: 'He goes to college.', mistakes: [{ wrong: 'He go', right: 'He goes', why: 'वर्तमान काल में he, she या it के साथ क्रिया में -s लगता है: he goes, she has, it works.' }, { wrong: null, right: '.', why: 'वाक्य को पूर्ण विराम (.), प्रश्नचिह्न (?) या विस्मयादिबोधक चिह्न (!) से खत्म करें।' }] }],
                submission: { id: 's1', status: 'checked' } };
            return { step: body.step };
        }`;
        const { result, errors } = await screen({ entry: app('/linguistic/reading/rd'), api: apiModule({ '/linguistic/lessons/rd': READING }, POST), styles: true, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 8 && !$('[data-writing="w4"]'); i++) await press();
            typeIn('I wake up at six. I drink tea. I read the news. He go to college'); await sleep(60); await press(); await sleep(300);
            return { rule: !!$('[data-sentence-rule]'), heading: text($('[data-talk-corrections] p')), said: text($('[data-talk-sentence="fixed"]')), sheet: text($('[data-sheet]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.rule, false, 'three sentences written: no rule shown');
        assert.equal(result.heading, 'आपके वाक्य, सुधार के साथ');
        assert.match(result.said, /आपने लिखा: He go to college/); assert.match(result.said, /बेहतर: He goes to college\./); assert.match(result.said, /क्रिया में -s लगता है/);
        assert.match(result.sheet, /^चिह्नित शब्द ठीक करें 2 में से 1 वाक्यों में कोई गलती नहीं/, 'the sheet\'s words in Hindi too');
    });

    test('a lesson, one screen at a time: the tips, practice (a wrong answer shown right in green, Continue, the same question again), the quiz, the result', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': GRAMMAR }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            const S = $('[data-lingo-session]');
            const covers = [[5, 5], [innerWidth / 2, innerHeight - 5]].every(([x, y]) => S.contains(document.elementFromPoint(x, y)));
            const learn = /Use "an" before a vowel sound/.test(S.innerText);
            const hearts = $('[data-hearts]')?.dataset.hearts;
            await press();
            const disabled = $('[data-primary]').disabled;
            typeIn('a'); await sleep(60); await press(); await sleep(150);
            const wrong = { sheet: sheet(), kept: $('[data-answer-area] textarea').value, red: getComputedStyle($('[data-answer-area] textarea')).color, correction: text($('[data-correction]')), button: text($('[data-primary]')), same: !!$('[data-question="p1"]') };
            await press(); await sleep(300);
            const again = { same: !!$('[data-question="p1"]'), mark: !!$('[data-again]'), empty: $('[data-answer-area] textarea').value === '', correction: !!$('[data-correction]') };
            typeIn('an'); await sleep(60); await press(); await sleep(300);
            // The practice question got wrong, reviewed before the quiz (2026-11-04).
            const review = $('[data-miss-review]')?.dataset.missReview;
            await press(); await sleep(300);
            const intro = text($('[data-answer-area] h1'));
            await press();
            const blank = text($('[data-question="q1"] p'));
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60);
            const filled = text($('[data-question="q1"] p'));
            await press(); await sleep(300);
            const q1 = { sheet: sheet(), next: !!$('[data-tiles]') };
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText === w).click(); await sleep(40); }
            const placed = text($('[data-placed]'));
            const wide = (() => { ${SESSION_WIDE} })();
            await press(); await sleep(150);
            const q2 = sheet();
            await sleep(700);
            return { covers, learn, hearts, disabled, wrong, again, review, intro, blank, filled, q1, placed, q2, wide,
                finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), stats: $$('[data-stat]').map(text),
                steps: window.__calls.filter((c) => c[1].endsWith('/step')).map((c) => c[2].step),
                checks: window.__calls.filter((c) => c[1].endsWith('/quiz/check')).map((c) => c[2]),
                quiz: window.__calls.find((c) => c[1].endsWith('/quiz'))?.[2] };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.covers, true, 'full screen, over the page');
        assert.equal(result.learn, true);
        assert.equal(result.hearts, '1', 'two questions at 60%: one heart (a wrong answer means no pass)');
        assert.equal(result.disabled, true, 'CHECK waits for an answer');
        assert.deepEqual(result.wrong, { sheet: null, kept: 'a', red: 'rgb(234, 43, 43)', correction: 'an', button: 'ಮುಂದುವರಿಸಿ', same: true }, 'no sheet: the answer stays, in red; the right one in green below; CONTINUE (2026-10-27)');
        assert.deepEqual(result.again, { same: true, mark: true, empty: true, correction: false }, 'then the same question again, fresh; right this time, on to the quiz');
        assert.equal(result.review, '1', 'the practice question got wrong, reviewed before the quiz (2026-11-04)');
        assert.equal(result.intro, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', '"Quiz time!" in Kannada, the student\'s language (2026-10-24)');
        assert.equal(result.blank, '… apple a day.'); assert.equal(result.filled, 'An apple a day.', 'the choice shows in the blank');
        assert.deepEqual(result.q1, { sheet: null, next: true }, 'right: no sheet, straight to the next question (2026-10-27)');
        assert.match(result.placed, /This\s*is\s*good/); assert.equal(result.q2, null, 'right: no sheet, straight to the result');
        assert.equal(result.finish, 'pass'); assert.equal(result.title, 'Perfect lesson!');
        assert.deepEqual(result.stats.slice(0, 2), ['TOTAL XP 20', 'AMAZING 100%']); assert.match(result.stats[2], /^TIME \d+:\d\d$/);
        assert.deepEqual(result.steps, ['practice', 'quiz'], 'where the student is, saved for resuming');
        assert.deepEqual(result.checks, [{ id: 'q1', given: 'An' }, { id: 'q2', given: 'This is good' }]);
        assert.deepEqual(result.quiz, { answers: { q1: 'An', q2: 'This is good' } });
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('speaking (2026-10-28): no tick buttons; each point ticks itself from what is said; SAVE waits for a recording and the points heard', async () => {
        const LESSON = { id: 's1', module: 'speaking', moduleLabel: 'Speaking and Listening', level: 'beginner', title: 'Introducing yourself', direction: null, passingScore: 60,
            learn: { intro: 'Listen.', dialogue: { scenario: 'Meeting', speakers: [{ name: 'Asha', voice: 'f' }, { name: 'Ravi', voice: 'm' }], lines: [{ speaker: 'Asha', text: 'Hello!', audio: null }, { speaker: 'Ravi', text: 'Hi!', audio: null }] }, phrases: [] },
            progress: { status: 'started', step: 'learn', bestScore: null, attempts: 0 },
            speaking: { prompt: 'Introduce yourself in 4 or 5 sentences.', sample: 'Hello, my name is Ravi.', checklist: ['I said my name', 'I said where I am from', 'I spoke slowly'],
                checks: [{ groups: [['my name', "i'm"]] }, { groups: [['from']] }, { pace: true }], need: 2 },
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'Who says hello first?', options: ['Asha', 'Ravi'] }] };
        const post = `(url, body) => (url.endsWith('/speaking') ? { ticked: 2, total: 3, ticks: [true, true, false], sample: 'Hello, my name is Ravi.' } : { step: body.step })`;
        const { result, errors } = await screen({ entry: app('/linguistic/speaking/s1'), api: apiModule({ '/linguistic/lessons/s1': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 20000, script: `
            ${DRIVE}
            // The browser's speech-to-text, stood in for: the test says what the student would.
            window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { window.__rec = this; } stop() {} abort() {} };
            navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('no microphone here'));
            const say = (t) => { const res = [{ transcript: t }]; res.isFinal = true; window.__rec.onresult({ resultIndex: 0, results: [res] }); };
            const ticks = () => $$('[data-speak-point]').map((p) => p.dataset.on);
            await sleep(1000);
            for (let n = 0; n < 6 && !$('[data-talk-mic]'); n++) await press();
            const btn = () => $('[data-primary]');
            const out = { at: !!$('[data-talk-mic]'), boxes: $$('[role="checkbox"], input[type="checkbox"]').length, typeInstead: !!$('[data-speak-type]'),
                skips: $$('[data-lingo-session] button').filter((b) => /^(skip|can.t speak now)$/i.test(b.innerText.trim())).length, empty: btn().disabled, start: ticks() };
            $$('[data-speak-point]')[0].click(); await sleep(100);
            out.tapped = ticks()[0];
            $('[data-talk-mic]').click(); await sleep(150);
            say('the weather is nice today'); await sleep(150);
            out.offTopic = ticks();
            say('hello my name is Ravi'); await sleep(150);
            out.name = ticks();
            out.heard = $('[data-speak-said]')?.innerText;
            say('I am from Mysuru'); await sleep(2100);
            out.listening = btn().disabled;
            $('[data-talk-mic]').click(); await sleep(200);
            out.after = ticks();
            out.count = $('[data-speak-heard]').innerText;
            out.ready = !btn().disabled;
            btn().click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[1].endsWith('/speaking')).map((c) => c[2]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.at, result.boxes, result.typeInstead, result.skips, result.empty], [true, 0, false, 0, true], 'the microphone; no tick boxes, no typing instead, no skip; SAVE grey');
        assert.deepEqual(result.start, ['no', 'no', 'no']);
        assert.equal(result.tapped, 'no', 'a point cannot be ticked by tapping it');
        assert.deepEqual(result.offTopic, ['no', 'no', 'no'], 'words not about the points tick nothing');
        assert.deepEqual(result.name, ['yes', 'no', 'no'], 'saying the name ticks the name');
        assert.match(result.heard, /Hello my name is Ravi/);
        assert.equal(result.listening, true, 'SAVE waits while still listening');
        assert.deepEqual(result.after, ['yes', 'yes', 'no'], 'the place ticked; 14 words in about 2 seconds is not slow');
        assert.match(result.count, /3ರಲ್ಲಿ 2 ಕೇಳಿಸಿತು/, 'in the student language: 2 of 3 heard');
        assert.equal(result.ready, true);
        assert.equal(result.sent.length, 1);
        assert.match(result.sent[0].said, /^The weather is nice today\. Hello my name is Ravi\. I am from Mysuru\.$/);
        assert.equal(result.sent[0].recorded, true);
        assert.ok(result.sent[0].seconds >= 2, `seconds sent (${result.sent[0].seconds})`);
        assert.equal(result.sent[0].checklist, undefined, 'no ticks sent: the server ticks from what was said');
    });

    test('out of hearts: the mistake put right first (2026-10-27), then the quiz ends; only the first answers are sent; TRY AGAIN starts at the quiz', async () => {
        const reached = { ...GRAMMAR, progress: { status: 'started', step: 'quiz', bestScore: null, attempts: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': reached }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            // No skipping to the quiz (2026-10-28): the tips, then the practice question answered, then the quiz.
            const noSkip = !$('[data-skip-to-quiz]');
            await press(); typeIn('an'); await sleep(60); await press(); await sleep(300);
            const skipped = text($('[data-answer-area] h1'));
            await press();
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('A')).click(); await sleep(60);
            await press(); await sleep(150);
            const hearts = $('[data-hearts]')?.dataset.hearts;
            const shown = text($('[data-correction]'));
            await press(); await sleep(300);
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60);
            await press(); await sleep(700);
            const out = { noSkip, skipped, hearts, shown, finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), sent: window.__calls.find((c) => c[1].endsWith('/quiz'))?.[2] };
            $('[data-review-answers]').click(); await sleep(200);
            out.review = $$('[data-review-item]').map((li) => li.dataset.reviewItem);
            $('footer [data-primary]').click(); await sleep(400);
            out.retry = { title: text($('[data-answer-area] h1')), hearts: $('[data-hearts]')?.dataset.hearts };
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.noSkip, true, 'no "Skip to quiz" (2026-10-28): every question is answered');
        assert.equal(result.skipped, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'the quiz after the practice, for one who reached it before too');
        assert.equal(result.hearts, '0');
        assert.equal(result.shown, 'An', 'the right answer shown, to put the mistake right before anything else');
        assert.equal(result.finish, 'fail'); assert.equal(result.title, 'Out of hearts!');
        assert.deepEqual(result.sent, { answers: { q1: 'A' } }, 'the first answer counts; the question not reached is not sent');
        assert.deepEqual(result.review, ['wrong', 'wrong']);
        assert.deepEqual(result.retry, { title: 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', hearts: '1' });
    });

    test('translation: word tiles, the keyboard with Kannada letters, and an "almost" answer shown right in green with why, then Continue (2026-10-27)', async () => {
        const LESSON = { id: 't1', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Everyday words', direction: 'en-kn', passingScore: 60,
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'word', topic: 'people', source: 'friend', open: false, bank: ['ಮನೆ', 'ಸ್ನೇಹಿತ', 'ನೀರು'] }, { id: 'i2', kind: 'word', topic: 'people', source: 'friend', open: false, bank: ['ಸ್ನೇಹಿತ', 'ಮನೆ'] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['ಮನೆ', 'ನೀರು'] }] };
        const post = `(url, body) => url.endsWith('/check') ? (body.given === 'ಸ್ನೇಹಿತ'
            ? { correct: true, verdict: 'exact', answer: 'ಸ್ನೇಹಿತ', accepted: [], explanation: '', diff: [], events: [{ kind: 'xp', amount: 2 }] }
            : { correct: false, verdict: 'almost', closeness: 70, closest: 'ಸ್ನೇಹಿತ', answer: 'ಸ್ನೇಹಿತ', accepted: ['ಗೆಳೆಯ'], explanation: 'Friend is ಸ್ನೇಹಿತ.', diff: [{ w: 'ಸ್ನೇಹ', t: 'extra' }, { w: 'ಸ್ನೇಹಿತ', t: 'missing' }], events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/t1'), api: apiModule({ '/linguistic/lessons/t1': LESSON }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const bank = $$('[data-tiles] button').map((b) => b.innerText);
            $$('[data-tiles] button').find((b) => b.innerText === 'ಸ್ನೇಹಿತ').click(); await sleep(60);
            const slot = $$('[data-tiles] button').find((b) => b.textContent === 'ಸ್ನೇಹಿತ').classList.contains('invisible');
            await press(); await sleep(150);
            const first = sheet();
            $('[data-swap-input]').click(); await sleep(120);
            $$('[data-answer-area] button').find((b) => /kannada letters|ಕನ್ನಡ ಅಕ್ಷರಗಳು/i.test(b.innerText)).click(); await sleep(120);
            const grids = ${KEY_ROWS}('[data-kannada-keys]');
            for (const k of ['ಸ', '್', 'ನ', 'ೇ', 'ಹ']) { $$('[data-kannada-keys] button').find((b) => b.getAttribute('aria-label') === 'Kannada ' + k).click(); await sleep(40); }
            const typed = $('[data-translation] textarea').value;
            await press(); await sleep(150);
            const fix = { sheet: sheet(), kept: $('[data-translation] textarea').value, red: $('[data-translation] textarea').dataset.wrong, correction: text($('[data-correction]')), why: text($('[data-correction-why]')), button: text($('[data-primary]')) };
            return { bank, slot, first, typed, fix, grids,
                sent: window.__calls.filter((c) => c[1].endsWith('/check')).map((c) => c[2]), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.bank, ['ಮನೆ', 'ಸ್ನೇಹಿತ', 'ನೀರು']);
        assert.equal(result.slot, true, 'a used tile leaves its slot');
        assert.equal(result.first, null, 'right: no sheet, straight to the next one (2026-10-27)');
        assert.equal(result.typed, 'ಸ್ನೇಹ');
        assert.equal(result.grids.length, 3, 'vowels, signs, consonants');
        assertKeyRows(result.grids, 'Kannada');
        assert.deepEqual(result.sent, [{ section: 'items', id: 'i1', given: 'ಸ್ನೇಹಿತ' }, { section: 'items', id: 'i2', given: 'ಸ್ನೇಹ' }]);
        assert.deepEqual(result.fix, { sheet: null, kept: 'ಸ್ನೇಹ', red: 'true', correction: 'ಸ್ನೇಹಿತ', why: 'ಏಕೆ: Friend is ಸ್ನೇಹಿತ.', button: 'ಮುಂದುವರಿಸಿ' },
            'no sheet: the answer stays, the right one in green with why ("Why:" in Kannada), and CONTINUE to the same question again');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('vocabulary: the flashcards, then matching pairs — a wrong pair is shaken off, all matched goes straight on (2026-10-27)', async () => {
        const words = [['house', 'ಮನೆ'], ['water', 'ನೀರು'], ['friend', 'ಸ್ನೇಹಿತ'], ['book', 'ಪುಸ್ತಕ']].map(([word, kannada]) => ({ word, kannada, pos: 'noun', example: `A ${word}.`, synonyms: [], antonyms: [] }));
        const LESSON = { id: 'v1', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Home', direction: null, passingScore: 60, learn: {}, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 },
            words, quiz: [{ id: 'meaning:0', type: 'mcq', prompt: 'What does "house" mean in Kannada?', options: ['ಮನೆ', 'ನೀರು'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/v1'), api: apiModule({ '/linguistic/lessons/v1': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            $('[data-flashcard]').click(); await sleep(150);
            const back = text($('[data-flashcard]'));
            await press();
            const en = (w) => $$('[data-pair="en"]').find((b) => b.innerText.trim().endsWith(w));
            const kn = (w) => $$('[data-pair="kn"]').find((b) => b.innerText.trim().endsWith(w));
            en('house').click(); await sleep(60); kn('ನೀರು').click(); await sleep(100);
            const shaken = !!$('[data-pair].lingo-shake') && !sheet();
            for (const [a, b] of [['house', 'ಮನೆ'], ['water', 'ನೀರು'], ['friend', 'ಸ್ನೇಹಿತ'], ['book', 'ಪುಸ್ತಕ']]) { en(a).click(); await sleep(30); kn(b).click(); await sleep(60); }
            await sleep(150);
            const tone = sheet();
            await sleep(700);
            return { back, shaken, tone, next: text($('[data-answer-area] h1')), checks: window.__calls.filter((c) => c[1].endsWith('/check')).length, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.back, /ಮನೆ/); assert.match(result.back, /A house\./);
        assert.equal(result.shaken, true);
        assert.equal(result.tone, null, 'no green sheet');
        assert.equal(result.next, 'ಈ ಪದವನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯಿರಿ', 'on to the next exercise by itself');
        assert.equal(result.checks, 0, 'matching is checked on the page');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('the placement test: no marks until the end, every answer sent at once, the level found', async () => {
        const PL = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }, { id: 'pl2', band: 'intermediate', type: 'mcq', prompt: 'I have lived here ___ 2019.', options: ['since', 'for'] }, { id: 'pl3', band: 'advanced', type: 'mcq', prompt: 'Hardly ___ I arrived.', options: ['had', 'have'] }] };
        const post = `(url, body) => ({ level: 'intermediate', score: 2, total: 3, events: [], bands: { beginner: { score: 1, total: 1 }, intermediate: { score: 1, total: 1 }, advanced: { score: 0, total: 1 } },
            results: [{ id: 'pl1', prompt: 'She ___ a doctor.', given: body.answers.pl1, correct: true, answer: 'is' }, { id: 'pl2', prompt: 'since', given: body.answers.pl2, correct: true, answer: 'since' }, { id: 'pl3', prompt: 'Hardly', given: body.answers.pl3, correct: false, answer: 'had' }] })`;
        const { result, errors } = await screen({ entry: app('/linguistic/placement'), api: apiModule({ '/linguistic/placement': PL }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            const intro = text($('[data-answer-area] h1'));
            await press();
            const sheets = [];
            for (const pick of ['is', 'since', 'have']) { $$('[data-option]').find((b) => b.innerText.trim().endsWith(pick)).click(); await sleep(50); await press(); sheets.push(sheet()); }
            await sleep(600);
            return { intro, sheets, hearts: !!$('[data-hearts]'), sent: window.__calls.find((c) => c[0] === 'POST')?.[2], title: text($('[data-finish-title]')), stats: $$('[data-stat]').map(text) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.intro, /find your English level/);
        assert.deepEqual(result.sheets, [null, null, null], 'no right or wrong shown during the test');
        assert.equal(result.hearts, false, 'no hearts in a test');
        assert.deepEqual(result.sent, { answers: { pl1: 'is', pl2: 'since', pl3: 'have' } });
        assert.equal(result.title, 'Your level: Intermediate');
        assert.deepEqual(result.stats, ['BEGINNER 1/1', 'INTERMEDIATE 1/1', 'ADVANCED 0/1']);
    });

    test('your language: a device set to Japanese is offered Japanese, once; the chip opens the choice any time', async () => {
        const post = `(url, body) => ({ language: { code: body.language, name: 'Japanese', native: '日本語' }, languageChosen: true, languages: [] })`;
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard', 'ja-JP'), api: apiModule(SHELL_API, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            localStorage.removeItem('lingo:language-asked');
            await sleep(1300);
            const picker = $('[data-language-picker]');
            const offered = { open: !!picker, picked: $('[data-speak]')?.value, first: $$('[data-speak] option').map((o) => o.value)[0], groups: $$('[data-speak] optgroup').map((g) => g.label), note: /Your device is set to Japanese/.test(picker?.textContent || '') };
            $('[data-picker-save]').click(); await sleep(500);
            const sent = window.__calls.find((c) => c[1] === '/linguistic/language')?.[2];
            const closed = !$('[data-language-picker]'), asked = localStorage.getItem('lingo:language-asked');
            $('[data-language-chip]').click(); await sleep(500);
            const box = $('[data-language-picker]').getBoundingClientRect(), room = $('[data-language-picker]').parentElement.getBoundingClientRect();
            const popup = [Math.round(box.top - room.top), Math.round(room.bottom - box.bottom), Math.round(box.left - room.left), Math.round(room.right - box.right)];
            return { offered, sent, closed, asked, chip: !!$('[data-language-picker]'), popup, wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.offered, { open: true, picked: 'ja', first: 'ja', groups: ['Your device’s language', 'Languages of India', 'World languages'], note: true });
        assert.deepEqual(result.sent, { language: 'ja' });
        assert.equal(result.closed, true); assert.equal(result.asked, '1', 'not offered again');
        assert.equal(result.chip, true);
        const [top, bottom, left, right] = result.popup;
        assert.ok(top >= 16 && Math.abs(top - bottom) <= 2 && left >= 16 && Math.abs(left - right) <= 2, `a popup in the middle of the phone, not a sheet from the bottom (${result.popup})`);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a device in English (or Kannada) is not asked: Kannada stays, as before', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard', 'en-IN'), api: apiModule(SHELL_API), styles: true, script: `
            localStorage.removeItem('lingo:language-asked');
            await sleep(1200);
            return { picker: !!$('[data-language-picker]'), chip: $('[data-language-chip]')?.dataset.languageChip };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result, { picker: false, chip: 'kn' });
    });

    test('learning German from English (2026-10-28): "English → German" on every sentence, both ways', async () => {
        const LESSON = { id: 'tg', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Greetings', direction: 'en-kn', passingScore: 60, language: 'en', languageName: 'English',
            course: 'de', target: 'de', targetName: 'German', targetLocale: 'de-DE',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'greetings', source: 'Guten Morgen.', open: false, bank: ['Good', 'morning', 'water'] }, { id: 'i2', kind: 'sentence', topic: 'greetings', source: 'Thank you.', open: false, direction: 'kn-en', bank: ['Danke', 'Wasser'] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['Haus', 'Wasser'] }] };
        const post = `(url, body) => url.endsWith('/check') ? { correct: true, verdict: 'exact', answer: body.given, accepted: [], explanation: '', diff: [], events: [] } : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tg'), api: apiModule({ '/linguistic/lessons/tg': LESSON }, post), styles: true, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const first = { pair: text($('[data-course-pair]')), title: text($('[data-answer-area] h1')) };
            for (const t of ['Good', 'morning']) { $$('[data-tiles] button').find((b) => b.textContent === t).click(); await sleep(50); }
            await press(); await sleep(400);
            return { first, second: text($('[data-course-pair]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.first.pair, 'English → German', 'not "German → English", though this sentence is German to write in English');
        assert.match(result.first.title, /English/, 'the title says which language to write in');
        assert.equal(result.second, 'English → German');
    });

    test('every language\'s letter keys on a narrow phone (2026-11-03): rows as a phone keyboard\'s — full lines edge to edge, a short last line in the middle, one key width', async () => {
        const out = {};
        for (const code of ['hi', 'mr', 'ta', 'te', 'ml', 'bn', 'gu', 'pa', 'or', 'ur', 'ar', 'ru', 'ko', 'es', 'fr', 'pt']) {
            const LESSON = { id: 'kb', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Sentences', direction: 'kn-en', passingScore: 60, language: 'en', languageName: 'English',
                course: code, target: code, targetName: code, targetLocale: code,
                learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
                items: [{ id: 'i1', kind: 'sentence', topic: 'greetings', source: 'Good morning, how are you?', open: true, bank: [] }], quiz: [] };
            const { result, errors } = await screen({ entry: app('/linguistic/translation/kb'), api: apiModule({ '/linguistic/lessons/kb': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
                ${DRIVE}
                await sleep(900);
                await press();
                $('[data-letters-toggle]').click(); await sleep(250);
                return { rows: ${KEY_ROWS}('[data-keys-popup]'), wide: (() => { ${SESSION_WIDE} })() };` });
            assert.deepEqual(errors, [], code);
            assert.equal(result.__error, undefined, `${code}: ${result.__error}`);
            assertKeyRows(result.rows, code);
            assert.ok(result.wide <= 1, `${code}: nothing wider than the phone (${result.wide}px)`);
            out[code] = result.rows.map((r) => r.holds);
        }
        assert.ok(Object.values(out).flat().every((n) => n === 6), `6 keys to a line on a narrow phone (${JSON.stringify(out)})`);
    });

    test('the Spanish keyboard (2026-10-31): every letter a–z with ñ after l, Shift for capitals, the accents and ¿ ¡ — inside a phone', async () => {
        const LESSON = { id: 'sp', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Sentences', direction: 'kn-en', passingScore: 60, language: 'en', languageName: 'English',
            course: 'es', target: 'es', targetName: 'Spanish', targetLocale: 'es-ES',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'greetings', source: 'Good morning, how are you?', open: true, bank: [] }], quiz: [] };
        const post = `(url, body) => ({ step: body.step })`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/sp'), api: apiModule({ '/linguistic/lessons/sp': LESSON }, post), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            $('[data-letters-toggle]').click(); await sleep(200);
            const keys = $('[data-keys-popup="es"] [data-letter-keys="es"]');
            if (!keys) return { open: false };
            const rows = [...keys.querySelectorAll(':scope > div')].slice(0, 3).map((r) => [...r.querySelectorAll('[data-key]')].map((b) => b.dataset.key).join(''));
            const tap = async (sel) => { keys.querySelector(sel).click(); await sleep(40); };
            await tap('[data-key="¿"]');
            await tap('[data-shift-key]');
            for (const k of [...'hola']) await tap('[data-key="' + k + '"]');
            await tap('[data-key="ñ"]');
            const typed = $('[data-answer-area] textarea').value;
            const pop = $('[data-keys-popup] > div').getBoundingClientRect();
            const all = [...keys.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
            return { open: true, rows, letters: keys.querySelectorAll('[data-key]').length, accents: [...keys.querySelectorAll('[data-key]')].filter((b) => /[áéíóúü]/.test(b.dataset.key)).map((b) => b.dataset.key).join(''),
                typed, shiftAfter: keys.dataset.shift, inside: all.every((r) => r.left >= pop.left - 1 && r.right <= pop.right + 1), smallest: Math.round(Math.min(...all.map((r) => r.width))), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.open, true, 'the keyboard pops up');
        assert.deepEqual(result.rows, ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'], 'every letter, in the rows of a Spanish keyboard');
        assert.equal(result.accents, 'áéíóúü');
        assert.equal(result.typed, '¿Holañ', 'Shift makes the next letter a capital, then the letters are small again');
        assert.equal(result.shiftAfter, '0');
        assert.equal(result.inside, true, 'every key inside the keyboard');
        assert.ok(result.smallest >= 24, `keys big enough to tap (${result.smallest}px)`);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a sentence in Kannada or Japanese to put in English (2026-11-04): no letter keyboard — the answer is English', async () => {
        const out = {};
        for (const [code, name, locale, source] of [['kn', 'Kannada', 'kn-IN', 'ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ.'], ['ja', 'Japanese', 'ja-JP', '私は学校に行きます。']]) {
            const LESSON = { id: 'te', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Sentences', direction: 'en-kn', passingScore: 60, language: 'en', languageName: 'English',
                course: code, target: code, targetName: name, targetLocale: locale, learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
                items: [{ id: 'i1', kind: 'sentence', topic: 'school', source, open: false, bank: ['school', 'to', 'book', 'go', 'I', 'name'] }], quiz: [] };
            const { result, errors } = await screen({ entry: app('/linguistic/translation/te'), api: apiModule({ '/linguistic/lessons/te': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
                ${DRIVE}
                await sleep(1000);
                await press();
                const tiles = !!$('[data-tiles]');
                $('[data-swap-input]').click(); await sleep(150);
                return { tiles, typing: !!$('[data-answer-area] textarea'), placeholder: $('[data-answer-area] textarea')?.placeholder, toggle: !!$('[data-letters-toggle]'), popup: !!$('[data-keys-popup]') };` });
            assert.deepEqual(errors, [], code);
            assert.equal(result.__error, undefined, `${code}: ${result.__error}`);
            out[code] = result;
        }
        for (const code of ['kn', 'ja']) assert.deepEqual(out[code], { tiles: true, typing: true, placeholder: 'Type in English', toggle: false, popup: false }, `${code}: typed in English, no ${code} letters`);
    });

    test('a passage to write in Japanese (2026-10-29): the Japanese letters as a keyboard that pops up (an answer in English has none since 2026-11-04)', async () => {
        const LESSON = { id: 'tp', module: 'translation', moduleLabel: 'Translation Practice', level: 'advanced', title: 'Passages', direction: 'kn-en', passingScore: 75, language: 'en', languageName: 'English',
            course: 'ja', target: 'ja', targetName: 'Japanese', targetLocale: 'ja-JP',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i5', kind: 'passage', topic: 'work', source: 'I finished my degree last year.', open: true, bank: [] }],
            quiz: [{ id: 'q1', type: 'translation', source: '家', bank: ['house', 'water'] }] };
        const post = `(url, body) => url.endsWith('/check') ? { correct: null, verdict: 'review', answer: 'I finished my degree last year.', accepted: [], explanation: '', diff: [], events: [] } : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tp'), api: apiModule({ '/linguistic/lessons/tp': LESSON }, post), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const box = $('[data-answer-area] textarea');
            const out = { placeholder: box?.placeholder, shut: !$('[data-letter-keys="ja"]'), toggle: text($('[data-letters-toggle]')) };
            $('[data-letters-toggle]').click(); await sleep(150);
            out.keys = !!$('[data-keys-popup="ja"] [data-letter-keys="ja"]');
            for (const k of ['わ', 'た', 'し']) { $$('[data-letter-keys="ja"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            out.typed = $('[data-answer-area] textarea').value;
            const tap = async (label) => { $$('[data-keys-popup] button').find((b) => b.getAttribute('aria-label') === label).click(); await sleep(40); };
            await tap('Letter か'); await tap('Voiced: か to が'); await tap('Letter つ'); await tap('Small: つ to っ');
            out.marked = $('[data-answer-area] textarea').value;
            out.preview = text($('[data-keys-typed]'));
            const keys = $$('[data-keys-popup] [data-letter-keys] button[aria-label^="Letter "]').slice(0, 7).map((b) => b.getBoundingClientRect());
            out.chart = { downFirst: keys[1].top > keys[0].top && Math.abs(keys[1].left - keys[0].left) < 2, nextColumn: keys[5].left > keys[0].left && Math.abs(keys[5].top - keys[0].top) < 2 };
            const pop = $('[data-keys-popup] > div').getBoundingClientRect();
            out.fits = pop.height <= innerHeight * 0.85;
            $$('[data-kana-tab]')[1].click(); await sleep(80);
            out.katakana = text($$('[data-keys-popup] [data-letter-keys] button[aria-label^="Letter "]')[5]);
            out.wide = (() => { ${SESSION_WIDE} })();
            $('[data-keys-close]').click(); await sleep(150);
            out.closed = !$('[data-keys-popup]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.doesNotMatch(result.placeholder, /Type in English/); assert.match(result.placeholder, /日本語/);
        assert.equal(result.shut, true, 'shut until the keyboard icon is tapped');
        assert.equal(result.keys, true, 'the Japanese letters pop up');
        assert.equal(result.closed, true, 'Done closes them');
        assert.match(result.toggle, /Japanese letters/i);
        assert.equal(result.typed, 'わたし', 'tapped in');
        assert.equal(result.marked, 'わたしがっ', '゛ and 小 change the kana just typed, as a Japanese keyboard does');
        assert.match(result.preview, /わたしがっ/, 'what is typed, in view on the keyboard');
        assert.deepEqual(result.chart, { downFirst: true, nextColumn: true }, 'the kana chart: あいうえお down a column, か in the next');
        assert.equal(result.fits, true, 'the keyboard fits on the phone');
        assert.match(result.katakana, /^カ/, 'the Katakana tab');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('Japanese: the course "Japanese → English", Japanese tiles, and kana keys to type with', async () => {
        const LESSON = { id: 'tj', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Everyday words', direction: 'en-kn', passingScore: 60, language: 'ja', languageName: 'Japanese',
            learn: { intro: 'Translate into Japanese.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i3', kind: 'sentence', topic: 'greetings', source: 'Good morning.', open: false, bank: ['ございます', '水', 'おはよう'] }, { id: 'i4', kind: 'word', topic: 'home', source: 'house', open: false, bank: ['家', '水'] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['家', '水'] }] };
        const post = `(url, body) => url.endsWith('/check') ? { correct: body.given.replace(/ /g, '') === 'おはようございます', verdict: body.given.replace(/ /g, '') === 'おはようございます' ? 'exact' : 'wrong', answer: 'おはようございます。', accepted: [], explanation: '', diff: [], events: [] } : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tj'), api: apiModule({ '/linguistic/lessons/tj': LESSON }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const shown = { title: text($('[data-answer-area] h1')), direction: text($('[data-translation] span')), tiles: $$('[data-tiles] button').map((b) => b.textContent) };
            for (const t of ['おはよう', 'ございます']) { $$('[data-tiles] button').find((b) => b.textContent === t).click(); await sleep(50); }
            await press(); await sleep(150);
            const tiled = sheet();
            const sent = window.__calls.find((c) => c[1].endsWith('/check'))?.[2];
            $('[data-swap-input]').click(); await sleep(120);
            const label = $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText))?.innerText;
            const openAtOnce = !!$('[data-letter-keys="ja"]');
            $('[data-letters-toggle]').click(); await sleep(150);
            const popup = { open: !!$('[data-keys-popup="ja"] [data-letter-keys="ja"]'), says: $$('[data-keys-popup] [data-key-say]').slice(0, 7).map((x) => x.textContent) };
            for (const k of ['い', 'え']) { $$('[data-letter-keys="ja"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            return { shown, tiled, sent, label, openAtOnce, popup, typed: $('[data-translation] textarea').value, placeholder: $('[data-translation] textarea').placeholder, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.shown.title, 'この文を訳してください', 'the instruction in Japanese, the language they know (2026-10-24)'); assert.equal(result.shown.direction, 'Japanese → English', 'the course, from their language to the one learnt (2026-10-28), though this sentence is English to write in Japanese');
        assert.deepEqual(result.shown.tiles, ['ございます', '水', 'おはよう']);
        assert.equal(result.tiled, null, 'right: straight on'); assert.deepEqual(result.sent, { section: 'items', id: 'i3', given: 'おはよう ございます' });
        assert.match(result.label, /japanese letters/i);
        assert.equal(result.openAtOnce, false, 'the letters wait for the keyboard icon (2026-10-29: a popup)');
        assert.deepEqual(result.popup, { open: true, says: ['a', 'i', 'u', 'e', 'o', 'ka', 'ki'] }, 'it pops up, each kana with its sound in English letters under it');
        assert.equal(result.typed, 'いえ'); assert.equal(result.placeholder, '日本語で書いてください…');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('Urdu runs right to left: the tiles, the answer box and its letters', async () => {
        const LESSON = { id: 'tu', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Words', direction: 'en-kn', passingScore: 60, language: 'ur', languageName: 'Urdu',
            learn: { intro: 'Translate into Urdu.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'names', source: 'My name is Rani.', open: false, bank: ['میرا', 'نام', 'رانی', 'ہے', 'گھر'] }], quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['گھر', 'پانی'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tu'), api: apiModule({ '/linguistic/lessons/tu': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            const tiles = { dir: $('[data-tiles]').getAttribute('dir'), placedDir: $('[data-placed]').getAttribute('dir') };
            const first = $$('[data-tiles] button').find((b) => b.textContent === 'میرا'), second = $$('[data-tiles] button').find((b) => b.textContent === 'نام');
            first.click(); await sleep(40); second.click(); await sleep(60);
            const placed = $$('[data-placed] button');
            // Right to left: the first word placed sits to the right of the second.
            tiles.order = placed[0].getBoundingClientRect().left > placed[1].getBoundingClientRect().left;
            $('[data-swap-input]').click(); await sleep(120);
            $$('[data-answer-area] button').find((b) => /urdu letters/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['گ', 'ھ', 'ر']) { $$('[data-letter-keys="ur"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            const box = $('[data-translation] textarea');
            return { tiles, box: [box.value, box.getAttribute('dir'), box.placeholder], title: text($('[data-answer-area] h1')), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.tiles, { dir: 'rtl', placedDir: 'rtl', order: true });
        assert.deepEqual(result.box, ['گھر', 'rtl', 'اردو میں لکھیں…']);
        assert.equal(result.title, 'اس جملے کا ترجمہ کریں');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('Korean letter keys join into syllables as they are tapped, and Delete takes one letter back', async () => {
        const LESSON = { id: 'tk', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Words', direction: 'en-kn', passingScore: 60, language: 'ko', languageName: 'Korean',
            learn: { intro: 'Translate into Korean.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'word', topic: 'words', source: 'Korean language', open: false, bank: null }], quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: null }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/tk'), api: apiModule({ '/linguistic/lessons/tk': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press();
            $$('[data-answer-area] button').find((b) => /korean letters/i.test(b.innerText)).click(); await sleep(120);
            const tap = async (k) => { $$('[data-letter-keys="ko"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); };
            for (const k of ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅜ', 'ㄱ', 'ㅇ', 'ㅓ']) await tap(k);
            const typed = $('[data-translation] textarea').value;
            $$('[data-letter-keys="ko"] button').find((b) => b.getAttribute('aria-label') === 'Delete one letter').click(); await sleep(60);
            return { typed, after: $('[data-translation] textarea').value, title: text($('[data-answer-area] h1')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.title, '이 문장을 번역하세요', 'the instruction in Korean, the language they know (2026-10-24)');
        assert.equal(result.typed, '한국어');
        assert.equal(result.after, '한국ㅇ');
    });

    test('revision: a mistake asked again; answered right, it is fixed', async () => {
        const REVIEW = { fixed: 2, mistakes: [{ id: 'm1', module: 'grammar', moduleLabel: 'Grammar Practice', level: 'beginner', lessonTitle: 'Articles', kind: 'question', count: 2, given: 'a', question: { id: 'q1', type: 'fill', prompt: 'This is ___ easy question.' } }] };
        const post = `(url, body) => ({ correct: body.given === 'an', resolved: body.given === 'an', answer: 'an', explanation: 'Vowel sound.' })`;
        const { result, errors } = await screen({ entry: app('/linguistic/review'), api: apiModule({ '/linguistic/review': REVIEW }, post), styles: true, script: `
            ${DRIVE}
            await sleep(900);
            typeIn('an'); await sleep(60);
            const filled = text($('[data-question="q1"] .lingo-bubble'));
            await press(); await sleep(150);
            const tone = sheet();
            await sleep(300);
            return { filled, tone, sent: window.__calls.find((c) => c[0] === 'POST')?.slice(1), title: text($('[data-finish-title]')), stats: $$('[data-stat]').map(text).slice(0, 1) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.filled, 'This is an easy question.', 'what is typed shows in the blank');
        assert.equal(result.tone, null, 'right: no sheet, straight on (2026-10-27)');
        assert.deepEqual(result.sent, ['/linguistic/review/m1', { given: 'an' }]);
        assert.equal(result.title, 'All fixed!'); assert.deepEqual(result.stats, ['FIXED 1/1']);
    });
});
