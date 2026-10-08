/**
 * Whose VdoCipher video is whose, and when one may be removed from VdoCipher.
 *
 * All VdoCipher videos live in the platform's single account, so a video id
 * alone says nothing about who may use it. Without these checks an
 * organization could point its lesson at a paid platform video (and serve it
 * to its students), or point it at one and then delete the lesson, which
 * deleted the platform's video from VdoCipher with it.
 *
 * Ownership is proven by the row models/VideoOwnership.js writes when upload
 * credentials are issued. Videos uploaded before that row existed have none;
 * for those (and only those) an organization counts as the owner when every
 * lesson that uses the video is in its own courses. That legacy rule can only
 * ever describe videos attached before this change: from now on an
 * organization can attach only a video it owns, so it cannot manufacture it.
 */
const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const VideoOwnership = require('../models/VideoOwnership');

const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a) === String(b);

/**
 * For each lesson using `videoId` (except those listed), the organization its
 * course belongs to: an id string, or null for a platform course. A lesson
 * whose module or course is gone also answers null — it is nobody's to claim.
 */
const lessonOwners = async (videoId, exceptLessonIds = []) => {
    const lessons = await Lesson.find({ videoId, _id: { $nin: exceptLessonIds } }).select('moduleId').lean();
    if (!lessons.length) return [];
    const modules = await Module.find({ _id: { $in: lessons.map((l) => l.moduleId) } }).select('courseId').lean();
    const courseOf = new Map(modules.map((m) => [String(m._id), String(m.courseId)]));
    const courses = await Course.find({ _id: { $in: [...new Set(courseOf.values())] } }).select('organizationId').lean();
    const orgOf = new Map(courses.map((c) => [String(c._id), c.organizationId ? String(c.organizationId) : null]));
    return lessons.map((l) => orgOf.get(courseOf.get(String(l.moduleId))) || null);
};

/** Remember who a freshly minted video belongs to. Never moves an existing row. */
const recordUpload = (videoId, organizationId) => VideoOwnership.updateOne(
    { videoId },
    { $setOnInsert: { videoId, organizationId: organizationId || null } },
    { upsert: true }
);

/** True when `organizationId` owns `videoId` (by its upload row, or the legacy rule). */
const orgOwnsVideo = async (videoId, organizationId) => {
    if (!videoId || !organizationId) return false;
    const row = await VideoOwnership.findOne({ videoId }).select('organizationId').lean();
    if (row) return sameId(row.organizationId, organizationId);
    const owners = await lessonOwners(videoId);
    return owners.length > 0 && owners.every((o) => o === String(organizationId));
};

/** True when no lesson outside `organizationId`'s own courses uses `videoId`. */
const onlyOrgUsesVideo = async (videoId, organizationId) => {
    const owners = await lessonOwners(videoId);
    return owners.every((o) => o === String(organizationId));
};

/**
 * Whether deleting the lessons `removing` may also delete `videoId` from
 * VdoCipher. Never while any other lesson still uses it — that lesson would
 * be left pointing at nothing. And for an organization, only its own video.
 */
const mayDeleteFromProvider = async (videoId, { organizationId = null, removing = [] } = {}) => {
    if (await Lesson.exists({ videoId, _id: { $nin: removing } })) return false;
    if (!organizationId) return true;
    return orgOwnsVideo(videoId, organizationId);
};

module.exports = { recordUpload, orgOwnsVideo, onlyOrgUsesVideo, mayDeleteFromProvider, lessonOwners };
