/**
 * Where a student left off: the playback position of each lesson's video and
 * the lesson that was open in each course.
 *
 * Both live in localStorage. It is the browser that reloads the page when a
 * phone locks its screen or switches apps, so the browser is where the answer
 * has to survive that. The server keeps a copy too, so a laptop can pick up
 * where a phone stopped; every entry carries the time it was written so the
 * two copies can be compared and the later one used.
 *
 * Every read and write is best-effort: a private window or blocked storage
 * just means the video starts from the beginning, as it always used to.
 *
 * Every function takes an optional storage object so the logic can be tested
 * in Node, where there is no localStorage.
 */
const POSITION_PREFIX = 'yati:video-pos:';
const ACTIVE_LESSON_PREFIX = 'yati:active-lesson:';

// A saved position this close to the end counts as finished: the next visit
// starts the video over rather than dropping the student on the last frame.
const END_MARGIN_SECONDS = 2;

const storageOf = (storage) => {
    if (storage) return storage;
    try { return globalThis.localStorage || null; } catch { return null; }
};

const readJson = (key, storage) => {
    try {
        const raw = storageOf(storage)?.getItem(key);
        if (!raw) return null;
        // Entries used to be a bare number; one written before this format
        // still reads, dated to the beginning of time so any other copy wins.
        return raw[0] === '{' ? JSON.parse(raw) : { legacy: raw };
    } catch { return null; }
};

const writeJson = (key, value, storage) => {
    try {
        const s = storageOf(storage);
        if (!s) return;
        if (value === null) s.removeItem(key);
        else s.setItem(key, JSON.stringify(value));
    } catch { /* storage unavailable: resume is best-effort */ }
};

/** The saved position as `{ seconds, at }` (`at` in ms), or null. */
export const readPositionEntry = (lessonId, storage) => {
    if (!lessonId) return null;
    const p = readJson(POSITION_PREFIX + lessonId, storage);
    if (!p) return null;
    const seconds = p.legacy !== undefined ? parseFloat(p.legacy) : Number(p.seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const at = Number(p.at);
    return { seconds, at: Number.isFinite(at) ? at : 0 };
};

/** Seconds into the lesson's video the student had reached, or 0. */
export const readPosition = (lessonId, storage) => readPositionEntry(lessonId, storage)?.seconds || 0;

/** Records the position; anything at or below zero clears it instead. */
export const writePosition = (lessonId, seconds, storage, at = Date.now()) => {
    if (!lessonId || !Number.isFinite(seconds)) return;
    writeJson(POSITION_PREFIX + lessonId, seconds > 0 ? { seconds, at } : null, storage);
};

export const clearPosition = (lessonId, storage) => writePosition(lessonId, 0, storage);

/**
 * The point to restore, given what was saved and how long the video turned
 * out to be. A position past the end margin is treated as finished. An unknown
 * duration (NaN, as some browsers report before the file is probed) does not
 * throw the saved point away.
 */
export const resumePoint = (saved, duration) => {
    if (!(saved > 0)) return 0;
    if (Number.isFinite(duration) && saved >= duration - END_MARGIN_SECONDS) return 0;
    return saved;
};

/** The lesson last open in this course as `{ id, at }`, or null. */
export const readActiveLessonEntry = (courseId, storage) => {
    if (!courseId) return null;
    const p = readJson(ACTIVE_LESSON_PREFIX + courseId, storage);
    if (!p) return null;
    const id = p.legacy !== undefined ? p.legacy : p.id;
    if (!id) return null;
    const at = Number(p.at);
    return { id: String(id), at: Number.isFinite(at) ? at : 0 };
};

/** The lesson that was last open in this course, or null. */
export const readActiveLesson = (courseId, storage) => readActiveLessonEntry(courseId, storage)?.id || null;

export const rememberActiveLesson = (courseId, lessonId, storage, at = Date.now()) => {
    if (!courseId || !lessonId) return;
    writeJson(ACTIVE_LESSON_PREFIX + courseId, { id: String(lessonId), at }, storage);
};

/**
 * Of this device's copy and the server's copy of the same thing, the one
 * written more recently. A tie goes to this device: it is the copy in hand.
 */
export const newest = (local, server) => {
    if (!local) return server || null;
    if (!server) return local;
    return (Number(server.at) || 0) > (Number(local.at) || 0) ? server : local;
};

/**
 * Sequential unlocking: every completed lesson plus the first one still to do.
 * Modules are walked in order, so a lesson later in the course stays locked
 * until everything before it is finished.
 */
export const unlockedLessonIds = (modules, completedLessons) => {
    const ordered = modules.flatMap((m) => m.lessons || []);
    let firstIncomplete = ordered.findIndex((l) => !completedLessons.includes(l._id));
    if (firstIncomplete === -1) firstIncomplete = ordered.length;
    return new Set(ordered.slice(0, firstIncomplete + 1).map((l) => l._id));
};

/**
 * Which lesson a course opens on. The remembered one, if it is still there,
 * still unlocked and not behind a drip-locked module; otherwise the first
 * lesson of the first module, as before.
 */
export const chooseLessonToOpen = (modules, completedLessons, rememberedId) => {
    const first = modules[0] || null;
    const fallback = { module: first, lesson: first?.lessons?.[0] || null };
    if (!rememberedId) return fallback;
    if (!unlockedLessonIds(modules, completedLessons).has(rememberedId)) return fallback;
    for (const module of modules) {
        if (module.locked) continue;
        const lesson = (module.lessons || []).find((l) => l._id === rememberedId);
        if (lesson) return { module, lesson };
    }
    return fallback;
};
