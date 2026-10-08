/**
 * Merge duplicate course progress rows (progresses) into one per
 * { userId, courseId }, then build the unique index the Progress model now
 * declares.
 *
 * Duplicates came from a find-then-create on first opening a course: two
 * requests at once each found nothing and each inserted. The organization
 * views then summed both rows, so a student could read "3 of 2 courses
 * completed" or more than 100%. Every write is now an atomic upsert; this
 * cleans up what was written before.
 *
 *   node scripts/dedupeProgress.js           # dry run: list groups and the plan
 *   node scripts/dedupeProgress.js --apply   # merge, delete the extras, build index
 *
 * How a group is merged — no completed lesson or passed quiz is lost:
 *   - kept row: the one with the highest percentage, then the most completed
 *     lessons, then the earliest created
 *   - completedLessons, passedQuizzes, attemptedQuizzesForCredit: the union of
 *     every row in the group
 *   - percentage: the highest of the group, held to 0–100 (the next lesson the
 *     student completes recalculates it from the merged lessons)
 *   - lastAccessedLesson: from the most recently updated row that has one
 *   - createdAt: the earliest of the group
 *
 * Works on the raw collection rather than the model, so loading this script
 * never itself triggers the index build it is preparing for.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');

const pct = (p) => Math.max(0, Math.min(100, Number(p.percentage) || 0));
const lessons = (p) => (p.completedLessons || []).length;
const time = (d) => (d ? new Date(d).getTime() : 0);

/** Union of ObjectId arrays, by string value, keeping the first-seen order. */
const union = (rows, field) => {
    const seen = new Map();
    for (const r of rows) for (const id of r[field] || []) if (!seen.has(String(id))) seen.set(String(id), id);
    return [...seen.values()];
};

/** The merged row for one group, and which document carries it. */
const plan = (rows) => {
    const ranked = [...rows].sort((a, b) =>
        pct(b) - pct(a) || lessons(b) - lessons(a) || time(a.createdAt) - time(b.createdAt) || String(a._id).localeCompare(String(b._id)));
    const keep = ranked[0];
    const lastTouched = [...rows].filter((r) => r.lastAccessedLesson).sort((a, b) => time(b.updatedAt) - time(a.updatedAt))[0];
    const created = rows.map((r) => r.createdAt).filter(Boolean).sort((a, b) => time(a) - time(b))[0];
    return {
        keep,
        extras: ranked.slice(1),
        set: {
            completedLessons: union(rows, 'completedLessons'),
            passedQuizzes: union(rows, 'passedQuizzes'),
            attemptedQuizzesForCredit: union(rows, 'attemptedQuizzesForCredit'),
            percentage: pct(keep),
            ...(lastTouched ? { lastAccessedLesson: lastTouched.lastAccessedLesson } : {}),
            ...(created ? { createdAt: created } : {})
        }
    };
};

(async () => {
    await connectDB();
    const progress = mongoose.connection.collection('progresses');

    const groups = await progress.aggregate([
        { $group: { _id: { userId: '$userId', courseId: '$courseId' }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } }
    ]).toArray();

    const extraCount = groups.reduce((s, g) => s + g.n - 1, 0);
    const students = new Set(groups.map((g) => String(g._id.userId))).size;
    console.log(`${groups.length} duplicated progress group(s) across ${students} student(s); ${extraCount} extra row(s).`);

    let merged = 0, deleted = 0;
    for (const g of groups) {
        const rows = await progress.find({ _id: { $in: g.ids } }).toArray();
        const { keep, extras, set } = plan(rows);
        console.log(`\n  user ${g._id.userId}  course ${g._id.courseId}`);
        for (const r of rows) {
            console.log(`    ${r === keep ? 'KEEP  ' : 'remove'} ${r._id}  ${pct(r)}%  ${lessons(r)} lesson(s)  ${(r.passedQuizzes || []).length} quiz(zes)  created ${r.createdAt ? new Date(r.createdAt).toISOString() : '—'}`);
        }
        console.log(`    → merged: ${set.percentage}%, ${set.completedLessons.length} lesson(s), ${set.passedQuizzes.length} passed quiz(zes)`);

        if (APPLY) {
            await progress.updateOne({ _id: keep._id }, { $set: set });
            const { deletedCount } = await progress.deleteMany({ _id: { $in: extras.map((r) => r._id) } });
            merged += 1; deleted += deletedCount;
        }
    }

    if (!APPLY) {
        console.log('\nDry run — nothing changed. Re-run with --apply to merge the groups, delete the extra rows and build the index.');
    } else {
        if (groups.length) console.log(`\nMerged ${merged} group(s); deleted ${deleted} extra row(s).`);
        await progress.createIndex({ userId: 1, courseId: 1 }, { unique: true });
        console.log('Unique index { userId, courseId } is in place.');
    }

    await mongoose.disconnect();
})().catch(async (e) => {
    console.error(e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
