const express = require('express');
const router = express.Router();

const { searchCareer } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, searchCareer);

module.exports = router;
