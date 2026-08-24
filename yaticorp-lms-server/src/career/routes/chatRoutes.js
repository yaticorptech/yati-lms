const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getChatHistory,
  clearChatHistory
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, sendMessage);
router.route('/')
  .get(protect, getChatHistory)
  .delete(protect, clearChatHistory);

module.exports = router;
