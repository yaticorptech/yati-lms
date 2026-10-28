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
                welcome: !!$('[data-lingo-welcome]'), message: text($('[data-lingo-welcome-line]')), pictures: $$('[data-lingo-welcome] img').map((i) => i.getAttribute('src').split('/').pop()), tiles: $$('[data-lingo-dashboard] .lift').length, road: $$('[data-roadmap-day]').map((x) => x.dataset.roadmapDay + ':' + x.dataset.state), cheer: $('[data-plan-cheer]')?.dataset.planCheer, side: ['[data-plan-card]', '[data-quests]', '[data-mistakes]'].filter((q) => $('[data-lingo-dashboard-cards] ' + q)).length, removed: ['[data-lingo-plan-card]', '[data-lingo-week]', '[data-lingo-badges-strip]'].filter((q) => $(q)),
                stats: [$('[data-xp]')?.dataset.xp, !!$('[data-course-chip]')], cont: text($('[data-lingo-continue]')), href: $('[data-lingo-continue]')?.getAttribute('href'),
                skills: $$('[data-skill]').length, levels: $$('[data-level-row]').length,
                wide: (() => { ${WIDE} })()
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.tab, result.tabs], [null, ['Learn', 'Practice', 'Badges', 'Writing']], 'the tabs on the dashboard too (2026-10-27), none lit');
        assert.equal(result.href, '/linguistic?lesson=r4', 'Continue opens the path at that lesson');
        assert.deepEqual(result.stats, ['340', true], 'the language, level, streak and XP bar, on the dashboard');
        assert.equal(result.side, 3, 'the side panel\'s roadmap, daily quests and mistakes, on the dashboard');
        assert.deepEqual([result.road, result.cheer], [['1:today', '8:ahead', '15:ahead', '22:ahead', '30:ahead'], 'orange'], 'the roadmap\'s road: day 3 of 30, past Day 1; one lesson behind, "Catch up!" (2026-10-27)');
        assert.deepEqual([result.welcome, result.tiles, result.removed, result.levels], [true, 0, [], DASH.levels.length], 'no number tiles, roadmap or week (taken off)');
        assert.match(result.cont, /Articles: a, an and the|Continue/);
        assert.equal(result.message, 'Welcome to Language Learning!', 'only the welcome, no other text');
        assert.ok(result.pictures.every((p) => /wave-hi/.test(p)), `the mascot only, no profile photo (${result.pictures})`);
        assert.equal(result.skills, 2);
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

    test('the speaker uses the language\'s own voice; with none on the device it says so, not silence (2026-10-26)', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import { Speaker } from '${srcFile('linguistic/ui.jsx')}';
// A computer like the one Kannada was silent on: English and Hindi voices, no Kannada.
Object.defineProperty(window.speechSynthesis, 'getVoices', { configurable: true, value: () => [{ lang: 'en-US', name: 'Samantha' }, { lang: 'hi_IN', name: 'Lekha' }] });
window.speechSynthesis.dispatchEvent(new Event('voiceschanged'));
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
window.__spoken = [];
window.speechSynthesis.speak = (u) => window.__spoken.push([u.text, u.lang, u.voice ? u.voice.name : null]);
createRoot(document.getElementById('root')).render(<div className="lingo flex gap-10 p-10"><span id="kn"><Speaker text="ಕುಟುಂಬ" lang="kn-IN" /></span><span id="hi"><Speaker text="परिवार" lang="hi-IN" /></span></div>);`;
        const { result, errors } = await screen({ entry, api: apiModule({}), styles: true, script: `
            await sleep(500);
            $('#kn button').click(); await sleep(200);
            const note = text($('[data-no-voice]'));
            $('#hi button').click(); await sleep(200);
            return { note, spoken: window.__spoken };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.note, /This device has no Kannada voice/);
        assert.deepEqual(result.spoken, [['परिवार', 'hi-IN', 'Lekha']], 'Hindi read by the Hindi voice; nothing sent for Kannada');
    });

    test('an ✕ on every page: the dashboard\'s closes the section, a page inside goes back to the dashboard (2026-10-26)', async () => {
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
            return { covers, learn, hearts, disabled, wrong, again, intro, blank, filled, q1, placed, q2, wide,
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
            for (const k of ['ಸ', '್', 'ನ', 'ೇ', 'ಹ']) { $$('[data-kannada-keys] button').find((b) => b.getAttribute('aria-label') === 'Kannada ' + k).click(); await sleep(40); }
            const typed = $('[data-translation] textarea').value;
            await press(); await sleep(150);
            const fix = { sheet: sheet(), kept: $('[data-translation] textarea').value, red: $('[data-translation] textarea').dataset.wrong, correction: text($('[data-correction]')), why: text($('[data-correction-why]')), button: text($('[data-primary]')) };
            return { bank, slot, first, typed, fix,
                sent: window.__calls.filter((c) => c[1].endsWith('/check')).map((c) => c[2]), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.bank, ['ಮನೆ', 'ಸ್ನೇಹಿತ', 'ನೀರು']);
        assert.equal(result.slot, true, 'a used tile leaves its slot');
        assert.equal(result.first, null, 'right: no sheet, straight to the next one (2026-10-27)');
        assert.equal(result.typed, 'ಸ್ನೇಹ');
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
            $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['い', 'え']) { $$('[data-letter-keys="ja"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            return { shown, tiled, sent, label, typed: $('[data-translation] textarea').value, placeholder: $('[data-translation] textarea').placeholder, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.shown.title, 'この文を訳してください', 'the instruction in Japanese, the language they know (2026-10-24)'); assert.equal(result.shown.direction, 'Japanese → English', 'the course, from their language to the one learnt (2026-10-28), though this sentence is English to write in Japanese');
        assert.deepEqual(result.shown.tiles, ['ございます', '水', 'おはよう']);
        assert.equal(result.tiled, null, 'right: straight on'); assert.deepEqual(result.sent, { section: 'items', id: 'i3', given: 'おはよう ございます' });
        assert.match(result.label, /japanese letters/i);
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
