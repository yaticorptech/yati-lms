/**
 * How far a student is through a course, and what finishing it earns.
 *
 * The stored percentage used to be worked out only when a lesson was marked
 * done, so it went stale as soon as an administrator added or removed a
 * lesson: a course could read 100% with a new lesson still to do, or stay at
 * 80% with nothing left to finish. The lessons the student has done are the
 * record; the percentage is worked out again from them, against the course's
 * published lessons as they are now, wherever it is read, and saved back when
 * it has moved.
 *
 * Finishing a course — the moment it first reads complete — pays the course's
 * XP and issues its certificate (with the certificate's XP), each exactly once:
 * the activity ledger refuses a repeat, and a student holds one certificate
 * per course. The PDF is a separate thing, downloaded (and priced) on its own.
 */
const Progress = require('../models/Progress');

/**
 * `done` of `total` published lessons. Complete only when every one is done —
 * never because a rounded share reached 100 (199 of 200 rounds to 100%). The
 * percentage is for showing: rounded, and held at 99 until it is complete.
 */
const progressFigures = (completedLessons, lessonIds) => {
    const ids = new Set((lessonIds || []).map(String));
    const done = new Set((completedLessons || []).map(String).filter((id) => ids.has(id))).size;
    const total = ids.size;
    const complete = total > 0 && done === total;
    const percentage = complete ? 100 : total === 0 ? 0 : Math.min(99, Math.round((done / total) * 100));
    return { done, total, complete, percentage };
};

/** Each lesson once: a double-click could store the same lesson twice. */
const withoutRepeats = (list) => [...new Map((list || []).map((id) => [String(id), id])).values()];

/**
 * Bring one stored Progress row in line with the course as it is now: the
 * repeated lesson ids dropped and the percentage worked out again. `progress`
 * is updated in place (a document or a plain object), so the caller can send
 * it straight on. The write only goes through if the row's lessons are still
 * the ones read here, so a lesson completed meanwhile is never undone by it.
 * Returns the figures and whether the stored row already read complete.
 */
const syncProgress = async (progress, lessonIds) => {
    const stored = [...(progress.completedLessons || [])];
    const figures = progressFigures(stored, lessonIds);
    const wasComplete = (progress.percentage || 0) >= 100;
    const unique = withoutRepeats(stored);
    if (progress.percentage !== figures.percentage || unique.length !== stored.length) {
        await Progress.updateOne(
            { _id: progress._id, completedLessons: stored },
            { $set: { percentage: figures.percentage, completedLessons: unique } }
        ).catch((e) => console.error('[progress] repair failed:', e.message));
        progress.percentage = figures.percentage;
        progress.completedLessons = unique;
    }
    return { ...figures, wasComplete };
};

/**
 * The published lesson ids of each course, for working out many courses'
 * progress in two queries. A Map of course id to lesson ids (an empty list for
 * a course with none).
 */
const lessonIdsByCourse = async (courseIds) => {
    const Module = require('../models/Module');
    const Lesson = require('../models/Lesson');
    const ids = [...new Set((courseIds || []).map(String))];
    const out = new Map(ids.map((id) => [id, []]));
    if (!ids.length) return out;
    const modules = await Module.find({ courseId: { $in: ids } }).select('_id courseId').lean();
    const courseOf = new Map(modules.map((m) => [String(m._id), String(m.courseId)]));
    const lessons = await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) }, isPublished: true }).select('_id moduleId').lean();
    for (const l of lessons) out.get(courseOf.get(String(l.moduleId)))?.push(String(l._id));
    return out;
};

const REPAIR_DESCRIPTIONS = {
    course_complete: 'for completing a course',
    certificate_earned: 'for earning a certificate'
};

/**
 * The day a course was really finished: the day its last lesson was marked
 * done, from the activity ledger. Today when the ledger does not say.
 */
const completionDay = async (userId, courseId) => {
    const { LearningActivity } = require('../rewards/models');
    const last = await LearningActivity.findOne({ userId, type: 'lesson_complete', courseId: String(courseId) })
        .sort({ createdAt: -1 }).select('day').lean();
    return last?.day || require('../rewards/config/constants').dayKey();
};

/**
 * Record a completion found when a page was read, not one the student has
 * just done: a course finished before certificates were issued on completion,
 * or one an administrator finished by removing its last lesson. The ledger
 * row is written once (dated `day`, the day the course was really finished)
 * and its XP paid once, and badges are looked at as usual (they read the
 * ledger and never move the streak) — but the streak is not touched and no
 * streak milestone is paid: opening My Courses is not a day of learning. The
 * normal path (recordActivity) does all of that for a real completion.
 * Answers the reward events. Never throws.
 */
