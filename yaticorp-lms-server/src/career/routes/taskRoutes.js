const express = require('express');
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
  submitTaskQuiz,
  updateStudyProgress
} = require('../controllers/taskStudyController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.post('/generate', protect, generateTasks);
// Declared before '/:id' so the literal path is not read as a task id.
router.post('/another', protect, generateAnotherTask);
router.get('/history', protect, getTaskHistory);
router.put('/day/time-budget', protect, setTimeBudget);
router.route('/')
  .get(protect, getTasks);

// The video + notes + quiz lesson for one task. Declared before '/:id' so
// '/:id/study' is never swallowed by the task update route.
router.route('/:id/study')
  .get(protect, getTaskStudy)
  .post(protect, generateTaskStudy);
router.post('/:id/study/quiz', protect, submitTaskQuiz);
// Watch/read gates. Declared alongside the other study routes and before
// '/:id', which only ever matches a bare id.
router.put('/:id/study/progress', protect, updateStudyProgress);

router.route('/:id')
  .put(protect, updateTask);

module.exports = router;
