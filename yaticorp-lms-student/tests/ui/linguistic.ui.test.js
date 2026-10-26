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
                    jump: $$('[data-jump]').map((a) => a.dataset.jump), trophies: $$('[data-trophy]').length, mascots: $$('[data-unit] img[src^="/mascot/stills/"]').length,
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
            assert.deepEqual(result.tabs, ['Learn', 'Practice', 'Badges', 'Writing']);
            assert.deepEqual(result.sections, ['beginner', 'intermediate']);
            assert.deepEqual(result.nodes, { v1: 'completed', v2: 'new', g1: 'completed', g2: 'locked', t1: 'locked' });
            assert.equal(result.crown, true, 'a crown for 100%');
            assert.equal(result.bubble, 'v2', 'START over the lesson to take next');
            assert.deepEqual(result.jump, ['intermediate'], '"Jump here?" on the level not open yet');
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

    test('starting out (2026-10-26, as Talkpal asks): Get started, the language to learn and the level, the aim, "let\'s get you started", reason, style, skills, topics, age, the translation language, minutes and time of day, the roadmap and where it leads, then where to start — each question waits for an answer', async () => {
        const fresh = { ...DASH, started: false, goalSet: false };
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
            await stepIs('aim', '[data-aim="speaking"]');
            await pass();
            await stepIs('why', '[data-reason="abroad"]');
            await stepIs('style', '[data-style="reading"]');
            await stepIs('focus', '[data-focus="speaking"]', '[data-focus="vocabulary"]');
            await stepIs('topics', '[data-topic="work"]');
            await stepIs('age', '[data-age="18-24"]');
            out.translateFirst = $$('[data-language]')[0]?.dataset.language;
            await stepIs('translate', '[data-language="ja"]');
            await stepIs('practice', '[data-practice="15"]');
            await stepIs('when', '[data-when="evening"]');
            await stepIs('time', '[data-plan-days="60"]');
            out.chart = $('[data-goal-chart]')?.dataset.goalChart;
            await pass();
            await stepIs('start', '[data-start="scratch"]');
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.tabs, 0, 'the section waits behind the start screens');
        assert.deepEqual(result.welcome, ['welcome', 'Get started', false], 'first, Get started');
        assert.deepEqual(result.learn, { english: 'true', tiles: 5, found: ['hi'] }, 'English to begin; the languages searched');
        assert.deepEqual(result.shown, [['welcome', false], ['learn', false], ['started', false], ['chart', false]], 'the screens with nothing to choose (or already chosen) go on');
        const asked = ['know', 'aim', 'why', 'style', 'focus', 'topics', 'age', 'translate', 'practice', 'when', 'time', 'start'];
        assert.deepEqual(result.steps, asked.flatMap((n) => [[n, true], [n, false, true]]), 'CONTINUE is grey, and does nothing, until an answer is chosen');
        assert.deepEqual(result.cefr, ['A1', 'A1–A2', 'A2–B1', 'B1–B2', 'B2+']);
        assert.equal(result.translateFirst, 'kn', 'no device language here: the list as it is');
        assert.deepEqual(result.tiers, ['main', 'main', 'full', 'full', 'full'], 'each time says whether it has every lesson or the main ones');
        assert.equal(result.suggested, '60', '15 minutes a day: the 2-month roadmap');
        assert.equal(result.chart, '9', 'where 2 months take them: week 9');
        assert.equal(result.recommended, 'scratch', 'new to English: start from scratch is recommended');
        assert.deepEqual(result.sent, [
            ['/linguistic/about', { reason: 'abroad', know: 0, focus: ['speaking', 'vocabulary'], topics: ['work'], studyTime: 'evening', aim: 'speaking', style: 'reading', ageBand: '18-24', practiceMinutes: 15 }],
            ['/linguistic/language', { language: 'ja' }], ['/linguistic/plan', { days: 60 }], ['/linguistic/level', { level: 'beginner' }]
        ], 'the answers; their language, the plan, then the level');
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

    test('starting out knowing some English: Find my level is recommended, and opens the test; or start at the level said', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        const PL = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/placement': PL, ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const go = async (pick) => { if (pick) { $(pick).click(); await sleep(100); } btn().click(); await sleep(400); };
            await go(); await go(); await go('[data-know="3"]'); await go('[data-aim="fluent"]'); await go();
            await go('[data-reason="school"]'); await go('[data-style="speaking"]'); await go('[data-focus="writing"]'); await go('[data-topic="studies"]'); await go('[data-age="under18"]');
            await go(); await go('[data-practice="0"]'); await go('[data-when="morning"]'); await go('[data-plan-days="30"]'); await go();
            const recommended = $('[data-recommended]')?.closest('[data-start]')?.dataset.start;
            const atLevel = text($('button[data-start="level"]'));
            $('[data-start="find"]').click(); await sleep(100);
            const label = btn().innerText.trim();
            btn().click(); await sleep(700);
            return { recommended, atLevel, label, test: /find your English level/i.test($('[data-lingo-session] [data-answer-area] h1')?.innerText || ''), sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.recommended, 'find');
        assert.match(result.atLevel, /start at Intermediate, the level you told us/);
        assert.match(result.label, /start the test/i);
        assert.deepEqual(result.sent, ['/linguistic/about', '/linguistic/plan', '/linguistic/level'], 'started at Beginner, so leaving the test does not bring the questions back; the test then places them');
        assert.equal(result.test, true, 'the placement test opens');
    });

    test('the dashboard (where the section opens; no tabs on it), like the profile dashboard: welcome, continue, skills, levels, badges (2026-10-26)', async () => {
        const modules = [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }, { id: 'grammar', total: 6, completed: 1, average: null }];
        const dash = { ...DASH, modules, plan: ROADMAP.plan, today: { xp: 10, lessons: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 390, script: `
            await sleep(1200);
            return {
                tab: $('nav[aria-label="Language Learning"] a[aria-current="page"]')?.dataset.tab || null, tabs: $$('nav[aria-label="Language Learning"] a').map((a) => a.dataset.tab),
                welcome: !!$('[data-lingo-welcome]'), message: text($('[data-lingo-welcome-line]')), pictures: $$('[data-lingo-welcome] img').map((i) => i.getAttribute('src').split('/').pop()), tiles: $$('[data-lingo-dashboard] .lift').length, side: ['[data-plan-card]', '[data-quests]', '[data-mistakes]'].filter((q) => $('[data-lingo-dashboard-cards] ' + q)).length, removed: ['[data-lingo-plan-card]', '[data-lingo-week]'].filter((q) => $(q)),
                stats: [$('[data-xp]')?.dataset.xp, !!$('[data-course-chip]')], cont: text($('[data-lingo-continue]')), href: $('[data-lingo-continue]')?.getAttribute('href'),
                skills: $$('[data-skill]').length, levels: $$('[data-level-row]').length,
                wide: (() => { ${WIDE} })()
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.tab, result.tabs], [null, []], 'no tabs on the dashboard: they show once the student goes on from it');
        assert.equal(result.href, '/linguistic?lesson=r4', 'Continue opens the path at that lesson');
        assert.deepEqual(result.stats, ['340', true], 'the language, level, streak and XP bar, on the dashboard');
        assert.equal(result.side, 3, 'the side panel\'s roadmap, daily quests and mistakes, on the dashboard');
        assert.deepEqual([result.welcome, result.tiles, result.removed, result.levels], [true, 0, [], DASH.levels.length], 'no number tiles, roadmap or week (taken off)');
        assert.match(result.cont, /Articles: a, an and the|Continue/);
        assert.equal(result.message, 'Welcome to Language Learning!', 'only the welcome, no other text');
        assert.ok(result.pictures.every((p) => /wave-hi/.test(p)), `the mascot only, no profile photo (${result.pictures})`);
        assert.equal(result.skills, 2);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('on a laptop the dashboard takes the whole width: every card in two columns that start and end on one line (2026-10-26)', async () => {
        const dash = { ...DASH, modules: [{ id: 'vocabulary', total: 12, completed: 3, average: 88 }], plan: ROADMAP.plan };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }), styles: true, width: 1400, script: `
            await sleep(1200);
            const cards = $$('[data-lingo-dashboard-cards] > * > *').map((c) => c.getBoundingClientRect());
            const lefts = [...new Set(cards.map((c) => Math.round(c.left)))];
            const bottom = (x) => Math.max(...cards.filter((c) => Math.round(c.left) === x).map((c) => c.bottom));
            const tops = lefts.map((x) => Math.min(...cards.filter((c) => Math.round(c.left) === x).map((c) => c.top)));
            return { aside: !!$('aside[aria-label="Your progress"]'), width: Math.round($('[data-lingo-dashboard]').getBoundingClientRect().width),
                columns: lefts.length, even: Math.round(Math.abs(bottom(lefts[0]) - bottom(lefts[1]))), tallest: Math.round(Math.max(...cards.map((c) => c.height))),
                topsLevel: Math.round(Math.abs(tops[0] - tops[1])), wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.aside, result.columns, result.topsLevel], [false, 2, 0], 'two columns, starting level');
        assert.ok(result.even <= 1, `the two columns end on one line (${result.even}px apart)`);
        assert.ok(result.width > 1000, `the full width (${result.width}px)`);
        assert.ok(result.wide <= 1);
    });

    test('Continue where you stopped: the path with its tabs, at that lesson, its START card open (2026-10-26)', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic?lesson=g1'), api: apiModule(SHELL_API), styles: true, script: `
            await sleep(1200);
            return { tabs: $$('nav[aria-label="Language Learning"] a').map((a) => a.dataset.tab), card: $('[data-lesson-card]')?.dataset.lessonCard || null };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual([result.tabs, result.card], [['Learn', 'Practice', 'Badges', 'Writing'], 'g1']);
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

    test('left halfway through Get started: coming back opens the same question, with the answers kept (2026-10-26)', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        const saved = JSON.stringify({ step: 5, course: 'en', from: 'kn', know: 3, aim: 'fluent' });
        const { result, errors } = await screen({ entry: `localStorage.setItem('lingo:start:me', ${JSON.stringify(saved)});\n${app('/linguistic')}`, api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), script: `
            await sleep(1200);
            const at = $('[data-onboarding]')?.dataset.onboarding;
            $('[data-lingo-session] button[aria-label="Back"]')?.click(); await sleep(300); $('[data-lingo-session] button[aria-label="Back"]')?.click(); await sleep(300);
            const aim = $('[data-aim="fluent"]')?.getAttribute('aria-pressed');
            return { at, aim, back: $('[data-onboarding]')?.dataset.onboarding, kept: JSON.parse(localStorage.getItem('lingo:start:me')).step };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.at, 'why', 'the question they stopped at, not Get started');
        assert.deepEqual([result.back, result.aim, result.kept], ['aim', 'true', 3], 'the earlier answer is still picked, and the place is kept');
    });

    test('starting a Kannada course (chosen in the dropdowns) as a Hindi speaker: every screen names Kannada; no placement test, the level said instead', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, language: { code: 'hi', name: 'Hindi', native: 'हिन्दी' }, languageChosen: true, course: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', full: false } };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const title = () => $('[data-onboarding] h1')?.textContent;
            const go = async (pick) => { if (pick) { $(pick).click(); await sleep(100); } btn().click(); await sleep(400); };
            const out = {};
            await go(); out.learning = $('[data-course="kn"]')?.getAttribute('aria-pressed'); await go();
            out.know = [title(), $('[data-know="0"]')?.textContent];
            await go('[data-know="3"]'); await go('[data-aim="basics"]');
            out.started = $('[data-onboarding] p')?.textContent; await go();
            out.why = title();
            await go('[data-reason="travel"]'); await go('[data-style="none"]');
            await go('[data-focus="speaking"]'); await go('[data-topic="travel"]'); await go('[data-age="25-34"]');
            out.translate = { picked: $('[data-language="hi"]')?.getAttribute('aria-pressed'), kannada: $('[data-language="kn"]')?.disabled };
            await go(); await go('[data-practice="30"]'); await go('[data-when="night"]');
            await go('[data-plan-days="30"]'); await go();
            out.start = { options: $$('[data-start]').map((b) => b.dataset.start), recommended: $('[data-recommended]')?.closest('[data-start]')?.dataset.start, scratch: text($('[data-start="scratch"]')) };
            $('[data-start="level"]').click(); await sleep(100);
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
        assert.match(result.started, /first Kannada words/);
        assert.deepEqual(result.translate, { picked: 'true', kannada: true }, 'Hindi, as chosen; not Kannada, which they learn');
        assert.deepEqual(result.start.options, ['scratch', 'level'], 'no Find my level: the placement test is English\'s');
        assert.equal(result.start.recommended, 'level');
        assert.match(result.start.scratch, /easiest lesson of the Kannada course/);
        assert.match(result.label, /start learning/i);
        assert.deepEqual(result.sent, [['/linguistic/about', { reason: 'travel', know: 3, focus: ['speaking'], topics: ['travel'], studyTime: 'night', aim: 'basics', style: 'none', ageBand: '25-34', practiceMinutes: 30 }], ['/linguistic/course', { course: 'kn', start: 'intermediate' }], ['/linguistic/plan', { days: 30 }]], 'the course at the level said; no /level (that is English\'s)');
        assert.equal(result.reloaded, true, 'the section opens');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('changing course from the chip: two dropdowns, I speak then I want to learn; a new course asks where to start', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule(SHELL_API, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            const pick = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
            const out = {
                selects: $$('[data-language-picker] select').map((s) => s.getAttribute('aria-label')),
                speak: $('[data-speak]').value, learn: $('[data-learn]').value,
                speakOptions: $$('[data-speak] option').length,
                learnOptions: $$('[data-learn] option').map((o) => o.value + (o.disabled ? ':off' : '')),
                saveOff: $('[data-picker-save]').disabled, wide: (() => { ${WIDE} })()
            };
            pick('[data-learn]', 'fr'); await sleep(150);
            out.start = $('[data-start-level]')?.value;
            out.hint = $('[data-learn]').closest('label').textContent;
            pick('[data-start-level]', 'intermediate'); await sleep(150);
            $('[data-picker-save]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.closed = !$('[data-language-picker]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.selects, ['I speak', 'I want to learn'], 'first the language they know, then the one to learn');
        assert.deepEqual([result.speak, result.learn], ['kn', 'en']);
        assert.equal(result.speakOptions, 6);
        assert.deepEqual(result.learnOptions, ['en', 'kn:off', 'hi', 'fr', 'ja'], 'not Kannada: they speak it');
        assert.equal(result.saveOff, true, 'nothing changed yet');
        assert.equal(result.start, 'beginner', 'a new course asks where to start');
        assert.match(result.hint, /taught in Kannada\. A new course/);
        assert.deepEqual(result.sent, [['/linguistic/course', { course: 'fr', start: 'intermediate' }]]);
        assert.equal(result.closed, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('swapping the two (speak Hindi, learn Kannada) goes through in an order the server takes', async () => {
        const dash = { ...DASH, course: { code: 'hi', name: 'Hindi', native: 'हिन्दी', full: false }, courses: DASH.courses.map((c) => (c.code === 'hi' ? { ...c, begun: true } : c)) };
        const { result, errors } = await screen({ entry: app('/linguistic/dashboard'), api: apiModule({ ...SHELL_API, '/linguistic/': dash }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            const pick = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
            pick('[data-speak]', 'hi'); await sleep(100);
            const clash = [$('[data-picker-save]').disabled, $('[data-learn]').closest('label').textContent];
            pick('[data-learn]', 'kn'); await sleep(100);
            $('[data-picker-save]').click(); await sleep(600);
            return { clash, sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.clash[0], true, 'speaking and learning Hindi cannot be saved');
        assert.match(result.clash[1], /You speak Hindi\. Choose another language to learn/);
        assert.deepEqual(result.sent, [['/linguistic/course', { course: 'en', start: null }], ['/linguistic/language', { language: 'hi' }], ['/linguistic/course', { course: 'kn', start: 'beginner' }]]);
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
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule(SHELL_API), styles: true, device: DEVICES.galaxyA55, script: `
            await sleep(1100);
            $('[data-tab="Practice"]').click(); await sleep(400);
            const practice = { quests: !!$('[data-practice-hub] [data-quests]'), daily: $('[data-daily]')?.getAttribute('href'), mistakes: $('[data-mistakes]')?.dataset.mistakes, placement: $('[data-placement-card]')?.dataset.placementCard, wide: (() => { ${WIDE} })() };
            $('[data-tab="Badges"]').click(); await sleep(500);
            const badges = { list: $$('[data-badge]').map((b) => b.dataset.badge + ':' + b.dataset.earned), levels: $$('[data-level]').length };
            $('[data-tab="Writing"]').click(); await sleep(500);
            return { practice, badges, writing: text($('[data-writing-page]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.practice, { quests: false, daily: '/linguistic/daily', mistakes: '4', placement: 'none', wide: 0 });
        assert.deepEqual(result.badges, { list: ['first_lesson:true', 'translator:false'], levels: 3 });
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

    test('a paragraph is checked in the lesson, each sentence corrected; nothing is sent to a teacher (2026-10-26)', async () => {
        const READING = {
            id: 'rd', module: 'reading', moduleLabel: 'Reading and Writing', level: 'beginner', title: 'My Morning', summary: '', direction: null, passingScore: 60,
            learn: { intro: 'A short story.' }, progress: { status: 'new', step: 'practice', bestScore: null, attempts: 0 },
            writing: [{ id: 'w4', type: 'paragraph', prompt: 'Write about your morning.', minWords: 5 }], quiz: [{ id: 'q1', type: 'mcq', prompt: 'When?', options: ['Six', 'Ten'] }]
        };
        const POST = `(url, body) => {
            if (url.includes('/writing/')) return { correct: null, checked: true, words: 9, total: 2, clean: 1, findings: [{ kind: 'good', text: 'Every sentence starts with a capital letter.' }],
                sentences: [{ text: 'I wake up at six.', corrected: 'I wake up at six.', mistakes: [] }, { text: 'He go to college.', corrected: 'He goes to college.', mistakes: [{ wrong: 'go', right: 'goes', why: 'With he, she or it, add -s.' }] }],
                submission: { id: 's1', status: 'checked' } };
            return { step: body.step };
        }`;
        const { result, errors } = await screen({ entry: app('/linguistic/reading/rd'), api: apiModule({ '/linguistic/lessons/rd': READING }, POST), styles: true, device: DEVICES.galaxyA55, script: `
            ${DRIVE}
            await sleep(1000);
            for (let i = 0; i < 8 && !$('[data-writing="w4"]'); i++) await press();
            typeIn('I wake up at six. He go to college.'); await sleep(60); await press(); await sleep(200);
            const S = $('[data-lingo-session]');
            return { at: !!$('[data-writing="w4"]'), tone: sheet(), title: text($('[data-sheet] h2, [data-sheet] p')), fixed: $$('[data-talk-sentence="fixed"]').map(text), ok: $$('[data-talk-sentence="ok"]').length,
                teacher: /teacher|ಶಿಕ್ಷಕ/i.test(S.innerText), model: /Model answer|ಮಾದರಿ ಉತ್ತರ/i.test(text($('[data-sheet]'))), sheetText: text($('[data-sheet]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.at, true);
        assert.equal(result.tone, 'info');
        // In the student's language (Kannada here): "Fix the marked words", "1 of 2 sentences with no mistakes".
        assert.match(result.sheetText, /^ಗುರುತಿಸಿದ ಪದಗಳನ್ನು ಸರಿಪಡಿಸಿ 2 ವಾಕ್ಯಗಳಲ್ಲಿ 1 ತಪ್ಪಿಲ್ಲದವು/);
        assert.equal(result.fixed.length, 1); assert.match(result.fixed[0], /He go to college/); assert.match(result.fixed[0], /He goes to college/); assert.match(result.fixed[0], /add -s/);
        assert.equal(result.ok, 1);
        assert.deepEqual([result.teacher, result.model], [false, false], 'nothing about a teacher, and no full model answer: the grammar is corrected here');
    });

    test('a lesson, one screen at a time: the tips, practice with the red and green sheets, a mistake asked again, the quiz, the result', async () => {
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
            const wrong = { tone: sheet(), answer: text($('[data-sheet-answer]')), why: /vowel sound/.test(text($('[data-sheet]'))) };
            await press();
            const again = !!$('[data-again]') && !!$('[data-question="p1"]');
            typeIn('an'); await sleep(60); await press(); await sleep(150);
            const right = sheet();
            await press();
            const intro = text($('[data-answer-area] h1'));
            await press();
            const blank = text($('[data-question="q1"] p'));
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('An')).click(); await sleep(60);
            const filled = text($('[data-question="q1"] p'));
            await press(); await sleep(150);
            const q1 = sheet();
            await press();
            for (const w of ['This', 'is', 'good']) { $$('[data-tiles] button').find((b) => b.innerText === w).click(); await sleep(40); }
            const placed = text($('[data-placed]'));
            const wide = (() => { ${SESSION_WIDE} })();
            await press(); await sleep(150);
            const q2 = sheet();
            await press(); await sleep(700);
            return { covers, learn, hearts, disabled, wrong, again, right, intro, blank, filled, q1, placed, q2, wide,
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
        assert.deepEqual(result.wrong, { tone: 'wrong', answer: 'an', why: true });
        assert.equal(result.again, true, 'the mistake comes back before the quiz');
        assert.equal(result.right, 'right');
        assert.equal(result.intro, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', '"Quiz time!" in Kannada, the student\'s language (2026-10-24)');
        assert.equal(result.blank, '… apple a day.'); assert.equal(result.filled, 'An apple a day.', 'the choice shows in the blank');
        assert.equal(result.q1, 'right'); assert.match(result.placed, /This\s*is\s*good/); assert.equal(result.q2, 'right');
        assert.equal(result.finish, 'pass'); assert.equal(result.title, 'Perfect lesson!');
        assert.deepEqual(result.stats.slice(0, 2), ['TOTAL XP 20', 'AMAZING 100%']); assert.match(result.stats[2], /^TIME \d+:\d\d$/);
        assert.deepEqual(result.steps, ['practice', 'quiz'], 'where the student is, saved for resuming');
        assert.deepEqual(result.checks, [{ id: 'q1', given: 'An' }, { id: 'q2', given: 'This is good' }]);
        assert.deepEqual(result.quiz, { answers: { q1: 'An', q2: 'This is good' } });
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('out of hearts: the quiz ends, only the answers given are sent; TRY AGAIN starts at the quiz', async () => {
        const reached = { ...GRAMMAR, progress: { status: 'started', step: 'quiz', bestScore: null, attempts: 1 } };
        const { result, errors } = await screen({ entry: app('/linguistic/grammar/g1'), api: apiModule({ '/linguistic/lessons/g1': reached }, GRAMMAR_POST), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            ${DRIVE}
            await sleep(1000);
            $('[data-skip-to-quiz]').click(); await sleep(250);
            const skipped = text($('[data-answer-area] h1'));
            await press();
            $$('[data-option]').find((b) => b.innerText.trim().endsWith('A')).click(); await sleep(60);
            await press(); await sleep(150);
            const hearts = $('[data-hearts]')?.dataset.hearts;
            await press(); await sleep(700);
            const out = { skipped, hearts, finish: $('[data-finish]')?.dataset.finish, title: text($('[data-finish-title]')), sent: window.__calls.find((c) => c[1].endsWith('/quiz'))?.[2] };
            $('[data-review-answers]').click(); await sleep(200);
            out.review = $$('[data-review-item]').map((li) => li.dataset.reviewItem);
            $('footer [data-primary]').click(); await sleep(400);
            out.retry = { title: text($('[data-answer-area] h1')), hearts: $('[data-hearts]')?.dataset.hearts };
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.skipped, 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'a student who reached the quiz before can skip to it');
        assert.equal(result.hearts, '0');
        assert.equal(result.finish, 'fail'); assert.equal(result.title, 'Out of hearts!');
        assert.deepEqual(result.sent, { answers: { q1: 'A' } }, 'the question not reached is not sent');
        assert.deepEqual(result.review, ['wrong', 'wrong']);
        assert.deepEqual(result.retry, { title: 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', hearts: '1' });
    });

    test('translation: word tiles, the keyboard with Kannada letters, and "almost" with the word-by-word difference', async () => {
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
            await press();
            $('[data-swap-input]').click(); await sleep(120);
            $$('[data-answer-area] button').find((b) => /kannada letters|ಕನ್ನಡ ಅಕ್ಷರಗಳು/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['ಸ', '್', 'ನ', 'ೇ', 'ಹ']) { $$('[data-kannada-keys] button').find((b) => b.getAttribute('aria-label') === 'Kannada ' + k).click(); await sleep(40); }
            const typed = $('[data-translation] textarea').value;
            await press(); await sleep(150);
            const s = $('[data-sheet]');
            return { bank, slot, first, typed, tone: s?.dataset.sheet, text: text(s), diff: $$('[data-sheet] [data-diff] span').map((x) => x.className.includes('line-through') ? 'extra' : x.className.includes('rounded') ? 'missing' : 'same'),
                sent: window.__calls.filter((c) => c[1].endsWith('/check')).map((c) => c[2]), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.bank, ['ಮನೆ', 'ಸ್ನೇಹಿತ', 'ನೀರು']);
        assert.equal(result.slot, true, 'a used tile leaves its slot');
        assert.equal(result.first, 'right');
        assert.equal(result.typed, 'ಸ್ನೇಹ');
        assert.deepEqual(result.sent, [{ section: 'items', id: 'i1', given: 'ಸ್ನೇಹಿತ' }, { section: 'items', id: 'i2', given: 'ಸ್ನೇಹ' }]);
        assert.equal(result.tone, 'wrong');
        assert.match(result.text, /ಬಹುತೇಕ ಸರಿ! ಸರಿಯಾದ ಉತ್ತರ:/, '"Almost there! Correct solution:" in Kannada'); assert.match(result.text, /ಸ್ನೇಹಿತ/); assert.match(result.text, /Friend is ಸ್ನೇಹಿತ/);
        assert.deepEqual(result.diff, ['extra', 'missing']);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('vocabulary: the flashcards, then matching pairs — a wrong pair is shaken off, all matched turns the sheet green', async () => {
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
            return { back, shaken, tone: sheet(), checks: window.__calls.filter((c) => c[1].endsWith('/check')).length, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.match(result.back, /ಮನೆ/); assert.match(result.back, /A house\./);
        assert.equal(result.shaken, true);
        assert.equal(result.tone, 'right');
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

    test('Japanese: "English → Japanese", Japanese tiles, and kana keys to type with', async () => {
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
            await press();
            $('[data-swap-input]').click(); await sleep(120);
            const label = $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText))?.innerText;
            $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['い', 'え']) { $$('[data-letter-keys="ja"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            return { shown, tiled, sent, label, typed: $('[data-translation] textarea').value, placeholder: $('[data-translation] textarea').placeholder, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.shown.title, 'この文を訳してください', 'the instruction in Japanese, the language they know (2026-10-24)'); assert.equal(result.shown.direction, 'English → Japanese');
        assert.deepEqual(result.shown.tiles, ['ございます', '水', 'おはよう']);
        assert.equal(result.tiled, 'right'); assert.deepEqual(result.sent, { section: 'items', id: 'i3', given: 'おはよう ございます' });
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
            await press(); await sleep(300);
            return { filled, tone, sent: window.__calls.find((c) => c[0] === 'POST')?.slice(1), title: text($('[data-finish-title]')), stats: $$('[data-stat]').map(text).slice(0, 1) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.filled, 'This is an easy question.', 'what is typed shows in the blank');
        assert.equal(result.tone, 'right');
        assert.deepEqual(result.sent, ['/linguistic/review/m1', { given: 'an' }]);
        assert.equal(result.title, 'All fixed!'); assert.deepEqual(result.stats, ['FIXED 1/1']);
    });
});
