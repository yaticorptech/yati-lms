/**
 * Record every VdoCipher video used by a PLATFORM course as platform-owned
 * (video_ownerships row with organizationId null), for videos uploaded before
 * ownership rows existed.
 *
 * Why: services/videoOwnership.js judges a video with no row by who uses it.
 * If a platform video's only remaining lessons were an organization's (say,
 * attached through the old edit hole before this release), that organization
 * would count as its owner and could delete it from VdoCipher. A row saying
 * "platform" closes that for good. Existing rows are never changed.
 *
 *   node scripts/backfillPlatformVideoOwnership.js           # dry run: report only
 *   node scripts/backfillPlatformVideoOwnership.js --apply   # write the rows
 *
 * Run it before deploying. Safe to run again: it only inserts missing rows.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const APPLY = process.argv.includes('--apply');
const VIDEO_ID = /^[a-f0-9]{32}$/i;

(async () => {
    await connectDB();
    const db = mongoose.connection;
    const Lesson = require('../src/models/Lesson');
    const Module = require('../src/models/Module');
    const Course = require('../src/models/Course');
    const owners = db.collection('video_ownerships');

    const lessons = await Lesson.find({ videoSource: 'vdocipher', videoId: { $type: 'string' } }).select('videoId moduleId').lean();
    const modules = await Module.find({ _id: { $in: lessons.map((l) => l.moduleId) } }).select('courseId').lean();
    const courseOfModule = new Map(modules.map((m) => [String(m._id), String(m.courseId)]));
    const courses = await Course.find({ _id: { $in: [...new Set(courseOfModule.values())] } }).select('organizationId').lean();
    const platformCourse = new Set(courses.filter((c) => !c.organizationId).map((c) => String(c._id)));

    const platformVideos = [...new Set(lessons
        .filter((l) => VIDEO_ID.test(l.videoId) && platformCourse.has(courseOfModule.get(String(l.moduleId))))
        .map((l) => l.videoId))];
    const existing = new Set((await owners.find({ videoId: { $in: platformVideos } }).project({ videoId: 1 }).toArray()).map((r) => r.videoId));
    const missing = platformVideos.filter((id) => !existing.has(id));

    console.log(`${lessons.length} VdoCipher lesson(s); ${platformVideos.length} video(s) used by platform courses; ${existing.size} already recorded; ${missing.length} to record as platform-owned.`);
    missing.slice(0, 20).forEach((id) => console.log(`  ${id}`));
    if (missing.length > 20) console.log(`  … and ${missing.length - 20} more`);

    if (!APPLY) {
        console.log('Dry run — nothing changed. Re-run with --apply to write the rows.');
        return mongoose.disconnect();
    }
    let written = 0;
    for (const videoId of missing) {
        const r = await owners.updateOne(
            { videoId },
            { $setOnInsert: { videoId, organizationId: null, createdAt: new Date() } },
            { upsert: true }
        );
        if (r.upsertedCount) written++;
    }
    console.log(`Recorded ${written} platform video(s).`);
    await mongoose.disconnect();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
