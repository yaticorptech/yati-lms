/**
 * How many lessons, passed quizzes and finished courses a student has, from
 * both records of it: the rewards activity ledger and the course progress the
 * LMS itself keeps.
 *
 * Until 2026-10-14 the ledger was only written while Rewards was switched on,
 * so anything learned while it was off is missing from it for good. Progress
 * (completedLessons, passedQuizzes, percentage) was written either way, so
 * counting the union of the two repairs that history on every read, without a
 * migration, and can never count one lesson twice: both sides name the same
 * lesson, quiz or course id.
 */
const Progress = require('../../models/Progress');
const { LearningActivity } = require('../models');

const historyCounts = async (userId) => {
  const [progress, ledger] = await Promise.all([
    Progress.find({ userId }).select('courseId completedLessons passedQuizzes percentage').lean(),
    LearningActivity.find({ userId, type: { $in: ['lesson_complete', 'quiz_pass', 'course_complete'] } }).select('type refId').lean()
  ]);
  const lessons = new Set();
  const quizzes = new Set();
  const courses = new Set();
  for (const p of progress) {
    for (const id of p.completedLessons || []) lessons.add(String(id));
    for (const id of p.passedQuizzes || []) quizzes.add(String(id));
    if ((Number(p.percentage) || 0) >= 100) courses.add(String(p.courseId));
  }
  for (const a of ledger) {
    if (a.type === 'lesson_complete') lessons.add(String(a.refId));
    else if (a.type === 'quiz_pass') quizzes.add(String(a.refId));
    else courses.add(String(a.refId));
  }
  return { lessons: lessons.size, quizzesPassed: quizzes.size, courses: courses.size };
};

module.exports = { historyCounts };
