const express = require('express');
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const { xpOnSuccess } = require('../../rewards/services/xpHooks');
const router = express.Router();

const {
  generateTasks,
  generateAnotherTask,
  getTasks,
  getTaskHistory,
  setTimeBudget,
  updateTask
} = require('../controllers/taskController');
const {
  getTaskStudy,
  generateTaskStudy,
  refuseLessonOverwrite,
  submitTaskQuiz,
  updateStudyProgress
} = require('../controllers/taskStudyController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.post('/generate', protect, generateTasks);
// Declared before '/:id' so the literal path is not read as a task id.
router.post('/another', protect, chargeWallet('add_extra_task'), generateAnotherTask);
router.get('/history', protect, getTaskHistory);
router.put('/day/time-budget', protect, setTimeBudget);
router.route('/')
  .get(protect, getTasks);

// The video + notes + quiz lesson for one task. Declared before '/:id' so
// '/:id/study' is never swallowed by the task update route.
// A lesson that already exists is only rebuilt when the request says so
// (rebuild: true, or replace: 'video'); that is checked before the charge, so
// a refused rebuild is never priced.
router.route('/:id/study')
  .get(protect, getTaskStudy)
  .post(protect, refuseLessonOverwrite, chargeWallet('build_task_lesson'), generateTaskStudy);
router.post('/:id/study/quiz', protect, submitTaskQuiz);
// Watch/read gates. Declared alongside the other study routes and before
// '/:id', which only ever matches a bare id.
// The watch XP is paid only for a watch the controller accepted (it checks
// the seconds seen against the video's length), not for the request's say-so.
router.put('/:id/study/progress', protect, xpOnSuccess('task_video_watched', (req) => (req.videoWatchAccepted ? `video:${req.params.id}` : null)), updateStudyProgress);

router.route('/:id')
  .put(protect, updateTask);

module.exports = router;
