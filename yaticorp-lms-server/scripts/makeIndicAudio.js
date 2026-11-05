/**
 * Makes every Linguistic lesson's audio in advance with AI4Bharat's Indic
 * Parler-TTS, so no student ever waits for a clip (2026-11-05: on a computer
 * without a GPU a clip takes about a minute to make).
 *
 * It goes through every course, every student language and every published
 * lesson, builds each lesson's screens exactly as the student app does (its
 * own session/logic.js and speechText.js, bundled here with esbuild), and
 * makes each text the app can read aloud, plus every course's letters page.
 * Clips already made are skipped, so it can be stopped (Ctrl+C) and run again
 * to carry on, and re-run after content changes to make only the new ones.
 *
 * Needs the voice service running (yaticorp-lms-tts) and INDIC_TTS_URL in .env.
 *
 *   node scripts/makeIndicAudio.js                    every course
 *   node scripts/makeIndicAudio.js --courses kn,ml    those courses first, then nothing else
 *   node scripts/makeIndicAudio.js --dry              only count what is left to make
 */
require('dotenv').config();
const path = require('path');
const Module = require('module');
const mongoose = require('mongoose');

const STUDENT = path.join(__dirname, '..', '..', 'yaticorp-lms-student');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes('--dry');
const ONLY = (opt('--courses') || '').split(',').map((c) => c.trim()).filter(Boolean);

/** The student app's own lesson builder and speech list, as CommonJS. */
const loadAppLogic = async () => {
    const esbuild = require(path.join(STUDENT, 'node_modules', 'esbuild'));
    const src = path.join(STUDENT, 'src', 'linguistic');
    const out = await esbuild.build({
        stdin: {
            contents: `export { buildLesson } from ${JSON.stringify(path.join(src, 'session', 'logic.js'))};
                       export { stepSpeech, chartSpeech } from ${JSON.stringify(path.join(src, 'speechText.js'))};`,
            resolveDir: src, loader: 'js'
        },
        bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'error',
        // say.js takes only PRAISE from meta.js (which brings React and the API client): a stand-in.
        plugins: [{ name: 'meta-stub', setup(b) {
            b.onResolve({ filter: /^\.\/meta$/ }, () => ({ path: 'meta-stub', namespace: 'stub' }));
            b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const PRAISE = ["Well done!"];', loader: 'js' }));
        } }]
    });
    const m = new Module('app-logic'); m.paths = Module._nodeModulePaths(STUDENT);
    m._compile(out.outputFiles[0].text, path.join(src, 'app-logic.js'));
    return m.exports;
};

const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];
const MODULE_ORDER = ['vocabulary', 'grammar', 'reading', 'speaking', 'translation'];
const byPath = (a, b) => (LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)) || ((a.order || 0) - (b.order || 0)) || (MODULE_ORDER.indexOf(a.module) - MODULE_ORDER.indexOf(b.module));
const mins = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

(async () => {
    const store = require('../src/tts/store');
    if (!DRY && !store.URL_BASE()) { console.error('INDIC_TTS_URL is not set in .env: start yaticorp-lms-tts and set it.'); process.exit(1); }
    const { buildLesson, stepSpeech, chartSpeech } = await loadAppLogic();
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const svc = require('../src/linguistic/service');
    const { courseCodes } = require('../src/linguistic/courses');
    const { CODES } = require('../src/linguistic/languages');
    const alphabet = require('../src/linguistic/alphabet');
    const { getConfig } = require('../src/linguistic/config');
    const config = await getConfig();

    const courses = ONLY.length ? ONLY.filter((c) => courseCodes().includes(c)) : courseCodes();
    if (!courses.length) { console.error(`No such course. Courses: ${courseCodes().join(', ')}`); process.exit(1); }
    const helpers = ['en', ...CODES.filter((c) => c !== 'en')];

    // Every clip, in the order students meet them: course by course, the letters page, then lesson by lesson.
    const seen = new Set(); const clips = [];
    const add = ([text, lang]) => {
        const c = store.clean(text, lang);
        if (c.error) return;
        const k = store.keyOf(c);
        if (!seen.has(k)) { seen.add(k); clips.push(c); }
    };
    for (const course of courses) {
        try { chartSpeech(alphabet.chartOf(course)).forEach(add); } catch { /* a course without a letters page */ }
        const lessons = new Map();
        for (const helper of helpers) {
            const progress = { course, language: helper };
            for (const doc of (await svc.lessonsFor(progress)).sort(byPath)) {
                try {
                    const served = svc.serve(doc, progress);
                    if (!served) continue;
                    const steps = buildLesson(svc.publicLesson(served, null, config));
                    const key = String(doc._id);
                    if (!lessons.has(key)) lessons.set(key, { doc, texts: [] });
                    steps.forEach((s) => lessons.get(key).texts.push(...stepSpeech(s)));
                } catch (e) { console.warn(`  skipped ${course}/${helper} "${doc.title}": ${e.message}`); }
            }
        }
        [...lessons.values()].sort((a, b) => byPath(a.doc, b.doc)).forEach((l) => l.texts.forEach(add));
        console.log(`${course}: ${lessons.size} lessons`);
    }
    await mongoose.disconnect();

    const todo = clips.filter((c) => !store.has(c));
    console.log(`Clips: ${clips.length} in all, ${clips.length - todo.length} already made, ${todo.length} to make.`);
    const per = {}; todo.forEach((c) => { per[c.lang] = (per[c.lang] || 0) + 1; });
    console.log(`To make, by language: ${Object.entries(per).map(([l, n]) => `${l} ${n}`).join(' · ')}`);
    if (DRY || !todo.length) return;

    let made = 0, failed = 0; const t0 = Date.now();
    let stop = false; process.on('SIGINT', () => { if (stop) process.exit(1); stop = true; console.log('\nStopping after this clip… (run again to carry on)'); });
    for (const clip of todo) {
        if (stop) break;
        try { await store.make(clip); made++; } catch (e) { failed++; console.warn(`  failed [${clip.lang}] "${clip.text.slice(0, 40)}": ${e.response?.status || e.code || e.message}`); }
        const done = made + failed, per = (Date.now() - t0) / done;
        console.log(`[${done}/${todo.length}] ${clip.lang} "${clip.text.slice(0, 40)}"  · about ${mins(per * (todo.length - done))} left`);
    }
    console.log(`Done: ${made} made, ${failed} failed, in ${mins(Date.now() - t0)}.`);
})().catch((e) => { console.error(e); process.exit(1); });
