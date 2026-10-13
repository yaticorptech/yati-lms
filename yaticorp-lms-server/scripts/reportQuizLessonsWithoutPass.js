/**
 * Report, and optionally clean, course progress that counts a quiz lesson
 * whose quiz the student never passed.
 *
 * Until 2026-10-12 the course player completed a quiz lesson after any first
 * attempt that earned credits — and with the credit system on, every attempt
 * scoring above 0% does, passed or failed. A failed quiz could so carry a
 * course to 100%, its course XP and its certificate. The page now completes a
 * quiz lesson only on a pass, and the server refuses one without a pass
 * (Progress.passedQuizzes); this finds what was saved before that.
 *
 *   node scripts/reportQuizLessonsWithoutPass.js           # dry run: what it found, and a sample
 *   node scripts/reportQuizLessonsWithoutPass.js --apply   # take those lessons out and recount the percentage
 *
 * A quiz lesson is taken out only when its quiz exists and is not among the
 * student's passed quizzes for that course. A quiz lesson with no quiz (no
 * questions were ever added) keeps its completion. Certificates and XP already
 * paid are only reported, never revoked: that is a decision for a person.
 * Read the dry run first: a student who passed before passed quizzes were
 * recorded would show up here too. Works on the raw collections, so loading it
 * builds no indexes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

(async () => {
    await connectDB();
    const db = mongoose.connection;

    // Every quiz lesson, with its course and its quiz.
    const modules = await db.collection('modules').find({}, { projection: { courseId: 1 } }).toArray();
    const courseOfModule = new Map(modules.map((m) => [String(m._id), String(m.courseId)]));
    const quizLessons = await db.collection('lessons').find({ type: 'quiz' }, { projection: { moduleId: 1 } }).toArray();
    const quizzes = await db.collection('quizzes').find({ lessonId: { $in: quizLessons.map((l) => l._id) } }, { projection: { lessonId: 1 } }).toArray();
    const quizOfLesson = new Map(quizzes.map((q) => [String(q.lessonId), String(q._id)]));

    // Each course's published lessons, to recount a percentage.
    const lessons = await db.collection('lessons').find({}, { projection: { moduleId: 1, isPublished: 1 } }).toArray();
    const publishedOf = new Map();
    for (const l of lessons) {
        if (l.isPublished === false) continue;
        const courseId = courseOfModule.get(String(l.moduleId));
        if (!courseId) continue;
        if (!publishedOf.has(courseId)) publishedOf.set(courseId, new Set());
        publishedOf.get(courseId).add(String(l._id));
    }

    const progressRows = await db.collection('progresses').find({ completedLessons: { $in: quizLessons.map((l) => l._id) } }).toArray();
    const affected = [];
    for (const p of progressRows) {
        const passed = new Set((p.passedQuizzes || []).map(String));
        const ids = (p.completedLessons || []).map(String);
        const bad = ids.filter((id) => quizOfLesson.has(id) && !passed.has(quizOfLesson.get(id)));
        if (!bad.length) continue;
        const keep = ids.filter((id) => !bad.includes(id));
        const own = publishedOf.get(String(p.courseId)) || new Set();
        const real = own.size ? Math.min(100, Math.round((new Set(keep.filter((id) => own.has(id))).size / own.size) * 100)) : 0;
        const certificate = await db.collection('certificates').findOne({ userId: p.userId, courseId: p.courseId }, { projection: { _id: 1 } });
        affected.push({ _id: p._id, userId: String(p.userId), courseId: String(p.courseId), bad: bad.length, stored: p.percentage || 0, real, keep, certificate: !!certificate });
    }

    console.log(`Progress records with a completed quiz lesson:        ${progressRows.length}`);
    console.log(`Of those, counting a quiz the student never passed:   ${affected.length} (${affected.reduce((n, a) => n + a.bad, 0)} lesson(s))`);
    console.log(`  of which stored at 100% but really below it:        ${affected.filter((a) => a.stored >= 100 && a.real < 100).length}`);
    console.log(`  of which already have that course's certificate:    ${affected.filter((a) => a.certificate).length}`);
    for (const a of affected.slice(0, 15)) console.log(`  user ${a.userId}  course ${a.courseId}  ${a.bad} quiz lesson(s)  stored ${a.stored}% → real ${a.real}%${a.certificate ? '  (certificate issued)' : ''}`);
    if (affected.length > 15) console.log(`  … and ${affected.length - 15} more`);

    if (!APPLY) {
        console.log('\nDry run: nothing changed. Run with --apply to take those lessons out and recount.');
    } else {
        for (const a of affected) {
            await db.collection('progresses').updateOne({ _id: a._id }, { $set: { completedLessons: a.keep.map((id) => new mongoose.Types.ObjectId(id)), percentage: a.real } });
        }
        console.log(`\nCleaned ${affected.length} record(s). Certificates and XP already paid were left as they are.`);
    }
    await mongoose.disconnect();
})().catch(async (err) => { console.error(err); await mongoose.disconnect().catch(() => {}); process.exit(1); });
