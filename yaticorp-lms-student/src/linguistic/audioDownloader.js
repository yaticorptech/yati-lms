/**
 * The course's audio, downloaded by itself in the background (2026-11-13, "even when I am on any page or watching
 * courses it must be downloading, every day, without pressing Download; once finished the user must be notified").
 *
 * From any page of the app (BackgroundAudio.jsx, in the layout): every unit of the student's course they can open —
 * the next one first — has its audio made and kept on the device, a unit at a time, as the lesson's own download
 * screen does (audioPacks.js, meta.js downloadClips), so that screen no longer appears for those units. Units already
 * on the device are passed over; once a day every unit is gone over again, for new and changed lessons. Locked units
 * are left for later: the server does not give out a locked lesson, and they are picked up once open.
 *
 * Listeners (onBackgroundAudio) hear { kind: 'progress', done, total } and, when a run has downloaded something
 * and every open unit is now on the device, { kind: 'done', units }.
 */
import { linguisticApi } from './api';
import { aiVoiceOn, downloadClips } from './meta';
import { chartPack, lettersPackId, markPack, needsPack, speechOf } from './audioPacks';

const DAY = 'lingo-bg-audio-day';
const rest = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };

const listeners = new Set();
export const onBackgroundAudio = (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch { /* a listener's own problem */ } });

let running = null;
// The lesson the student opened last: its unit downloads first, from the lesson after it (LessonPage).
let focus = null;
export const focusLesson = (id) => { if (id) focus = String(id); };
const signal = { stopped: false };
/** Stops the run under way (the student signed out). */
export const stopBackgroundAudio = () => { signal.stopped = true; };

/** Starts a run unless one is under way. Resolves when it ends. */
// Asked while a run is under way (a lesson opened, or just finished): one more run follows it, with the course as it
// is then — so a unit that has just opened, and the new current lesson, are picked up straight away.
let again = false;
export const startBackgroundAudio = () => {
    if (running) { again = true; return running; }
    signal.stopped = false;
    running = run().catch(() => {}).finally(() => {
        running = null;
        if (again && !signal.stopped) { again = false; startBackgroundAudio(); }
    });
    return running;
};

/** The first lesson of every unit the student can open, the unit they are on first. */
const unitsOf = (path) => {
    // Each with its section and title, for the note that says what came down (2026-11-13).
    const all = (path?.levels || []).flatMap((l, li) => (l.units || []).map((u, ui) => ({ ...u, section: l.label || `Section ${li + 1}`, number: ui + 1 })))
        .map((u) => {
            const real = (u.lessons || []).filter((x) => !x.stop);
            const open = real.find((x) => x.open);
            return { first: open || real[0], ahead: !open, ids: real.map((x) => x.id), section: u.section, title: u.title || `Unit ${u.number}`, number: u.number };
        })
        .filter((u) => u.first);
    // Every unit the student can open, and the next one that is still locked (2026-11-13: "when the next unit unlocks
    // it must already be downloaded"). Its lessons stay locked; only their audio comes ahead. After each lesson a new
    // run moves this one unit further, so a new student does not fetch the whole course at once.
    const nextLocked = all.findIndex((u) => u.ahead);
    // In the course's own order (2026-11-13, "from section 1 unit 1, letters, then the next unit").
    return all.filter((u, i) => !u.ahead || i === nextLocked);
};

