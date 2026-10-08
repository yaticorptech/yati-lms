const express = require('express');
const router = express.Router();
const {
  validateMessage,
  sendMessage,
  getChatHistory,
  clearChatHistory
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { chargeWallet } = require('../../rewards/services/walletRuleService');

// Each mentor message, when the admin prices it (Wallet rules → Ask the AI mentor).
// Validated first, so a message that will be refused is never charged.
router.post('/', protect, validateMessage, chargeWallet('ask_mentor'), sendMessage);
router.route('/')
  .get(protect, getChatHistory)
  .delete(protect, clearChatHistory);

module.exports = router;
