/**
 * Since 2026-10-24 the Linguistic path opens one lesson after another
 * (src/linguistic/units.js), and a lesson once started stays open. A test of
 * what a lesson does starts the lessons it uses — by seedKey or by id — as a
 * student who had reached them would have.
 */
const { LinguisticLesson, LinguisticProgress } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');

const startLessons = async (userId, lessons) => {
    await svc.progressOf(userId);
    const had = new Set(((await LinguisticProgress.findOne({ userId }).lean())?.lessons || []).map((e) => String(e.lessonId)));
    const add = lessons.filter((l) => !had.has(String(l._id))).map((l) => ({ lessonId: l._id, module: l.module, level: l.level, status: 'started', step: 'learn' }));
    if (add.length) await LinguisticProgress.updateOne({ userId }, { $push: { lessons: { $each: add } } });
};
const unlock = async (user, keys) => startLessons(user._id, await LinguisticLesson.find({ seedKey: { $in: keys } }).select('_id module level').lean());
const unlockIds = async (user, ids) => startLessons(user._id, await LinguisticLesson.find({ _id: { $in: ids } }).select('_id module level').lean());

module.exports = { unlock, unlockIds };