async function run() {
    if (!aiVoiceOn()) return;
    let path;
    try { path = await linguisticApi.path(); } catch { return; } // not learning a language: nothing to download
    const today = new Date().toISOString().slice(0, 10);
    const daily = read(DAY) !== today;          // once a day, every unit again: new and changed lessons
    const units = unitsOf(path);
    let fresh = 0, failed = 0, done = 0;
    const got = [];           // what came down this run: { section, unit }
    const total = units.length + 1;
    const step = () => { done += 1; emit({ kind: 'progress', done, total }); };

    // The letters page first: small, and the first thing a new student opens.
    const code = path?.course?.code;
    // The letters and their whole table (the letters page waits only for the letters; the table has its own mark).
    const tableId = code ? `${lettersPackId(code)}-table` : null;
    if (code && (daily || needsPack(lettersPackId(code)) || needsPack(tableId))) {
        try {
            const chart = await linguisticApi.letters();
            const pack = chartPack(chart);
            const was = needsPack(tableId);
            const out = await downloadClips(await speechOf(pack), { signal, background: true });
            if (signal.stopped) return;
            if (out.failed) failed += 1; else if (!out.skipped) { markPack(pack.key, [...pack.lessonIds, tableId]); if (was) { fresh += 1; got.push({ section: path?.levels?.[0]?.label || 'Section 1', unit: 'Letters' }); } }
        } catch { /* a course without a letters page */ }
    }
    step();

    // Two lanes at once (2026-11-13, "both: lesson by lesson, and from the start"):
    //  · next  — the unit the student is working in, from the lesson after the one they opened (focusLesson), so
    //            the next lesson is ready when they finish this one;
    //  · start — every other unit they can open, in the course's order from the first.
    // Each lesson is marked ready the moment its own voices are down. Locked units are not given out by the server,
    // so a normal student gets exactly what they can reach; a run after each lesson picks up what has just opened.
    const doUnit = async (unit, from = null) => {
        if (signal.stopped) return;
        const was = unit.ids.some((id) => needsPack(id));
        if (!daily && !was) { step(); return; }
        try {
            const pack = await linguisticApi.lessonPack(unit.first.id, unit.ahead);
            const lessons = pack.lessons || [];
            const i = from ? lessons.findIndex((l) => String(l.id) === String(from)) : -1;
            const ordered = i >= 0 ? [...lessons.slice(i + 1), ...lessons.slice(0, i + 1)] : lessons;
            let unitFailed = false;
            for (const lesson of ordered) {
                if (signal.stopped) return;
                if (!daily && !needsPack(lesson.id)) continue;
                const out = await downloadClips(await speechOf({ ...pack, lessons: [lesson] }), { signal, background: true });
                if (signal.stopped) return;
                if (out.failed) { unitFailed = true; continue; }
                markPack(pack.key, [String(lesson.id)]);
            }
            if (unitFailed) failed += 1;
            else {
                markPack(pack.key, pack.lessonIds);
                if (was) { fresh += 1; got.push({ section: unit.section, unit: `Unit ${unit.number}: ${unit.title}` }); }
            }
            await rest(800);   // a breath between units, so the page stays smooth
        } catch { failed += 1; }
        step();
    };
    const current = focus ? units.find((u) => u.ids.includes(String(focus))) : null;
    const rest_ = units.filter((u) => u !== current);
    await Promise.all([
        current ? doUnit(current, focus) : Promise.resolve(),
        (async () => { for (const u of rest_) { if (signal.stopped) return; await doUnit(u); } })()
    ]);
    if (signal.stopped) return;
    // A day counts as checked only when everything came down; else the next run tries again.
    if (!failed) write(DAY, today);
    if (fresh && !failed) emit({ kind: 'done', units: fresh, got });
}

/*
 * One unit's download, kept going when its screen closes (2026-11-13, "even if the user clicks Back, when they come
 * back it must still be downloading — it should not stop"). AudioPack.jsx starts it and shows its progress; leaving,
 * Back or "Start now" only stop the showing. Coming back to the unit finds the same download, where it had got to.
 * Keyed by the lesson (or the letters page) it was started from.
 */
const packJobs = new Map();
/** { state, listen(fn) → unlisten }. state: { phase: preparing | downloading | failed | done, done, total, title }. */
export const packJob = (id, makePack, only = null) => {
    const old = packJobs.get(id);
    if (old && old.state.phase !== 'failed') return old;
    const fans = new Set();
    const job = { state: { phase: 'preparing' }, listen: (fn) => { fans.add(fn); fn(job.state); return () => { fans.delete(fn); }; } };
    const set = (s) => { job.state = { ...job.state, ...s }; fans.forEach((fn) => fn(job.state)); };
    packJobs.set(id, job);
    (async () => {
        try {
            const whole = await makePack();
            // `only` (2026-11-13, "show only that part's bar"): just the lesson the student pressed Start on; the rest
            // of its unit comes down in the background afterwards (startBackgroundAudio).
            const mine = only ? (whole.lessons || []).filter((l) => String(l.id) === String(only)) : null;
            const pack = mine && mine.length ? { ...whole, lessons: mine, lessonIds: [String(only)] } : whole;
            set({ title: mine && mine.length ? mine[0].title || whole.title : whole.title });
            const items = await speechOf(pack);
            set({ phase: 'downloading', done: 0, total: items.length });
            // Quiet retries (2026-11-13): a clip still being made on a busy voice service is asked for again — up to
            // three rounds, the bar moving on — before the screen says anything went wrong.
            let out = await downloadClips(items, { onProgress: (done, total) => set({ phase: 'downloading', done, total }) });
            for (let round = 0; out.failed && round < 3; round += 1) {
                await rest(4000);
                out = await downloadClips(items, { onProgress: (done, total) => set({ phase: 'downloading', done, total }) });
            }
            if (out.failed) { set({ phase: 'failed', failed: out.failed, total: out.total, message: null }); return; }
            markPack(pack.key, pack.lessonIds);
            set({ phase: 'done' });
            setTimeout(() => startBackgroundAudio(), 0);   // the rest (the unit, the letters table) follows behind
        } catch (e) {
            set({ phase: 'failed', message: e.message });
        } finally {
            if (job.state.phase === 'done') packJobs.delete(id);
        }
    })();
    return job;
};
