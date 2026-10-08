const express = require('express');
const router = express.Router();

const {
  getStudyMaterials,
  generateStudyMaterial,
  submitQuiz
} = require('../controllers/studyController');
const { protect } = require('../middleware/authMiddleware');
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.get('/', protect, getStudyMaterials);
router.post('/generate', protect, chargeWallet('generate_study_material'), generateStudyMaterial);
router.post('/:id/quiz', protect, submitQuiz);

module.exports = router;
