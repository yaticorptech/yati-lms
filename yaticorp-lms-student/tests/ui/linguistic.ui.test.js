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
// After a wrong answer the right one shows for a few seconds and the question comes again by itself (2026-11-05): wait for it.
const press = async () => { for (let i = 0; i < 40 && ($('[data-auto-next]') || $('[data-mood="right"]')); i++) await sleep(200); ($('[data-continue]') || $('[data-primary]'))?.click(); await sleep(260); for (let i = 0; i < 15 && $('[data-mood="right"]'); i++) await sleep(100); };
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

    test('starting out (2026-10-27, eight questions taken out; 2026-10-28, "where to start" too; 2026-11-04, the time set by itself and the level last): Get started, the language to learn and the level, the reason, the translation language, the roadmap and where it leads — each question waits for an answer', async () => {
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
                if (name === 'level') { out.cefr = $$('[data-cefr]').map((x) => x.textContent); out.levels = $$('[data-level]').map((x) => x.dataset.level); out.levelTitle = text($('[data-onboarding] h1')); out.last = btn().textContent.trim(); out.times = $$('[data-plan-days]').length; }
                btn().click(); await sleep(450);
            };
            await pass();
            out.learn = { english: $('[data-course="en"]')?.getAttribute('aria-pressed'), tiles: $$('[data-course]').length };
            const box = $('[data-language-search]');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, 'hin'); box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(120);
            out.learn.found = $$('[data-course]').map((x) => x.dataset.course);
            await pass();
            await stepIs('why', '[data-reason="abroad"]');
            out.translateFirst = $$('[data-language]')[0]?.dataset.language;
            await stepIs('translate', '[data-language="ja"]');
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
            await pass();
            await stepIs('level', '[data-level="beginner"]');
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.tabs, 0, 'the section waits behind the start screens');
        assert.deepEqual(result.welcome, ['welcome', 'Get started', false], 'first, Get started');
        assert.deepEqual(result.learn, { english: 'true', tiles: 5, found: ['hi'] }, 'English to begin; the languages searched');
        assert.deepEqual(result.shown, [['welcome', false], ['learn', false], ['chart', false], ['speak', false], ['write', false], ['read', false]], 'the screens with nothing to choose (or already chosen) go on');
        assert.deepEqual(result.knows, { first: ['ja'], title: 'Which languages do you speak?', top: 'en', count: '2 chosen', write: 'Which languages can you write?', none: true, read: 'Which languages can you read?' }, 'the three language questions; one or more each');
        const asked = ['why', 'translate', 'level'];
        assert.deepEqual(result.steps, asked.flatMap((n) => [[n, true], [n, false, true]]), 'CONTINUE is grey, and does nothing, until an answer is chosen');
        assert.deepEqual([result.levels, result.cefr, result.levelTitle], [['beginner', 'advanced'], ['A1–A2', 'B2+'], 'Are you a Beginner or an Advanced English learner?'], 'last (2026-11-04): Beginner or Advanced');
        assert.equal(result.times, 0, 'no time to choose (2026-11-04)');
        assert.equal(result.translateFirst, 'en', 'the device\'s language (English, in this browser) first');
        assert.equal(result.chart, '13', 'where the 90 days of a Beginner take them: week 13');
        assert.equal(result.last, 'Start learning', 'the level is the last screen (2026-11-04; no "where to start" — everyone starts at Section 1, Unit 1)');
        assert.deepEqual(result.sent, [
            ['/linguistic/about', { reason: 'abroad', know: 0 }], ['/linguistic/knows', { speak: ['ja', 'hi'], write: ['ja'], read: ['ja'] }],
            ['/linguistic/language', { language: 'ja' }], ['/linguistic/plan', {}], ['/linguistic/level', { level: 'beginner' }]
        ], 'the answers and their languages; the language they know, the plan (its days set by the server), then the level');
    });

    test('starting out at Advanced (2026-10-31; the last question since 2026-11-04): choosing Advanced says a test comes first; then (2026-11-07) "Now, let\'s find the best place to start!" in the language they know — Find my level opens the test; from scratch, no test', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languages: [...DASH.languages, { code: 'en', name: 'English', native: 'English', group: 'world' }] };
        const JT = { id: 'jt', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Beginner assessment', review: 'assessment', direction: null, passingScore: 50, learn: { intro: 'The jump test: 20 questions on Beginner.' }, progress: { status: 'new', step: 'learn', bestScore: null, attempts: 0 }, words: [], quiz: [] };
        const post = `(url, body) => url.endsWith('/jump') ? { level: 'advanced', lesson: 'jt', module: 'vocabulary' } : ({ ok: true, level: body.level, placement: { level: body.level, chosen: true } })`;
        const run = (language, begin) => screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/lessons/jt': JT, ...SHELL_API, '/linguistic/': fresh }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const at = () => $('[data-onboarding]')?.dataset.onboarding;
            const go = async () => { btn().click(); await sleep(400); };
            const out = {};
            const picks = { why: '[data-reason="abroad"]', translate: '[data-language="${language}"]' };
            for (let i = 0; i < 14 && at() !== 'level'; i++) {
                const pick = picks[at()];
                if (pick && btn().disabled) { $(pick).click(); await sleep(120); }
                await go();
            }
            $('[data-level="beginner"]').click(); await sleep(120);
            out.noteForNew = !!$('[data-advanced-test-note]');
            $('[data-level="advanced"]').click(); await sleep(120);
            out.note = text($('[data-advanced-test-note]'));
            out.label = btn().textContent.trim();
            await go();
            // Where to start (2026-11-07): in the language they know; CONTINUE waits for a choice.
            out.start = { at: at(), title: text($('[data-onboarding] h1')), choices: $$('[data-begin]').map((b) => text(b)), waits: btn().disabled };
            $('[data-begin="${begin}"]').click(); await sleep(120);
            out.start.label = btn().textContent.trim();
            await go();
            await sleep(600);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]);
            out.opened = window.__calls.some((c) => c[0] === 'GET' && c[1].endsWith('/lessons/jt'));
            out.inTest = !!$('[data-lingo-session]') && !$('[data-onboarding]');
            return out;` });
        const { result, errors } = await run('ja', 'test');
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.noteForNew, false, 'no test for a Beginner');
        assert.equal(result.label, 'Continue', 'Advanced: on to where to start');
        assert.equal(result.start.at, 'start');
        assert.equal(result.start.title, 'では、いちばんいいスタート地点を見つけよう！', 'in Japanese, the language they know');
        assert.match(result.start.choices[0], /ゼロから始める\s*英語コースのいちばんやさしいレッスンから/);
        assert.match(result.start.choices[1], /レベルを調べる\s*短いテストで、どこから始めるかお知らせします/);
        assert.deepEqual([result.start.waits, result.start.label], [true, 'テストを始める'], 'CONTINUE waits for a choice; Find my level: start the test');
        assert.match(result.note, /first take the Advanced entry test.*20 questions, 10 on Beginner and 10 on Advanced.*half of each right and Advanced opens.*start from Beginner.*one try/);
        assert.deepEqual(result.sent.slice(-3), ['/linguistic/plan', '/linguistic/level', '/linguistic/jump'], 'the plan (90 days until the test is passed), started at Beginner, then the jump test to Advanced');
        assert.equal(result.opened, true, 'the test opens straight away');
        assert.equal(result.inTest, true);
        // A Kannada speaker, from scratch (the user's picture): the screen in Kannada; the first lesson, no test.
        const k = await run('kn', 'scratch');
        assert.deepEqual(k.errors, []);
        assert.equal(k.result.__error, undefined, k.result.__error);
        assert.equal(k.result.start.title, 'ಈಗ, ಪ್ರಾರಂಭಿಸಲು ಉತ್ತಮ ಸ್ಥಳವನ್ನು ನಿರ್ಧರಿಸೋಣ!');
        assert.match(k.result.start.choices[0], /ಮೊದಲಿನಿಂದ ಕಲಿಕೆ ಪ್ರಾರಂಭಿಸಿ\s*ಇಂಗ್ಲಿಷ್ ಕೋರ್ಸ್‌ನಿಂದ ಅತಿ ಸುಲಭ ಪಾಠವನ್ನು ಅಭ್ಯಸಿಸಿ/);
        assert.match(k.result.start.choices[1], /ನನ್ನ ಹಂತವನ್ನು ತಿಳಿಯೋಣ/);
        assert.equal(k.result.start.label, 'ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಿ');
        assert.deepEqual(k.result.sent.slice(-2), ['/linguistic/plan', '/linguistic/level'], 'from scratch: started at Beginner, no jump test');
        assert.equal(k.result.opened, false);
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

    test('the roadmap (2026-10-24): the day of the plan, one lesson behind, today\'s lessons to tap, the days to come; the time is not changed here (2026-11-04: set by itself)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/roadmap'), api: apiModule(SHELL_API, '(url, body) => ({ ...' + JSON.stringify(ROADMAP) + ', plan: { ...' + JSON.stringify(ROADMAP.plan) + ', days: body.days } })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1300);
            const out = { roadmap: $('[data-roadmap]')?.dataset.roadmap, day: text($('[data-plan-day]')), status: $('[data-plan-status]')?.dataset.planStatus,
                today: $$('[data-today] [data-roadmap-lesson]').map((x) => x.dataset.roadmapLesson), link: $('[data-today] a[data-roadmap-lesson]')?.getAttribute('href'),
                rows: $$('[data-plan-day-row]').map((x) => x.dataset.planDayRow), wide: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) };
            out.change = [!!$('[data-plan-change]'), $$('[data-plan-days]').filter((x) => /^\\d+$/.test(x.dataset.planDays)).length, /Change my time|Choose a longer time/i.test(document.body.innerText)];
            out.sent = window.__calls.filter((c) => c[0] === 'POST').length;
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.roadmap, result.day, result.status], ['30', '3', 'orange'], result.text);
        assert.deepEqual(result.today, ['r3', 'r4']);
        assert.equal(result.link, '/linguistic/grammar/r4', 'the lesson to do today opens from the roadmap');
        assert.deepEqual(result.rows, ['3', '4'], 'today and the days to come; the days gone folded away');
        assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        assert.deepEqual([result.change, result.sent], [[false, 0, false], 0], 'the time is not changed here (2026-11-04: set by itself)');
    });

    test('a student who started before the learning plan: on entering, the plan is made by itself — no time to choose — then the section (2026-10-26; 2026-11-04)', async () => {
        const before = { ...DASH, plan: null };
        const post = `(url, body) => (url.includes('/plan') ? ${JSON.stringify(ROADMAP)} : { ok: true })`;
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': before }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1300);
            return { choices: $$('[data-plan-days]').length, question: /How much time/i.test(document.body.innerText), sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]),
                reloaded: window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/linguistic/').length, wide: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.choices, result.question], [0, false], 'not asked how much time they have');
        assert.deepEqual(result.sent, [['/linguistic/plan', {}]], 'the plan made, its days set by the server');
        assert.ok(result.reloaded >= 2, 'then the section loads again, to open');
        assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
    });

    test('starting out as a Beginner (2026-10-28; the level last since 2026-11-04): no "Find my level" or "start at Intermediate" — Section 1, Unit 1, as everyone', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        const PL = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/placement': PL, ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const go = async (pick) => { if (pick) { $(pick).click(); await sleep(100); } btn().click(); await sleep(400); };
            await go(); await go(); await go('[data-reason="school"]');
            await go(); await go(); await go(); await go(); await go();
            $('[data-level="beginner"]').click(); await sleep(100);
            const options = $$('[data-start]').length, label = btn().innerText.trim();
            btn().click(); await sleep(700);
            return { options, label, test: /find your English level/i.test($('[data-lingo-session] [data-answer-area] h1')?.innerText || ''), sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.options, result.label.toUpperCase()], [0, 'START LEARNING'], 'no choice of where to start');
        assert.deepEqual(result.sent.map((c) => c[0]), ['/linguistic/about', '/linguistic/knows', '/linguistic/plan', '/linguistic/level']);
        assert.deepEqual(result.sent[1][1], { speak: ['kn'], write: ['kn'], read: ['kn'] }, 'the language they know, ticked');
        assert.deepEqual([result.sent[0][1], result.sent[2][1], result.sent[3][1]], [{ reason: 'school', know: 0 }, {}, { level: 'beginner' }], 'Beginner; the plan\'s days set by the server');
        assert.equal(result.test, false, 'no placement test opened');
    });

    test('the dashboard (where the section opens; its doors none lit), like the profile dashboard: welcome, continue, skills, levels, badges (2026-10-26)', async () => {
        const modules = [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }, { id: 'grammar', total: 6, completed: 1, average: null }];
        const dash = { ...DASH, modules, plan: ROADMAP.plan, today: { xp: 10, lessons: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 390, script: `
            await sleep(1200);
            return {
                doors: $$('[data-door]').map((d) => d.dataset.door), lit: $$('[data-door][aria-selected="true"]').length,
                welcome: !!$('[data-lingo-welcome]'), message: text($('[data-lingo-welcome-line]')), pictures: $$('[data-lingo-welcome] img').map((i) => i.getAttribute('src').split('/').pop()), tiles: $$('[data-lingo-dashboard] .lift').length, road: $$('[data-road-day]').map((x) => x.dataset.roadDay + ':' + x.dataset.state), cheer: $('[data-plan-cheer]')?.dataset.planCheer, side: ['[data-plan-card]', '[data-quests]'].filter((q) => $('[data-lingo-dashboard] ' + q)).length, course: !!$('[data-lingo-course]'), mistakes: $('[data-lingo-dashboard] [data-mistakes]')?.dataset.mistakes, removed: ['[data-lingo-plan-card]', '[data-lingo-week]', '[data-lingo-badges-strip]', '[data-lingo-quick]', '[data-tab-flow]'].filter((q) => $(q)),
                stats: [$('[data-xp]')?.dataset.xp, !!$('[data-course-chip]')], cont: text($('[data-lingo-continue]')), href: $('[data-lingo-continue]')?.getAttribute('href'),
                skills: $$('[data-skill]').length, levels: $$('[data-level-row]').length, skillIcons: $$('[data-skill]').map((x) => [!!x.querySelector('[data-skill] a svg'), x.querySelector('a')?.getAttribute('href')]), levelIcons: $$('[data-level-row] svg').length, skillRow: new Set($$('[data-skill]').map((x) => Math.round(x.getBoundingClientRect().top))).size,
                wide: (() => { ${WIDE} })()
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        // The tabs became the four doors (2026-10-29, 94d3d01; their own tests: "the dashboard doors on a …"), none lit on the dashboard.
        assert.deepEqual([result.doors, result.lit], [['learn', 'writing', 'practice', 'badges'], 0], 'the four doors, none lit');
        assert.equal(result.href, '/linguistic?lesson=r4', 'Continue opens the path at that lesson');
        assert.deepEqual(result.stats, ['340', true], 'the language, level, streak and XP bar, on the dashboard');
        assert.equal(result.side, 2, 'the roadmap and daily quests, on the dashboard');
        // The row of three icons (continue, level, mistakes) went 2026-10-29: Continue in the greeting, the course and the mistakes in cards.
        assert.deepEqual([result.course, result.mistakes], [true, '4'], 'the course card and the mistakes box');
        assert.deepEqual([result.road, result.cheer], [['1:today', '8:ahead', '15:ahead', '22:ahead', '30:ahead'], 'orange'], 'the roadmap\'s road: day 3 of 30, past Day 1; one lesson behind, "Catch up!" (2026-10-27)');
        assert.deepEqual([result.welcome, result.tiles, result.removed, result.levels], [true, 0, [], DASH.levels.length], 'no number tiles, roadmap or week (taken off)');
        assert.match(result.cont, /Articles: a, an and the|Continue/);
        // The greeting and its picture since the 2026-10-29 redesign: the course named, the scene with the mascot.
        assert.equal(result.message, 'Let’s continue your English learning journey!', 'only the greeting, no other text');
        assert.ok(result.pictures.length > 0 && result.pictures.every((p) => /^hero-art\.png/.test(p)), `the scene only, no profile photo (${result.pictures})`);
        assert.equal(result.skills, 2);
        assert.ok(result.skillIcons.every(([art, href]) => art && href.startsWith('/linguistic')), 'each skill an icon that opens it (2026-10-29)');
        assert.equal(result.skillRow, 2, 'the skills a list, one under the other ("Your skills", since the 2026-10-29 redesign)');
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

    // Laid out again 2026-10-29 (94d3d01): the roadmap across, then the languages, skills and levels three in a row,
    // then the course and mistakes beside the quests; the language, level, streak and XP at the top right, no ✕ or tabs.
    test('on a laptop the dashboard takes the whole width: its cards in rows that start and end on one line (2026-10-26, 2026-10-29)', async () => {
        const dash = { ...DASH, modules: [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }], plan: ROADMAP.plan };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1400, script: `
            await sleep(1200);
            const row = (sel) => {
                const kids = [...$(sel).children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
                const spread = (k) => Math.round(Math.max(...kids.map((r) => r[k])) - Math.min(...kids.map((r) => r[k])));
                return { columns: new Set(kids.map((r) => Math.round(r.left))).size, tops: spread('top'), bottoms: spread('bottom') };
            };
            const stats = $('[data-lingo-stats]').getBoundingClientRect(), page = $('[data-lingo-dashboard]').getBoundingClientRect();
            return { trio: row('[data-lingo-dashboard-trio]'), more: row('[data-lingo-dashboard-more]'), statsRight: Math.round(page.right - stats.right) <= 2 && stats.bottom <= page.top + 1,
                close: !!$('[data-lingo-close]'), tabs: !!$('[data-tab]'), aside: !!$('aside[aria-label="Your progress"]'), width: Math.round(page.width), wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.aside, result.close, result.tabs], [false, false, false], 'no side panel, ✕ or tab bar');
        assert.equal(result.statsRight, true, 'the language, level, streak and XP at the top right');
        assert.deepEqual(result.trio, { columns: 3, tops: 0, bottoms: 0 }, 'the languages, skills and levels: three in a row, starting and ending level');
        assert.deepEqual(result.more, { columns: 2, tops: 0, bottoms: 0 }, 'the course and mistakes beside the quests: two, starting and ending level');
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
        test(`the picture stories on a ${name} (2026-10-31; one bright look since 2026-11-04): a comic page of panels — title, captions, bubbles over their speakers and clear of faces, narration — then its questions, the story there again`, async () => {
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
                        frame: getComputedStyle(panels[0]).borderTopColor + ' ' + getComputedStyle(panels[0]).borderTopLeftRadius, say: !!$('[data-comic-narration] [data-comic-say]'),
                        names: $$('[data-comic-panel="0"] [data-name-tag]').map(text), namesInside: panels.every((p) => { const b = p.firstElementChild.getBoundingClientRect(); return [...p.querySelectorAll('[data-name-tag]')].every((t) => { const r = t.getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1 && r.bottom <= b.bottom + 1; }); }),
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
                assert.equal(result.columns, name === 'phone' ? '1' : '2', `${story}: two to a row on a wide page, every story (2026-11-04)`);
                assert.equal(result.theme, built.comic.theme);
                assert.ok(result.moral.toLowerCase().includes(built.comic.moral.slice(0, 12).toLowerCase()) && result.moral.toLowerCase().startsWith((built.comic.moralLabel || 'moral:').toLowerCase()), `${story}: its moral at the end (${result.moral})`);
                assert.ok(result.zooms >= 1, `${story}: a close-up among its panels`);
                looks.push([result.theme, result.titleStyle, result.bubbleStyle, result.frame].join(' · '));
                assert.equal(result.title, built.comic.title, `${story}: its title, on the wooden sign`);
                assert.ok(result.narration, `${story}: a line of narration under its first panel`);
                assert.equal(result.say, true, `${story}: the narration's own speaker`);
                // The people's names under them (2026-11-05: the questions ask about them), in the story's language.
                const named = built.comic.panels[0].cast.filter((c) => built.comic.people[c.who]?.tag).map((c) => built.comic.people[c.who].tag);
                assert.deepEqual(result.names, named, `${story}: each named person's name in the first panel`);
                assert.equal(result.namesInside, true, `${story}: the names inside their panels`);
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
                assert.equal(result.peek, built.comic.titleEn ? `See “${built.comic.title}” (${built.comic.titleEn}) again` : `See “${built.comic.title}” again`, 'its title, and in English for a course (2026-11-06)');
                assert.equal(result.peekComic, true, `${story}: the story there again`);
            }
            // One look for every story (2026-11-04, "add this type of interface for all stories"; from 2026-10-31 each had its own):
            // the wooden sign, the purple-edged bubbles, the same rounded panels.
            assert.deepEqual([...new Set(looks.map((l) => l.split(' · ').slice(1).join(' · ')))], ['sign · oval · rgb(255, 255, 255) 18px'], `one look (${looks.join(' | ')})`);
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

    for (const [name, device] of [['Galaxy Z Fold folded', DEVICES.galaxyZFold6Folded], ['Galaxy A55', DEVICES.galaxyA55]]) {
        test(`the dashboard doors on a ${name} (2026-11-05, "make it like buttons"): one row of four round buttons, each its picture and name; the open one ringed`, async () => {
            const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API), styles: true, device, script: `
                await sleep(1300);
                const buttons = $$('[data-door] [data-door-button]');
                const rounds = buttons.map((b) => b.firstElementChild.getBoundingClientRect());
                const edge = Math.min(screen.width, $('main').getBoundingClientRect().right);
                const out = { n: buttons.length, names: buttons.map((b) => text(b)), cut: buttons.filter((b) => b.lastElementChild.scrollWidth > b.lastElementChild.clientWidth + 1).map((b) => text(b)),
                    apart: buttons.map((b) => b.lastElementChild.getBoundingClientRect()).every((r, i, all) => r.left >= 0 && r.right <= Math.min(screen.width, $('main').getBoundingClientRect().right) && (!i || r.left >= all[i - 1].right + 2)), oneRow: new Set(rounds.map((r) => Math.round(r.top))).size === 1,
                    round: rounds.every((r) => Math.round(r.width) === 64 && Math.round(r.height) === 64), inside: rounds.every((r) => r.left >= 0 && r.right <= edge),
                    cards: $$('[data-door-card]').filter((i) => i.getBoundingClientRect().width > 0).length, pictures: buttons.every((b) => !!b.querySelector('[data-door-pic] svg')), wide: (() => { ${WIDE} })() };
                $('[data-door="practice"]').click(); await sleep(500);
                out.open = [$('[data-door="practice"]').getAttribute('aria-selected'), getComputedStyle($('[data-door="practice"] [data-door-button] span')).boxShadow.includes('242, 153, 74')];
                return out;` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual([result.n, result.names, result.cut, result.apart], [4, ['Learn', 'Write', 'Practice', 'Certificates'], [], true], 'each name whole, apart from the next, inside the phone');
            assert.deepEqual([result.oneRow, result.round, result.inside, result.cards, result.pictures], [true, true, true, 0, true], 'one row, round, inside the phone, its picture in each; no big cards');
            assert.deepEqual(result.open, ['true', true], 'Practice open: its button ringed in its colour');
            assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
        });
    }

    test('the language chip shows the language being learnt (2026-11-06, the user: "why Kannada here?"): English for a Kannada speaker learning English; Japanese on a Japanese course', async () => {
        const run = (dash) => screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1440, height: 900, script: `
            await sleep(1300);
            return { mark: text($('[data-chip-mark]')), name: text($('[data-chip-name]')), course: $('[data-course-chip]')?.dataset.courseChip, speaks: $('[data-language-chip]')?.dataset.languageChip };` });
        const en = await run(DASH);
        assert.deepEqual(en.errors, []);
        assert.deepEqual(en.result, { mark: 'EN', name: 'English', course: 'en', speaks: 'kn' }, 'learning English: EN English, not ಕ ಕನ್ನಡ');
        const ja = await run({ ...DASH, course: { code: 'ja', name: 'Japanese', native: '日本語' } });
        assert.deepEqual(ja.errors, []);
        assert.deepEqual([ja.result.name, ja.result.course], ['日本語', 'ja'], 'a Japanese course: 日本語');
    });

    test('today\'s lessons on the dashboard\'s roadmap (2026-11-06, the user: "show 4 or 5, hide the rest"): the first five, "+ 3 more" opens the rest, "Show less" folds them; See in detail still there', async () => {
        const many = Array.from({ length: 8 }, (_, k) => RL(`t${k}`, `Lesson ${k + 1}`, 'vocabulary', { open: k === 0 }));
        const dash = { ...DASH, plan: { ...DASH.plan, today: { day: 1, today: true, lessons: many } } };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1440, height: 900, script: `
            await sleep(1300);
            const list = () => $$('[data-plan-today-list]')[0];
            const out = { heading: text(list()?.previousElementSibling), shown: list() ? list().querySelectorAll('[data-plan-today]').length : 0, more: text($('[data-plan-today-more]')), detail: !!$('[data-see-roadmap]') };
            $('[data-plan-today-more]').click(); await sleep(200);
            out.open = { shown: list().querySelectorAll('[data-plan-today]').length, button: text($('[data-plan-today-more]')) };
            $('[data-plan-today-more]').click(); await sleep(200);
            out.folded = list().querySelectorAll('[data-plan-today]').length;
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result, { heading: 'TODAY: 8 LESSONS TO DO', shown: 5, more: '+ 3 more', detail: true, open: { shown: 8, button: 'Show less' }, folded: 5 });
    });

    test('the dashboard doors on a laptop (2026-11-05, the user\'s picture): four cards in a row, one size — picture, name, what it is for, a round arrow; an open one lit, its outline inside its edge', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API), styles: true, width: 1440, height: 900, script: `
            await sleep(1300);
            const doors = $$('[data-door]');
            const box = (b) => { const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; };
            const cards = $$('[data-door-card]');
            const out = { ids: doors.map((d) => d.dataset.door), boxes: doors.map(box), litAtFirst: $$('[data-door][aria-selected="true"]').length,
                cards: cards.map((c) => [!!c.querySelector('[data-door-pic] svg'), [...c.querySelectorAll(':scope > span:nth-child(2) > span')].map(text), !!c.querySelector('.lucide-chevron-right')]),
                strings: $$('[data-lingo-doors] .w-\\\\[2px\\\\]').length,
                tall: Math.round(Math.max(...cards.map((c) => c.getBoundingClientRect().height))), subs: cards.map((c) => Math.round(c.querySelector(':scope > span:nth-child(2) > span:last-child').getBoundingClientRect().height)) };
            const practice = $('[data-door="practice"]');
            practice.click(); await sleep(500);
            out.lit = practice.getAttribute('aria-selected') === 'true';
            out.ring = getComputedStyle(practice.querySelector('[data-door-ring]')).boxShadow; out.outside = getComputedStyle(practice).boxShadow;
            practice.click(); await sleep(500);
            out.back = $$('[data-door][aria-selected="true"]').length;
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.ids, result.litAtFirst], [['learn', 'writing', 'practice', 'badges'], 0], 'no Start door; none lit on the dashboard\'s own cards');
        assert.equal(new Set(result.boxes.map(String)).size, 1, `all four on one line, one size (${JSON.stringify(result.boxes)})`);
        assert.deepEqual(result.cards, [
            [true, ['Learn', 'Study new words & sentences'], true], [true, ['Write', 'Practice writing'], true],
            [true, ['Practice', 'Solve exercises & improve'], true], [true, ['Certificates', 'View your progress & awards'], true]
        ], 'each its picture, name, what it is for, and its arrow');
        assert.equal(result.strings, 0, 'no strings above them');
        assert.ok(result.tall <= 92 && result.subs.every((h) => h <= 20), `small (2026-11-05, "a little small"): ${result.tall}px tall, each line under the name on one line (${result.subs})`);
        assert.equal(result.lit, true, 'Practice open: its door lit');
        assert.match(result.ring, /inset/, 'the outline inside the card');
        assert.doesNotMatch(result.outside, /rgb\(242, 153, 74\) 0px 0px 0px 3px/, 'no outline outside it');
        assert.equal(result.back, 0, 'tapped again: back to the dashboard\'s own cards');
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
            // Each word's picture bigger than its word (2026-11-05).
            out.pic = [$('[data-pair-pic]') && getComputedStyle($('[data-pair-pic]')).fontSize, getComputedStyle($('[data-pair="kn"] [dir="auto"]')).fontSize];
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
        assert.deepEqual(result.pic, ['30px', '16px'], 'in the pairs, each word\'s picture about twice its word');
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
        assert.equal(result.spoken, 'a for apple. I eat a red apple.', 'tapped: "A for apple" and its sentence read aloud — the letter as its small letter, said once by its name (2026-11-07; "ay" was read "eye")');
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

    // Since 2026-10-29 (94d3d01): a page inside has "← Back" (was an ✕) to the dashboard; the dashboard has none (the sidebar's menu leaves the section).
    test('Back on every page inside goes back to the dashboard (2026-10-26); the dashboard has no ✕ (2026-10-29)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/practice'), api: apiModule(SHELL_API), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1000);
            const inside = $('[data-lingo-close]');
            const before = { kind: inside?.dataset.lingoClose, href: inside?.getAttribute('href'), label: inside?.getAttribute('aria-label') };
            inside.click(); await sleep(600);
            const close = $('[data-lingo-close]');
            return { before, dashboard: !!$('[data-lingo-dashboard]'), after: { kind: close?.dataset.lingoClose, href: close?.getAttribute('href') }, wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.before, { kind: 'dashboard', href: '/linguistic/dashboard', label: 'Back' });
        assert.equal(result.dashboard, true, 'Back inside opens the dashboard');
        assert.deepEqual(result.after, {}, 'no ✕ or Back on the dashboard');
        assert.ok(result.wide <= 1, `the page stays inside the phone's screen (${result.wide}px)`);
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
            const kept = JSON.parse(localStorage.getItem('lingo:start:me'));
            return { at, reason, back: $('[data-onboarding]')?.dataset.onboarding, kept: [kept.step, kept.at, kept.level] };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.at, 'why', 'the reason, not Get started');
        assert.deepEqual([result.reason, result.back, result.kept], ['true', 'learn', [1, 'learn', 'beginner']], 'the answers still picked (the old level answer as Beginner, 2026-11-04), and the place kept, by name too');
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
            out.why = title();
            await go('[data-reason="travel"]');
            out.translate = { picked: $('[data-language="hi"]')?.getAttribute('aria-pressed'), kannada: $('[data-language="kn"]')?.disabled };
            await go();
            await go(); await go(); await go(); await go();
            out.level = [title(), $('[data-level="beginner"]')?.textContent];
            $('[data-level="beginner"]').click(); await sleep(100);
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
        assert.match(result.level[0], /Are you a Beginner or an Advanced Kannada learner\?/); assert.match(result.level[1], /short sentences of Kannada/);
        assert.deepEqual(result.translate, { picked: 'true', kannada: true }, 'Hindi, as chosen; not Kannada, which they learn');
        assert.equal(result.options, 0, 'no choice of where to start');
        assert.match(result.label, /start learning/i);
        assert.deepEqual(result.sent, [['/linguistic/about', { reason: 'travel', know: 0 }], ['/linguistic/knows', { speak: ['hi'], write: ['hi'], read: ['hi'] }], ['/linguistic/course', { course: 'kn', start: 'beginner' }], ['/linguistic/plan', {}]], 'the course from Beginner; the plan\'s days set by the server; no /level (that is English\'s)');
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
        const post = `(url, body) => url.endsWith('/check') ? { correct: true, answer: body.given, explanation: '', events: [] } : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/mp'), api: apiModule({ '/linguistic/lessons/mp': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
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
            // All matched: the spelling questions after it, then, before the quiz, the round in the review (2026-11-04).
            await pair('mother', 'ತಾಯಿ'); await pair('father', 'ತಂದೆ');
            await sleep(700);
            for (let n = 0; n < 5 && !$('[data-practice-review]'); n++) {
                const box = $('[data-answer-area] input, [data-answer-area] textarea');
                if (box) { Object.getOwnPropertyDescriptor(box.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(box, 'x'); box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(60); }
                await press(); await sleep(400);
            }
            out.review = $$('[data-review-pair]').map((r) => r.dataset.reviewPair + ': ' + text(r));
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.before, null, 'nothing until one is got wrong');
        assert.deepEqual(result.one, { count: '1', head: 'ತಪ್ಪು ಆಯ್ಕೆಗಳು: 1', rows: [['mother', ['ತಂದೆ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಾಯಿ']] }, 'one wrong: counted, what was chosen, the right answer (in Kannada)');
        assert.deepEqual(result.three, { count: '3', head: 'ತಪ್ಪು ಆಯ್ಕೆಗಳು: 3', rows: [['mother', ['ತಂದೆ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಾಯಿ'], ['father', ['ತಾಯಿ'], 'ಸರಿಯಾದ ಉತ್ತರ: ತಂದೆ']] }, 'every wrong pick counted; each word once, with what was chosen');
        assert.deepEqual(result.kept, result.three, 'a right match after: the list stays');
        assert.deepEqual(result.button, { inline: true, footer: false, below: true, label: 'ಪರಿಶೀಲಿಸಿ', grey: true }, 'CHECK right under the pairs, not in a bar at the bottom');
        assert.deepEqual(result.review, ['wrong: mother ತಂದೆ ತಾಯಿ', 'wrong: father ತಾಯಿ ತಂದೆ', 'right: house ಮನೆ'], 'then, before the quiz, each word: the wrong pick crossed out, its match');
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
                { id: 'i2', kind: 'sentence', topic: 'greetings', source: 'Je vais bien.', sourceSay: 'zhuh vay byan', sourceEn: 'I am fine.', sourceHints: { on: 'text', spaced: true, words: [['Je', ['I']], ['vais', ['go', 'am going']], ['bien.', ['well', 'fine']]] }, direction: 'en-kn', open: false, bank: ['मैं', 'ठीक', 'हूँ'] }],
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
            out.hidden = !$('[data-hint-box]');
            out.marked = $$('[data-source] [data-hint-word]').map(text);
            $('[data-hint-word="1"]').click(); await sleep(150);
            const w = $('[data-hint-word="1"]').getBoundingClientRect(), b = $('[data-hint-box]').getBoundingClientRect();
            out.word = $$('[data-hint-meaning]').map(text);
            out.under = b.top >= w.bottom && b.left <= w.right && b.right >= w.left;
            // A tap outside the card closes it.
            const away = $('[data-translation] h1'), r = away.getBoundingClientRect();
            away.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); await sleep(150);
            out.closed = !$('[data-hint-box]');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.tiles, ['bon-zhoor', 'mehr-see'], 'under each French tile');
        assert.deepEqual(result.wrong, ['Bonjour', 'bon-zhoor'], 'the right answer, and how it sounds');
        assert.deepEqual(result.read, ['Je vais bien.', 'zhuh vay byan'], 'under the sentence to read');
        assert.equal(result.hidden, true);
        assert.deepEqual(result.marked, ['Je', 'vais', 'bien'], 'the sentence\'s own words marked (2026-11-06), its full stop off the line');
        assert.deepEqual(result.word, ['go', 'am going'], 'a word tapped: its meanings, one to a row, as Duolingo\'s hints');
        assert.equal(result.under, true, 'the box under the word');
        assert.equal(result.closed, true, 'a tap outside closes it');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('word hints as Duolingo\'s (2026-11-06, the user\'s pictures): a Kannada speaker\'s sentence to write in English — each word marked; tapped, two or three meanings, one to a row, in a box under it over the answer, its arrow at the word; another word moves it; a tap away closes it — on a phone and a laptop', async () => {
        const LESSON = { id: 'wh', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Family', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i3', kind: 'sentence', topic: 'family', source: 'ನನ್ನ ಕುಟುಂಬ ದೊಡ್ಡದು.', open: false, bank: [],
                sourceHints: { on: 'text', spaced: true, words: [['ನನ್ನ', ['my', 'mine']], ['ಕುಟುಂಬ', ['family']], ['ದೊಡ್ಡದು.', ['is big', 'big', 'large']]] } }],
            quiz: [{ id: 'q1', type: 'translation', source: 'ಮನೆ', bank: ['house', 'water'] }] };
        for (const device of [DEVICES.galaxyA55, undefined]) {
            const { result, errors } = await screen({ entry: app('/linguistic/translation/wh'), api: apiModule({ '/linguistic/lessons/wh': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device, script: `
                ${DRIVE}
                await sleep(1000);
                await press(); await sleep(300);
                const open = async (k) => { $('[data-hint-word="' + k + '"]').click(); await sleep(200); };
                const place = (k) => { const w = $('[data-hint-word="' + k + '"]').getBoundingClientRect(), b = $('[data-hint-box]').getBoundingClientRect();
                    const arrow = $('[data-hint-box] > span[aria-hidden]').getBoundingClientRect(), mid = arrow.left + arrow.width / 2;
                    // (The box lets taps through, 2026-11-06: for a moment it does not, to see it is on top.)
                    const el = $('[data-hint-box]'); el.style.pointerEvents = 'auto'; const top = document.elementFromPoint(b.left + b.width / 2, b.bottom - 8); el.style.pointerEvents = '';
                    return { under: b.top >= w.bottom, arrowAtWord: mid >= w.left - 2 && mid <= w.right + 2, onTop: !!top?.closest('[data-hint-box]'), inScreen: b.left >= 0 && b.right <= innerWidth }; };
                const out = { marked: $$('[data-source] [data-hint-word]').map(text), sentence: text($('[data-source]')), closed: !$('[data-hint-box]'),
                    line: getComputedStyle($('[data-hint-word="0"]')).textDecorationStyle };
                await open(2);
                out.big = { rows: $$('[data-hint-meaning]').map(text), ...place(2) };
                await open(0);
                out.my = { rows: $$('[data-hint-meaning]').map(text), ...place(0), boxes: $$('[data-hint-box]').length };
                await open(0);
                out.again = !$('[data-hint-box]');
                await open(1);
                const away = $('[data-translation] h1'), r = away.getBoundingClientRect();
                away.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); await sleep(150);
                out.away = !$('[data-hint-box]');
                out.wide = (() => { ${SESSION_WIDE} })();
                return out;` });
            const at = device ? 'phone' : 'laptop';
            assert.deepEqual(errors, [], at);
            assert.equal(result.__error, undefined, `${at}: ${result.__error}`);
            assert.deepEqual([result.marked, result.sentence, result.closed, result.line], [['ನನ್ನ', 'ಕುಟುಂಬ', 'ದೊಡ್ಡದು'], 'ನನ್ನ ಕುಟುಂಬ ದೊಡ್ಡದು.', true, 'dotted'], `${at}: each word of the sentence marked, the full stop off its line`);
            assert.deepEqual(result.big, { rows: ['is big', 'big', 'large'], under: true, arrowAtWord: true, onTop: true, inScreen: true }, `${at}: "ದೊಡ್ಡದು" → three meanings in rows, under the word, over the answer, on the screen`);
            assert.deepEqual(result.my, { rows: ['my', 'mine'], under: true, arrowAtWord: true, onTop: true, inScreen: true, boxes: 1 }, `${at}: another word: the box moves to it`);
            assert.equal(result.again, true, `${at}: the same word again closes it`);
            assert.equal(result.away, true, `${at}: a tap away closes it`);
            assert.ok(result.wide <= 1, `${at}: nothing wider than the screen (${result.wide}px)`);
        }
    });

    // 2026-11-07, the user: "the mascot's lips moving when the voice is heard, like Duolingo — for a sentence, its words".
    test('the mascot speaks the sentence: its mouth moves while the voice is heard, opening again at each word; still again at the end', async () => {
        const LESSON = { id: 'lp', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'At college', direction: 'en-kn', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'college', source: 'The class starts at nine.', open: false, bank: [] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['ಮನೆ', 'ನೀರು'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/lp'), api: apiModule({ '/linguistic/lessons/lp': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 3 && !$('[data-answer-area] [data-mood-mascot]'); i++) { await press(); await sleep(300); }
            // The device's voice: it starts, reaches two words, and ends.
            window.speechSynthesis.speak = (u) => { setTimeout(() => u.onstart?.(), 20); setTimeout(() => u.onboundary?.({ name: 'word' }), 120); setTimeout(() => u.onboundary?.({ name: 'word' }), 220); setTimeout(() => u.onend?.(), 450); };
            const talking = () => $('[data-answer-area] [data-mascot-talking]')?.dataset.mascotTalking;
            const out = { before: [talking(), !!$('[data-talking-mouth]')] };
            $('[data-answer-area] [data-mood-mascot] ~ * button[aria-label^="Listen"], [data-answer-area] button[aria-label^="Listen"]').click();
            await sleep(70); out.start = [talking(), $('[data-talking-mouth]')?.dataset.talkingMouth];
            const m = $('[data-talking-mouth]').getBoundingClientRect(), pic = $('[data-answer-area] [data-mascot-talking] img').getBoundingClientRect();
            out.over = Math.abs(m.left - pic.left) < 1 && Math.abs(m.top - pic.top) < 1 && Math.abs(m.width - pic.width) < 1;
            out.anim = getComputedStyle($('[data-talking-mouth] .lingo-talk')).animationName;
            await sleep(100); out.word1 = $('[data-talking-mouth]')?.dataset.talkingMouth;
            await sleep(100); out.word2 = $('[data-talking-mouth]')?.dataset.talkingMouth;
            await sleep(300); out.after = [talking(), !!$('[data-talking-mouth]')];
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.before, ['no', false], 'quiet: its own picture');
        assert.deepEqual(result.start, ['yes', '0'], 'the voice starts: the mouth moves');
        assert.equal(result.over, true, 'the mouth drawn over the mascot\'s own picture');
        assert.deepEqual([result.word1, result.word2], ['1', '2'], 'opening again at each word');
        assert.deepEqual(result.after, ['no', false], 'the voice ends: still again');
    });

    test('an English sentence to write in Kannada (2026-11-06, "do both"): each English word marked; tapped, its Kannada words in the box; a word with none, plain', async () => {
        const LESSON = { id: 'we', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'At college', direction: 'en-kn', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'college', source: 'The class starts at nine o\'clock.', open: false, bank: [],
                sourceHints: { on: 'text', spaced: true, lang: 'kn', words: [['The', null], ['class', ['ತರಗತಿ', 'ಕ್ಲಾಸ್']], ['starts', ['ಶುರುವಾಗುತ್ತದೆ', 'ಆರಂಭವಾಗುತ್ತದೆ']], ['at', ['ಗೆ']], ['nine', ['ಒಂಬತ್ತು']], ['o\'clock.', ['ಗಂಟೆಗೆ', 'ಗಂಟೆ']]] } }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['ಮನೆ', 'ನೀರು'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/we'), api: apiModule({ '/linguistic/lessons/we': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press(); await sleep(300);
            const out = { marked: $$('[data-source] [data-hint-word]').map(text), sentence: text($('[data-source]')) };
            $('[data-hint-word="1"]').click(); await sleep(200);
            out.rows = $$('[data-hint-meaning]').map(text);
            out.lang = $('[data-hint-box]').getAttribute('lang');
            $('[data-hint-word="5"]').click(); await sleep(200);
            out.clock = $$('[data-hint-meaning]').map(text);
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.marked, ['class', 'starts', 'at', 'nine', 'o\'clock'], '"The" (none in Kannada) plain; the rest marked, the full stop off the line');
        assert.equal(result.sentence, 'The class starts at nine o\'clock.');
        assert.deepEqual([result.rows, result.lang], [['ತರಗತಿ', 'ಕ್ಲಾಸ್'], 'kn'], 'tapped: its Kannada words, in Kannada');
        assert.deepEqual(result.clock, ['ಗಂಟೆಗೆ', 'ಗಂಟೆ']);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('the user\'s two pictures (2026-11-06): a Japanese tile tapped shows its English and stays, tapped again goes in; the Spanish blanks\' words and tiles the same — the box never in the way of CHECK', async () => {
        const course = { course: 'ja', target: 'ja', targetName: 'Japanese', targetLocale: 'ja-JP', language: 'en', languageName: 'English' };
        const JA = { id: 'tj', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'At college', direction: 'kn-en', passingScore: 60, ...course,
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'college', source: 'This lesson is easy.', open: false, bank: ['簡単です', 'この', '読む', '課は', '早く'],
                bankSays: { 'この': 'kono', '課は': 'ka-wa', '簡単です': 'kantan-desu', '読む': 'yomu', '早く': 'hayaku' }, meaningLang: 'en',
                bankMeanings: { 'この': ['this'], '課は': ['lesson'], '簡単です': ['easy'], '読む': ['read'], '早く': ['early', 'quickly'] } }],
            quiz: [{ id: 'q1', type: 'translation', source: 'house', bank: ['家', '水'] }] };
        const ES = { id: 'tb', module: 'translation', moduleLabel: 'Translation Practice', level: 'advanced', title: 'At work', direction: 'en-kn', passingScore: 60,
            course: 'es', target: 'es', targetName: 'Spanish', targetLocale: 'es-ES', language: 'en', languageName: 'English',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, items: [],
            blanks: [{ id: 'blank~i1', type: 'blanks', prompt: 'La ___ se ha ___ al lunes.', parts: ['La ', null, ' se ha ', null, ' al lunes.'], hint: 'The meeting has been postponed to Monday.',
                words: ['aplazado', 'informe', 'lunes', 'reunión'], meaningLang: 'en', tileMeanings: [['postponed'], ['report'], ['Monday'], ['meeting']],
                partWords: [[['La', ['the']], [' ', null]], null, [[' ', null], ['se', ['(passive)', 'itself']], [' ', null], ['ha', ['has']], [' ', null]], null, [[' ', null], ['al', ['to the']], [' ', null], ['lunes', ['Monday']], ['.', null]]] }],
            quiz: [{ id: 'q1', type: 'translation', source: 'casa', bank: ['house', 'water'] }] };
        const ja = await screen({ entry: app('/linguistic/translation/tj'), api: apiModule({ '/linguistic/lessons/tj': JA }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press(); await sleep(300);
            const tile = (w) => $$('[data-tiles] button').find((b) => b.textContent.startsWith(w) && !b.classList.contains('invisible'));
            const out = { closed: !$('[data-hint-box]') };
            const t = tile('この'), r = t.getBoundingClientRect(); t.click(); await sleep(200);
            const b = $('[data-hint-box]').getBoundingClientRect();
            out.kono = { rows: $$('[data-hint-meaning]').map(text), lang: $('[data-hint-box]').getAttribute('lang'), placed: $$('[data-placed] button').length, stays: !!tile('この'), blue: tile('この').getAttribute('aria-pressed'), at: b.top >= r.bottom && b.left <= r.right && b.right >= r.left };
            tile('課は').click(); await sleep(200);
            out.ka = { rows: $$('[data-hint-meaning]').map(text), boxes: $$('[data-hint-box]').length, placed: $$('[data-placed] button').length };
            tile('課は').click(); await sleep(200);
            out.ka2 = { placed: $$('[data-placed] button').map((x) => x.textContent), closed: !$('[data-hint-box]') };
            tile('この').click(); await sleep(150); tile('この').click(); await sleep(200);
            $$('[data-placed] button')[0].click(); await sleep(200);
            out.back = { closed: !$('[data-hint-box]'), placed: $$('[data-placed] button').length };
            tile('簡単です').click(); await sleep(200);
            const box = $('[data-hint-box]').getBoundingClientRect(), under = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            out.through = getComputedStyle($('[data-hint-box]')).pointerEvents === 'none' && !under?.closest('[data-hint-box]');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(ja.errors, []);
        assert.equal(ja.result.__error, undefined, ja.result.__error);
        assert.equal(ja.result.closed, true);
        assert.deepEqual(ja.result.kono, { rows: ['this'], lang: 'en', placed: 0, stays: true, blue: 'true', at: true }, 'この tapped: "this" under it, and it stays (marked)');
        assert.deepEqual(ja.result.ka, { rows: ['lesson'], boxes: 1, placed: 0 }, 'another tile: its meaning, one box, still nothing placed');
        assert.deepEqual(ja.result.ka2, { placed: ['課はka-wa'], closed: true }, 'tapped again: into the answer, the box gone');
        assert.deepEqual(ja.result.back, { closed: true, placed: 1 }, 'a tile taken back: the box goes');
        assert.equal(ja.result.through, true, 'the box lets taps through (CHECK under it still works)');
        assert.ok(ja.result.wide <= 1, `nothing wider than the phone (${ja.result.wide}px)`);

        const es = await screen({ entry: app('/linguistic/translation/tb'), api: apiModule({ '/linguistic/lessons/tb': ES }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-question="blank~i1"]'); i++) await press();
            const out = { marked: $$('[data-blanks] [data-hint-word]').map(text), sentence: text($('[data-blanks]')) };
            $$('[data-blanks] [data-hint-word]').find((b) => b.textContent === 'lunes').click(); await sleep(200);
            out.lunes = $$('[data-hint-meaning]').map(text);
            const reunion = () => $$('[data-tiles] button').find((b) => b.textContent === 'reunión');
            reunion().click(); await sleep(200);
            out.tile = { rows: $$('[data-hint-meaning]').map(text), box0: text($('[data-blank="0"]')) };
            reunion().click(); await sleep(200);
            out.again = { box0: text($('[data-blank="0"]')), closed: !$('[data-hint-box]') };
            return out;` });
        assert.deepEqual(es.errors, []);
        assert.equal(es.result.__error, undefined, es.result.__error);
        assert.deepEqual(es.result.marked, ['La', 'se', 'ha', 'al', 'lunes'], 'the sentence\'s words marked to tap');
        assert.equal(es.result.sentence, 'La se ha al lunes.');
        assert.deepEqual(es.result.lunes, ['Monday'], '"lunes" tapped: Monday');
        assert.deepEqual(es.result.tile, { rows: ['meeting'], box0: '' }, 'a tile tapped: its meaning; the box still empty (2026-11-06, "only show the meaning")');
        assert.deepEqual(es.result.again, { box0: 'reunión', closed: true }, 'tapped again: into the first box');
    });

    test('an Arabic story\'s question (2026-11-06, "how will they understand this language?"): the question tapped, its English; a choice tapped is chosen and shows its English right under it', async () => {
        const options = ['أراد غوبال إغلاق مدرسة القرية', 'جفت البئر الوحيدة في القرية', 'بدأ غوبال يأخذ عملة عن كل جرة ماء', 'لم تمطر منذ أربعين يوماً'];
        const english = ['Gopal wanted to close the village school', 'The only well in the village dried up', 'Gopal began to charge a coin for every pot of water', 'It had not rained for forty days'];
        const LESSON = { id: 'ca', module: 'reading', moduleLabel: 'Reading and Writing', level: 'advanced', title: 'The Shared Well', review: 'comic', direction: null, passingScore: 60,
            course: 'ar', target: 'ar', targetName: 'Arabic', targetLocale: 'ar-SA', language: 'en', languageName: 'English',
            learn: { intro: 'Read the story.' }, progress: { status: 'started', step: 'quiz', bestScore: null, attempts: 0 },
            quiz: [{ id: 'c1', type: 'mcq', prompt: 'لماذا كان أهل كالبور قلقين؟', options, promptMeaning: 'Why were the people of Kalpur worried?', meaningLang: 'en',
                optionMeanings: Object.fromEntries(options.map((o, i) => [o, english[i]])) }] };
        const { result, errors } = await screen({ entry: app('/linguistic/reading/ca'), api: apiModule({ '/linguistic/lessons/ca': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-question="c1"]'); i++) await press();
            const out = { closed: !$('[data-hint-box]') };
            $('[data-hint-word="prompt"]').click(); await sleep(200);
            out.prompt = $$('[data-hint-meaning]').map(text);
            const opt = $('[data-option="2"]'), r = opt.getBoundingClientRect();
            opt.click(); await sleep(200);
            const b = $('[data-hint-box]').getBoundingClientRect();
            out.choice = { rows: $$('[data-hint-meaning]').map(text), chosen: opt.getAttribute('aria-checked'), gap: Math.round(b.top - r.bottom) };
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.closed, true);
        assert.deepEqual(result.prompt, ['Why were the people of Kalpur worried?'], 'the question tapped: its English');
        assert.deepEqual([result.choice.rows, result.choice.chosen], [['Gopal began to charge a coin for every pot of water'], 'true'], 'a choice tapped: chosen, and its English');
        assert.ok(result.choice.gap >= 0 && result.choice.gap <= 20, `the box right under the choice, its arrow at it (${result.choice.gap}px)`);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('write the word (2026-11-06, the user\'s Duolingo picture "Write “ಬೆಕ್ಕು” in English"): its title in the student\'s language, the word\'s picture beside the box; a Japanese course too, with its letter keys', async () => {
        const words = [{ word: 'mother', kannada: 'ತಾಯಿ', pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null, pic: '👩' }, { word: 'father', kannada: 'ತಂದೆ', pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null, pic: '👨' }];
        const EN = { id: 'ww', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Family', direction: null, passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Words.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, words, quiz: [] };
        const JA = { ...EN, id: 'wj', course: 'ja', target: 'ja', targetName: 'Japanese', targetLocale: 'ja-JP', language: 'en', languageName: 'English',
            words: words.map((w, i) => ({ ...w, word: i ? '父' : '母', kannada: w.word, course: true, lang: 'English', target: 'Japanese', locale: 'ja-JP', en: w.word, say: i ? 'chichi' : 'haha' })) };
        const run = (L, device) => screen({ entry: app(`/linguistic/vocabulary/${L.id}`), api: apiModule({ [`/linguistic/lessons/${L.id}`]: L }, '(url, body) => ({ step: body.step })'), styles: true, device, budget: 30000, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 12 && !$('[data-write-word]'); i++) { const opt = $('[data-option]') || $('[data-pair]'); if (opt) { for (const b of $$('[data-pair]')) { b.click(); await sleep(30); } } await press(); }
            const box = $('[data-write-word] textarea, [data-write-word] input'), pic = $('[data-word-pic]');
            const pr = pic?.getBoundingClientRect(), br = box?.getBoundingClientRect();
            return { at: !!$('[data-write-word]'), title: text($('[data-question] h1')), pic: pic ? pic.textContent : null, beside: !!pr && !!br && br.left >= pr.right && Math.abs((br.top + br.bottom) / 2 - (pr.top + pr.bottom) / 2) < 60,
                lang: box?.getAttribute('lang'), keys: !!$('[data-letters-toggle]'), hint: text($('[data-write-hint]')), wide: (() => { ${SESSION_WIDE} })() };` });
        const en = await run(EN, DEVICES.galaxyA55);
        assert.deepEqual(en.errors, []);
        assert.equal(en.result.__error, undefined, en.result.__error);
        assert.deepEqual([en.result.at, en.result.title, en.result.pic, en.result.beside, en.result.lang, en.result.keys], [true, '“ತಾಯಿ” ಅನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯಿರಿ', '👩', true, 'en', false], 'Kannada title as Duolingo\'s, the picture beside the box, no letter keys for English');
        assert.match(en.result.hint, /^m_____/, 'English\'s letter-count hint under the box');
        assert.ok(en.result.wide <= 1, `nothing wider than the phone (${en.result.wide}px)`);
        const ja = await run(JA);
        assert.deepEqual(ja.errors, []);
        assert.equal(ja.result.__error, undefined, ja.result.__error);
        assert.deepEqual([ja.result.at, ja.result.title, ja.result.pic, ja.result.lang, ja.result.keys, ja.result.hint], [true, 'Write “mother” in Japanese', '👩', 'ja', true, null], 'a Japanese course: "Write “mother” in Japanese", Japanese letter keys, no English hint');
    });

    test('the character reacts (2026-11-06, the user\'s Duolingo picture): a right answer — thumbs up, a moment, then on; a wrong one — sad; only its face, no voice; a screen with no character of its own gets one in the corner', async () => {
        const LESSON = { id: 'mo', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Family', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'family', source: 'ಇದು ನನ್ನ ಮನೆ.', open: false, bank: ['This', 'is', 'my', 'house', 'water'] },
                { id: 'i2', kind: 'sentence', topic: 'family', source: 'ನನ್ನ ಕುಟುಂಬ ದೊಡ್ಡದು.', open: false, bank: ['My', 'family', 'is', 'big', 'small'] }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'What does "ಮನೆ" mean?', options: ['house', 'water', 'book', 'tree'] }] };
        const post = `(url, body) => url.endsWith('/check') ? ((body.id === 'q1' && body.given === 'house') || ['This is my house', 'My family is big'].includes(body.given) ? { correct: true, verdict: 'exact', answer: 'This is my house.', accepted: [], explanation: '', diff: [], events: [] }
            : { correct: false, verdict: 'wrong', answer: body.id === 'q1' ? 'house' : 'My family is big.', accepted: [], explanation: '', diff: [], events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/mo'), api: apiModule({ '/linguistic/lessons/mo': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            // The voices: count the sounds made (the voice is shaped through filters, the chime is not).
            window.__voices = 0;
            const Real = window.AudioContext;
            window.AudioContext = function () { const c = new Real(); const make = c.createBiquadFilter.bind(c); c.createBiquadFilter = () => { window.__voices += 1; return make(); }; return c; };
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-translation="i1"]'); i++) await press();
            const pose = () => $('[data-answer-area] [data-mood-mascot] img')?.getAttribute('src');
            const floating = () => { const f = $('[data-float-mascot]'); return f ? getComputedStyle(f).display !== 'none' : false; };
            const out = { calm: pose() };
            for (const w of ['This', 'is', 'my', 'house']) { $$('[data-tiles] button').find((b) => b.textContent === w).click(); await sleep(40); }
            $('[data-primary]').click(); await sleep(250);
            out.right = { pose: pose(), still: !!$('[data-translation="i1"]'), corner: floating(), voices: window.__voices, locked: $$('[data-placed] button').every((b) => b.disabled) };
            await sleep(900);
            out.on = { next: !!$('[data-translation="i2"]'), mood: $('[data-answer-area] [data-mood-mascot]')?.dataset.moodMascot };
            for (const w of ['My', 'family', 'is', 'small']) { $$('[data-tiles] button').find((b) => b.textContent === w && !b.classList.contains('invisible')).click(); await sleep(40); }
            const before = window.__voices;
            $('[data-primary]').click(); await sleep(300);
            out.wrong = { pose: pose(), corner: floating(), voices: window.__voices - before };
            // The same question again by itself (2026-11-05): put right this time.
            for (let i = 0; i < 30 && $('[data-auto-next]'); i++) await sleep(200);
            await sleep(300);
            for (const w of ['My', 'family', 'is', 'big']) { $$('[data-tiles] button').find((b) => b.textContent === w && !b.classList.contains('invisible')).click(); await sleep(40); }
            $('[data-primary]').click(); await sleep(1100);
            for (let i = 0; i < 8 && !$('[data-option]'); i++) await press();
            $('[data-option="1"]').click(); await sleep(60); $('[data-primary]').click(); await sleep(300);
            out.mcq = { own: !!$('[data-answer-area] [data-mood-mascot]'), corner: floating(), cornerPose: $('[data-float-mascot] img')?.getAttribute('src') };
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.calm, /point-right\.png$/, 'before an answer: its own pose');
        assert.match(result.right.pose, /thumbs-up\.png$/, 'right: thumbs up');
        assert.deepEqual([result.right.still, result.right.corner, result.right.locked], [true, false, true], 'right: a moment on the same screen, the tiles locked, no second character in the corner');
        assert.equal(result.right.voices, 0, 'no voice (the user: "only the expression")');
        assert.deepEqual(result.on, { next: true, mood: 'calm' }, 'then on to the next by itself, the character calm again');
        assert.match(result.wrong.pose, /sad\.png$/, 'wrong: sad');
        assert.equal(result.wrong.corner, false);
        assert.equal(result.wrong.voices, 0, 'no voice');
        assert.deepEqual([result.mcq.own, result.mcq.corner], [false, true], 'a question with no character of its own: one in the corner');
        assert.match(result.mcq.cornerPose, /sad\.png$/, 'wrong there: sad');
    });

    test('complete the conversation (2026-11-07, the user\'s Duolingo picture): its title in the student\'s language; the question heard by itself and on its speaker, its meaning on tap; a reply heard and shown in the empty bubble; checked; a wrong one, the right one in green', async () => {
        const LESSON = { id: 'ch', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Home and family', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Words.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, words: [],
            chats: [{ id: 'chat~b1a', type: 'chat', who: 'f', prompt: 'Do you have a pet?', ask: 'Do you have a pet?', say: 'Do you have a pet?', sayLang: 'en-IN',
                options: ['It is near the bus stand.', 'Yes, I have a cat.', 'It is hot and sunny.'], meaningLang: 'kn', askMeaning: 'ನಿಮ್ಮ ಬಳಿ ಸಾಕುಪ್ರಾಣಿ ಇದೆಯೇ?',
                optionMeanings: { 'Yes, I have a cat.': 'ಹೌದು, ನನ್ನ ಬಳಿ ಒಂದು ಬೆಕ್ಕು ಇದೆ.', 'It is near the bus stand.': 'ಅದು ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಇದೆ.', 'It is hot and sunny.': 'ಬಿಸಿಲು ಇದೆ, ತುಂಬಾ ಸೆಕೆ.' } }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'What does "ಮನೆ" mean?', options: ['house', 'water'] }] };
        const post = `(url, body) => url.endsWith('/check') ? (body.given === 'Yes, I have a cat.' ? { correct: true, answer: 'Yes, I have a cat.', explanation: '', events: [] }
            : { correct: false, answer: 'Yes, I have a cat.', explanation: 'ಹೌದು, ನನ್ನ ಬಳಿ ಒಂದು ಬೆಕ್ಕು ಇದೆ.', events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/vocabulary/ch'), api: apiModule({ '/linguistic/lessons/ch': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            window.__spoken = []; window.__voices = [];
            window.speechSynthesis.speak = (u) => { window.__spoken.push([u.text, u.lang]); window.__voices.push([u.text, u.voice?.name || null, u.pitch ?? 1]); };
            // A woman's and a man's voice on the device (2026-11-07): each person speaks in theirs.
            window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
            const setVoices = (list) => { window.speechSynthesis.getVoices = () => list; window.speechSynthesis.dispatchEvent(new Event('voiceschanged')); };
            setVoices([{ name: 'Microsoft Ravi - English (India)', lang: 'en-IN' }, { name: 'Microsoft Heera - English (India)', lang: 'en-IN' }]);
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-chat-ask]'); i++) await press();
            await sleep(200);
            const out = { title: text($('[data-question] h1')), auto: window.__spoken.map((x) => x.join(' ')), blank: text($('[data-chat-reply]')), waits: $('[data-primary]').disabled };
            // The second person, on the right of the reply (2026-11-07).
            const asker = $('[data-chat-ask] [role="img"]'), replier = $('[data-chat-replier]');
            out.people = { asker: asker?.textContent, replier: replier?.textContent, right: replier && replier.getBoundingClientRect().left >= $('[data-chat-reply]').getBoundingClientRect().right, inside: replier && replier.getBoundingClientRect().right <= innerWidth };
            window.__spoken = [];
            $('[data-chat-ask] button[aria-label]')?.click(); await sleep(60);
            out.again = window.__spoken.map((x) => x[0]);
            $('[data-hint-word="ask"]').click(); await sleep(120);
            out.meaning = text($('[data-hint-box]') || $('[role="tooltip"]'));
            window.__spoken = [];
            $('[data-option="0"]').click(); await sleep(150);
            out.picked = { heard: window.__spoken.map((x) => x[0]), reply: text($('[data-chat-reply]')), meaning: text($('[data-hint-box]') || $('[role="tooltip"]')) };
            out.voices = window.__voices.map((x) => x.slice(1));
            // One voice on the device, its name saying neither: the woman higher, the man lower.
            setVoices([{ name: 'Google English', lang: 'en-IN' }]);
            window.__voices = [];
            $('[data-chat-ask] button[aria-label]').click(); await sleep(60);
            $('[data-option="2"]').click(); await sleep(60);
            $('[data-option="0"]').click(); await sleep(60);
            out.oneVoice = window.__voices.map((x) => x.slice(1));
            $('[data-primary]').click(); await sleep(400);
            out.wrong = { right: text($('[data-option="1"]')), rightColor: getComputedStyle($('[data-option="1"]')).borderColor, reply: getComputedStyle($('[data-chat-reply]')).borderColor };
            out.sent = window.__calls.filter((c) => c[0] === 'POST' && c[1].endsWith('/check')).map((c) => [c[2].section, c[2].id, c[2].given]);
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.title, 'ಈ ಸಂಭಾಷಣೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ', 'Duolingo\'s title, in Kannada');
        assert.deepEqual(result.auto, ['Do you have a pet? en-IN'], 'the question heard as it opens');
        assert.deepEqual([result.blank, result.waits], ['', true], 'the reply blank; CHECK waits');
        assert.deepEqual(result.voices, [['Microsoft Heera - English (India)', 1], ['Microsoft Heera - English (India)', 1], ['Microsoft Ravi - English (India)', 1]], 'the woman asks in a woman\'s voice (as it opens, and on its speaker); the man answers in a man\'s');
        assert.deepEqual(result.oneVoice, [['Google English', 1.2], ['Google English', 0.7], ['Google English', 0.7]], 'one voice on the device: the woman\'s higher, the man\'s lower');
        assert.deepEqual(result.people, { asker: '👩🏽‍🦱', replier: '👨🏽', right: true, inside: true }, 'two people: one asks, the other answers, on the right of the reply');
        assert.deepEqual(result.again, ['Do you have a pet?'], 'again on its speaker');
        assert.match(result.meaning, /ನಿಮ್ಮ ಬಳಿ ಸಾಕುಪ್ರಾಣಿ ಇದೆಯೇ\?/, 'the question tapped: its meaning in Kannada');
        assert.deepEqual(result.picked.heard, ['It is near the bus stand.'], 'a reply heard as it is tapped');
        assert.equal(result.picked.reply, 'It is near the bus stand.', 'and shown in the reply bubble');
        assert.match(result.picked.meaning, /ಅದು ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಇದೆ/, 'with its meaning');
        assert.deepEqual(result.sent, [['chat', 'chat~b1a', 'It is near the bus stand.']]);
        assert.match(result.wrong.right, /^2\s*Yes, I have a cat\.$/, 'wrong: the right reply marked');
        assert.equal(result.wrong.rightColor, 'rgb(88, 204, 2)', 'in green');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('tap what you hear (2026-11-06, the user\'s Duolingo picture): its title in the student\'s language, the sentence heard by itself, again and slowly; each tile heard as it goes in; built and checked in its order', async () => {
        const LESSON = { id: 'he', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Pets', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, items: [],
            hears: [{ id: 'hear~i1', type: 'hear', prompt: 'Tap what you hear', say: 'Oh, your cat is very cute.', sayLang: 'en-IN', words: ['very', 'cat', 'cute', 'your', 'Oh', 'is', 'yes'] }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'What does "ಮನೆ" mean?', options: ['house', 'water'] }] };
        const post = `(url, body) => url.endsWith('/check') ? (body.given === 'Oh your cat is very cute' ? { correct: true, verdict: 'exact', answer: 'Oh, your cat is very cute.', explanation: '', events: [] }
            : { correct: false, verdict: 'wrong', answer: 'Oh, your cat is very cute.', explanation: '', events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/he'), api: apiModule({ '/linguistic/lessons/he': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            window.__spoken = [];
            window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang, u.rate]);
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-hear]'); i++) await press();
            await sleep(200);
            const out = { title: text($('[data-question] h1')), auto: window.__spoken.map((x) => x[0]) };
            window.__spoken = [];
            $('[data-hear-play]').click(); await sleep(60);
            $('[data-hear-slow]').click(); await sleep(60);
            out.again = window.__spoken.map((x) => [x[0], Math.round(x[2] * 10) / 10]);
            window.__spoken = [];
            const tile = (w) => $$('[data-tiles] button').find((b) => b.textContent === w && !b.classList.contains('invisible'));
            for (const w of ['Oh', 'your', 'cat']) { tile(w).click(); await sleep(60); }
            out.tiles = window.__spoken.map((x) => x[0]);
            out.placed = $$('[data-placed] button').map((b) => b.textContent);
            for (const w of ['is', 'very', 'cute']) { tile(w).click(); await sleep(60); }
            $('[data-primary]').click(); await sleep(1000);
            out.sent = window.__calls.filter((c) => c[0] === 'POST' && c[1].endsWith('/check')).map((c) => [c[2].section, c[2].id, c[2].given]);
            for (let i = 0; i < 20 && $('[data-hear]'); i++) await sleep(150);
            out.on = !$('[data-hear]');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.title, 'ನಿಮಗೆ ಕೇಳುತ್ತಿರುವುದನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ', 'Duolingo\'s title, in Kannada');
        assert.deepEqual(result.auto, ['Oh, your cat is very cute.'], 'the sentence heard as the question opens');
        assert.deepEqual(result.again, [['Oh, your cat is very cute.', 1], ['Oh, your cat is very cute.', 0.6]], 'again on the speaker; slowly on the turtle');
        assert.deepEqual(result.tiles, ['Oh', 'your', 'cat'], 'each tile heard as it goes in');
        assert.deepEqual(result.placed, ['Oh', 'your', 'cat']);
        assert.deepEqual(result.sent, [['hear', 'hear~i1', 'Oh your cat is very cute']], 'checked by the server, in its order');
        assert.equal(result.on, true, 'right: on to the next');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('say this sentence (2026-11-06, the user\'s Duolingo pictures): its title in the student\'s language, the sentence with its speaker, one wide "click to speak" button; said wrong — a message with what was heard; nothing heard — a message; said right — a green tick, then on', async () => {
        // The browser's speech-to-text, stood in for: each start hears the next of window.__heard ('' — nothing).
        const MIC = "window.__heard = []; window.webkitSpeechRecognition = class { start() { const t = window.__heard.shift() ?? ''; setTimeout(() => (t ? this.onresult({ results: [[{ transcript: t }]] }) : this.onerror({ error: 'no-speech' })), 80); setTimeout(() => this.onend && this.onend(), 140); } abort() {} stop() {} }; window.SpeechRecognition = window.webkitSpeechRecognition;\n";
        const LESSON = { id: 'sy', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Pets', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, items: [],
            sayits: [{ id: 'say~i1', type: 'sayit', say: 'a dog and a rabbit', sayLang: 'en-IN' }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'What does "ಮನೆ" mean?', options: ['house', 'water'] }] };
        const { result, errors } = await screen({ entry: MIC + app('/linguistic/translation/sy'), api: apiModule({ '/linguistic/lessons/sy': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-sayit]'); i++) await press();
            const out = { title: text($('[data-sayit] h1')), sentence: text($('[data-sayit-text]')), speaker: !!$('[data-sayit] button[aria-label]'), mic: text($('[data-sayit-mic]')), check: !!$('[data-primary]') };
            window.__heard.push('a dog and a cat'); $('[data-sayit-mic]').click(); await sleep(400);
            out.wrong = { state: $('[data-sayit-mic]').dataset.sayitMic, message: text($('[data-sayit-message]')) };
            window.__heard.push(''); $('[data-sayit-mic]').click(); await sleep(400);
            out.nothing = { state: $('[data-sayit-mic]').dataset.sayitMic, message: text($('[data-sayit-message]')) };
            window.__heard.push('A dog and a rabbit.'); $('[data-sayit-mic]').click(); await sleep(250);
            out.right = { state: $('[data-sayit-mic]').dataset.sayitMic, tick: !!$('[data-sayit-mic] svg.lucide-check'), message: !!$('[data-sayit-message]') };
            for (let i = 0; i < 20 && $('[data-sayit]'); i++) await sleep(150);
            out.on = !$('[data-sayit]');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.title, result.sentence, result.mic, result.check], ['ಈ ವಾಕ್ಯವನ್ನು ಹೇಳಿ', 'a dog and a rabbit', 'ಮಾತಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ', false], 'Duolingo\'s title and button, in Kannada; no CHECK');
        assert.equal(result.speaker, true, 'its speaker, to hear it');
        assert.equal(result.wrong.state, 'wrong');
        assert.match(result.wrong.message, /^ಸರಿಯಾಗಿಲ್ಲ — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ\..*a dog and a cat/, 'said wrong: the message, and what was heard');
        assert.deepEqual(result.nothing, { state: 'nothing', message: 'ನಮಗೆ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಒತ್ತಿ ಮತ್ತೆ ಮಾತನಾಡಿ.' }, 'nothing heard: say so');
        assert.deepEqual(result.right, { state: 'right', tick: true, message: false }, 'said right: the green tick');
        assert.equal(result.on, true, 'then on by itself');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('fill in the blank with choices (2026-11-06, the user: "give the options here — typing is hard"): the choices to tap, the one tapped in the blank, sent as typed; "Use keyboard" types it instead', async () => {
        const LESSON = { id: 'gf', module: 'grammar', moduleLabel: 'Grammar', level: 'beginner', title: 'Questions', direction: null, passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Questions.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            practice: [{ id: 'p1', type: 'fill', prompt: '___ is your name? (What / Where)', options: ['Where', 'What'] }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'Pick one', options: ['A', 'B'] }] };
        const post = `(url, body) => url.endsWith('/check') ? (body.given === 'What' ? { correct: true, answer: 'What', explanation: '', events: [] } : { correct: false, answer: 'What', explanation: '', events: [] }) : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/gf'), api: apiModule({ '/linguistic/lessons/gf': LESSON }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-fill-options], [data-answer-area] input'); i++) await press();
            const out = { title: text($('[data-question] h1')), options: $$('[data-fill-option]').map(text), input: !!$('[data-answer-area] input, [data-answer-area] textarea'), check: $('[data-primary]').disabled };
            window.__spoken = []; window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);
            $('[data-fill-option="What"]').click(); await sleep(150);
            out.heard = [...window.__spoken];
            out.picked = { blank: text($('[data-question] .lingo-bubble')), chosen: $('[data-fill-option="What"]').getAttribute('aria-checked'), check: $('[data-primary]').disabled };
            $('[data-fill-swap]').click(); await sleep(150);
            out.keyboard = { input: !!$('[data-answer-area] input, [data-answer-area] textarea'), options: $$('[data-fill-option]').length, swap: text($('[data-fill-swap]')) };
            $('[data-fill-swap]').click(); await sleep(150);
            $('[data-fill-option="What"]').click(); await sleep(100);
            $('[data-primary]').click(); await sleep(1300);
            out.sent = window.__calls.filter((c) => c[0] === 'POST' && c[1].endsWith('/check')).map((c) => [c[2].section, c[2].id, c[2].given]);
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.title, result.options, result.input, result.check], ['ಖಾಲಿ ಜಾಗ ತುಂಬಿ', ['Where', 'What'], false, true], 'the choices, no keyboard first; CHECK waits');
        assert.match(result.picked.blank, /^What is your name\?/, 'tapped: in the blank');
        assert.deepEqual(result.heard, [['What', 'en-IN']], 'and heard (2026-11-06, "give the voice for the tile")');
        assert.deepEqual([result.picked.chosen, result.picked.check], ['true', false]);
        assert.deepEqual(result.keyboard, { input: true, options: 0, swap: 'ಪದಗಳ ಸಂಗ್ರಹ ಬಳಸಿ' }, '"Use keyboard": the typing box, and the way back to the choices');
        assert.deepEqual(result.sent, [['practice', 'p1', 'What']], 'sent as if typed');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('every tile heard (2026-11-06, the user: "the voice for all tile words"): English tiles in English, a Japanese course\'s in Japanese, once as each is tapped; both sides of the matching pairs', async () => {
        const spy = "window.__spoken = []; window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);";
        const EN = { id: 'tt', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Family', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'family', source: 'ಇದು ನನ್ನ ಮನೆ.', open: false, bank: ['This', 'is', 'my', 'house'] }], quiz: [] };
        const JA = { ...EN, id: 'tj2', course: 'ja', target: 'ja', targetName: 'Japanese', targetLocale: 'ja-JP', language: 'en', languageName: 'English',
            items: [{ id: 'i1', kind: 'sentence', topic: 'family', source: 'This is my house.', open: false, bank: ['これは', '私の', '家です'] }] };
        const run = (L) => screen({ entry: app(`/linguistic/translation/${L.id}`), api: apiModule({ [`/linguistic/lessons/${L.id}`]: L }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-tiles]'); i++) await press();
            ${spy}
            for (const b of $$('[data-tiles] button').slice(0, 2)) { b.click(); await sleep(80); }
            return { spoken: [...window.__spoken], placed: $$('[data-placed] button').length };` });
        const en = await run(EN);
        assert.deepEqual(en.errors, []);
        assert.equal(en.result.__error, undefined, en.result.__error);
        assert.equal(en.result.placed, 2, 'tapped: in the answer');
        assert.ok(en.result.spoken.length === 2 && en.result.spoken.every(([, lang]) => lang === 'en-IN'), `English tiles heard in English, once each (${JSON.stringify(en.result.spoken)})`);
        const ja = await run(JA);
        assert.deepEqual(ja.errors, []);
        assert.ok(ja.result.spoken.length === 2 && ja.result.spoken.every(([, lang]) => lang === 'ja-JP'), `Japanese tiles in Japanese (${JSON.stringify(ja.result.spoken)})`);
        const words = [{ word: 'mother', kannada: 'ತಾಯಿ', pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null }, { word: 'father', kannada: 'ತಂದೆ', pos: 'noun', example: '', synonyms: [], antonyms: [], audio: null }];
        const VOC = { id: 'tv', module: 'vocabulary', moduleLabel: 'Vocabulary Builder', level: 'beginner', title: 'Family', direction: null, passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Words.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, words, quiz: [] };
        const pairs = await screen({ entry: app('/linguistic/vocabulary/tv'), api: apiModule({ '/linguistic/lessons/tv': VOC }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-pair]'); i++) await press();
            ${spy}
            const cells = $$('[data-pair]');
            const kn = cells.find((b) => /ತಾಯಿ/.test(b.textContent)), en = cells.find((b) => /mother/.test(b.textContent));
            kn.click(); await sleep(80); en.click(); await sleep(80);
            return { spoken: [...window.__spoken] };` });
        assert.deepEqual(pairs.errors, []);
        // The meaning in Kannada — by a Kannada voice, or where the device has none, a Telugu, Hindi or Marathi one reading it (2026-10-31).
        assert.equal(pairs.result.spoken.length, 2, JSON.stringify(pairs.result.spoken));
        assert.ok(['kn-IN', 'te-IN', 'hi-IN', 'mr-IN'].includes(pairs.result.spoken[0][1]), `the meaning in Kannada (${pairs.result.spoken[0]})`);
        assert.deepEqual(pairs.result.spoken[1], ['mother', 'en-IN'], 'the word in English');
    });

    test('a Hindi course (2026-11-02): a sentence to read has no sound line, but tapped, its English (one with no word-by-word English)', async () => {
        const LESSON = { id: 'th', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'At work', direction: 'kn-en', passingScore: 60,
            course: 'hi', target: 'hi', targetName: 'Hindi', targetLocale: 'hi-IN', language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Write in Kannada.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i1', kind: 'sentence', topic: 'work', source: 'बैठक सोमवार तक के लिए स्थगित कर दी गई है।', sourceEn: 'The meeting has been put off until Monday.', direction: 'en-kn', open: false }],
            quiz: [{ id: 'q1', type: 'translation', source: 'घर', bank: ['ಮನೆ', 'ನೀರು'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic/translation/th'), api: apiModule({ '/linguistic/lessons/th': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            await press(); await sleep(400);
            const out = { source: text($('[data-source]')), say: !!$('[data-source-say]'), dotted: getComputedStyle($('[data-source]')).textDecorationStyle, hidden: !$('[data-hint-box]') };
            $('[data-source]').click(); await sleep(150);
            out.meaning = $$('[data-hint-meaning]').map(text).join(' ');
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.source, result.say, result.dotted, result.hidden], ['बैठक सोमवार तक के लिए स्थगित कर दी गई है।', false, 'dotted', true], 'the sentence, marked to tap');
        assert.equal(result.meaning, 'The meeting has been put off until Monday.', 'tapped: its English');
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

    test('back from a lesson, the mistakes, or a lesson finished (2026-11-05): the path at the unit you are in — the next one once it is done — not Section 1, Unit 1 where a lesson was left', async () => {
        // Nine units of 2 to 10 lessons. A lesson of unit 1 left undone (one who can open every lesson), so the first lesson
        // left is there; the student is working in unit 8.
        const longPath = (done8 = false) => ({ ...PATH, current: 'u2-1', levels: [{ ...PATH.levels[0], units: Array.from({ length: 9 }, (_, k) => ({
            id: `beginner-${k + 1}`, index: k + 1, kind: 'topic', title: `Unit ${k + 1}`, open: true,
            lessons: Array.from({ length: k + 2 }, (_, i) => lesson(`u${k + 2}-${i}`, `Lesson ${i + 1}`, { order: k + 1,
                status: (k === 0 && i === 1) ? 'new' : k < 7 || (k === 7 && (done8 || i < 3)) ? 'completed' : 'new' })) })) }] });
        const MISTAKES = { fixed: 0, mistakes: [{ id: 'm1', module: 'grammar', moduleLabel: 'Grammar Practice', level: 'beginner', lessonTitle: 'Articles', kind: 'question', count: 1, given: 'a', question: { id: 'q1', type: 'fill', prompt: 'This is ___ egg.', options: ['a', 'an'] } }] };
        // The lesson's and the mistakes' own answers before the section's ('/linguistic/' answers what no other does).
        const run = (at, api, where, act, before = '') => screen({ entry: `${before}${app(at)}`, api: apiModule({ ...api, ...SHELL_API, '/linguistic/path': api['/linguistic/path'] }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            const where = ${JSON.stringify(where)};
            await sleep(1200);
            ${act}
            await sleep(1500);
            const r = $('[data-node="' + where + '"]')?.getBoundingClientRect(), first = $('[data-node="u2-1"]')?.getBoundingClientRect();
            return { path: !!$('[data-section]'), at: location.search, seen: !!r && r.top >= 0 && r.bottom <= innerHeight, unit1: !!first && first.bottom > 0 && first.top < innerHeight };` });
        const quit = `$('[data-lingo-session] button[aria-label="Quit"]').click(); await sleep(400); $('[data-end-session]').click();`;
        // The ✕ in a lesson of unit 8, End session: back at it, unit 8 not finished.
        const a = await run('/linguistic/grammar/u9-3', { '/linguistic/lessons/u9-3': { ...GRAMMAR, id: 'u9-3' }, '/linguistic/path': longPath() }, 'u9-3', quit);
        // The mistakes, End session: the unit of the last lesson the student was in.
        const b = await run('/linguistic/review', { '/linguistic/review': MISTAKES, '/linguistic/path': longPath() }, 'u9-3', quit, "localStorage.setItem('lingo:last:me', 'u9-3');\n");
        // Unit 8's last lesson finished, Continue: unit 9's first lesson.
        const finish = `
            await press(); typeIn('an'); await sleep(60); await press(); await sleep(300);
            await press(); await sleep(300); await press();
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60); await press(); await sleep(300);
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText === w).click(); await sleep(40); }
            await press(); await sleep(900);
            $('footer [data-primary]').click();`;
        const c = await run('/linguistic/grammar/u9-8', { '/linguistic/lessons/u9-8': { ...GRAMMAR, id: 'u9-8' }, '/linguistic/path': longPath(true) }, 'u10-0', finish);
        for (const [name, r] of [['a lesson\'s End session', a], ['the mistakes\' End session', b], ['unit 8 finished, Continue', c]]) {
            assert.deepEqual(r.errors, [], name);
            assert.equal(r.result.__error, undefined, `${name}: ${r.result.__error}`);
            assert.deepEqual([r.result.path, r.result.seen, r.result.unit1], [true, true, false], `${name}: the path at its lesson, not unit 1 (${r.result.at})`);
        }
    });

    // 2026-11-07, the user: "after one lesson of a unit, End session goes straight to that unit's next one — not to another
    // unit or another lesson"; chose: the next lesson, its START showing.
    test('a lesson of a unit done, back on the path: the very next lesson of that unit, its START card open — not an earlier one left undone, not another unit', async () => {
        // Unit 1 of five lessons: the 2nd left undone (one who can open every lesson), the 3rd just finished.
        const unitPath = (status) => ({ ...PATH, current: 'n1', levels: [{ ...PATH.levels[0], units: [
            { id: 'beginner-1', index: 1, kind: 'topic', title: 'Unit 1', open: true, lessons: ['n1', 'n2', 'n3', 'n4', 'n5'].map((id, i) => lesson(id, `Lesson ${i + 1}`, { status: status[i] })) },
            { id: 'beginner-2', index: 2, kind: 'topic', title: 'Unit 2', open: true, lessons: ['m1', 'm2'].map((id, i) => lesson(id, `Lesson ${i + 1}`, { status: 'new' })) }] }] });
        const run = (from, status) => screen({ entry: app(`/linguistic?from=${from}`), api: apiModule({ ...SHELL_API, '/linguistic/path': unitPath(status) }), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1500);
            const card = $('[data-lesson-card]');
            const r = card && $('[data-node="' + card.dataset.lessonCard + '"]').getBoundingClientRect();
            return { card: card?.dataset.lessonCard || null, start: !!card?.querySelector('[data-start-lesson]'), seen: !!r && r.top >= 0 && r.bottom <= innerHeight };` });
        const C = 'completed', N = 'new';
        const done = await run('n3', [C, N, C, N, N]);
        const half = await run('n4', [C, N, C, N, N]);
        const last = await run('n5', [C, C, C, C, C]);
        // The next one done before (2026-11-07): the one after it still to do — the lesson "Next up" names.
        const skip = await run('n3', [C, N, C, C, N]);
        // The lesson the result named "Next up" (`&next=`): that one.
        const named = await run('n3&next=n5', [C, N, C, N, N]);
        // A lesson finished: Continue goes to the lesson its "Next up" names (2026-11-07, "Next up said The Kind Shopkeeper,
        // the path another").
        const post = `(url, body) => url.endsWith('/quiz/check') ? { correct: true, answer: body.given, explanation: '' }
            : url.endsWith('/quiz') ? { score: 2, total: 2, percent: 100, passed: true, passingScore: 60, firstPass: true, bestScore: 100, events: [], results: [], next: { id: 'n5', title: 'The Kind Shopkeeper', level: 'beginner' }, certificate: null }
            : url.endsWith('/check') ? { correct: true, answer: 'an', explanation: '', events: [] } : { step: body.step }`;
        const finished = await screen({ entry: app('/linguistic/grammar/n3'), api: apiModule({ '/linguistic/lessons/n3': { ...GRAMMAR, id: 'n3' }, ...SHELL_API, '/linguistic/path': unitPath([C, N, C, C, N]) }, post), styles: true, device: DEVICES.galaxyA55, budget: 30000, script: `
            ${DRIVE}
            await sleep(1200);
            await press(); typeIn('an'); await sleep(60); await press(); await sleep(300);
            await press(); await sleep(300); await press();
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60); await press(); await sleep(300);
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText === w).click(); await sleep(40); }
            await press(); await sleep(900);
            const nextUp = text($('[data-finish-title]')?.nextElementSibling);
            $('footer [data-primary]').click(); await sleep(1500);
            const card = $('[data-lesson-card]');
            return { nextUp, at: location.search, card: card?.dataset.lessonCard || null, start: !!card?.querySelector('[data-start-lesson]') };` });
        assert.deepEqual(finished.errors, []);
        assert.equal(finished.result.__error, undefined, finished.result.__error);
        assert.deepEqual({ ...finished.result, at: undefined }, { nextUp: null, at: undefined, card: 'n5', start: true }, 'no "Next up" line (2026-11-07); Continue: the next lesson, its START showing');
        for (const [name, r, want] of [['the 3rd done', done, 'n4'], ['the 4th left half-way', half, 'n4'], ['the unit\'s last done', last, 'm1'], ['the next one done before', skip, 'n5'], ['"Next up" named', named, 'n5']]) {
            assert.deepEqual(r.errors, [], name);
            assert.equal(r.result.__error, undefined, `${name}: ${r.result.__error}`);
            assert.deepEqual(r.result, { card: want, start: true, seen: true }, `${name}: ${want}, its START showing, on the screen`);
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

    // The tab bar went 2026-10-29 (94d3d01): the dashboard's doors open Practice, Certificates (badges) and Writing under them.
    test('the tabs: Practice (daily, mistakes, placement; the quests are on the dashboard), Badges, Writing', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1100);
            $('[data-door="practice"]').click(); await sleep(400);
            const practice = { quests: !!$('[data-practice-hub] [data-quests]'), daily: $('[data-daily]')?.getAttribute('href'), mistakes: $('[data-mistakes]')?.dataset.mistakes, placement: $('[data-placement-card]')?.dataset.placementCard, wide: (() => { ${WIDE} })() };
            $('[data-door="badges"]').click(); await sleep(500);
            const badges = { list: $$('[data-badge]').map((b) => b.dataset.badge + ':' + b.dataset.earned), levels: $$('[data-level]').length,
                gems: $$('[data-badge] [data-gem]').map((g) => g.dataset.gem + ':' + g.dataset.gemHue), levelGems: $$('[data-level] [data-gem]').map((g) => g.dataset.gem), wide: (() => { ${WIDE} })() };
            $('[data-door="writing"]').click(); await sleep(500);
            return { practice, badges, writing: text($('[data-writing-page]')), open: $('[data-lingo-tab]')?.dataset.lingoTab };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.practice, { quests: false, daily: '/linguistic/daily', mistakes: '4', placement: 'none', wide: 0 });
        assert.deepEqual(result.badges, { list: ['first_lesson:true', 'translator:false'], levels: 3,
            gems: ['hex:green', 'hex:purple'], levelGems: ['hex', 'hex', 'hex'], wide: 0 }, 'each badge in its own colours, on a card of its colour (2026-10-27)');
        assert.match(result.writing, /Nothing yet/);
        assert.equal(result.open, 'writing');
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
            return { score: ok ? 2 : 0, total: 2, percent: ok ? 100 : 0, passed: ok, passingScore: 60, firstPass: ok, bestScore: ok ? 100 : 0, events: ok ? [{ kind: 'xp', amount: 10, source: 'linguistic_lesson' }, { kind: 'xp', amount: 10, source: 'linguistic_perfect' }] : [],
                results: [{ id: 'q1', prompt: '___ apple', given: body.answers.q1 || '', correct: body.answers.q1 === 'An', answer: 'An', explanation: 'Vowel.' }, { id: 'q2', prompt: 'Order', given: body.answers.q2 || '', correct: body.answers.q2 === 'This is good', answer: 'This is good.', explanation: 'S V.' }],
                next: ok ? { id: 'g2', title: 'Pronouns', level: 'beginner' } : null, certificate: null }; }
        return { step: body.step };
    }`;

    test('before the quiz, every answer given before it (2026-11-04): a wrong one crossed out with the right one and why; a right one in green — always shown', async () => {
        const run = (first) => screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': { ...GRAMMAR, language: 'kn', languageName: 'Kannada' } }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let n = 0; n < 4 && !$('[data-answer-area] input, [data-answer-area] textarea'); n++) await press();
            const type = (v) => { const box = $('[data-answer-area] input, [data-answer-area] textarea'); Object.getOwnPropertyDescriptor(box.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(box, v); box.dispatchEvent(new Event('input', { bubbles: true })); };
            type(${JSON.stringify(first)}); await sleep(60); await press(); await sleep(250);
            if (${JSON.stringify(first)} !== 'an') { await press(); await sleep(250); type('an'); await sleep(60); await press(); await sleep(400); }
            const box = $('[data-practice-review]');
            const out = { review: !!box, title: text($('[data-answer-area] h1')) };
            if (box) {
                out.count = box.dataset.practiceReview;
                out.items = $$('[data-review-entry]').map((li) => [li.dataset.reviewEntry, text(li.querySelector('[data-review-prompt]')), text(li.querySelector('[data-review-given]')), text(li.querySelector('[data-review-answer]')), text(li.querySelector('[data-review-why]'))]);
                out.struck = getComputedStyle($('[data-review-given]')).textDecorationLine;
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
        assert.deepEqual([wrong.result.count, wrong.result.title], ['1', 'ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ನೋಡಿ'], 'in the student\'s language');
        assert.deepEqual(wrong.result.items, [['wrong', 'I saw ___ owl.', 'a', 'an', 'ಏಕೆ: "Owl" begins with a vowel sound.']], 'the question, the first answer given, the right one, why');
        assert.equal(wrong.result.struck, 'line-through');
        assert.deepEqual(wrong.result.button, ['ಮುಂದುವರಿಸಿ', true], 'Continue, in the bar as on any screen to read');
        assert.equal(wrong.result.after, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'then the quiz');
        assert.ok(wrong.result.wide <= 1, `nothing wider than the phone (${wrong.result.wide}px)`);
        const right = await run('an');
        assert.deepEqual(right.errors, []);
        assert.equal(right.result.__error, undefined, right.result.__error);
        assert.equal(right.result.review, true, 'all right: the review still, before the quiz (2026-11-04, the user)');
        assert.deepEqual(right.result.items, [['right', 'I saw ___ owl.', 'an', null, null]], 'the answer given, in green, no correction');
        assert.equal(right.result.struck, 'none');
        assert.equal(right.result.after, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!');
    });

    test('CHECK right under the question, every language (2026-11-04); the CONTINUE it turns into there too; a screen to read keeps its Continue in the bar at the foot', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': { ...GRAMMAR, language: 'kn', languageName: 'Kannada' } }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            // (After a wrong answer, the bar running out in its place since 2026-11-05: 'auto'.)
            const where = () => { const b = $('[data-primary]') || $('[data-auto-next]'); return { label: b?.dataset.autoNext ? 'auto' : text(b), inline: !!b?.closest('[data-inline-primary]'), bar: !!b?.closest('footer') }; };
            for (let n = 0; n < 20 && !$('[data-primary]'); n++) await sleep(150);
            const out = { read: where() };
            for (let n = 0; n < 4 && !$('[data-answer-area] input, [data-answer-area] textarea'); n++) await press();
            out.check = where();
            const box = $('[data-answer-area] input, [data-answer-area] textarea'), under = (box.closest('[translate="no"]') || box).getBoundingClientRect().bottom;
            out.below = $('[data-primary]').getBoundingClientRect().top >= under - 1;
            Object.getOwnPropertyDescriptor(box.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(box, 'a');
            box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(60); $('[data-primary]').click(); await sleep(400);
            out.after = where();
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.read, { label: 'ಮುಂದುವರಿಸಿ', inline: false, bar: true }, 'a screen to read: its Continue in the bar, as before');
        assert.deepEqual(result.check, { label: 'ಪರಿಶೀಲಿಸಿ', inline: true, bar: false }, 'CHECK under the question, no bar');
        assert.equal(result.below, true, 'below the answer');
        assert.deepEqual(result.after, { label: 'auto', inline: true, bar: false }, 'once checked (wrong): the bar running out (2026-11-05) in the same place');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    // 2026-11-07, the user, of "I said what time I wake up" under the box: "why did you put this?"; chose: it ticks itself.
    test('a writing task\'s checklist: in the student\'s language, each point ticking itself green as the writing covers it', async () => {
        const READING = {
            id: 'rd', module: 'reading', moduleLabel: 'Reading and Writing', level: 'beginner', title: 'My Day', summary: '', direction: null, passingScore: 60, language: 'kn',
            learn: { intro: 'A short story.' }, progress: { status: 'new', step: 'practice', bestScore: null, attempts: 0 },
            writing: [{ id: 'w4', type: 'paragraph', prompt: 'Write 4 or 5 sentences about your day.', minWords: 5,
                checklist: ['ನಾನು ಎಷ್ಟು ಗಂಟೆಗೆ ಏಳುತ್ತೇನೆ ಎಂದು ಬರೆದೆ', 'ಬೆಳಿಗ್ಗೆ ಮತ್ತು ಸಂಜೆಯ ಬಗ್ಗೆ ಬರೆದೆ', 'ಪ್ರತಿ ವಾಕ್ಯ ಪೂರ್ಣವಿರಾಮದಿಂದ (.) ಮುಗಿಯುತ್ತದೆ'],
                checklistEn: ['I said what time I wake up', 'I wrote about the morning and the evening', 'Each sentence ends with a full stop'],
                checks: [{ groups: [['wake*', 'get up'], ['#', "o'clock", 'six']] }, { groups: [['morning', 'wake*'], ['evening', 'night']] }, { stops: true }] }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'When?', options: ['Six', 'Ten'] }]
        };
        const { result, errors } = await screen({ entry: app('/linguistic/reading/rd'), api: apiModule({ '/linguistic/lessons/rd': READING }), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 8 && !$('[data-writing="w4"]'); i++) await press();
            const ticks = () => $$('[data-write-point]').map((li) => li.dataset.ticked);
            const out = { points: $$('[data-write-point]').map(text), empty: ticks(), boxes: /☐/.test(text($('[data-write-checklist]'))) };
            typeIn('I wake up at six o\\'clock'); await sleep(80);
            out.time = ticks();
            typeIn('I wake up at six o\\'clock. In the evening I play cricket.'); await sleep(80);
            out.all = ticks();
            out.green = getComputedStyle($('[data-write-point="0"]')).color;
            out.wide = (() => { ${SESSION_WIDE} })();
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.points, ['ನಾನು ಎಷ್ಟು ಗಂಟೆಗೆ ಏಳುತ್ತೇನೆ ಎಂದು ಬರೆದೆ', 'ಬೆಳಿಗ್ಗೆ ಮತ್ತು ಸಂಜೆಯ ಬಗ್ಗೆ ಬರೆದೆ', 'ಪ್ರತಿ ವಾಕ್ಯ ಪೂರ್ಣವಿರಾಮದಿಂದ (.) ಮುಗಿಯುತ್ತದೆ'], 'in Kannada, the student\'s language');
        assert.deepEqual([result.empty, result.boxes], [['no', 'no', 'no'], false], 'nothing ticked before writing; no empty ☐ boxes');
        assert.deepEqual(result.time, ['yes', 'no', 'no'], 'the time written: its point ticks; no full stop yet');
        assert.deepEqual(result.all, ['yes', 'yes', 'yes'], 'morning and evening, each sentence with its full stop: all ticked');
        assert.match(result.green, /^rgb\(88, 167, [0-9]\)$/, 'ticked: green (fading in)');
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

    // 2026-11-07, the user's "+0 XP": a lesson passed again earns no new XP — no XP card, and a line saying it was earned before.
    test('a lesson passed again: no "+0 XP" card; only that its XP was earned the first time', async () => {
        const ONLY = { ...GRAMMAR, practice: [], quiz: [GRAMMAR.quiz[1]] };
        const run = (before) => screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': ONLY }, `(url, body) => {
            if (url.endsWith('/quiz/check')) return { correct: true, near: false, answer: 'This is good.', explanation: '' };
            if (url.endsWith('/quiz')) return { score: 1, total: 1, percent: 100, passed: true, passingScore: 60, firstPass: false, bestScore: 100, events: [], xpBefore: ${before}, results: [{ id: 'q2', prompt: 'Order', given: 'This is good', correct: true, answer: 'This is good.' }], next: null, certificate: null };
            return { step: body.step };
        }`), styles: true, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-question="q2"]'); i++) await press();
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText.trim() === w && !b.classList.contains('invisible')).click(); await sleep(80); }
            await press(); await sleep(1200);
            return { finish: $('[data-finish]')?.dataset.finish, stats: $$('[data-stat]').map(text), note: $('[data-xp-parts]')?.dataset.xpParts ?? null, says: text($('[data-xp-parts]')) };` });
        for (const before of [true, false]) {
            const { result, errors } = await run(before);
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.equal(result.finish, 'pass');
            assert.ok(result.stats.length === 2 && !result.stats.some((x) => /XP/.test(x)), `no XP card, only the score and the time (${result.stats})`);
            if (before) assert.deepEqual([result.note, result.says], ['none', 'XP already earned for this lesson'], 'passed before: says its XP was earned then');
            else assert.equal(result.note, null, 'no XP for another reason (Rewards off): nothing said');
        }
    });

    test('words in order, got wrong: the student\'s words stay, the right answer in green under them for 3 seconds, then by itself (2026-11-05) the same question again until it is right, then the next (2026-10-27)', async () => {
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
                below: fix.top >= $$('[data-placed] button').pop().getBoundingClientRect().bottom, red: getComputedStyle($('[data-placed] button')).color, locked: $('[data-placed] button').disabled, button: $('[data-primary]') ? text($('[data-primary]')) : 'auto ' + $('[data-auto-next]')?.dataset.autoNext };
            // Nothing pressed: still there after 2 seconds; the same question again after 3.
            await sleep(2000);
            const waiting = !!$('[data-correction]');
            await sleep(1500);
            const again ={ at: !!$('[data-question="q2"]'), mark: !!$('[data-again]'), correction: !!$('[data-correction]'), placed: $$('[data-placed] button').length };
            await put(['is', 'This', 'good']); await press(); await sleep(300);
            const wrongAgain = { correction: text($('[data-correction]')), button: $('[data-primary]') ? text($('[data-primary]')) : 'auto ' + $('[data-auto-next]')?.dataset.autoNext };
            await press(); await sleep(400);
            const third = { at: !!$('[data-question="q2"]'), correction: !!$('[data-correction]') };
            await put(['This', 'is', 'good']); await press(); await sleep(900);
            const quiz = window.__calls.find((c) => c[0] === 'POST' && c[1].endsWith('/quiz'));
            return { first, waiting, again, wrongAgain, third, after: { sheet: sheet(), still: !!$('[data-question="q2"]') }, counted: quiz && quiz[2].answers.q2 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.first, { at: true, sheet: null, correction: 'This is good.', color: 'rgb(88, 167, 0)', inBox: true, placed: 3, below: true, red: 'rgb(234, 43, 43)', locked: true, button: 'auto 3000' }, 'the student\'s words stay, in red; the right answer in green under them; no CONTINUE, a bar running out (2026-11-05)');
        assert.equal(result.waiting, true, 'the right answer still there after 2 seconds');
        assert.deepEqual(result.again, { at: true, mark: true, correction: false, placed: 0 }, 'then, with nothing pressed, the same question again, fresh, marked as a mistake');
        assert.deepEqual(result.wrongAgain, { correction: 'This is good.', button: 'auto 3000' }, 'wrong again: the answer again, and on by itself');
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
            const wrong = { sheet: sheet(), kept: $('[data-answer-area] textarea').value, red: getComputedStyle($('[data-answer-area] textarea')).color, correction: text($('[data-correction]')), button: $('[data-primary]') ? text($('[data-primary]')) : 'auto ' + $('[data-auto-next]')?.dataset.autoNext, same: !!$('[data-question="p1"]') };
            await press(); await sleep(300);
            const again = { same: !!$('[data-question="p1"]'), mark: !!$('[data-again]'), empty: $('[data-answer-area] textarea').value === '', correction: !!$('[data-correction]') };
            typeIn('an'); await sleep(60); await press(); await sleep(300);
            // The practice question got wrong, reviewed before the quiz (2026-11-04).
            const review = $('[data-practice-review]')?.dataset.practiceReview;
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
            // Review answers (2026-11-04): the practice questions asked before the quiz, then the quiz's.
            $('[data-review-answers]')?.click(); await sleep(200);
            const groups = [...document.querySelectorAll('[data-review-group]')].map((g) => [g.dataset.reviewGroup, [...g.querySelectorAll('[data-review-item]')].map((li) => li.dataset.reviewItem + ': ' + text(li))]);
            return { covers, learn, hearts, disabled, wrong, again, review, intro, blank, filled, q1, placed, q2, wide, groups,
                finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), stats: $$('[data-stat]').map(text), parts: $$('[data-xp-part]').map(text),
                steps: window.__calls.filter((c) => c[1].endsWith('/step')).map((c) => c[2].step),
                checks: window.__calls.filter((c) => c[1].endsWith('/quiz/check')).map((c) => c[2]),
                quiz: window.__calls.find((c) => c[1].endsWith('/quiz'))?.[2] };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.covers, true, 'full screen, over the page');
        assert.equal(result.learn, true);
        assert.equal(result.hearts, '1', 'two questions at 60%: one heart (a wrong answer means no pass)');
        assert.equal(result.disabled, true, 'CHECK waits for an answer');
        assert.deepEqual(result.wrong, { sheet: null, kept: 'a', red: 'rgb(234, 43, 43)', correction: 'an', button: 'auto 3000', same: true }, 'no sheet: the answer stays, in red; the right one in green below; no CONTINUE — on by itself after 3 seconds (2026-11-05)');
        assert.deepEqual(result.again, { same: true, mark: true, empty: true, correction: false }, 'then the same question again, fresh; right this time, on to the quiz');
        assert.equal(result.review, '1', 'the practice question got wrong, reviewed before the quiz (2026-11-04)');
        assert.equal(result.intro, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', '"Quiz time!" in Kannada, the student\'s language (2026-10-24)');
        assert.equal(result.blank, '… apple a day.'); assert.equal(result.filled, 'An apple a day.', 'the choice shows in the blank');
        assert.deepEqual(result.q1, { sheet: null, next: true }, 'right: no sheet, straight to the next question (2026-10-27)');
        assert.match(result.placed, /This\s*is\s*good/); assert.equal(result.q2, null, 'right: no sheet, straight to the result');
        assert.equal(result.finish, 'pass'); assert.equal(result.title, 'Perfect lesson!');
        assert.deepEqual(result.stats.slice(0, 2), ['XP EARNED +20', 'AMAZING 100%'], 'points earned, +20, not a percentage (2026-11-06)');
        assert.deepEqual(result.parts, ['+10 XP for finishing the lesson', '+10 XP for a perfect score'], 'and what each was for'); assert.match(result.stats[2], /^TIME \d+:\d\d$/);
        assert.deepEqual(result.steps, ['practice', 'quiz'], 'where the student is, saved for resuming');
        assert.deepEqual(result.checks, [{ id: 'q1', given: 'An' }, { id: 'q2', given: 'This is good' }]);
        assert.deepEqual(result.quiz, { answers: { q1: 'An', q2: 'This is good' } });
        assert.deepEqual(result.groups.map(([g, items]) => [g, items.length]), [['practice', 1], ['quiz', 2]], 'Review answers: the practice question before the quiz, then the quiz\'s');
        assert.match(result.groups[0][1][0], /^wrong: I saw ___ owl\. You: a Answer: an/, 'the practice question: the first answer given, wrong, and the right one');
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

    test('out of hearts: the mistake put right first (2026-10-27), then the quiz\'s other questions (2026-11-05), then the result; only the first answers are sent; TRY AGAIN starts at the quiz', async () => {
        const reached = { ...GRAMMAR, progress: { status: 'started', step: 'quiz', bestScore: null, attempts: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': reached }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            // No skipping to the quiz (2026-10-28): the tips, then the practice question answered, then the quiz.
            const noSkip = !$('[data-skip-to-quiz]');
            await press(); typeIn('an'); await sleep(60); await press(); await sleep(300);
            // The answers before the quiz reviewed first (2026-11-04), then the quiz.
            const reviewed = !!$('[data-practice-review]');
            await press(); await sleep(300);
            const skipped = text($('[data-answer-area] h1'));
            await press();
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('A')).click(); await sleep(60);
            await press(); await sleep(150);
            const hearts = $('[data-hearts]')?.dataset.hearts;
            const shown = text($('[data-correction]'));
            await press(); await sleep(300);
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60);
            await press(); await sleep(700);
            // No hearts left, the quiz goes on to its next question (2026-11-05), then the result.
            const next = !!$('[data-question="q2"]') && !$('[data-finish]');
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText.trim() === w && !b.classList.contains('invisible')).click(); await sleep(60); }
            await press(); await sleep(700);
            const out = { noSkip, reviewed, skipped, hearts, shown, next, finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), sent: window.__calls.find((c) => c[1].endsWith('/quiz'))?.[2] };
            $('[data-review-answers]').click(); await sleep(200);
            out.review = $$('[data-review-group="quiz"] [data-review-item]').map((li) => li.dataset.reviewItem);
            out.practiced = $$('[data-review-group="practice"] [data-review-item]').map((li) => li.dataset.reviewItem);
            $('footer [data-primary]').click(); await sleep(400);
            out.retry = { title: text($('[data-answer-area] h1')), hearts: $('[data-hearts]')?.dataset.hearts };
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.noSkip, true, 'no "Skip to quiz" (2026-10-28): every question is answered');
        assert.equal(result.reviewed, true, 'the answers before the quiz reviewed first (2026-11-04)');
        assert.equal(result.skipped, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'the quiz after the practice, for one who reached it before too');
        assert.equal(result.hearts, '0');
        assert.equal(result.shown, 'An', 'the right answer shown, to put the mistake right before anything else');
        assert.equal(result.next, true, 'out of hearts, the quiz\'s next question is still asked (2026-11-05)');
        assert.equal(result.finish, 'fail'); assert.equal(result.title, 'Out of hearts!');
        assert.deepEqual(result.sent, { answers: { q1: 'A', q2: 'This is good' } }, 'the first answer counts; every question answered');
        assert.deepEqual(result.review, ['wrong', 'right'], 'the quiz\'s answers, the second one too');
        assert.deepEqual(result.practiced, ['right'], 'and the practice question before it (2026-11-04)');
        assert.deepEqual(result.retry, { title: 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', hearts: '1' });
    });

    test('a passage translated (2026-11-05): far off, red with the model, then asked again until right; close enough, its model in green under the answer box, CONTINUE under it — no sheet at the foot', async () => {
        const MODEL = 'I completed my degree last year. Now I am looking for a job in a software company.';
        const LESSON = { id: 'ps', module: 'translation', moduleLabel: 'Translation Practice', level: 'advanced', title: 'Passages', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
            items: [{ id: 'i5', kind: 'paragraph', topic: 'passage', source: 'ನಾನು ಕಳೆದ ವರ್ಷ ಪದವಿ ಮುಗಿಸಿದೆ. ಈಗ ನಾನು ಒಂದು ಸಾಫ್ಟ್‌ವೇರ್ ಕಂಪನಿಯಲ್ಲಿ ಕೆಲಸ ಹುಡುಕುತ್ತಿದ್ದೇನೆ.', open: true, bank: null },
                { id: 'i6', kind: 'sentence', topic: 'professional', source: 'ನಿಮ್ಮ ಸಹಕಾರಕ್ಕೆ ಧನ್ಯವಾದಗಳು.', bank: null }], quiz: [] };
        // As the server marks it (2026-11-05): close enough to the model, right; far off, wrong.
        const post = `(url, body) => url.endsWith('/check') ? (/degree/.test(body.given) ? { correct: true, verdict: 'review', answer: ${JSON.stringify(MODEL)}, events: [] } : { correct: false, verdict: 'wrong', answer: ${JSON.stringify(MODEL)}, events: [] }) : { step: body.step }`;
        // Far off: red, the model to see, then the same passage again — the student's text kept — until it is right.
        const off = await screen({ entry: app('/linguistic/translation/ps'), api: apiModule({ '/linguistic/lessons/ps': LESSON }, post), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-translation="i5"]'); i++) await press();
            typeIn('bvhg'); await sleep(60);
            await press(); await sleep(300);
            const out = { red: $('[data-answer-area] textarea').dataset.wrong || null, correction: text($('[data-correction]')), auto: !!$('[data-auto-next]'), model: !!$('[data-model-box]') };
            await sleep(4600);
            out.again = { same: !!$('[data-translation="i5"]'), mark: !!$('[data-again]'), kept: $('[data-answer-area] textarea').value };
            typeIn('I completed my degree last year. Now I am looking for a job.'); await sleep(60);
            await press(); await sleep(500);
            out.next = !!$('[data-translation="i6"]');
            return out;` });
        assert.deepEqual(off.errors, []);
        assert.equal(off.result.__error, undefined, off.result.__error);
        assert.deepEqual([off.result.red, off.result.correction, off.result.auto, off.result.model], ['true', MODEL, true, false], 'wrong: red, the model in green, on by itself');
        assert.deepEqual(off.result.again, { same: true, mark: true, kept: 'bvhg' }, 'the same passage again, the student\'s text there to put right');
        assert.equal(off.result.next, true, 'right this time: on to the next');

        const { result, errors } = await screen({ entry: app('/linguistic/translation/ps'), api: apiModule({ '/linguistic/lessons/ps': LESSON }, post), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 4 && !$('[data-translation="i5"]'); i++) await press();
            typeIn('I completed my degree last year. Now I am searching the job in software company.'); await sleep(60);
            await press(); await sleep(300);
            const box = $('[data-answer-area] textarea').getBoundingClientRect(), model = $('[data-model-box]')?.getBoundingClientRect(), btn = $('[data-inline-primary] [data-primary]');
            const out = { sheet: !!$('[data-sheet]'), model: text($('[data-model]')), below: !!model && model.top >= box.bottom, red: $('[data-answer-area] textarea').dataset.wrong || null,
                button: text(btn), under: !!btn && !!model && btn.getBoundingClientRect().top >= model.bottom, auto: !!$('[data-auto-next]'), wide: (() => { ${SESSION_WIDE} })() };
            btn.click(); await sleep(400);
            out.next = !!$('[data-translation="i6"]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.sheet, result.model, result.below, result.red], [false, MODEL, true, null], 'the model in green under the box; no sheet; the student\'s text not red');
        assert.deepEqual([result.button, result.under, result.auto], ['ಮುಂದುವರಿಸಿ', true, false], 'CONTINUE under it, as the other questions (time to compare: not on by itself)');
        assert.equal(result.next, true, 'then the next question');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    for (const [name, size] of [['phone', { device: DEVICES.galaxyA55 }], ['laptop', { width: 1366, height: 768 }]]) {
        test(`the Kannada letters on a ${name} (2026-11-05): the answer box in view above them, not covered; ottakshara: ನ ಮ ಒತ್ತಕ್ಷರ ಮ = ನಮ್ಮ`, async () => {
            const LESSON = { id: 'kp', module: 'translation', moduleLabel: 'Translation Practice', level: 'advanced', title: 'Passages', direction: 'en-kn', passingScore: 60, language: 'kn', languageName: 'Kannada',
                learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
                items: [{ id: 'i5', kind: 'paragraph', topic: 'passage', source: 'Our college organised a blood donation camp last week. Many students and teachers took part. The doctors thanked everyone for their support.', open: true, bank: null }], quiz: [] };
            const { result, errors } = await screen({ entry: app('/linguistic/translation/kp'), api: apiModule({ '/linguistic/lessons/kp': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, ...size, script: `
                ${DRIVE}
                await sleep(1000);
                for (let i = 0; i < 4 && !$('[data-translation="i5"]'); i++) await press();
                $('[data-letters-toggle]').click(); await sleep(500);
                const key = (k) => $$('[data-kannada-keys] button').find((b) => b.getAttribute('aria-label') === 'Kannada ' + k);
                const box = () => $('[data-answer-area] textarea').getBoundingClientRect();
                const kb = $('[data-keys-popup] > div').getBoundingClientRect(), page = $('[data-lingo-session] main').getBoundingClientRect();
                const out = { inView: box().bottom <= kb.top + 1 && box().top >= page.top - 1, share: Math.round((kb.height / innerHeight) * 100), rows: ${KEY_ROWS}('[data-kannada-keys]') };
                for (const k of ['ನ', 'ಮ']) { key(k).click(); await sleep(40); }
                $('[data-ottu-key]').click(); await sleep(60);
                out.shapes = text(key('ಮ')).includes('್');
                key('ಮ').click(); await sleep(60);
                out.typed = $('[data-answer-area] textarea').value;
                out.after = [!!$('[data-kannada-keys][data-ottu]'), text(key('ಮ'))];
                out.stillInView = box().bottom <= $('[data-keys-popup] > div').getBoundingClientRect().top + 1;
                out.wide = (() => { ${SESSION_WIDE} })();
                return out;` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.equal(result.inView, true, `the answer box above the keyboard, not under it (the keyboard ${result.share}% of the screen)`);
            assert.ok(result.share <= (name === 'phone' ? 62 : 55), `the keyboard not too tall (${result.share}% of the screen)`);
            assertKeyRows(result.rows, `Kannada on a ${name}`);
            if (name === 'laptop') assert.deepEqual(result.rows.map((r) => r.lines.length), [1, 1, 3], 'vowels a line, signs a line, consonants three');
            assert.equal(result.shapes, true, 'ottakshara on: the consonants show their ottakshara shapes');
            assert.equal(result.typed, 'ನಮ್ಮ', 'ನ ಮ, ottakshara, ಮ');
            assert.deepEqual(result.after, [false, 'ಮ'], 'once, as Shift: then the letters again');
            assert.equal(result.stillInView, true);
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });
    }

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
            const fix = { sheet: sheet(), kept: $('[data-translation] textarea').value, red: $('[data-translation] textarea').dataset.wrong, correction: text($('[data-correction]')), why: text($('[data-correction-why]')), button: $('[data-primary]') ? text($('[data-primary]')) : 'auto ' + $('[data-auto-next]')?.dataset.autoNext };
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
        assert.deepEqual(result.fix, { sheet: null, kept: 'ಸ್ನೇಹ', red: 'true', correction: 'ಸ್ನೇಹಿತ', why: 'ಏಕೆ: Friend is ಸ್ನೇಹಿತ.', button: 'auto 3000' },
            'no sheet: the answer stays, the right one in green with why ("Why:" in Kannada), then by itself (2026-11-05) the same question again');
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
        assert.equal(result.next, '“ಮನೆ” ಅನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯಿರಿ', 'on to the next exercise by itself: write the word (its title as Duolingo\'s since 2026-11-06)');
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

    test('a sentence in Kannada or Japanese to put in English (2026-11-04): its tiles only — no "Use keyboard", no letter keyboard', async () => {
        const out = {};
        for (const [code, name, locale, source] of [['kn', 'Kannada', 'kn-IN', 'ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ.'], ['ja', 'Japanese', 'ja-JP', '私は学校に行きます。']]) {
            const LESSON = { id: 'te', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Sentences', direction: 'en-kn', passingScore: 60, language: 'en', languageName: 'English',
                course: code, target: code, targetName: name, targetLocale: locale, learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 },
                items: [{ id: 'i1', kind: 'sentence', topic: 'school', source, open: false, bank: ['school', 'to', 'book', 'go', 'I', 'name'] }], quiz: [] };
            const { result, errors } = await screen({ entry: app('/linguistic/translation/te'), api: apiModule({ '/linguistic/lessons/te': LESSON }, '(url, body) => ({ step: body.step })'), styles: true, device: DEVICES.galaxyA55, script: `
                ${DRIVE}
                await sleep(1000);
                await press();
                return { tiles: !!$('[data-tiles]'), swap: !!$('[data-swap-input]'), typing: !!$('[data-answer-area] textarea'), toggle: !!$('[data-letters-toggle]'), popup: !!$('[data-keys-popup]') };` });
            assert.deepEqual(errors, [], code);
            assert.equal(result.__error, undefined, `${code}: ${result.__error}`);
            out[code] = result;
        }
        for (const code of ['kn', 'ja']) assert.deepEqual(out[code], { tiles: true, swap: false, typing: false, toggle: false, popup: false }, `${code}: the English tiles, nothing to type with`);
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
            { const tb = $('[data-answer-area] textarea').getBoundingClientRect(), kb = $('[data-keys-popup] > div').getBoundingClientRect(); out.preview = tb.bottom <= kb.top + 1 && tb.bottom > 40; }
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
        assert.equal(result.preview, true, 'the answer box itself in view above the keyboard (2026-11-05; before, a copy of it on the keyboard)');
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

    test('fill in the blanks (2026-11-05, Duolingo\'s "ಬಿಟ್ಟ ಸ್ಥಳ ತುಂಬಿ"): its title in the student\'s language, a tile tapped fills the next box, a box tapped gives it back, CHECK once every box is full; wrong — red, the right sentence, the same question again by itself; right — on; the results in Kannada', async () => {
        const LESSON = { id: 'fb', module: 'translation', moduleLabel: 'Translation Practice', level: 'beginner', title: 'Daily life', direction: 'kn-en', passingScore: 60, language: 'kn', languageName: 'Kannada',
            learn: { intro: 'Translate.' }, progress: { status: 'started', step: 'practice', bestScore: null, attempts: 0 }, items: [],
            blanks: [{ id: 'blank~i1', type: 'blanks', prompt: 'I ___ to ___ every day.', parts: ['I ', null, ' to ', null, ' every day.'], hint: 'ನಾನು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ನಡೆಯುತ್ತೇನೆ.', words: ['school', 'water', 'walk', 'house', 'run'] }],
            quiz: [{ id: 'q1', type: 'mcq', prompt: 'What does "house" mean?', options: ['ಮನೆ', 'ನೀರು'] }] };
        const post = `(url, body) => url.endsWith('/check') ? { correct: body.section !== 'blanks' || body.given === 'walk school', verdict: body.section !== 'blanks' || body.given === 'walk school' ? 'exact' : 'wrong', answer: 'I walk to school every day.', explanation: '', events: [] }
            : url.endsWith('/quiz') ? { passed: true, percent: 100, passingScore: 60, results: [{ id: 'q1', prompt: 'What does "house" mean?', given: 'ಮನೆ', correct: true }], events: [], next: { title: 'Food' } } : { step: body.step }`;
        const { result, errors } = await screen({ entry: app('/linguistic/translation/fb'), api: apiModule({ '/linguistic/lessons/fb': LESSON }, post), styles: true, budget: 30000, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 6 && !$('[data-question="blank~i1"]'); i++) await press();
            window.__spoken = []; window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang]);
            const tile = (w) => $$('[data-tiles] button').find((b) => b.innerText.trim() === w && !b.classList.contains('invisible'));
            const boxes = () => $$('[data-blank]').map((b) => b.innerText.trim());
            const hidden = () => $$('[data-tiles] button.invisible').map((b) => b.textContent.trim());
            const start = { title: text($('[data-question="blank~i1"] h1')), hint: text($('[data-blanks-hint]')), sentence: text($('[data-blanks]')), boxes: boxes(), tiles: $$('[data-tiles] button').length, check: $('[data-primary]').disabled, checkText: text($('[data-primary]')) };
            tile('school').click(); await sleep(80);
            const one = { boxes: boxes(), hidden: hidden(), check: $('[data-primary]').disabled, spoken: [...window.__spoken] };
            $('[data-blank="0"]').click(); await sleep(80);
            const back = { boxes: boxes(), hidden: hidden() };
            tile('school').click(); await sleep(60); tile('walk').click(); await sleep(80);
            const full = { boxes: boxes(), check: $('[data-primary]').disabled };
            $('[data-primary]').click(); await sleep(400);
            const wrong = { sheet: sheet(), red: getComputedStyle($('[data-blank="0"]')).color, correction: text($('[data-correction]')), auto: $('[data-auto-next]')?.dataset.autoNext, locked: $('[data-blank="0"]').disabled };
            await sleep(3600);
            const again = { at: !!$('[data-question="blank~i1"]'), boxes: boxes(), correction: !!$('[data-correction]') };
            tile('walk').click(); await sleep(60); tile('school').click(); await sleep(80);
            $('[data-primary]').click(); await sleep(700);
            const after = !!$('[data-question="blank~i1"]');
            for (let i = 0; i < 10 && !$('[data-finish]'); i++) { $$('[data-option]')[0]?.click(); await sleep(80); await press(); await sleep(400); }
            const finish = { at: text($('[data-lingo-session] main')).slice(0, 120), title: text($('[data-finish-title]')), next: text($('[data-finish-title]')?.nextElementSibling), stats: $$('[data-stat] p:first-child').map(text), buttons: $$('footer button').map(text).filter(Boolean) };
            const sent = window.__calls.filter((c) => c[0] === 'POST' && c[1].endsWith('/check')).map((c) => c[2]);
            return { start, one, back, full, wrong, again, after, finish, sent };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.start, { title: 'ಬಿಟ್ಟ ಸ್ಥಳ ತುಂಬಿ', hint: 'ನಾನು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ನಡೆಯುತ್ತೇನೆ.', sentence: 'I to every day.', boxes: ['', ''], tiles: 5, check: true, checkText: 'ಪರಿಶೀಲಿಸಿ' }, 'the title and CHECK in Kannada, the meaning above, two empty boxes, CHECK grey');
        assert.deepEqual(result.one, { boxes: ['school', ''], hidden: ['school'], check: true, spoken: [['school', 'en-IN']] }, 'a tile tapped: read aloud (2026-11-05, like Duolingo), into the first empty box, its place left empty; one box still empty, CHECK still grey');
        assert.deepEqual(result.back, { boxes: ['', ''], hidden: [] }, 'a box tapped: its word back among the tiles');
        assert.deepEqual(result.full, { boxes: ['school', 'walk'], check: false }, 'every box full: CHECK');
        assert.deepEqual(result.wrong, { sheet: null, red: 'rgb(234, 43, 43)', correction: 'I walk to school every day.', auto: '3000', locked: true }, 'wrong: the words in red, the right sentence in green, on by itself');
        assert.deepEqual(result.again, { at: true, boxes: ['', ''], correction: false }, 'then the same question again, empty');
        assert.equal(result.after, false, 'right: on to the next');
        assert.deepEqual(result.sent.filter((b) => b.section).map((b) => [b.section, b.id, b.given]), [['blanks', 'blank~i1', 'school walk'], ['blanks', 'blank~i1', 'walk school']], 'the words in the boxes\' order, checked by the server');
        assert.equal(result.finish.title, 'ಪರಿಪೂರ್ಣ ಪಾಠ!', 'the result in Kannada: "Perfect lesson!"');
        assert.doesNotMatch(result.finish.next || '', /ಮುಂದಿನದು/, 'no "Next up" line (2026-11-07, the user: "better you don\'t put the Next up")');
        assert.ok(result.finish.stats.includes('ಅದ್ಭುತ') && result.finish.stats.includes('ಸಮಯ') && !result.finish.stats.includes('ಗಳಿಸಿದ XP'), `the stats in Kannada; no new XP here, so no XP card (2026-11-07) (${result.finish.stats})`);
        assert.ok(result.finish.buttons.includes('ಮುಂದುವರಿಸಿ') || result.finish.buttons.some((b) => /ರಸಪ್ರಶ್ನೆ/.test(b)), `the buttons in Kannada (${result.finish.buttons})`);
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
