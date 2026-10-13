/**
 * Report, and optionally clean, course progress that counts lessons which are
 * not lessons of that course.
 *
 * Until 2026-10-10, POST /api/user/progress/update took any lesson id: a
 * made-up one, or one from another course, was saved as completed, paid
 * lesson XP, and counted toward the course's percentage — enough of them
 * reached 100%, which paid the course XP and allowed its certificate. The
 * endpoint now refuses such ids and counts only the course's own published
 * lessons; this finds what was saved before that.
 *
 *   node scripts/reportForgedLessonProgress.js           # dry run: what it found, and a sample
 *   node scripts/reportForgedLessonProgress.js --apply   # take those ids out and recount the percentage
 *
 * An id is taken out only when no lesson has it at all, or when the lesson
 * belongs to another course. A lesson of this course that is unpublished now
 * keeps its completion, in case it comes back. Certificates and XP already
 * paid are only reported, never revoked: that is a decision for a person.
 * Works on the raw collections so loading it builds no indexes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

(async () => {
    await connectDB();
    const db = mongoose.connection;
    const progressRows = await db.collection('progresses').find({}).toArray();

    // Every lesson, with its course, once.
    const modules = await db.collection('modules').find({}, { projection: { courseId: 1 } }).toArray();
    const courseOfModule = new Map(modules.map((m) => [String(m._id), String(m.courseId)]));
    const lessons = await db.collection('lessons').find({}, { projection: { moduleId: 1, isPublished: 1 } }).toArray();
    const lessonInfo = new Map(lessons.map((l) => [String(l._id), { courseId: courseOfModule.get(String(l.moduleId)) || null, published: l.isPublished !== false }]));
    const publishedOf = new Map();
    for (const [id, info] of lessonInfo) {
        if (!info.courseId || !info.published) continue;
        if (!publishedOf.has(info.courseId)) publishedOf.set(info.courseId, new Set());
        publishedOf.get(info.courseId).add(id);
    }

    const affected = [];
    for (const p of progressRows) {
        const courseId = String(p.courseId);
        const ids = (p.completedLessons || []).map(String);
        const bad = ids.filter((id) => { const info = lessonInfo.get(id); return !info || info.courseId !== courseId; });
        if (!bad.length) continue;
        const keep = ids.filter((id) => !bad.includes(id));
        const own = publishedOf.get(courseId) || new Set();
        const real = own.size ? Math.min(100, Math.round((new Set(keep.filter((id) => own.has(id))).size / own.size) * 100)) : 0;
        const certificate = await db.collection('certificates').findOne({ userId: p.userId, courseId: p.courseId }, { projection: { _id: 1 } });
        affected.push({ _id: p._id, userId: String(p.userId), courseId, bad: bad.length, stored: p.percentage || 0, real, keep, certificate: !!certificate });
    }

    console.log(`Progress records in total:                      ${progressRows.length}`);
    console.log(`Holding lesson ids that are not of their course: ${affected.length} (${affected.reduce((n, a) => n + a.bad, 0)} ids)`);
    console.log(`  of which stored at 100% but really below it:   ${affected.filter((a) => a.stored >= 100 && a.real < 100).length}`);
    console.log(`  of which already have that course's certificate: ${affected.filter((a) => a.certificate).length}`);
    for (const a of affected.slice(0, 15)) console.log(`  user ${a.userId}  course ${a.courseId}  ${a.bad} bad id(s)  stored ${a.stored}% → real ${a.real}%${a.certificate ? '  (certificate issued)' : ''}`);
    if (affected.length > 15) console.log(`  … and ${affected.length - 15} more`);

    if (!APPLY) {
        console.log('\nDry run: nothing changed. Run with --apply to take those ids out and recount.');
    } else {
        for (const a of affected) {
            await db.collection('progresses').updateOne({ _id: a._id }, { $set: { completedLessons: a.keep, percentage: a.real } });
        }
        console.log(`\nCleaned ${affected.length} record(s). Certificates and XP already paid were left as they are.`);
    }
    await mongoose.disconnect();
})().catch(async (err) => { console.error(err); await mongoose.disconnect().catch(() => {}); process.exit(1); });