const recordRepair = async ({ userId, type, courseId, day }) => {
    try {
        const { LearningActivity } = require('../rewards/models');
        const { getConfig } = require('../rewards/services/configService');
        const { isDuplicate } = require('../rewards/services/tx');
        const config = await getConfig();
        let activity;
        try {
            activity = await LearningActivity.create({ userId, type, refId: String(courseId), courseId: String(courseId), day, meta: { repaired: true } });
        } catch (err) {
            if (isDuplicate(err)) return [];
            throw err;
        }
        // As in recordActivity: the fact is kept whether or not Rewards is on;
        // only the payouts wait on the switch.
        if (config.enabled === false) return [];
        const events = [];
        const amount = Math.max(0, Math.round(Number(config.xpRules?.[type]) || 0));
        if (amount > 0) {
            const { addXp } = require('../rewards/services/xpService');
            const xp = await addXp({ userId, amount, source: type, refId: String(courseId), courseId: String(courseId), description: REPAIR_DESCRIPTIONS[type] || '' });
            if (xp && !xp.duplicate && !xp.skipped && !xp.missingUser) {
                await LearningActivity.updateOne({ _id: activity._id }, { $set: { xpAwarded: amount } });
                events.push({ kind: 'xp', amount, total: xp.xp });
                if (xp.leveledUp) events.push({ kind: 'level_up', level: xp.level });
            }
        }
        const badges = await require('../rewards/services/badgeService').evaluate(userId, config);
        for (const b of badges) events.push({ kind: 'badge', ...b });
        return events;
    } catch (e) {
        console.error(`[rewards] ${type} repair failed:`, e.message);
        return [];
    }
};

/**
 * The student's certificate for a course, created the first time it is asked
 * for: numbered YATI<card>-01 for their first, -02 for the second, and so on,
 * with the "Earn a certificate" XP paid once on creation. With `repair` (a
 * completion found on a read, dated `day`), the XP is paid without touching
 * the streak (recordRepair). Answers `{ certificate, created, events }`.
 */
const issueCertificate = async ({ userId, courseId, repair = false, day = null }) => {
    const Certificate = require('../models/Certificate');
    const course = String(courseId);
    const existing = await Certificate.findOne({ userId, courseId: course });
    if (existing) return { certificate: existing, created: false, events: [] };

    const user = await require('../models/User').findById(userId).select('cardNumber').lean();
    // Fallback for a card number the account does not have yet.
    const card = user?.cardNumber || Math.random().toString(36).slice(2, 8).toUpperCase();
    const heldSoFar = await Certificate.countDocuments({ userId });
    let certificate;
    try {
        certificate = await Certificate.create({
            userId, courseId: course,
            pdfUrl: 'dynamic', // the PDF is drawn on each download, never stored
            certificateNumber: `YATI${card}-${String(heldSoFar + 1).padStart(2, '0')}`,
            issuedAt: new Date()
        });
    } catch (err) {
        // Two requests finishing the course at once: the first one's certificate stands.
        if (err.code === 11000) return { certificate: await Certificate.findOne({ userId, courseId: course }), created: false, events: [] };
        throw err;
    }
    if (repair) {
        const events = await recordRepair({ userId, type: 'certificate_earned', courseId: course, day: day || await completionDay(userId, course) });
        return { certificate, created: true, events };
    }
    const { safeRecordActivity } = require('../rewards/services/activityService');
    const r = await safeRecordActivity({ userId, type: 'certificate_earned', refId: course, courseId: course });
    return { certificate, created: true, events: r.events || [] };
};

/**
 * What finishing a course earns: its XP and its certificate. Safe to call
 * again for a course already settled — nothing is paid or issued twice. Never
 * throws: a reward failing must not fail the page that found the course done.
 * Answers the reward events, for the student app's toast.
 *
 * `repair` is for a completion found when a page is read rather than one the
 * student just made (the last lesson marked done): what was missed is paid,
 * dated the day the course was really finished, and the streak is left alone.
 */
const settleCompletion = async ({ userId, courseId, repair = false }) => {
    const events = [];
    try {
        if (repair) {
            const day = await completionDay(userId, courseId);
            events.push(...(await recordRepair({ userId, type: 'course_complete', courseId, day })));
            events.push(...(await issueCertificate({ userId, courseId, repair: true, day })).events);
            return events;
        }
        const { safeRecordActivity } = require('../rewards/services/activityService');
        const r = await safeRecordActivity({ userId, type: 'course_complete', refId: String(courseId), courseId: String(courseId) });
        events.push(...(r.events || []));
        events.push(...(await issueCertificate({ userId, courseId })).events);
    } catch (e) {
        console.error('[rewards] course completion failed:', e.message);
    }
    return events;
};

/**
 * Many of a student's progress rows at once (My Courses): each brought up to
 * date against its course's lessons, and every course that reads complete but
 * was never settled — it just became complete, or it was finished before
 * certificates were issued on completion — settled now. Updates the rows in
 * place; answers each course's figures (by course id) and the reward events.
 */
const refreshProgressRows = async (userId, rows) => {
    const figures = new Map();
    if (!rows?.length) return { figures, events: [] };
    const lessonIds = await lessonIdsByCourse(rows.map((p) => p.courseId));
    const complete = [];
    const justFinished = new Set();
    for (const row of rows) {
        const f = await syncProgress(row, lessonIds.get(String(row.courseId)) || []);
        figures.set(String(row.courseId), f);
        if (f.complete) {
            complete.push(String(row.courseId));
            if (!f.wasComplete) justFinished.add(String(row.courseId));
        }
    }
    const events = [];
    if (!complete.length) return { figures, events };
    const certified = new Set((await require('../models/Certificate').distinct('courseId', { userId, courseId: { $in: complete } })).map(String));
    for (const courseId of complete) {
        // Found on a read: paid and issued without counting today toward the streak.
        if (justFinished.has(courseId) || !certified.has(courseId)) events.push(...(await settleCompletion({ userId, courseId, repair: true })));
    }
    return { figures, events };
};

module.exports = { progressFigures, syncProgress, lessonIdsByCourse, issueCertificate, settleCompletion, refreshProgressRows };
