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
 *   node scripts/makeIndicAudio.js --recheck          also delete and make again clips longer than their text
 *   node scripts/makeIndicAudio.js --stories          only the stories and story films (comics), each person's voice
 *   node scripts/makeIndicAudio.js --letters --courses ta   only the letters page of those courses (2026-11-17)
 */
require('dotenv').config();
// No time limit here (2026-11-12): the service finishes a clip even after a caller gives up, and it would be lost.
process.env.TTS_TIMEOUT_MS = '0';
const path = require('path');
const Module = require('module');
const mongoose = require('mongoose');

const STUDENT = path.join(__dirname, '..', '..', 'yaticorp-lms-student');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes('--dry');
const RECHECK = args.includes('--recheck');
const STORIES = args.includes('--stories');
const LETTERS = args.includes('--letters');
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
    // A clip's voice (2026-11-12): a story's men speak in a man's voice ('m'), all else the woman's.
    const add = ([text, lang, voice]) => {
        const c = store.clean(text, lang, voice);
        if (c.error) return;
        const k = store.keyOf(c);
        if (!seen.has(k)) { seen.add(k); clips.push(c); }
    };
    for (const course of courses) {
        // --letters: the letters page alone, the first thing a new learner taps (2026-11-17).
        if (LETTERS) { try { chartSpeech(alphabet.chartOf(course)).forEach(add); } catch { /* no letters page */ } console.log(`${course}: letters page`); continue; }
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
                    steps.filter((s) => !STORIES || s.kind === 'comic').forEach((s) => lessons.get(key).texts.push(...stepSpeech(s)));
                } catch (e) { console.warn(`  skipped ${course}/${helper} "${doc.title}": ${e.message}`); }
            }
        }
        // Lesson by lesson in course order (2026-11-13), the letters page after the first unit's lessons: a student's
        // first lessons are whole long before the later ones are begun.
        [...lessons.values()].sort((a, b) => byPath(a.doc, b.doc)).forEach((l, i) => {
            if (i === 5 && !STORIES) try { chartSpeech(alphabet.chartOf(course)).forEach(add); } catch { /* no letters page */ }
            l.texts.forEach(add);
        });
        if (lessons.size <= 5 && !STORIES) try { chartSpeech(alphabet.chartOf(course)).forEach(add); } catch { /* no letters page */ }
        console.log(`${course}: ${lessons.size} lessons`);
    }
    await mongoose.disconnect();

    // --recheck (2026-11-11): a clip longer than its text allows was made in a batch with a longer one and has
    // made-up speech after the word; it is deleted, to be made again by the fixed voice service.
    if (RECHECK) {
        const fs = require('fs');
        const capOf = (t) => { const n = [...t].length; return n <= 2 ? 0.8 : n <= 3 ? 1.4 : Math.min(30, 1.2 + 0.12 * n); }; // as the voice service's max_tokens
        let bad = 0;
        for (const c of clips) {
            // Only a clip kept as it is served now (store.js: tidied); one still to be tidied from its first recording is passed over.
            const f = store.fileOf(c); if (!fs.existsSync(f)) continue;
            const b = fs.readFileSync(f);
            const secs = (b.length - 44) / (b.readUInt16LE(34) / 8) / b.readUInt32LE(24);
            if (secs > capOf(c.text) + 0.1) { if (!DRY) fs.unlinkSync(f); bad++; }
        }
        console.log(`Recheck: ${bad} clip(s) too long${DRY ? '' : ', deleted'}.`);
    }
    // In course order (2026-11-13: shortest-first over the whole course left every lesson's long sentences to the very
    // end, so no lesson was ever complete); within each run of 16, shortest first, so a batch holds clips of a like length.
    const left = clips.filter((c) => !store.has(c)); const todo = [];
    for (let i = 0; i < left.length; i += 16) todo.push(...left.slice(i, i + 16).sort((a, b) => [...a.text].length - [...b.text].length));
    console.log(`Clips: ${clips.length} in all, ${clips.length - todo.length} already made, ${todo.length} to make.`);
    const per = {}; todo.forEach((c) => { per[c.lang] = (per[c.lang] || 0) + 1; });
    console.log(`To make, by language: ${Object.entries(per).map(([l, n]) => `${l} ${n}`).join(' · ')}`);
    if (DRY || !todo.length) return;

    let made = 0, failed = 0; const t0 = Date.now();
    let stop = false; process.on('SIGINT', () => { if (stop) process.exit(1); stop = true; console.log('\nStopping after this clip… (run again to carry on)'); });
    // Eight at once (2026-11-12): the voice service makes up to eight in one batch, far faster than one by one.
    let next = 0;
    const worker = async () => {
        while (!stop && next < todo.length) {
            const clip = todo[next++];
            try { await store.make(clip, { background: true }); made++; } catch (e) { failed++; console.warn(`  failed [${clip.lang}] "${clip.text.slice(0, 40)}": ${e.response?.status || e.code || e.message}`); }
            const done = made + failed, per = (Date.now() - t0) / done;
            console.log(`[${done}/${todo.length}] ${clip.lang}${clip.voice === 'm' ? ' (m)' : ''} "${clip.text.slice(0, 40)}"  · about ${mins(per * (todo.length - done))} left`);
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    console.log(`Done: ${made} made, ${failed} failed, in ${mins(Date.now() - t0)}.`);
})().catch((e) => { console.error(e); process.exit(1); });
