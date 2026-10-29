/**
 * Since 2026-10-24 the Linguistic path opens one lesson after another
 * (src/linguistic/units.js), and a lesson once started stays open. A test of
 * what a lesson does starts the lessons it uses — by seedKey or by id — as a
 * student who had reached them would have. Since 2026-10-28 a section opens
 * only when the one before it is finished, so a student who reached a lesson
 * of a later section had finished the sections before it: they are recorded
 * as finished too.
 */
const { LinguisticLesson, LinguisticProgress } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');

const LEVELS = ['beginner', 'intermediate', 'advanced'];

/** Records the sections before `level` as finished, in the course of `course` (null: English). */
const finishBelow = async (userId, level, course = null) => {
    const progress = await svc.progressOf(userId);
    let changed = false;
    const below = LEVELS.slice(0, LEVELS.indexOf(level));
    for (const l of below) {
        if (progress.levelsCompleted.some((x) => x.level === l && (x.course || null) === (course || null))) continue;
        progress.levelsCompleted.push({ level: l, completedAt: new Date(), average: 100, course });
        changed = true;
    }
    // Since 2026-10-29 a section opens only when the assessment of the one before is passed: passed too.
    const gates = below.length ? await LinguisticLesson.find({ review: 'assessment', level: { $in: below }, course: course || null }).select('_id module level').lean() : [];
    for (const g of gates) {
        const e = progress.lessons.find((x) => String(x.lessonId) === String(g._id));
        if (e?.status === 'completed') continue;
        if (e) Object.assign(e, { status: 'completed', bestScore: 100, completedAt: new Date() });
        else progress.lessons.push({ lessonId: g._id, module: g.module, level: g.level, status: 'completed', step: 'done', bestScore: 100, completedAt: new Date() });
        changed = true;
    }
    if (changed) await progress.save();
};

const startLessons = async (userId, lessons) => {
    await svc.progressOf(userId);
    for (const l of lessons) if (l.level !== 'beginner') await finishBelow(userId, l.level, l.course || null);
    const had = new Set(((await LinguisticProgress.findOne({ userId }).lean())?.lessons || []).map((e) => String(e.lessonId)));
    const add = lessons.filter((l) => !had.has(String(l._id))).map((l) => ({ lessonId: l._id, module: l.module, level: l.level, status: 'started', step: 'learn' }));
    if (add.length) await LinguisticProgress.updateOne({ userId }, { $push: { lessons: { $each: add } } });
};
const unlock = async (user, keys) => startLessons(user._id, await LinguisticLesson.find({ seedKey: { $in: keys } }).select('_id module level course').lean());
const unlockIds = async (user, ids) => startLessons(user._id, await LinguisticLesson.find({ _id: { $in: ids } }).select('_id module level course').lean());

/**
 * One language only since 2026-10-27: once a course is started, POST /course refuses another. Students who
 * began two courses before then still have both; a test of that moves them as the old switch did.
 */
const moveCourse = async (user, course, start = null) => {
    const progress = await svc.progressOf(user._id);
    progress.course = course === 'en' ? null : course;
    if (course !== 'en' && (start || !progress.courseStart?.[course])) {
        progress.courseStart = { ...(progress.courseStart || {}), [course]: start || 'beginner' };
        progress.markModified('courseStart');
    }
    await progress.save();
};

/**
 * Since 2026-10-28 every student starts at Beginner, and a section opens only by finishing the one before. A test
 * of a later section puts the student there as one who finished the sections before it.
 */
const placeAt = async (user, level) => {
    const progress = await svc.progressOf(user._id);
    progress.placement = { level, score: null, total: null, bands: null, takenAt: new Date(), chosen: true };
    await progress.save();
    await finishBelow(user._id, level, progress.course || null);
};

module.exports = { unlock, unlockIds, moveCourse, placeAt, finishBelow };
