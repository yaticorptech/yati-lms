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
    courses: [{ code: 'en', name: 'English', native: 'English', full: true, begun: true }, ...[['kn', 'Kannada', 'ಕನ್ನಡ'], ['hi', 'Hindi', 'हिन्दी'], ['fr', 'French', 'Français'], ['ja', 'Japanese', '日本語']].map(([code, name, native]) => ({ code, name, native, full: false, begun: false }))]
};
const lesson = (id, title, more = {}) => ({ id, title, summary: `About ${title}`, order: 1, direction: null, open: true, status: 'new', bestScore: null, attempts: 0, ...more });
const PATH = {
    level: 'beginner', levelLabel: 'Beginner', placement: null, current: 'v2', certificateMinAverage: 70,
    levels: [
        { level: 'beginner', label: 'Beginner', passingScore: 60, open: true, total: 4, completed: 2, complete: false, certificate: null, units: [
            { module: 'vocabulary', label: 'Vocabulary Builder', open: true, lessons: [lesson('v1', 'Home and family', { status: 'completed', bestScore: 100 }), lesson('v2', 'Food and drink')] },
            { module: 'grammar', label: 'Grammar Practice', open: true, lessons: [lesson('g1', 'Articles', { status: 'completed', bestScore: 80 }), lesson('g2', 'Pronouns', { open: false })] }] },
        { level: 'intermediate', label: 'Intermediate', passingScore: 70, open: false, total: 1, completed: 0, complete: false, certificate: null, units: [
            { module: 'translation', label: 'Translation Practice', open: false, lessons: [lesson('t1', 'Sentences', { open: false, direction: 'kn-en' })] }] }
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
const SHELL_API = { '/linguistic/path': PATH, '/linguistic/lessons/v2': V2, '/linguistic/history': { attempts: [] }, '/linguistic/submissions': { submissions: [] }, '/linguistic/': DASH };

describe('Linguistic Ability', { skip: skipWithoutStyles }, () => {
    for (const [name, size] of [['phone', { device: DEVICES.galaxyZFold6Folded }], ['laptop', { width: 1366, height: 900 }]]) {
        test(`the path on a ${name}: tabs, sections, units, lessons done / next / locked, the trophy — inside the screen`, async () => {
            const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule(SHELL_API), styles: true, ...size, script: `
                await sleep(1300);
                const nodes = Object.fromEntries($$('[data-node]').map((b) => [b.dataset.node, b.dataset.status]));
                const out = { wide: (() => { ${WIDE} })(), tabs: $$('[data-tab]').map((t) => t.dataset.tab), sections: $$('[data-section]').map((s) => s.dataset.section), nodes,
                    crown: !!$('[data-node="v1"] .lucide-crown'), bubble: $('[data-start-bubble]')?.closest('div').querySelector('[data-node]')?.dataset.node,
                    jump: $$('[data-jump]').map((a) => a.dataset.jump), trophies: $$('[data-trophy]').length, mascots: $$('[data-unit] img[src^="/mascot/stills/"]').length,
                    rail: getComputedStyle($('aside[aria-label="Your progress"]')).display !== 'none', xp: $('[data-xp]')?.dataset.xp, streak: $('[data-streak]')?.dataset.streak,
                    quests: $$('aside [data-quest]').map((q) => q.dataset.done || 'open') };
                $('[data-node="v2"]').click(); await sleep(300);
                out.card = text($('[data-lesson-card="v2"]'));
                $('[data-node="g2"]').click(); await sleep(300);
                out.locked = text($('[data-lesson-card="g2"]'));
                $('[data-guidebook-open="grammar"]').click(); await sleep(300);
                out.guide = $$('[data-guidebook="grammar"] li').map(text);
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
            assert.equal(result.rail, name === 'laptop', 'the side panel on a wide screen only');
            assert.equal(result.xp, '340'); assert.equal(result.streak, '3');
            if (name === 'laptop') assert.deepEqual(result.quests, ['true', 'false', 'open']);
            assert.match(result.card, /Food and drink/); assert.match(result.card, /Lesson 2 of 2/); assert.match(result.card, /start/i);
            assert.match(result.locked, /Finish the lessons above to unlock this one/);
            assert.equal(result.guide.length, 2); assert.match(result.guide[0], /Articles/); assert.match(result.guide[0], /best 80%/i);
            assert.equal(result.session, true, 'START opens the lesson, full screen');
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });
    }

    test('starting out, Duolingo\'s way: from, to, why, how much, the goal, then where to start — each screen waits for an answer', async () => {
        const fresh = { ...DASH, started: false, goalSet: false };
        const post = `(url, body) => ({ ok: true, level: body.level, placement: { level: body.level, chosen: true } })`;
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const at = () => $('[data-onboarding]')?.dataset.onboarding;
            const out = { tabs: $$('[data-tab]').length, steps: [] };
            const stepIs = async (name, pick) => {
                out.steps.push([at(), btn().disabled]);
                btn().click(); await sleep(150);
                const stayed = at() === name;
                $(pick).click(); await sleep(120);
                out.steps.push([at(), btn().disabled, stayed]);
                if (name === 'to') out.courses = { list: $$('[data-course]').map((b) => b.dataset.course + (b.disabled ? ':off' : '')), fr: text($('[data-course="fr"]')), en: text($('[data-course="en"]')) };
                if (name === 'start') out.recommended = $('[data-recommended]')?.closest('[data-start]')?.dataset.start;
                btn().click(); await sleep(450);
            };
            await stepIs('from', '[data-language="ja"]');
            await stepIs('to', '[data-course="en"]');
            await stepIs('why', '[data-reason="career"]');
            await stepIs('know', '[data-know="0"]');
            await stepIs('goal', '[data-goal="20"]');
            await stepIs('start', '[data-start="scratch"]');
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.tabs, 0, 'the section waits behind the start screens');
        assert.deepEqual(result.steps, ['from', 'to', 'why', 'know', 'goal', 'start'].flatMap((n) => [[n, true], [n, false, true]]), 'CONTINUE is grey, and does nothing, until an answer is chosen');
        assert.deepEqual(result.courses.list, ['en', 'kn', 'hi', 'fr'], 'every course can be chosen; not Japanese, which they speak');
        assert.match(result.courses.fr, /Words and sentences, taught in Japanese/);
        assert.match(result.courses.en, /English for Japanese speakers/);
        assert.equal(result.recommended, 'scratch', 'new to English: start from scratch is recommended');
        assert.deepEqual(result.sent, [['/linguistic/about', { reason: 'career', know: 0 }], ['/linguistic/goal', { xp: 20 }], ['/linguistic/language', { language: 'ja' }], ['/linguistic/course', { course: 'en', start: null }], ['/linguistic/level', { level: 'beginner' }]]);
    });

    test('starting out knowing some English: Find my level is recommended, and opens the test; or start at the level said', async () => {
        const fresh = { ...DASH, started: false, goalSet: false, languageChosen: true };
        const PL = { last: null, questions: [{ id: 'pl1', band: 'beginner', type: 'mcq', prompt: 'She ___ a doctor.', options: ['is', 'are'] }] };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ '/linguistic/placement': PL, ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const go = async (pick) => { $(pick).click(); await sleep(100); btn().click(); await sleep(400); };
            const preset = $('[data-language="kn"]')?.getAttribute('aria-pressed');
            btn().click(); await sleep(400);
            await go('[data-course="en"]'); await go('[data-reason="school"]'); await go('[data-know="3"]'); await go('[data-goal="10"]');
            const recommended = $('[data-recommended]')?.closest('[data-start]')?.dataset.start;
            const atLevel = text($('button[data-start="level"]'));
            $('[data-start="find"]').click(); await sleep(100);
            const label = btn().innerText.trim();
            btn().click(); await sleep(700);
            return { preset, recommended, atLevel, label, test: /find your English level/i.test($('[data-lingo-session] [data-answer-area] h1')?.innerText || ''), sent: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.preset, 'true', 'a language already chosen is kept');
        assert.equal(result.recommended, 'find');
        assert.match(result.atLevel, /start at Intermediate, the level you told us/);
        assert.match(result.label, /start the test/i);
        assert.deepEqual(result.sent, ['/linguistic/about', '/linguistic/goal', '/linguistic/course'], 'no level chosen: the test will find it');
        assert.equal(result.test, true, 'the placement test opens');
    });

    test('starting a Kannada course as a Hindi speaker: every screen names Kannada; no placement test, the level said instead', async () => {
        const fresh = { ...DASH, started: false, goalSet: false };
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule({ ...SHELL_API, '/linguistic/': fresh }, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            const btn = () => $('[data-lingo-session] [data-primary]');
            const title = () => $('[data-onboarding] h1')?.textContent;
            const go = async (pick) => { $(pick).click(); await sleep(100); btn().click(); await sleep(400); };
            const out = {};
            await go('[data-language="hi"]');
            out.hindiOffered = !!$('[data-course="hi"]');
            await go('[data-course="kn"]');
            out.why = title();
            await go('[data-reason="travel"]');
            out.know = [title(), $('[data-know="0"]')?.textContent];
            await go('[data-know="3"]');
            await go('[data-goal="10"]');
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
        assert.equal(result.hindiOffered, false, 'not the language they speak');
        assert.equal(result.why, 'Why are you learning Kannada?');
        assert.deepEqual(result.know, ['How much Kannada do you know?', 'I am new to Kannada']);
        assert.deepEqual(result.start.options, ['scratch', 'level'], 'no Find my level: the placement test is English\'s');
        assert.equal(result.start.recommended, 'level');
        assert.match(result.start.scratch, /easiest lesson of the Kannada course/);
        assert.match(result.label, /start learning/i);
        assert.deepEqual(result.sent, [['/linguistic/about', { reason: 'travel', know: 3 }], ['/linguistic/goal', { xp: 10 }], ['/linguistic/language', { language: 'hi' }], ['/linguistic/course', { course: 'kn', start: 'intermediate' }]], 'the course at the level said; no /level (that is English\'s)');
        assert.equal(result.reloaded, true, 'the section opens');
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('changing course from the chip: courses and "I speak" in one sheet; a new course asks where to start', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic'), api: apiModule(SHELL_API, '(url, body) => ({ ok: true })'), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            await sleep(1200);
            $('[data-course-chip]').click(); await sleep(300);
            const out = { mode: $('[data-language-picker]')?.dataset.languagePicker, groups: $$('[data-language-group]').map((g) => g.dataset.languageGroup),
                courses: $$('[data-language-picker] [data-course]').map((b) => b.dataset.course + (b.disabled ? ':off' : '')), current: $('[data-course][aria-pressed="true"]')?.dataset.course,
                wide: (() => { ${WIDE} })() };
            $('[data-picker-tab="speak"]').click(); await sleep(200);
            out.speak = $$('[data-language-picker] [data-language]').map((b) => b.dataset.language).length;
            $('[data-picker-tab="learn"]').click(); await sleep(200);
            $('[data-language-picker] [data-course="fr"]').click(); await sleep(200);
            out.ask = [$('[data-course-start]')?.dataset.courseStart, $('#lingo-lang')?.textContent, $$('[data-start-level]').map((b) => b.dataset.startLevel)];
            $('[data-start-level="intermediate"]').click(); await sleep(500);
            out.sent = window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]);
            out.closed = !$('[data-language-picker]');
            return out;` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.mode, 'learn');
        assert.deepEqual(result.groups, ['english', 'india', 'world']);
        assert.deepEqual(result.courses, ['en', 'kn:off', 'hi', 'fr', 'ja'], 'Kannada is the language they speak');
        assert.equal(result.current, 'en');
        assert.equal(result.speak, 6, '"I speak" lists the languages');
        assert.deepEqual(result.ask, ['fr', 'Where do you want to start in French?', ['beginner', 'intermediate', 'advanced']]);
        assert.deepEqual(result.sent, [['/linguistic/course', { course: 'fr', start: 'intermediate' }]]);
        assert.equal(result.closed, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
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
        assert.equal(w.result.title, 'Write this in Kannada');
        assert.equal(w.result.direction, 'Hindi → Kannada');
        assert.equal(w.result.box, 'kn');
        assert.match(w.result.placeholder, /ಕನ್ನಡ/);
        assert.equal(w.result.letters, true);
        assert.equal(w.result.keys, true, 'Kannada letters to type with');
        assert.ok(w.result.wide <= 1, `nothing wider than the phone (${w.result.wide}px)`);
    });

    test('the tabs: Practice (quests, daily, mistakes, placement), Badges, Writing', async () => {
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
        assert.deepEqual(result.practice, { quests: true, daily: '/linguistic/daily', mistakes: '4', placement: 'none', wide: 0 });
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
        assert.equal(result.intro, 'Quiz time!');
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
        assert.equal(result.skipped, 'Quiz time!', 'a student who reached the quiz before can skip to it');
        assert.equal(result.hearts, '0');
        assert.equal(result.finish, 'fail'); assert.equal(result.title, 'Out of hearts!');
        assert.deepEqual(result.sent, { answers: { q1: 'A' } }, 'the question not reached is not sent');
        assert.deepEqual(result.review, ['wrong', 'wrong']);
        assert.deepEqual(result.retry, { title: 'Quiz time!', hearts: '1' });
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
            $$('[data-answer-area] button').find((b) => /use keyboard/i.test(b.innerText)).click(); await sleep(120);
            $$('[data-answer-area] button').find((b) => /kannada letters/i.test(b.innerText)).click(); await sleep(120);
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
        assert.match(result.text, /Almost there! Correct solution:/); assert.match(result.text, /ಸ್ನೇಹಿತ/); assert.match(result.text, /Friend is ಸ್ನೇಹಿತ/);
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
        const { result, errors } = await screen({ entry: app('/linguistic', 'ja-JP'), api: apiModule(SHELL_API, post), styles: true, device: DEVICES.galaxyZFold6Folded, script: `
            localStorage.removeItem('lingo:language-asked');
            await sleep(1300);
            const picker = $('[data-language-picker]');
            const offered = { open: !!picker, first: $$('[data-language]').map((b) => b.dataset.language)[0], note: !!$('[data-language-group="device"] [data-language="ja"]'), groups: $$('[data-language-group]').map((g) => g.dataset.languageGroup), current: $('[data-language][aria-pressed="true"]')?.dataset.language };
            $('[data-language="ja"]').click(); await sleep(500);
            const sent = window.__calls.find((c) => c[1] === '/linguistic/language')?.[2];
            const closed = !$('[data-language-picker]'), asked = localStorage.getItem('lingo:language-asked');
            $('[data-language-chip]').click(); await sleep(300);
            return { offered, sent, closed, asked, chip: !!$('[data-language-picker]'), wide: (() => { ${WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.offered, { open: true, first: 'ja', note: true, groups: ['device', 'india', 'world'], current: 'kn' });
        assert.deepEqual(result.sent, { language: 'ja' });
        assert.equal(result.closed, true); assert.equal(result.asked, '1', 'not offered again');
        assert.equal(result.chip, true);
        assert.ok(result.wide <= 1, `nothing wider than the phone (${result.wide}px)`);
    });

    test('a device in English (or Kannada) is not asked: Kannada stays, as before', async () => {
        const { result, errors } = await screen({ entry: app('/linguistic', 'en-IN'), api: apiModule(SHELL_API), styles: true, script: `
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
            $$('[data-answer-area] button').find((b) => /use keyboard/i.test(b.innerText)).click(); await sleep(120);
            const label = $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText))?.innerText;
            $$('[data-answer-area] button').find((b) => /japanese letters/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['い', 'え']) { $$('[data-letter-keys="ja"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            return { shown, tiled, sent, label, typed: $('[data-translation] textarea').value, placeholder: $('[data-translation] textarea').placeholder, wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.equal(result.shown.title, 'Write this in Japanese'); assert.equal(result.shown.direction, 'English → Japanese');
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
            $$('[data-answer-area] button').find((b) => /use keyboard/i.test(b.innerText)).click(); await sleep(120);
            $$('[data-answer-area] button').find((b) => /urdu letters/i.test(b.innerText)).click(); await sleep(120);
            for (const k of ['گ', 'ھ', 'ر']) { $$('[data-letter-keys="ur"] button').find((b) => b.getAttribute('aria-label') === 'Letter ' + k).click(); await sleep(40); }
            const box = $('[data-translation] textarea');
            return { tiles, box: [box.value, box.getAttribute('dir'), box.placeholder], title: text($('[data-answer-area] h1')), wide: (() => { ${SESSION_WIDE} })() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.__error, undefined, result.__error);
        assert.deepEqual(result.tiles, { dir: 'rtl', placedDir: 'rtl', order: true });
        assert.deepEqual(result.box, ['گھر', 'rtl', 'اردو میں لکھیں…']);
        assert.equal(result.title, 'Write this in Urdu');
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
        assert.equal(result.title, 'Write this in Korean');
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
